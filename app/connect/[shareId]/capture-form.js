"use client";

import { useState } from "react";
import { captureLead } from "@/app/actions";

// The 10-second "share my info" form for visitors without an account.
export default function CaptureForm({ shareId, repName, orgName }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (done) {
    return (
      <div className="notice ok" style={{ textAlign: "center" }}>
        Done — {repName} has your info. Check your email later to claim your
        own free Soyo88 card.
      </div>
    );
  }

  return (
    <form
      action={async (fd) => {
        setBusy(true);
        setError("");
        const res = await captureLead(shareId, fd);
        if (res?.ok) setDone(true);
        else setError(res?.message || "Something went wrong — try again.");
        setBusy(false);
      }}
    >
      {error && <div className="notice err">{error}</div>}
      <div className="field">
        <label className="hint" htmlFor="name">Your name *</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="hint" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label className="hint" htmlFor="company">Company</label>
          <input id="company" name="company" autoComplete="organization" />
        </div>
      </div>
      <div className="field">
        <label className="hint" htmlFor="note">Anything to remember? (optional)</label>
        <input id="note" name="note" placeholder="What you'd like to follow up about" />
      </div>
      <button type="submit" className="btn btn-block" disabled={busy}>
        {busy ? "Sharing…" : `Share my info with ${repName}`}
      </button>
      <p className="hint" style={{ textAlign: "center", marginBottom: 0 }}>
        Your info will be visible to {orgName}'s team.
      </p>
    </form>
  );
}
