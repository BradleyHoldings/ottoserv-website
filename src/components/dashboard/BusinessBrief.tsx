"use client";

interface BusinessBriefProps {
  brief: string;
  loading?: boolean;
}

export default function BusinessBrief({ brief, loading }: BusinessBriefProps) {
  return (
    <div className="bg-[#111827] border border-blue-900/40 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
          🤖
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Jarvis Business Brief</h3>
          <p className="text-gray-500 text-xs">AI-generated daily summary</p>
        </div>
        <span className="ml-auto text-xs text-blue-400 bg-blue-900/20 border border-blue-900/40 px-2 py-0.5 rounded">
          Live
        </span>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-700 rounded w-4/6" />
        </div>
      ) : (
        <p className="text-gray-300 text-sm leading-relaxed">{brief}</p>
      )}
    </div>
  );
}
