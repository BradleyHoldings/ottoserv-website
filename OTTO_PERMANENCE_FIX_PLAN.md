# OttoServ Permanence Fix Plan
Date: 2026-05-03

---

## Priority 1: Critical (system won't work without these)

### 1.1 Restart the Build Runner Service
The build runner (port 19001) has been dead since April 25. Every Build Request Intake submission fails silently.

**Fix:**
```bash
systemctl start build-runner
systemctl enable build-runner
```
Then verify: `ss -tlnp | grep 19001` should show a listener.
Then test by submitting a build request via the TechOps dashboard.

**Risk if not fixed:** The entire AI workflow generation pipeline (Build Request → Build Approval → Workflow Manager → Build Runner) is broken. Jarvis cannot autonomously build new n8n workflows.

---

### 1.2 Register voice_routes.py in enterprise platform main.py
The voice_routes.py file exists but is never imported. Also, it uses `from flask import Blueprint` — a wrong framework import. The platform is FastAPI.

**Fix (two steps):**

Step 1: Rewrite voice_routes.py to use FastAPI, not Flask:
```python
# Change: from flask import Blueprint, request, jsonify
# To:
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/voice-command")
async def process_voice_command(request: Request):
    ...

@router.get("/voice-status")  
async def voice_status():
    ...
```

Step 2: Add to `/home/clawuser/enterprise-platform/main.py`:
```python
from routes import voice_routes
# ...
app.include_router(voice_routes.router, prefix="/voice", tags=["voice"])
```

Step 3: Update Cloudflare config to route voice.ottoserv.com → port 19004 (not 19002):
```yaml
# In /etc/cloudflared/config-local.yml, change:
  - hostname: voice.ottoserv.com
    service: http://localhost:19004  # was 19002
```
Then: `systemctl restart cloudflared`

---

### 1.3 Add Anthropic API key to enterprise-platform .env
The platform has OGIS (content AI), SIA (social intent), intelligence, and social routes — all require Claude. Without the key, every AI call fails.

**Fix:**
Add to `/home/clawuser/enterprise-platform/.env`:
```
ANTHROPIC_API_KEY=<key from /home/clawuser/.env>
```
Then restart: `systemctl restart enterprise-platform`

---

### 1.4 Create Social_Drafts table in Airtable
WF16 Social Content Drafting writes to a table called "Social_Drafts" (or "Social Drafts") that does not exist.

**Fix:** In Airtable base appGOgiaH0M1g9A4y, create table "Social_Drafts" with at minimum these fields:
- platform (Single line text)
- content (Long text)
- status (Single select: draft, approved, rejected, published)
- draft_variants (Long text or JSON)
- created_at (Date)
- approved_by (Single line text)

---

### 1.5 Fix JarvisChat to connect to real backend
The "Ask Jarvis" chat in the dashboard is completely fake (hardcoded responses + setTimeout). This is a critical credibility risk if shown to clients or prospects.

**Fix options (choose one):**

Option A (fast, 1 hour): POST to OpenClaw bridge via a server-side API route:
```typescript
// Create /app/api/jarvis/route.ts
// POST to http://172.17.0.1:18790/agent-message
// Return the response
```
Then update JarvisChat.tsx to fetch `/api/jarvis` instead of using the fake setTimeout.

Option B (proper, 4 hours): POST to platform /tasks endpoint which queues a Jarvis task, then poll for result.

Either option removes the embarrassing fake chat.

---

## Priority 2: Important (significantly limits revenue)

### 2.1 Add OpenAI API key for GPT routing
The Master Router has a "openai" route and openclaw.json lists "openai/gpt-5.4" and "openai/gpt-4.1" models, but no OpenAI API key exists.

**Fix:** Add to `/home/clawuser/.env`:
```
OPENAI_API_KEY=<key>
```
Then verify OpenClaw picks it up (it reads from EnvironmentFile=/home/clawuser/.env per openclaw.service unit file).

