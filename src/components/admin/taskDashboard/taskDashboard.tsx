"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

type Task = {
  _id: string;
  name: string;
  userId: string;
  userName?: string;
  totalTime: number;
  status: string;
  lastStart?: string | null;
  startDate?: string;
  endDate?: string;
  deadline?: string;
};

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [timerMap, setTimerMap] = useState<Record<string, number>>({});
  const [deadlinePicker, setDeadlinePicker] = useState<
    Record<string, string | null>
  >({});

  const [startDate, endDate] = dateRange;
  const fetchTasks = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allTasks: Task[] = res.data.tasks || [];
      setTasks(allTasks);

      const uniqueUsers = Array.from(
        new Map(
          allTasks.map((t) => [
            t.userId,
            { id: t.userId, name: t.userName || t.userId },
          ])
        ).values()
      );
      setUsers(uniqueUsers);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  const deleteTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the task!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/admin/tasks?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
      Swal.fire("Deleted!", "The task has been removed.", "success");
    } catch (err) {
      console.error("Error deleting task:", err);
      Swal.fire("Error!", "Failed to delete the task.", "error");
    }
  };
  const setDeadline = async (task: Task, deadlineDate: Date) => {
    try {
      const token = Cookies.get("token");
      await axios.post(
        "/api/tasks",
        {
          userId: task.userId,
          name: task.name,
          action: "set-deadline",
          deadline: deadlineDate,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Deadline set successfully");
      fetchTasks();
    } catch (err) {
      console.error("Error setting deadline:", err);
      toast.error("Failed to set deadline.");
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesUser = selectedUser ? task.userId === selectedUser : true;

    let matchesDate = true;
    if (startDate && endDate && task.endDate) {
      const taskEnd = new Date(task.endDate);
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      matchesDate = taskEnd >= startDate && taskEnd <= adjustedEndDate;
    }

    return matchesUser && matchesDate;
  });

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 border rounded-2xl shadow-lg bg-white dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Admin Task Dashboard
      </h1>

      {/* 🔹 Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <label className="mr-2 font-semibold">Filter by User:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border p-2 rounded dark:text-white dark:bg-black"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

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
      </div>
      <div className="flex gap-4 mb-4 justify-center">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-green-400 rounded-full"></span>
          <span className="text-sm font-medium">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-yellow-300 rounded-full"></span>
          <span className="text-sm font-medium">Paused</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-blue-300 rounded-full"></span>
          <span className="text-sm font-medium">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-red-400 rounded-full"></span>
          <span className="text-sm font-medium">Missed Deadline</span>
        </div>
      </div>
      <table className="w-full border mt-2">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border p-3">User Name</th>
            <th className="border p-3">Task Name</th>
            <th className="border p-3">Status</th>
            <th className="border p-3">Total Time</th>
            <th className="border p-3">Start Date</th>
            <th className="border p-3">End Date</th>
            <th className="border p-3">Deadline</th>
            <th className="border p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map((task) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const deadlineDate = task.deadline
              ? new Date(task.deadline)
              : undefined;
            deadlineDate?.setHours(0, 0, 0, 0);

            const isOverdue =
              deadlineDate &&
              deadlineDate < today &&
              task.status !== "completed";
            let rowColor = "";
            if (isOverdue) {
              rowColor = "bg-red-300 dark:bg-red-800";
            } else {
              switch (task.status) {
                case "completed":
                  rowColor = "bg-green-200 dark:bg-green-800";
                  break;
                case "paused":
                  rowColor = "bg-yellow-200 dark:bg-yellow-700";
                  break;
                case "in-progress":
                  rowColor = "bg-blue-200 dark:bg-blue-700";
                  break;
                default:
                  rowColor = "bg-transparent";
              }
            }

            return (
              <tr key={task._id} className={`border-b ${rowColor}`}>
                <td className="border p-2 text-center">
                  {task.userName || task.userId}
                </td>
                <td className="border p-2 text-center">{task.name}</td>
                <td className="border p-2 text-center capitalize">
                  {task.status}
                </td>
                <td className="border p-2 text-center font-medium">
                  {formatTime(timerMap[task._id] || 0)}
                </td>
                <td className="border p-2 text-center">
                  {task.startDate
                    ? new Date(task.startDate).toLocaleDateString("en-GB")
                    : "-"}
                </td>
                <td className="border p-2 text-center">
                  {task.endDate
                    ? new Date(task.endDate).toLocaleDateString("en-GB")
                    : "-"}
                </td>
                <td className="border p-2 text-center">
                  {task.deadline
                    ? new Date(task.deadline).toLocaleDateString("en-GB")
                    : "-"}
                  <div className="mt-1">
                    <DatePicker
                      selected={
                        deadlinePicker[task._id]
                          ? new Date(deadlinePicker[task._id]!)
                          : null
                      }
                      onChange={(date: Date | null) => {
                        if (date) {
                          setDeadlinePicker((prev) => ({
                            ...prev,
                            [task._id]: date.toISOString(),
                          }));
                          setDeadline(task, date);
                        }
                      }}
                      disabled={task.status === "completed"}
                      placeholderText="Set Deadline"
                      className="border text-sm p-1 rounded w-32 text-center mt-1 dark:text-white dark:bg-gray-800 disabled:"
                    />
                  </div>
                </td>
                <td className="border p-3 text-center">
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 cursor-pointer"
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            );
          })}

          {filteredTasks.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="border p-4 text-center text-gray-500 dark:text-white"
              >
                No tasks found for the selected filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
