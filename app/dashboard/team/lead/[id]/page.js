import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { formatDate } from "@/utils/format";
import { deleteLeadInteraction } from "@/app/actions";
import ConfirmSubmit from "@/components/confirm-submit";
import TeamLogForm from "./team-log-form";

export default async function TeamLeadPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be on a team; RLS scopes the lead to the member's org.
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/dashboard/team");

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: logsData } = await supabase
    .from("lead_interactions")
    .select("*")
    .eq("lead_id", id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  const logs = logsData ?? [];

  // Resolve author + capturing-rep names (no FK join to profiles)
  const userIds = [
    ...new Set([lead.rep_user_id, ...logs.map((l) => l.author_user_id)].filter(Boolean)),
  ];
  const { data: profilesData } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameById = Object.fromEntries(
    (profilesData ?? []).map((p) => [p.id, p.full_name])
  );

  const isAdmin = membership.role === "admin";
  const details = [
    lead.role,
    lead.company,
    lead.email,
    lead.phone,
  ].filter(Boolean);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <Link href="/dashboard/team" style={{ color: "var(--muted)" }}>
              Team
            </Link>{" "}
            · Captured contact
          </span>
          <h1>{lead.name}</h1>
        </div>
        <span className="tag">{lead.status}</span>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 24 }}>
        <div className="muted" style={{ fontSize: 14 }}>
          {details.length ? details.join(" · ") : "No details shared"}
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          Captured {formatDate(lead.created_at)} by{" "}
          {nameById[lead.rep_user_id] || "a teammate"} ·{" "}
          {lead.source === "connection" ? "mutual connect" : "quick form"}
        </div>
        {lead.note && (
          <p style={{ margin: "10px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>
            “{lead.note}”
          </p>
        )}
      </div>

      <section className="section">
        <div className="section-title">
          <span className="label">Team conversation log</span>
        </div>

        <TeamLogForm leadId={id} orgId={lead.org_id} />

        <div className="card">
          {logs.length === 0 ? (
            <div className="empty">
              <p>No conversations logged yet. Anything added here is visible
              to everyone on the team.</p>
            </div>
          ) : (
            logs.map((g) => {
              const canDelete = isAdmin || g.author_user_id === user.id;
              return (
                <div key={g.id} className="timeline-item">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span className="date">
                      {formatDate(g.occurred_on)}
                      <span className="muted" style={{ fontWeight: 500 }}>
                        {" "}· {nameById[g.author_user_id] || "former member"}
                      </span>
                    </span>
                    {canDelete && (
                      <ConfirmSubmit
                        action={deleteLeadInteraction.bind(null, g.id, id)}
                        message="Delete this log entry?"
                        className="btn btn-danger"
                      >
                        <span style={{ fontSize: 12 }}>Delete</span>
                      </ConfirmSubmit>
                    )}
                  </div>
                  {g.topics && (
                    <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{g.topics}</p>
                  )}
                  {g.next_steps && (
                    <>
                      <div className="field-label">Next steps</div>
                      <p style={{ margin: "2px 0 0" }}>{g.next_steps}</p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