---

### 2.2 Fix Google Docs webhook in WF9 (SOP Delivery)
Node "Store to Google Docs / Drive" defaults to https://example.com/create-google-doc.

**Fix options:**
- Option A: Create a Zapier/Make webhook that accepts the SOP content and creates a Google Doc
- Option B: Use the Google Docs n8n credential (already configured) and replace the HTTP node with a native Google Docs node
- Option C: Set GOOGLE_DOCS_CREATE_WEBHOOK env var in docker-compose.yml

---

### 2.3 Add Supabase service key for multi-tenancy
Without Supabase, the platform uses SQLite. Multi-client isolation is not fully enforced.

**Fix:** Add to `/home/clawuser/enterprise-platform/.env`:
```
SUPABASE_SERVICE_KEY=<key from Supabase dashboard>
SUPABASE_ANON_KEY=<key from Supabase dashboard>
```
Then restart: `systemctl restart enterprise-platform`
Verify: Platform logs should show "Database backend: supabase" instead of "sqlite"

---

### 2.4 Add ElevenLabs/Twilio credentials for voice
Outbound calling is extensively designed but completely blocked by missing credentials.

**Fix:**
1. Add to `/home/clawuser/enterprise-platform/.env`:
   ```
   ELEVENLABS_API_KEY=<key>
   TWILIO_ACCOUNT_SID=<sid>
   TWILIO_AUTH_TOKEN=<token>
   ```
2. Follow ELEVENLABS_SETUP_SUMMARY.md to connect +14079045560 to ElevenLabs agent
3. Test: `python3 /home/clawuser/.openclaw/workspace/setup_elevenlabs_outbound.py`

---

### 2.5 Wire DealFlow to active Jarvis monitoring
DealFlow scripts are ready (DEALFLOW_READY_FOR_PRODUCTION.md) but nothing is running them.

**Fix:**
1. Verify dealflow_telegram_commands.py is being loaded by Jarvis at startup
2. If not: add `import dealflow_telegram_commands` to a Jarvis startup script or create a cron job in OpenClaw
3. Test: send "/deal help" via Telegram to see if it responds

---

### 2.6 Create demo walkthrough system (see section below)
The demo is a static marketing page. For prospect demos it needs Jarvis narration and UI highlighting.

---

## Priority 3: Quality (improves reliability)

### 3.1 Consolidate Telegram bots
Two bots (n8n: 8666971243, OpenClaw: 8727146917) both send to the founder. This can create confusion and duplicate messages.

**Fix:** Migrate n8n workflows to use the OpenClaw bot token OR create a unified notification format so messages are clearly labeled by source.

---

### 3.2 Add auth check to OttoServ Task Status webhook
WF6 (Task Status) has no auth check. Anyone who knows the webhook URL can query task statuses.

**Fix:** Add an IF node checking x-task-key header before returning task data, same pattern as Master Router.

---

### 3.3 Fix DRAFT workflows
Four workflows have "DRAFT" in their name but are active (Memory Write-Back, Memory Query, Nightly Memory Consolidation, Social Content Drafting). Either:
- Complete and remove DRAFT from name
- Or disable them if not ready

Memory Consolidation particularly lacks an AI synthesis step — it just forwards raw data to Telegram.

---

### 3.4 Set MOONSHOT_API_KEY to a proper env var
MOONSHOT_API_KEY is currently hardcoded in docker-compose.yml. This is a credential in a plain text file that likely lives in a git repo.

**Fix:** Move to a .env file not tracked by git:
```bash
# Create /root/n8n/.env file
MOONSHOT_API_KEY=<value>
# Reference in docker-compose.yml
env_file: .env
```

---

### 3.5 Document and label Gmail accounts
Two Gmail OAuth2 credentials in n8n ("Gmail account" and "Gmail account 2") with no documentation of which is which. 

**Fix:** Add notes in n8n credentials OR create a workspace doc listing: credential name → actual email address → which workflows use it.

