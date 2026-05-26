"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RecordingState = "idle" | "requesting" | "recording" | "stopped" | "error";

type IntakeForm = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  industry: string;
  website: string;
  business_type: string;
  main_leak: string;
  process_name: string;
  software_used: string;
  current_process_description: string;
  failure_impact: string;
  monthly_lead_volume: string;
  best_time_to_contact: string;
};

const INITIAL: IntakeForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  industry: "",
  website: "",
  business_type: "",
  main_leak: "",
  process_name: "",
  software_used: "",
  current_process_description: "",
  failure_impact: "",
  monthly_lead_volume: "",
  best_time_to_contact: "",
};

const BUSINESS_TYPES = [
  "Contractor",
  "HVAC",
  "Plumbing",
  "Roofing",
  "Property Management",
  "Home Services",
  "Other",
];

const LEAKS = [
  { value: "missed_calls", label: "Missed calls / after-hours calls" },
  { value: "lead_intake", label: "Lead intake" },
  { value: "estimate_follow_up", label: "Estimate follow-up" },
  { value: "scheduling", label: "Scheduling" },
  { value: "invoice_payment_follow_up", label: "Invoice/payment follow-up" },
  { value: "crm_admin_updates", label: "CRM/admin process" },
  { value: "other", label: "Other front office workflow" },
];

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;
const MAX_RECORDING_MS = 8 * 60 * 1000;

