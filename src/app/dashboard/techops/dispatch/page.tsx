"use client";

import { useState } from "react";
import Link from "next/link";
import { mockDispatchPackets, DispatchPacket } from "@/lib/mockData";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-800 text-gray-400 border-gray-700",
  ready: "bg-blue-900/40 text-blue-400 border-blue-800",
  dispatched: "bg-purple-900/40 text-purple-400 border-purple-800",
  complete: "bg-green-900/40 text-green-400 border-green-800",
};

export default function DispatchPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/techops" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Back to TechOps
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dispatch Packets</h1>
        <p className="text-gray-500 text-sm mt-1">{mockDispatchPackets.length} packets</p>
      </div>

      <div className="space-y-4">
        {mockDispatchPackets.map((packet) => {
          const isOpen = expanded === packet.id;
          const done = packet.checklist.filter((c) => c.done).length;
          const total = packet.checklist.length;

          return (
            <div key={packet.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              {/* Card Header */}
              <div
                className="p-5 cursor-pointer hover:bg-[#1a2332] transition-colors"
                onClick={() => toggleExpand(packet.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-400 font-mono text-xs">{packet.id}</span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-gray-500 text-xs font-mono">{packet.ticket_id}</span>
                    </div>
                    <h3 className="text-white font-semibold">{packet.client}</h3>
                    <p className="text-gray-400 text-sm">{packet.site}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_COLORS[packet.status]}`}>
                      {packet.status}
                    </span>
                    <span className="text-gray-500 text-xs">{done}/{total} checklist</span>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mt-3 leading-relaxed line-clamp-2">{packet.job_scope}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {packet.tools_needed.slice(0, 3).map((tool) => (
                    <span key={tool} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                      {tool}
                    </span>
                  ))}
                  {packet.tools_needed.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-500">
                      +{packet.tools_needed.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-gray-600 text-xs">Created {packet.created_at}</span>
                  <span className="text-blue-400 text-xs font-medium">{isOpen ? "Collapse ↑" : "View Full Packet ↓"}</span>
                </div>
              </div>

              {/* Expanded Detail */}
              {isOpen && <PacketDetail packet={packet} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PacketDetail({ packet }: { packet: DispatchPacket }) {
  const [checklist, setChecklist] = useState(packet.checklist.map((c) => ({ ...c })));

  function toggle(i: number) {
    setChecklist((prev) => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c));
  }

  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="border-t border-gray-800 bg-[#0f1117]">
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Job Scope */}
        <div className="md:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-4">
          <h4 className="text-gray-400 text-xs font-medium uppercase mb-2">Job Scope</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{packet.job_scope}</p>
        </div>

        {/* Site & Contact */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <h4 className="text-gray-400 text-xs font-medium uppercase mb-3">Site & Contact</h4>
          <div className="space-y-2 text-sm">
            {[
              ["Address", packet.site_address],
              ["Contact", packet.contact_name],
              ["Phone", packet.contact_phone],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-gray-500 text-xs">{k}</span>
                <span className="text-gray-300">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Access Notes */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <h4 className="text-gray-400 text-xs font-medium uppercase mb-2">Access Notes</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{packet.access_notes}</p>
        </div>

        {/* System Info */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <h4 className="text-gray-400 text-xs font-medium uppercase mb-2">System Info</h4>
          <p className="text-gray-300 text-sm font-mono leading-relaxed text-xs">{packet.system_info}</p>
        </div>

        {/* Troubleshooting Done */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <h4 className="text-gray-400 text-xs font-medium uppercase mb-3">Already Tried</h4>
          <ul className="space-y-1.5">
            {packet.troubleshooting_done.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                <span className="text-gray-400 text-xs">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tools Needed */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <h4 className="text-gray-400 text-xs font-medium uppercase mb-3">Tools Needed</h4>
          <ul className="space-y-1.5">
            {packet.tools_needed.map((tool) => (
              <li key={tool} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="text-blue-400">🔧</span> {tool}
              </li>
            ))}
          </ul>
        </div>

        {/* Checklist */}
        <div className="md:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-gray-400 text-xs font-medium uppercase">Field Checklist</h4>
            <span className="text-gray-500 text-xs">{done}/{checklist.length} complete</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full mb-4">
            <div
              className="h-1.5 bg-green-500 rounded-full transition-all"
              style={{ width: checklist.length ? `${(done / checklist.length) * 100}%` : "0%" }}
            />
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" checked={item.done} onChange={() => toggle(i)} className="sr-only" />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.done ? "bg-green-600 border-green-600" : "border-gray-600 group-hover:border-gray-400"
                    }`}
                  >
                    {item.done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`text-sm transition-colors ${item.done ? "text-gray-500 line-through" : "text-gray-300"}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
