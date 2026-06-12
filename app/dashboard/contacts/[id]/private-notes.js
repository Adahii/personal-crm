"use client";

import { updateContactPrivateNotes } from "@/app/actions";
import SubmitButton from "@/components/submit-button";

export default function PrivateNotes({ contactId, value }) {
  return (
    <form
      action={updateContactPrivateNotes.bind(null, contactId)}
      className="card"
      style={{ padding: 18, marginBottom: 28 }}
    >
      <span className="label">Your private notes</span>
      <p className="hint" style={{ margin: "6px 0 10px" }}>
        Only you can see these — they never sync or share, even for connected
        contacts.
      </p>
      <textarea
        name="private_notes"
        defaultValue={value || ""}
        placeholder="How you met, what to remember, your read on them…"
        style={{ minHeight: 90 }}
      />
      <div style={{ marginTop: 10 }}>
        <SubmitButton pendingText="Saving…" className="btn btn-ghost">
          Save notes
        </SubmitButton>
      </div>
    </form>
  );
}
