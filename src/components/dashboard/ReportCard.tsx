"use client";

import { Report } from "@/lib/mockData";

interface ReportCardProps {
  report: Report;
  onGenerate: (id: string) => void;
  onExport: (id: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  summary: "📊",
  financial: "💰",
  sales: "👥",
  operations: "🏗️",
  hr: "👤",
  quality: "⭐",
};

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export default function ReportCard({ report, onGenerate, onExport }: ReportCardProps) {
  const isGenerating = report.status === "generating";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-3 flex-1">
        <span className="text-2xl flex-shrink-0">{TYPE_ICONS[report.type] || "📄"}</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-white font-medium leading-snug">{report.title}</h4>
          <p className="text-gray-400 text-sm mt-0.5 leading-snug">{report.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span className="bg-gray-800 px-2 py-0.5 rounded">
          {PERIOD_LABELS[report.period] || report.period}
        </span>
        <span>
          {isGenerating
            ? "Generating..."
            : report.last_generated
            ? `Generated ${report.last_generated}`
            : "Not yet generated"}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onGenerate(report.id)}
          disabled={isGenerating}
          className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating…" : "Generate"}
        </button>
        <button
          onClick={() => onExport(report.id)}
          disabled={!report.last_generated}
          className="flex-1 py-2 bg-[#1f2937] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
