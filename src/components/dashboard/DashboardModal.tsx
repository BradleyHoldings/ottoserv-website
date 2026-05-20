"use client";

import { type ReactNode, useEffect } from "react";

interface DashboardModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  onClose: () => void;
}

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export default function DashboardModal({
  open,
  title,
  description,
  children,
  footer,
  size = "md",
  onClose,
}: DashboardModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-modal-title"
    >
      <button className="absolute inset-0 bg-black/70" aria-label="Close dialog" onClick={onClose} />
      <div className={`relative w-full ${SIZE_CLASS[size]} rounded-2xl border border-gray-800 bg-[#111827] shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-6 py-5">
          <div>
            <h2 id="dashboard-modal-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close dialog"
          >
            X
          </button>
        </div>
        {children && <div className="px-6 py-5">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-800 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
