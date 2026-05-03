# OttoServ Implementation Audit
Date: 2026-05-03

---

## Executive Summary

The OttoServ/Jarvis AI platform has a working core infrastructure: n8n (21 active workflows), the Enterprise Platform FastAPI at port 19004, three additional FastAPI services (A2A Gateway at 19002, Contractor OS at 19003), and the OpenClaw/Jarvis agent running on the system. The Cloudflare tunnel is live and routing correctly. However, the build runner (port 19001) is dead — meaning the n8n Build Request Intake workflow silently fails every time it fires. The Supabase, Stripe, Composio, ElevenLabs/Twilio, and VAPI credentials are all absent from the enterprise platform .env, making those subsystems non-functional despite having complete backend code. The website dashboard is almost entirely hardcoded mock data — agents, approvals, and growth pages show no live backend integration. The demo walkthrough is a static landing page with no guided steps, no Jarvis voice coordination, and no UI highlighting.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Production and working |
| 🔌 | Implemented but not connected |
| 🔴 | Implemented but broken |
| 🧪 | Temporary/sandbox/test only |
| 🎭 | Mocked frontend only |
| 📋 | Prompt/spec only |
| ❌ | Missing/not implemented |
| ⚠️ | Duplicate or conflicting |
| 🔐 | Security risk |
| ❓ | Unknown/needs credential check |

---

## A. Core Infrastructure

| Component | Status | Evidence | What Works | What's Broken | Risk | Fix |
|---|---|---|---|---|---|---|
| n8n Docker container | ✅ | Port 5678 listening; `docker ps` shows Up 8 days; restart=always | Full workflow execution, API accessible | None detected | Low | None needed |
| Enterprise Platform (19004) | ✅ | `systemctl` shows active; uvicorn on 19004 | Auth, agents, techops, hermes, social, OGIS routes all registered | Supabase not connected (no service key); voice_routes.py NOT included in main.py | Medium | Add SUPABASE_SERVICE_KEY; add voice router |
| A2A Gateway (19002) | ✅ | Running as a2a-gateway.service; port 19002 live; /health returns ok | Service reachable | Auth required for /services — untested beyond health | Low | None for now |
| Contractor OS (19003) | ✅ | Running as contractor-os.service; port 19003 live; /health returns ok | Service reachable | Auth required — full functionality untested | Low | None for now |
| OpenClaw Gateway (18789 loopback) | ✅ | openclaw.service active; process visible; gateway running on loopback only | Jarvis agent is alive and taking Telegram input | Loopback only — not publicly routable (by design) | Low | By design |
| OpenClaw Bridge (18790 Docker bridge) | ✅ | openclaw-bridge.service active; python3 process on 172.17.0.1:18790; /health returns ok | n8n can POST /agent-worker and /agent-message to reach Jarvis | None detected | Low | None needed |
| Build Runner (19001) | 🔴 | Port 19001 NOT listening; build-runner.service inactive (dead since Apr 25); last ran 5 min before being killed | Nothing | Service is dead; n8n Build Request Intake calls $env.RUNNER_URL which is http://host.docker.internal:19001 — every build request fails silently | High | `systemctl start build-runner && systemctl enable build-runner` |
| Cloudflare Tunnel | ✅ | cloudflared.service active; config-local.yml present; all endpoints respond | platform, n8n, api, gateway, voice all reachable | voice.ottoserv.com and gateway.ottoserv.com BOTH route to port 19002 (A2A Gateway) — voice endpoint has no /voice-command route there | Medium | Route voice.ottoserv.com to platform:19004 where voice_routes.py lives (once registered) |
| Database (SQLite) | ✅ | enterprise.db present; platform uses it | Auth, agents, techops, approvals all persistent | Supabase would replace it but key is absent — currently SQLite-only | Medium | Add SUPABASE_SERVICE_KEY to switch |
| Supabase | 🔌 | URL configured (djakaudqtrmympthjscf.supabase.co); SUPABASE_SERVICE_KEY is empty in .env | Nothing | No service key = use_supabase returns False = SQLite fallback | Medium | Add SUPABASE_SERVICE_KEY |

---

## B. n8n Workflows

