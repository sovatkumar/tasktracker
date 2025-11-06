"use client";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

type Lead = {
  _id: string;
  title?: string;
  name?: string;
  status: string;
  nextFollowUp?: string;
  startDate?: string;
  createdAt?: string;
  price?: number;
};

type LeadFormInputs = {
  title: string;
};

export default function LeadManager() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormInputs>();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<Record<string, number>>({});
  const token = Cookies.get("token");

  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchLeads = async () => {
    try {
      const res = await axios.get("/api/admin/lead", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data.leads || []);
    } catch {
      toast.error("Failed to load leads");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onSubmit = async (data: LeadFormInputs) => {
    try {
      await axios.post(
        "/api/admin/lead",
        {
          name: data.title,
          startDate: new Date(),
          status: "pending",
          price: 0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Lead created successfully!");
      reset();
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const handleUpdate = async (leadId: string, updates: Partial<Lead>) => {
    try {
      await axios.post(
        "/api/admin/lead",
        {
          name: updates.title || updates.name,
          status: updates.status,
          nextFollowUp: updates.nextFollowUp,
          price: updates.price,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      fetchLeads();
    } catch {
      toast.error("Failed to update lead");
    }
  };

  const handlePriceChange = (lead: Lead, newPrice: number) => {
    setPriceUpdates((prev) => ({ ...prev, [lead._id]: newPrice }));

    if (debounceRefs.current[lead._id]) {
      clearTimeout(debounceRefs.current[lead._id]);
    }

    debounceRefs.current[lead._id] = setTimeout(() => {
      handleUpdate(lead._id, {
        title: lead.title || lead.name,
        status: lead.status,
        nextFollowUp: lead.nextFollowUp,
        price: newPrice,
      });
      toast.success("Price updated!");
    }, 800);
  };

  const deleteLead = async (leadId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the lead!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/api/admin/lead?leadId=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads((prev) => prev.filter((lead) => lead._id !== leadId));
      Swal.fire("Deleted!", "The Lead has been removed.", "success");
    } catch {
      Swal.fire("Error!", "Failed to delete the Lead.", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-4 sm:p-6 border rounded-2xl shadow-lg bg-white dark:bg-gray-900 dark:text-white overflow-x-auto">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-2"
      >
        <input
          type="text"
          {...register("title", { required: "Title is required" })}
          className="flex-1 w-full p-2 sm:p-3 border rounded-md dark:text-white"
          placeholder="Enter lead title"
        />
        <button
          type="submit"
          className="w-full sm:w-auto bg-green-600 text-white font-semibold px-6 py-2 sm:py-3 rounded-md hover:bg-green-700 active:scale-[.98] transition-transform cursor-pointer"
        >
          Create Lead
        </button>
      </form>

      {errors.title && (
        <p className="text-red-500 text-sm mb-4">{errors.title.message}</p>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Lead List</h2>
        {leads.length === 0 ? (
          <p className="text-gray-500">No leads found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border p-2">Name</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Start Date</th>
                  <th className="border p-2">Next Follow-Up</th>
                  <th className="border p-2">Price</th>
                  <th className="border p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="text-center">
                    <td className="border p-2">{lead.title || lead.name}</td>

                    <td className="border p-2">
                      <select
                        value={lead.status}
                        onChange={(e) =>
                          handleUpdate(lead._id, {
                            title: lead.title || lead.name,
                            status: e.target.value,
                          })
                        }
                        className="p-1 rounded border dark:text-white dark:bg-black"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="accepted">Accepted</option>
                        <option value="close">Close</option>
                      </select>
                    </td>

                    <td className="border p-2 text-gray-500 dark:text-white text-xs">
                      {lead.startDate
                        ? new Date(lead.startDate).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="border p-2 dark:text-white">
                      <input
                        type="date"
                        defaultValue={
                          lead.nextFollowUp
                            ? lead.nextFollowUp.split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleUpdate(lead._id, {
                            title: lead.title || lead.name,
                            nextFollowUp: e.target.value,
                            status: lead.status,
                          })
                        }
                        className="p-1 rounded border dark:text-white dark:bg-black dark:scheme-dark"
                      />
                    </td>

                    <td className="border p-2">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute left-2 text-gray-500 dark:text-gray-300">
                          $
                        </span>
                        <input
                          type="number"
                          value={
                            priceUpdates[lead._id] ??
                            (lead.price !== undefined ? lead.price : 0)
                          }
                          onChange={(e) =>
                            handlePriceChange(lead, Number(e.target.value || 0))
                          }
                          className="w-28 pl-5 p-1 text-center rounded border dark:text-white dark:bg-black"
                        />
                      </div>
                    </td>

                    <td className="border p-2">
                      <button
                        onClick={() => deleteLead(lead._id)}
                        className="px-3 sm:px-4 py-1 text-xs sm:text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600"
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