---

## What Needs Git Commits

These items exist on disk but have no version control:

1. `/home/clawuser/enterprise-platform/` — entire enterprise platform codebase. Check: `git status` in this directory to see what's committed.
2. `/home/clawuser/a2a-gateway/` — A2A Gateway service
3. `/home/clawuser/contractor-os/` — Contractor OS service
4. `/home/clawuser/runner/` — Build runner; build_runner.py is the only file
5. `/home/clawuser/.openclaw/workspace/` — The Jarvis workspace (strategies, SOPs, agent scripts) — these are critical operational documents that will be lost if the droplet is destroyed
6. All systemd .service files in `/etc/systemd/system/` — not tracked anywhere
7. `/etc/cloudflared/config-local.yml` — critical routing config

**Immediate action:** Verify git repos exist for each service directory. If not:
```bash
cd /home/clawuser/enterprise-platform && git status
cd /home/clawuser/a2a-gateway && git status
# etc.
```

---

## What Needs Systemd/Docker Restart Handling

| Service | Restart on Boot? | Action Needed |
|---|---|---|
| enterprise-platform | Verify with `systemctl is-enabled enterprise-platform` | Should be `enabled` |
| cloudflared | Verify enabled | Should be `enabled` |
| a2a-gateway | Verify enabled | Should be `enabled` |
| contractor-os | Verify enabled | Should be `enabled` |
| openclaw | Verify enabled | Should be `enabled` |
| openclaw-bridge | Verify enabled | Should be `enabled` |
| build-runner | **Currently DEAD** | Must start AND enable: `systemctl start build-runner && systemctl enable build-runner` |
| n8n Docker | ✅ restart=always in docker-compose | No action needed |

Run verification: `systemctl list-unit-files | grep -E "enterprise|cloudflared|a2a|contractor|openclaw|build-runner"`

---

## What Needs Environment Variables

### /home/clawuser/enterprise-platform/.env
```
ANTHROPIC_API_KEY=<copy from /home/clawuser/.env>
SUPABASE_SERVICE_KEY=<from Supabase dashboard>
SUPABASE_ANON_KEY=<from Supabase dashboard>
COMPOSIO_API_KEY=<from Composio dashboard>
ELEVENLABS_API_KEY=<from ElevenLabs dashboard>
TWILIO_ACCOUNT_SID=<from Twilio dashboard>
TWILIO_AUTH_TOKEN=<from Twilio dashboard>
```

### /home/clawuser/.env (OpenClaw/Jarvis env)
```
OPENAI_API_KEY=<if GPT routing is needed>
ELEVENLABS_API_KEY=<for outbound calling>
```

### /root/n8n/docker-compose.yml
```
GOOGLE_DOCS_CREATE_WEBHOOK=<actual webhook URL>
CLAUDE_API_URL=https://api.anthropic.com/v1/messages  (confirm this is set)
CLAUDE_API_KEY=<Anthropic key>
```
Move MOONSHOT_API_KEY to .env file (security fix).

---

## What Needs Approval Gates

These systems currently lack required human approval before taking real-world action:

1. **Cold Outreach (WF10)** — creates Gmail drafts (good); consider whether to keep this manual or add a Telegram approve button before sending
2. **Build Request execution** — currently n8n Build Intake → Airtable → Build Runner → Claude writes code; no human approval between "create Airtable record" and "Claude executes code" — Build Approval Handler (WF13) exists but is a separate webhook that must be explicitly called
3. **Social media posting** — social_publisher.py requires post.status == 'approved' (good); confirm approval workflow routes to founder notification before publishing
4. **DealFlow deal approval** — /deal approve command is documented; enforce that Jonathan must explicitly type this before any commitment is made
5. **TechOps opportunity bidding** — agent governance forbids bid_submission and contract_signing; confirm no auto-accept path exists

---

## What Should Be Removed/Archived

