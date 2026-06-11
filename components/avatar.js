import { initials } from "@/utils/format";

// Plain component (no hooks) so it works in server components.
export default function Avatar({ name, url, size = 38 }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size < 44 ? 13 : 17 }}
    >
      {initials(name)}
    </div>
  );
}
