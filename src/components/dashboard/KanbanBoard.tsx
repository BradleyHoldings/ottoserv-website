"use client";

export interface KanbanColumn {
  id: string;
  title: string;
  dotColor: string;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  getItemColumn: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string;
}

export default function KanbanBoard<T>({
  columns,
  items,
  getItemColumn,
  renderCard,
  getItemKey,
}: KanbanBoardProps<T>) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colItems = items.filter((item) => getItemColumn(item) === col.id);
        return (
          <div key={col.id} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
              <h3 className="text-white font-medium text-sm">{col.title}</h3>
              <span className="ml-auto text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {colItems.map((item) => (
                <div key={getItemKey(item)}>{renderCard(item)}</div>
              ))}
              {colItems.length === 0 && (
                <div className="h-16 border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center">
                  <p className="text-gray-600 text-xs">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
