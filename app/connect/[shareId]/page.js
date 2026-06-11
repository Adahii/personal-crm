import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/utils/profile";
import { connectWith } from "@/app/actions";
import Avatar from "@/components/avatar";
import Logo from "@/components/logo";
import SubmitButton from "@/components/submit-button";

export default async function ConnectPage({ params }) {
  const { shareId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guarantees a signed-in user here.
  const myProfile = await getOrCreateProfile(supabase, user);
  const { data: profile } = await supabase.rpc("get_shared_profile", {
    p_share_id: shareId,
  });

  // Unknown or inactive link.
  if (!profile) {
    return (
      <Shell>
        <div style={{ padding: 28, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Card not found</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            This link is invalid or has been reset. Ask them to pull up their
            card again.
          </p>
          <div style={{ marginTop: 18 }}>
            <Link href="/dashboard" className="btn btn-ghost">
              Back to app
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const isSelf = myProfile?.share_id === profile.share_id;

  const facts = [
    [profile.role, profile.company].filter(Boolean).join(" · "),
    profile.work_email,
    profile.phone,
  ].filter(Boolean);

  return (
    <Shell>
      <div className="card-preview">
        <Avatar name={profile.full_name} url={profile.avatar_url} size={64} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{profile.full_name}</div>
          {facts.map((f, i) => (
            <div key={i} className="muted" style={{ fontSize: 13 }}>
              {f}
            </div>
          ))}
        </div>
      </div>

      {(profile.job_overview || profile.personal_overview) && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          {profile.job_overview && (
            <p style={{ margin: "0 0 10px", fontSize: 14, whiteSpace: "pre-wrap" }}>
              {profile.job_overview}
            </p>
          )}
          {profile.personal_overview && (
            <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>
              {profile.personal_overview}
            </p>
          )}
        </div>
      )}

      <div style={{ padding: 20 }}>
        {isSelf ? (
          <p className="muted" style={{ fontSize: 14, textAlign: "center", margin: 0 }}>
            This is your own card — share it with someone else to connect.
          </p>
        ) : (
          <>
            <form action={connectWith.bind(null, shareId)}>
              <SubmitButton className="btn btn-block" pendingText="Adding…">
                Add to my contacts
              </SubmitButton>
            </form>
            <p className="hint" style={{ textAlign: "center", marginBottom: 0 }}>
              They'll be saved to your contacts, and you'll be added to theirs.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="connect-wrap">
      <div className="connect-card">
        <div className="connect-head">
          <Logo size={18} />
          <span className="eyebrow">New connection</span>
        </div>
        {children}
      </div>
    </div>
  );
}