export default function ProcessScanIntake() {
  const router = useRouter();
  const [form, setForm] = useState<IntakeForm>(INITIAL);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingError, setRecordingError] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingSize, setRecordingSize] = useState(0);
  const [showWrittenForm, setShowWrittenForm] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  function set<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function startRecording() {
    setRecordingError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setRecordingState("error");
      setRecordingError("This browser does not support screen recording. You can still submit the leak check without a recording.");
      return;
    }

    setRecordingState("requesting");
    chunksRef.current = [];
    setRecordingSize(0);
    setRecordingUrl("");

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        audioStream = null;
      }

      const tracks = [
        ...displayStream.getVideoTracks(),
        ...displayStream.getAudioTracks(),
        ...(audioStream?.getAudioTracks() || []),
      ];
      const mixedStream = new MediaStream(tracks);
      streamRef.current = mixedStream;

      const recorder = new MediaRecorder(mixedStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });

      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        chunksRef.current.push(event.data);
        const nextSize = chunksRef.current.reduce((sum, part) => sum + ((part as Blob).size || 0), 0);
        setRecordingSize(nextSize);
        if (nextSize > MAX_RECORDING_BYTES) {
          setRecordingError("Recording is too large for the current MVP limit. Stop and submit the form; upload storage will be connected next.");
          stopRecording();
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordingSize(blob.size);
        if (blob.size > 0) {
          setRecordingUrl(URL.createObjectURL(blob));
        }
        stopTracks();
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setRecordingState("stopped");
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setRecordingSeconds(Math.floor(elapsed / 1000));
        if (elapsed >= MAX_RECORDING_MS) {
          setRecordingError("Recording stopped at the 8 minute MVP limit. You can still submit the leak check.");
          stopRecording();
        }
      }, 1000);

      displayStream.getVideoTracks()[0]?.addEventListener("ended", stopRecording);
      recorder.start(1000);
      setRecordingState("recording");
    } catch (err) {
      stopTracks();
      setRecordingState("error");
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setRecordingError(
        denied
          ? "Screen or microphone permission was denied. You can still submit the leak check without recording."
          : "Recording could not start. You can still submit the leak check without recording.",
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    stopTracks();
    setRecordingState("stopped");
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState("submitting");
    setError("");

    try {
      const res = await fetch("/api/process-scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          main_leak: form.main_leak || "other",
          process_name: form.process_name || `${leakLabel(form.main_leak)} workflow`,
          process_type: form.main_leak || "other",
          current_process_description:
            form.current_process_description ||
            (recordingUrl
              ? "Workflow was recorded in the browser for OttoServ review. Written notes were not provided."
              : "Prospect requested OttoServ review. Written workflow notes were not provided."),
          recording_status: recordingUrl ? "recorded_upload_pending" : "not_provided",
          source_page: "front_office_leak_check",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Form submission failed.");
      const id = body.scan?.id || "";
      const slug = body.scan?.public_report_slug || "";
      router.push(`/front-office-leak-check/thank-you?scan=${encodeURIComponent(id)}&report=${encodeURIComponent(slug)}`);
    } catch (err) {
      setSubmitState("error");
      setError(err instanceof Error ? err.message : "Form submission failed.");
    }
  }

  const minutes = Math.floor(recordingSeconds / 60).toString().padStart(2, "0");
  const seconds = (recordingSeconds % 60).toString().padStart(2, "0");

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
              Free Front Office Leak Check
            </p>
            <h1 className="mb-5 text-4xl font-bold leading-tight text-white md:text-6xl">
              Record one front office workflow. We will map the leak.
            </h1>
            <p className="text-lg leading-relaxed text-gray-400">
              The best way to run the free leak check is to show us the workflow on your
              screen and talk through what happens. We will map the process, identify leaks,
              and show what can be automated. Prefer not to record? You can type the workflow
              instead.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
          <Panel title="1. Record This Workflow">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <p className="text-base leading-relaxed text-gray-300">
                  Click record, choose the browser tab or window where the workflow happens,
                  and narrate it like you are showing a new office manager what to do. Talk
                  through where leads, calls, estimates, scheduling, payments, or CRM updates
                  get stuck.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MiniStep title="Start" text="Pick a screen or window." />
                  <MiniStep title="Narrate" text="Explain who owns each step." />
                  <MiniStep title="Stop" text="Submit it for the report." />
                </div>
              </div>
              <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">
                    {recordingState === "recording" ? "Recording" : recordingState === "stopped" ? "Captured locally" : recordingState === "requesting" ? "Waiting for permission" : "Ready to record"}
                  </span>
                  <span className="font-mono text-sm text-blue-300">{minutes}:{seconds}</span>
                </div>
                {recordingUrl ? (
                  <video src={recordingUrl} controls className="mb-3 aspect-video w-full rounded bg-black" />
                ) : (
                  <div className="mb-3 flex aspect-video items-center justify-center rounded border border-dashed border-blue-900 bg-[#0d0d0d] text-center text-sm text-gray-500">
                    Your screen recording preview will appear here.
                  </div>
                )}
                {recordingState !== "recording" ? (
                  <button type="button" onClick={startRecording} className="w-full rounded bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                    Record This Workflow
                  </button>
                ) : (
                  <button type="button" onClick={stopRecording} className="w-full rounded bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700">
                    Stop Recording
                  </button>
                )}
                {recordingSize > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Local recording size: {(recordingSize / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
                {recordingError && <p className="mt-3 text-sm text-yellow-300">{recordingError}</p>}
              </div>
            </div>
          </Panel>

          <Panel title="2. Tell Us Where To Send The Report">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Company name" required value={form.company_name} onChange={(v) => set("company_name", v)} />
              <Field label="Contact name" required value={form.contact_name} onChange={(v) => set("contact_name", v)} />
              <Field label="Email" required type="email" value={form.email} onChange={(v) => set("email", v)} />
              <Field label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
              <Select label="What should we look at?" value={form.main_leak} onChange={(v) => set("main_leak", v)} options={LEAKS} />
              <Field label="Best time to contact" placeholder="Weekday mornings, after 3pm..." value={form.best_time_to_contact} onChange={(v) => set("best_time_to_contact", v)} />
            </div>
          </Panel>

          <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <button
              type="button"
              onClick={() => setShowWrittenForm((value) => !value)}
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-lg font-semibold text-white">
                  Prefer to type it instead?
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  Open the written form if you do not want to record, or if you want to add extra context.
                </span>
              </span>
              <span className="text-2xl text-blue-400">{showWrittenForm ? "-" : "+"}</span>
            </button>
          </div>

          {showWrittenForm && (
          <div className="space-y-6">
            <Panel title="Business Details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Industry" value={form.industry} onChange={(v) => set("industry", v)} />
                <Field label="Website" type="url" placeholder="https://" value={form.website} onChange={(v) => set("website", v)} />
              </div>
              <Select label="Business type" value={form.business_type} onChange={(v) => set("business_type", v)} options={BUSINESS_TYPES} />
            </Panel>

            <Panel title="Written Workflow Notes">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Process name" placeholder="New lead intake, estimate follow-up..." value={form.process_name} onChange={(v) => set("process_name", v)} />
                <Field label="Software used" placeholder="ServiceTitan, JobNimbus, HubSpot, Google Sheets..." value={form.software_used} onChange={(v) => set("software_used", v)} />
                <Field label="Approximate monthly lead volume" placeholder="25, 50-100, unknown..." value={form.monthly_lead_volume} onChange={(v) => set("monthly_lead_volume", v)} />
              </div>
              <TextArea
                label="Current process description"
                rows={5}
                value={form.current_process_description}
                onChange={(v) => set("current_process_description", v)}
                placeholder="Walk us through what happens today, who owns each step, and where the handoff happens."
              />
              <TextArea
                label="What happens when this process fails?"
                rows={3}
                value={form.failure_impact}
                onChange={(v) => set("failure_impact", v)}
                placeholder="Missed job, late estimate, angry tenant, unpaid invoice, duplicate entry..."
              />
            </Panel>
          </div>
          )}

          <Panel title="3. Submit The Leak Check">
              {error && <p className="mb-3 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="w-full rounded-md bg-blue-600 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {submitState === "submitting" ? "Creating scan..." : "Submit My Free Leak Check"}
              </button>
              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                You will get a status page and a shareable diagnostic report link. OttoServ
                reviews submissions before sending final report emails.
              </p>
            </Panel>
        </form>
      </section>
    </div>
  );
}

function MiniStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-3">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-gray-500">{text}</div>
    </div>
  );
}

function leakLabel(value: string) {
  return LEAKS.find((item) => item.value === value)?.label || "Front office";
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-[#111827] p-6">
      <h2 className="mb-5 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-100 outline-none transition-colors focus:border-blue-500"
      >
        <option value="">Select one...</option>
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      <textarea
        required={required}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
      />
    </label>
  );
}
