import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/utils/profile";
import { TopNav, TabBar } from "@/components/nav";
import Logo from "@/components/logo";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Guarantee a profile (and share link) exists for this user.
  await getOrCreateProfile(supabase, user);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo size={22} />
          <TopNav />
          <span className="topbar-spacer" />
          <form action="/auth/signout" method="post">
            <button type="submit" className="signout-btn">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="main">{children}</main>
      <TabBar />
    </div>
  );
}
