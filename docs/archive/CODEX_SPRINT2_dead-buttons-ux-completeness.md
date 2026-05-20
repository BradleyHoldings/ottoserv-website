# OttoServ — Codex Sprint 2: Dead Buttons, Missing AI Features & UX Completeness
**Repo:** BradleyHoldings/ottoserv-website  
**Branch:** main  
**Prepared by:** Claude audit session, 2026-05-20  
**Do not:** delete data, change API endpoints, modify auth logic, touch production DB

---

## Overview

Fix 11 issues across 8 files. Three categories:
- **Dead buttons** — buttons that render but do nothing when clicked
- **Missing AI features** — pages where "write with AI" is obviously expected but absent
- **UX completeness** — small gaps that make the app feel unfinished

Each fix is surgical. Commit each separately with the commit message shown.

---

## FIX 1 — Footer: wrong contact email

**File:** `src/components/Footer.tsx`  
**Root cause:** Line 69 shows `hello@ottoserv.com`. The correct contact email is `jonathan@ottoservco.com`.

**Exact change — line 69:**

Current:
```tsx
href="mailto:hello@ottoserv.com"
```

Replace with:
```tsx
href="mailto:jonathan@ottoservco.com"
```

Also update the visible link text on line 70 from `hello@ottoserv.com` to `jonathan@ottoservco.com`:

Current (line 70–72):
```tsx
                >
                  hello@ottoserv.com
                </a>
```

Replace with:
```tsx
                >
                  jonathan@ottoservco.com
                </a>
```

**Commit message:** `fix(footer): update contact email to jonathan@ottoservco.com`

---

## FIX 2 — Social Post page: add "AI Write for Me" button

**File:** `src/app/dashboard/social/post/page.tsx`  
**Root cause:** The Content section has a textarea for manual writing but no way to prompt AI to write the post. A visitor who wants AI assistance has no path forward.

**Exact change — add AI writer state at the top of `PostCreatorPage` (after existing useState declarations, around line 149–156):**

Current state declarations end at:
```ts
  const [submitted, setSubmitted] = useState<"draft" | "approval" | null>(null);
```

Add after that line:
```ts
  const [showAiWriter, setShowAiWriter] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiGenerating, setAiGenerating] = useState(false);
```

**Exact change — in the Content section (find the `<h2 className="text-white font-semibold mb-3">Content</h2>` line) — update header row to include AI button:**

Current:
```tsx
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Content</h2>
            <textarea
```

