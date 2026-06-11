"use client";

import Link from "next/link";
import SubmitButton from "@/components/submit-button";

export default function ContactForm({ action, contact = {}, submitLabel, cancelHref }) {
  return (
    <form action={action}>
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <span className="label">Identity</span>
        <div style={{ height: 12 }} />
        <div className="field">
          <label className="hint" htmlFor="name">
            Full name *
          </label>
          <input id="name" name="name" required defaultValue={contact.name || ""} />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="hint" htmlFor="role">
              Role / title
            </label>
            <input id="role" name="role" defaultValue={contact.role || ""} />
          </div>
          <div className="field">
            <label className="hint" htmlFor="company">
              Company
            </label>
            <input id="company" name="company" defaultValue={contact.company || ""} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label className="hint" htmlFor="industry">
              Industry
            </label>
            <input
              id="industry"
              name="industry"
              defaultValue={contact.industry || ""}
              placeholder="e.g. Manufacturing, Automotive"
            />
          </div>
          <div className="field">
            <label className="hint" htmlFor="location">
              Location
            </label>
            <input id="location" name="location" defaultValue={contact.location || ""} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <span className="label">Reach</span>
        <div style={{ height: 12 }} />
        <div className="field-row">
          <div className="field">
            <label className="hint" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={contact.email || ""} />
          </div>
          <div className="field">
            <label className="hint" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" defaultValue={contact.phone || ""} />
          </div>
        </div>
        <div className="field">
          <label className="hint" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={(contact.tags || []).join(", ")}
            placeholder="comma separated — e.g. prospect, mentor, conference"
          />
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <span className="label">What to remember</span>
        <div style={{ height: 12 }} />
        <div className="field">
          <label className="hint" htmlFor="professional_notes">
            Professional context — their goals, what they own, how you can help
          </label>
          <textarea
            id="professional_notes"
            name="professional_notes"
            defaultValue={contact.professional_notes || ""}
          />
        </div>
        <div className="field">
          <label className="hint" htmlFor="personal_notes">
            Personal details — family, hobbies, background, things they care about
          </label>
          <textarea
            id="personal_notes"
            name="personal_notes"
            defaultValue={contact.personal_notes || ""}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
