"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, isDemoMode, isLiveDataMode, logout, type User } from "@/lib/userAuth";
import {
  CREATE_ACTIONS,
  QUICK_ACTIONS,
  filterNavSections,
  getDefaultOpenSections,
  getFeatureFlags,
  getNavBadges,
  getVisibleNavSections,
  isNavItemActive,
  normalizeDashboardRole,
} from "@/lib/dashboardNav.mjs";

type ClientInfo = {
  name?: string;
  business_name?: string;
};

type BadgeCounts = Record<string, number>;

type NavItem = {
  label: string;
  icon: string;
  href: string;
  badgeKey?: string;
  isInternal?: boolean;
  isComingSoon?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

type SidebarContentProps = {
  client: ClientInfo | null;
  user: User | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onClose?: () => void;
};

const STORAGE_OPEN_SECTIONS = "ottoserv_sidebar_open_sections";
const STORAGE_COLLAPSED = "ottoserv_sidebar_collapsed";

function readClientInfo() {
  try {
    const stored = localStorage.getItem("ottoserv_client");
    return stored ? (JSON.parse(stored) as ClientInfo) : null;
  } catch {
    return null;
  }
}

function readOpenSections(pathname: string, sections: NavSection[]) {
  try {
    const stored = localStorage.getItem(STORAGE_OPEN_SECTIONS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...parsed, ...getActiveSectionLabels(sections as NavSection[], pathname)]));
      }
    }
  } catch {
    // localStorage may contain older data; fall back to safe defaults.
  }

  return Array.from(new Set([...getDefaultOpenSections(), ...getActiveSectionLabels(sections as NavSection[], pathname)]));
}

function getActiveSectionLabels(sections: NavSection[], pathname: string) {
  return sections
    .filter((section) => section.items.some((item) => isNavItemActive(item.href, pathname)))
    .map((section) => section.label);
}

function useSidebarBadges(user: User | null) {
  const demo = isDemoMode() || user?.role === "demo";
  const counts = demo
    ? { leads: 4, inbox: 2, tasks: 3, workOrders: 1, automations: 1, reports: 2 }
    : {};
  return getNavBadges(counts, isDemoMode() || user?.role === "demo") as BadgeCounts;
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ");
}

