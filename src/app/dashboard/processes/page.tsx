"use client";

import { useState } from "react";
import {
  mockProcesses,
  mockProcessSOPs,
  mockAutomationOpportunities,
  PROCESS_STATUSES,
  Process,
  ProcessSOP,
  AutomationOpportunity,
} from "@/lib/mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  submitted: { label: "Submitted", color: "text-blue-400", bg: "bg-blue-400/10" },
  needs_review: { label: "Needs Review", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  sop_drafted: { label: "SOP Drafted", color: "text-purple-400", bg: "bg-purple-400/10" },
  automated: { label: "Automated", color: "text-green-400", bg: "bg-green-400/10" },
};

const COMPLEXITY_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Low", color: "text-green-400", bg: "bg-green-400/10" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  high: { label: "High", color: "text-red-400", bg: "bg-red-400/10" },
};

const OPP_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  identified: { label: "Identified", color: "text-blue-400", bg: "bg-blue-400/10" },
  in_progress: { label: "In Progress", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  live: { label: "Live", color: "text-green-400", bg: "bg-green-400/10" },
};

function scoreColor(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bg}`}
    >
      {label}
    </span>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "library", label: "Process Library" },
  { id: "record", label: "Record Process" },
  { id: "sops", label: "SOPs" },
  { id: "opportunities", label: "Automation Opportunities" },
  { id: "health", label: "Process Health" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Process Library ─────────────────────────────────────────────────────────

function ProcessLibrary({ processes }: { processes: Process[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
      {processes.map((proc) => {
        const sm = STATUS_META[proc.status];
        return (
          <div
            key={proc.id}
            className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-semibold">{proc.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {proc.department} · {proc.owner}
                </p>
              </div>
              <Badge label={sm.label} color={sm.color} bg={sm.bg} />
            </div>

            <div className="text-xs text-gray-400">
              Frequency: <span className="text-gray-200">{proc.frequency}</span>
            </div>

            {/* Health score bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Health</span>
                <span className={proc.health_score >= 75 ? "text-green-400" : proc.health_score >= 50 ? "text-yellow-400" : "text-red-400"}>
                  {proc.health_score}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-800">
                <div
                  className={`h-1.5 rounded-full ${scoreColor(proc.health_score)}`}
                  style={{ width: `${proc.health_score}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                Automation score:{" "}
                <span className="text-blue-400 font-medium">
                  {proc.automation_score}%
                </span>
              </span>
              {proc.client_facing && (
                <span className="text-purple-400">Client-facing</span>
              )}
            </div>

            <div className="flex gap-2 mt-1">
              <button className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
                Analyze
              </button>
              <button className="flex-1 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors">
                View
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Record Process ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  who_performs: "",
  department: "",
  trigger: "",
  tools_used: "",
  frequency: "",
  desired_outcome: "",
  current_steps: "",
  what_goes_wrong: "",
  what_takes_most_time: "",
  should_never_happen: "",
  approver: "",
  compliance_concerns: "",
  client_facing: false,
  analyze_for_automation: false,
};

