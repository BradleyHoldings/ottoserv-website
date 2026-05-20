"use client";

import Link from "next/link";

type Tone = "coming_soon" | "empty" | "auth" | "integration_required" | "not_configured";

interface BannerAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

const TONE_STYLES: Record<Tone, { bar: string; titleColor: string }> = {
  coming_soon: { bar: "border-l-4 border-blue-600", titleColor: "text-white" },
  empty: { bar: "border-l-4 border-gray-700", titleColor: "text-white" },
  auth: { bar: "border-l-4 border-yellow-600", titleColor: "text-yellow-200" },
  integration_required: { bar: "border-l-4 border-yellow-600", titleColor: "text-yellow-200" },
  not_configured: { bar: "border-l-4 border-purple-600", titleColor: "text-purple-200" },
};

export default function ComingSoonBanner({
  tone = "coming_soon",
  title,
  description,
  action,
  className = "",
}: {
  tone?: Tone;
  title?: string;
  description?: string;
  action?: BannerAction;
  className?: string;
}) {
  const defaults: Record<Tone, { title: string; description: string }> = {
    coming_soon: {
      title: "Module coming soon",
      description:
        "This module is not wired to your live company data yet. It will connect as the backend API lands.",
    },
    empty: {
      title: "Nothing here yet",
      description:
        "Your company has no data in this section yet. New activity will appear here automatically.",
    },
    auth: {
      title: "Platform access required",
      description:
        "Sign out and sign back in with a platform-enabled account to see your company's data.",
    },
    integration_required: {
      title: "Integration required",
      description:
        "Connect the required system before this action can use live company data.",
    },
    not_configured: {
      title: "Not configured yet",
      description:
        "Finish setup in settings before this workflow can run.",
    },
  };

  const { bar, titleColor } = TONE_STYLES[tone];
  const finalTitle = title ?? defaults[tone].title;
  const finalDescription = description ?? defaults[tone].description;

  return (
    <div
      className={`bg-[#111827] border border-gray-800 ${bar} rounded-xl p-6 mb-6 ${className}`}
    >
      <p className={`${titleColor} font-medium mb-1`}>{finalTitle}</p>
      <p className="text-gray-400 text-sm">{finalDescription}</p>
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
