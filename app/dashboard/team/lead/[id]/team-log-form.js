"use client";

import { useRef } from "react";
import { addLeadInteraction } from "@/app/actions";
import SubmitButton from "@/components/submit-button";

const today = new Date().toISOString().slice(0, 10);

export default function TeamLogForm({ leadId, orgId }) {
  const ref = useRef(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addLeadInteraction(fd);
        ref.current?.reset();
      }}
      className="card"
      style={{ padding: 20, marginBottom: 20 }}
    >
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="org_id" value={orgId} />
      <span className="label">Log a conversation — visible to your whole team</span>
      <div style={{ height: 12 }} />
      <div className="field" style={{ maxWidth: 200 }}>
        <label className="hint" htmlFor="occurred_on">When</label>
        <input id="occurred_on" name="occurred_on" type="date" defaultValue={today} />
      </div>
      <div className="field">
        <label className="hint" htmlFor="topics">What was discussed</label>
        <textarea id="topics" name="topics" style={{ minHeight: 64 }}
          placeholder="Pain points, timeline, who else is involved…" />
      </div>
      <div className="field">
        <label className="hint" htmlFor="next_steps">Next steps</label>
        <input id="next_steps" name="next_steps" placeholder="Send pricing by Friday, intro to engineering…" />
      </div>
      <SubmitButton pendingText="Logging…">Log it</SubmitButton>
    </form>
  );
}
