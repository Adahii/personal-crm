# Soyo88 — meet, scan, remember

A private place to remember everyone you meet: who they are, what you talked
about, and when it's time to reconnect. Built with Next.js + Supabase, hosted
free on Vercel.

You'll do the setup in roughly this order. Take it slow — none of it requires
coding, just clicking through two dashboards and pasting a few values.

```
Supabase project  ──>  run the SQL  ──>  copy keys into .env.local
       │                                          │
       └──> turn on Google login                  └──> run locally to test
                                                          │
GitHub repo  ──>  Vercel import  ──>  paste keys  ──>  live site
```

---

## 0. What you need first

- **Node.js 18.18+** installed ([nodejs.org](https://nodejs.org), pick the LTS).
  Check with `node -v` in a terminal.
- A **GitHub account** (you have this).
- A **Supabase account** — free, sign up at [supabase.com](https://supabase.com).
- A **Vercel account** — free, sign up at [vercel.com](https://vercel.com)
  (use "Continue with GitHub").

---

## 1. Create the Supabase project

1. In Supabase, click **New project**. Give it a name and a strong database
   password (save it somewhere; you won't need it for this app, but Supabase
   asks for it). Pick the region closest to you. Free plan is fine.
2. Wait ~2 minutes for it to provision.

## 2. Create the database tables

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file `supabase-schema.sql` from this project, copy **everything**,
   paste it into the editor, and click **Run**.
3. You should see "Success. No rows returned." This created your tables, the
   security rules, and the file-storage bucket.

## 3. Get your API keys

1. Go to **Project Settings** (gear icon) → **Data API**. Copy the
   **Project URL**.
2. Go to **Project Settings** → **API Keys**. Copy the **anon / public** key.
   (The "anon" key is safe to expose in a browser — the security rules from
   step 2 are what protect your data.)
3. In this project, copy `.env.local.example` to a new file named
   `.env.local`, and paste your two values in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 4. Turn on the login methods

**Email + password** is on by default — nothing to do.

> Tip: while testing, you can skip the confirmation email. Go to
> **Authentication → Sign In / Providers → Email** and turn **Confirm email**
> off. Then a new account logs in instantly. (Turn it back on later if you
> want that protection.)

**Google login** takes a few extra clicks:

1. Go to the [Google Cloud Console](https://console.cloud.google.com) →
   create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** → set it up as **External**,
   add your email as a test user, save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   application type **Web application**.
4. Under **Authorized redirect URIs**, add the callback URL Supabase gives you:
   in Supabase go to **Authentication → Sign In / Providers → Google**, and
   copy the **Callback URL (for OAuth)** shown there. Paste it into Google.
5. Google now shows you a **Client ID** and **Client secret**. Paste both into
   that Supabase Google provider screen and **Save**, then toggle Google
   **on**.

## 5. Tell Supabase where your app lives

Go to **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` for now (you'll change this to your
  Vercel URL after deploying).
- **Redirect URLs**: add both
  `http://localhost:3000/auth/callback` and (later) your Vercel equivalent.

## 6. Run it on your machine

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, add a
person, log a conversation. If something doesn't save, it's almost always a
missing step 2 (SQL) or a typo in `.env.local`.

---

## 7. Put it on GitHub

```bash
git init
git add .
git commit -m "Personal CRM"
```

Create a new **empty** repo on GitHub (no README), then run the two lines
GitHub shows you under "push an existing repository":

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

(`.env.local` is gitignored, so your keys never get pushed — good.)

## 8. Deploy on Vercel

1. In Vercel, click **Add New → Project**, and **Import** your GitHub repo.
2. Before deploying, expand **Environment Variables** and add the same two
   from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Deploy**. In a minute you'll get a URL like
   `https://your-app.vercel.app`.

## 9. Point Supabase at the live URL

Back in Supabase **Authentication → URL Configuration**:

- Set **Site URL** to your Vercel URL.
- Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**.

And in the **Google Cloud Console** credentials, the Supabase callback URL you
already added still works — no change needed there.

Done. Every `git push` to `main` now redeploys automatically.

---

## Staying free

- **Supabase free tier**: 500 MB database, 1 GB file storage, 50,000 monthly
  active users. Far beyond a personal CRM. (Free projects pause after ~1 week
  of zero activity — just open the dashboard to wake it, or visit your app.)
- **Vercel free (Hobby) tier**: generous for personal, non-commercial use.

## How the pieces fit

| Folder | What it does |
|---|---|
| `app/login` | Sign in / sign up (Google + email/password) |
| `app/dashboard` | The app shell and Overview (who to reconnect with) |
| `app/dashboard/contacts` | List, add, view, and edit people |
| `app/actions.js` | All the save/delete logic (runs on the server) |
| `utils/supabase` | Connects to your database securely |
| `supabase-schema.sql` | The database structure + security rules |

## Ideas for later

- Profile photos (the storage bucket is already there).
- Reminder emails for overdue reconnects (Supabase scheduled functions).
- Import contacts from a CSV.
- A "met at" field linking people you met at the same event.

---

# Version 2 — profiles & QR connections

This version adds a shareable profile, a QR code, and in-person mutual adding.

## One setup step

Run the new migration **once**: Supabase → **SQL Editor → New query**, paste all
of `supabase-migration-v2.sql`, and **Run**. It adds your profiles table, the
secure connect functions, and a public `avatars` bucket for profile photos.
(Your existing data is untouched — it only adds to what's there.)

Nothing about deploying changes — `git push` still redeploys. The same env
variables work.

## How it works

- **Profile** (sidebar → Profile): fill in your photo, role, company, contact
  details, and overviews. Each field has a **share** toggle — untick anything
  you don't want handed out. Your name is always shared.
- **My card** (sidebar → My card): shows your QR code and a copyable link, plus
  a summary of exactly what you're currently sharing. There's also a **Reset my
  link** button that instantly kills old QR codes if one got out.
- **Connecting**: pull up *My card* in person. The other person scans it with
  their **phone camera** (or you send them the link). It opens a connect page;
  if they're not logged in they'll be asked to, then land right back on it. One
  tap adds you to their contacts **and** adds them to yours — each side filled
  in from what the other person chose to share. Re-scanning is harmless; nobody
  gets added twice.
- Everything from v1 still works: manual contacts, conversation logs, files,
  and the reconnect dashboard.

## A note on privacy

Profiles are locked down so no one can browse them — the only way to read
someone's card is through their share link, and it only ever returns the fields
they enabled. The reciprocal "add to their contacts" is done by a single
guarded database function; it's the one and only thing allowed to write into
another person's list, and it enforces the sharing rules itself.

---

# Install it like an app (PWA)

Soyo88 is installable straight from the browser — no app store:

- **iPhone**: open the site in Safari → Share button → **Add to Home Screen**.
- **Android**: open it in Chrome → menu (⋮) → **Add to Home screen** (or tap the
  install prompt if it appears).

It launches full-screen with the Soyo88 icon, like a native app. Updates ship
automatically with every deploy — nothing to reinstall.

Brand assets live in `public/icons/` (app icons, favicon). Transparent logo
marks for use elsewhere were delivered alongside the project.

---

# Version 3 — Teams: work cards & lead capture

Run `supabase-migration-v3.sql` once in the Supabase SQL Editor (after v1/v2).
It adds organizations, members, invites, leads, and the capture functions.
Existing data is untouched.

What it adds:
- **Team tab**: create a company, invite teammates by email (they sign in with
  that email and tap Join), and see every captured contact in one list.
- **Work card**: each member gets a second card (title, work email/phone, a
  one-line pitch) with its own QR, shown under My card. Personal contacts stay
  personal; only work-card connections flow to the company.
- **Quick capture**: people *without* an account who scan a work card can share
  name/email/company/note in one form — it lands in the team's captured list.
  The page tells them their info will be visible to the company.
- Signed-in people who connect with a work card get the rep in their contacts,
  appear in the rep's contacts, and appear in the company list (disclosed).

---

# Version 4 — lead pipeline, events & exports

Run `supabase-migration-v4.sql` once (after v3). Adds events, lead statuses,
event attribution on captures, and team-admin permissions.

- **Stats** at the top of Team: total captured, this week, qualified.
- **Events**: admins add conferences; each rep picks the event they're
  currently working on their work card — every capture is tagged with it
  automatically.
- **Pipeline**: every captured contact has a status (New → Contacted →
  Qualified → Archived) you change inline.
- **Filters**: slice the captured list by event, rep, or status.
- **Export CSV**: one click, opens in Excel/Sheets; includes status, event,
  and who captured each contact.
- **Team admin**: change roles, remove members (their captures stay), revoke
  pending invites.

---

# Version 5 — shared team logs

Run `supabase-migration-v5.sql` once in the SQL Editor. It (a) fixes a
constraint so deleting a user who created a team no longer fails — the team
survives with its other members — and (b) adds team conversation logs.

On the Team tab, every captured contact's name now opens a detail page where
any member can log a conversation (date, what was discussed, next steps).
Logs are visible to the whole team, attributed to their author; authors can
delete their own entries, admins can delete any.

---

# Version 6 — quality of life

Run `supabase-migration-v6.sql` once in the SQL Editor. Then deploy as usual.

- **Shared files on your card**: upload your resume or anything else on the
  Profile page. Anyone who scans your personal card can open them, and
  connected contacts see your latest files on your contact page. One toggle
  ("share my files") turns it off everywhere.
- **Private notes on contacts**: a notes box on every contact that is yours
  alone — never shared, never overwritten by sync.
- **Live profile sync**: when you save your profile, every connected person's
  copy of you updates automatically (respecting your share toggles).
- **Delete a team**: admins get a Danger zone on the Team tab with a hard
  confirmation. Members' personal contacts survive; the team's captured
  contacts and logs do not.
- **Snappier app**: removed a database roundtrip from every page navigation,
  parallelized page queries, and added instant loading skeletons.
- **Mobile zoom lock**: no more accidental pinch/double-tap zooming.
