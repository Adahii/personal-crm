// Returns the signed-in user's profile, creating a starter row the first
// time. Used by the dashboard shell, profile page, and connect page so a
// profile (and share link) always exists.
export async function getOrCreateProfile(supabase, user) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const fallbackName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    null;

  const { data: created } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fallbackName,
      work_email: user.email || null,
    })
    .select("*")
    .maybeSingle();

  return created;
}
