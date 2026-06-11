"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QrCard({ shareId, name }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Build the absolute link in the browser so it works on localhost and prod.
  useEffect(() => {
    setUrl(`${window.location.origin}/connect/${shareId}`);
  }, [shareId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the field is selectable as a fallback.
    }
  }

  return (
    <div className="qr-stage">
      <div className="qr-frame">
        {url ? (
          <QRCodeSVG value={url} size={216} level="M" />
        ) : (
          <div style={{ width: 216, height: 216 }} />
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
      <div className="link-row">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-ghost" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
