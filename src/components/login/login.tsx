"use client";

import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

type LoginFormInputs = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", data);
      Cookies.set("token", response.data.token, { expires: 1 });
      Cookies.set("role", response.data.role, { expires: 1 });
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4 sm:px-6">
      <div className="w-full max-w-md sm:max-w-sm md:max-w-md mx-auto mt-8 sm:mt-10 p-6 sm:p-8 border rounded-2xl shadow-md bg-white dark:bg-gray-900 transition-all duration-300">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-800 dark:text-gray-100">
          Login
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 sm:space-y-5"
        >
          <div>
            <label className="block mb-1 text-gray-700 dark:text-white text-sm sm:text-base">
              Email
            </label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              className="w-full p-2 sm:p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:bg-gray-800"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="relative">
            <label className="block mb-1 text-gray-700 dark:text-white text-sm sm:text-base">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: "Password is required" })}
              className="w-full p-2 sm:p-3 border rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:bg-gray-800"
            />
            <span
              className="absolute right-3 top-9 sm:top-10 cursor-pointer text-gray-600 hover:text-gray-800"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </span>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 sm:p-3 rounded-md hover:bg-blue-700 transition duration-200 cursor-pointer text-sm sm:text-base"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
