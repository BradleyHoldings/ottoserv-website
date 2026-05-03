"use client";

/**
 * BusinessBrief Component - AI-generated executive summary
 * 
 * PRIORITY 3 IMPLEMENTATION:
 * - Systematic spacing using design system classes
 * - Brand color application throughout UI elements
 * - Progressive disclosure with priority-based visibility
 * - Consistent component spacing relationships
 * - Enhanced information density controls
 */

interface BusinessBriefProps {
  brief: string;
  loading?: boolean;
  priority?: "critical" | "high" | "medium" | "low";
  expandable?: boolean;
}

export default function BusinessBrief({ 
  brief, 
  loading, 
  priority = "high",
  expandable = false 
}: BusinessBriefProps) {
  return (
    <div className={`card density-comfortable status-info priority-${priority}`}>
      <div className="flex items-center gap-3 subsection-spacing">
        <div className="w-8 h-8 bg-hierarchy-2 rounded-lg flex items-center justify-center text-lg flex-shrink-0 status-info">
          <span aria-hidden="true">🤖</span>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">Jarvis Business Brief</h3>
          <p className="text-gray-500 text-xs secondary-info">AI-generated daily summary</p>
        </div>
        <span className="badge badge-primary badge-sm"
              aria-label="Live data indicator">
          Live
        </span>
      </div>
      
      <div className={`${expandable ? 'disclosure-content' : ''}`}>
        {loading ? (
          <div className="space-y-2 animate-pulse density-compact">
            <div className="h-4 bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-700 rounded w-4/6" />
          </div>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed density-normal">{brief}</p>
        )}
      </div>
    </div>
  );
}
