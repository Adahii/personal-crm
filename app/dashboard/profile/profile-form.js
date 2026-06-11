"use client";

import { useState } from "react";
import Avatar from "@/components/avatar";
import SubmitButton from "@/components/submit-button";

// A field paired with its "share this" checkbox.
function ShareField({ label, name, shareName, defaultValue, defaultShare, type = "input", placeholder }) {
  return (
    <div className="field">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <label className="hint" htmlFor={name}>
          {label}
        </label>
        <label className="share-toggle">
          <input type="checkbox" name={shareName} defaultChecked={defaultShare} />
          share
        </label>
      </div>
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue || ""}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={name}
          name={name}
          defaultValue={defaultValue || ""}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export default function ProfileForm({ action, profile }) {
  const [preview, setPreview] = useState(profile.avatar_url || null);

  function onPick(e) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={action}>
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <span className="label">Photo &amp; name</span>
        <div style={{ height: 16 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <Avatar name={profile.full_name} url={preview} size={72} />
          <div style={{ flex: "1 1 220px" }}>
            <input type="file" name="avatar" accept="image/*" onChange={onPick} style={{ fontSize: 13, padding: 6 }} />
            <label className="share-toggle" style={{ marginTop: 8 }}>
              <input type="checkbox" name="share_avatar" defaultChecked={profile.share_avatar} />
              share my photo
            </label>
          </div>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label className="hint" htmlFor="full_name">
            Full name (always shared)
          </label>
          <input id="full_name" name="full_name" required defaultValue={profile.full_name || ""} />
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <span className="label">Work</span>
        <div style={{ height: 16 }} />
        <div className="field-row">
          <ShareField label="Current role" name="role" shareName="share_role" defaultValue={profile.role} defaultShare={profile.share_role} />
          <ShareField label="Company" name="company" shareName="share_company" defaultValue={profile.company} defaultShare={profile.share_company} />
        </div>
        <ShareField
          label="Job overview"
          name="job_overview"
          shareName="share_job_overview"
          defaultValue={profile.job_overview}
          defaultShare={profile.share_job_overview}
          type="textarea"
          placeholder="What you do, what you're responsible for, what you're looking for"
        />
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <span className="label">Reach &amp; about</span>
        <div style={{ height: 16 }} />
        <div className="field-row">
          <ShareField label="Work email" name="work_email" shareName="share_work_email" defaultValue={profile.work_email} defaultShare={profile.share_work_email} />
          <ShareField label="Phone" name="phone" shareName="share_phone" defaultValue={profile.phone} defaultShare={profile.share_phone} />
        </div>
        <ShareField
          label="Personal overview"
          name="personal_overview"
          shareName="share_personal_overview"
          defaultValue={profile.personal_overview}
          defaultShare={profile.share_personal_overview}
          type="textarea"
          placeholder="Hobbies, where you're from, family, anything that sparks a real conversation"
        />
      </div>

      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
