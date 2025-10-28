"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type Task = {
  _id: string;
  name: string;
  userId: string;
  userName?: string;
  totalTime: number;
  startDate?: string;
  endDate?: string;
};

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
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

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0 || result === "") result += `${seconds}s`;

    return result.trim();
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/admin/tasks?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 border rounded-2xl shadow-lg bg-white dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Task Dashboard</h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <label className="mr-2 font-semibold">Filter by User:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border p-2 rounded dark:text-white  dark:bg-black"
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

      <div className="">
        <table className="w-full border mt-4">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="border p-3">User Name</th>
              <th className="border p-3">Task Name</th>
              <th className="border p-3">Total Time</th>
              <th className="border p-3">Start Date</th>
              <th className="border p-3">End Date</th>
              <th className="border p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => {
              const isCompleted = Boolean(task.endDate);
              const rowColor = isCompleted
                ? "bg-green-50 dark:bg-green-500"
                : "bg-yellow-50 dark:bg-red-900";

              return (
                <tr
                  key={task._id}
                  className={`border-b ${rowColor}`}
                >
                  <td className="border p-2 text-center">
                    {task.userName || task.userId}
                  </td>
                  <td className="border p-2 text-center">{task.name}</td>
                  <td className="border p-2 text-center">
                    {formatTime(task.totalTime)}
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
                  colSpan={5}
                  className="border p-4 text-center text-gray-500 dark:text-white"
                >
                  No tasks found for the selected filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
