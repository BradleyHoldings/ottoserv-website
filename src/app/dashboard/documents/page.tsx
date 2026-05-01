"use client";

import { useState } from "react";
import { mockDocuments, Document } from "@/lib/mockData";

const TYPE_ICONS: Record<string, string> = {
  contract: "📄",
  permit: "🏛️",
  receipt: "🧾",
  photo: "📸",
  coi: "🛡️",
  invoice: "💰",
  sop: "📋",
  estimate: "📝",
};

const TYPE_COLORS: Record<string, string> = {
  contract: "bg-blue-900/40 text-blue-400 border-blue-800",
  permit: "bg-purple-900/40 text-purple-400 border-purple-800",
  receipt: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  photo: "bg-green-900/40 text-green-400 border-green-800",
  coi: "bg-orange-900/40 text-orange-400 border-orange-800",
  invoice: "bg-teal-900/40 text-teal-400 border-teal-800",
  sop: "bg-indigo-900/40 text-indigo-400 border-indigo-800",
  estimate: "bg-gray-800 text-gray-400 border-gray-700",
};

const CATEGORY_TABS = ["all", "contract", "permit", "receipt", "photo", "coi", "invoice", "sop", "estimate"];

export default function DocumentsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [folderView, setFolderView] = useState<"type" | "project" | "recent">("type");

  const filtered =
    typeFilter === "all" ? mockDocuments : mockDocuments.filter((d) => d.type === typeFilter);

  const sorted =
    folderView === "recent"
      ? [...filtered].sort((a, b) => b.date.localeCompare(a.date))
      : filtered;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-500 text-sm mt-1">{mockDocuments.length} files stored</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          ↑ Upload Document
        </button>
      </div>

      {/* Folder View Toggle */}
      <div className="flex gap-2 mb-4">
        {(["type", "project", "recent"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFolderView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              folderView === v
                ? "bg-blue-600 text-white"
                : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {v === "type" ? "By Type" : v === "project" ? "By Project" : "Recent"}
          </button>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === t
                ? "bg-blue-600 text-white"
                : "bg-[#111827] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {t !== "all" && <span>{TYPE_ICONS[t]}</span>}
            {t === "all" ? "All" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-6 py-3">Name</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Type</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Project</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Uploaded By</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Date</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Size</th>
              <th className="text-center text-gray-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[doc.type]}</span>
                    <span className="text-white">{doc.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${TYPE_COLORS[doc.type]}`}>
                    {doc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{doc.project}</td>
                <td className="px-4 py-3 text-gray-400">{doc.uploaded_by}</td>
                <td className="px-4 py-3 text-gray-400">{doc.date}</td>
                <td className="px-4 py-3 text-right text-gray-500">{doc.size}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-blue-400 hover:text-blue-300 text-xs">Preview</button>
                    <button className="text-gray-400 hover:text-white text-xs">Download</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="mt-4 bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-white font-medium">No documents match this filter</p>
        </div>
      )}
    </div>
  );
}
