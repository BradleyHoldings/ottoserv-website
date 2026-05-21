"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ViewDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "lead" | "task" | "project" | "call";
  data: Record<string, any>;
  onAction?: (action: string) => void;
}

const getTypeColors = (type: string) => {
  switch (type) {
    case "lead":
      return { badge: "bg-blue-900/30 text-blue-300", action: "Contact" };
    case "task":
      return { badge: "bg-purple-900/30 text-purple-300", action: "Start" };
    case "project":
      return { badge: "bg-emerald-900/30 text-emerald-300", action: "Open" };
    case "call":
      return { badge: "bg-orange-900/30 text-orange-300", action: "Call" };
    default:
      return { badge: "bg-gray-900/30 text-gray-300", action: "Open" };
  }
};

export function ViewDetailsModal({
  open,
  onOpenChange,
  title,
  type,
  data,
  onAction,
}: ViewDetailsModalProps) {
  const colors = getTypeColors(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {type.charAt(0).toUpperCase() + type.slice(1)} details
              </DialogDescription>
            </div>
            <Badge className={colors.badge}>{type}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {data.status && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Status
              </p>
              <Badge className="mt-1 capitalize" variant="outline">
                {data.status}
              </Badge>
            </div>
          )}

          {data.priority && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Priority
              </p>
              <Badge
                className="mt-1 capitalize"
                variant={
                  data.priority === "high" || data.priority === "urgent"
                    ? "destructive"
                    : "outline"
                }
              >
                {data.priority}
              </Badge>
            </div>
          )}

          {data.assigned_to && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Assigned To
              </p>
              <p className="mt-1 text-sm text-white">{data.assigned_to}</p>
            </div>
          )}

          {data.due_date && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Due Date
              </p>
              <p className="mt-1 text-sm text-white">
                {new Date(data.due_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {data.company_name && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Company
              </p>
              <p className="mt-1 text-sm text-white">{data.company_name}</p>
            </div>
          )}

          {data.phone && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Phone
              </p>
              <a href={`tel:${data.phone}`} className="mt-1 text-sm text-blue-400 hover:text-blue-300">
                {data.phone}
              </a>
            </div>
          )}

          {data.email && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Email
              </p>
              <a href={`mailto:${data.email}`} className="mt-1 text-sm text-blue-400 hover:text-blue-300">
                {data.email}
              </a>
            </div>
          )}

          {data.description && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Description
              </p>
              <p className="mt-1 text-sm text-gray-300">{data.description}</p>
            </div>
          )}

          {data.notes && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Notes
              </p>
              <p className="mt-1 text-sm text-gray-300">{data.notes}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onAction?.(type);
              onOpenChange(false);
            }}
            className="flex-1"
          >
            {colors.action}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
