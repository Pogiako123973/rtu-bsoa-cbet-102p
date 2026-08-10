# ClassDesk Portal

A student + admin portal for lessons, schedule, assignments, attendance, and chat.
Built with **Vite + React + React Router + Tailwind v4 + shadcn/ui**, backed by a
self-hosted **Supabase** project.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

## One-time Supabase setup

1. Go to your Supabase project's **SQL Editor**:
   <https://supabase.com/dashboard/project/spvgmkxubrijdakhhnod/sql/new>
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. In **Authentication → Providers → Email**, optionally toggle **Confirm email** off
   (the trigger in `schema.sql` auto-confirms new accounts, so this is belt-and-braces).
4. In **Authentication → Users → Add user**, create:
   - Email: `Admin@102p.edu`
   - Password: `Admin123123123`
   - Toggle **Auto Confirm User** ON.
   After the user is created, run this one extra SQL command (so the admin
   gets the `admin` role, not `student`):

   ```sql
   update public.profiles
      set role = 'admin', full_name = 'Administrator'
    where email = 'Admin@102p.edu';
   ```

## Stack

- **Vite** (dev server + bundler)
- **React 18** + **TypeScript**
- **React Router v6** (replaces the previous TanStack Router setup)
- **Tailwind v4** (via `@tailwindcss/vite`)
- **shadcn/ui** primitives in `src/components/ui/`
- **Supabase** (`@supabase/supabase-js`) — single client in `src/lib/supabase.ts`

## Directory layout

```
src/
  main.tsx            React entry, mounts <App/> inside <BrowserRouter>
  App.tsx             Top-level routes
  styles.css          Tailwind v4 + design tokens
  lib/
    supabase.ts       Supabase client + Profile/Role types
    api.ts            CRUD helpers for every table
    utils.ts          cn() helper
  hooks/
    useAuth.ts        Session + profile + role
  components/
    AppShell.tsx      Sidebar + header layout
    ProtectedRoute.tsx
    ui/               shadcn primitives (button, card, dialog, ...)
  pages/
    Landing.tsx       Public landing
    Login.tsx, Signup.tsx, NotFound.tsx
    student/          Student portal (Dashboard, Lessons, Schedule, …)
    admin/            Admin portal   (Dashboard, Students, Lessons, …)
```