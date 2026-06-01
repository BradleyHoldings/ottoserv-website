import { readFile, stat } from "fs/promises";
import path from "path";
import {
  HermesAgent,
  HermesMission,
  formatHermesLabel,
  getHermesCommandSummary,
  hermesAgents,
  hermesMissions,
} from "@/lib/hermesCommandCenter";

export const HERMES_DAILY_LOOP_DIR = "/home/hermes-agent/workspace/hermes_daily_operating_loop";
export const HERMES_SAFE_EXPORT_DIR = "/home/clawuser/hermes_safe_readonly_exports/hermes_daily_operating_loop";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_SECTION_ITEMS = 8;
const MAX_LINE_LENGTH = 260;

const DAILY_SOURCE_FILES = [
  { key: "dailyOperatingPlan", label: "Today's operating plan", fileName: "daily_operating_plan.md", type: "markdown" },
  { key: "breaksToday", label: "Breaks and blockers", fileName: "breaks_today.md", type: "markdown" },
  { key: "repairQueueForCodex", label: "Codex repair queue", fileName: "repair_queue_for_codex.md", type: "markdown" },
  { key: "repairQueueForCowork", label: "Cowork repair queue", fileName: "repair_queue_for_cowork.md", type: "markdown" },
  { key: "jonathanApprovalQueue", label: "Jonathan approval queue", fileName: "jonathan_approval_queue.md", type: "markdown" },
  { key: "codexTodayQueue", label: "Codex queue", fileName: "codex_today_queue.md", type: "markdown" },
  { key: "coworkTodayInstructions", label: "Cowork queue", fileName: "cowork_today_instructions.md", type: "markdown" },
  { key: "revenueRiskAndNextActions", label: "Revenue risks and next actions", fileName: "revenue_risk_and_next_actions.md", type: "markdown" },
  { key: "loopRunSummary", label: "Last Hermes loop run", fileName: "loop_run_summary.json", type: "json" },
] as const;

type SourceStatus = "real_data_connected" | "file_missing" | "parse_error";

export interface HermesMarkdownSection {
  title: string;
  items: string[];
}

export interface HermesSourceFile {
  key: (typeof DAILY_SOURCE_FILES)[number]["key"];
  label: string;
  fileName: string;
  type: "markdown" | "json";
  status: SourceStatus;
  lastModified: string | null;
  lastSuccessfulParseAt: string | null;
  stale: boolean;
  message: string;
  sections: HermesMarkdownSection[];
  jsonSummary?: HermesLoopRunSummary;
  readLocation: "primary_workspace" | "safe_export" | "safe_export_api" | "unavailable";
}

export interface HermesLoopRunSummary {
  runId?: string;
  generatedAt?: string;
  status: string;
  counts: Array<{ label: string; value: number }>;
  pipelineViewCounts: Array<{ label: string; value: number }>;
}

export interface HermesLiveDashboardData {
  dataMode: "real_data_connected" | "using_mock_fallback";
  generatedAt: string;
  sources: HermesSourceFile[];
  summary: {
    activeAgents: number;
    blockedAgents: number;
    approvalsWaiting: number;
    criticalMissions: number;
  };
  agents: HermesAgent[];
  missions: HermesMission[];
  sections: {
    operatingPlan: HermesSourceFile;
    revenueRisks: HermesSourceFile;
    breaks: HermesSourceFile;
    codexQueue: HermesSourceFile;
    coworkQueue: HermesSourceFile;
    approvalQueue: HermesSourceFile;
    loopRunSummary: HermesSourceFile;
  };
  fallbackReasons: string[];
}

