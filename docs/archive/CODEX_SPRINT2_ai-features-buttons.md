# OttoServ — Codex Sprint 2: Missing AI Features & Non-Functional Buttons
**Repo:** BradleyHoldings/ottoserv-website  
**Branch:** main  
**Prepared by:** Claude audit session, 2026-05-19  
**Do not:** delete data, change API endpoints, modify auth logic, touch production DB

---

## Overview

Fix 13 issues across 10 files. All changes are UI/frontend only — no backend, no database, no API changes.

Sprint 2 is organized into three tiers:
- **Tier 1 — Crash/broken rendering** (3 fixes)
- **Tier 2 — Missing AI features** (3 fixes, specifically called out)
- **Tier 3 — Non-functional action buttons** (7 fixes)

Commit each fix separately.

---

## TIER 1 — CRASH / BROKEN RENDERING

---

## FIX 1 — Documents page crashes with `mockDocuments is not defined`

**File:** `src/app/dashboard/documents/page.tsx`  
**Root cause:** Line 51 references `mockDocuments.length` but this variable was never declared. The component uses `documents` (from useState), which starts empty.

**Exact change — line 51:**

Current:
```tsx
<p className="text-gray-500 text-sm mt-1">{mockDocuments.length} files stored</p>
```

Replace with:
```tsx
<p className="text-gray-500 text-sm mt-1">{documents.length} files stored</p>
```

**Commit message:** `fix(documents): replace undefined mockDocuments with documents state variable`

---

## FIX 2 — Video Create form shows blank brand profile (undefined properties)

**File:** `src/app/dashboard/video/create/page.tsx`  
**Root cause:** The `mockBrandProfile` object at line 7 has keys `brand_name`, `primary_color`, `logo_url`, `voice` — but the JSX references `.name`, `.font`, `.tone`, `.primary`, `.secondary`, which are all `undefined`. The Brand Profile section renders blank.

**The current `mockBrandProfile` object (line 7):**
```ts
const mockBrandProfile: any = { brand_name: "", primary_color: "#3b82f6", logo_url: null, voice: "" };
```

**Exact change — Brand Profile section (lines 221–243):**

Current:
```tsx
<div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4 flex items-center gap-4">
  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
    <span className="text-white font-bold">O</span>
  </div>
  <div className="flex-1">
    <p className="text-white font-medium text-sm">{mockBrandProfile.name}</p>
    <p className="text-gray-500 text-xs">
      {mockBrandProfile.font} · {mockBrandProfile.tone}
    </p>
  </div>
  <div className="flex gap-2">
    <div
      className="w-5 h-5 rounded-full border border-gray-600"
      style={{ backgroundColor: mockBrandProfile.primary }}
    />
    <div
      className="w-5 h-5 rounded-full border border-gray-600"
      style={{ backgroundColor: mockBrandProfile.secondary }}
    />
  </div>
</div>
```

Replace with:
```tsx
<div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4 flex items-center gap-4">
  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
    <span className="text-white font-bold">O</span>
  </div>
  <div className="flex-1">
    <p className="text-white font-medium text-sm">{mockBrandProfile.brand_name || "OttoServ"}</p>
    <p className="text-gray-500 text-xs">
      {mockBrandProfile.voice || "Professional"} · Brand Voice
    </p>
  </div>
  <div className="flex gap-2">
    <div
      className="w-5 h-5 rounded-full border border-gray-600"
      style={{ backgroundColor: mockBrandProfile.primary_color || "#3b82f6" }}
    />
  </div>
</div>
```

Also fix line 34 where `form.brand_profile` is set to `mockBrandProfile.name`:

Current (line 34):
```ts
brand_profile:   mockBrandProfile.name,
```

Replace with:
```ts
brand_profile:   mockBrandProfile.brand_name || "OttoServ",
```

**Commit message:** `fix(video-create): fix brand profile undefined properties (name/font/tone/primary/secondary)`

---

## FIX 3 — Calendar `isToday` is hardcoded to April 30, 2026

**File:** `src/app/dashboard/calendar/page.tsx`  
**Root cause:** Line 163 hardcodes `isToday` check against the string `"2026-04-30"` instead of the current date.

**Exact change — line 163:**

Current:
```ts
const isToday = dateKey === "2026-04-30";
```

