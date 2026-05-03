"use client";

import { useState } from "react";
import { mockCalendarEvents, CalendarEvent } from "@/lib/mockData";

const TYPE_COLORS: Record<string, string> = {
  site_visit: "bg-blue-600",
  client_meeting: "bg-purple-600",
  estimate: "bg-orange-600",
  consultation: "bg-teal-600",
  inspection: "bg-yellow-600",
  internal: "bg-gray-600",
  delivery: "bg-green-600",
  discovery_call: "bg-indigo-600",
};

const TYPE_LABELS: Record<string, string> = {
  site_visit: "Site Visit",
  client_meeting: "Client Meeting",
  estimate: "Estimate",
  consultation: "Consultation",
  inspection: "Inspection",
  internal: "Internal",
  delivery: "Delivery",
  discovery_call: "Discovery Call",
};

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-green-400",
  scheduled: "bg-blue-400",
  pending: "bg-yellow-400",
  cancelled: "bg-red-400",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDayKey(iso: string) {
  return iso.slice(0, 10);
}

// Build calendar for April-May 2026 (show current month May 2026)
const MONTHS = [
  { label: "April 2026", year: 2026, month: 3 },
  { label: "May 2026", year: 2026, month: 4 },
];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function padDate(n: number) {
  return String(n).padStart(2, "0");
}

const EMPTY_EVENT_FORM = {
  title: "", type: "site_visit", start: "", end: "", location: "", client_name: "", notes: "",
};

export default function CalendarPage() {
  const [monthIdx, setMonthIdx] = useState(1); // Start on May
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: form.title,
      type: form.type,
      start: form.start,
      end: form.end || form.start,
      location: form.location || undefined,
      client_name: form.client_name || undefined,
      notes: form.notes || undefined,
      status: "scheduled",
    };
    setEvents((prev) => [newEvent, ...prev]);
    setForm(EMPTY_EVENT_FORM);
    setShowModal(false);
  }

  const { label, year, month } = MONTHS[monthIdx];
  const days = buildCalendarDays(year, month);

  const eventsByDay: Record<string, CalendarEvent[]> = {};
  for (const evt of events) {
    const key = getDayKey(evt.start);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(evt);
  }

  const upcomingEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">{events.length} upcoming events</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New Event
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="xl:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))}
              disabled={monthIdx === 0}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              ‹
            </button>
            <h2 className="text-white font-semibold">{label}</h2>
            <button
              onClick={() => setMonthIdx(Math.min(MONTHS.length - 1, monthIdx + 1))}
              disabled={monthIdx === MONTHS.length - 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-gray-500 text-xs py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const dateKey =
                day !== null
                  ? `${year}-${padDate(month + 1)}-${padDate(day)}`
                  : null;
              const evts = dateKey ? (eventsByDay[dateKey] ?? []) : [];
              const isToday = dateKey === "2026-04-30";

              return (
                <div
                  key={i}
                  className={`min-h-[72px] rounded-lg p-1.5 ${
                    day === null
                      ? "opacity-0 pointer-events-none"
                      : isToday
                      ? "bg-blue-900/30 border border-blue-700"
                      : "bg-[#0f1117] border border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {day !== null && (
                    <>
                      <p
                        className={`text-xs font-medium mb-1 ${
                          isToday ? "text-blue-400" : "text-gray-400"
                        }`}
                      >
                        {day}
                      </p>
                      <div className="space-y-0.5">
                        {evts.slice(0, 2).map((evt) => (
                          <button
                            key={evt.id}
                            onClick={() => setSelected(evt)}
                            className={`w-full text-left text-white text-[10px] px-1.5 py-0.5 rounded truncate ${
                              TYPE_COLORS[evt.type] ?? "bg-gray-600"
                            }`}
                          >
                            {evt.title}
                          </button>
                        ))}
                        {evts.length > 2 && (
                          <p className="text-gray-500 text-[10px] px-1">+{evts.length - 2} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">All Events</h3>
          <div className="space-y-3">
            {upcomingEvents.map((evt) => (
              <button
                key={evt.id}
                onClick={() => setSelected(evt)}
                className="w-full text-left bg-[#0f1117] border border-gray-800 hover:border-gray-700 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[evt.status] ?? "bg-gray-400"}`} />
                  <p className="text-white text-sm font-medium leading-snug truncate">{evt.title}</p>
                </div>
                <p className="text-gray-400 text-xs">
                  {new Date(evt.start).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {formatTime(evt.start)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded text-white ${
                      TYPE_COLORS[evt.type] ?? "bg-gray-600"
                    }`}
                  >
                    {TYPE_LABELS[evt.type] ?? evt.type}
                  </span>
                  {evt.location && (
                    <span className="text-gray-500 text-xs truncate ml-2">{evt.location}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-semibold text-lg">New Event</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Title *</label>
                <input required type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="site_visit">Site Visit</option>
                    <option value="client_meeting">Client Meeting</option>
                    <option value="estimate">Estimate</option>
                    <option value="consultation">Consultation</option>
                    <option value="inspection">Inspection</option>
                    <option value="delivery">Delivery</option>
                    <option value="discovery_call">Discovery Call</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Client Name</label>
                  <input type="text" value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">Start *</label>
                  <input required type="datetime-local" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-1">End</label>
                  <input type="datetime-local" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Location</label>
                <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative bg-[#111827] border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-start justify-between mb-4">
              <span
                className={`text-xs px-2 py-1 rounded text-white ${
                  TYPE_COLORS[selected.type] ?? "bg-gray-600"
                }`}
              >
                {TYPE_LABELS[selected.type] ?? selected.type}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <h2 className="text-white font-bold text-lg mb-4 leading-snug">{selected.title}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Start</span>
                <span className="text-white">
                  {new Date(selected.start).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {formatTime(selected.start)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">End</span>
                <span className="text-white">{formatTime(selected.end)}</span>
              </div>
              {selected.location && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="text-white">{selected.location}</span>
                </div>
              )}
              {selected.client_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Client</span>
                  <span className="text-white">{selected.client_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[selected.status] ?? "bg-gray-400"}`} />
                  <span className="text-white capitalize">{selected.status}</span>
                </div>
              </div>
              {selected.notes && (
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-300">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
