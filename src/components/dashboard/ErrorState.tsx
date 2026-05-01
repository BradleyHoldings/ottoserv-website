"use client";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Something went wrong.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <h3 className="text-white font-semibold text-lg">Unable to load data</h3>
      <p className="text-gray-400 text-sm mt-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-4 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors border border-gray-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
