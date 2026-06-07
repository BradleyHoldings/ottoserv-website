"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getClarificationQuestions } from "@/lib/processScanDiagnostics.mjs";

type RecordingState = "idle" | "requesting" | "recording" | "stopped" | "error";
type AudioStatus = "unknown" | "enabled" | "disabled" | "blocked" | "unavailable";

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

type ClarificationQuestion = {
  id: string;
  label: string;
  placeholder?: string;
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

const GAP_TAGS = [
  { value: "missed_calls_messages", label: "Calls/messages get missed" },
  { value: "follow_up_depends_on_memory", label: "Follow-up depends on memory" },
  { value: "no_clear_owner", label: "No clear owner for the next step" },
  { value: "slow_response", label: "Leads wait too long for a response" },
  { value: "inconsistent_payment_reminders", label: "Payment/invoice reminders are inconsistent" },
  { value: "status_not_updated", label: "Status is not updated in the CRM or admin system" },
  { value: "too_many_tools", label: "The team uses too many tools or inboxes" },
  { value: "customers_ask_more_than_once", label: "Customers have to ask more than once" },
  { value: "lost_opportunities_unknown", label: "We do not know how many opportunities are being lost" },
  { value: "other", label: "Other" },
];

const RECORDING_EXAMPLES = [
  "Missed call workflow",
  "Form submission workflow",
  "Invoice or payment follow-up workflow",
  "Scheduling request",
  "Lead follow-up process",
  "Any front-office task that currently depends on people remembering what to do",
];

const RECORDING_TIPS = [
  "Show where the request starts.",
  "Explain who owns the next step.",
  "Show where reminders or follow-ups happen.",
  "Show where the final status is tracked.",
  "Narrate what normally happens if something gets missed.",
];

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;
const MAX_RECORDING_MS = 8 * 60 * 1000;
const LOCAL_RECORDING_NOTICE =
  "Recording preview is local to this browser session and is not uploaded or stored durably yet. Your submitted scan records that a recording was captured, but OttoServ admins will not receive the video file from this MVP flow.";

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
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("unknown");
  const [audioMessage, setAudioMessage] = useState("Microphone has not been enabled yet.");
  const [gapTags, setGapTags] = useState<string[]>([]);
  const [otherGapText, setOtherGapText] = useState("");
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [showWrittenForm, setShowWrittenForm] = useState(false);
  const [uploadConsent, setUploadConsent] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "preparing_upload" | "uploading" | "verifying" | "completed" | "failed">("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const clarificationQuestions = useMemo(
    () =>
      getClarificationQuestions({
        audio_status: audioStatus,
        software_used: form.software_used,
        gap_tags: gapTags,
        clarification_answers: clarificationAnswers,
      }) as ClarificationQuestion[],
    [audioStatus, clarificationAnswers, form.software_used, gapTags],
  );

  function set<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function requestMicrophone(): Promise<MediaStream | null> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAudioStatus("unavailable");
      setAudioMessage("Microphone recording is not available in this browser.");
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = stream;
      setAudioStatus("enabled");
      setAudioMessage("Microphone is enabled and will be included in the recording.");
      return stream;
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setAudioStatus(denied ? "blocked" : "disabled");
      setAudioMessage(
        denied
          ? "Microphone access is blocked. You can still record, but your report will be less detailed unless you add notes after recording."
          : "Microphone was not enabled. You can still record your screen and add notes after recording.",
      );
      return null;
    }
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
      const micStream = audioStatus === "enabled" ? micStreamRef.current : await requestMicrophone();
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const tracks = [
        ...displayStream.getVideoTracks(),
        ...displayStream.getAudioTracks(),
        ...(micStream?.getAudioTracks() || []),
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
          blobRef.current = blob;
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
          ? "Screen permission was denied. You can still submit the leak check with written notes."
          : "Recording could not start. You can still submit the leak check with written notes.",
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
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    recorderRef.current = null;
  }

  function toggleGapTag(value: string) {
    setGapTags((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function setClarification(id: string, value: string) {
    setClarificationAnswers((prev) => ({ ...prev, [id]: value }));
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
            clarificationAnswers.summary ||
            (recordingUrl
              ? "Workflow was recorded in the browser for OttoServ review. Written notes were not provided."
              : "Prospect requested OttoServ review. Written workflow notes were not provided."),
          recording_status: recordingUrl ? "recorded_upload_pending" : "not_provided",
          audio_status: audioStatus,
          gap_tags: gapTags,
          other_gap_text: otherGapText,
          clarification_answers: clarificationAnswers,
          source_page: "front_office_leak_check",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Form submission failed.");
      const id = body.scan?.id || "";
      const slug = body.scan?.public_report_slug || "";

      // Durable recording upload (only with explicit consent + a captured blob).
      // Truthful: the scan stays recorded_upload_pending unless the server verifies
      // the object. A failed/interrupted upload never reports completed.
      if (id && blobRef.current && uploadConsent) {
        try {
          const { uploadRecording } = await import("@/lib/recordingStorage/uploadClient");
          setUploadStatus("preparing_upload");
          const result = await uploadRecording({
            scanId: id,
            blob: blobRef.current,
            audioIncluded: audioStatus === "enabled",
            consent: { recording: true, upload: true, consented_at: new Date().toISOString() },
            onProgress: (s) => setUploadStatus(s),
          });
          setUploadStatus(result.state);
          setUploadMessage(
            result.ok
              ? "Recording uploaded and verified in secure storage."
              : `Recording was not durably stored (${result.reason || "pending"}). Your scan was submitted; an admin can request a retry.`,
          );
        } catch {
          setUploadStatus("failed");
          setUploadMessage("Recording upload could not start. Your scan was submitted without durable recording storage.");
        }
      }

      router.push(`/front-office-leak-check/thank-you?scan=${encodeURIComponent(id)}&report=${encodeURIComponent(slug)}`);
    } catch (err) {
      setSubmitState("error");
      setError(err instanceof Error ? err.message : "Form submission failed.");
    }
  }

  const minutes = Math.floor(recordingSeconds / 60).toString().padStart(2, "0");
  const seconds = (recordingSeconds % 60).toString().padStart(2, "0");
  const showGapCapture = recordingState === "stopped" || recordingUrl || showWrittenForm;

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
              Show one real workflow from start to finish. OttoServ will use the recording,
              gap tags, and a few missing-context answers to produce a practical diagnostic report.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
          <Panel title="1. Before You Record">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <p className="text-base leading-relaxed text-gray-300">
                  Record one real front-office workflow from start to finish. As you record,
                  explain what your team normally does, where things slow down, who owns each
                  step, and what happens if no one follows up.
                </p>
                <p className="text-sm leading-relaxed text-gray-400">
                  This quick leak check looks for places where front-office work depends on memory,
                  manual follow-up, scattered tools, or unclear ownership. The more context you
                  provide, the more accurate your report will be.
                </p>
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300">
                    Good workflows to record
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {RECORDING_EXAMPLES.map((example) => (
                      <div key={example} className="rounded border border-gray-800 bg-[#0d0d0d] px-3 py-2 text-sm text-gray-300">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300">
                  Recording tips
                </h3>
                <ol className="space-y-2 text-sm text-gray-300">
                  {RECORDING_TIPS.map((tip, idx) => (
                    <li key={tip} className="flex gap-2">
                      <span className="text-blue-300">{idx + 1}.</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Panel>

          <Panel title="2. Record This Workflow">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <MicrophoneStatus status={audioStatus} message={audioMessage} onEnable={requestMicrophone} />
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MiniStep title="Start" text="Pick a screen or window." />
                  <MiniStep title="Narrate" text="Explain who owns each step." />
                  <MiniStep title="Stop" text="Tag gaps before submitting." />
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
                {recordingUrl && (
                  <div className="mt-3 space-y-2">
                    <label className="flex items-start gap-2 rounded border border-blue-900 bg-blue-950/30 p-3 text-xs leading-relaxed text-blue-100">
                      <input
                        type="checkbox"
                        checked={uploadConsent}
                        onChange={(e) => setUploadConsent(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        I consent to securely uploading this screen{audioStatus === "enabled" ? "/audio" : ""} recording to OttoServ&apos;s
                        private storage for admin review. It is stored in a private bucket, never made public, and can be deleted on request.
                      </span>
                    </label>
                    {!uploadConsent && (
                      <p className="rounded border border-yellow-900 bg-yellow-950/30 p-3 text-xs leading-relaxed text-yellow-200">
                        {LOCAL_RECORDING_NOTICE}
                      </p>
                    )}
                    {uploadStatus !== "idle" && (
                      <p className="rounded border border-gray-800 bg-[#0d0d0d] p-3 text-xs leading-relaxed text-gray-300">
                        Upload status: <span className="font-semibold">{uploadStatus.replaceAll("_", " ")}</span>
                        {uploadMessage ? ` — ${uploadMessage}` : ""}
                      </p>
                    )}
                  </div>
                )}
                {recordingError && <p className="mt-3 text-sm text-yellow-300">{recordingError}</p>}
              </div>
            </div>
          </Panel>

          <Panel title="3. Tell Us Where To Send The Report">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Company name" required value={form.company_name} onChange={(v) => set("company_name", v)} />
              <Field label="Contact name" required value={form.contact_name} onChange={(v) => set("contact_name", v)} />
              <Field label="Email" required type="email" value={form.email} onChange={(v) => set("email", v)} />
              <Field label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
              <Select label="What should we look at?" value={form.main_leak} onChange={(v) => set("main_leak", v)} options={LEAKS} />
              <Field label="Best time to contact" placeholder="Weekday mornings, after 3pm..." value={form.best_time_to_contact} onChange={(v) => set("best_time_to_contact", v)} />
            </div>
          </Panel>

          {showGapCapture && (
            <Panel title="4. Tag Gaps And Fill Missing Context">
              <div>
                <h3 className="mb-3 text-base font-semibold text-white">
                  What problems happen in this workflow today?
                </h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {GAP_TAGS.map((tag) => (
                    <label key={tag.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 bg-[#0d0d0d] p-3 text-sm text-gray-300 hover:border-gray-700">
                      <input
                        type="checkbox"
                        checked={gapTags.includes(tag.value)}
                        onChange={() => toggleGapTag(tag.value)}
                        className="mt-1"
                      />
                      <span>{tag.label}</span>
                    </label>
                  ))}
                </div>
                {gapTags.includes("other") && (
                  <div className="mt-3">
                    <Field label="Other problem" value={otherGapText} onChange={setOtherGapText} placeholder="Short description" />
                  </div>
                )}
              </div>

              {clarificationQuestions.length > 0 && (
                <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-4">
                  <h3 className="text-base font-semibold text-white">
                    We could not confirm a few things from the recording.
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Answering these will make your report more accurate. Keep it short.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {clarificationQuestions.map((question) => (
                      <Field
                        key={question.id}
                        label={question.label}
                        value={clarificationAnswers[question.id] || ""}
                        placeholder={question.placeholder}
                        onChange={(value) => setClarification(question.id, value)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          )}

          <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <button
              type="button"
              onClick={() => setShowWrittenForm((value) => !value)}
              className="flex w-full items-center justify-between gap-4 text-left"
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

          <Panel title="Submit The Leak Check">
            {error && <p className="mb-3 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="w-full rounded-md bg-blue-600 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {submitState === "submitting" ? "Creating scan..." : "Submit My Free Leak Check"}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              You will get a shareable diagnostic report. If no narration is captured, the report
              will say so and rely on your gap tags and written answers.
            </p>
          </Panel>
        </form>
      </section>
    </div>
  );
}

function MicrophoneStatus({
  status,
  message,
  onEnable,
}: {
  status: AudioStatus;
  message: string;
  onEnable: () => Promise<MediaStream | null>;
}) {
  const label =
    status === "enabled"
      ? "Microphone: Enabled"
      : status === "blocked"
        ? "Microphone: Blocked"
        : status === "unavailable"
          ? "Microphone: Unavailable"
          : "Microphone: Not enabled";
  const tone = status === "enabled" ? "border-green-800 bg-green-950/20 text-green-200" : status === "blocked" ? "border-yellow-800 bg-yellow-950/20 text-yellow-200" : "border-gray-800 bg-[#0d0d0d] text-gray-300";
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-sm opacity-80">{message}</p>
        </div>
        {status !== "enabled" && status !== "unavailable" && (
          <button type="button" onClick={() => void onEnable()} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Enable Mic
          </button>
        )}
      </div>
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
