"use client";

const STATUS_COLORS: Record<string, string> = {
  // Green
  active: "bg-green-900/40 text-green-400 border-green-800",
  connected: "bg-green-900/40 text-green-400 border-green-800",
  complete: "bg-green-900/40 text-green-400 border-green-800",
  won: "bg-green-900/40 text-green-400 border-green-800",
  paid: "bg-green-900/40 text-green-400 border-green-800",
  on_site: "bg-green-900/40 text-green-400 border-green-800",
  ready: "bg-green-900/40 text-green-400 border-green-800",
  confirmed: "bg-green-900/40 text-green-400 border-green-800",
  approved: "bg-green-900/40 text-green-400 border-green-800",
  done: "bg-green-900/40 text-green-400 border-green-800",
  matched: "bg-green-900/40 text-green-400 border-green-800",
  // Blue
  new: "bg-blue-900/40 text-blue-400 border-blue-800",
  in_progress: "bg-blue-900/40 text-blue-400 border-blue-800",
  open: "bg-blue-900/40 text-blue-400 border-blue-800",
  sent: "bg-blue-900/40 text-blue-400 border-blue-800",
  scheduled: "bg-blue-900/40 text-blue-400 border-blue-800",
  ordered: "bg-blue-900/40 text-blue-400 border-blue-800",
  contacted: "bg-blue-900/40 text-blue-400 border-blue-800",
  // Yellow / Amber
  pending: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  paused: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  waiting: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  estimate_scheduled: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  generating: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  // Orange
  needs_attention: "bg-orange-900/40 text-orange-400 border-orange-800",
  needs_approval: "bg-orange-900/40 text-orange-400 border-orange-800",
  estimate_sent: "bg-orange-900/40 text-orange-400 border-orange-800",
  follow_up: "bg-orange-900/40 text-orange-400 border-orange-800",
  unmatched: "bg-orange-900/40 text-orange-400 border-orange-800",
  // Red
  overdue: "bg-red-900/40 text-red-400 border-red-800",
  lost: "bg-red-900/40 text-red-400 border-red-800",
  error: "bg-red-900/40 text-red-400 border-red-800",
  high: "bg-red-900/40 text-red-400 border-red-800",
  // Purple
  planning: "bg-purple-900/40 text-purple-400 border-purple-800",
  qualified: "bg-purple-900/40 text-purple-400 border-purple-800",
  // Gray
  draft: "bg-gray-800 text-gray-400 border-gray-700",
  not_connected: "bg-gray-800 text-gray-400 border-gray-700",
  closed: "bg-gray-800 text-gray-400 border-gray-700",
  low: "bg-gray-800 text-gray-400 border-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  estimate_scheduled: "Est. Scheduled",
  estimate_sent: "Est. Sent",
  follow_up: "Follow Up",
  not_connected: "Not Connected",
  on_site: "On Site",
  needs_attention: "Needs Attention",
  needs_approval: "Needs Approval",
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || "bg-gray-800 text-gray-400 border-gray-700";
  const label = STATUS_LABELS[status] || status.replace(/_/g, " ");
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span className={`inline-flex items-center rounded border font-medium capitalize ${colors} ${sizeClass}`}>
      {label}
    </span>
  );
}
