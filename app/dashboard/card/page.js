import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/utils/profile";
import { regenerateShareLink } from "@/app/actions";
import QrCard from "./qr-card";
import ConfirmSubmit from "@/components/confirm-submit";

export default async function CardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getOrCreateProfile(supabase, user);

  // Summarise what's currently shared, so there are no surprises.
  const shared = [
    profile.share_avatar && "photo",
    "name",
    profile.share_role && profile.role && "role",
    profile.share_company && profile.company && "company",
    profile.share_work_email && profile.work_email && "work email",
    profile.share_phone && profile.phone && "phone",
    profile.share_job_overview && profile.job_overview && "job overview",
    profile.share_personal_overview &&
      profile.personal_overview &&
      "personal overview",
  ].filter(Boolean);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">My card</span>
          <h1>Share in person</h1>
        </div>
        <Link href="/dashboard/profile" className="btn btn-ghost">
          Edit profile
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 460 }}>
        <QrCard shareId={profile.share_id} name={profile.full_name} />
        <div style={{ padding: "0 28px 24px", textAlign: "center" }}>
          <p className="muted" style={{ fontSize: 13 }}>
            Have the other person scan this with their phone camera. They'll be
            able to add you — and you'll get them in return.
          </p>
        </div>
      </div>

      <section className="section" style={{ marginTop: 28, maxWidth: 460 }}>
        <div className="section-title">
          <span className="label">Currently sharing</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {shared.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            Change any of this on your{" "}
            <Link href="/dashboard/profile" style={{ color: "var(--crimson)" }}>
              profile
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="section" style={{ maxWidth: 460 }}>
        <div className="section-title">
          <span className="label">Privacy</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <p className="hint" style={{ marginTop: 0 }}>
            Reset your link if a code got out to someone it shouldn't have. Old
            QR codes stop working immediately.
          </p>
          <ConfirmSubmit
            action={regenerateShareLink}
            message="Reset your share link? Any QR codes you've already shown will stop working."
            className="btn btn-ghost"
          >
            Reset my link
          </ConfirmSubmit>
        </div>
      </section>
    </>
  );
}