export async function getHermesLiveDashboardData(): Promise<HermesLiveDashboardData> {
  const sources = await Promise.all(DAILY_SOURCE_FILES.map(readAllowlistedSource));
  const connectedSources = sources.filter((source) => source.status === "real_data_connected");
  const dataMode = connectedSources.length > 0 ? "real_data_connected" : "using_mock_fallback";
  const inferredMissions = dataMode === "real_data_connected" ? inferMissionsFromSources(sources) : hermesMissions;
  const inferredAgents = dataMode === "real_data_connected" ? inferAgentsFromSources(sources, inferredMissions) : hermesAgents;
  const summary =
    dataMode === "real_data_connected"
      ? {
          activeAgents: inferredAgents.filter((agent) => agent.status === "active").length,
          blockedAgents: inferredAgents.filter((agent) => agent.status === "blocked" || agent.status === "waiting_for_approval").length,
          approvalsWaiting: getItemCount(getSource(sources, "jonathanApprovalQueue")),
          criticalMissions: inferredMissions.filter((mission) => mission.priority === "critical").length,
        }
      : getHermesCommandSummary();

  return {
    dataMode,
    generatedAt: new Date().toISOString(),
    sources,
    summary,
    agents: inferredAgents,
    missions: inferredMissions,
    sections: {
      operatingPlan: getSource(sources, "dailyOperatingPlan"),
      revenueRisks: getSource(sources, "revenueRiskAndNextActions"),
      breaks: getSource(sources, "breaksToday"),
      codexQueue: getSource(sources, "codexTodayQueue"),
      coworkQueue: getSource(sources, "coworkTodayInstructions"),
      approvalQueue: getSource(sources, "jonathanApprovalQueue"),
      loopRunSummary: getSource(sources, "loopRunSummary"),
    },
    fallbackReasons: sources
      .filter((source) => source.status !== "real_data_connected")
      .map((source) => `${source.fileName}: ${source.message}`),
  };
}

async function readAllowlistedSource(source: (typeof DAILY_SOURCE_FILES)[number]): Promise<HermesSourceFile> {
  const candidates = [
    { location: "primary_workspace" as const, filePath: path.join(HERMES_DAILY_LOOP_DIR, source.fileName) },
    { location: "safe_export" as const, filePath: path.join(HERMES_SAFE_EXPORT_DIR, source.fileName) },
  ];

  let lastErrorCode = "";

  for (const candidate of candidates) {
    const parsed = await readSourceCandidate(source, candidate.filePath, candidate.location);
    if (parsed.source) return parsed.source;
    lastErrorCode = parsed.errorCode;
  }

  const remote = await readRemoteSafeExportSource(source);
  if (remote.source) return remote.source;
  if (remote.errorCode) lastErrorCode = remote.errorCode;

  return {
    ...baseSource(source, lastErrorCode === "ENOENT" ? "file_missing" : "parse_error", null, false, "unavailable"),
    message: lastErrorCode === "ENOENT" ? "File is missing from the Hermes workspace and safe export mirror." : "File could not be read or parsed safely.",
  };
}

async function readSourceCandidate(
  source: (typeof DAILY_SOURCE_FILES)[number],
  filePath: string,
  readLocation: HermesSourceFile["readLocation"],
): Promise<{ source: HermesSourceFile | null; errorCode: string }> {
  try {
    const fileStat = await stat(filePath);
    const raw = await readFile(filePath, "utf8");
    const lastModified = fileStat.mtime.toISOString();
    const stale = Date.now() - fileStat.mtime.getTime() > STALE_AFTER_MS;
    const locationMessage = readLocation === "safe_export" ? " Connected through safe read-only export mirror." : "";

    if (source.type === "json") {
      return {
        source: {
          ...baseSource(source, "real_data_connected", lastModified, stale, readLocation),
          message: `${stale ? "Real data connected, but older than 24 hours." : "Real data connected."}${locationMessage}`,
          jsonSummary: parseLoopRunSummary(raw),
        },
        errorCode: "",
      };
    }

    return {
      source: {
        ...baseSource(source, "real_data_connected", lastModified, stale, readLocation),
        message: `${stale ? "Real data connected, but older than 24 hours." : "Real data connected."}${locationMessage}`,
        sections: parseMarkdownSections(raw),
      },
      errorCode: "",
    };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "UNKNOWN";
    return {
      source: null,
      errorCode: code,
    };
  }
}

