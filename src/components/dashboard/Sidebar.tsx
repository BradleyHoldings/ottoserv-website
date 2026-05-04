"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, isLiveDataMode } from "@/lib/userAuth";

interface ClientInfo {
  name: string;
  business_name: string;
}

interface NavItem {
  emoji: string;
  label: string;
  href: string;
  sub?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { emoji: "📊", label: "Command Center", href: "/dashboard/command-center" },
  { emoji: "🤖", label: "Ask Jarvis", href: "/dashboard/jarvis" },
  { emoji: "👥", label: "Leads", href: "/dashboard/leads" },
  { emoji: "💼", label: "CRM", href: "/dashboard/crm" },
  { emoji: "🏗️", label: "Projects", href: "/dashboard/projects" },
  { emoji: "📋", label: "Tasks", href: "/dashboard/tasks" },
  { emoji: "📅", label: "Calendar", href: "/dashboard/calendar" },
  { emoji: "💰", label: "Financials", href: "/dashboard/financials" },
  { emoji: "🔧", label: "Materials", href: "/dashboard/materials" },
  { emoji: "📨", label: "Inbox", href: "/dashboard/inbox" },
  { emoji: "📣", label: "Marketing", href: "/dashboard/marketing" },
  { emoji: "⚡", label: "Automations", href: "/dashboard/automations" },
  { emoji: "📈", label: "Reports", href: "/dashboard/reports" },
  { emoji: "📝", label: "SOPs", href: "/dashboard/sops" },
  { emoji: "🔌", label: "Integrations", href: "/dashboard/integrations" },
  { emoji: "📲", label: "Social Media", href: "/dashboard/social" },
  { emoji: "🎬", label: "Video Studio", href: "/dashboard/video" },
  { emoji: "📦", label: "Work Orders", href: "/dashboard/work-orders" },
  { emoji: "💵", label: "Job Costing", href: "/dashboard/job-costing" },
  { emoji: "🏢", label: "Vendors & Subs", href: "/dashboard/vendors" },
  { emoji: "👷", label: "Team / Labor", href: "/dashboard/team" },
  { emoji: "📁", label: "Documents", href: "/dashboard/documents" },
  { emoji: "🤖", label: "AI Agents", href: "/dashboard/agents" },
  { emoji: "🛠️", label: "TechOps", href: "/dashboard/techops" },
  { emoji: "🔮", label: "Intelligence", href: "/dashboard/intelligence" },
  { emoji: "🚀", label: "Growth Engine", href: "/dashboard/growth" },
  { emoji: "🧠", label: "Social Intelligence", href: "/dashboard/growth/intelligence", sub: true },
  { emoji: "🔬", label: "Process Intel", href: "/dashboard/processes" },
  { emoji: "🏪", label: "Marketplace", href: "/dashboard/marketplace" },
  { emoji: "🚀", label: "Deployments", href: "/dashboard/deployments" },
  { emoji: "⚙️", label: "Settings", href: "/dashboard/settings" },
  { emoji: "🔐", label: "Platform Admin", href: "/platform/dashboard" },
];

function SidebarContent({
  client,
  onClose,
}: {
  client: ClientInfo | null;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const currentUser = getCurrentUser();
  const isPaidClient = currentUser && currentUser.role !== 'demo';

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">OttoServ</p>
            <p className="text-gray-500 text-xs">Operations OS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" role="navigation" aria-label="Main navigation">
        <ul className="space-y-0.5" role="menu">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`nav-item mobile-nav-item touch-target keyboard-navigable
                    flex items-center gap-3 rounded-lg text-sm transition-colors focus:outline-none ${
                    item.sub ? "pl-7 pr-3 py-2" : "px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 font-medium"
                      : item.sub
                      ? "text-gray-500 hover:text-gray-300 hover:bg-gray-800/60"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                  {...(item.href === "/dashboard/command-center" && { "data-demo-target": "sidebar-command-center" })}
                  {...(item.href === "/dashboard/jarvis" && { "data-demo-target": "sidebar-jarvis" })}
                  {...(item.href === "/dashboard/leads" && { "data-demo-target": "sidebar-leads" })}
                  {...(item.href === "/dashboard/automations" && { "data-demo-target": "sidebar-automations" })}
                  {...(item.href === "/dashboard/social" && { "data-demo-target": "sidebar-social" })}
                  {...(item.href === "/dashboard/techops" && { "data-demo-target": "sidebar-techops" })}
                  {...(item.href === "/dashboard/reports" && { "data-demo-target": "sidebar-reports" })}
                >
                  {item.sub && (
                    <span className="text-gray-700 flex-shrink-0 text-xs">└</span>
                  )}
                  <span className={`text-base w-5 text-center flex-shrink-0 ${item.sub ? "text-sm" : ""}`}>
                    {item.emoji}
                  </span>
                  <span className={item.sub ? "text-xs" : ""}>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Get Jarvis App — paid clients only */}
      {isPaidClient && (
        <div className="px-3 pb-3">
          <a
            href="/jarvis-voice"
            onClick={onClose}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600/20 hover:border-blue-500/50 transition-colors group"
          >
            <span className="text-base">🎙️</span>
            <div className="min-w-0 flex-1">
              <p className="text-blue-300 text-xs font-semibold group-hover:text-blue-200">Get the Jarvis App</p>
              <p className="text-blue-500 text-[10px] truncate">Voice + actions · save to home screen</p>
            </div>
            <span className="text-blue-500 text-xs flex-shrink-0">→</span>
          </a>
        </div>
      )}

      {/* User info */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-600/50 flex items-center justify-center text-blue-400 text-sm font-semibold flex-shrink-0">
            {client?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {client?.name || "User"}
            </p>
            <p className="text-gray-500 text-xs truncate">
              {client?.business_name || "OttoServ Client"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const currentUser = getCurrentUser();
      const isAdminMode = isLiveDataMode();
      
      setUser(currentUser);
      setIsAdmin(isAdminMode);
      
      if (isAdminMode) {
        // Super admin - show admin data
        setClient({ name: "Jonathan Bradley", business_name: "OttoServ Super Admin" });
      } else {
        // Regular client
        const str = localStorage.getItem("ottoserv_client");
        if (str) setClient(JSON.parse(str));
      }
    } catch {
      // ignore
    }
  }, []);
  
  // Dynamic nav items based on user role
  const navItems = isAdmin ? [
    { emoji: "🔴", label: "Admin Dashboard", href: "/dashboard/admin" },
    { emoji: "👥", label: "Manage Clients", href: "/dashboard/admin/clients" },
    { emoji: "⚡", label: "Service Management", href: "/dashboard/admin/services" },
    { emoji: "📊", label: "Aggregate Analytics", href: "/dashboard/admin/analytics" },
    { emoji: "🎭", label: "Demo Environment", href: "/demo" },
    ...NAV_ITEMS.slice(2) // Skip command center and jarvis for admin
  ] : NAV_ITEMS;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-40 touch-target mobile-touch-target keyboard-navigable
                   rounded-lg bg-[#111827] border border-gray-700 text-gray-400 hover:text-white
                   transition-colors focus:outline-none"
        aria-label="Open sidebar navigation"
        aria-expanded={mobileOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1117] border-r border-gray-800 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>
        <SidebarContent client={client} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#0f1117] border-r border-gray-800 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
        <SidebarContent client={client} />
      </aside>
    </>
  );
}
