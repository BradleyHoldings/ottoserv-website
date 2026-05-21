"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { ChevronRight, MoreVertical } from "lucide-react";

interface DashboardSection {
  title: string;
  description?: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    status?: string;
    priority?: string;
    timestamp?: string;
    badge?: string;
  }>;
  emptyState?: string;
  onViewAll?: () => void;
  onItemClick?: (item: any) => void;
  onActionClick?: (item: any) => void;
  actionLabel?: string;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case "active":
    case "open":
      return "bg-emerald-900/30 text-emerald-300";
    case "pending":
      return "bg-yellow-900/30 text-yellow-300";
    case "completed":
    case "closed":
      return "bg-gray-900/30 text-gray-300";
    case "urgent":
      return "bg-red-900/30 text-red-300";
    default:
      return "bg-blue-900/30 text-blue-300";
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "high":
    case "urgent":
      return "bg-red-900/30 text-red-300";
    case "medium":
      return "bg-yellow-900/30 text-yellow-300";
    case "low":
      return "bg-gray-900/30 text-gray-300";
    default:
      return "bg-blue-900/30 text-blue-300";
  }
};

export function CompactDashboardSection({
  title,
  description,
  items,
  emptyState = "No items to display",
  onViewAll,
  onItemClick,
  onActionClick,
  actionLabel = "View",
}: DashboardSection) {
  return (
    <Card className="border-gray-800 bg-gray-900/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-white">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-0.5">
                {description}
              </CardDescription>
            )}
          </div>
          {onViewAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500">{emptyState}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <Separator className="bg-gray-800" />}
                <button
                  onClick={() => onItemClick?.(item)}
                  className="w-full text-left py-3 px-2 rounded-lg hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate group-hover:text-blue-300">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.status && (
                        <Badge
                          className={`text-xs ${getStatusColor(item.status)}`}
                          variant="outline"
                        >
                          {item.status}
                        </Badge>
                      )}
                      {item.priority && !item.status && (
                        <Badge
                          className={`text-xs ${getPriorityColor(item.priority)}`}
                          variant="outline"
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.timestamp}
                    </p>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