interface RemoteSafeExportFile {
  file_name: string;
  status: "available" | "missing";
  last_modified?: string;
  content?: string;
}

interface RemoteSafeExportResponse {
  status: string;
  read_at: string;
  files: RemoteSafeExportFile[];
}

let remoteSafeExportPromise: Promise<RemoteSafeExportResponse | null> | null = null;

async function readRemoteSafeExportSource(
  source: (typeof DAILY_SOURCE_FILES)[number],
): Promise<{ source: HermesSourceFile | null; errorCode: string }> {
  const remoteExport = await getRemoteSafeExport();
  if (!remoteExport) return { source: null, errorCode: "ENOENT" };

  const file = remoteExport.files.find((item) => item.file_name === source.fileName);
  if (!file || file.status !== "available" || typeof file.content !== "string") {
    return { source: null, errorCode: "ENOENT" };
  }

  try {
    const lastModified = file.last_modified || remoteExport.read_at;
    const stale = Date.now() - new Date(lastModified).getTime() > STALE_AFTER_MS;
    const message = `${stale ? "LIVE EXPORT STALE: safe export is older than 24 hours." : "LIVE EXPORT: connected through api.ottoserv.com safe export."}`;

    if (source.type === "json") {
      return {
        source: {
          ...baseSource(source, "real_data_connected", lastModified, stale, "safe_export_api"),
          message,
          jsonSummary: parseLoopRunSummary(file.content),
        },
        errorCode: "",
      };
    }

    return {
      source: {
        ...baseSource(source, "real_data_connected", lastModified, stale, "safe_export_api"),
        message,
        sections: parseMarkdownSections(file.content),
      },
      errorCode: "",
    };
  } catch {
    return { source: null, errorCode: "PARSE_ERROR" };
  }
}

async function getRemoteSafeExport(): Promise<RemoteSafeExportResponse | null> {
  const url = process.env.HERMES_SAFE_EXPORT_API_URL || process.env.HERMES_APPROVAL_API_URL?.replace(/\/approval-decisions$/, "/safe-export");
  const apiKey = process.env.HERMES_APPROVAL_API_KEY;

  if (!url || !apiKey) return null;
  if (!remoteSafeExportPromise) {
    remoteSafeExportPromise = fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const parsed = (await response.json()) as RemoteSafeExportResponse;
        return Array.isArray(parsed.files) ? parsed : null;
      })
      .catch(() => null);
  }

  return remoteSafeExportPromise;
}

function baseSource(
  source: (typeof DAILY_SOURCE_FILES)[number],
  status: SourceStatus,
  lastModified: string | null,
  stale: boolean,
  readLocation: HermesSourceFile["readLocation"],
): HermesSourceFile {
  return {
    key: source.key,
    label: source.label,
    fileName: source.fileName,
    type: source.type,
    status,
    lastModified,
    lastSuccessfulParseAt: status === "real_data_connected" ? new Date().toISOString() : null,
    stale,
    message: "",
    sections: [],
    readLocation,
  };
}

function parseMarkdownSections(raw: string): HermesMarkdownSection[] {
  const sections: HermesMarkdownSection[] = [];
  let current: HermesMarkdownSection | null = null;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = sanitizeHermesLine(rawLine);
    if (!line) continue;

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      current = { title: truncateLine(heading[2]), items: [] };
      sections.push(current);
      continue;
    }

    const listItem = /^(?:[-*]\s+|\d+\.\s+)(.+)$/.exec(line);
    if (listItem) {
      if (!current) {
        current = { title: "Items", items: [] };
        sections.push(current);
      }
      if (current.items.length < MAX_SECTION_ITEMS) {
        current.items.push(truncateLine(listItem[1]));
      }
    }
  }

  return sections.slice(0, 10);
}

