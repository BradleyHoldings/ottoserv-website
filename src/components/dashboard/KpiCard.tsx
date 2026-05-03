"use client";

/**
 * KpiCard Component - Key Performance Indicator display
 * 
 * PRIORITY 3 IMPLEMENTATION:
 * - Systematic spacing using design system density and spacing classes
 * - Brand color application for trend indicators (status-success, status-error, status-neutral)
 * - Standardized card treatment with consistent interaction behavior
 * - Proper tabular-nums for data visualization consistency
 * - Enhanced accessibility with keyboard navigation
 * - Visual hierarchy through structured spacing relationships
 */

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
  
  // Use brand colors for trend indicators
  const trendColor = 
    trendDirection === "up" ? "status-success" : 
    trendDirection === "down" ? "status-error" : 
    "status-neutral";

  return (
    <div
      onClick={onClick}
      className={`card density-normal ${colors.border} ${
        onClick 
          ? "card-interactive cursor-pointer keyboard-navigable focus:outline-none" 
          : ""
      }`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label}: ${value}${trend ? `, ${trend}` : ''}. Click for details.` : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <p 
        className={`text-3xl font-bold tabular-nums ${colors.value} component-spacing`} 
        aria-live="polite"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      <p className="text-gray-400 text-sm element-spacing">{label}</p>
      {trend && (
        <p className={`text-xs ${trendColor.split(' ')[2] || 'text-gray-400'}`} aria-live="polite">
          <span aria-hidden="true">{trendIcon}</span> 
          <span>{trend}</span>
        </p>
      )}
    </div>
  );
}
