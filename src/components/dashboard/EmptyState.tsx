"use client";

import Link from "next/link";

type EmptyStateVariant = "empty" | "coming_soon" | "integration_required" | "not_configured";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  variant?: EmptyStateVariant;
  action?: { label: string; onClick: () => void };
  actions?: EmptyStateAction[];
  className?: string;
}

const VARIANT_STYLES: Record<EmptyStateVariant, { icon: string; border: string; iconBg: string }> = {
  empty: {
    icon: "Empty",
    border: "border-gray-800",
    iconBg: "bg-gray-800 text-gray-300",
  },
  coming_soon: {
    icon: "Soon",
    border: "border-blue-900/60",
    iconBg: "bg-blue-950/70 text-blue-200",
  },
  integration_required: {
    icon: "Connect",
    border: "border-yellow-900/60",
    iconBg: "bg-yellow-950/60 text-yellow-200",
  },
  not_configured: {
    icon: "Setup",
    border: "border-purple-900/60",
    iconBg: "bg-purple-950/60 text-purple-200",
  },
};

export default function EmptyState({
  icon,
  title,
  description,
  variant = "empty",
  action,
  actions,
  className = "",
}: EmptyStateProps) {
  const normalizedActions = actions ?? (action ? [{ ...action, variant: "primary" as const }] : []);
  const style = VARIANT_STYLES[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border ${style.border} bg-[#0f1623]/70 px-6 py-12 text-center ${className}`}
    >
      <span className={`mb-4 rounded-full px-3 py-2 text-xs font-semibold ${style.iconBg}`}>
        {icon ?? style.icon}
      </span>
      <h3 className="text-white font-semibold text-lg">{title}</h3>
      {description && <p className="text-gray-400 text-sm mt-2 max-w-sm">{description}</p>}
      {normalizedActions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {normalizedActions.map((stateAction) => {
            const buttonClass =
              stateAction.variant === "secondary"
                ? "px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors"
                : "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors";

            if (stateAction.href) {
              return (
                <Link key={stateAction.label} href={stateAction.href} className={buttonClass}>
                  {stateAction.label}
                </Link>
              );
            }

            return (
              <button key={stateAction.label} onClick={stateAction.onClick} className={buttonClass}>
                {stateAction.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
