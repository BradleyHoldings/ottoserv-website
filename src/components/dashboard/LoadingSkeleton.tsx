"use client";

interface LoadingSkeletonProps {
  rows?: number;
  type?: "card" | "table" | "list";
}

export default function LoadingSkeleton({ rows = 4, type = "list" }: LoadingSkeletonProps) {
  if (type === "card") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-5 animate-pulse">
            <div className="h-8 w-16 bg-gray-700 rounded mb-2" />
            <div className="h-4 w-28 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden animate-pulse">
        <div className="h-12 bg-gray-800/60 border-b border-gray-800" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 border-b border-gray-800 last:border-0 flex items-center px-6 gap-4">
            <div className="h-4 w-36 bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-800 rounded" />
            <div className="h-6 w-16 bg-gray-700 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-700 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-48 bg-gray-700 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-800 rounded" />
          </div>
          <div className="h-6 w-16 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
