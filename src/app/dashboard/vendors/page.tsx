"use client";

import { useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockVendors, Vendor } from "@/lib/mockData";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-yellow-400" : "text-gray-700"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function VendorsPage() {
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered =
    statusFilter === "all" ? mockVendors : mockVendors.filter((v) => v.status === statusFilter);

  const activeCount = mockVendors.filter((v) => v.status === "active").length;
  const totalSpent = mockVendors.reduce((s, v) => s + v.total_spent, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendors & Subs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeCount} active vendors · ${totalSpent.toLocaleString()} total spent
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Add Vendor
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        {["all", "active", "inactive", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((vendor) => (
          <button
            key={vendor.id}
            onClick={() => setSelected(vendor)}
            className="text-left bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-blue-800 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold">{vendor.name}</h3>
                <p className="text-blue-400 text-sm">{vendor.trade}</p>
              </div>
              <StatusBadge status={vendor.status} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <StarRating rating={vendor.rating} />
              <span className="text-gray-500 text-xs">({vendor.rating}/5)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500 mb-0.5">Contact</p>
                <p className="text-gray-300">{vendor.contact_name}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Active Jobs</p>
                <p className="text-gray-300">{vendor.active_jobs}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Total Spent</p>
                <p className="text-green-400 font-medium">${vendor.total_spent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Insurance</p>
                <p className={vendor.insurance_verified ? "text-green-400" : "text-red-400"}>
                  {vendor.insurance_verified ? "✓ Verified" : "✗ Missing"}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Vendor Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md h-full bg-[#111827] border-l border-gray-800 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <p className="text-blue-400 text-sm">{selected.trade}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} size="md" />
                <StarRating rating={selected.rating} />
              </div>

              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Contact Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="text-white">{selected.contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-white">{selected.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-white">{selected.email}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Compliance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Insurance</span>
                    <span className={selected.insurance_verified ? "text-green-400" : "text-red-400"}>
                      {selected.insurance_verified ? "✓ Verified" : "✗ Not on file"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">License #</span>
                    <span className="text-white">{selected.license_number || "Not provided"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">Performance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rating</span>
                    <StarRating rating={selected.rating} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Jobs</span>
                    <span className="text-white">{selected.active_jobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Spent</span>
                    <span className="text-green-400 font-medium">${selected.total_spent.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                View Work Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
