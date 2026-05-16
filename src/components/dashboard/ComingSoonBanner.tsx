// Shared informational banner used on dashboard pages.
//
// Three variants:
//   tone="coming_soon"  → module has no backend endpoint yet
//   tone="empty"        → backend is connected, your company just has no rows yet
//   tone="auth"         → user has no platform JWT (can't reach the backend)
//
// We never render fake mock data — empty state is honest. The variant just
// changes the copy so the user can tell "no data" from "broken".

type Tone = "coming_soon" | "empty" | "auth";

const TONE_STYLES: Record<Tone, { bar: string; titleColor: string }> = {
  coming_soon: { bar: "border-l-4 border-blue-600", titleColor: "text-white" },
  empty: { bar: "border-l-4 border-gray-700", titleColor: "text-white" },
  auth: { bar: "border-l-4 border-yellow-600", titleColor: "text-yellow-200" },
};

export default function ComingSoonBanner({
  tone = "coming_soon",
  title,
  description,
}: {
  tone?: Tone;
  title?: string;
  description?: string;
}) {
  const defaults: Record<Tone, { title: string; description: string }> = {
    coming_soon: {
      title: "Module coming soon",
      description:
        "This module isn't wired to your live company data yet. We'll connect it as the backend API lands.",
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
  };

  const { bar, titleColor } = TONE_STYLES[tone];
  const finalTitle = title ?? defaults[tone].title;
  const finalDescription = description ?? defaults[tone].description;

  return (
    <div
      className={`bg-[#111827] border border-gray-800 ${bar} rounded-xl p-6 mb-6`}
    >
      <p className={`${titleColor} font-medium mb-1`}>{finalTitle}</p>
      <p className="text-gray-400 text-sm">{finalDescription}</p>
    </div>
  );
}
