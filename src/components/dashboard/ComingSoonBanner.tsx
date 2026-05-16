// Shared "module not yet wired to your live data" banner used on dashboard
// pages where the OttoServ enterprise platform doesn't expose a backend
// endpoint yet. We render this instead of fake mock data so each company
// sees only its own real activity — empty state, never someone else's data.

export default function ComingSoonBanner({
  title = "Module coming soon",
  description = "This module isn't wired to your live company data yet. We'll connect it as the backend API lands.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6 text-center">
      <p className="text-white font-medium mb-1">{title}</p>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}
