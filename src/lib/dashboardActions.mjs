const DEFAULT_FEATURE = "This feature";

export const DASHBOARD_ACTION_TONES = [
  "coming_soon",
  "integration_required",
  "not_configured",
  "confirm",
  "info",
];

export function getComingSoonState(featureName = DEFAULT_FEATURE, nextStep) {
  return {
    tone: "coming_soon",
    title: `${featureName} coming soon`,
    description:
      nextStep ??
      `${featureName} is not wired yet. This action is visible so the workflow is clear, and it will connect to live data when the backend is ready.`,
    primaryLabel: "Got it",
  };
}

export function getIntegrationRequiredState(integrationName = "Integration", nextStep) {
  return {
    tone: "integration_required",
    title: `${integrationName} required`,
    description:
      `Connect ${integrationName} before using this action.${
        nextStep ? ` ${nextStep}` : " OttoServ will keep the page safe until that integration is available."
      }`,
    primaryLabel: "Open integrations",
    secondaryLabel: "Maybe later",
  };
}

export function getNotConfiguredState(featureName = DEFAULT_FEATURE, nextStep) {
  return {
    tone: "not_configured",
    title: `${featureName} is not configured yet`,
    description:
      nextStep ??
      `Finish setup in settings or connect an integration before using ${featureName}. Nothing has been changed.`,
    primaryLabel: "Open settings",
    secondaryLabel: "Maybe later",
  };
}

export function getActionState(kind = "info", options = {}) {
  const featureName = options.featureName ?? DEFAULT_FEATURE;

  if (kind === "coming_soon") {
    return getComingSoonState(featureName, options.description);
  }

  if (kind === "integration_required") {
    return getIntegrationRequiredState(options.integrationName ?? featureName, options.description);
  }

  if (kind === "not_configured") {
    return getNotConfiguredState(featureName, options.description);
  }

  if (kind === "confirm") {
    return {
      tone: "confirm",
      title: options.title ?? `Confirm ${featureName}`,
      description: options.description ?? "Please confirm before continuing.",
      primaryLabel: options.primaryLabel ?? "Confirm",
      secondaryLabel: options.secondaryLabel ?? "Cancel",
    };
  }

  return {
    tone: "info",
    title: options.title ?? featureName,
    description: options.description ?? "No action was taken. This workflow needs a backend or integration before it can run.",
    primaryLabel: options.primaryLabel ?? "Got it",
  };
}
