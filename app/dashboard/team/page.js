import { createClient } from "@/utils/supabase/server";
import {
  createOrganization,
  inviteMember,
  acceptInvite,
  updateWorkCard,
} from "@/app/actions";
import { formatDate } from "@/utils/format";
import SubmitButton from "@/components/submit-button";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // My membership (pass one: a user belongs to at most one org in the UI)
  const { data: membership } = await supabase
    .from("org_members")
    .select("*, organizations(id, name, domain)")
    .eq("user_id", user.id)
    .maybeSingle();

  // Pending invites addressed to my email
  const { data: invites = [] } = await supabase
    .from("org_invites")
    .select("*")
    .eq("accepted", false)
    .ilike("email", user.email || "");

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

  const org = membership.organizations;
  const isAdmin = membership.role === "admin";

  const { data: members = [] } = await supabase
    .from("org_members")
    .select("id, user_id, role, title, profiles:user_id(full_name)")
    .eq("org_id", org.id);

  const { data: pending = [] } = isAdmin
    ? await supabase
        .from("org_invites")
        .select("*")
        .eq("org_id", org.id)
        .eq("accepted", false)
    : { data: [] };

  const { data: leads = [] } = await supabase
    .from("leads")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const repNames = Object.fromEntries(
    members.map((m) => [m.user_id, m.profiles?.full_name || "Member"])
  );

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Team · {isAdmin ? "Admin" : "Member"}</span>
          <h1>{org.name}</h1>
        </div>
      </div>

      <section className="section">
        <div className="section-title">
          <span className="label">Your work card</span>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <p className="hint" style={{ marginTop: 0 }}>
            This is the card you share on the job — separate from your personal
            one. People who connect with it go to your contacts <em>and</em> to{" "}
            {org.name}'s captured list. Find its QR under <strong>My card</strong>.
          </p>
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
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <label className="share-toggle" style={{ marginBottom: 10 }}>
                  <input type="checkbox" name="card_active" defaultChecked={membership.card_active} />
                  card active
                </label>
              </div>
            </div>
            <div className="field">
              <label className="hint" htmlFor="headline">One-line pitch</label>
              <input id="headline" name="headline" defaultValue={membership.headline || ""} placeholder="I help plants automate quality inspection" />
            </div>
            <SubmitButton pendingText="Saving…">Save work card</SubmitButton>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span className="label">Captured contacts · {leads.length}</span>
        </div>
        <div className="card">
          {leads.length === 0 ? (
            <div className="empty">
              <p>
                Nothing yet. Share a work card QR at your next event — every
                person who connects or fills the quick form lands here.
              </p>
            </div>
          ) : (
            leads.map((l) => (
              <div key={l.id} className="timeline-item">
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <strong>{l.name}</strong>
                  <span className="meta muted" style={{ fontSize: 12 }}>
                    {formatDate(l.created_at)} · via {repNames[l.rep_user_id] || "rep"} ·{" "}
                    {l.source === "connection" ? "mutual connect" : "quick form"}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {[l.role, l.company, l.email, l.phone].filter(Boolean).join(" · ") || "No details shared"}
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
          {members.map((m) => (
            <div key={m.id} className="contact-row">
              <div>
                <div className="nm">{m.profiles?.full_name || "Member"}</div>
                <div className="meta">{m.title || "—"}</div>
              </div>
              <span className="tag">{m.role}</span>
            </div>
          ))}
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
                  <div key={p.id} className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
                    {p.email} · {p.role}
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
