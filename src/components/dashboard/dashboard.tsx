"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

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

  useEffect(() => {
    const token: any = Cookies.get("token");
    const decoded: any = jwtDecode(token);
    setUserId(decoded?.userId);
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [timerMap, setTimerMap] = useState<Record<string, number>>({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const fetchTasks = async () => {
    if (!userId) return;
    try {
      const res = await axios.get("/api/tasks", { params: { userId } });
      setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [userId]);

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
      await axios.post("/api/tasks", {
        userId,
        name,
        action,
        ...(action === "start" && { startDate: now }),
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
  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 border rounded shadow min-w-min">
      <h2 className="text-2xl font-bold mb-4">Task Manager</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex mb-4 gap-2">
        <input
          type="text"
          {...register("taskName", { required: "Task name is required" })}
          placeholder="Enter new task"
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 cursor-pointer"
        >
          Create
        </button>
      </form>

      {errors.taskName && (
        <p className="text-red-500 mb-2">{errors.taskName.message}</p>
      )}
      {tasks?.length > 0 && (
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2 ">Task</th>
              <th className="border p-2">Status</th>
              <th className="border p-2 w-4xl">Time </th>
              <th className="border p-2 ">Start Date</th>
              <th className="border p-2">End Date</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task._id}>
                <td
                  className="border p-2 text-left truncate max-w-xs cursor-pointer"
                  title={task.name}
                >
                  {task.name?.length > 40
                    ? task.name.slice(0, 40) + "..."
                    : task.name}
                </td>
                <td className="border p-2 truncate ">{task.status}</td>
                <td className="border p-2 text-center truncate">
                  {formatTime(timerMap[task._id] || 0)}
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
                <td className="border p-2 flex gap-2 justify-center">
                  {task.status !== "completed" ? (
                    <>
                      <button
                        onClick={() => handleAction(task.name, "start")}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 cursor-pointer"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleAction(task.name, "stop")}
                        className="bg-yellow-600 text-white p-1 rounded hover:bg-yellow-700 cursor-pointer"
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => handleAction(task.name, "complete")}
                        className="bg-green-600 text-white p-1 rounded hover:bg-green-700 cursor-pointer"
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
      )}
    </div>
  );
}