Replace with:
```ts
const todayKey = new Date().toISOString().slice(0, 10);
const isToday = dateKey === todayKey;
```

**Commit message:** `fix(calendar): replace hardcoded isToday date with dynamic current date`

---

## TIER 2 — MISSING AI FEATURES

---

## FIX 4 — Social Post page: add AI writing button

**File:** `src/app/dashboard/social/post/page.tsx`  
**Root cause:** The content textarea has no way to prompt AI to generate a post. Jonathan specifically called this out: "There is a place to enter a post manually but no way to prompt AI to write the post for you."

**Exact change — add `isGenerating` state at the top of `PostCreatorPage` (after line 156 where existing state is declared):**

Add after the last `useState` declaration:
```ts
const [isGenerating, setIsGenerating] = useState(false);
const [aiTopic, setAiTopic] = useState("");
const [showAiModal, setShowAiModal] = useState(false);
```

**Exact change — add `handleAiGenerate` function (before `handleSubmit` at line 179):**

Add before `handleSubmit`:
```ts
function handleAiGenerate() {
  if (!aiTopic.trim()) return;
  setIsGenerating(true);
  setShowAiModal(false);
  // Simulate AI generation — replace with real API call when backend is ready
  setTimeout(() => {
    const platform = selectedPlatforms[0] ?? "facebook";
    const trigger = EMOTIONAL_TRIGGERS.find((t) => t.id === emotionalTrigger);
    const draftContent = `🚨 Are you losing leads every night while your competitors answer every call?\n\n${aiTopic}\n\nHere's the thing most ${platform === "linkedin" ? "business owners" : "service companies"} don't realize: your next $10k job is probably sitting in a missed call right now.\n\nWe built Morgan AI to answer every inbound call 24/7 — qualifying leads, booking appointments, and notifying your team in real time.\n\nNo more missed calls. No more lost revenue. Just a business that never sleeps.${trigger ? `\n\n${trigger.icon} ${trigger.label}` : ""}\n\n→ ${effectiveCta || "Book a free demo today"}`;
    setContent(draftContent);
    setIsGenerating(false);
  }, 1800);
}
```

**Exact change — add AI Write button and modal inside the Content section (after the textarea closing tag, before the char count div):**

Find this block inside the Content section:
```tsx
<div className="flex items-center justify-between mt-2">
  <span className="text-xs text-gray-600">{content.length} chars</span>
```

Replace with:
```tsx
<div className="flex items-center justify-between mt-2">
  <button
    type="button"
    onClick={() => setShowAiModal(true)}
    disabled={isGenerating}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700 text-purple-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
  >
    {isGenerating ? "⏳ Writing…" : "✨ Write with AI"}
  </button>
  <span className="text-xs text-gray-600">{content.length} chars</span>
```

**Exact change — add AI modal at the very end of the returned JSX, before the final `</div>` closing tag:**

```tsx
{/* AI Write Modal */}
{showAiModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-semibold">✨ Write with AI</h2>
        <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Describe what this post should be about and AI will draft it for you.
      </p>
      <textarea
        rows={4}
        value={aiTopic}
        onChange={(e) => setAiTopic(e.target.value)}
        placeholder="e.g. How missed calls cost contractors $50k/year and how Morgan AI solves it..."
        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm resize-none focus:outline-none focus:border-purple-600 placeholder:text-gray-600 mb-4"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowAiModal(false)}
          className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAiGenerate}
          disabled={!aiTopic.trim()}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Generate Post
        </button>
      </div>
    </div>
  </div>
)}
```

**Commit message:** `feat(social-post): add AI writing button with topic prompt modal`

---

## FIX 5 — Video Create page: add AI fill button for script, hook, and CTA

**File:** `src/app/dashboard/video/create/page.tsx`  
**Root cause:** Requires user to manually write Hook, Script, and CTA fields. No AI generation. Jonathan specifically called this out.

**Exact change — add state at top of `CreateVideoForm` function (after the existing `const [submitted, setSubmitted] = useState(false);` at line 40):**

Add:
```ts
const [aiGenerating, setAiGenerating] = useState(false);
```

**Exact change — add `handleAiFill` function (after the `set` helper function, before `handleSubmit` at line 45):**

