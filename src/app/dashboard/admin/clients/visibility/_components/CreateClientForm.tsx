"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [mainService, setMainService] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/visibility/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          mainService,
          serviceAreas: serviceAreas.split(",").map((s) => s.trim()).filter(Boolean),
          competitors: competitors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name })),
          contact: phone ? { primaryPhone: phone } : {},
          website: website || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "failed");
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded"
      >
        + New client kit
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-[#111827] border border-gray-800 rounded p-4 mb-6 space-y-3 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Company name *" value={companyName} onChange={setCompanyName} required />
        <Field label="Main service *" value={mainService} onChange={setMainService} required />
        <Field label="Service areas (comma-separated)" value={serviceAreas} onChange={setServiceAreas} />
        <Field label="Competitors (comma-separated)" value={competitors} onChange={setCompetitors} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="Website" value={website} onChange={setWebsite} />
      </div>
      {err ? <p className="text-red-400 text-sm">{err}</p> : null}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold px-4 py-2 rounded">
          {busy ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-300 px-4 py-2">Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
      />
    </label>
  );
}