function parseLoopRunSummary(raw: string): HermesLoopRunSummary {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const counts = [
    ["Breaks", parsed.break_count],
    ["Codex repairs", parsed.codex_repair_count],
    ["Cowork repairs", parsed.cowork_repair_count],
    ["Jonathan approvals", parsed.jonathan_approval_count],
    ["Candidate actions", parsed.candidate_action_count],
  ]
    .filter(([, value]) => typeof value === "number")
    .map(([label, value]) => ({ label: String(label), value: Number(value) }));

  const pipelineViewCounts =
    typeof parsed.pipeline_view_counts === "object" && parsed.pipeline_view_counts !== null
      ? Object.entries(parsed.pipeline_view_counts as Record<string, unknown>)
          .filter(([, value]) => typeof value === "number")
          .map(([label, value]) => ({ label: label.replace(/_/g, " "), value: Number(value) }))
      : [];

  return {
    runId: typeof parsed.run_id === "string" ? sanitizeHermesLine(parsed.run_id) : undefined,
    generatedAt: typeof parsed.generated_at === "string" ? sanitizeHermesLine(parsed.generated_at) : undefined,
    status: "Parsed from allowlisted loop summary.",
    counts,
    pipelineViewCounts,
  };
}

function inferMissionsFromSources(sources: HermesSourceFile[]): HermesMission[] {
  const inferred: HermesMission[] = [];
  const codexQueue = getSource(sources, "codexTodayQueue");
  const coworkQueue = getSource(sources, "coworkTodayInstructions");
  const approvalQueue = getSource(sources, "jonathanApprovalQueue");
  const breaks = getSource(sources, "breaksToday");

  collectMissionItems(codexQueue, "Codex", "HM-LIVE-CODEX", "high").forEach((mission) => inferred.push(mission));
  collectMissionItems(coworkQueue, "Cowork", "HM-LIVE-COWORK", "high").forEach((mission) => inferred.push(mission));
  collectMissionItems(approvalQueue, "Hermes/Jarvis", "HM-LIVE-APPROVAL", "critical", "waiting_for_approval").forEach((mission) => inferred.push(mission));
  collectMissionItems(breaks, "Hermes/Jarvis", "HM-LIVE-BREAK", "medium", "blocked").forEach((mission) => inferred.push(mission));

  return inferred.length ? inferred.slice(0, 12) : hermesMissions;
}

function collectMissionItems(
  source: HermesSourceFile,
  assignedAgent: string,
  idPrefix: string,
  priority: HermesMission["priority"],
  status: HermesMission["status"] = "active",
): HermesMission[] {
  if (source.status !== "real_data_connected") return [];

  return source.sections
    .flatMap((section) =>
      section.items.map((item, index) => ({
        item,
        section: section.title,
        index,
      })),
    )
    .slice(0, 4)
    .map(({ item, section }, index) => ({
      id: `${idPrefix}-${String(index + 1).padStart(3, "0")}`,
      title: item.replace(/^`?BRK-\d+`?\s*/i, "").slice(0, 120),
      businessObjective: `Advance Hermes operating section: ${section}`,
      assignedAgent,
      assignedBy: "Hermes",
      priority,
      status,
      dueWindow: "Current Hermes loop",
      requiredEvidence: ["Hermes source file", "Last modified timestamp", "Safe dashboard parse"],
      submittedEvidence: [`Parsed from ${source.fileName}`],
      hermesReviewResult: source.stale ? "Real source parsed but stale warning is active" : "Real source parsed successfully",
      blockers: status === "blocked" || status === "waiting_for_approval" ? [item] : [],
      nextAction: item,
      relatedEntity: source.label,
      revenueImpact: source.key === "breaksToday" ? "Unblocks revenue operations by resolving current breaks" : "Moves current Hermes operating loop forward",
      approvalRequirement: status === "waiting_for_approval" ? "Approval remains non-executing in OttoServ OS Phase 2" : "No direct execution from dashboard",
    }));
}

