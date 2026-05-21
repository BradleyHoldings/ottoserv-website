"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface DashboardFiltersProps {
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: Array<{
    label: string;
    options: FilterOption[];
    onChange?: (value: string) => void;
    value?: string;
  }>;
  onClearAll?: () => void;
  activeFiltersCount?: number;
}

export function DashboardFilters({
  searchPlaceholder = "Search...",
  onSearchChange,
  filters = [],
  onClearAll,
  activeFiltersCount = 0,
}: DashboardFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white h-9"
          />
        </div>
        <Button
          variant={activeFiltersCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-9"
        >
          <Filter className="size-4 mr-1.5" />
          Filter
          {activeFiltersCount > 0 && (
            <Badge className="ml-1.5 bg-blue-600 text-white">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-9 text-gray-400 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
          {filters.map((filter) => (
            <Select
              key={filter.label}
              value={filter.value || ""}
              onValueChange={(value) => filter.onChange?.(value)}
            >
              <SelectTrigger className="h-8 bg-gray-800 border-gray-700 text-white text-xs">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="">All {filter.label}</SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}
    </div>
  );
}
