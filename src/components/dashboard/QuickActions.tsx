"use client";

/**
 * QuickActions Component - Dashboard action shortcuts
 * 
 * PRIORITY 3 IMPLEMENTATION:
 * - Systematic spacing using design system classes (section-spacing, subsection-spacing)
 * - Standardized button treatments (btn-primary, btn-secondary)
 * - Consistent grid spacing (grid-spacing-normal) 
 * - Brand color application through button variants
 * - Maintains touch target compliance and accessibility
 * - Visual hierarchy through proper spacing relationships
 */

import Link from "next/link";

interface QuickAction {
  label: string;
  emoji: string;
  href: string;
  variant?: "primary" | "secondary";
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "New Lead", emoji: "👤", href: "/dashboard/leads", variant: "primary" },
  { label: "New Task", emoji: "📋", href: "/dashboard/tasks", variant: "primary" },
  { label: "Ask Jarvis", emoji: "🤖", href: "/dashboard/jarvis", variant: "primary" },
  { label: "Log Expense", emoji: "💸", href: "/dashboard/financials", variant: "secondary" },
  { label: "New Project", emoji: "🏗️", href: "/dashboard/projects", variant: "secondary" },
  { label: "View Reports", emoji: "📈", href: "/dashboard/reports", variant: "secondary" },
];

interface QuickActionsProps {
  actions?: QuickAction[];
}

export default function QuickActions({ actions = DEFAULT_ACTIONS }: QuickActionsProps) {
  return (
    <div className="container-primary section-spacing">
      <h3 className="text-white font-semibold subsection-spacing">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 grid-spacing-normal">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={`btn ${
              action.variant === "primary" ? "btn-primary" : "btn-secondary"
            } quick-action touch-target mobile-touch-target keyboard-navigable hover-lift`}
            role="button"
            tabIndex={0}
            aria-label={`Navigate to ${action.label}`}
          >
            <span className="text-base" aria-hidden="true">{action.emoji}</span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
