"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./components/AuthProvider";

function SpotlightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="10" r="5" fill="currentColor" />
      <path d="M14 15 L6 36 L34 36 L26 15 Q20 19 14 15Z" fill="currentColor" opacity="0.35" />
      <circle cx="20" cy="10" r="2.5" fill="white" opacity="0.7" />
      <line x1="6" y1="36" x2="34" y2="36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function I({ d, extra }: { d: string; extra?: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
      {extra && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={extra} />}
    </svg>
  );
}

type NavEntry = { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean };
type NavGroup = { title: string; items: NavEntry[]; external?: { href: string; label: string } };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: <I d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    ],
  },
  {
    title: "Equipment Rentals",
    items: [
      { href: "/equipment", label: "Equipment", icon: <I d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
      { href: "/categories", label: "Categories", icon: <I d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /> },
      { href: "/reservations", label: "Reservations", icon: <I d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
      { href: "/transactions", label: "Check-out / In", icon: <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
      { href: "/maintenance", label: "Maintenance", icon: <I d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" extra="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
      { href: "/clients", label: "Clients", icon: <I d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    ],
  },
  {
    title: "Online Store",
    external: { href: "/store", label: "View storefront" },
    items: [
      { href: "/shop", label: "Store Overview", icon: <I d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
      { href: "/shop/products", label: "Products", icon: <I d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
      { href: "/shop/orders", label: "Orders", icon: <I d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
      { href: "/shop/returns", label: "Returns", icon: <I d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" /> },
      { href: "/shop/reviews", label: "Reviews", icon: <I d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /> },
      { href: "/shop/departments", label: "Departments", icon: <I d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
      { href: "/shop/categories", label: "Shop Categories", icon: <I d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /> },
      { href: "/shop/delivery", label: "Delivery Zones", icon: <I d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" extra="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4l3 3v5a1 1 0 01-1 1h-1" /> },
      { href: "/shop/customers", label: "Customers", adminOnly: true, icon: <I d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    ],
  },
  {
    title: "Dyzah Errands",
    external: { href: "/services", label: "View errands site" },
    items: [
      { href: "/ops/services", label: "Errands Ops", icon: <I d="M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z" extra="M9 17h4l2-9h3M9 17l-2-7H4" /> },
    ],
  },
  {
    title: "Dyzah Hygiene",
    external: { href: "/hygiene", label: "View hygiene site" },
    items: [
      { href: "/ops/hygiene", label: "Hygiene Ops", icon: <I d="M12 3l-1.9 5.8a2 2 0 01-1.3 1.3L3 12l5.8 1.9a2 2 0 011.3 1.3L12 21l1.9-5.8a2 2 0 011.3-1.3L21 12l-5.8-1.9a2 2 0 01-1.3-1.3z" /> },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Staff & Users", adminOnly: true, icon: <I d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
      { href: "/audit", label: "Audit Log", adminOnly: true, icon: <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
    ],
  },
];

function NavItem({
  href, label, icon, active, onNavigate,
}: { href: string; label: string; icon: React.ReactNode; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-brand-500 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <span className={`transition-colors ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

function ExternalNavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 px-3 py-2 mt-0.5 rounded-xl text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 transition-all group"
    >
      <span className="text-slate-600 group-hover:text-slate-300">
        <I d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </span>
      {label}
    </a>
  );
}

function NavSection({
  group, isActive, isAdmin, onNavigate,
}: { group: NavGroup; isActive: (href: string) => boolean; isAdmin: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);
  const items = group.items.filter((item) => !item.adminOnly || isAdmin);
  if (items.length === 0) return null;
  return (
    <div className="pt-4 first:pt-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
      >
        <span>{group.title}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="space-y-0.5 mt-1">
          {items.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} onNavigate={onNavigate} />
          ))}
          {group.external && <ExternalNavLink href={group.external.href} label={group.external.label} />}
        </div>
      )}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "Administrator";

  const exact = new Set(["/admin", "/shop"]);
  const isActive = (href: string) =>
    exact.has(href) ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}
        className="w-full flex items-center gap-3 px-3 py-2.5 mb-3 rounded-xl text-sm font-medium text-slate-400 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-all group"
      >
        <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-600 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>

      {NAV_GROUPS.map((group) => (
        <NavSection key={group.title} group={group} isActive={isActive} isAdmin={isAdmin} onNavigate={onNavigate} />
      ))}

      <div className="pt-4">
        <ExternalNavLink href="/home" label="Dyzah Home" />
      </div>
    </nav>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/50">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <SpotlightIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Dyzah</p>
            <p className="text-slate-500 text-xs mt-0.5">Admin Console</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav links */}
      <NavLinks onNavigate={onClose} />

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 bg-brand-500/15 border border-brand-500/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-brand-400 text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-medium leading-tight truncate">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{user?.role ?? "Administrator"}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
            <SpotlightIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Dyzah Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[85vw] animate-slideIn">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