| # | ID | Name | Status | Trigger | What it does | Auth Method | Issues |
|---|---|---|---|---|---|---|---|
| 1 | 0BOBXG6meiT4GiiO | OttoServ External Agent API | ✅ ACTIVE | Webhook: /agent-task | Receives external API tasks; looks up API Clients in Airtable; creates Tasks record; calls http://172.17.0.1:18790/agent-worker (Jarvis bridge) | x-api-key checked | Calls port 18790 which is live |
| 2 | 0tHHknuPK5wc5DZO | OttoServ Agent Callback | ✅ ACTIVE | Webhook: /agent-callback | Receives agent results; looks up Airtable task; updates result; delivers to callback_url | None detected | Callback URL validation could be bypassed |
| 3 | 9oyr4PM2sMP4aTye | OttoServ Lead Intake | ✅ ACTIVE | Webhook: /lead-intake (prod) | Deduplicates lead by email; creates record in Airtable Leads; Telegram notifies on new/duplicate | x-otto-intake-key env var | Tested: 401 on wrong key, "Invalid lead payload" with correct key but missing required fields — auth works |
| 4 | CA4qXjwvhCaoXvP9 | DRAFT - Memory Write-Back API | 🔌 ACTIVE | Webhook: /memory-write | Routes memory type to correct Airtable table (SOPs, Decisions, Knowledge_Base, Lessons_Learned) | Unknown | Named DRAFT — likely incomplete; no auth node visible |
| 5 | FMGsDye0Y9tbNMV8 | Agent Email Sender | ✅ ACTIVE | Webhook: /agent-email-send | Sends email via Gmail OAuth credential | Gmail OAuth2 | Only 3 nodes — very minimal; credential "Gmail account 2" linked |
| 6 | HILAeL2z3W3iASn7 | OttoServ Task Status | ✅ ACTIVE | Webhook: /task-status | Looks up task in Airtable Tasks by task_id; sends Telegram notification | None detected | No auth check on webhook |
| 7 | JZKMq49zu2pdTEwj | DRAFT - Memory Query API | 🔌 ACTIVE | Webhook: /memory-query | Queries Airtable table by dynamic table name | Unknown | Named DRAFT; dynamic table injection risk |
| 8 | MtA7XaeYP4dYHTep | OttoServ Master Router | ✅ ACTIVE | Webhook: /task-route (prod) | Auth check; normalizes payload; creates Airtable Task; switches on route (jarvis_worker, claude, openai, human_approval); notifies via Telegram; invokes via HTTP | x-task-key env var | RUNNER_URL in config points to 19001 (dead) for some routes; task-route tested — returns 200 |
| 9 | NTkWzd1kZuu2xdav | Lead Discovery Engine | ✅ ACTIVE | Schedule: daily | Searches Tavily for companies; extracts pages; deduplicates; creates Airtable Leads records; sends Telegram summary | Env keys | Functional if TAVILY_API_KEY is valid |
| 10 | NljgoPW4deRfdG0m | Cold Outreach Sender (Business Hours) | ✅ ACTIVE | Schedule + Manual webhook | Finds new Airtable leads; creates Gmail draft (NOT sends); updates Airtable status; Telegram reports | Gmail OAuth2; Airtable env | CREATES DRAFTS not sends — manual review before sending |
| 11 | Nq1UnrejYswz2C17 | Operational Metrics Dashboard Populator | ✅ ACTIVE | Schedule: nightly | Aggregates KPIs from Airtable tables; queries n8n executions via localhost:5678 self-call; updates Metrics Dashboard table; Telegram alert on breach | Airtable env; n8n self-key | n8n self-query uses http://localhost:5678 — works inside container |
| 12 | OOeEE2otWXJSYppq | DRAFT - Nightly Memory Consolidation | 🔌 ACTIVE | Schedule: 02:00 UTC | Fetches Tasks, Lessons, SOPs, Decisions from Airtable; sends summary to Telegram | Airtable env | Named DRAFT — Telegram send is the only output; no AI synthesis step |
| 13 | XclskeClTnyl9zvG | Build Approval Handler | 🔴 ACTIVE | Webhook: /build-approve | Fetches Airtable Build Request; updates to Approved; calls /webhook/workflow-manager; sends Telegram | Airtable env; Telegram env | Calls Workflow Manager v3 — which tries to CREATE workflows in n8n; that part works; but the build-runner (19001) is dead so actually building code is broken |
| 14 | ZVVYsJtT5aCZm5Vc | Founder/Operator Alerts & Reporting | ✅ ACTIVE | Schedule: daily + Webhook /founder-alert-ingress | Aggregates all Leads metrics from Airtable; fetches failed executions from n8n; sends Telegram founder report | Airtable env; Telegram env | Healthy — fully automated daily founder brief |
| 15 | a89OCvDJxZ6WGWIO | Workflow Manager v3 | 🔌 ACTIVE | Webhook: /workflow-manager | Creates draft n8n workflows via n8n API; used by Build Approval Handler | n8n API key env | Only creates empty workflow shells; no executor to fill them since build-runner is dead |
| 16 | eZ2NJGsbhnn75sl3 | Social Content Drafting & Approval | 🔌 ACTIVE | Webhook: /social-draft-intake | Calls Claude API directly via HTTP with env key; stores drafts to Airtable Social_Drafts; notifies Telegram | Raw env CLAUDE_API_KEY | Social_Drafts table not found in Airtable schema (not in the 15 listed tables — likely missing) |
| 17 | koP8lqUV0JeiCA6S | Airtable Enrichment & Qualification Engine | ✅ ACTIVE | Schedule: nightly | Fetches unqualified leads; enriches via Tavily; updates Airtable; Telegram on high-fit | Tavily + Airtable env | Healthy |
| 18 | nMAlrQAL5RBFt6Pg | SBX - Cold Outreach Sender | 🧪 DISABLED | None (inactive) | Sandbox version of outreach sender | Env | DISABLED — safe |
| 19 | oKgGXTaQdw1qVt4S | Reply Detection & Conversation Tracker | ✅ ACTIVE | Schedule: poll Gmail | Watches Gmail inbox for replies; matches to Airtable lead; updates lead status; Telegram notify | Gmail OAuth2; Telegram OAuth | Healthy; two Gmail accounts configured |
| 20 | pZcxioHvIKvkYLwJ | Process Mapping & SOP Delivery | 🔴 ACTIVE | Webhook: /sop-intake | Receives SOP draft; calls Claude API; stores to Airtable SOPs; calls Google Docs webhook; updates client SOP fields | Claude env; Google Docs webhook | Google Docs URL defaults to https://example.com/create-google-doc — not configured; SOPs won't be persisted to Drive |
| 21 | pfeaLhdwuYts9FFK | Build Request Intake | 🔴 ACTIVE | Webhook: /build-request | Validates payload; creates Airtable Build Request; calls $env.RUNNER_URL + /run | RUNNER_TOKEN env | RUNNER_URL = http://host.docker.internal:19001; port 19001 dead; build requests accepted but never executed |
| 22 | wv0UsHSertfuqfcq | OttoServ Task Callback Handler | ✅ ACTIVE | Webhook: /task-complete | Auth check; validates callback; looks up Airtable task; updates result; Telegram notify; delivers to callback_url | x-task-key equivalent | Functional; Telegram notification on every task completion |

