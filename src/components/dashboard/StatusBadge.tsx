"use client";

/**
 * StatusBadge Component - Standardized status indicator
 * 
 * PRIORITY 3 IMPLEMENTATION:
 * - Uses design system badge classes for consistent styling
 * - Brand color application throughout status indicators
 * - Consistent interactive behavior when clickable
 * - Supports all badge sizes from design system
 * - Semantic color mapping (success = green, warning = amber, etc.)
 */

// Standardized status mapping to design system classes
const STATUS_COLORS: Record<string, string> = {
  // Success states - using brand green
  active: "badge-success",
  connected: "badge-success",
  complete: "badge-success",
  won: "badge-success",
  paid: "badge-success",
  on_site: "badge-success",
  ready: "badge-success",
  confirmed: "badge-success",
  approved: "badge-success",
  done: "badge-success",
  matched: "badge-success",
  
  // Info states - using brand blue
  new: "badge-primary",
  in_progress: "badge-primary",
  open: "badge-primary",
  sent: "badge-primary",
  scheduled: "badge-primary",
  ordered: "badge-primary",
  contacted: "badge-primary",
  
  // Warning states - using brand amber
  pending: "badge-warning",
  paused: "badge-warning",
  waiting: "badge-warning",
  estimate_scheduled: "badge-warning",
  generating: "badge-warning",
  medium: "badge-warning",
  needs_attention: "badge-warning",
  needs_approval: "badge-warning",
  estimate_sent: "badge-warning",
  follow_up: "badge-warning",
  unmatched: "badge-warning",
  
  // Error states - using brand red
  overdue: "badge-error",
  lost: "badge-error",
  error: "badge-error",
  high: "badge-error",
  
  // Neutral states - using brand grays
  draft: "badge-neutral",
  not_connected: "badge-neutral",
  closed: "badge-neutral",
  low: "badge-neutral",
  planning: "badge-neutral",
  qualified: "badge-neutral",
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
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onClick?: () => void;
}

export default function StatusBadge({ 
  status, 
  size = "sm", 
  interactive = false, 
  onClick 
}: StatusBadgeProps) {
  const badgeClass = STATUS_COLORS[status] || "badge-neutral";
  const label = STATUS_LABELS[status] || status.replace(/_/g, " ");
  
  const sizeClass = size === "lg" ? "badge-lg" : size === "md" ? "badge" : "badge-sm";
  const interactiveClass = interactive || onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : "";
  
  const Component = onClick ? "button" : "span";
  
  return (
    <Component 
      className={`badge ${badgeClass} ${sizeClass} ${interactiveClass} capitalize`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={onClick ? `${label} - click for details` : undefined}
    >
      {label}
    </Component>
  );
}
