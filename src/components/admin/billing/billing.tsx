"use client";

import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

type FormData = {
  billingName: string;
};

export default function AdminBillingPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: data.billingName }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "Something went wrong");
        return;
      }

      toast.success("Billing created successfully");
      reset();
    } catch (error) {
      console.error(error);
      toast.error("Server error");
    }
  };

  return (
    <div className="min-h-[89vh] bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border p-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800">
            Admin Billing
          </h2>
          <p className="text-sm text-gray-500 mt-1">Create a new billing ID</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Name
            </label>

            <input
              {...register("billingName", {
                required: "Billing name is required",
                minLength: {
                  value: 3,
                  message: "Billing name must be at least 3 characters",
                },
              })}
              placeholder="Enter billing name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.billingName
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500 focus:border-blue-500"
              }`}
            />

            {errors.billingName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.billingName.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Billing"}
          </button>
        </form>
      </div>
    </div>
  );
}
