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

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Admin Task Dashboard
      </h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="mr-2 font-semibold">Filter by User:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border p-2 rounded dark:text-black dark:bg-white"
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

      <table className="w-full border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 dark:text-black">User Name</th>
            <th className="border p-2 dark:text-black">Task Name</th>
            <th className="border p-2 dark:text-black">Total Time</th>
            <th className="border p-2 dark:text-black">Start Date</th>
            <th className="border p-2 dark:text-black">End Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map((task) => (
            <tr key={task._id}>
              <td className="border p-2 text-center">
                {task.userName || task.userId}
              </td>
              <td className="border p-2 text-center">{task.name}</td>
              <td className="border p-2 text-center">
                {formatTime(task.totalTime)}
              </td>
              <td className="border p-2 text-center">
                {task.startDate
                  ? new Date(task.startDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "-"}
              </td>
              <td className="border p-2 text-center">
                {task.endDate
                  ? new Date(task.endDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "-"}
              </td>
            </tr>
          ))}

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
  );
}