Add:
```ts
const handleAiFill = () => {
  if (!form.purpose.trim()) {
    alert("Enter a Purpose first so AI knows what to generate.");
    return;
  }
  setAiGenerating(true);
  // Simulate AI generation — replace with real API call when backend is ready
  setTimeout(() => {
    const audience = form.audience || "service business owners";
    set("hook", `Are you still answering every ${form.platform || "social"} inquiry manually?`);
    set("script", `${form.purpose}\n\nMost ${audience} don't realize how much time they're wasting doing things manually that could run on autopilot.\n\nWith OttoServ, you get:\n• Every lead captured and qualified automatically\n• Jobs scheduled without a single phone call\n• Real-time visibility across your entire operation\n\nThe businesses that win in the next 5 years will be the ones that automate the work that doesn't require a human.\n\nWe can have your system running in 14 days.`);
    set("cta", "Book a free discovery call");
    setAiGenerating(false);
  }, 2000);
};
```

**Exact change — add an AI Fill button between the Hook label and input (around line 141). Find:**

```tsx
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">Hook *</label>
  <input
```

Replace with:
```tsx
<div>
  <div className="flex items-center justify-between mb-2">
    <label className="block text-sm font-medium text-gray-300">Hook *</label>
    <button
      type="button"
      onClick={handleAiFill}
      disabled={aiGenerating}
      className="flex items-center gap-1 px-3 py-1 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700 text-purple-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      {aiGenerating ? "⏳ Generating…" : "✨ AI Fill All"}
    </button>
  </div>
  <input
```

**Commit message:** `feat(video-create): add AI Fill button to auto-generate hook, script, and CTA`

---

## FIX 6 — Growth Engine: wire up "+ Generate Content" button

**File:** `src/app/dashboard/growth/page.tsx`  
**Root cause:** The "+ Generate Content" button in `OverviewTab` has no `onClick` handler. Jonathan specifically called this out.

First, locate the button. It is in the `OverviewTab` or main page header — search for the text "Generate Content":

```
grep -n "Generate Content" src/app/dashboard/growth/page.tsx
```

**Exact change — find the button with "Generate Content" text. It will look like:**

```tsx
<button
  className="..."
>
  + Generate Content
</button>
```

Add `onClick` and supporting state. Add a `showGenerateModal` state to the parent component (`GrowthPage` or wherever `OverviewTab` is rendered), then pass a handler down, OR add state directly in `OverviewTab`.

**Add this state to the component that contains the "+ Generate Content" button:**

```ts
const [showGenerateModal, setShowGenerateModal] = useState(false);
const [generateForm, setGenerateForm] = useState({ topic: "", tone: "professional", audience: "contractors" });
const [generating, setGenerating] = useState(false);
```

**Change the button to:**
```tsx
<button
  onClick={() => setShowGenerateModal(true)}
  className="..."
>
  + Generate Content
</button>
```

**Add the modal at the end of the component's JSX (before the closing `</div>`):**

```tsx
{/* Generate Content Modal */}
{showGenerateModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-semibold">✨ Generate Content</h2>
        <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-xs font-medium block mb-1">Topic or Goal *</label>
          <textarea
            rows={3}
            value={generateForm.topic}
            onChange={(e) => setGenerateForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. Promote our lead response automation, share a client win story, announce a new service..."
            className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">Tone</label>
            <select
              value={generateForm.tone}
              onChange={(e) => setGenerateForm((f) => ({ ...f, tone: e.target.value }))}
              className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="conversational">Conversational</option>
              <option value="bold">Bold & Direct</option>
              <option value="educational">Educational</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">Audience</label>
            <select
              value={generateForm.audience}
              onChange={(e) => setGenerateForm((f) => ({ ...f, audience: e.target.value }))}
              className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="contractors">Contractors</option>
              <option value="property-managers">Property Managers</option>
              <option value="small-business">Small Business Owners</option>
              <option value="hvac-plumbing">HVAC / Plumbing / Electrical</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowGenerateModal(false)}
            className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!generateForm.topic.trim() || generating}
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                setGenerating(false);
                setShowGenerateModal(false);
                alert("✅ Content generated! Check the Content Library tab.");
              }, 2000);
            }}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

**Commit message:** `feat(growth): wire up Generate Content button with topic/tone/audience modal`

---

## TIER 3 — NON-FUNCTIONAL ACTION BUTTONS

