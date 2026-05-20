"use client";

import { getActionState } from "@/lib/dashboardActions.mjs";
import DashboardModal from "./DashboardModal";

type ActionKind = "coming_soon" | "integration_required" | "not_configured" | "confirm" | "info";

interface ActionStateModalProps {
  open: boolean;
  kind: ActionKind;
  featureName?: string;
  integrationName?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  onClose: () => void;
}

export default function ActionStateModal({
  open,
  kind,
  featureName,
  integrationName,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  onClose,
}: ActionStateModalProps) {
  const state = getActionState(kind, {
    featureName,
    integrationName,
    title,
    description,
    primaryLabel,
    secondaryLabel,
  });

  const handlePrimary = () => {
    if (primaryHref) {
      window.location.href = primaryHref;
      return;
    }

    onClose();
  };

  return (
    <DashboardModal
      open={open}
      title={state.title}
      description={state.description}
      onClose={onClose}
      footer={
        <>
          {state.secondaryLabel && (
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            >
              {state.secondaryLabel}
            </button>
          )}
          <button
            onClick={handlePrimary}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {state.primaryLabel}
          </button>
        </>
      }
    />
  );
}
