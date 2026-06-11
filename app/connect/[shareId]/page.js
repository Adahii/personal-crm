import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/utils/profile";
import { connectWith, connectWithWork } from "@/app/actions";
import Avatar from "@/components/avatar";
import Logo from "@/components/logo";
import SubmitButton from "@/components/submit-button";
import CaptureForm from "./capture-form";

export default async function ConnectPage({ params }) {
  const { shareId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A share id is either a personal card or a work card.
  const { data: personal } = await supabase.rpc("get_shared_profile", {
    p_share_id: shareId,
  });
  const { data: work } = personal
    ? { data: null }
    : await supabase.rpc("get_work_card", { p_share_id: shareId });

  if (!personal && !work) {
    return (
      <Shell>
        <div style={{ padding: 28, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Card not found</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            This link is invalid or has been reset. Ask them to pull up their
            card again.
          </p>
          <div style={{ marginTop: 18 }}>
            <Link href="/" className="btn btn-ghost">Back to Soyo88</Link>
          </div>
        </div>
      </Shell>
    );
  }

  const card = personal || work;
  const isWork = !personal;
  const loginHref = `/login?next=${encodeURIComponent(`/connect/${shareId}`)}`;

  // Detect "this is my own card"
  let isSelf = false;
  if (user) {
    const myProfile = await getOrCreateProfile(supabase, user);
    if (personal) isSelf = myProfile?.share_id === personal.share_id;
    else {
      const { data: mine } = await supabase
        .from("org_members")
        .select("work_share_id")
        .eq("user_id", user.id)
        .eq("work_share_id", shareId)
        .maybeSingle();
      isSelf = Boolean(mine);
    }
  }

  const facts = isWork
    ? [
        [card.title, card.org_name].filter(Boolean).join(" · "),
        card.work_email,
        card.work_phone,
      ].filter(Boolean)
    : [
        [card.role, card.company].filter(Boolean).join(" · "),
        card.work_email,
        card.phone,
      ].filter(Boolean);

  return (
    <Shell>
      <div className="card-preview">
        <Avatar name={card.full_name} url={card.avatar_url} size={64} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{card.full_name}</div>
          {facts.map((f, i) => (
            <div key={i} className="muted" style={{ fontSize: 13 }}>{f}</div>
          ))}
        </div>
      </div>

      {(card.headline || card.job_overview || card.personal_overview) && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          {card.headline && (
            <p style={{ margin: 0, fontSize: 14 }}>{card.headline}</p>
          )}
          {card.job_overview && (
            <p style={{ margin: "0 0 10px", fontSize: 14, whiteSpace: "pre-wrap" }}>{card.job_overview}</p>
          )}
          {card.personal_overview && (
            <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{card.personal_overview}</p>
          )}
        </div>
      )}

      <div style={{ padding: 20 }}>
        {isSelf ? (
          <p className="muted" style={{ fontSize: 14, textAlign: "center", margin: 0 }}>
            This is your own card — share it with someone else to connect.
          </p>
        ) : user ? (
          <>
            <form action={(isWork ? connectWithWork : connectWith).bind(null, shareId)}>
              <SubmitButton className="btn btn-block" pendingText="Adding…">
                Add to my contacts
              </SubmitButton>
            </form>
            <p className="hint" style={{ textAlign: "center", marginBottom: 0 }}>
              {isWork
                ? `They'll be saved to your contacts, you'll be added to theirs, and your shared info will be visible to ${card.org_name}'s team.`
                : "They'll be saved to your contacts, and you'll be added to theirs."}
            </p>
          </>
        ) : isWork ? (
          <>
            <CaptureForm shareId={shareId} repName={card.full_name} orgName={card.org_name} />
            <div className="divider"><span>or</span></div>
            <Link href={loginHref} className="btn btn-ghost btn-block">
              Sign in to connect both ways
            </Link>
          </>
        ) : (
          <>
            <Link href={loginHref} className="btn btn-block">
              Sign in to connect
            </Link>
            <p className="hint" style={{ textAlign: "center", marginBottom: 0 }}>
              Free — you'll each be added to the other's contacts.
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