function SidebarContent({
  client,
  user,
  collapsed,
  onToggleCollapsed,
  onClose,
}: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [jarvisSetupOpen, setJarvisSetupOpen] = useState(false);
  const role = normalizeDashboardRole(user);
  const featureFlags = useMemo(() => getFeatureFlags(user), [user]);
  const visibleSections = useMemo<NavSection[]>(
    () => getVisibleNavSections({ role, featureFlags }) as NavSection[],
    [role, featureFlags]
  );
  const [openSections, setOpenSections] = useState<string[]>(() =>
    typeof window === "undefined" ? getDefaultOpenSections() : readOpenSections(pathname, visibleSections)
  );
  const badges = useSidebarBadges(user);
  const filteredSections = filterNavSections(visibleSections, query) as NavSection[];
  const workspaceName = client?.business_name || client?.name || "OttoServ Workspace";
  const profileName = client?.name || user?.name || "User";
  const isOwnerOrAdmin = role === "client_owner" || role === "ottoserv_admin";

  useEffect(() => {
    localStorage.setItem(STORAGE_OPEN_SECTIONS, JSON.stringify(openSections));
  }, [openSections]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function toggleSection(label: string) {
    setOpenSections((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  function goTo(href: string) {
    setCreateOpen(false);
    setProfileOpen(false);
    setWorkspaceOpen(false);
    onClose?.();
    router.push(href);
  }

  function handleLogout() {
    onClose?.();
    logout();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-800 px-3 py-3">
        <div className="relative">
          <button
            onClick={() => setWorkspaceOpen((open) => !open)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? workspaceName : undefined}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              O
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{workspaceName}</span>
                  <span className="block truncate text-xs capitalize text-gray-500">{roleLabel(role)}</span>
                </span>
                <span className="text-xs text-gray-500">{workspaceOpen ? "^" : "v"}</span>
              </>
            )}
          </button>

          {workspaceOpen && !collapsed && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-gray-700 bg-[#111827] p-2 shadow-xl">
              <p className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">Current workspace</p>
              <p className="px-3 text-sm font-medium text-white">{workspaceName}</p>
              <p className="px-3 pb-2 text-xs capitalize text-gray-500">{roleLabel(role)}</p>
              <button
                onClick={() => goTo("/dashboard/settings")}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Manage workspace
              </button>
              <button
                disabled
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600"
              >
                Switch workspace unavailable
              </button>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setCreateOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <span>+ Create</span>
              <span className="text-xs">{createOpen ? "^" : "v"}</span>
            </button>
            {createOpen && (
              <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-1.5">
                {CREATE_ACTIONS.map((action) => (
                  <button
                    key={action.href}
                    onClick={() => goTo(action.href)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#1f2937] px-3 py-2">
              <span className="text-xs text-gray-500">/</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages or actions..."
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-500"
              />
              <span className="hidden rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 xl:inline">
                Ctrl K
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <button
            onClick={() => setCreateOpen((open) => !open)}
            className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
            title="Create"
          >
            +
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Dashboard navigation">
        {query && !collapsed && (
          <div className="mb-3 rounded-xl border border-gray-800 bg-[#111827] p-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Quick actions
            </p>
            {QUICK_ACTIONS.filter((action) =>
              action.label.toLowerCase().includes(query.toLowerCase())
            ).map((action) => (
              <button
                key={action.href}
                onClick={() => goTo(action.href)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {filteredSections.map((section) => {
            const sectionActive = section.items.some((item) => isNavItemActive(item.href, pathname));
            const isOpen = collapsed || Boolean(query) || openSections.includes(section.label) || sectionActive;

            return (
              <section key={section.label}>
                {!collapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="flex w-full items-center justify-between rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300"
                    aria-expanded={isOpen}
                  >
                    <span>{section.label}</span>
                    <span className="text-xs">{isOpen ? "-" : "+"}</span>
                  </button>
                )}
                {isOpen && (
                  <ul className="mt-1 space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = isNavItemActive(item.href, pathname);
                      const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                      const disabled = item.isComingSoon;

                      const content = (
                        <>
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                              isActive
                                ? "bg-blue-500 text-white"
                                : item.isInternal
                                  ? "bg-red-950/50 text-red-300"
                                  : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {item.isInternal && (
                                <span className="rounded border border-red-900/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                                  Internal
                                </span>
                              )}
                              {disabled && (
                                <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500">
                                  Soon
                                </span>
                              )}
                              {badge ? (
                                <span className="ml-auto rounded-full bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                                  {badge}
                                </span>
                              ) : null}
                            </>
                          )}
                        </>
                      );

                      if (disabled) {
                        return (
                          <li key={item.href}>
                            <button
                              onClick={() => {
                                setQuery("");
                              }}
                              title={collapsed ? `${item.label} coming soon` : undefined}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-500 ${
                                collapsed ? "justify-center" : ""
                              }`}
                            >
                              {content}
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            title={collapsed ? item.label : undefined}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              collapsed ? "justify-center" : ""
                            } ${
                              isActive
                                ? "bg-blue-600/20 font-medium text-blue-300"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}
                          >
                            {content}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-gray-800 px-3 py-3">
        {!collapsed && (
          <button
            onClick={() => setJarvisSetupOpen(true)}
            className="mb-3 flex w-full items-center gap-2.5 rounded-lg border border-blue-600/30 bg-blue-600/10 px-3 py-2.5 text-left hover:border-blue-500/50 hover:bg-blue-600/20"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600/20 text-xs text-blue-300">
              J
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-blue-300">Get the Jarvis App</span>
              <span className="block truncate text-[10px] text-blue-500">Voice actions and mobile setup</span>
            </span>
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setProfileOpen((open) => !open)}
            className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? profileName : undefined}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-600/50 bg-blue-600/30 text-sm font-semibold text-blue-300">
              {profileName[0]?.toUpperCase() || "U"}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-white">{profileName}</span>
                  <span className="block truncate text-xs text-gray-500">{workspaceName}</span>
                </span>
                <span className="text-xs text-gray-500">{profileOpen ? "^" : "v"}</span>
              </>
            )}
          </button>

          {profileOpen && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-gray-700 bg-[#111827] p-1.5 shadow-xl">
              <button onClick={() => goTo("/dashboard/settings?panel=profile")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white">My Profile</button>
              <button onClick={() => goTo("/dashboard/settings?panel=workspace")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white">Workspace Settings</button>
              <button onClick={() => goTo("/dashboard/settings?panel=notifications")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white">Notification Settings</button>
              {isOwnerOrAdmin && (
                <button onClick={() => goTo("/dashboard/financials?panel=billing")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white">Billing</button>
              )}
              <button onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800">Sign out</button>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapsed}
          className="mt-3 hidden w-full rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-500 hover:border-gray-700 hover:text-gray-300 lg:block"
        >
          {collapsed ? "Expand" : "Collapse sidebar"}
        </button>
      </div>

      {jarvisSetupOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            aria-label="Close Jarvis setup"
            className="absolute inset-0 bg-black/70"
            onClick={() => setJarvisSetupOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-gray-700 bg-[#111827] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Set Up Jarvis</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              {[
                "Save OttoServ to home screen",
                "Enable voice actions",
                "Connect email/calendar",
                "Configure notifications",
                "Test Jarvis command",
              ].map((step) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0f1117] px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  {step}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => goTo("/jarvis-voice")}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Start setup
              </button>
              <button
                onClick={() => setJarvisSetupOpen(false)}
                className="flex-1 rounded-lg border border-gray-700 bg-[#1f2937] px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [client] = useState<ClientInfo | null>(() => {
    if (typeof window === "undefined") return null;
    return isLiveDataMode()
      ? { name: "Jonathan Bradley", business_name: "OttoServ Internal" }
      : readClientInfo();
  });
  const [user] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    return getCurrentUser();
  });
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_COLLAPSED) === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_COLLAPSED, String(collapsed));
  }, [collapsed]);

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#0f1117] transition-transform duration-200 lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-72"} border-r border-gray-800`}
      >
        <button
          onClick={onMobileClose}
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          x
        </button>
        <SidebarContent
          client={client}
          user={user}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onClose={onMobileClose}
        />
      </aside>
    </>
  );
}
