// The Soyo88 wordmark: "soy" + a QR-finder ring as the "o", then "88".
// Pure CSS so it stays crisp at any size. `size` is the font size in px.
export default function Logo({ size = 22, light = false }) {
  return (
    <span
      className={`wordmark${light ? " wordmark-light" : ""}`}
      style={{ fontSize: size }}
      aria-label="Soyo88"
    >
      soy
      <span className="wordmark-ring" aria-hidden="true" />
      88
    </span>
  );
}
