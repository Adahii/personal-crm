"use client";

import { useTransition } from "react";
import { updateLeadStatus } from "@/app/actions";

// Inline status picker — saves on change.
export default function LeadStatus({ leadId, status }) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => start(() => updateLeadStatus(leadId, e.target.value))}
      style={{ width: "auto", padding: "5px 10px", fontSize: 13, borderRadius: 999 }}
    >
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="qualified">Qualified</option>
      <option value="archived">Archived</option>
    </select>
  );
}