function RecordProcess({
  onSubmit,
}: {
  onSubmit: (data: typeof EMPTY_FORM) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  function set(key: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
    setSubmitted(true);
    setForm(EMPTY_FORM);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-white text-lg font-semibold">Process recorded!</p>
        <p className="text-gray-400 text-sm text-center max-w-sm">
          Your process has been submitted for review. Jarvis will analyze it for
          automation opportunities.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Record another
        </button>
      </div>
    );
  }

  const field =
    "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500";
  const label = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto flex flex-col gap-5"
    >
      <p className="text-gray-400 text-sm">
        Answer as many questions as you can. The more detail, the better the
        analysis.
      </p>

      {/* Q1 */}
      <div>
        <label className={label}>1. Process name *</label>
        <input
          required
          className={field}
          placeholder="e.g. New Lead Intake"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      {/* Q2 */}
      <div>
        <label className={label}>2. Who performs this process?</label>
        <input
          className={field}
          placeholder="Role or person"
          value={form.who_performs}
          onChange={(e) => set("who_performs", e.target.value)}
        />
      </div>

      {/* Q3 */}
      <div>
        <label className={label}>3. Department</label>
        <input
          className={field}
          placeholder="e.g. Sales, Operations, Finance"
          value={form.department}
          onChange={(e) => set("department", e.target.value)}
        />
      </div>

      {/* Q4 */}
      <div>
        <label className={label}>4. What triggers this process?</label>
        <input
          className={field}
          placeholder="e.g. New inquiry, invoice past due, contract signed"
          value={form.trigger}
          onChange={(e) => set("trigger", e.target.value)}
        />
      </div>

      {/* Q5 */}
      <div>
        <label className={label}>5. Tools / software used</label>
        <input
          className={field}
          placeholder="e.g. HubSpot, QuickBooks, Slack"
          value={form.tools_used}
          onChange={(e) => set("tools_used", e.target.value)}
        />
      </div>

      {/* Q6 */}
      <div>
        <label className={label}>6. How often does this run?</label>
        <input
          className={field}
          placeholder="e.g. Daily, Weekly, Per project"
          value={form.frequency}
          onChange={(e) => set("frequency", e.target.value)}
        />
      </div>

      {/* Q7 */}
      <div>
        <label className={label}>7. What is the desired outcome?</label>
        <input
          className={field}
          placeholder="What does done look like?"
          value={form.desired_outcome}
          onChange={(e) => set("desired_outcome", e.target.value)}
        />
      </div>

      {/* Q8 */}
      <div>
        <label className={label}>8. List the current steps (one per line)</label>
        <textarea
          className={`${field} min-h-[120px] resize-y`}
          placeholder={"1. Step one\n2. Step two\n3. Step three"}
          value={form.current_steps}
          onChange={(e) => set("current_steps", e.target.value)}
        />
      </div>

      {/* Q9 */}
      <div>
        <label className={label}>9. What goes wrong most often?</label>
        <textarea
          className={`${field} min-h-[80px] resize-y`}
          placeholder="Common errors, bottlenecks, or points of failure"
          value={form.what_goes_wrong}
          onChange={(e) => set("what_goes_wrong", e.target.value)}
        />
      </div>

      {/* Q10 */}
      <div>
        <label className={label}>10. What takes the most time?</label>
        <input
          className={field}
          placeholder="The biggest time sink in this process"
          value={form.what_takes_most_time}
          onChange={(e) => set("what_takes_most_time", e.target.value)}
        />
      </div>

      {/* Q11 */}
      <div>
        <label className={label}>11. What should NEVER happen in this process?</label>
        <input
          className={field}
          placeholder="Critical guardrails or failure modes to avoid"
          value={form.should_never_happen}
          onChange={(e) => set("should_never_happen", e.target.value)}
        />
      </div>

      {/* Q12 */}
      <div>
        <label className={label}>12. Who approves or signs off?</label>
        <input
          className={field}
          placeholder="Role or name"
          value={form.approver}
          onChange={(e) => set("approver", e.target.value)}
        />
      </div>

      {/* Q13 */}
      <div>
        <label className={label}>13. Any compliance or legal concerns?</label>
        <input
          className={field}
          placeholder="Licenses, contracts, regulations, privacy requirements"
          value={form.compliance_concerns}
          onChange={(e) => set("compliance_concerns", e.target.value)}
        />
      </div>

      {/* Q14 */}
      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-900 border border-gray-700">
        <div>
          <p className="text-sm text-white font-medium">14. Is this client-facing?</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Does the client see or experience this process directly?
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("client_facing", !form.client_facing)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.client_facing ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.client_facing ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Q15 */}
      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-900 border border-gray-700">
        <div>
          <p className="text-sm text-white font-medium">
            15. Analyze this process for automation?
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Jarvis will score it and surface automation opportunities.
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("analyze_for_automation", !form.analyze_for_automation)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.analyze_for_automation ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.analyze_for_automation ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <button
        type="submit"
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
      >
        Submit Process
      </button>
    </form>
  );
}

// ─── SOPs ─────────────────────────────────────────────────────────────────────

