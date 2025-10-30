"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const role = Cookies.get("role");
  if (pathname === "/" || pathname === "/admin/signup") return null;

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("role");
    router.push("/");
  };

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold hover:text-gray-300">
        Working Status
      </Link>
      <div className="space-x-4 flex items-center">
        {role === "admin" && (
          <div className="flex gap-4 justify-end items-center p-4 rounded-lgshadow-sm">
            <button
              onClick={() => router.push("/admin/signup")}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              Signup
            </button>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              Admin Dashboard
            </button>
            <button
              onClick={() => router.push("/admin/userlogtime")}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              View Log Time
            </button>
            <button
              onClick={() => router.push("/admin/users")}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              User List
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded cursor-pointer"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