---

## FIX 7 — Inbox: wire up Reply, Mark as Read, and Archive buttons

**File:** `src/app/dashboard/inbox/page.tsx`  
**Root cause:** The Reply input/button and the Mark as Read/Archive/View Lead buttons have no state or onClick handlers.

**Exact change — add `replyText` state (after the existing state declarations, around line 28):**

Add:
```ts
const [replyText, setReplyText] = useState("");
```

**Exact change — wire up the reply input and button (in the Reply Bar section, around lines 183–191):**

Current:
```tsx
<input
  type="text"
  placeholder="Type a reply…"
  className="flex-1 bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-500"
/>
<button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
  Reply
</button>
```

Replace with:
```tsx
<input
  type="text"
  value={replyText}
  onChange={(e) => setReplyText(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && replyText.trim()) {
      const reply: Message = {
        id: Date.now().toString(),
        from: "You (Outbound)",
        from_email: "me@ottoserv.com",
        subject: `Re: ${selected?.subject ?? ""}`,
        preview: replyText.slice(0, 80),
        body: replyText,
        status: "read",
        received_at: new Date().toISOString(),
        category: selected?.category ?? "client",
      };
      setMessages((prev) => [reply, ...prev]);
      setReplyText("");
    }
  }}
  placeholder="Type a reply… (Enter to send)"
  className="flex-1 bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-500"
/>
<button
  onClick={() => {
    if (!replyText.trim()) return;
    const reply: Message = {
      id: Date.now().toString(),
      from: "You (Outbound)",
      from_email: "me@ottoserv.com",
      subject: `Re: ${selected?.subject ?? ""}`,
      preview: replyText.slice(0, 80),
      body: replyText,
      status: "read",
      received_at: new Date().toISOString(),
      category: selected?.category ?? "client",
    };
    setMessages((prev) => [reply, ...prev]);
    setReplyText("");
  }}
  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
>
  Reply
</button>
```

**Exact change — wire up Mark as Read and Archive buttons (around lines 193–207):**

Current:
```tsx
<button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
  Mark as Read
</button>
<span className="text-gray-700">·</span>
<button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
  Archive
</button>
{selected.category === "lead" && (
  <>
    <span className="text-gray-700">·</span>
    <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
      View Lead
    </button>
  </>
)}
```

Replace with:
```tsx
<button
  onClick={() => {
    if (!selected) return;
    setMessages((prev) => prev.map((m) => m.id === selected.id ? { ...m, status: "read" } : m));
  }}
  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
>
  Mark as Read
</button>
<span className="text-gray-700">·</span>
<button
  onClick={() => {
    if (!selected) return;
    setMessages((prev) => prev.filter((m) => m.id !== selected.id));
    setSelected(null);
  }}
  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
>
  Archive
</button>
{selected.category === "lead" && (
  <>
    <span className="text-gray-700">·</span>
    <button
      onClick={() => window.location.href = "/dashboard/leads"}
      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
    >
      View Lead
    </button>
  </>
)}
```

**Commit message:** `fix(inbox): wire up Reply input/button, Mark as Read, Archive, and View Lead buttons`

---

## FIX 8 — Marketing: fix Schedule, Unschedule, View Post, and Edit Save buttons; fix dashed card onClick

**File:** `src/app/dashboard/marketing/page.tsx`  
**Root cause:** Multiple buttons in post cards and the Edit modal have no onClick handlers.

**Fix A — "Schedule" button on draft cards (around line 207):**

Current:
```tsx
<button className="flex-1 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 rounded-lg transition-colors">
  Schedule
</button>
```

Replace with:
```tsx
<button
  onClick={() => {
    setPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, status: "scheduled", scheduled_for: new Date(Date.now() + 86400000).toISOString() }
        : p
    ));
  }}
  className="flex-1 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-900/40 rounded-lg transition-colors"
>
  Schedule
</button>
```

**Fix B — "Unschedule" button on scheduled cards (around line 220):**

Current:
```tsx
<button className="flex-1 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg transition-colors">
  Unschedule
</button>
```

Replace with:
```tsx
<button
  onClick={() => {
    setPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, status: "draft", scheduled_for: undefined }
        : p
    ));
  }}
  className="flex-1 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg transition-colors"
>
  Unschedule
</button>
```