function SOPList({ sops }: { sops: ProcessSOP[] }) {
  if (sops.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">
        No SOPs generated yet. Record and analyze a process first.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {sops.map((sop) => (
        <div
          key={sop.id}
          className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-semibold">{sop.process_name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                v{sop.version} · Updated {sop.updated_at.slice(0, 10)} · {sop.author}
              </p>
            </div>
            <Badge
              label={sop.status === "approved" ? "Approved" : "Draft"}
              color={sop.status === "approved" ? "text-green-400" : "text-yellow-400"}
              bg={sop.status === "approved" ? "bg-green-400/10" : "bg-yellow-400/10"}
            />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{sop.content_summary}</p>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
              View SOP
            </button>
            <button className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors">
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Automation Opportunities ─────────────────────────────────────────────────

function OpportunityCards({
  opportunities,
}: {
  opportunities: AutomationOpportunity[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {opportunities.map((opp) => {
        const cx = COMPLEXITY_META[opp.complexity];
        const st = OPP_STATUS_META[opp.status];
        return (
          <div
            key={opp.id}
            className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-white font-semibold leading-snug">{opp.title}</p>
              <div className="flex gap-2 flex-shrink-0">
                <Badge label={cx.label} color={cx.color} bg={cx.bg} />
                <Badge label={st.label} color={st.color} bg={st.bg} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                <p className="text-xs font-medium text-red-400 mb-1">Problem</p>
                <p className="text-gray-300 text-sm leading-relaxed">{opp.problem}</p>
              </div>
              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                <p className="text-xs font-medium text-green-400 mb-1">Solution</p>
                <p className="text-gray-300 text-sm leading-relaxed">{opp.solution}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Time saved:{" "}
                <span className="text-blue-400 font-semibold">
                  {opp.time_savings_hrs_month} hrs/month
                </span>
              </span>
              <button className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
                Build Automation
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Process Health ───────────────────────────────────────────────────────────

function ProcessHealth({ processes }: { processes: Process[] }) {
  const avg =
    processes.length > 0
      ? Math.round(
          processes.reduce((s, p) => s + p.health_score, 0) / processes.length
        )
      : 0;

  const needsReview = processes.filter(
    (p) => p.status === "needs_review" || p.health_score < 55
  ).length;

  const automationCandidates = processes.filter(
    (p) => p.automation_score >= 65 && p.status !== "automated"
  ).length;

  const deptBreakdown: Record<string, { count: number; totalHealth: number }> =
    {};
  processes.forEach((p) => {
    if (!deptBreakdown[p.department]) {
      deptBreakdown[p.department] = { count: 0, totalHealth: 0 };
    }
    deptBreakdown[p.department].count++;
    deptBreakdown[p.department].totalHealth += p.health_score;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 text-center">
          <p
            className={`text-3xl font-bold ${
              avg >= 70 ? "text-green-400" : avg >= 50 ? "text-yellow-400" : "text-red-400"
            }`}
          >
            {avg}%
          </p>
          <p className="text-gray-400 text-sm mt-1">Avg Health Score</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-yellow-400">{needsReview}</p>
          <p className="text-gray-400 text-sm mt-1">Need Review</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-blue-400">{automationCandidates}</p>
          <p className="text-gray-400 text-sm mt-1">Automation Candidates</p>
        </div>
      </div>

      {/* Department breakdown */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
        <p className="text-white font-semibold mb-4">Department Breakdown</p>
        <div className="flex flex-col gap-4">
          {Object.entries(deptBreakdown).map(([dept, data]) => {
            const avgHealth = Math.round(data.totalHealth / data.count);
            return (
              <div key={dept}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{dept}</span>
                  <span className="text-gray-400">
                    {data.count} process{data.count !== 1 ? "es" : ""} ·{" "}
                    <span
                      className={
                        avgHealth >= 70
                          ? "text-green-400"
                          : avgHealth >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                      }
                    >
                      {avgHealth}% avg health
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-800">
                  <div
                    className={`h-2 rounded-full ${scoreColor(avgHealth)}`}
                    style={{ width: `${avgHealth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-process health list */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
        <p className="text-white font-semibold mb-4">All Processes</p>
        <div className="flex flex-col gap-3">
          {[...processes]
            .sort((a, b) => a.health_score - b.health_score)
            .map((proc) => {
              const sm = STATUS_META[proc.status];
              return (
                <div key={proc.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-200 truncate">
                        {proc.name}
                      </span>
                      <span
                        className={`text-xs font-medium ml-2 flex-shrink-0 ${
                          proc.health_score >= 75
                            ? "text-green-400"
                            : proc.health_score >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {proc.health_score}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-800">
                      <div
                        className={`h-1.5 rounded-full ${scoreColor(proc.health_score)}`}
                        style={{ width: `${proc.health_score}%` }}
                      />
                    </div>
                  </div>
                  <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProcessesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("library");
  const [processes, setProcesses] = useState<Process[]>(mockProcesses);
  const [sops] = useState<ProcessSOP[]>(mockProcessSOPs);
  const [opportunities] = useState<AutomationOpportunity[]>(
    mockAutomationOpportunities
  );

  function handleNewProcess(data: typeof EMPTY_FORM) {
    const newProc: Process = {
      id: `proc_${Date.now()}`,
      name: data.name,
      department: data.department || "Unassigned",
      owner: data.who_performs || "Unknown",
      frequency: data.frequency || "Unknown",
      health_score: 50,
      automation_score: data.analyze_for_automation ? 60 : 20,
      priority_score: 50,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      trigger: data.trigger,
      tools_used: data.tools_used ? data.tools_used.split(",").map((s) => s.trim()) : [],
      desired_outcome: data.desired_outcome,
      current_steps: data.current_steps,
      client_facing: data.client_facing,
      analyze_for_automation: data.analyze_for_automation,
    };
    setProcesses((prev) => [newProc, ...prev]);
    setActiveTab("library");
  }

  const automatedCount = processes.filter((p) => p.status === "automated").length;
  const totalTimeSaved = opportunities.reduce(
    (s, o) => s + o.time_savings_hrs_month,
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Process Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">
            {processes.length} processes tracked · {automatedCount} automated ·{" "}
            {totalTimeSaved} hrs/month saved
          </p>
        </div>
        <button
          onClick={() => setActiveTab("record")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Record Process
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "library" && <ProcessLibrary processes={processes} />}
      {activeTab === "record" && <RecordProcess onSubmit={handleNewProcess} />}
      {activeTab === "sops" && <SOPList sops={sops} />}
      {activeTab === "opportunities" && (
        <OpportunityCards opportunities={opportunities} />
      )}
      {activeTab === "health" && <ProcessHealth processes={processes} />}
    </div>
  );
}
