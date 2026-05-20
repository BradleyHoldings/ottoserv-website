# OttoServ — Codex Sprint 1: Crash Fixes & Critical UI Bugs
**Repo:** BradleyHoldings/ottoserv-website  
**Branch:** main  
**Prepared by:** Claude audit session, 2026-05-19  
**Do not:** delete data, change API endpoints, modify auth logic, touch production DB

---

## Overview

Fix 8 bugs across 7 files. All changes are UI/frontend only — no backend, no database, no API changes. Each fix is surgical: change only what is specified. Commit each fix separately with the commit message shown.

---

## FIX 1 — SOPs page crashes with `ReferenceError: mockSOPs is not defined`

**File:** `src/app/dashboard/sops/page.tsx`  
**Root cause:** Line 34 references `mockSOPs` which was never declared. The page uses `sops` (from useState) but `mockSOPs` is an undefined variable.

**Exact change — line 34:**

Current:
```ts
const activeCount = mockSOPs.filter((s) => s.status === "active").length;
```

Replace with:
```ts
const activeCount = sops.filter((s) => s.status === "active").length;
```

Also scan the rest of the file for any other reference to `mockSOPs` and replace each with `sops`.

**Commit message:** `fix(sops): replace undefined mockSOPs with sops state variable`

---

## FIX 2 — Financials page crashes with undefined property access

**File:** `src/app/dashboard/financials/page.tsx`  
**Root cause:** The `f` object (lines 8–15) declares only 6 properties, but the JSX accesses 5 more that don't exist (`f.overdue_amount`, `f.expenses_this_month`, `f.expenses_last_month`, `f.ytd_expenses`, `f.ytd_gross_profit`). Also, line 85 divides by `f.gross_profit_last_month` which is `0`, producing `NaN%`.

**Exact change — the `f` object declaration (lines 8–15):**

Current:
```ts
const f = {
  revenue_this_month: 0,
  revenue_last_month: 0,
  gross_profit_this_month: 0,
  gross_profit_last_month: 0,
  ytd_revenue: 0,
  outstanding_receivables: 0,
};
```

Replace with:
```ts
const f = {
  revenue_this_month: 0,
  revenue_last_month: 0,
  gross_profit_this_month: 0,
  gross_profit_last_month: 0,
  ytd_revenue: 0,
  outstanding_receivables: 0,
  overdue_amount: 0,
  expenses_this_month: 0,
  expenses_last_month: 0,
  ytd_expenses: 0,
  ytd_gross_profit: 0,
};
```

**Exact change — line 85 (division by zero):**

Current:
```tsx
trend={`+${Math.round(((f.gross_profit_this_month - f.gross_profit_last_month) / f.gross_profit_last_month) * 100)}% vs last month`}
```

Replace with:
```tsx
trend={f.gross_profit_last_month > 0
  ? `+${Math.round(((f.gross_profit_this_month - f.gross_profit_last_month) / f.gross_profit_last_month) * 100)}% vs last month`
  : "No prior month data"}
```

**Commit message:** `fix(financials): add missing f properties and guard division-by-zero on gross profit trend`

---

## FIX 3 — Integrations page crashes with `ReferenceError: getToken is not defined`

**File:** `src/app/dashboard/integrations/page.tsx`  
**Root cause:** Line 95 calls `getToken()` which is never imported. The correct auth helper is `getCurrentUser()` from `@/lib/userAuth`, and the platform JWT check is `hasPlatformAccess()` from `@/lib/dashboardApi`.

**Exact change — add missing import at the top of the file (after existing imports):**

Add this import:
```ts
import { getCurrentUser } from "@/lib/userAuth";
```

**Exact change — lines 94–100 (the useEffect that calls getToken):**

Current:
```ts
useEffect(() => {
  const token = getToken();
  if (token) {
    getIntegrations(token).then((data) => {
      if (data) setIntegrations([...data, ...EXTRA_INTEGRATIONS]);
    });
  }
}, []);
```

Replace with:
```ts
useEffect(() => {
  getIntegrations().then((data) => {
    if (data) setIntegrations([...data, ...EXTRA_INTEGRATIONS]);
  }).catch(() => {
    // Integration data unavailable — use defaults
  });
}, []);
```

Note: Also update the `getIntegrations` call signature in `src/lib/dashboardApi.ts` if it currently requires a token argument — make the token optional or use the stored auth token internally. If `getIntegrations` already works without a token argument, no change needed there.

**Commit message:** `fix(integrations): remove undefined getToken call, use getIntegrations without explicit token`

---

## FIX 4 — CRM page: add .catch() to prevent unhandled Promise rejection crash

**File:** `src/app/dashboard/crm/page.tsx`  
**Root cause:** The `Promise.all` on lines 70–83 has no `.catch()` handler. If any of the 5 API calls throws (which Jarvis confirmed happens due to data model conflicts), the error propagates uncaught and crashes the component.

**Exact change — lines 70–87 (the Promise.all block):**

Current:
```ts
Promise.all([
  getCrmContacts(),
  getCrmDeals(),
  getCrmCompanies(),
  getCrmActivities(),
  getCrmTasks(),
]).then(([cs, ds, comps, acts, ts]) => {
  if (cancelled) return;
  setContacts(cs);
  setDeals(ds);
  setCompanies(comps);
  setActivities(acts);
  setTasks(ts);
});
```

Replace with:
```ts
Promise.all([
  getCrmContacts().catch(() => []),
  getCrmDeals().catch(() => []),
  getCrmCompanies().catch(() => []),
  getCrmActivities().catch(() => []),
  getCrmTasks().catch(() => []),
]).then(([cs, ds, comps, acts, ts]) => {
  if (cancelled) return;
  setContacts(cs ?? []);
  setDeals(ds ?? []);
  setCompanies(comps ?? []);
  setActivities(acts ?? []);
  setTasks(ts ?? []);
});
```