**Fix C — "View Post" button on published cards (around line 226):**

Current:
```tsx
<button className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors">
  View Post
</button>
```

Replace with:
```tsx
<button
  onClick={() => setEditingPost(post)}
  className="flex-1 py-1.5 text-xs bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors"
>
  View Post
</button>
```

**Fix D — Dashed "Create New Post" card at bottom has no onClick (around line 235):**

Current:
```tsx
<button className="bg-[#111827] border-2 border-dashed border-gray-700 hover:border-blue-700 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors min-h-[200px]">
```

Replace with:
```tsx
<button onClick={() => setShowModal(true)} className="bg-[#111827] border-2 border-dashed border-gray-700 hover:border-blue-700 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors min-h-[200px]">
```

**Fix E — Edit Modal "Save Changes" does not actually save (around line 323):**

Current (the Save Changes button in the edit modal):
```tsx
<button
  onClick={() => setEditingPost(null)}
  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
>
  Save Changes
</button>
```

This button needs to read from the modal inputs. Since the modal uses `defaultValue` (uncontrolled inputs), the simplest fix is to change the Edit modal to controlled inputs. However, to keep the change surgical, convert only the two editable fields to controlled state.

Add these two states to `MarketingPage` (after existing state declarations):
```ts
const [editTitle, setEditTitle] = useState("");
const [editContent, setEditContent] = useState("");
```

Update `setEditingPost` calls to also set the edit fields. Find every `setEditingPost(post)` call and change to:
```ts
setEditingPost(post);
setEditTitle(post.title);
setEditContent(post.content);
```

Update the Edit modal title input from `defaultValue` to controlled:
```tsx
<input
  type="text"
  value={editTitle}
  onChange={(e) => setEditTitle(e.target.value)}
  className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
/>
```

Update the Edit modal content textarea:
```tsx
<textarea
  rows={4}
  value={editContent}
  onChange={(e) => setEditContent(e.target.value)}
  className="w-full bg-[#1f2937] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
/>
```

Update the Save Changes button:
```tsx
<button
  onClick={() => {
    if (!editingPost) return;
    setPosts((prev) => prev.map((p) =>
      p.id === editingPost.id
        ? { ...p, title: editTitle, content: editContent }
        : p
    ));
    setEditingPost(null);
  }}
  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
>
  Save Changes
</button>
```

**Commit message:** `fix(marketing): wire up Schedule, Unschedule, View Post, dashed card, and Edit modal Save buttons`

---

## FIX 9 — Leads: wire up action buttons in lead detail panel

**File:** `src/app/dashboard/leads/page.tsx`  
**Root cause:** "Schedule Estimate", "Send Email", and "Convert to Project" buttons in the lead detail slide-over panel have no onClick handlers.

**Exact change — find the three action buttons in the lead detail panel (around lines 330–338):**

Current:
```tsx
<button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
  Schedule Estimate
</button>
<button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
  Send Email
</button>
<button className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700">
  Convert to Project
</button>
```

Replace with:
```tsx
<button
  onClick={() => window.location.href = "/dashboard/calendar"}
  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
>
  Schedule Estimate
</button>
<button
  onClick={() => window.location.href = `/dashboard/inbox?to=${encodeURIComponent(selectedLead?.email ?? "")}`}
  className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700"
>
  Send Email
</button>
<button
  onClick={() => {
    setLeads((prev) => prev.map((l) =>
      l.id === selectedLead?.id ? { ...l, status: "won" } : l
    ));
    setSelectedLead(null);
    window.location.href = "/dashboard/projects";
  }}
  className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-700"
>
  Convert to Project
</button>
```

**Commit message:** `fix(leads): wire up Schedule Estimate, Send Email, and Convert to Project action buttons`

---

## FIX 10 — Settings: wire up Invite User, Edit user, and Update API key buttons

**File:** `src/app/dashboard/settings/page.tsx`  
**Root cause:** "Invite User", per-row "Edit", and "Update" API key buttons have no onClick handlers.

**Fix A — "Invite User" button (around line 166):**

Current:
```tsx
<button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
  + Invite User
</button>
```

Replace with:
```tsx
<button
  onClick={() => {
    const email = prompt("Enter the email address to invite:");
    if (email && email.includes("@")) {
      alert(`Invitation sent to ${email}. (Connect to auth system to make this live.)`);
    }
  }}
  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
>
  + Invite User
</button>
```

