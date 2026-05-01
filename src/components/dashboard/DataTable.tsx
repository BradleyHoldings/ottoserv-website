"use client";

import { useState } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  searchable = false,
  searchPlaceholder = "Search...",
  searchFields = [],
  emptyMessage = "No records found",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = data.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return searchFields.some((f) =>
      String(row[f] ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filtered;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div>
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2 w-full max-w-xs outline-none focus:border-blue-500 placeholder:text-gray-500"
          />
        </div>
      )}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={`px-4 py-3 text-left text-gray-400 font-medium whitespace-nowrap ${
                      col.sortable ? "cursor-pointer hover:text-white select-none" : ""
                    }`}
                  >
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="ml-1 text-blue-400">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <tr
                    key={i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-gray-800 last:border-0 ${
                      onRowClick ? "cursor-pointer hover:bg-[#1a2230]" : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-gray-300">
                        {col.render ? col.render(row) : String(row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {sorted.length > 0 && (
        <p className="text-gray-600 text-xs mt-2 px-1">
          {sorted.length} {sorted.length === 1 ? "record" : "records"}
        </p>
      )}
    </div>
  );
}
