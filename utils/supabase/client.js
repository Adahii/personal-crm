import { createBrowserClient } from "@supabase/ssr";

// Used inside client components (login form, uploads).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
