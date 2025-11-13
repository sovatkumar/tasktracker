"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import Cookies from "js-cookie";

export default function UserLogTimePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [loading, setLoading] = useState(true);
  const [timerMap, setTimerMap] = useState<Record<string, number>>({});
  const token = Cookies.get("token");

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return "0h 0m 0s";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get("/api/admin/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(res.data.tasks || []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      let updatedTimers: Record<string, number> = {};
      let logsByUser: Record<
        string,
        { totalMs: number; taskCount: number; inProgressToday: boolean }
      > = {};

      tasks.forEach((task: any) => {
        const user = task.userName || "Unknown";
        const logForDate = task.dailyLogs?.find(
          (log: any) => log.date === selectedDate
        );
        const completedTime = logForDate ? logForDate.timeSpent : 0;
        let liveTime = 0;
        if (task.status === "in-progress" && task.lastStart) {
          const lastStartDate = dayjs(task.lastStart).format("YYYY-MM-DD");
          if (lastStartDate === selectedDate) {
            liveTime =
              new Date().getTime() - new Date(task.lastStart).getTime();
          }
        }

        const totalTaskTime = completedTime + liveTime;
        updatedTimers[task._id] = totalTaskTime;

        if (totalTaskTime > 0) {
          if (!logsByUser[user])
            logsByUser[user] = {
              totalMs: 0,
              taskCount: 0,
              inProgressToday: false,
            };

          logsByUser[user].totalMs += totalTaskTime;
          logsByUser[user].taskCount += 1;
          if (liveTime > 0) logsByUser[user].inProgressToday = true;
        }
      });

      setTimerMap(updatedTimers);
      const result = Object.entries(logsByUser)
        .filter(([_, data]) => data.totalMs > 0)
        .map(([user, data]) => ({
          user,
          formattedTime: formatTime(data.totalMs),
          taskCount: data.taskCount,
          inProgressToday: data.inProgressToday,
        }));

      setFilteredLogs(result);
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, selectedDate]);

  if (loading)
    return <div className="text-center py-10">Loading user logs...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center dark:text-white">
        User Log Time Report
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 dark:text-white">
        <label className="font-medium">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2 rounded w-full sm:w-auto dark:text-white dark:bg-gray-800 dark:scheme-dark cursor-pointer"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-400 text-sm sm:text-base">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="border p-2 text-center">User</th>
              <th className="border p-2 text-center">Tasks</th>
              <th className="border p-2 text-center">Total Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((u) => (
                <tr
                  key={u.user}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <td className="border p-2 text-center">{u.user}</td>
                  <td className="border p-2 text-center">{u.taskCount}</td>
                  <td className="border p-2 text-center">{u.formattedTime}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="border p-4 text-center text-gray-600 dark:text-gray-300"
                >
                  No logs found for {dayjs(selectedDate).format("MMM D, YYYY")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
