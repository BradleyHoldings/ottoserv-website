"use client";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-900/40 text-red-400 border-red-800",
  high: "bg-orange-900/40 text-orange-400 border-orange-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  low: "bg-gray-800 text-gray-400 border-gray-700",
};

interface PriorityBadgeProps {
  priority: string;
  size?: "sm" | "md";
}

export default function PriorityBadge({ priority, size = "sm" }: PriorityBadgeProps) {
  const colors = PRIORITY_COLORS[priority] || "bg-gray-800 text-gray-400 border-gray-700";
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span className={`inline-flex items-center rounded border font-medium capitalize ${colors} ${sizeClass}`}>
      {priority}
    </span>
  );
}
