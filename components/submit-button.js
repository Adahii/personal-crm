"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, pendingText = "Saving…", className = "btn" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
