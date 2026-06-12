"use client";

import { useRef } from "react";
import { uploadProfileFile } from "@/app/actions";
import SubmitButton from "@/components/submit-button";

export default function ProfileFileUploader() {
  const ref = useRef(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await uploadProfileFile(fd);
        ref.current?.reset();
      }}
      style={{ padding: 14, borderTop: "1px solid var(--line)" }}
    >
      <input type="file" name="file" required style={{ fontSize: 13, marginBottom: 10, padding: 6 }} />
      <SubmitButton pendingText="Uploading…" className="btn btn-ghost">
        Upload file
      </SubmitButton>
      <p className="hint" style={{ marginBottom: 0 }}>
        Resume, portfolio, one-pager — up to 10 MB each.
      </p>
    </form>
  );
}
