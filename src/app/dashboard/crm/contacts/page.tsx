"use client";

import { useState, useMemo } from "react";
import { mockContacts, Contact } from "@/lib/mockData";
import StatusBadge from "@/components/dashboard/StatusBadge";

const TYPE_COLORS: Record<string, string> = {
  lead: "bg-blue-900/40 text-blue-400 border-blue-800",
  customer: "bg-green-900/40 text-green-400 border-green-800",
  vendor: "bg-purple-900/40 text-purple-400 border-purple-800",
  subcontractor: "bg-orange-900/40 text-orange-400 border-orange-800",
  other: "bg-gray-800 text-gray-400 border-gray-700",
};

const SOURCE_ICONS: Record<string, string> = {
  referral: "👥",
  google: "🔍",
  facebook: "📘",
  website: "🌐",
  internal: "🏢",
  call: "📞",
};

function TypeBadge({ type }: { type: string }) {
  const color =
    TYPE_COLORS[type] || "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {type}
    </span>
  );
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    return mockContacts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company_name || "").toLowerCase().includes(q) ||
        c.phone.includes(q);
      const matchType = typeFilter === "all" || c.contact_type === typeFilter;
      const matchStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [search, typeFilter, statusFilter]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} of {mockContacts.length} contacts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2 w-64 outline-none focus:border-blue-500 placeholder:text-gray-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="lead">Lead</option>
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="subcontractor">Subcontractor</option>
          <option value="other">Other</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(typeFilter !== "all" || statusFilter !== "all" || search) && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setStatusFilter("all");
            }}
            className="text-gray-500 hover:text-white text-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Type summary chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["lead", "customer", "vendor", "subcontractor"] as const).map(
          (type) => {
            const count = mockContacts.filter(
              (c) => c.contact_type === type
            ).length;
            return (
              <button
                key={type}
                onClick={() =>
                  setTypeFilter(typeFilter === type ? "all" : type)
                }
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === type
                    ? TYPE_COLORS[type]
                    : "bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="capitalize">{type}s</span>
                <span className="opacity-70">{count}</span>
              </button>
            );
          }
        )}
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => setSelectedContact(contact)}
            className="text-left bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-blue-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">
                  {contact.full_name}
                </p>
                {contact.company_name && (
                  <p className="text-gray-500 text-xs mt-0.5 truncate">
                    {contact.company_name}
                  </p>
                )}
              </div>
              <TypeBadge type={contact.contact_type} />
            </div>
            <div className="space-y-1 text-sm mb-3">
              <p className="text-gray-400 truncate">📧 {contact.email}</p>
              <p className="text-gray-400">📞 {contact.phone}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={contact.status} />
              <span className="text-gray-600 text-xs">
                {SOURCE_ICONS[contact.source] || "📌"} {contact.source}
              </span>
            </div>
            {contact.assigned_to && (
              <p className="text-gray-600 text-xs mt-2">
                Assigned: {contact.assigned_to}
                {contact.assigned_agent && (
                  <span className="text-orange-500 ml-1">
                    · {contact.assigned_agent}
                  </span>
                )}
              </p>
            )}
            {contact.last_contacted_at && (
              <p className="text-gray-600 text-xs mt-0.5">
                Last contacted: {contact.last_contacted_at}
              </p>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <p className="text-gray-600 text-sm">
              No contacts match your filters.
            </p>
          </div>
        )}
      </div>

      {/* Contact Detail Panel */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedContact(null)}
          />
          <div className="relative w-full max-w-md h-full bg-[#111827] border-l border-gray-800 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedContact.full_name}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {selectedContact.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-gray-500 hover:text-white text-xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Type & Status */}
              <div className="flex items-center gap-3">
                <TypeBadge type={selectedContact.contact_type} />
                <StatusBadge status={selectedContact.status} size="md" />
              </div>

              {/* Contact Info */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                  Contact Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Email</span>
                    <span className="text-blue-400 truncate">
                      {selectedContact.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-white">{selectedContact.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preferred</span>
                    <span className="text-white capitalize">
                      {selectedContact.preferred_contact_method}
                    </span>
                  </div>
                  {selectedContact.company_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Company</span>
                      <span className="text-white">
                        {selectedContact.company_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                  Location
                </h3>
                <p className="text-gray-300 text-sm">
                  {selectedContact.address}
                </p>
                <p className="text-gray-400 text-sm">
                  {selectedContact.city}, {selectedContact.state}{" "}
                  {selectedContact.zip}
                </p>
              </div>

              {/* CRM Details */}
              <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                  CRM Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-white capitalize">
                      {selectedContact.source}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned To</span>
                    <span className="text-white">
                      {selectedContact.assigned_to}
                    </span>
                  </div>
                  {selectedContact.assigned_agent && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">AI Agent</span>
                      <span className="text-orange-400">
                        {selectedContact.assigned_agent}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-white">
                      {selectedContact.created_at}
                    </span>
                  </div>
                  {selectedContact.last_contacted_at ? (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Contact</span>
                      <span className="text-white">
                        {selectedContact.last_contacted_at}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Contact</span>
                      <span className="text-red-400 text-xs">Never</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedContact.tags.length > 0 && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag) => (
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
              {selectedContact.notes_summary && (
                <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-gray-400 text-xs font-medium uppercase mb-3">
                    Notes
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedContact.notes_summary}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Log Activity
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Send Email
                </button>
                <button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
                  Create Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#111827] border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Add Contact</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  First Name
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Last Name
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="Last name"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="email@example.com"
                />
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
                  Type
                </label>
                <select className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500">
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Source
                </label>
                <select className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500">
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="call">Call</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Company
                </label>
                <input
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500"
                  placeholder="Company name"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500 resize-none"
                  placeholder="Any initial notes..."
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
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
