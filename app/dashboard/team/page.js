import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import {
  createOrganization,
  inviteMember,
  acceptInvite,
  updateWorkCard,
  createEvent,
  deleteEvent,
  deleteLead,
  updateMemberRole,
  removeMember,
  revokeInvite,
} from "@/app/actions";
import { formatDate } from "@/utils/format";
import SubmitButton from "@/components/submit-button";
import ConfirmSubmit from "@/components/confirm-submit";
import LeadStatus from "./lead-status";

export default async function TeamPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("org_members")
    .select("*, organizations(id, name, domain)")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: invitesData } = await supabase
    .from("org_invites")
    .select("*")
    .eq("accepted", false)
    .ilike("email", user.email || "");
  const invites = invitesData ?? [];

  // ----- No team yet: join or create -----
  if (!membership) {
    return (
      <>
        <div className="page-head">
          <div>
            <span className="eyebrow">Team</span>
            <h1>Work together</h1>
          </div>
        </div>

        {invites.length > 0 && (
          <section className="section">
            <div className="section-title">
              <span className="label">You're invited</span>
            </div>
            <div className="card">
              {invites.map((inv) => (
                <div key={inv.id} className="contact-row">
                  <div>
                    <div className="nm">{inv.org_name}</div>
                    <div className="meta">as {inv.role}</div>
                  </div>
                  <form action={acceptInvite.bind(null, inv.id)}>
                    <SubmitButton pendingText="Joining…">Join team</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-title">
            <span className="label">Create a team</span>
          </div>
          <div className="card" style={{ padding: 22 }}>
            <p className="hint" style={{ marginTop: 0 }}>
              A team gives every member a company work card to share at events,
              and collects the contacts they capture in one place.
            </p>
            <form action={createOrganization}>
              <div className="field">
                <label className="hint" htmlFor="name">Company name *</label>
                <input id="name" name="name" required placeholder="Acme Corp" />
              </div>
              <div className="field">
                <label className="hint" htmlFor="domain">Email domain (optional)</label>
                <input id="domain" name="domain" placeholder="acme.com" />
              </div>
              <SubmitButton pendingText="Creating…">Create team</SubmitButton>
            </form>
          </div>
        </section>
      </>
    );
  }

  // ----- Team home -----
  const org = membership.organizations;
  const isAdmin = membership.role === "admin";

  const [{ data: membersData }, { data: eventsData }, { data: allLeadsData }] =
    await Promise.all([
      supabase.from("org_members").select("id, user_id, role, title, current_event_id").eq("org_id", org.id),
      supabase.from("org_events").select("*").eq("org_id", org.id).order("starts_on", { ascending: false, nullsFirst: false }),
      supabase.from("leads").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
    ]);
  const members = membersData ?? [];
  const events = eventsData ?? [];
  const allLeads = allLeadsData ?? [];

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", members.map((m) => m.user_id));
  const nameById = Object.fromEntries((profilesData ?? []).map((p) => [p.id, p.full_name]));
  const eventById = Object.fromEntries(events.map((e) => [e.id, e.name]));

  // Stats
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = allLeads.filter((l) => new Date(l.created_at).getTime() > weekAgo).length;
  const qualified = allLeads.filter((l) => l.status === "qualified").length;

  // Filters from the query string
  const fEvent = sp.event || "";
  const fRep = sp.rep || "";
  const fStatus = sp.status || "";
  const leads = allLeads.filter((l) => {
    if (fEvent && l.event_id !== fEvent) return false;
    if (fRep && l.rep_user_id !== fRep) return false;
    if (fStatus && l.status !== fStatus) return false;
    return true;
  });

  const pendingData = isAdmin
    ? (await supabase.from("org_invites").select("*").eq("org_id", org.id).eq("accepted", false)).data
    : [];
  const pending = pendingData ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Team · {isAdmin ? "Admin" : "Member"}</span>
          <h1>{org.name}</h1>
        </div>
        <a href="/dashboard/team/export" className="btn btn-ghost">
          Export CSV
        </a>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <span className="label">Captured total</span>
          <div className="num">{allLeads.length}</div>
        </div>
        <div className="card stat">
          <span className="label">This week</span>
          <div className="num">{thisWeek}</div>
        </div>
        <div className="card stat">
          <span className="label">Qualified</span>
          <div className="num" style={{ color: "var(--ok)" }}>{qualified}</div>
        </div>
      </div>

      <section className="section">
        <div className="section-title">
          <span className="label">Your work card</span>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <form action={updateWorkCard.bind(null, membership.id)}>
            <div className="field-row">
              <div className="field">
                <label className="hint" htmlFor="title">Title</label>
                <input id="title" name="title" defaultValue={membership.title || ""} placeholder="Sales Engineer" />
              </div>
              <div className="field">
                <label className="hint" htmlFor="work_email">Work email</label>
                <input id="work_email" name="work_email" defaultValue={membership.work_email || ""} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="hint" htmlFor="work_phone">Work phone</label>
                <input id="work_phone" name="work_phone" defaultValue={membership.work_phone || ""} />
              </div>
              <div className="field">
                <label className="hint" htmlFor="current_event_id">Working event (tags your captures)</label>
                <select id="current_event_id" name="current_event_id" defaultValue={membership.current_event_id || ""}>
                  <option value="">No event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="hint" htmlFor="headline">One-line pitch</label>
              <input id="headline" name="headline" defaultValue={membership.headline || ""} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <SubmitButton pendingText="Saving…">Save work card</SubmitButton>
              <label className="share-toggle">
                <input type="checkbox" name="card_active" defaultChecked={membership.card_active} />
                card active
              </label>
              <Link href="/dashboard/card" className="hint" style={{ color: "var(--crimson)" }}>
                Show my work QR →
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span className="label">Events · {events.length}</span>
        </div>
        <div className="card">
          {events.length === 0 ? (
            <div className="empty">
              <p>No events yet{isAdmin ? " — add the conference you're working below." : "."}</p>
            </div>
          ) : (
            events.map((e) => {
              const count = allLeads.filter((l) => l.event_id === e.id).length;
              return (
                <div key={e.id} className="contact-row">
                  <div>
                    <div className="nm">{e.name}</div>
                    <div className="meta">{e.starts_on ? formatDate(e.starts_on) : "No date"} · {count} captured</div>
                  </div>
                  {isAdmin && (
                    <ConfirmSubmit
                      action={deleteEvent.bind(null, e.id)}
                      message={`Delete ${e.name}? Its leads stay, untagged.`}
                    >
                      <span style={{ fontSize: 12 }}>Delete</span>
                    </ConfirmSubmit>
                  )}
                </div>
              );
            })
          )}
          {isAdmin && (
            <form action={createEvent.bind(null, org.id)} style={{ padding: 16, borderTop: "1px solid var(--line)", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input name="name" required placeholder="Event name (e.g. AHR Expo 2027)" style={{ flex: "2 1 200px" }} />
              <input name="starts_on" type="date" style={{ flex: "1 1 140px" }} />
              <SubmitButton pendingText="Adding…">Add event</SubmitButton>
            </form>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span className="label">Captured contacts · {leads.length}{leads.length !== allLeads.length ? ` of ${allLeads.length}` : ""}</span>
        </div>

        <form className="toolbar" method="get">
          <select name="event" defaultValue={fEvent}>
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select name="rep" defaultValue={fRep}>
            <option value="">All reps</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>{nameById[m.user_id] || "Member"}</option>
            ))}
          </select>
          <select name="status" defaultValue={fStatus}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="archived">Archived</option>
          </select>
          <button type="submit" className="btn btn-ghost">Filter</button>
        </form>

        <div className="card">
          {leads.length === 0 ? (
            <div className="empty">
              <p>
                {allLeads.length === 0
                  ? "Nothing yet. Share a work card QR at your next event."
                  : "No matches — clear the filters."}
              </p>
            </div>
          ) : (
            leads.map((l) => (
              <div key={l.id} className="timeline-item">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <strong>{l.name}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LeadStatus leadId={l.id} status={l.status} />
                    {isAdmin && (
                      <ConfirmSubmit action={deleteLead.bind(null, l.id)} message={`Delete ${l.name}?`}>
                        <span style={{ fontSize: 12 }}>×</span>
                      </ConfirmSubmit>
                    )}
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {[l.role, l.company, l.email, l.phone].filter(Boolean).join(" · ") || "No details shared"}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {formatDate(l.created_at)} · via {nameById[l.rep_user_id] || "rep"} ·{" "}
                  {l.source === "connection" ? "mutual connect" : "quick form"}
                  {l.event_id && eventById[l.event_id] ? ` · ${eventById[l.event_id]}` : ""}
                </div>
                {l.note && <p style={{ margin: "6px 0 0", fontSize: 14 }}>{l.note}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span className="label">Members · {members.length}</span>
        </div>
        <div className="card">
          {members.map((m) => {
            const isMe = m.user_id === user.id;
            const count = allLeads.filter((l) => l.rep_user_id === m.user_id).length;
            return (
              <div key={m.id} className="contact-row">
                <div>
                  <div className="nm">
                    {nameById[m.user_id] || "Member"}
                    {isMe ? " (you)" : ""}
                  </div>
                  <div className="meta">{m.title || "—"} · {count} captured</div>
                </div>
                {isAdmin && !isMe ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <form action={updateMemberRole.bind(null, m.id)} style={{ display: "flex", gap: 6 }}>
                      <select name="role" defaultValue={m.role} style={{ width: "auto", padding: "5px 10px", fontSize: 13 }}>
                        <option value="rep">Rep</option>
                        <option value="admin">Admin</option>
                      </select>
                      <SubmitButton className="btn btn-ghost" pendingText="…">Set</SubmitButton>
                    </form>
                    <ConfirmSubmit
                      action={removeMember.bind(null, m.id)}
                      message={`Remove ${nameById[m.user_id] || "this member"}? Their captured contacts stay with the team.`}
                    >
                      <span style={{ fontSize: 12 }}>Remove</span>
                    </ConfirmSubmit>
                  </div>
                ) : (
                  <span className="tag">{m.role}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {isAdmin && (
        <section className="section">
          <div className="section-title">
            <span className="label">Invite a teammate</span>
          </div>
          <div className="card" style={{ padding: 22 }}>
            <form action={inviteMember.bind(null, org.id, org.name)}>
              <div className="field-row">
                <div className="field">
                  <label className="hint" htmlFor="email">Their email</label>
                  <input id="email" name="email" type="email" required placeholder="teammate@company.com" />
                </div>
                <div className="field">
                  <label className="hint" htmlFor="role">Role</label>
                  <select id="role" name="role" defaultValue="rep">
                    <option value="rep">Rep</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <SubmitButton pendingText="Inviting…">Send invite</SubmitButton>
              <p className="hint" style={{ marginBottom: 0 }}>
                They sign in with that email, open the Team tab, and tap Join.
              </p>
            </form>
            {pending.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <span className="label" style={{ fontSize: 11 }}>Waiting to join</span>
                {pending.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <span className="muted" style={{ fontSize: 13.5 }}>{p.email} · {p.role}</span>
                    <ConfirmSubmit action={revokeInvite.bind(null, p.id)} message={`Revoke the invite to ${p.email}?`}>
                      <span style={{ fontSize: 12 }}>Revoke</span>
                    </ConfirmSubmit>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
