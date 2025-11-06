"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const role = Cookies.get("role");
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === "/" || pathname === "/admin/signup") return null;

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("role");
    router.push("/");
  };

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center relative">
      <Link
        href="/"
        className="text-xl font-bold hover:text-gray-300 whitespace-nowrap"
      >
        Working Status
      </Link>

      <div className="hidden md:flex items-center space-x-4">
        {role === "admin" && (
          <div className="flex gap-4 justify-end items-center p-4 rounded-lg shadow-sm">
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
             <button
              onClick={() => router.push("/admin/lead")}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              Create Lead
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

      <button
        className="md:hidden flex items-center text-white"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-gray-800 flex flex-col items-start p-4 space-y-3 md:hidden border-t border-gray-700 z-50">
          {role === "admin" && (
            <>
              <button
                onClick={() => {
                  router.push("/admin/signup");
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                Signup
              </button>
              <button
                onClick={() => {
                  router.push("/admin/dashboard");
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => {
                  router.push("/admin/userlogtime");
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                View Log Time
              </button>
              <button
                onClick={() => {
                  router.push("/admin/users");
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                User List
              </button>
            </>
          )}
          <button
            onClick={() => {
              handleLogout();
              setMenuOpen(false);
            }}
            className="w-full text-left bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