**Credential Summary for n8n:**
- Gmail OAuth2: 2 accounts ("Gmail account" and "Gmail account 2") — used in outreach, reply-detection, email-sender
- Telegram API: 1 account — used in 12+ workflows
- Anthropic API: 1 account — configured but Social workflow uses raw HTTP + env key instead
- Google Sheets/Docs OAuth2: configured but Google Docs webhook in WF9 points to example.com
- No Airtable n8n credential — all Airtable calls use raw HTTP with $env.AIRTABLE_API_KEY (works)
- No OpenAI n8n credential — Master Router routes to OpenAI via $env variables

---

## C. Telegram / Founder Command Layer

| Item | Status | Evidence |
|---|---|---|
| Telegram bot token | ✅ | Token in docker-compose; openclaw.json also has separate bot token (8727146917) |
| Telegram webhook registered | ❌ | getWebhookInfo returns empty url — no webhook registered on the n8n Telegram bot (8666971243) |
| OpenClaw Telegram binding | ✅ | openclaw.json binds all Telegram → Jarvis agent; requireMention: true for groups |
| Founder gets daily report | ✅ | WF6 (Founder/Operator Alerts) scheduled daily; sends Telegram message |
| Jarvis responds via Telegram | ✅ | OpenClaw handles this natively via bot token in openclaw.json |
| n8n workflows notified via Telegram | ✅ | 12+ workflows send Telegram messages via bot API direct HTTP calls |
| Two Telegram bots in play | ⚠️ | Bot 8666971243 (n8n workflows) and Bot 8727146917 (Jarvis/OpenClaw) — separate bots; potential confusion |