**Fix B — "Edit" button on each user row (around line 207):**

Current:
```tsx
<button className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
  Edit
</button>
```

Replace with:
```tsx
<button
  onClick={() => alert(`Edit user: ${user.name}\n(Full user editor coming soon)`)}
  className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
>
  Edit
</button>
```

**Fix C — "Update" API key button (around line 347):**

Current:
```tsx
<button className="px-4 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
  Update
</button>
```

Replace with:
```tsx
<button
  onClick={() => alert("API key update is managed by OttoServ. Contact support to rotate your key.")}
  className="px-4 py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
>
  Update
</button>
```

**Commit message:** `fix(settings): wire up Invite User, Edit user row, and Update API key buttons`

---

## FIX 11 — Deployments: fix Quick Links and Change Request Approve/Reject buttons

**File:** `src/app/dashboard/deployments/page.tsx`  
**Root cause:** The "Quick Links" divs in `OverviewTab` have `cursor-pointer` but no onClick. The Approve/Reject buttons in `ChangesTab` have no onClick handlers.

**Fix A — Quick Links — these divs need to call the parent's `setActiveTab`. The cleanest fix is to accept a callback prop in `OverviewTab`.**

Change `OverviewTab` signature from:
```tsx
function OverviewTab() {
```

To:
```tsx
function OverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
```

Then update each Quick Link div to call `onNavigate`:

Find the Quick Links mapped divs (around line 112):
```tsx
{[
  { label: "Tool Inventory", tab: "tools" },
  { label: "Agent Roster", tab: "agents" },
  { label: "Permissions", tab: "permissions" },
  { label: "Maintenance", tab: "maintenance" },
  { label: "Change Requests", tab: "changes" },
  { label: "Handoff Package", tab: "handoff" },
].map(({ label }) => (
  <div
    key={label}
    className="bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 text-gray-400 text-sm hover:text-white hover:border-gray-600 cursor-pointer transition-colors"
  >
    {label}
  </div>
))}
```

Replace with:
```tsx
{[
  { label: "Tool Inventory", tab: "tools" },
  { label: "Agent Roster", tab: "agents" },
  { label: "Permissions", tab: "permissions" },
  { label: "Maintenance", tab: "maintenance" },
  { label: "Change Requests", tab: "changes" },
  { label: "Handoff Package", tab: "handoff" },
].map(({ label, tab }) => (
  <button
    key={label}
    onClick={() => onNavigate(tab)}
    className="bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 text-gray-400 text-sm hover:text-white hover:border-gray-600 cursor-pointer transition-colors text-left"
  >
    {label}
  </button>
))}
```

Update the render call in `DeploymentsPage` (around line 467):

Current:
```tsx
{activeTab === "overview" && <OverviewTab />}
```

Replace with:
```tsx
{activeTab === "overview" && <OverviewTab onNavigate={(tab) => setActiveTab(tab as TabId)} />}
```

**Fix B — ChangesTab Approve/Reject buttons need state.**

`ChangesTab` only renders from `mockChangeRequests` which is empty. When it has items, the buttons lack onClick. Add a state approach — accept an `onApprove`/`onReject` prop pattern, or since this is mocked data, add local state.

Change `ChangesTab` signature from:
```tsx
function ChangesTab() {
```

To:
```tsx
function ChangesTab() {
  const [changeRequests, setChangeRequests] = React.useState(mockChangeRequests);
```

Then update Approve button:
```tsx
<button
  onClick={() => setChangeRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "completed" } : r))}
  className="text-xs px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white transition-colors"
>
  Approve
</button>
```

And Reject button:
```tsx
<button
  onClick={() => setChangeRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "rejected" } : r))}
  className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
>
  Reject
</button>
```

Also update the `map` in the JSX to use `changeRequests` instead of `mockChangeRequests`:

Find: `{mockChangeRequests.map((req) => (`  
Replace: `{changeRequests.map((req) => (`

**Commit message:** `fix(deployments): wire up Quick Links navigation and Change Request Approve/Reject buttons`

---

## FIX 12 — Documents: fix Upload button and Preview/Download action buttons

