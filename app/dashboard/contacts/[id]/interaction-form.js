"use client";

import { useRef } from "react";
import { addInteraction } from "@/app/actions";
import SubmitButton from "@/components/submit-button";

const today = new Date().toISOString().slice(0, 10);

export default function InteractionForm({ contactId }) {
  const ref = useRef(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addInteraction(fd);
        ref.current?.reset();
      }}
      className="card"
      style={{ padding: 20, marginBottom: 20 }}
    >
      <input type="hidden" name="contact_id" value={contactId} />
      <span className="label">Log a conversation</span>
      <div style={{ height: 12 }} />
      <div className="field" style={{ maxWidth: 200 }}>
        <label className="hint" htmlFor="occurred_on">
          When
        </label>
        <input id="occurred_on" name="occurred_on" type="date" defaultValue={today} />
      </div>
      <div className="field">
        <label className="hint" htmlFor="topics">
          What you talked about
        </label>
        <textarea
          id="topics"
          name="topics"
          placeholder="Topics, news they shared, anything worth recalling"
          style={{ minHeight: 64 }}
        />
      </div>
      <div className="field">
        <label className="hint" htmlFor="next_steps">
          Next steps
        </label>
        <input
          id="next_steps"
          name="next_steps"
          placeholder="What you said you'd do, or want to follow up on"
        />
      </div>
      <SubmitButton pendingText="Logging…">Log it</SubmitButton>
    </form>
  );
}
