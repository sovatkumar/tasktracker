"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import Cookies from "js-cookie";

export default function UserLogTimePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(true);

  const token = Cookies.get("token");

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get("/api/admin/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(res.data.tasks || []); // ✅ Corrected to access `tasks`
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [token]);

  // Helper: Format milliseconds into h m s
  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return "0h 0m 0s";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Group logs by user and filter by date
  useEffect(() => {
    if (!tasks.length) return;

    const logsByUser: Record<string, { totalMs: number; taskCount: number }> = {};

    tasks.forEach((task: any) => {
      const logDate = dayjs(task.startDate).format("YYYY-MM-DD");
      if (logDate === selectedDate) {
        const user = task.userName || "Unknown";
        const totalMs = task.totalTime || 0;
        if (!logsByUser[user]) logsByUser[user] = { totalMs: 0, taskCount: 0 };
        logsByUser[user].totalMs += totalMs;
        logsByUser[user].taskCount += 1;
      }
    });

    const result = Object.entries(logsByUser).map(([user, data]) => ({
      user,
      formattedTime: formatTime(data.totalMs),
      taskCount: data.taskCount,
    }));

    setFilteredLogs(result);
  }, [tasks, selectedDate]);

  if (loading) return <div>Loading user logs...</div>;

  return (
    <div className="p-6 w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">User Log Time Report</h1>

      {/* Date Filter */}
      <div className="mb-4 dark:text-white">
        <label className="font-medium mr-2">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2 rounded dark:text-white cursor-pointer dark:scheme-dark"
        />
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-gray-400">
        <thead className="bg-gray-100 dark:bg-transparent">
          <tr>
            <th className="border p-2 text-center">User</th>
            <th className="border p-2 text-center">Tasks</th>
            <th className="border p-2 text-center">Total Time</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((u) => (
              <tr key={u.user}>
                <td className="border p-2 text-center">{u.user}</td>
                <td className="border p-2 text-center">{u.taskCount}</td>
                <td className="border p-2 text-center">{u.formattedTime}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="border p-2 text-center">
                No logs found for {dayjs(selectedDate).format("MMM D, YYYY")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
