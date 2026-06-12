export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="skel" style={{ width: 90, height: 12, marginBottom: 10 }} />
      <div className="skel" style={{ width: 220, height: 28, marginBottom: 26 }} />
      <div className="skel" style={{ height: 84, borderRadius: 18, marginBottom: 14 }} />
      <div className="skel" style={{ height: 64, borderRadius: 18, marginBottom: 10 }} />
      <div className="skel" style={{ height: 64, borderRadius: 18, marginBottom: 10 }} />
      <div className="skel" style={{ height: 64, borderRadius: 18 }} />
    </div>
  );
}