1. **SBX - Cold Outreach Sender (WF18)** — disabled, redundant with WF10; archive by exporting JSON then delete from n8n
2. **voice_routes.py with Flask imports** — rewrite (Priority 1.2) or remove if not needed
3. **Duplicate workspace .md files** — DEALFLOW_DELIVERABLES_MVP.md, DEALFLOW_DEPLOYMENT.md, DEALFLOW_FINAL_INTEGRATION.md, DEALFLOW_READY_FOR_PRODUCTION.md = 4 files about the same thing; consolidate to one
4. **openclaw.json backup files** (.bak, .bak.1-.4) — 5 backup files in credentials dir; move to archive or delete oldest
5. **test_twilio_with_jonathan.py, test_sentinel_browser_integration.py** — test scripts that should not live in production workspace
6. **run_regression.py, run_sentinel.py** — standalone test runners without a deployment context

---

## What Should Be Consolidated

1. **Three agent inventories** (seed_agents.py DB, openclaw.json, agents/page.tsx hardcoded) — the website should query `/agents` endpoint from the platform; remove hardcoded list
2. **Two memory systems** (Airtable structured + workspace markdown) — both have value but Jarvis should write to both consistently; current n8n memory workflows are the bridge but rarely invoked
3. **Sentinel scripts (18 files)** — consolidate to one sentinel_core.py with clear entry points; current sprawl makes it impossible to know what state anything is in
4. **DealFlow scripts (15+ files)** — same issue; one master script with sub-modules would be maintainable
5. **Three FastAPI services (platform 19004, a2a 19002, contractor 19003)** — evaluate whether a2a-gateway and contractor-os add unique value vs. being routes on the main platform; unnecessary operational complexity

---

## Safest Next 5 Fixes

These are ordered by impact vs. risk. Each can be done without breaking anything that currently works.

### Fix 1: Restart the Build Runner (5 minutes, zero risk)
```bash
systemctl start build-runner
systemctl enable build-runner
# Verify:
ss -tlnp | grep 19001
```
Immediate impact: Build Request Intake works again; Jarvis can build new workflows.

---

### Fix 2: Create Social_Drafts table in Airtable (5 minutes, zero risk)
In Airtable base appGOgiaH0M1g9A4y:
- Add table "Social_Drafts" with fields: platform (text), content (long text), status (single select: draft/approved/rejected), created_at (date)
- No code changes needed; WF16 will automatically start working

Immediate impact: Social content drafting pipeline unblocks.

---

### Fix 3: Copy Anthropic key to enterprise-platform .env (5 minutes, low risk)
```bash
# Read the key from /home/clawuser/.env then add to enterprise-platform/.env
# Then:
systemctl restart enterprise-platform
# Verify:
curl http://localhost:19004/health
```
Immediate impact: OGIS, SIA, intelligence, and social AI routes all become functional.

---

### Fix 4: Fix JarvisChat to call real backend (1-4 hours, medium complexity)

Create `/home/clawuser/ottoserv-website/src/app/api/jarvis/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  
  // Call OpenClaw bridge (need to proxy since frontend can't reach 172.17.0.1 directly)
  // Instead: proxy through platform API or n8n agent-task webhook
  const res = await fetch('https://n8n.ottoserv.com/webhook/agent-task', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': process.env.OTTO_AGENT_API_KEY || ''
    },
    body: JSON.stringify({ task: message, source: 'jarvis_chat', route: 'jarvis_worker' })
  });
  const data = await res.json();
  return NextResponse.json({ response: data.response || data.message || 'Processing...' });
}
```

Then update `JarvisChat.tsx` `sendMessage` function to call `/api/jarvis` instead of the fake setTimeout.

Immediate impact: The most visible fake in the platform disappears; chat becomes real.

---

### Fix 5: Add Google Docs webhook to n8n environment (10 minutes)

Create a Make.com or Zapier webhook that:
1. Accepts: `{ title, content, category }`
2. Creates a Google Doc in a "SOPs" folder
3. Returns the doc URL

