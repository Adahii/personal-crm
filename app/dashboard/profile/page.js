import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/utils/profile";
import { updateProfile, deleteProfileFile } from "@/app/actions";
import ProfileForm from "./profile-form";
import ProfileFileUploader from "./file-uploader";
import ConfirmSubmit from "@/components/confirm-submit";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getOrCreateProfile(supabase, user);

  const { data: filesData } = await supabase
    .from("profile_files")
    .select("*")
    .order("created_at", { ascending: true });
  const files = filesData ?? [];

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

      <section className="section" style={{ marginTop: 28 }}>
        <div className="section-title">
          <span className="label">Your shared files</span>
        </div>
        <div className="card">
          <div style={{ padding: "14px 16px 0" }}>
            <p className="hint" style={{ margin: 0 }}>
              Files here travel with your card — anyone who scans you can open
              them. The "share my files" toggle above turns this on or off
              everywhere at once.
            </p>
          </div>
          {files.map((f) => (
            <div key={f.id} className="attach">
              <span style={{ wordBreak: "break-all" }}>{f.file_name}</span>
              <ConfirmSubmit
                action={deleteProfileFile.bind(null, f.id, f.file_path)}
                message={`Remove ${f.file_name}? People will no longer see it.`}
                className="btn btn-danger"
              >
                <span style={{ fontSize: 12 }}>×</span>
              </ConfirmSubmit>
            </div>
          ))}
          <ProfileFileUploader />
        </div>
      </section>
    </>
  );
}
