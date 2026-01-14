"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

type BillingFormData = {
  taskName: string;
  billingId: string;
  totalHours: number;
  status: "inprogress" | "completed" | "pending";
};

export const Billing = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [billingList, setBillingList] = useState<any[]>([]);
  const [billlingIDs, setBillingIDs] = useState<any[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BillingFormData>({
    defaultValues: {
      taskName: "",
      billingId: "",
      totalHours: 0,
      status: "pending",
    },
  });

  useEffect(() => {
    const token: any = Cookies.get("token");
    if (token) {
      const decoded: any = jwtDecode(token);
      setUserId(decoded?.userId);
    }
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const res = await fetch(`/api/billing`);
      const billingId = await fetch("/api/admin/billing");
      const billngResoinse = await billingId.json();
      setBillingIDs(billngResoinse.billingIDs || []);
      const data = await res.json();
      setBillingList(data.billing || []);
    } catch (error) {
      toast.error("Failed to fetch billing");
    }
  };

  const onSubmit = async (formData: BillingFormData) => {
    if (!userId) return toast.error("User not authenticated");

    try {
      const res = await fetch("/api/billing/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, userId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Billing created successfully");
        reset();
        fetchBilling();
      } else {
        toast.error("Failed to create billing");
      }
    } catch (error) {
      toast.error("Failed to create billing");
    }
  };

  const updateStatus = async (billingId: string, status: string) => {
    if (!status) return;

    try {
      const res = await fetch("/api/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingId, status }),
      });

      if (res.ok) {
        fetchBilling();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-8">
      <div className="p-6 border rounded-lg shadow-md bg-white">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Billing</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            {...register("taskName", { required: "Task name is required" })}
            type="text"
            placeholder="Enter task name"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              errors.taskName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.taskName && (
            <p className="text-red-500 text-sm">{errors.taskName.message}</p>
          )}

          <select
            {...register("billingId", { required: "Billing ID is required" })}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              errors.billingId ? "border-red-500" : "border-gray-300"
            }`}
          >
            {billlingIDs.map((bill: any) => (
              <option key={bill._id} value={bill.name}>
                {bill.name}
              </option>
            ))}
          </select>

          {errors.billingId && (
            <p className="text-red-500 text-sm">{errors.billingId.message}</p>
          )}

          <label className="block font-medium">
            Total Hours need to complete in this week
          </label>
          <input
            {...register("totalHours", {
              required: "Total hours is required",
              min: { value: 1, message: "Hours must be at least 1" },
            })}
            type="number"
            placeholder="Total hours for this week"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              errors.totalHours ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.totalHours && (
            <p className="text-red-500 text-sm">{errors.totalHours.message}</p>
          )}

          <select
            {...register("status", { required: true })}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="pending">Pending</option>
            <option value="inprogress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
          >
            Submit
          </button>
        </form>
      </div>

      <div className="overflow-x-auto bg-white border rounded-lg shadow-md p-4">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Billing Entries
        </h3>
        {billingList.length === 0 ? (
          <p className="text-center text-gray-500">No billing records found.</p>
        ) : (
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "Task Name",
                  "Billing ID",
                  "Total Hours",
                  "Status",
                  "Created By",
                  "Created At",
                  "Update Status",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-2 border border-gray-300 text-left"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billingList.map((bill, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition border-b border-gray-200"
                >
                  <td className="px-4 py-2 border">{bill.taskName}</td>
                  <td className="px-4 py-2 border">{bill.billingId}</td>
                  <td className="px-4 py-2 border">{bill.totalHours}</td>
                  <td className="px-4 py-2 border capitalize">{bill.status}</td>
                  <td className="px-4 py-2 border">{bill.createdBy}</td>
                  <td className="px-4 py-2 border">
                    {new Date(bill.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 border">
                    <select
                      value={bill.status || ""}
                      onChange={(e) => updateStatus(bill._id, e.target.value)}
                      className="px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Select status</option>
                      <option value="inprogress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
