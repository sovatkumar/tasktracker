"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

type AssignedUser = {
  _id: string;
  name: string;
};

type Task = {
  _id: string;
  name: string;
  userId: string;
  userName?: string;
  assignedUsers?: AssignedUser[];
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
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tasksPerPage = 10;

  const [startDate, endDate] = dateRange;

  const fetchTasks = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allTasks: any = res.data.tasks || [];
      setTasks(allTasks);

      // Create unique users list for filter dropdown including assignedUsers and userId
      const userMap = new Map<string, { id: string; name: string }>();

      allTasks.forEach((task: any) => {
        // Add assignedUsers
        task.assignedUsers?.forEach((u: any) => {
          if (!userMap.has(u._id)) {
            userMap.set(u._id, { id: u._id, name: u.name });
          }
        });

        // Add single userId if not in assignedUsers
        if (task.userId && !userMap.has(task.userId)) {
          userMap.set(task.userId, {
            id: task.userId,
            name: task.userName || task.userId,
          });
        }
      });

      setUsers(Array.from(userMap.values()));
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
          taskId: task._id,
          name: task.name,
          action: "set-deadline",
          deadline: deadlineDate,
          assignedUserIds: task.assignedUsers?.map((u) => u._id) || [],
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
    const matchesUser = selectedUser
      ? task.assignedUsers?.some((u) => u._id === selectedUser) ||
        task.userId === selectedUser
      : true;

    // Filter by date range
    let matchesDate = true;
    if (startDate && endDate && task.endDate) {
      const taskEnd = new Date(task.endDate);
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      matchesDate = taskEnd >= startDate && taskEnd <= adjustedEndDate;
    }

    const matchesStatus = selectedStatus
      ? selectedStatus === "missed"
        ? task.deadline &&
          new Date(task.deadline) < new Date() 
        : task.status === selectedStatus
      : true;

    return matchesUser && matchesDate && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * tasksPerPage,
    currentPage * tasksPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser, selectedStatus, dateRange]);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-4 sm:p-6 border rounded-2xl shadow-lg bg-white dark:bg-gray-900 dark:text-white overflow-x-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Admin Task Dashboard
      </h1>

      <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-auto">
          <label className="mr-2 font-semibold block sm:inline mb-1 sm:mb-0">
            Filter by User:
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border p-2 rounded w-full sm:w-auto dark:text-white dark:bg-black"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="mr-2 font-semibold block sm:inline mb-1 sm:mb-0">
            Select Date Range:
          </label>
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(update: [Date | null, Date | null]) =>
              setDateRange(update)
            }
            isClearable
            placeholderText="Select date range"
            className="border p-2 rounded w-full sm:w-auto dark:text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 justify-center">
        {[
          { label: "Completed", color: "bg-green-400", status: "completed" },
          { label: "Paused", color: "bg-yellow-300", status: "paused" },
          { label: "In Progress", color: "bg-blue-700", status: "in-progress" },
          { label: "Missed Deadline", color: "bg-red-500", status: "missed" },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => setSelectedStatus(item.status)}
            className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md text-sm ${
              selectedStatus === item.status
                ? "ring-2 ring-offset-2 ring-gray-600 dark:ring-white"
                : ""
            }`}
          >
            <span className={`w-3 h-3 ${item.color} rounded-full`}></span>
            <span className="font-medium">{item.label}</span>
          </div>
        ))}

        <button
          onClick={() => {
            setSelectedUser("");
            setSelectedStatus("");
            setDateRange([null, null]);
            fetchTasks();
          }}
          className="px-3 py-1 rounded-md bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
        >
          Reset Filters
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border mt-2 min-w-[700px] sm:min-w-0">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-sm sm:text-base">
              <th className="border p-3">Assigned Users</th>
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
            {paginatedTasks.map((task) => {
              const now = new Date();
              const deadlineDate = task.deadline
                ? new Date(task.deadline)
                : undefined;
              const isOverdue =
                deadlineDate &&
                deadlineDate.getTime() < now.getTime()

              let rowColor = "";
              if (isOverdue) rowColor = "bg-red-500 text-white";
              else {
                switch (task.status) {
                  case "completed":
                    rowColor = "text-white bg-green-400";
                    break;
                  case "paused":
                    rowColor = "text-white bg-[#ffbd03]";
                    break;
                  case "in-progress":
                    rowColor = "text-white bg-blue-700";
                    break;
                }
              }

              return (
                <tr key={task._id} className="border-b text-xs sm:text-sm">
                  <td className="border p-2 text-center">
                    {task.assignedUsers?.length
                      ? task.assignedUsers
                          .map((u) => u.name || u._id)
                          .join(", ")
                      : task.userName || task.userId}
                  </td>

                  <td className="border p-2 text-center">{task.name}</td>
                  <td
                    className={`border p-2 text-center capitalize ${rowColor}`}
                  >
                    {task.status}
                  </td>
                  <td className="border p-2 text-center font-medium">
                    {formatTime(timerMap[task._id] || 0)}
                  </td>
                  <td className="border p-2 text-center whitespace-nowrap">
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
                  <td className="border p-2 text-center whitespace-nowrap">
                    {task.endDate
                      ? new Date(task.endDate).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "-"}
                  </td>
                  <td className="border p-2 text-center whitespace-nowrap">
                    {task.deadline
                      ? new Date(task.deadline).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "-"}
                    <div className="mt-1">
                      <DatePicker
                        selected={
                          deadlinePicker[task._id]
                            ? new Date(deadlinePicker[task._id]!)
                            : task.deadline
                            ? new Date(task.deadline)
                            : null
                        }
                        minDate={
                          task.deadline && task.startDate
                            ? new Date(task.startDate)
                            : new Date()
                        }
                        onChange={(date: Date | null) => {
                          if (date) {
                            const selectedDate = new Date(date);
                            const hasTime =
                              selectedDate.getHours() !== 0 ||
                              selectedDate.getMinutes() !== 0;
                            if (!hasTime) selectedDate.setHours(19, 0, 0, 0);

                            setDeadlinePicker((prev: any) => ({
                              ...prev,
                              [task._id]: selectedDate,
                            }));

                            setDeadline(task, selectedDate);
                          }
                        }}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="dd/MM/yyyy HH:mm"
                        placeholderText="Select date & time"
                        disabled={task.status === "completed"}
                        openToDate={new Date(new Date().setHours(17, 0, 0, 0))}
                        injectTimes={[
                          new Date(new Date().setHours(17, 0, 0, 0)),
                        ]}
                        className="border text-xs sm:text-sm p-1 rounded w-full sm:w-44 text-center mt-1 dark:text-white dark:bg-gray-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  </td>
                  <td className="border p-2 sm:p-3 text-center">
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="px-3 sm:px-4 py-1 text-xs sm:text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600"
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
                  className="border p-4 text-center text-gray-500 dark:text-white text-sm"
                >
                  No tasks found for the selected filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mt-6 text-sm sm:text-base">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 sm:px-4 py-2 rounded-lg ${
              currentPage === 1
                ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-2 sm:px-3 py-1 rounded-lg ${
                currentPage === i + 1
                  ? "bg-blue-700 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 sm:px-4 py-2 rounded-lg ${
              currentPage === totalPages
                ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
