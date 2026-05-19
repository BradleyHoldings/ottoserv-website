"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewGate, ReviewStatus } from "@/lib/visibility-kit/types";

const STATUSES: ReviewStatus[] = ["draft", "in_review", "needs_revision", "approved", "published"];
const GATE_KEYS: (keyof ReviewGate)[] = [
  "clientApprovalRequired",
  "legalConcernsCleared",
  "pricingVerified",
  "testimonialsVerified",
  "claimsVerified",
  "schemaValidated",
];

type Field = "aiLearnPageStatus" | "pricingPageStatus";
type GateField = "aiLearnPageGates" | "pricingPageGates";

export function StatusSelect({ slug, field, value }: { slug: string; field: Field; value: ReviewStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(next: ReviewStatus) {
    setBusy(true);
    try {
      await fetch(`/api/visibility/clients/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      disabled={busy}
      value={value}
      onChange={(e) => onChange(e.target.value as ReviewStatus)}
      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export function GateToggles({ slug, field, gates }: { slug: string; field: GateField; gates: ReviewGate }) {
  const router = useRouter();
  const [busy, setBusy] = useState<keyof ReviewGate | null>(null);

  async function toggle(key: keyof ReviewGate) {
    setBusy(key);
    try {
      const next = { ...gates, [key]: !gates[key] };
      await fetch(`/api/visibility/clients/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
      {GATE_KEYS.map((key) => {
        const on = gates[key];
        return (
          <li key={key}>
            <button
              type="button"
              disabled={busy === key}
              onClick={() => toggle(key)}
              className={`w-full text-left px-3 py-2 rounded border ${on ? "bg-emerald-900/40 border-emerald-700 text-emerald-100" : "bg-gray-900 border-gray-800 text-gray-300"}`}
            >
              {on ? "✓ " : "○ "}{key}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function RegenerateButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/visibility/clients/${slug}/generate`, { method: "POST" });
      const data = await res.json();
      setMsg(`Regenerated: ${data.problemSpaceTopics} topics, ${data.comparisonPages} comparisons, ${data.promptTrackerRows} tracker rows.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3">
      <button onClick={run} disabled={busy} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-3 py-2 rounded text-sm">
        {busy ? "Regenerating…" : "Regenerate drafts"}
      </button>
      <a href={`/api/visibility/clients/${slug}/export`} target="_blank" rel="noreferrer" className="text-blue-400 underline text-sm">
        Export portable bundle
      </a>
      {msg ? <span className="text-emerald-300 text-sm">{msg}</span> : null}
    </div>
  );
}