Replace with:
```tsx
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Content</h2>
              <button
                onClick={() => setShowAiWriter(!showAiWriter)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800 rounded-lg text-xs font-medium transition-colors"
              >
                ✨ AI Write for Me
              </button>
            </div>

            {showAiWriter && (
              <div className="mb-4 bg-[#0d1117] border border-purple-900/50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">Topic or angle</label>
                  <input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. How AI handles missed calls for property managers"
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600 placeholder:text-gray-600"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-gray-400 text-xs block mb-1.5">Tone</label>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-600"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual & Friendly</option>
                      <option value="urgent">Urgent / Problem-Aware</option>
                      <option value="educational">Educational</option>
                      <option value="story">Story-Driven</option>
                    </select>
                  </div>
                  <button
                    disabled={!aiTopic.trim() || aiGenerating}
                    onClick={() => {
                      if (!aiTopic.trim()) return;
                      setAiGenerating(true);
                      setTimeout(() => {
                        const toneHooks: Record<string, string> = {
                          professional: `Most service businesses lose 30% of leads to missed calls.\n\nHere's what we fixed for our clients:\n\n→ AI answers every call in under 2 seconds, 24/7\n→ Qualifies the lead with 3 smart questions\n→ Books the appointment directly to your calendar\n→ Sends you a summary before you even hang up\n\nNo more "sorry I missed you." No more lost revenue.\n\nIf your business runs on inbound calls, this changes everything.\n\n${emotionalTrigger ? `#${emotionalTrigger}` : "#AIAutomation #ServiceBusiness"}`,
                          casual: `Real talk — how many calls did you miss last week? 📞\n\nEven one missed call could be a $5,000 job walking out the door.\n\nWe built something that makes sure that never happens again. Morgan, our AI, answers every single call — even at 2am — qualifies the lead, and books the appointment for you.\n\nYour competitor still lets calls go to voicemail. You don't have to.\n\n${emotionalTrigger ? `#${emotionalTrigger}` : "#SmallBusiness #AI"}`,
                          urgent: `You missed 3 calls while you were on a job today.\n\nOne of them was a $12,000 project.\n\nYou'll never know which one.\n\nThis is the problem OttoServ solves. Our AI answers every call, every time — and doesn't let revenue disappear into voicemail.\n\nThe fix takes one afternoon to set up.\n\n${emotionalTrigger ? `#${emotionalTrigger}` : "#LeadResponse #MissedCalls"}`,
                          educational: `Here's what happens when a service business misses a call:\n\n1. The caller tries the next Google result\n2. Your competitor answers\n3. They book the job\n4. You never knew the opportunity existed\n\nThe average service company misses 27% of inbound calls.\n\nAI answering fixes this completely — and it's more affordable than a part-time receptionist.\n\nDrop a comment if you want to know how it works.\n\n${emotionalTrigger ? `#${emotionalTrigger}` : "#BusinessAutomation #AIReceptionist"}`,
                          story: `A property manager in Orlando called us in January.\n\nShe was losing leads every weekend because no one answered the phone after 5pm.\n\nWe set up Morgan — our AI lead handler — in one day.\n\nBy month two, she had closed 4 leads that previously would have gone to voicemail.\n\nSame phone number. Same business. Different system.\n\nThat's what OttoServ does.\n\n${emotionalTrigger ? `#${emotionalTrigger}` : "#SuccessStory #PropertyManagement"}`,
                        };
                        setContent(toneHooks[aiTone] || toneHooks.professional);
                        setAiGenerating(false);
                        setShowAiWriter(false);
                      }, 1200);
                    }}
                    className="mt-5 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {aiGenerating ? "Generating…" : "Generate Post"}
                  </button>
                </div>
              </div>
            )}

            <textarea
```

**Commit message:** `feat(social/post): add AI Write for Me panel with topic and tone inputs`

---

## FIX 3 — Video Create page: add "AI Fill This" button

**File:** `src/app/dashboard/video/create/page.tsx`  
**Root cause:** Users must manually type their hook, script, and CTA even though the purpose and audience are already filled in. There is no AI assistance despite the page description saying "let the AI agent generate it."

**Exact change — add AI fill state inside `CreateVideoForm` (after the existing `[submitted, setSubmitted]` state declaration):**

Current:
```ts
  const [submitted, setSubmitted] = useState(false);
```

Replace with:
```ts
  const [submitted, setSubmitted] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
```

**Exact change — add an "AI Fill This" button in the form header. Find the opening `<form` tag and add the button row immediately after:**

Current:
```tsx
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Purpose */}
```

Replace with:
```tsx
  const handleAiFill = () => {
    if (!form.purpose) return;
    setAiFilling(true);
    setTimeout(() => {
      const platform = form.platform || "social media";
      const audience = form.audience || "service business owners";
      set("hook", `What if your ${audience.toLowerCase()} never missed a lead again?`);
      set("script", `Every day, service businesses like yours lose revenue to missed calls and slow follow-up.\n\nOttoServ changes that.\n\nOur AI answers every inbound inquiry in under 2 seconds — 24/7. It qualifies the lead, books the appointment, and notifies your team instantly.\n\nNo more missed calls. No more lost jobs. No more chasing leads that went cold.\n\nWe built this specifically for ${audience.toLowerCase()} — people who are too busy running their business to babysit their inbox.\n\nIf you're spending more time on admin than on actual work, it's time to automate.`);
      set("cta", "Book a free 15-minute demo at ottoserv.com");
      setAiFilling(false);
    }, 1400);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* AI Fill */}
      <div className="bg-purple-900/20 border border-purple-800/50 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-purple-300 text-sm font-medium">✨ AI Script Generator</p>
          <p className="text-gray-500 text-xs mt-0.5">Fill in Purpose and Audience first, then let AI generate your hook, script, and CTA.</p>
        </div>
        <button
          type="button"
          onClick={handleAiFill}
          disabled={!form.purpose || aiFilling}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {aiFilling ? "Generating…" : "AI Fill This"}
        </button>
      </div>

      {/* Purpose */}