**Commit message:** `fix(crm): add per-call catch handlers to prevent Promise.all crash on API error`

---

## FIX 5 — Reports page: NaN% Conversion Rate and hardcoded "+24%" on $0 revenue

**File:** `src/app/dashboard/reports/page.tsx`  
**Root cause 1:** Line 43 — `mockLeads.length` is `0`, so `0 / 0 = NaN`. Same issue on line 149 in `SalesDashboard`.  
**Root cause 2:** Line 36 — `trend="+24% vs last month"` is a hardcoded static string shown on a `$0 Revenue This Month` KPI card.

**Exact change — line 43 (OwnerDashboard Conversion Rate):**

Current:
```tsx
<KpiCard value={`${Math.round((mockLeads.filter((l) => l.status === "won").length / mockLeads.length) * 100)}%`} label="Conversion Rate" color="green" />
```

Replace with:
```tsx
<KpiCard value={mockLeads.length > 0 ? `${Math.round((mockLeads.filter((l) => l.status === "won").length / mockLeads.length) * 100)}%` : "—"} label="Conversion Rate" color="green" />
```

**Exact change — line 36 (hardcoded "+24% vs last month" on $0 revenue):**

Current:
```tsx
<KpiCard value={`$${mockFinancialSummary.revenue_this_month.toLocaleString()}`} label="Revenue This Month" color="green" trend="+24% vs last month" trendDirection="up" />
```

Replace with:
```tsx
<KpiCard value={`$${mockFinancialSummary.revenue_this_month.toLocaleString()}`} label="Revenue This Month" color="green" trend={mockFinancialSummary.revenue_this_month > 0 ? "+24% vs last month" : "No data yet"} trendDirection={mockFinancialSummary.revenue_this_month > 0 ? "up" : "neutral"} />
```

**Exact change — line 71 (ProjectDashboard division by zero):**

Current:
```tsx
<KpiCard value={`${Math.round(mockProjects.reduce((s, p) => s + p.percent_complete, 0) / mockProjects.length)}%`} label="Avg Completion" color="blue" />
```

Replace with:
```tsx
<KpiCard value={mockProjects.length > 0 ? `${Math.round(mockProjects.reduce((s, p) => s + p.percent_complete, 0) / mockProjects.length)}%` : "—"} label="Avg Completion" color="blue" />
```

**Exact change — line 149 (SalesDashboard Win Rate):**

Current:
```tsx
<KpiCard value={`${Math.round((mockLeads.filter((l) => l.status === "won").length / mockLeads.length) * 100)}%`} label="Win Rate" color="green" />
```

Replace with:
```tsx
<KpiCard value={mockLeads.length > 0 ? `${Math.round((mockLeads.filter((l) => l.status === "won").length / mockLeads.length) * 100)}%` : "—"} label="Win Rate" color="green" />
```

**Commit message:** `fix(reports): guard all division-by-zero and remove hardcoded trend on zero-value KPIs`

---

## FIX 6 — Command Center: remove super_admin redirect

**File:** `src/app/dashboard/command-center/page.tsx`  
**Root cause:** Lines 46–49 — when `currentUser.role === 'super_admin'`, the page immediately redirects to `/dashboard/admin`. Jonathan is a super_admin, so he always gets redirected away from Command Center.

**Exact change — remove the redirect block (lines 46–49):**

Current:
```ts
// Super admin should use admin dashboard, not command center
if (currentUser.role === 'super_admin') {
  router.push('/dashboard/admin');
  return;
}
```

Replace with:
```ts
// Super admins can use command center too
```

(i.e., delete the redirect entirely and leave just the comment if desired, or remove the comment too)

**Commit message:** `fix(command-center): remove super_admin redirect so all roles can access the page`

---

## FIX 7 — Services page: fix "See the Platform" CTA destination

**File:** `src/app/services/page.tsx`  
**Root cause:** In the `services` array, the "OttoServ OS Dashboard" entry (line ~53) has `href: "/contact"` for the "See the Platform" CTA. It should go to `/dashboard`.

**Exact change — find the OttoServ OS Dashboard service object:**

Current:
```ts
{
  title: "OttoServ OS Dashboard",
  tag: "Platform",
  ...
  cta: "See the Platform",
  href: "/contact",
},
```

Replace `href` value only:
```ts
  href: "/dashboard",
```

**Commit message:** `fix(services): change "See the Platform" CTA from /contact to /dashboard`

---

## AFTER ALL FIXES

1. Run `npm run build` (or `pnpm build`) and confirm zero TypeScript errors
2. Start dev server: `npm run dev`
3. Manually verify:
   - `/dashboard/sops` — renders without crash ✓
   - `/dashboard/financials` — renders without crash, no NaN% ✓
   - `/dashboard/integrations` — renders without crash ✓
   - `/dashboard/crm` — renders without crash ✓
   - `/dashboard/reports` — no NaN%, no hardcoded "+24%" on $0 ✓
   - `/dashboard/command-center` — stays on /command-center, does not redirect ✓
   - `/services` — "See the Platform" button goes to /dashboard ✓
   - Footer email — no change (jonathan@ottoservco.com retained per Jonathan) ✓

---

## DO NOT CHANGE IN THIS SPRINT

- Auth logic in `src/lib/userAuth.ts`
- Any API routes in `src/app/api/`
- The admin dashboard (`src/app/dashboard/admin/page.tsx`) — LIVE DATA banner decision pending Jonathan approval
- Any database schemas or environment variables
- Any other pages not listed above
