"use client";

import { useEffect, useState } from "react";
import AdminAddTask from "../task/admin/admin";
import UserTask from "../task/user/userTask";
import Cookies from "js-cookie";

export default function UserTaskManager() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const r = Cookies.get("role") || null;
    setRole(r);
  }, []);

  if (role === null) return null;

  return <>{role === "admin" ? <AdminAddTask /> : <UserTask />}</>;
}
