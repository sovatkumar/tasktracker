"use client";

import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import Cookies from "js-cookie";

type SignupFormInputs = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export default function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormInputs>();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const token = Cookies.get("token");

  const onSubmit = async (data: SignupFormInputs) => {
    setLoading(true);

    try {
      await axios.post("/api/user", data,{headers:{Authorization: `Bearer ${token}`}});
      toast.success("User created successfully!");
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-[90%] sm:w-[85%] md:w-[70%] lg:w-[60%] xl:w-[40%] mx-auto mt-10 p-6 sm:p-8 border rounded-2xl shadow-lg bg-white dark:bg-gray-900">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800 dark:text-white">
        Sign Up
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 sm:space-y-6 text-sm sm:text-base"
      >
        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-white">
            Name
          </label>
          <input
            type="text"
            {...register("name", { required: "Name is required" })}
            className="w-full p-2 sm:p-3 border rounded-md dark:text-white"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-white">
            Email
          </label>
          <input
            type="email"
            {...register("email", { required: "Email is required" })}
            className="w-full p-2 sm:p-3 border rounded-md dark:text-white"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-white">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: "Password is required" })}
              className="w-full p-2 sm:p-3 border rounded-md pr-10 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-white">
            Role
          </label>
          <select
            {...register("role", { required: "Role is required" })}
            className="w-full p-2 sm:p-3 border rounded-md dark:text-white dark:bg-black"
          >
            <option value="">Select role</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role && (
            <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white font-semibold p-2 sm:p-3 rounded-md hover:bg-green-700 active:scale-[.98] transition-transform cursor-pointer"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
