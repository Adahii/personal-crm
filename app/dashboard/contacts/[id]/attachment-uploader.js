"use client";

import { useRef } from "react";
import { uploadAttachment } from "@/app/actions";
import SubmitButton from "@/components/submit-button";

export default function AttachmentUploader({ contactId }) {
  const ref = useRef(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await uploadAttachment(fd);
        ref.current?.reset();
      }}
      style={{ padding: 14, borderTop: "1px solid var(--line)" }}
    >
      <input type="hidden" name="contact_id" value={contactId} />
      <input
        type="file"
        name="file"
        required
        style={{ fontSize: 13, marginBottom: 10, padding: 6 }}
      />
      <SubmitButton pendingText="Uploading…" className="btn btn-ghost">
        Upload file
      </SubmitButton>
    </form>
  );
}