Note: The n8n Telegram bot (8666971243) has NO webhook registered — it operates send-only via HTTP API. The OpenClaw bot (8727146917) handles receiving Telegram commands from the founder.

---

## D. Airtable

Confirmed tables in base `appGOgiaH0M1g9A4y`:

| Table | Status | Used By |
|---|---|---|
| Leads | ✅ | WF3 Lead Intake, WF9 Discovery, WF10 Outreach, WF17 Enrichment, WF14 Reporting, WF19 Reply Detection |
| Conversations | ✅ | Schema present; no workflow actively writes to it |
| Metrics Dashboard | ✅ | WF11 Dashboard Populator writes daily |
| Markets | ✅ | Schema present; no workflow confirmed writing |
| Campaigns | ✅ | Schema present; no workflow confirmed writing |
| Email Log | ✅ | Schema present; Reply Detection may write |
| Templates | ✅ | Schema present |
| Metrics Daily | ✅ | Schema present |
| Build Requests | ✅ | WF21 Build Intake creates; WF13 Approval Handler updates |
| Tasks | ✅ | WF1, WF8, WF22 create/update/read |
| API Clients | ✅ | WF1 External Agent API looks up clients here |
| SOPs | ✅ | WF4 Memory Write-Back; WF12 Nightly Consolidation reads; WF9 SOP Delivery writes |
| Decisions | ✅ | WF4 Memory Write-Back; WF12 reads |
| Knowledge_Base | ✅ | WF4 Memory Write-Back |
| Lessons_Learned | ✅ | WF4 Memory Write-Back; WF12 reads |
| Social_Drafts | ❌ NOT FOUND | WF16 Social Content Drafting writes here — table does not exist in base |

---

## E. Claude PM Layer

| Item | Status | Evidence |
|---|---|---|
| Jarvis (OpenClaw agent "jarvis") | ✅ | Defined in openclaw.json; model = claude-sonnet-4-20250514; workspace = /home/clawuser/.openclaw/workspace |
| Worker sub-agent | ✅ | openclaw.json defines "worker" agent with minimal toolset and no exec/spawn |
| Primary model | ✅ | claude-sonnet-4-20250514 (Sonnet 4.6) |
| Anthropic key in OpenClaw | ✅ | ANTHROPIC_API_KEY present in /home/clawuser/.env (key present) |
| GPT-5.4 alias | ❓ | openclaw.json references "openai/gpt-5.4" alias but no OpenAI key in /home/clawuser/.env and credentials dir only has Telegram entries — OpenAI routing will fail |
| Semantic memory | ✅ | Hybrid vector + text search enabled; 24 files indexed per AGENTS.md |
| Memory write to Airtable | ✅ | WF4 and WF7 provide API endpoints |
| Heartbeat system | ✅ | OpenClaw config: heartbeat every 10m using Haiku model |
| Hermes evaluation layer | 🔌 | Agent defined in seed_agents.py; hermes_routes.py registered; no active invocation scheduled |
| MOONSHOT_API_KEY | 🔐 | Present in docker-compose.yml environment — a Moonshot (kimi) API key is visible in plain text there |

---

## F. IronClaw / OpenClaw / Execution Layer

| Item | Status | Evidence |
|---|---|---|
| OpenClaw Gateway | ✅ | openclaw.service active; listening on 127.0.0.1:18789 |
| OpenClaw Bridge | ✅ | openclaw-bridge.service active; 172.17.0.1:18790 reachable; /health and /agent-worker endpoints confirmed |
| Jarvis workspace | ✅ | /home/clawuser/.openclaw/workspace/ — extensive; 40+ strategic MD files, agent scripts, DealFlow system |
| IronClaw | ❌ | No "ironclaw" process, service, or directory found anywhere on system |
| Build Runner (Claude Code runner) | 🔴 | Service exists (/etc/systemd/system/build-runner.service) and is enabled; but INACTIVE/DEAD since Apr 25 |
| Runner listens on 19001 | 🔴 | ss -tlnp shows no port 19001; build requests from n8n fail |
| OpenAI fallback routing | 🔴 | openclaw.json lists openai/gpt-5.4 as model but no OpenAI API key present; GPT route in Master Router will fail |