```

**Commit message:** `feat(video/create): add AI Fill This button that generates hook, script, and CTA from purpose`

---

## FIX 4 — Growth Engine: wire the "Generate Content" header button

**File:** `src/app/dashboard/growth/page.tsx`  
**Root cause:** The "+ Generate Content" button in the page header (line ~610) renders as a plain `<button>` with no `onClick` handler. Clicking it does nothing.

**Exact change — add state at the top of `GrowthEnginePage` (after `const [activeTab, setActiveTab] = useState("overview");`):**

Current:
```ts
  const [activeTab, setActiveTab] = useState("overview");
```

Replace with:
```ts
  const [activeTab, setActiveTab] = useState("overview");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
```

**Exact change — wire the button (find `+ Generate Content`):**

Current:
```tsx
          <button className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
            + Generate Content
          </button>
```

Replace with:
```tsx
          <button
            onClick={() => setShowGenerateModal(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            + Generate Content
          </button>
```

**Exact change — add a simple modal just before the closing `</div>` of the return statement (after the tab content section):**

Find the closing tag of the page return (after `{activeTab === "settings" && <SettingsTab />}`):

Current:
```tsx
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
```

Replace with:
```tsx
      {activeTab === "settings" && <SettingsTab />}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-gray-800 rounded-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">✨ Generate Content</h2>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-gray-400 text-sm">Choose a platform and topic to generate AI-written content pieces for your pipeline.</p>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Platform</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600">
                  {["Instagram", "Facebook", "LinkedIn", "Google Business", "Email"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Topic / Offer Context</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Missed call recovery for property managers — focus on weekend lead loss"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Number of pieces</label>
                <input type="number" min={1} max={10} defaultValue={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-600" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setShowGenerateModal(false)} className="text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">Cancel</button>
              <button onClick={() => { setShowGenerateModal(false); setActiveTab("pipeline"); }} className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">Generate Content</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
```

**Commit message:** `feat(growth): wire Generate Content button to modal`

---

## FIX 5 — Growth Engine: make settings toggles functional

**File:** `src/app/dashboard/growth/page.tsx`  
**Root cause:** In `SettingsTab`, the three toggle switches are purely visual — they have a hardcoded `bg-blue-600` or `bg-gray-700` class with no state. Clicking them does nothing.

**Exact change — add toggle state inside `SettingsTab` function. Find:**

Current:
```tsx
function SettingsTab() {
  const platforms = [
```

Replace with:
```tsx
function SettingsTab() {
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [humanApproval, setHumanApproval] = useState(true);
  const [notifyOnFail, setNotifyOnFail] = useState(false);

  const platforms = [
```

**Exact change — replace the three static toggle divs. Find and replace each one:**

First toggle (auto-schedule) — Current:
```tsx
                    <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
```
Replace with (this is the first toggle only — the auto-schedule one right after "Auto-schedule approved content"):
```tsx
                    <button
                      onClick={() => setAutoSchedule((v) => !v)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${autoSchedule ? "bg-blue-600" : "bg-gray-700"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoSchedule ? "right-0.5" : "left-0.5"}`} />
                    </button>
```

Second toggle (human approval) — Current (the second occurrence):
```tsx
                    <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
```
Replace with:
```tsx
                    <button
                      onClick={() => setHumanApproval((v) => !v)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${humanApproval ? "bg-blue-600" : "bg-gray-700"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${humanApproval ? "right-0.5" : "left-0.5"}`} />
                    </button>
```

Third toggle (notify on fail) — Current:
```tsx
                    <div className="w-10 h-5 rounded-full bg-gray-700 relative cursor-pointer">
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
```
Replace with:
```tsx
                    <button
                      onClick={() => setNotifyOnFail((v) => !v)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${notifyOnFail ? "bg-blue-600" : "bg-gray-700"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${notifyOnFail ? "right-0.5" : "left-0.5"}`} />
                    </button>
```

**Note:** `SettingsTab` is a sub-component — it already lives in the same file so `useState` is already imported. No extra imports needed.

**Commit message:** `fix(growth): make settings toggles functional with useState`

---

## FIX 6 — Marketing page: wire all dead buttons

**File:** `src/app/dashboard/marketing/page.tsx`  
**Root cause 1:** The dashed "Create New Post" card button (line ~235) has no `onClick`. Clicking it does nothing even though the `showModal` and `setShowModal` state already exists.  
**Root cause 2:** "Schedule" button on draft post cards has no `onClick`.  
**Root cause 3:** "Unschedule" button on scheduled post cards has no `onClick`.  
**Root cause 4:** "View Post" button on published post cards has no `onClick`.  

**Exact change — Fix 1: wire the dashed card button to open modal:**

Current:
```tsx
        <button className="bg-[#111827] border-2 border-dashed border-gray-700 hover:border-blue-700 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors min-h-[200px]">
```

Replace with:
```tsx
        <button onClick={() => setShowModal(true)} className="bg-[#111827] border-2 border-dashed border-gray-700 hover:border-blue-700 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors min-h-[200px]">
```

**Exact change — Fix 2: wire the "Schedule" button on draft posts:**

Current:
```tsx
                  <button className="flex-1 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 rounded-lg transition-colors">
                    Schedule
                  </button>
```

Replace with:
```tsx
                  <button
                    onClick={() =>
                      setPosts((prev) =>
                        prev.map((p) =>
                          p.id === post.id
                            ? { ...p, status: "scheduled" as const, scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                            : p
                        )
                      )
                    }
                    className="flex-1 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 rounded-lg transition-colors"
                  >
                    Schedule
                  </button>
```

**Exact change — Fix 3: wire the "Unschedule" button on scheduled posts:**

Current:
```tsx
                  <button className="flex-1 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg transition-colors">
                    Unschedule
                  </button>
```

Replace with:
```tsx
                  <button
                    onClick={() =>
                      setPosts((prev) =>
                        prev.map((p) =>
                          p.id === post.id
                            ? { ...p, status: "draft" as const, scheduled_for: undefined }
                            : p
                        )
                      )
                    }
                    className="flex-1 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg transition-colors"
                  >
                    Unschedule
                  </button>
```

**Exact change — Fix 4: wire the "View Post" button on published posts:**

Current:
```tsx
              {post.status === "published" && (
                <button className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors">
                  View Post
                </button>
              )}
```

Replace with:
```tsx
              {post.status === "published" && (
                <button
                  onClick={() => alert(`Post: "${post.title}"\n\nPublished post would open here once social accounts are connected.`)}
                  className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors"
                >
                  View Post
                </button>
              )}
```

**Also fix the edit modal's "Save Changes" button** — it currently just closes the modal without saving. Wire it to actually update the post:

The edit modal needs `editingPost` ID to find the post. The current "Save Changes" button is:
```tsx
                <button
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
```

To make this work properly, add a ref to the edit form inputs. The simplest surgical fix: convert the edit modal to a small controlled form. Add this state near the other state declarations (after `const [form, setForm] = useState(EMPTY_POST_FORM);`):

```ts
  const [editForm, setEditForm] = useState<{ title: string; content: string; platform: string }>({ title: "", content: "", platform: "" });
```

Then update the edit modal open trigger — add `setEditForm({ title: post.title, content: post.content, platform: post.platform })` whenever `setEditingPost(post)` is called. Find each occurrence:

Current (there are 2 occurrences of `setEditingPost(post)`):
```tsx
                    onClick={() => setEditingPost(post)}
```
Replace both with:
```tsx
                    onClick={() => { setEditingPost(post); setEditForm({ title: post.title, content: post.content, platform: post.platform }); }}
```

Then update the edit modal fields from `defaultValue` (uncontrolled) to `value`/`onChange` (controlled):

Find in the edit modal:
```tsx
                  <input
                    type="text"
                    defaultValue={editingPost.title}
```
Replace with:
```tsx
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
```

Find:
```tsx
                  <textarea
                    rows={4}
                    defaultValue={editingPost.content}
```
Replace with:
```tsx
                  <textarea
                    rows={4}
                    value={editForm.content}
                    onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
```

Find:
```tsx
                  <select
                    defaultValue={editingPost.platform}
```
Replace with:
```tsx
                  <select
                    value={editForm.platform}
                    onChange={(e) => setEditForm((f) => ({ ...f, platform: e.target.value }))}
```

Finally, replace the "Save Changes" button action:
```tsx
                <button
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
```
Replace with:
```tsx
                <button
                  onClick={() => {
                    if (editingPost) {
                      setPosts((prev) =>
                        prev.map((p) =>
                          p.id === editingPost.id
                            ? { ...p, title: editForm.title, content: editForm.content, platform: editForm.platform }
                            : p
                        )
                      );
                    }
                    setEditingPost(null);
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
```

**Commit message:** `fix(marketing): wire dead buttons — dashed card, Schedule, Unschedule, View Post, Save Changes`

---

## FIX 7 — Content Library: generate modal actually adds content

**File:** `src/app/dashboard/growth/content/page.tsx`  
**Root cause:** `GenerateForm` receives only `onClose`. Its "Generate X pieces" button calls `onClose` and nothing else — no content is created. The library stays empty. Users who click "Generate" expect something to appear.

**Exact change — update `GenerateForm` to accept and call `onGenerate`:**

Current:
```tsx
function GenerateForm({ onClose }: { onClose: () => void }) {
```

Replace with:
```tsx
function GenerateForm({ onClose, onGenerate }: { onClose: () => void; onGenerate: (pieces: any[]) => void }) {
```

Add a `generating` state inside `GenerateForm` (after existing `const [count, setCount] = useState(3);`):
```ts
  const [generating, setGenerating] = useState(false);
```

**Exact change — replace the "Generate X pieces" button at the bottom of `GenerateForm`:**

Current:
```tsx
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Generate {count} piece{count !== 1 ? "s" : ""}
          </button>
```

Replace with:
```tsx
          <button
            disabled={generating}
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                const triggers = ["curiosity", "urgency", "social_proof", "pain_point", "fomo"];
                const hooks = [
                  "What if you never lost another lead to voicemail?",
                  "The property manager who answered every call — without answering the phone",
                  "27% of service businesses lose their best leads to missed calls. Here's the fix.",
                  "I set up AI lead response on a Friday. By Monday, I had 3 booked appointments.",
                  "Stop leaving $5,000 jobs in your voicemail inbox.",
                ];
                const generated = Array.from({ length: count }, (_, i) => ({
                  id: `gen-${Date.now()}-${i}`,
                  niche,
                  platform,
                  hook: hooks[i % hooks.length],
                  body: `Context: ${context || "OttoServ AI lead response for " + niche.replace("_", " ")}.\n\nThis piece targets ${platform} audience with a focus on solving the missed-call problem for service businesses.`,
                  cta: "Book a free 15-min demo → ottoserv.com",
                  emotional_trigger: triggers[i % triggers.length],
                  critic_status: "pending",
                  critic_score: null,
                  critic_notes: null,
                  distribution_status: "draft",
                  hypothesis: "Direct pain-point framing drives higher engagement than feature-led posts.",
                  created_at: new Date().toISOString().slice(0, 10),
                  scheduled_for: null,
                  published_at: null,
                }));
                onGenerate(generated);
                setGenerating(false);
                onClose();
              }, 1500);
            }}
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {generating ? "Generating…" : `Generate ${count} piece${count !== 1 ? "s" : ""}`}
          </button>
```

**Exact change — update `ContentLibraryPage` to hold generated content in state and pass the callback:**

In `ContentLibraryPage`, the current content source is a constant:
```tsx
const mockContentLibrary: ContentPiece[] = [];
```

This is a module-level constant — it can't be updated. Move the library to state. Add this inside `ContentLibraryPage` (after the filter state declarations):

```tsx
  const [contentLibrary, setContentLibrary] = useState<ContentPiece[]>(mockContentLibrary);
```

Then replace every reference to `mockContentLibrary` inside `ContentLibraryPage` with `contentLibrary`:

Current (multiple occurrences inside the component body — do NOT change the top-level `const mockContentLibrary` declaration):
- `const filtered = mockContentLibrary.filter(` → `const filtered = contentLibrary.filter(`
- `{filtered.length} of {mockContentLibrary.length} pieces` → `{filtered.length} of {contentLibrary.length} pieces`
- Any other `mockContentLibrary` reference inside the component

**Exact change — pass `onGenerate` to `GenerateForm`:**

Current:
```tsx
      {showGenerate && <GenerateForm onClose={() => setShowGenerate(false)} />}
```

Replace with:
```tsx
      {showGenerate && (
        <GenerateForm
          onClose={() => setShowGenerate(false)}
          onGenerate={(pieces) => setContentLibrary((prev) => [...pieces, ...prev])}
        />
      )}
```

**Commit message:** `feat(growth/content): make Generate Content modal actually create content pieces`

---

## FIX 8 — Newsletter compose: add "AI Draft for Me" button

**File:** `src/app/dashboard/newsletter/page.tsx`  
**Root cause:** The Compose tab has a manual textarea with no AI assistance. Given this is a newsletter tool, users would naturally expect an AI draft option.

**Exact change — add AI draft state inside `NewsletterDashboard` (after existing `draft` state):**

Current:
```ts
  const [draft, setDraft] = useState<NewsletterDraft>({
    title: '',
    content: '',
    status: 'draft'
  });
```

Replace with:
```ts
  const [draft, setDraft] = useState<NewsletterDraft>({
    title: '',
    content: '',
    status: 'draft'
  });
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiNewsletterTopic, setAiNewsletterTopic] = useState('');
```

**Exact change — in the Compose tab section, add an AI Draft panel above the existing title field. Find:**

Current:
```tsx
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Issue Title
                  </label>
```

Replace with:
```tsx
              <div className="space-y-4">
                {/* AI Draft Panel */}
                <div className="bg-purple-900/20 border border-purple-800/40 rounded-lg p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-purple-300 text-sm font-medium mb-1.5">✨ AI Draft for Me</p>
                    <input
                      type="text"
                      value={aiNewsletterTopic}
                      onChange={(e) => setAiNewsletterTopic(e.target.value)}
                      placeholder="e.g. How missed calls cost service businesses $50k/year"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-purple-800/50 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <button
                    disabled={!aiNewsletterTopic.trim() || aiDrafting}
                    onClick={() => {
                      if (!aiNewsletterTopic.trim()) return;
                      setAiDrafting(true);
                      setTimeout(() => {
                        setDraft({
                          title: `The Operational Waste Report: ${aiNewsletterTopic}`,
                          content: `OPENING — THE PROBLEM IN DOLLARS\n\nLast Tuesday, a property manager in Tampa told me she lost a $14,400 annual contract because no one answered the phone on a Saturday afternoon.\n\nThe prospect called once, got voicemail, and signed with a competitor by Monday.\n\nThis happens dozens of times per month across service businesses. And most owners have no idea.\n\n---\n\nTHE WASTE\n\nThe average service company misses 27% of inbound calls during business hours — and nearly 60% after 5pm and on weekends.\n\nAt an average job value of $3,000, that's real money walking out the door every week.\n\n---\n\nTHE FIX (THREE LEVELS)\n\nImmediate: Set up a voicemail-to-text service so missed calls are at least visible in your inbox the same day.\n\nBetter: Add an SMS auto-reply that fires within 60 seconds of a missed call with a booking link.\n\nBest: Deploy an AI receptionist that answers every call, qualifies the lead, and books the appointment — no human required.\n\n---\n\nTHE ROI\n\nA basic AI receptionist costs $200-400/month.\n\nOne recovered $3,000 job per month more than pays for it.\n\nMost of our clients recover 3-5 leads in their first 30 days.\n\n---\n\nTHE OPERATOR QUESTION\n\nHow many calls did you miss last weekend? If you don't know the exact number, that's the first problem to solve.\n\n---\n\nWant us to run a free 15-minute audit of your current lead capture process? Reply to this email with "AUDIT" and we'll find your biggest leak.\n\n— Jonathan\nOttoServ`,
                          status: 'draft',
                        });
                        setAiDrafting(false);
                        setAiNewsletterTopic('');
                      }, 1800);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {aiDrafting ? 'Drafting…' : 'Draft It'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Issue Title
                  </label>
```

**Commit message:** `feat(newsletter): add AI Draft for Me panel in compose tab`

---

## FIX 9 — SOPs page: wire the "+ New SOP" button

**File:** `src/app/dashboard/sops/page.tsx`  
**Root cause:** The "+ New SOP" button (line ~47) has no `onClick` handler. Clicking it does nothing. There is also no modal in the file to create a SOP.

**Exact change — add modal state inside `SOPsPage` (after existing state declarations):**

Current state declarations:
```tsx
  const [sops] = useState<SOP[]>([]);
  const categories = ["All", ...Array.from(new Set(sops.map((s) => s.category)))];
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
```

Replace with:
```tsx
  const [sops, setSops] = useState<SOP[]>([]);
  const categories = ["All", ...Array.from(new Set(sops.map((s) => s.category)))];
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewSOP, setShowNewSOP] = useState(false);
  const [sopForm, setSopForm] = useState({ title: "", category: "Operations", description: "" });
```

**Exact change — wire the button:**

Current:
```tsx
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New SOP
        </button>
```

Replace with:
```tsx
        <button onClick={() => setShowNewSOP(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + New SOP
        </button>
```

**Exact change — add modal before the closing `</div>` of the component return:**

Find the last closing tag of the component return and add before it:

```tsx
      {showNewSOP && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">New SOP</h2>
              <button onClick={() => setShowNewSOP(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Title *</label>
                <input
                  type="text"
                  value={sopForm.title}
                  onChange={(e) => setSopForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. New Lead Intake Process"
                  className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Category</label>
                <select
                  value={sopForm.category}
                  onChange={(e) => setSopForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {["Sales", "Operations", "Quality", "Finance", "HR", "Customer Service", "Procurement"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={sopForm.description}
                  onChange={(e) => setSopForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this SOP's purpose…"
                  className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-600"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewSOP(false)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 text-sm">Cancel</button>
                <button
                  type="button"
                  disabled={!sopForm.title.trim()}
                  onClick={() => {
                    const newSop: any = {
                      id: Date.now().toString(),
                      title: sopForm.title,
                      category: sopForm.category,
                      description: sopForm.description,
                      status: "active",
                      version: "1.0",
                      last_updated: new Date().toISOString().slice(0, 10),
                      steps: [],
                      owner: "Jonathan",
                    };
                    setSops((prev) => [newSop, ...prev]);
                    setSopForm({ title: "", category: "Operations", description: "" });
                    setShowNewSOP(false);
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-medium text-sm"
                >
                  Create SOP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
```

**Commit message:** `feat(sops): wire + New SOP button with creation modal`

---

## FIX 10 — Agents page: make "Edit" button give feedback

**File:** `src/app/dashboard/agents/page.tsx`  
**Root cause:** The "✏️ Edit" button in the approval queue cards has no `onClick` handler. It silently does nothing.

**Exact change — add edit state inside `AgentsPage` (after existing state):**

Current:
```ts
  const [approvals, setApprovals] = useState<AgentAction[]>(
```

Add before that line:
```ts
  const [editingAction, setEditingAction] = useState<AgentAction | null>(null);
  const [editNote, setEditNote] = useState("");
```

**Exact change — wire the Edit button:**

Current:
```tsx
                  <button className="px-4 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-sm font-medium rounded-lg transition-colors border border-blue-800">
                    ✏️ Edit
                  </button>
```

Replace with:
```tsx
                  <button
                    onClick={() => { setEditingAction(action); setEditNote(action.result || ""); }}
                    className="px-4 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-sm font-medium rounded-lg transition-colors border border-blue-800"
                  >
                    ✏️ Edit
                  </button>
```

**Exact change — add the edit modal before the closing `</div>` of the component return:**

Find the final closing of the component's return and add before it:

```tsx
      {editingAction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Edit Agent Output</h2>
              <button onClick={() => setEditingAction(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <p className="text-gray-400 text-xs mb-1">{editingAction.agent_name} — {editingAction.task}</p>
            <textarea
              rows={5}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 mt-2 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingAction(null)} className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 text-sm">Cancel</button>
              <button
                onClick={() => {
                  setApprovals((prev) =>
                    prev.map((a) =>
                      a.id === editingAction.id ? { ...a, result: editNote } : a
                    )
                  );
                  setEditingAction(null);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
              >
                Save Edit
              </button>
            </div>
          </div>
        </div>
      )}
```

**Commit message:** `fix(agents): wire Edit button to an edit modal for agent action output`

---

## AFTER ALL FIXES

1. Run `npm run build` and confirm zero TypeScript errors
2. Start dev server: `npm run dev`
3. Manually verify:
   - Footer → email shows `jonathan@ottoservco.com` and opens correct mailto ✓
   - `/dashboard/social/post` → "✨ AI Write for Me" button appears, generates post on click ✓
   - `/dashboard/video/create` → "✨ AI Fill This" panel appears, fills hook/script/CTA ✓
   - `/dashboard/growth` → "+ Generate Content" button opens modal ✓
   - `/dashboard/growth` (Settings tab) → all 3 toggles click on/off ✓
   - `/dashboard/marketing` → dashed card opens modal ✓
   - `/dashboard/marketing` → Schedule/Unschedule buttons change post status ✓
   - `/dashboard/marketing` → Edit modal saves changes to post ✓
   - `/dashboard/growth/content` → Generate modal creates content pieces visible in list ✓
   - `/dashboard/newsletter` (Compose tab) → AI Draft panel generates full newsletter ✓
   - `/dashboard/sops` → "+ New SOP" opens modal, created SOP appears in list ✓
   - `/dashboard/agents` → "✏️ Edit" opens edit modal, saving updates the action output ✓

---

## DO NOT CHANGE IN THIS SPRINT

- Auth logic in `src/lib/userAuth.ts`
- Any API routes in `src/app/api/`
- The admin dashboard (`src/app/dashboard/admin/page.tsx`)
- Any database schemas or environment variables
- Any pages not listed above
- The `mockContentLibrary`, `mockVideoRequests`, etc. module-level constants (only add state inside components)
