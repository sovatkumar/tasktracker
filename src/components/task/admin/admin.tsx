"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import Select, { MultiValue } from "react-select";

type User = {
  _id: string;
  name: string;
};

type FormData = {
  taskName: string;
  assignedUsers: string[];
  deadline: Date | null;
  taskDetail?: string;
};

export default function AdminAddTask() {
  const token = Cookies.get("token");

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      taskName: "",
      assignedUsers: [],
      deadline: null,
    },
  });

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await axios.post("/api/admin/tasks", {
        name: data.taskName,
        assignedUsers: data.assignedUsers,
        deadline: data.deadline,
        taskDetail: data?.taskDetail,
      });
      toast.success("Task created successfully!");
      reset();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const userOptions = users.map((user) => ({
    value: user._id,
    label: user.name,
  }));

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 border rounded-2xl shadow-lg bg-white dark:bg-gray-900 dark:text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">Add New Task</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block font-semibold mb-1">Task Name</label>
          <input
            type="text"
            {...register("taskName", { required: "Task name is required" })}
            placeholder="Enter task name"
            className="w-full border p-2 rounded dark:text-white"
            disabled={submitting}
          />
          {errors.taskName && (
            <p className="text-red-500 mt-1">{errors.taskName.message}</p>
          )}
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Task Description/Detail
          </label>
          <textarea
            rows={6}
            {...register("taskDetail", { required: "taskDetail is required" })}
            placeholder="Enter task description"
            className="w-full border p-2 rounded dark:text-white"
            disabled={submitting}
          />
          {errors.taskDetail && (
            <p className="text-red-500 mt-1">{errors.taskDetail.message}</p>
          )}
        </div>
        <div>
          <label className="block font-semibold mb-1">Assign To Users</label>
          {loadingUsers ? (
            <p className="text-gray-500">Loading users...</p>
          ) : (
            <Controller
              name="assignedUsers"
              control={control}
              rules={{ required: "Please select at least one user" }}
              render={({ field }) => {
                const availableOptions = userOptions.filter(
                  (option) => !field.value.includes(option.value)
                );
                const selectedOptions = userOptions.filter((option) =>
                  field.value.includes(option.value)
                );
                return (
                  <Select
                    options={availableOptions}
                    value={selectedOptions}
                    onChange={(
                      selected: MultiValue<{ value: string; label: string }>
                    ) => field.onChange(selected.map((s) => s.value))}
                    isMulti
                    closeMenuOnSelect={false}
                    placeholder="Select users"
                    isDisabled={submitting}
                    className="dark:text-black"
                  />
                );
              }}
            />
          )}
          {errors.assignedUsers && (
            <p className="text-red-500 mt-1">{errors.assignedUsers.message}</p>
          )}
        </div>
        <div>
          <label className="block font-semibold mb-1">Deadline</label>
          <Controller
            control={control}
            name="deadline"
            rules={{ required: "Deadline is required" }}
            render={({ field }) => (
              <DatePicker
                placeholderText="Select deadline"
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                className="w-full border p-2 rounded dark:text-white"
                disabled={submitting}
                showTimeSelect
                timeIntervals={5} // minute interval options (5, 10, 15 etc.)
                dateFormat="MMM d, yyyy h:mm aa" // display format
              />
            )}
          />
          {errors.deadline && (
            <p className="text-red-500 mt-1">{errors.deadline.message}</p>
          )}
        </div>
        <button
          type="submit"
          className={`bg-green-600 text-white p-2 rounded hover:bg-green-700 flex justify-center items-center`}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3 3-3h-4a8 8 0 01-8 8v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            "Create Task"
          )}
        </button>
      </form>
    </div>
  );
}