---

## G. Jarvis Voice / ElevenLabs

| Item | Status | Evidence |
|---|---|---|
| ElevenLabs agent created | ✅ | Agent ID agent_0501kqg13ad2ej09zsyxywrb6gsz hardcoded in jarvis-voice page; points to elevenlabs.io |
| ElevenLabs voice page | 🎭 | /jarvis-voice is a static page with a hardcoded link to ElevenLabs external app — opens new tab to ElevenLabs site, no embedding |
| Voice routes in enterprise platform | 🔌 | voice_routes.py exists in /routes/ but is NOT imported or registered in main.py — the /voice-command endpoint does NOT exist at runtime |
| voice.ottoserv.com routing | 🔴 | Cloudflare routes voice.ottoserv.com → localhost:19002 (A2A Gateway), but voice_routes.py is on platform (19004) and not even registered |
| ElevenLabs outbound calling | 📋 | ELEVENLABS_OUTBOUND_READY.md in workspace; setup docs written; phone number setup NOT completed; no Twilio/ElevenLabs key in .env |
| ElevenLabs key | ❌ | Not in enterprise-platform/.env, not in /home/clawuser/.env |
| Voice-command backend logic | 🎭 | voice_routes.py uses pattern-matching keywords, file listing, and hardcoded strings — NOT connected to real Jarvis/OpenClaw; returns scripted responses |

---

## H. Telnyx / Phone

| Item | Status | Evidence |
|---|---|---|
| Telnyx credentials | ❌ | Not in any .env file inspected |
| Twilio credentials | ❌ | Not in any .env file; twilio_integration.py exists in workspace but not deployed |
| Phone number +14079045560 | 📋 | Referenced in ELEVENLABS_SETUP_SUMMARY.md as Twilio number to connect |
| Morgan voice product | 🔌 | /jarvis-voice page has "Call Morgan" button linking to tel:4077988172 — this is a direct phone number link, not AI-routed |
| Vapi | 📋 | vapi_outbound_analysis.py in workspace; VAPI key absent from all .env files |

---

## I. Website / Dashboard / Demo

| Item | Status | Evidence |
|---|---|---|
| Website (ottoserv.com / v0-ottoserv.vercel.app) | ✅ | Next.js repo at /home/clawuser/ottoserv-website; deployed to Vercel |
| Dashboard authentication | ✅ | Login page POSTs to https://platform.ottoserv.com/auth/login; JWT returned and stored |
| Jarvis Chat (dashboard) | 🎭 | JarvisChat.tsx has hardcoded AI_RESPONSES array (6 canned strings); sendMessage uses `setTimeout(1000ms)` then picks random response — no API call whatsoever |
| Growth/Social dashboard | 🎭 | growth/page.tsx imports mockNVP, mockContentLibrary from @/lib/mockData — all hardcoded |
| Agents dashboard | 🎭 | agents/page.tsx uses hardcoded AGENTS array and mockAgentActivity — no live data |
| Demo landing page (/demo) | ✅ | Static marketing page; sets localStorage role='demo'; redirects to /demo/dashboard |
| Demo dashboard (/demo/dashboard) | 🎭 | Pure hardcoded DEMO_METRICS, DEMO_CLIENTS, DEMO_PROJECTS constants — no backend calls |
| TechOps submit page | 🔌 | Has REAL backend call to https://platform.ottoserv.com/techops/tickets if platformToken exists in localStorage; also calls n8n /webhook/task-route for high-urgency tickets; platform endpoint is live |
| TechOps opportunities | 🔌 | Platform has techops_opportunity_routes.py — unknown if frontend pages call live data |
| Admin client pages | 🔌 | admin/clients and admin/services pages reference platform.ottoserv.com — partial real connections |
| Reports page | 🎭 | Uses mockData per file inspection |
| Work orders page | 🎭 | Uses mockData |

---

## J. Supabase / Stripe / Vapi

| Item | Status | Evidence |
|---|---|---|
| Supabase URL | 🔌 | Configured: djakaudqtrmympthjscf.supabase.co; SUPABASE_SERVICE_KEY empty → SQLite used instead |
| Supabase ANON key | ❌ | Not set in .env |
| Stripe | ❌ | No STRIPE key in any .env file; no stripe import found in routes |
| Vapi | 📋 | vapi_outbound_analysis.py in workspace; no deployed integration |

