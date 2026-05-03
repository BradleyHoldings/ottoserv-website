"use client";

import { useState } from "react";
import { mockMessages, Message } from "@/lib/mockData";

const CATEGORY_COLORS: Record<string, string> = {
  client: "bg-blue-600",
  lead: "bg-purple-600",
  system: "bg-gray-600",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "< 1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function InboxPage() {
  const [selected, setSelected] = useState<Message>(mockMessages[0]);
  const [filter, setFilter] = useState<"all" | "unread" | "client" | "lead">("all");

  const filtered = mockMessages.filter((m) => {
    if (filter === "unread") return m.status === "unread";
    if (filter === "client") return m.category === "client";
    if (filter === "lead") return m.category === "lead";
    return true;
  });

  const unreadCount = mockMessages.filter((m) => m.status === "unread").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount} unread · {mockMessages.length} total
          </p>
        </div>
        <button className="touch-target mobile-touch-target keyboard-navigable px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none">
          + Compose
        </button>
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] gap-0 container-primary overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">
          {/* Filter tabs */}
          <div className="flex gap-1 p-3 border-b border-gray-800">
            {(["all", "unread", "client", "lead"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 touch-target keyboard-navigable py-2 rounded text-xs font-medium transition-colors focus:outline-none ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                aria-pressed={filter === f}
                role="tab"
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No messages</div>
            ) : (
              filtered.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full text-left touch-target mobile-touch-target keyboard-navigable
                    px-4 py-4 border-b border-gray-800 transition-colors focus:outline-none ${
                    selected?.id === msg.id
                      ? "bg-blue-900/20"
                      : "hover:bg-[#1a2230]"
                  }`}
                  role="option"
                  aria-selected={selected?.id === msg.id}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {msg.status === "unread" && (
                        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      )}
                      <p
                        className={`text-sm truncate ${
                          msg.status === "unread" ? "text-white font-semibold" : "text-gray-300"
                        }`}
                      >
                        {msg.from}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs flex-shrink-0">{timeAgo(msg.received_at)}</span>
                  </div>
                  <p className="text-gray-300 text-xs font-medium truncate mb-0.5">{msg.subject}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-500 text-xs truncate flex-1">{msg.preview}</p>
                    <span
                      className={`text-white text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                        CATEGORY_COLORS[msg.category] ?? "bg-gray-600"
                      }`}
                    >
                      {msg.category}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Panel */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold text-lg leading-snug">{selected.subject}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {selected.from.charAt(0)}
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm">{selected.from}</p>
                      <p className="text-gray-500 text-xs">{selected.from_email}</p>
                    </div>
                    <span className="text-gray-600 text-xs ml-2">{timeAgo(selected.received_at)}</span>
                  </div>
                </div>
                <span
                  className={`text-white text-xs px-2 py-1 rounded flex-shrink-0 ${
                    CATEGORY_COLORS[selected.category] ?? "bg-gray-600"
                  }`}
                >
                  {selected.category}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-gray-300 leading-relaxed">{selected.body}</p>
            </div>

            {/* Reply Bar */}
            <div className="px-6 py-4 border-t border-gray-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type a reply…"
                  className="flex-1 bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-500"
                />
                <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Reply
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Mark as Read
                </button>
                <span className="text-gray-700">·</span>
                <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Archive
                </button>
                {selected.category === "lead" && (
                  <>
                    <span className="text-gray-700">·</span>
                    <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      View Lead
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-3">✉️</p>
              <p className="text-gray-400">Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
