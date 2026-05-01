"use client";

interface KpiCardProps {
  value: string | number;
  label: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  onClick?: () => void;
}

const COLOR_MAP: Record<string, { value: string; border: string }> = {
  blue: { value: "text-blue-400", border: "border-blue-900/40" },
  green: { value: "text-green-400", border: "border-green-900/40" },
  red: { value: "text-red-400", border: "border-red-900/40" },
  yellow: { value: "text-yellow-400", border: "border-yellow-900/40" },
  purple: { value: "text-purple-400", border: "border-purple-900/40" },
};

export default function KpiCard({
  value,
  label,
  trend,
  trendDirection = "neutral",
  color = "blue",
  onClick,
}: KpiCardProps) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue;
  const trendIcon = trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "—";
  const trendColor =
    trendDirection === "up" ? "text-green-400" : trendDirection === "down" ? "text-red-400" : "text-gray-500";

  return (
    <div
      onClick={onClick}
      className={`bg-[#111827] border ${colors.border} rounded-xl p-5 ${
        onClick ? "cursor-pointer hover:bg-[#1a2332] transition-colors" : ""
      }`}
    >
      <p className={`text-3xl font-bold tabular-nums ${colors.value}`}>{value}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
      {trend && (
        <p className={`text-xs mt-2 ${trendColor}`}>
          {trendIcon} {trend}
        </p>
      )}
    </div>
  );
}
