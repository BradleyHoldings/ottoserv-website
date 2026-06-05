// Playwright adapter for the Hermes browser bridge on the droplet.
// Uses a persistent Chromium profile outside the repository. No credentials or
// cookies are stored in Git. Start in read-only mode until sessions are verified.

import { chromium } from "playwright-core";

const profileDir = process.env.HERMES_BROWSER_PROFILE_DIR || "/home/hermes-agent/.config/hermes-browser-profile";
const executablePath = process.env.HERMES_CHROME_PATH || "/usr/bin/google-chrome";
const headless = process.env.HERMES_BROWSER_HEADLESS !== "false";
const liveDm = process.env.HERMES_BROWSER_LIVE_DM === "true";

let contextPromise;

async function context() {
  if (!contextPromise) {
    contextPromise = chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless,
      viewport: { width: 1440, height: 1000 },
      args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
    });
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

async function screenshot(page, prefix) {
  const file = `/home/hermes-agent/workspace/evidence/${prefix}-${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: true });
  return file;
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
      const body = (await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")).slice(0, 1000).toLowerCase();
      const loggedOut = /login|log in|sign in|join now|create account/.test(body) && /login|checkpoint|challenge|auth/.test(current + body);
      platforms[name] = { reachable: true, logged_in: !loggedOut, current_url: current };
    } catch (error) {
      platforms[name] = { reachable: false, logged_in: false, error: String(error?.message || error) };
    }
  }
  await page.close();
  return {
    browser_available: true,
    persistent_profile: true,
    research_available: true,
    dm_available: liveDm,
    platforms,
    blockers: Object.entries(platforms).filter(([, v]) => !v.logged_in).map(([k]) => `${k}_login_required`),
  };
}

export async function researchLead(lead = {}) {
  const company = String(lead.business_name || lead.company || "").trim();
  const sourceUrl = String(lead.source_url || "").trim();
  const result = {
    provider: "playwright_droplet",
    business_name: company,
    official_website: "",
    public_email: "",
    public_phone: "",
    contact_sources: [],
    social_profiles: [],
    notes: [],
  };

  const startUrl = sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(company + " official website")}`;
  const page = await pageFor(startUrl);
  try {
    const text = await page.locator("body").innerText();
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || "";
    if (email) result.public_email = email;
    if (phone) result.public_phone = phone;
    if (email || phone) result.contact_sources.push(page.url());

    const links = await page.locator("a[href]").evaluateAll((els) => els.map((a) => ({ href: a.href, text: (a.textContent || "").trim() })).slice(0, 250));
    for (const link of links) {
      const platform = platformFromUrl(link.href);
      if (["linkedin", "facebook", "instagram", "x", "reddit"].includes(platform)) {
        result.social_profiles.push({ platform, url: link.href, verified: true, source_url: page.url() });
      } else if (!result.official_website && /^https?:\/\//.test(link.href) && !/google\.|bing\.|yahoo\./i.test(link.href)) {
        result.official_website = link.href;
      }
    }
    result.notes.push(`Research source: ${page.url()}`);
    return result;
  } finally {
    await page.close();
  }
}

async function linkedinSend(page, packet) {
  const messageButton = page.getByRole("button", { name: /message/i }).first();
  await messageButton.click({ timeout: 15000 });
  const composer = page.locator('[contenteditable="true"]').last();
  await composer.fill(packet.message);
  if (!liveDm) return { status: "prepared", thread_url: page.url(), screenshot_url: await screenshot(page, "linkedin-dm-prepared") };
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
