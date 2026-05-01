"use client";

import { useState, useMemo } from "react";
import { mockCompanies, mockContacts, mockDeals, Company } from "@/lib/mockData";
import StatusBadge from "@/components/dashboard/StatusBadge";

const INDUSTRY_ICONS: Record<string, string> = {
  "Real Estate": "🏠",
  "Real Estate Investment": "📈",
  "Plumbing Contractor": "🔧",
  "Electrical Contractor": "⚡",
  "Material Supplier": "📦",
  default: "🏢",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900/40 text-green-400 border-green-800",
  prospect: "bg-blue-900/40 text-blue-400 border-blue-800",
  inactive: "bg-gray-800 text-gray-400 border-gray-700",
};

function CompanyStatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status] || "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {status}
    </span>
  );
}

function formatCurrency(n: number) {
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
  return "$" + n.toLocaleString();
}

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    return mockCompanies.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const companyContacts = selectedCompany
    ? mockContacts.filter((c) => c.company_id === selectedCompany.id)
    : [];

  const companyDeals = selectedCompany
    ? mockDeals.filter((d) => d.company_id === selectedCompany.id)
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} of {mockCompanies.length} accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Company
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2 w-64 outline-none focus:border-blue-500 placeholder:text-gray-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
        {(statusFilter !== "all" || search) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="text-gray-500 hover:text-white text-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((company) => (
          <button
            key={company.id}
            onClick={() => setSelectedCompany(company)}
            className="text-left bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-blue-800 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                  {INDUSTRY_ICONS[company.industry] || INDUSTRY_ICONS.default}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">
                    {company.name}
                  </p>
                  <p className="text-gray-500 text-xs">{company.industry}</p>
                </div>
              </div>
              <CompanyStatusBadge status={company.status} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-[#0f1117] rounded-lg p-2 text-center">
                <p className="text-white font-semibold text-sm">
                  {company.contact_count}
                </p>
                <p className="text-gray-600 text-xs">Contacts</p>
              </div>
              <div className="bg-[#0f1117] rounded-lg p-2 text-center">
                <p className="text-white font-semibold text-sm">
                  {company.deal_count}
                </p>
                <p className="text-gray-600 text-xs">Deals</p>
              </div>
              <div className="bg-[#0f1117] rounded-lg p-2 text-center">
                <p className="text-green-400 font-semibold text-sm">
                  {company.total_revenue > 0
                    ? formatCurrency(company.total_revenue)
                    : "—"}
                </p>
                <p className="text-gray-600 text-xs">Revenue</p>
              </div>
            </div>

            {/* Location */}
            <p className="text-gray-500 text-xs">
              📍 {company.city}, {company.state}
            </p>

            {/* Tags */}
            {company.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {company.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-500 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <p className="text-gray-600 text-sm">
              No companies match your filters.
            </p>
          </div>
        )}
      </div>

      {/* Company Detail Panel */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedCompany(null)}
          />
          <div className="relative w-full max-w-md h-full bg-[#111827] border-l border-gray-800 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">
                    {INDUSTRY_ICONS[selectedCompany.industry] ||
                      INDUSTRY_ICONS.default}
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    {selectedCompany.name}
                  </h2>
                </div>
                <p className="text-gray-500 text-xs">{selectedCompany.id}</p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-gray-500 hover:text-white text-xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <CompanyStatusBadge status={selectedCompany.status} />

              {/* Overview Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-xl">
                    {selectedCompany.contact_count}
                  </p>
                  <p className="text-gray-500 text-xs">Contacts</p>
                </div>
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-xl">
                    {selectedCompany.deal_count}
                  </p>
                  <p className="text-gray-500 text-xs">Deals</p>
                </div>
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-green-400 font-bold text-lg">
                    {selectedCompany.total_revenue > 0
                      ? formatCurrency(selectedCompany.total_revenue)
                      : "—"}
                  </p>
                  <p className="text-gray-500 text-xs">Revenue</p>
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                  Company Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Industry</span>
                    <span className="text-white">
                      {selectedCompany.industry}
                    </span>
                  </div>
                  {selectedCompany.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="text-white">
                        {selectedCompany.phone}
                      </span>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Website</span>
                      <span className="text-blue-400">
                        {selectedCompany.website}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location</span>
                    <span className="text-white">
                      {selectedCompany.city}, {selectedCompany.state}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-white">
                      {selectedCompany.created_at}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contacts */}
              {companyContacts.length > 0 && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Contacts ({companyContacts.length})
                  </h3>
                  <div className="space-y-2">
                    {companyContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3"
                      >
                        <div className="w-7 h-7 bg-blue-600/20 border border-blue-800 rounded-full flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0">
                          {contact.first_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm">
                            {contact.full_name}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {contact.email}
                          </p>
                        </div>
                        <span
                          className={`ml-auto text-xs px-1.5 py-0.5 rounded border capitalize flex-shrink-0 ${
                            STATUS_COLORS[contact.contact_type] ||
                            "bg-gray-800 text-gray-400 border-gray-700"
                          }`}
                        >
                          {contact.contact_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deals */}
              {companyDeals.length > 0 && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Deals ({companyDeals.length})
                  </h3>
                  <div className="space-y-2">
                    {companyDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <p className="text-gray-300 text-sm truncate">
                          {deal.name}
                        </p>
                        <span className="text-green-400 text-sm font-medium flex-shrink-0">
                          ${deal.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedCompany.tags.length > 0 && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCompany.notes && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Notes
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedCompany.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Add Contact
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Create Deal
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Log Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#111827] border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Add Company</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">
                  Company Name
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Industry
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="e.g. Real Estate"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Status
                </label>
                <select className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500">
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Phone
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="555-000-0000"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Website
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="company.com"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500 resize-none"
                  placeholder="Any notes about this company..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