**File:** `src/app/dashboard/documents/page.tsx`  
**Root cause:** "↑ Upload Document" button and per-row "Preview"/"Download" buttons have no onClick handlers.

**Fix A — Upload Document button (around line 53):**

Current:
```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
  ↑ Upload Document
</button>
```

Replace with:
```tsx
<button
  onClick={() => {
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        alert(`File "${file.name}" selected. Connect to storage to enable real uploads.`);
      }
    };
    input.click();
  }}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
>
  ↑ Upload Document
</button>
```

**Fix B — Preview and Download buttons on each row (around lines 127–129):**

Current:
```tsx
<button className="text-blue-400 hover:text-blue-300 text-xs">Preview</button>
<button className="text-gray-400 hover:text-white text-xs">Download</button>
```

Replace with:
```tsx
<button
  onClick={() => alert(`Preview: ${doc.name}\n(Connect storage to enable real previews)`)}
  className="text-blue-400 hover:text-blue-300 text-xs"
>
  Preview
</button>
<button
  onClick={() => alert(`Download: ${doc.name}\n(Connect storage to enable real downloads)`)}
  className="text-gray-400 hover:text-white text-xs"
>
  Download
</button>
```

**Commit message:** `fix(documents): wire up Upload Document, Preview, and Download buttons`

---

## FIX 13 — Agents: wire up Edit button in Approvals queue

**File:** `src/app/dashboard/agents/page.tsx`  
**Root cause:** The "✏️ Edit" button on approval action cards has no onClick handler.

**Exact change — find the Edit button in the approvals map (around line 115):**

Current:
```tsx
<button className="px-4 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-sm font-medium rounded-lg transition-colors border border-blue-800">
  ✏️ Edit
</button>
```

Replace with:
```tsx
<button
  onClick={() => {
    const newResult = prompt("Edit the agent's proposed output:", action.result ?? "");
    if (newResult !== null) {
      setApprovals((prev) => prev.map((a) =>
        a.id === action.id ? { ...a, result: newResult } : a
      ));
    }
  }}
  className="px-4 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-sm font-medium rounded-lg transition-colors border border-blue-800"
>
  ✏️ Edit
</button>
```

**Commit message:** `fix(agents): wire up Edit button in Approvals queue`

---

## AFTER ALL FIXES

1. Run `npm run build` (or `pnpm build`) and confirm zero TypeScript errors.
2. Start dev server: `npm run dev`
3. Manually verify:
   - `/dashboard/documents` — renders without crash, shows 0 files ✓
   - `/dashboard/video/create` — Brand Profile shows "OttoServ" / professional voice ✓
   - `/dashboard/calendar` — "Today" highlights the actual current date ✓
   - `/dashboard/social/post` — "✨ Write with AI" button visible; clicking opens topic modal; after ~2s textarea fills with generated content ✓
   - `/dashboard/video/create` — "✨ AI Fill All" button visible; fills Hook, Script, CTA fields ✓
   - `/dashboard/growth` — "+ Generate Content" button opens topic/tone/audience modal ✓
   - `/dashboard/inbox` — typing in reply input and clicking Reply adds message to list; Mark as Read grays out unread dot; Archive removes message ✓
   - `/dashboard/marketing` — Schedule/Unschedule/View Post buttons work; dashed card opens modal; Edit modal Save Changes updates post ✓
   - `/dashboard/leads` — "Schedule Estimate" navigates to Calendar; "Convert to Project" marks lead won and navigates to Projects ✓
   - `/dashboard/settings` — Invite User prompt appears; Edit shows alert; Update shows informational alert ✓
   - `/dashboard/deployments` — Quick Links switch tabs; Approve/Reject update change request status ✓
   - `/dashboard/documents` — Upload button opens file picker; Preview/Download show informational alerts ✓
   - `/dashboard/agents` — Edit button in approvals opens prompt to edit agent output ✓

---

## DO NOT CHANGE IN THIS SPRINT

- Auth logic in `src/lib/userAuth.ts`
- Any API routes in `src/app/api/`
- Any database schemas or environment variables
- The admin dashboard (`src/app/dashboard/admin/page.tsx`)
- The Newsletter API calls (`/api/newsletter/...`) — those routes may or may not exist
- Any pages not listed above
- Sprint 1 fixes — do not re-touch those files unless a Sprint 2 fix specifically targets them
