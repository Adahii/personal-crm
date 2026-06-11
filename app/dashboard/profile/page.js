import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/utils/profile";
import { updateProfile } from "@/app/actions";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getOrCreateProfile(supabase, user);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Profile</span>
          <h1>Your card</h1>
        </div>
      </div>
      <p className="muted" style={{ marginTop: -16, marginBottom: 24, maxWidth: 560 }}>
        This is what people receive when they add you. Fill it out once, then
        share it with a tap. Toggle off anything you'd rather keep private.
      </p>
      <ProfileForm action={updateProfile} profile={profile} />
    </>
  );
}
