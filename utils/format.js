// Shared display helpers (safe to import in server or client components).

export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / 86400000);
}

// Returns { level, label } describing how recently you've been in touch.
export function freshness(dateStr) {
  const d = daysSince(dateStr);
  if (d === null) return { level: "none", label: "no contact yet" };
  if (d <= 30) return { level: "fresh", label: `${d}d ago` };
  if (d <= 90) return { level: "warm", label: `${d}d ago` };
  return { level: "cold", label: `${d}d ago` };
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
