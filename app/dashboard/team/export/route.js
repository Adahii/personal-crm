import { createClient } from "@/utils/supabase/server";

function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Downloads the team's captured contacts as CSV. RLS scopes everything
// to the caller's organization automatically.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return new Response("No team", { status: 404 });

  const [{ data: leads }, { data: events }, { data: members }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: false }),
      supabase.from("org_events").select("id, name").eq("org_id", membership.org_id),
      supabase.from("org_members").select("user_id").eq("org_id", membership.org_id),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const eventName = Object.fromEntries((events ?? []).map((e) => [e.id, e.name]));
  const repName = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  const header = [
    "name", "email", "company", "role", "phone", "note",
    "status", "source", "event", "captured_by", "captured_at",
  ];
  const rows = (leads ?? []).map((l) =>
    [
      l.name, l.email, l.company, l.role, l.phone, l.note,
      l.status, l.source === "connection" ? "mutual connect" : "quick form",
      l.event_id ? eventName[l.event_id] : "",
      repName[l.rep_user_id] || "",
      l.created_at,
    ].map(csvCell).join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="soyo88-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
