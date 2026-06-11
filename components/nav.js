"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/dashboard/contacts", label: "People", icon: PeopleIcon },
  { href: "/dashboard/card", label: "My card", icon: QrIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
];

function isActive(href, pathname) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

// Desktop: pill links in the top bar.
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="topnav">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`navlink${isActive(l.href, pathname) ? " active" : ""}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

// Mobile: fixed bottom tab bar.
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar">
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`tab${isActive(l.href, pathname) ? " active" : ""}`}
          >
            <Icon />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* Simple stroke icons, inherit currentColor */
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M18.5 15.5c1.6.7 2.7 2 3 4.5" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c1-3.8 4-6 7.5-6s6.5 2.2 7.5 6" />
    </svg>
  );
}