---

## K. Leadfilter / Morgan / Voice Product

| Item | Status | Evidence |
|---|---|---|
| Morgan | 🎭 | "Call Morgan" button on /jarvis-voice is a tel: link to 4077988172 — a static phone number button; no AI routing |
| Leadfilter | ❌ | No leadfilter service, route, or script found on system |
| Voice lead qualification | 📋 | Referenced in workspace docs; ElevenLabs outbound setup incomplete |
| Sentinel outreach system | 🔌 | 18 sentinel_*.py scripts in workspace; sentinel_qa.db exists; not integrated with platform or n8n |

---

## L. Social / Growth / Marketing

| Item | Status | Evidence |
|---|---|---|
| Social content n8n workflow | 🔌 | WF16 Social Content Drafting active; calls Claude API; BUT Social_Drafts Airtable table doesn't exist |
| OGIS (content AI system) | 🔌 | ogis_routes.py registered; services/ogis/ has 4 agents (analytics, content, critic, research); no Anthropic key in platform .env |
| Social publisher | 🔌 | social_publisher.py exists; uses Composio for Facebook publishing; COMPOSIO_API_KEY not set |
| SIA (Social Intent Analytics) | 🔌 | sia/ service directory exists with 4 modules; registered in main.py; Anthropic key missing |
| Anthropic key in platform | ❌ | Not in enterprise-platform/.env — all Claude-dependent platform routes will fail |
| Instagram integration | 📋 | INSTAGRAM_INTEGRATION_COMPLETE.md in workspace; actual API integration unknown |
| Growth dashboard | 🎭 | All mockData on frontend |

---

## M. Sentinel / Website Audit

| Item | Status | Evidence |
|---|---|---|
| Sentinel scripts | 🔌 | 18 Python scripts in workspace covering audit scoring, browser audit, prospect discovery, outreach, revenue engine, weekly report | 
| sentinel_qa.db | ✅ | Database file exists in workspace |
| Sentinel integration | ❌ | Not connected to platform, not registered as a service, not accessible via API |
| Browser automation | 🔌 | openclaw.json has browser.enabled=true; chrome installed; browser plugin enabled |

---

## N. Opportunity / TechOps Agent

