"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function parseTags(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Pull contact fields out of a submitted form.
function readContact(formData) {
  return {
    name: formData.get("name")?.trim(),
    company: formData.get("company")?.trim() || null,
    industry: formData.get("industry")?.trim() || null,
    role: formData.get("role")?.trim() || null,
    email: formData.get("email")?.trim() || null,
    phone: formData.get("phone")?.trim() || null,
    location: formData.get("location")?.trim() || null,
    tags: parseTags(formData.get("tags")),
    personal_notes: formData.get("personal_notes")?.trim() || null,
    professional_notes: formData.get("professional_notes")?.trim() || null,
  };
}

export async function createContact(formData) {
  const supabase = await createClient();
  const data = readContact(formData);
  if (!data.name) return;

  const { data: row, error } = await supabase
    .from("contacts")
    .insert(data)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/contacts");
  redirect(`/dashboard/contacts/${row.id}`);
}

export async function updateContact(id, formData) {
  const supabase = await createClient();
  const data = readContact(formData);
  if (!data.name) return;

  const { error } = await supabase.from("contacts").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/contacts/${id}`);
  redirect(`/dashboard/contacts/${id}`);
}

export async function deleteContact(id) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/contacts");
  redirect("/dashboard/contacts");
}

export async function addInteraction(formData) {
  const supabase = await createClient();
  const contactId = formData.get("contact_id");
  const occurredOn =
    formData.get("occurred_on") || new Date().toISOString().slice(0, 10);

  const payload = {
    contact_id: contactId,
    occurred_on: occurredOn,
    topics: formData.get("topics")?.trim() || null,
    next_steps: formData.get("next_steps")?.trim() || null,
    notes: formData.get("notes")?.trim() || null,
  };

  const { error } = await supabase.from("interactions").insert(payload);
  if (error) throw new Error(error.message);

  // Keep the contact's "last contacted" stamp current.
  await supabase
    .from("contacts")
    .update({ last_contacted_at: occurredOn })
    .eq("id", contactId);

  revalidatePath(`/dashboard/contacts/${contactId}`);
  revalidatePath("/dashboard");
}

export async function deleteInteraction(id, contactId) {
  const supabase = await createClient();
  await supabase.from("interactions").delete().eq("id", id);
  revalidatePath(`/dashboard/contacts/${contactId}`);
}

export async function uploadAttachment(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const contactId = formData.get("contact_id");
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${contactId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("attachments")
    .upload(path, file, { upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { error } = await supabase.from("attachments").insert({
    contact_id: contactId,
    file_name: file.name,
    file_path: path,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/contacts/${contactId}`);
}

export async function deleteAttachment(id, filePath, contactId) {
  const supabase = await createClient();
  await supabase.storage.from("attachments").remove([filePath]);
  await supabase.from("attachments").delete().eq("id", id);
  revalidatePath(`/dashboard/contacts/${contactId}`);
}

// ---------------------------------------------------------------------------
//  v2: profile, sharing, and QR connections
// ---------------------------------------------------------------------------

export async function updateProfile(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const updates = {
    full_name: formData.get("full_name")?.trim() || null,
    phone: formData.get("phone")?.trim() || null,
    work_email: formData.get("work_email")?.trim() || null,
    role: formData.get("role")?.trim() || null,
    company: formData.get("company")?.trim() || null,
    job_overview: formData.get("job_overview")?.trim() || null,
    personal_overview: formData.get("personal_overview")?.trim() || null,
    share_avatar: formData.get("share_avatar") === "on",
    share_phone: formData.get("share_phone") === "on",
    share_work_email: formData.get("share_work_email") === "on",
    share_role: formData.get("share_role") === "on",
    share_company: formData.get("share_company") === "on",
    share_job_overview: formData.get("share_job_overview") === "on",
    share_personal_overview: formData.get("share_personal_overview") === "on",
  };

  // Optional new photo.
  const file = formData.get("avatar");
  if (file && typeof file !== "string" && file.size > 0) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    updates.avatar_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/card");
}

// Rotate the share link, invalidating any QR codes already out there.
export async function regenerateShareLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("profiles")
    .update({ share_id: randomUUID() })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/card");
}

// Triggered when you tap "Add" on someone's connect page.
export async function connectWith(shareId) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("connect_with", {
    p_share_id: shareId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  redirect(`/dashboard/contacts/${data}`);
}
