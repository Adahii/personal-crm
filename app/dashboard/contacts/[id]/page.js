import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { freshness, formatDate } from "@/utils/format";
import Avatar from "@/components/avatar";
import {
  deleteContact,
  deleteInteraction,
  deleteAttachment,
} from "@/app/actions";
import InteractionForm from "./interaction-form";
import AttachmentUploader from "./attachment-uploader";
import PrivateNotes from "./private-notes";
import ConfirmSubmit from "@/components/confirm-submit";

export default async function ContactDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (!contact) notFound();

  const [{ data: interactionsData }, { data: attachmentsData }, sharedFilesRes] =
    await Promise.all([
      supabase
        .from("interactions")
        .select("*")
        .eq("contact_id", id)
        .order("occurred_on", { ascending: false }),
      supabase
        .from("attachments")
        .select("*")
        .eq("contact_id", id)
        .order("created_at", { ascending: false }),
      contact.linked_user_id
        ? supabase.rpc("get_contact_shared_files", { p_contact: id })
        : Promise.resolve({ data: [] }),
    ]);
  const interactions = interactionsData ?? [];
  const attachments = attachmentsData ?? [];
  const sharedFiles = sharedFilesRes?.data ?? [];
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-files/`;

  // Short-lived signed URLs so private files stay private.
  const signed = {};
  for (const a of attachments) {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(a.file_path, 3600);
    signed[a.id] = data?.signedUrl;
  }

  const f = freshness(contact.last_contacted_at);

  return (
    <>
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={contact.name} url={contact.avatar_url} size={52} />
          <div>
            <span className="eyebrow">
              {[contact.role, contact.company].filter(Boolean).join(" · ") ||
                "Contact"}
            </span>
            <h1>{contact.name}</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className={`pill ${f.level}`}>{f.label}</span>
          <Link href={`/dashboard/contacts/${id}/edit`} className="btn btn-ghost">
            Edit
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left column: profile + conversation timeline */}
        <div>
          <dl className="card kv" style={{ marginBottom: 28 }}>
            <dt>Industry</dt>
            <dd>{contact.industry || "—"}</dd>
            <dt>Location</dt>
            <dd>{contact.location || "—"}</dd>
            <dt>Email</dt>
            <dd>
              {contact.email ? (
                <a href={`mailto:${contact.email}`} style={{ color: "var(--crimson)" }}>
                  {contact.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt>Phone</dt>
            <dd>{contact.phone || "—"}</dd>
            <dt>Tags</dt>
            <dd>
              {(contact.tags || []).length ? (
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {contact.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </span>
              ) : (
                "—"
              )}
            </dd>
          </dl>

          {(contact.professional_notes || contact.personal_notes) && (
            <div className="card" style={{ padding: 20, marginBottom: 28 }}>
              {contact.professional_notes && (
                <div style={{ marginBottom: 16 }}>
                  <span className="label">Professional context</span>
                  <p style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>
                    {contact.professional_notes}
                  </p>
                </div>
              )}
              {contact.personal_notes && (
                <div>
                  <span className="label">Personal details</span>
                  <p style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>
                    {contact.personal_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <PrivateNotes contactId={id} value={contact.private_notes} />

          <section className="section">
            <div className="section-title">
              <span className="label">Conversation history</span>
            </div>

            <InteractionForm contactId={id} />

            <div className="card">
              {interactions.length === 0 ? (
                <div className="empty">
                  <p>No conversations logged yet. Add the first one above.</p>
                </div>
              ) : (
                interactions.map((i) => (
                  <div key={i.id} className="timeline-item">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <span className="date">{formatDate(i.occurred_on)}</span>
                      <ConfirmSubmit
                        action={deleteInteraction.bind(null, i.id, id)}
                        message="Delete this log entry?"
                        className="btn btn-danger"
                      >
                        <span style={{ fontSize: 12 }}>Delete</span>
                      </ConfirmSubmit>
                    </div>
                    {i.topics && (
                      <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>
                        {i.topics}
                      </p>
                    )}
                    {i.next_steps && (
                      <>
                        <div className="field-label">Next steps</div>
                        <p style={{ margin: "2px 0 0" }}>{i.next_steps}</p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right column: attachments + danger zone */}
        <div>
          {sharedFiles.length > 0 && (
            <section className="section">
              <div className="section-title">
                <span className="label">Their shared files</span>
              </div>
              <div className="card">
                {sharedFiles.map((f) => (
                  <div key={f.path} className="attach">
                    <a
                      href={`${publicBase}${f.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--crimson)", wordBreak: "break-all" }}
                    >
                      {f.name}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-title">
              <span className="label">Files</span>
            </div>
            <div className="card">
              {attachments.length === 0 ? (
                <div className="empty" style={{ padding: "24px 16px" }}>
                  <p style={{ fontSize: 13 }}>
                    Business cards, docs, anything worth keeping.
                  </p>
                </div>
              ) : (
                attachments.map((a) => (
                  <div key={a.id} className="attach">
                    <a
                      href={signed[a.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--crimson)", wordBreak: "break-all" }}
                    >
                      {a.file_name}
                    </a>
                    <ConfirmSubmit
                      action={deleteAttachment.bind(null, a.id, a.file_path, id)}
                      message="Delete this file?"
                      className="btn btn-danger"
                    >
                      <span style={{ fontSize: 12 }}>×</span>
                    </ConfirmSubmit>
                  </div>
                ))
              )}
              <AttachmentUploader contactId={id} />
            </div>
          </section>

          <section className="section">
            <div className="section-title">
              <span className="label" style={{ color: "var(--danger)" }}>
                Danger zone
              </span>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <p className="hint" style={{ marginTop: 0 }}>
                Removes this person and all their logged history.
              </p>
              <ConfirmSubmit
                action={deleteContact.bind(null, id)}
                message={`Delete ${contact.name} permanently?`}
              >
                Delete contact
              </ConfirmSubmit>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
