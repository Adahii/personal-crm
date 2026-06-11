// The Soyo wordmark: "soy" + a QR-finder ring as the final "o".
// Pure CSS so it stays crisp at any size. `size` is the font size in px.
export default function Logo({ size = 22, light = false }) {
  return (
    <span
      className={`wordmark${light ? " wordmark-light" : ""}`}
      style={{ fontSize: size }}
      aria-label="Soyo"
    >
      soy
      <span className="wordmark-ring" aria-hidden="true" />
    </span>
  );
}
