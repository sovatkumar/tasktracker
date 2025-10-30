"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type Task = {
  _id: string;
  name: string;
  status: string;
  totalTime: number;
  lastStart: string | null;
  startDate?: string;
  endDate?: string;
};

type FormData = {
  taskName: string;
};

export default function UserTaskManager() {
  const [userId, setUserId] = useState<any>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timerMap, setTimerMap] = useState<Record<string, number>>({});
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, endDate] = dateRange;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    const token: any = Cookies.get("token");
    if (token) {
      const decoded: any = jwtDecode(token);
      setUserId(decoded?.userId);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchTasks = async () => {
    if (!userId) return;
    try {
      const params: any = { userId };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await axios.get("/api/tasks", { params });
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tasks");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [userId, debouncedSearch]);
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimers: Record<string, number> = {};
      tasks.forEach((task) => {
        if (task.status === "in-progress" && task.lastStart) {
          const elapsed =
            new Date().getTime() - new Date(task.lastStart).getTime();
          updatedTimers[task._id] = (task.totalTime || 0) + elapsed;
        } else {
          updatedTimers[task._id] = task.totalTime || 0;
        }
      });
      setTimerMap(updatedTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);
  const handleAction = async (
    name: string,
    action: "start" | "stop" | "complete" | "pending"
  ) => {
    if (!userId) return toast.error("User not found");

    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-GB", { hour12: false });

      await axios.post("/api/tasks", {
        userId,
        name,
        action,
        ...(action === "start" && { startDate: now, startTime: currentTime }),
        ...(action === "complete" && { endDate: now }),
      });

      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error("Error updating task");
    }
  };

  const onSubmit = async (data: FormData) => {
    await handleAction(data.taskName, "pending");
    reset();
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const filteredTasks = tasks.filter((task) => {
    let match:any = true;
    if (startDate && endDate) {
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      const taskStart = task.startDate ? new Date(task.startDate) : null;
      const taskEnd = task.endDate ? new Date(task.endDate) : null;
      const matchesStart =
        taskStart && taskStart >= startDate && taskStart <= adjustedEndDate;
      const matchesEnd =
        taskEnd && taskEnd >= startDate && taskEnd <= adjustedEndDate;
      match = matchesStart || matchesEnd;
    }
    if (statusFilter !== "all" && task.status !== statusFilter) return false;

    return match;
  });

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 border rounded-2xl shadow-lg bg-white dark:bg-gray-900 dark:text-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Task Manager</h2>
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div>
          <label className="mr-2 font-semibold">Select Date Range:</label>
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(update: [Date | null, Date | null]) =>
              setDateRange(update)
            }
            isClearable
            placeholderText="Select date range"
            className="border p-2 rounded dark:text-white"
          />
        </div>

        <input
          type="text"
          placeholder="Search task by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-64 dark:text-white"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded dark:bg-black dark:text-white"
        >
          <option value="all">All Tasks</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>

        </select>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex mb-4 gap-2">
        <input
          type="text"
          {...register("taskName", { required: "Task name is required" })}
          placeholder="Enter new task"
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700 cursor-pointer"
        >
          Create
        </button>
      </form>

      {errors.taskName && (
        <p className="text-red-500 mb-2">{errors.taskName.message}</p>
      )}
      {filteredTasks.length > 0 ? (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="border p-2">Task</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Time</th>
              <th className="border p-2">Start Date</th>
              <th className="border p-2">End Date</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task._id}>
                <td
                  className="border p-2 text-left truncate max-w-xs"
                  title={task.name}
                >
                  {task.name?.length > 40
                    ? task.name.slice(0, 40) + "..."
                    : task.name}
                </td>
                <td className="border p-2 text-center capitalize">
                  {task.status}
                </td>
                <td className="border p-2 text-center font-medium">
                  {formatTime(timerMap[task._id] || 0)}
                </td>
                <td className="border p-2 text-center">
                  {task.startDate
                    ? new Date(task.startDate).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "-"}
                </td>
                <td className="border p-2 text-center">
                  {task.endDate
                    ? new Date(task.endDate).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })
                    : "-"}
                </td>
                <td className=" p-2 flex gap-2 justify-center">
                  {task.status !== "completed" ? (
                    <>
                      <button
                        onClick={() => handleAction(task.name, "start")}
                        disabled={task.status === "in-progress"}
                        className={`p-1 rounded text-white ${
                          task.status === "in-progress"
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleAction(task.name, "stop")}
                        disabled={task.status !== "in-progress"}
                        className={`p-1 rounded text-white ${
                          task.status !== "in-progress"
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-yellow-600 hover:bg-yellow-700"
                        }`}
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => handleAction(task.name, "complete")}
                        className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                      >
                        Complete
                      </button>
                    </>
                  ) : (
                    <span className="text-green-600 font-bold">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-center text-gray-500 mt-6">
          No tasks found for the selected filters.
        </p>
      )}
    </div>
  );
}
