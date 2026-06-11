// Playwright adapter for the Hermes browser bridge on the droplet.
// Uses a persistent Chromium profile outside the repository. No credentials or
// cookies are stored in Git. Start in read-only mode until sessions are verified.

import { chromium } from "playwright";
import { promises as fs } from "node:fs";

const profileDir = process.env.HERMES_BROWSER_PROFILE_DIR || "/home/hermes-agent/.config/hermes-browser-profile";
const optionalExecutablePath = String(process.env.HERMES_CHROME_PATH || "").trim();
const headless = process.env.HERMES_BROWSER_HEADLESS !== "false";
const liveDm = process.env.HERMES_BROWSER_LIVE_DM === "true";
const evidenceDir = process.env.HERMES_EVIDENCE_DIR || "/home/hermes-agent/workspace/evidence";

let contextPromise;

async function context() {
  if (!contextPromise) {
    const launchOptions = {
      headless,
      viewport: { width: 1440, height: 1000 },
      args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
    };
    if (optionalExecutablePath) launchOptions.executablePath = optionalExecutablePath;
    contextPromise = chromium.launchPersistentContext(profileDir, launchOptions);
  }
  return contextPromise;
}

async function pageFor(url) {
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  return page;
}

function platformFromUrl(url = "") {
  if (/linkedin\.com/i.test(url)) return "linkedin";
  if (/facebook\.com/i.test(url)) return "facebook";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/(twitter|x)\.com/i.test(url)) return "x";
  if (/reddit\.com/i.test(url)) return "reddit";
  return "web";
}

function isSearchOrDirectory(url = "") {
  return /google\.|bing\.|yahoo\.|yelp\.|yellowpages\.|mapquest\.|angi\.|homeadvisor\.|thumbtack\./i.test(url);
}

function isSocial(url = "") {
  return ["linkedin", "facebook", "instagram", "x", "reddit"].includes(platformFromUrl(url));
}

async function screenshot(page, prefix) {
  await fs.mkdir(evidenceDir, { recursive: true });
  const file = `${evidenceDir}/${prefix}-${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function bodyText(page) {
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

export async function capabilities() {
  const ctx = await context();
  const page = await ctx.newPage();
  const checks = {
    linkedin: "https://www.linkedin.com/feed/",
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    x: "https://x.com/home",
    reddit: "https://www.reddit.com/",
  };
  const platforms = {};
  for (const [name, url] of Object.entries(checks)) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const current = page.url();
      const body = (await bodyText(page)).slice(0, 1500).toLowerCase();
      const challenged = /checkpoint|challenge|captcha|verify your identity|unusual activity/.test(current + body);
      const loggedOut = /login|log in|sign in|join now|create account/.test(body) && /login|auth|signin/.test(current + body);
      platforms[name] = { reachable: true, logged_in: !loggedOut && !challenged, challenged, current_url: current };
    } catch (error) {
      platforms[name] = { reachable: false, logged_in: false, challenged: false, error: String(error?.message || error) };
    }
  }
  await page.close();
  return {
    browser_available: true,
    persistent_profile: true,
    research_available: true,
    dm_available: liveDm,
    platforms,
    blockers: Object.entries(platforms).filter(([, value]) => !value.logged_in).map(([name, value]) => `${name}_${value.challenged ? "challenge" : "login_required"}`),
  };
}

async function findOfficialWebsite(company) {
  if (!company) return "";
  const page = await pageFor(`https://www.google.com/search?q=${encodeURIComponent(company + " official website")}`);
  try {
    const links = await page.locator("a[href]").evaluateAll((elements) => elements.map((a) => a.href).filter(Boolean).slice(0, 300));
    return links.find((url) => /^https?:\/\//i.test(url) && !isSearchOrDirectory(url) && !isSocial(url)) || "";
  } finally {
    await page.close();
  }
}

export async function researchLead(lead = {}) {
  const company = String(lead.business_name || lead.company || "").trim();
  const suppliedWebsite = String(lead.official_website || lead.website || lead.website_url || "").trim();
  const officialWebsite = /^https?:\/\//i.test(suppliedWebsite) ? suppliedWebsite : await findOfficialWebsite(company);
  const result = {
    provider: "playwright_droplet",
    business_name: company,
    official_website: officialWebsite,
    public_email: "",
    public_phone: "",
    contact_sources: [],
    social_profiles: [],
    notes: [],
  };

  if (!officialWebsite) {
    result.notes.push("No official website could be verified.");
    return result;
  }

  const page = await pageFor(officialWebsite);
  try {
    const text = await bodyText(page);
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || "";
    if (email) result.public_email = email;
    if (phone) result.public_phone = phone;
    if (email || phone) result.contact_sources.push(page.url());

    const links = await page.locator("a[href]").evaluateAll((elements) => elements.map((a) => a.href).filter(Boolean).slice(0, 300));
    const seen = new Set();
    for (const url of links) {
      const platform = platformFromUrl(url);
      if (!["linkedin", "facebook", "instagram", "x", "reddit"].includes(platform)) continue;
      const key = `${platform}|${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // A social profile linked from the verified official website is treated as
      // identity-associated. The profile still must pass DM preflight/session checks.
      result.social_profiles.push({ platform, url, verified: true, source_url: page.url() });
    }
    result.notes.push(`Verified official-site research source: ${page.url()}`);
    return result;
  } finally {
    await page.close();
  }
}

async function linkedinSend(page, packet) {
  const body = (await bodyText(page)).toLowerCase();
  if (/checkpoint|challenge|captcha|verify your identity/.test(page.url() + body)) {
    throw Object.assign(new Error("linkedin_account_challenge"), { code: "account_challenge", status: 409 });
  }
  const messageButton = page.getByRole("button", { name: /message/i }).first();
  await messageButton.click({ timeout: 15000 });
  const composer = page.locator('[contenteditable="true"]').last();
  await composer.fill(packet.message);
  if (!liveDm) {
    return { status: "prepared", thread_url: page.url(), screenshot_url: await screenshot(page, "linkedin-dm-prepared") };
  }
  await page.getByRole("button", { name: /^send$/i }).last().click({ timeout: 15000 });
  await page.waitForTimeout(1500);
  return { status: "sent", thread_url: page.url(), screenshot_url: await screenshot(page, "linkedin-dm-sent"), sent_at: new Date().toISOString() };
}

export async function sendDm(packet = {}) {
  if (!packet.profile_url || !packet.message) throw new Error("missing_profile_or_message");
  const platform = packet.platform || platformFromUrl(packet.profile_url);
  const page = await pageFor(packet.profile_url);
  try {
    if (platform === "linkedin") return await linkedinSend(page, packet);
    throw Object.assign(new Error(`platform_adapter_not_implemented:${platform}`), { status: 501 });
  } finally {
    await page.close();
  }
}

export async function inspectDmReplies() {
  return { replies: [], note: "reply monitoring adapter not yet implemented" };
}

export default { capabilities, researchLead, sendDm, inspectDmReplies };
