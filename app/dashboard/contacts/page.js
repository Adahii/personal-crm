import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { freshness, daysSince } from "@/utils/format";
import Avatar from "@/components/avatar";

export default async function ContactsPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").toLowerCase();
  const industry = sp.industry || "";
  const tag = sp.tag || "";
  const sort = sp.sort || "stale";

  const supabase = await createClient();
  const { data: all = [] } = await supabase
    .from("contacts")
    .select(
      "id, name, company, industry, role, tags, last_contacted_at, avatar_url"
    );

  // Build filter option lists from the full set.
  const industries = [...new Set(all.map((c) => c.industry).filter(Boolean))].sort();
  const tags = [...new Set(all.flatMap((c) => c.tags || []))].sort();

  // Apply filters in memory (dataset is personal-scale).
  let rows = all.filter((c) => {
    if (q && !`${c.name} ${c.company || ""}`.toLowerCase().includes(q))
      return false;
    if (industry && c.industry !== industry) return false;
    if (tag && !(c.tags || []).includes(tag)) return false;
    return true;
  });

  rows.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    // "stale": longest-since-contact first (never-contacted on top).
    const da = daysSince(a.last_contacted_at);
    const db = daysSince(b.last_contacted_at);
    if (da === null) return -1;
    if (db === null) return 1;
    return db - da;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">People · {all.length}</span>
          <h1>Your contacts</h1>
        </div>
        <Link href="/dashboard/contacts/new" className="btn">
          + Add person
        </Link>
      </div>

      <form className="toolbar" method="get">
        <input
          type="search"
          name="q"
          placeholder="Search name or company…"
          defaultValue={sp.q || ""}
        />
        <select name="industry" defaultValue={industry}>
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={tag}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort}>
          <option value="stale">Sort: longest since contact</option>
          <option value="name">Sort: name (A–Z)</option>
        </select>
        <button type="submit" className="btn btn-ghost">
          Apply
        </button>
      </form>

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">
            {all.length === 0 ? (
              <>
                <p>No one here yet. Add the first person you want to remember.</p>
                <Link href="/dashboard/contacts/new" className="btn">
                  + Add person
                </Link>
              </>
            ) : (
              <p>No matches. Try clearing the filters.</p>
            )}
          </div>
        ) : (
          rows.map((c) => {
            const f = freshness(c.last_contacted_at);
            return (
              <Link
                key={c.id}
                href={`/dashboard/contacts/${c.id}`}
                className="contact-row"
              >
                <div className="who">
                  <Avatar name={c.name} url={c.avatar_url} />
                  <div>
                    <div className="nm">{c.name}</div>
                    <div className="meta">
                      {[c.role, c.company]
                        .filter(Boolean)
                        .join(" · ") || "No details yet"}
                    </div>
                  </div>
                </div>
                <span className={`pill ${f.level}`}>{f.label}</span>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