Then in `/root/n8n/docker-compose.yml`, add:
```yaml
- GOOGLE_DOCS_CREATE_WEBHOOK=https://hook.us1.make.com/xxxxx
```
Then: `docker-compose -f /root/n8n/docker-compose.yml up -d`

Immediate impact: WF9 Process Mapping & SOP Delivery now saves SOPs to Google Drive, completing the SOP automation loop.

---

## Jarvis Demo Walkthrough Permanence Plan

This section defines what must be built for a production-quality Jarvis-led demo that can be shown to prospects.

### Required Frontend Controls

A `DemoController` component must be built at the top level of the demo, providing:
- **Start Demo** button — begins guided walkthrough from step 1
- **Pause/Resume** button — halts auto-progression
- **Next/Back** step buttons — manual navigation
- **Skip to Section** dropdown — jump to specific demo chapters
- **Exit Demo** button — returns to landing page and clears session
- Step counter display: "Step 3 of 12 — Lead Qualification"

---

### Required Backend Session Model

A demo session must be tracked server-side (not just localStorage):

```python
# POST /demo/sessions — create session
# GET  /demo/sessions/{id} — get current state  
# PUT  /demo/sessions/{id}/step — advance to step N
# DELETE /demo/sessions/{id} — end session
```

Session object must include:
- `session_id`, `started_at`, `current_step`, `client_name` (for personalization), `completed_at`
- Step history for rollback/replay

---

### Required UI Highlight System

A `DemoHighlight` wrapper component must:
- Accept a `targetId` prop that identifies which DOM element to spotlight
- Render an animated ring/pulse around the target element
- Darken the rest of the page (backdrop-filter or overlay)
- Include a tooltip/label explaining what is being highlighted

Each demo step JSON should specify: `{ step: 3, highlight: "leads-table", text: "Jarvis found 47 new leads this week from your target markets" }`

---

### Required Jarvis Command Protocol

Jarvis must be able to control the demo UI via a command channel:

**Option A (recommended):** Websocket connection from frontend to platform:
```
frontend → connect to wss://platform.ottoserv.com/demo/ws/{session_id}
Jarvis → POST /demo/sessions/{id}/command { action: "highlight", target: "leads-table" }
platform → forwards via websocket to frontend
frontend → activates DemoHighlight on "leads-table"
```

**Option B (simpler):** Long-polling: frontend polls `/demo/sessions/{id}` every 2s, checks for current_step changes; Jarvis advances step via API.

---

### Required Fallback Text Mode

If voice fails (ElevenLabs unavailable, user muted microphone):
- Each step has a text transcript that displays in a side panel
- Jarvis responses appear as text chat bubbles alongside the UI highlight
- Demo can be completed without any voice — useful for noisy environments or recordings

---

### Required Safety Boundaries

- Demo session must auto-expire after 60 minutes
- Demo users must have read-only data access (no writes to production Airtable, no real emails sent)
- All demo webhooks must check for demo mode and route to demo Airtable base or stub responses
- A "DEMO MODE ACTIVE" persistent banner must remain visible at all times
- If platform token from demo session is used against production endpoints, return 403

---

### Required Production Deployment Checks

Before showing demo to any prospect:

- [ ] JarvisChat connects to real Jarvis (Priority Fix 4 above)
- [ ] Demo dashboard data is more impressive (consider using anonymized real data)
- [ ] ElevenLabs voice works in a browser tab (test same-tab embedding vs new tab)
- [ ] Walkthrough script is written and reviewed by founder (12-15 steps)
- [ ] DemoHighlight component highlights all key elements in script
- [ ] Fallback text mode tested
- [ ] Session auto-expiry verified
- [ ] Demo mode isolation tested (no demo user can affect production data)
- [ ] Demo completion CTA leads to a real booking link (Calendly or similar)
- [ ] Load test: can 3 concurrent demo sessions run without degrading Jarvis response time

---
