"use client";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-white font-semibold text-lg">{title}</h3>
      {description && <p className="text-gray-400 text-sm mt-2 max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