| Item | Status | Evidence |
|---|---|---|
| TechOps platform backend | ✅ | techops_routes.py and techops_opportunity_routes.py both registered; /techops/tickets endpoint exists and returns auth error (requires Bearer token) |
| TechOps submit page | 🔌 | REAL backend call present — tries platform.ottoserv.com/techops/tickets with Bearer token if localStorage token exists; falls back to client-side ticket ID if not; routes to n8n for high-urgency |
| NOTE: Prior assessment said this was FAKE | CORRECTION | The submit page was updated and DOES attempt a real API call; however if user is not authenticated (no platformToken in localStorage), it generates a random TKT-XXXX id client-side and shows success without submitting — still fakes it for unauthenticated users |
| TechOps Opportunity Agent | 🔌 | Defined in seed_agents.py; techops_opportunity.py service exists; agent_id "techops_opportunity_agent" seeded to DB; no live pipeline driving it |
| TechOps tickets | ✅ | Backend endpoint confirmed returning proper auth error (meaning it's live) |

---

## O. Real Estate Deal Agent

| Item | Status | Evidence |
|---|---|---|
| DealFlow scripts | 🔌 | 15+ dealflow_*.py scripts in workspace; commercial_dealflow.db exists; DEALFLOW_READY_FOR_PRODUCTION.md claims tested |
| DealFlow Telegram commands | 🔌 | dealflow_telegram_commands.py exists; /deal commands documented in DEALFLOW_READY_FOR_PRODUCTION.md |
| DealFlow deployment | ❓ | DEALFLOW_DEPLOYMENT.md exists; unclear if scripts are running as a service or need to be invoked |
| ElevenLabs outbound for DealFlow | 🔴 | ELEVENLABS_OUTBOUND_READY.md documents integration; phone number NOT connected; ElevenLabs key absent |
| Twilio integration | 🔴 | twilio_integration.py exists; no Twilio credentials in .env |
| DealFlow as platform route | ❌ | No dealflow route in enterprise platform; scripts are standalone Python in workspace |

---

## P. Agent Inventory

Full list from all sources:

**Defined in enterprise-platform seed_agents.py (8 agents):**

| Agent ID | Name | Department | Model | Status |
|---|---|---|---|---|
| jarvis | Jarvis | executive | claude-opus-4 | active |
| hermes | Hermes | governance | claude-opus-4 | active |
| growth_agent | Growth Agent (Dash) | marketing | claude-sonnet-4 | active |
| coo_agent | COO Agent (Atlas) | operations | claude-sonnet-4 | active |
| client_success_agent | Client Success Agent (Nova) | client_success | claude-sonnet-4 | active |
| bi_data_agent | BI/Data Agent | analytics | claude-sonnet-4 | active |
| integration_agent | Integration Agent | engineering | claude-sonnet-4 | active |
| techops_opportunity_agent | TechOps Opportunity Agent | techops | claude-sonnet-4 | active |

**Defined in OpenClaw config (2 real agents running):**

| ID | Name | Model | Actual Function |
|---|---|---|---|
| jarvis | Jarvis | claude-sonnet-4-20250514 | Active — receives Telegram, routes tasks, executes code |
| worker | Worker | claude-sonnet-4-20250514 | Sub-agent with minimal tools; spawned for isolated tasks |

**Defined in website frontend only (7 fictional agents):**
Growth Agent, Operations Agent, Project Agent, Finance Agent, Customer Service Agent, Reporting Agent, Data Prep Agent — all hardcoded in agents/page.tsx, no backend connection.

**In workspace scripts (standalone, not deployed):**
Sentinel Agent, DealFlow Agent, Revenue Command Agent — Python scripts with no running service.

**Classification:**
- ✅ Actually running: Jarvis, Worker (OpenClaw), n8n workflows (21 active)
- 🔌 Defined but not invoked: Hermes, Growth Agent (Dash), COO Agent, Nova, BI Agent, Integration Agent, TechOps Opportunity Agent (all in DB but nothing calls them)
- 🎭 Frontend-only fiction: 7 dashboard agents
- 📋 Scripts not deployed: Sentinel, DealFlow, Revenue Command

---

## Q. Jarvis-Led Demo Walkthrough Verification

### Current Demo Status
The demo is a static marketing experience only. There is no Jarvis-led walkthrough, no guided steps, no UI highlighting, and no voice coordination.

### What Exists
- `/demo` page: Marketing landing page with feature cards and a "Enter Demo Dashboard" button. Sets `role: 'demo'` in localStorage. No server-side session.
- `/demo/dashboard` page: Hardcoded React component with constants `DEMO_METRICS`, `DEMO_CLIENTS`, `DEMO_PROJECTS`, `DEMO_ALERTS`. Shows a real-time clock (cosmetic only). No API calls. No Jarvis integration.
- Link to `/jarvis-voice`: Opens to a page with a hardcoded link to ElevenLabs external app in a new tab. No in-page voice; no ability to control the demo.

### What Does NOT Exist
- No guided walkthrough steps or script system
- No step-by-step progression (step 1, step 2, etc.)
- No UI element highlighting or spotlight functionality
- No Jarvis narration coordinated with UI actions
- No start/pause/stop demo controls
- No demo session state (nothing stored server-side)
- No client safety boundaries (no timeout, no data isolation beyond localStorage role flag)
- No websocket or real-time connection to any backend
- No text fallback mode if voice fails
- No demo completion screen or CTA flow
- No connection between the voice assistant (ElevenLabs external tab) and the dashboard UI

### JarvisChat (Inside Dashboard)
The "Ask Jarvis" chat at `/dashboard/jarvis` uses `JarvisChat.tsx` which:
1. Has 6 hardcoded response strings in `AI_RESPONSES[]`
2. Uses `setTimeout(1000 + Math.random()*600)` to fake a delay
3. Picks a random response regardless of what the user typed
4. Makes zero API calls

This is not connected to Jarvis/OpenClaw in any way.

### What Must Be Fixed Before Showing Prospects
1. JarvisChat must connect to a real backend (OpenClaw bridge or platform API)
2. A walkthrough script system must be built (step sequence, highlighted elements)
3. The ElevenLabs voice link must be embedded, not an external tab
4. Demo data must be more impressive/realistic (current hardcoded values are too simple)
5. A demo completion CTA must exist (book a call, sign up, etc.)
6. Voice + UI coordination requires a websocket session
7. The "Jarvis Online" indicator is fake — it always shows green regardless of actual status

---

## Top 10 Broken/Temporary Things

1. **Build Runner (port 19001) is dead** — n8n Build Request Intake and Build Approval Handler both silently fail; no new workflows can be AI-generated
2. **JarvisChat is purely mocked** — 6 hardcoded responses, no API connection; showing this to prospects would destroy credibility
3. **voice_routes.py is not registered in main.py** — /voice-command endpoint does not exist despite file being present
4. **voice.ottoserv.com routes to A2A Gateway (19002)** — should route to platform (19004) where voice is (once registered)
5. **Social_Drafts Airtable table missing** — WF16 Social Content Drafting will fail on every execution
6. **Anthropic API key absent from enterprise-platform .env** — all Claude-dependent platform routes (OGIS, SIA, intelligence) silently fail
7. **Supabase service key absent** — platform runs on SQLite only; multi-tenancy not functional
8. **OpenAI key absent from OpenClaw** — "GPT" route in Master Router will fail; openclaw.json references openai/gpt-5.4 with no credentials
9. **Google Docs webhook defaults to example.com** — WF9 SOP Delivery never saves to Drive
10. **ElevenLabs phone number setup incomplete** — outbound calling not connected despite extensive setup documentation

---

## Top 10 Duplicate/Conflicting Things

1. **Two Telegram bots** — 8666971243 (n8n workflows) and 8727146917 (OpenClaw/Jarvis); TELEGRAM_CHAT_ID in n8n is -5247861769; founder may receive duplicate notifications from different bots
2. **Two "Jarvis" definitions** — seed_agents.py defines `jarvis` agent for the platform DB; openclaw.json defines a different `jarvis` agent for OpenClaw; they share no state
3. **Cold Outreach: WF10 (active) and WF18/SBX (disabled)** — two versions; SBX disabled but WF10 is the production version running on schedule
4. **Agent Email Sender (WF5) vs Gmail-based outreach in WF10** — both send via Gmail but for different purposes; both linked to "Gmail account 2" credential
5. **voice_routes.py (Flask Blueprint)** — voice_routes.py imports `from flask import Blueprint` but enterprise platform is FastAPI; this code would fail to load if included
6. **DealFlow has 15+ scripts in workspace but no deployed service** — DEALFLOW_READY_FOR_PRODUCTION.md says ready; nothing is actually running
7. **Sentinel has 18 scripts** — similar situation; extensive code, no integration, no service
8. **Platform agents (8 in DB) vs website agents (7 hardcoded) vs OpenClaw agents (2 running)** — three different agent inventories with no connection
9. **Two Gmail accounts in n8n** — "Gmail account" and "Gmail account 2" with no clear documentation of which email address is which
10. **Memory systems: Airtable (WF4,7,12) vs OpenClaw semantic memory vs workspace markdown files** — three parallel memory systems with no sync layer

---

## Top 10 Closest to Revenue

1. **Lead Discovery Engine (WF9) + Airtable Enrichment (WF17)** — already running nightly; building a qualified lead pipeline automatically
2. **Cold Outreach Sender (WF10)** — running on business hours schedule; creating Gmail drafts of outreach emails; one person reviewing and sending
3. **Reply Detection (WF19)** — polling Gmail for replies; notifying founder via Telegram; real conversation data flowing
4. **Founder Daily Report (WF14/WF6)** — sending daily Telegram brief; founder has real pipeline visibility
5. **TechOps ticket system (platform + submit page)** — platform backend live; submit page makes real API calls; first client could submit TechOps requests today
6. **Lead Intake webhook (WF3)** — active with auth; ready to receive leads from external sources (website form, partner integrations)
7. **Master Router (WF8) + Jarvis bridge** — task routing to Jarvis is live; once build runner is restarted, full autonomous task execution resumes
8. **DealFlow agent** — extensively documented; Telegram /deal commands exist; if the scripts are wired to Jarvis heartbeat, investor outreach could start
9. **Social Content Drafting (WF16)** — active; only blocked by missing Social_Drafts Airtable table (5-minute fix)
10. **TechOps Opportunity Agent** — defined and seeded; just needs a trigger (Jarvis task, scheduled n8n call) to start finding and qualifying IT service opportunities

---
