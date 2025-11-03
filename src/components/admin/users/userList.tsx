"use client";

import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Eye, EyeOff } from "lucide-react";

export const UserList = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [editedData, setEditedData] = useState({
    name: "",
    email: "",
    role: "",
    userId: "",
    password: "",
  });

  const token = Cookies.get("token");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [token]);

  const handleEdit = (user: any, userId: string) => {
    setSelectedUser(user);
    setEditedData({
      name: user.name,
      email: user.email,
      role: user.role,
      userId,
      password: "",
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedData),
      });

      const data = await res.json();

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id
              ? { ...u, ...editedData, password: undefined }
              : u
          )
        );
        toast.success("✅ User updated successfully!");
        setIsModalOpen(false);
      } else if (res.status === 409) {
        toast.error("❌ This email already exists. Please use a different one.");
      } else if (res.status === 400) {
        toast.error(data.message || "Please fill all required fields.");
      } else if (res.status === 401) {
        toast.error("⚠️ You are not authorized to perform this action.");
      } else {
        toast.error(data.message || "❌ Failed to update user.");
      }
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error("⚠️ Something went wrong. Please try again later.");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the user!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/user?userId=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== id));
        await Swal.fire("Deleted!", "The user has been removed.", "success");
      } else {
        Swal.fire("Error!", "Failed to delete the user.", "error");
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
        👥 User Management
      </h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-left">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user._id}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-3 flex justify-center gap-3">
                  <button
                    onClick={() => handleEdit(user, user._id)}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-full hover:bg-blue-600 active:scale-95 transition cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 active:scale-95 transition cursor-pointer"
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-gray-500 dark:text-gray-400"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Edit User
            </h2>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name"
                value={editedData.name}
                onChange={(e) =>
                  setEditedData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="border p-2 rounded-md dark:text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={editedData.email}
                onChange={(e) =>
                  setEditedData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="border p-2 rounded-md dark:text-white"
              />
              <select
                value={editedData.role}
                onChange={(e) =>
                  setEditedData((prev) => ({ ...prev, role: e.target.value }))
                }
                className="border p-2 rounded-md dark:text-white dark:bg-black"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password (optional)"
                  value={editedData.password}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="border p-2 rounded-md w-full dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 font-medium text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 font-medium text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
