"use client";

import { useState } from "react";

const TABS = ["Company", "Users", "Notifications", "Jarvis Preferences"] as const;

const MOCK_USERS = [
  { id: "1", name: "Owner", email: "owner@ottoserv.com", role: "Admin", status: "active", last_seen: "Today" },
  { id: "2", name: "Jake Martinez", email: "jake@ottoserv.com", role: "Crew", status: "active", last_seen: "Today" },
  { id: "3", name: "Sarah (Office)", email: "sarah@ottoserv.com", role: "Manager", status: "inactive", last_seen: "Apr 28" },
];

const NOTIFICATION_SETTINGS = [
  { id: "new_lead", label: "New Lead Received", description: "Alert when a new lead comes in from any source", email: true, sms: true, push: true },
  { id: "overdue_task", label: "Task Overdue", description: "Notify when a task passes its due date", email: true, sms: false, push: true },
  { id: "invoice_overdue", label: "Invoice Overdue", description: "Alert when an invoice goes past its due date", email: true, sms: true, push: false },
  { id: "project_risk", label: "Project at Risk", description: "Notify when a project exceeds budget or schedule thresholds", email: true, sms: false, push: true },
  { id: "appointment_reminder", label: "Appointment Reminders", description: "24-hour reminder before scheduled appointments", email: true, sms: true, push: true },
  { id: "weekly_report", label: "Weekly Business Summary", description: "Receive weekly performance summary on Sundays", email: true, sms: false, push: false },
];

const JARVIS_SETTINGS = [
  { id: "morning_brief", label: "Morning Brief", description: "Jarvis greets you with a business summary at startup" },
  { id: "proactive_alerts", label: "Proactive Alerts", description: "Jarvis surfaces issues without being asked" },
  { id: "tone_professional", label: "Professional Tone", description: "Formal communication style in emails drafted by Jarvis" },
  { id: "auto_followup", label: "Auto Follow-up Drafts", description: "Jarvis drafts follow-up emails for overdue leads" },
  { id: "voice_input", label: "Voice Input Mode", description: "Enable voice commands in Jarvis chat" },
];

type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Company");
  const [notifSettings, setNotifSettings] = useState(
    Object.fromEntries(NOTIFICATION_SETTINGS.flatMap((n) => [
      [`${n.id}_email`, n.email],
      [`${n.id}_sms`, n.sms],
      [`${n.id}_push`, n.push],
    ]))
  );
  const [jarvisSettings, setJarvisSettings] = useState(
    Object.fromEntries(JARVIS_SETTINGS.map((s) => [s.id, true]))
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleNotif(key: string) {
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleJarvis(key: string) {
    setJarvisSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your OttoServ account and preferences</p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-[#111827] border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Company Settings */}
      {tab === "Company" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Business Information</h3>
            <div className="space-y-4">
              {[
                { label: "Company Name", placeholder: "OttoServ LLC", defaultValue: "OttoServ LLC" },
                { label: "Owner Name", placeholder: "Your name", defaultValue: "Owner" },
                { label: "Phone", placeholder: "813-555-0100", defaultValue: "813-555-0100" },
                { label: "Email", placeholder: "owner@ottoserv.com", defaultValue: "owner@ottoserv.com" },
                { label: "Website", placeholder: "https://ottoserv.com", defaultValue: "https://ottoserv.com" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-gray-400 text-sm font-medium block mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    defaultValue={field.defaultValue}
                    placeholder={field.placeholder}
                    className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Business Address</h3>
            <div className="space-y-4">
              {[
                { label: "Street", defaultValue: "1234 Business Ave" },
                { label: "City", defaultValue: "Tampa" },
                { label: "State", defaultValue: "FL" },
                { label: "ZIP", defaultValue: "33601" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-gray-400 text-sm font-medium block mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    defaultValue={field.defaultValue}
                    className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Business Hours</h3>
            <div className="space-y-3">
              {["Monday–Friday", "Saturday", "Sunday"].map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{day}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={day === "Sunday" ? "Closed" : day === "Saturday" ? "8:00 AM – 2:00 PM" : "7:00 AM – 6:00 PM"}
                      className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 w-44 text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Users */}
      {tab === "Users" && (
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Team Members</h3>
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
              + Invite User
            </button>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/30">
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Name</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Email</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Role</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Status</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Last Seen</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_USERS.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">{user.role}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-400" : "bg-gray-600"}`} />
                        <span className={`text-xs ${user.status === "active" ? "text-green-400" : "text-gray-500"}`}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{user.last_seen}</td>
                    <td className="px-5 py-4">
                      <button className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === "Notifications" && (
        <div className="max-w-3xl">
          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-800 grid grid-cols-[1fr_60px_60px_60px] gap-4">
              <span className="text-gray-400 text-xs font-medium uppercase">Alert Type</span>
              <span className="text-gray-400 text-xs font-medium uppercase text-center">Email</span>
              <span className="text-gray-400 text-xs font-medium uppercase text-center">SMS</span>
              <span className="text-gray-400 text-xs font-medium uppercase text-center">Push</span>
            </div>
            {NOTIFICATION_SETTINGS.map((notif, i) => (
              <div
                key={notif.id}
                className={`px-6 py-4 grid grid-cols-[1fr_60px_60px_60px] gap-4 items-center ${
                  i < NOTIFICATION_SETTINGS.length - 1 ? "border-b border-gray-800" : ""
                }`}
              >
                <div>
                  <p className="text-white text-sm font-medium">{notif.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{notif.description}</p>
                </div>
                {(["email", "sms", "push"] as const).map((channel) => {
                  const key = `${notif.id}_${channel}`;
                  const on = notifSettings[key] as boolean;
                  return (
                    <div key={channel} className="flex justify-center">
                      <button
                        onClick={() => toggleNotif(key)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          on ? "bg-blue-600" : "bg-gray-700"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            on ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={handleSave}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {saved ? "✓ Saved!" : "Save Preferences"}
            </button>
          </div>
        </div>
      )}

      {/* Jarvis Preferences */}
      {tab === "Jarvis Preferences" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 flex items-center gap-3 mb-6">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-blue-400 font-medium">Jarvis AI Configuration</p>
              <p className="text-blue-400/70 text-sm">
                Customize how Jarvis assists you across the platform
              </p>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
            {JARVIS_SETTINGS.map((setting, i) => (
              <div
                key={setting.id}
                className={`px-6 py-4 flex items-center justify-between gap-4 ${
                  i < JARVIS_SETTINGS.length - 1 ? "border-b border-gray-800" : ""
                }`}
              >
                <div>
                  <p className="text-white text-sm font-medium">{setting.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{setting.description}</p>
                </div>
                <button
                  onClick={() => toggleJarvis(setting.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    jarvisSettings[setting.id] ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      jarvisSettings[setting.id] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Jarvis Personality</h3>
            <div className="space-y-3">
              {["Professional & Concise", "Friendly & Detailed", "Technical & Data-Focused"].map(
                (style) => (
                  <label key={style} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="jarvis_style"
                      defaultChecked={style === "Professional & Concise"}
                      className="accent-blue-500"
                    />
                    <span className="text-gray-300 text-sm">{style}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-2">API Key</h3>
            <p className="text-gray-500 text-sm mb-3">
              Jarvis uses your connected AI provider. Managed by OttoServ.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                defaultValue="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 font-mono"
              />
              <button className="px-4 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
                Update
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {saved ? "✓ Saved!" : "Save Preferences"}
          </button>
        </div>
      )}
    </div>
  );
}
