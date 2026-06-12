import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { freshness, formatDate } from "@/utils/format";
import Avatar from "@/components/avatar";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: contactsData }, { count: interactionCountRaw }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id, name, company, role, last_contacted_at, avatar_url")
        .order("last_contacted_at", { ascending: true, nullsFirst: true }),
      supabase
        .from("interactions")
        .select("id", { count: "exact", head: true }),
    ]);
  const contacts = contactsData ?? [];
  const interactionCount = interactionCountRaw ?? 0;

  const total = contacts.length;

  // "Reach out" = no contact in 60+ days, or never logged.
  const reachOut = contacts.filter((c) => {
    const f = freshness(c.last_contacted_at);
    return f.level === "cold" || f.level === "none";
  });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Good to see you</h1>
        </div>
        <Link href="/dashboard/contacts/new" className="btn">
          + Add person
        </Link>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <span className="label">People tracked</span>
          <div className="num">{total}</div>
        </div>
        <div className="card stat">
          <span className="label">Conversations logged</span>
          <div className="num">{interactionCount}</div>
        </div>
        <div className="card stat">
          <span className="label">Time to reconnect</span>
          <div className="num" style={{ color: "var(--crimson)" }}>
            {reachOut.length}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-title">
          <span className="label">Reconnect — quiet for 60+ days</span>
        </div>
        <div className="card">
          {reachOut.length === 0 ? (
            <div className="empty">
              <p>You're current with everyone. Nothing slipping through.</p>
            </div>
          ) : (
            reachOut.slice(0, 8).map((c) => {
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
                        {[c.role, c.company].filter(Boolean).join(" · ") ||
                          "No details yet"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`pill ${f.level}`}>{f.label}</span>
                    <div className="meta" style={{ marginTop: 4 }}>
                      {c.last_contacted_at
                        ? `last: ${formatDate(c.last_contacted_at)}`
                        : "never logged"}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
