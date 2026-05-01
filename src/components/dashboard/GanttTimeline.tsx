"use client";

export interface TimelineItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
}

interface GanttTimelineProps {
  items: TimelineItem[];
  rangeStart?: string;
  rangeEnd?: string;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  complete: "bg-green-500",
  in_progress: "bg-blue-500",
  planning: "bg-purple-500",
  on_hold: "bg-yellow-500",
};

export default function GanttTimeline({
  items,
  rangeStart = "2026-04-01",
  rangeEnd = "2026-08-01",
}: GanttTimelineProps) {
  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const totalMs = endMs - startMs;

  const getLeft = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((t - startMs) / totalMs) * 100));
  };

  const getWidth = (start: string, end: string) => {
    const s = Math.max(startMs, new Date(start).getTime());
    const e = Math.min(endMs, new Date(end).getTime());
    return Math.max(2, ((e - s) / totalMs) * 100);
  };

  // Generate month markers
  const months: { label: string; left: number }[] = [];
  const cursor = new Date(startMs);
  cursor.setDate(1);
  while (cursor.getTime() < endMs) {
    months.push({
      label: cursor.toLocaleDateString("en-US", { month: "short" }),
      left: ((cursor.getTime() - startMs) / totalMs) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div>
      {/* Month labels */}
      <div className="relative h-6 mb-1 ml-44">
        {months.map((m) => (
          <span
            key={m.label + m.left}
            className="absolute text-xs text-gray-500 -translate-x-1/2"
            style={{ left: `${m.left}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {items.map((item) => {
          const barColor = STATUS_BAR_COLORS[item.status] || "bg-blue-500";
          const left = getLeft(item.startDate);
          const width = getWidth(item.startDate, item.endDate);
          const progressWidth = width * (item.progress / 100);

          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-44 flex-shrink-0">
                <p className="text-gray-300 text-sm truncate leading-tight">{item.name}</p>
                <p className="text-gray-600 text-xs">{item.progress}% complete</p>
              </div>
              <div className="flex-1 relative h-7 bg-gray-800/60 rounded overflow-hidden">
                {/* Background bar (full duration) */}
                <div
                  className={`absolute top-1 bottom-1 rounded ${barColor} opacity-30`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                {/* Progress bar */}
                <div
                  className={`absolute top-1 bottom-1 rounded ${barColor}`}
                  style={{ left: `${left}%`, width: `${progressWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