function inferAgentsFromSources(sources: HermesSourceFile[], missions: HermesMission[]): HermesAgent[] {
  return hermesAgents.map((agent) => {
    const lowerName = agent.name.toLowerCase();
    const assignedMission = missions.find((mission) => mission.assignedAgent.toLowerCase() === lowerName || lowerName.includes(mission.assignedAgent.toLowerCase()));

    if (agent.id === "codex") {
      const source = getSource(sources, "codexTodayQueue");
      return withRealAgentState(agent, source, assignedMission);
    }

    if (agent.id === "cowork") {
      const source = getSource(sources, "coworkTodayInstructions");
      return withRealAgentState(agent, source, assignedMission);
    }

    if (agent.id === "hermes-jarvis") {
      const source = getSource(sources, "dailyOperatingPlan");
      return withRealAgentState(agent, source, assignedMission);
    }

    return {
      ...agent,
      status: assignedMission ? assignedMission.status : agent.status,
      currentMission: assignedMission?.title || agent.currentMission,
      currentTask: assignedMission?.nextAction || agent.currentTask,
      lastActivity: newestModifiedLabel(sources) || agent.lastActivity,
    };
  });
}

function withRealAgentState(agent: HermesAgent, source: HermesSourceFile, mission?: HermesMission): HermesAgent {
  if (source.status !== "real_data_connected") {
    return {
      ...agent,
      currentTask: `${agent.currentTask} (mock fallback: ${source.message})`,
    };
  }

  return {
    ...agent,
    status: source.stale ? "blocked" : mission?.status || "active",
    currentMission: mission?.title || `Track ${source.label.toLowerCase()}`,
    currentTask: firstItem(source) || agent.currentTask,
    lastActivity: source.lastModified ? formatTimestamp(source.lastModified) : agent.lastActivity,
    evidenceSubmitted: [`Parsed ${source.fileName}`, `Last modified ${formatTimestamp(source.lastModified)}`],
    blockers: source.stale ? [`${source.fileName} is older than 24 hours`] : agent.blockers.filter((blocker) => !blocker.toLowerCase().includes("approval")),
    nextAction: firstItem(source) || agent.nextAction,
  };
}

function getSource(sources: HermesSourceFile[], key: HermesSourceFile["key"]): HermesSourceFile {
  const found = sources.find((source) => source.key === key);
  if (!found) {
    return {
      key,
      label: formatHermesLabel(key),
      fileName: `${key}.md`,
      type: "markdown",
      status: "file_missing",
      lastModified: null,
      lastSuccessfulParseAt: null,
      stale: false,
      message: "Source was not configured.",
      sections: [],
      readLocation: "unavailable",
    };
  }
  return found;
}

function firstItem(source: HermesSourceFile): string {
  return source.sections.flatMap((section) => section.items)[0] || "";
}

function getItemCount(source: HermesSourceFile): number {
  if (source.jsonSummary?.counts.length) {
    return source.jsonSummary.counts.reduce((total, item) => total + item.value, 0);
  }
  return source.sections.reduce((total, section) => total + section.items.length, 0);
}

function newestModifiedLabel(sources: HermesSourceFile[]): string {
  const newest = sources
    .map((source) => source.lastModified)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return newest ? formatTimestamp(newest) : "";
}

function sanitizeHermesLine(value: string): string {
  return value
    .trim()
    .replace(/\/home\/hermes-agent\/workspace\/[^\s`)]+/g, "[Hermes workspace path]")
    .replace(/\b[A-Z][A-Z0-9_]{7,}\b/g, "[redacted env var]")
    .replace(/\b(sk|pk|rk|whsec|xox[baprs])-?[A-Za-z0-9_=-]{12,}\b/g, "[redacted credential]")
    .replace(/(access_token|refresh_token|client_secret|api_key|authorization|bearer)(["'=:\s]+)[^\s,)}]+/gi, "$1$2[redacted]")
    .replace(/https?:\/\/[^\s)]+(?:token|key|secret|signature|code)=[^\s)]+/gi, "[redacted URL]");
}

function truncateLine(value: string): string {
  return value.length > MAX_LINE_LENGTH ? `${value.slice(0, MAX_LINE_LENGTH - 1)}...` : value;
}

export function formatTimestamp(value: string | null): string {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
