# Student Interest Matcher

A premium-style React + Tailwind web app where students register once, then manage profile/interests and discover matching students.

## Tech Stack

- React (functional components)
- Vite
- React Router
- Supabase JS client
- Tailwind CSS

## Features

- Register and login with Supabase Auth (email + password)
- One-account-per-email flow with readable auth errors
- Protected profile page with editable contact details
- Interest add/remove as selectable pills (many-to-many sync)
- Password re-verification required before profile updates
- Match users by shared interests count
- Responsive premium UI and smooth transitions

## Project Structure

- [src/main.jsx](src/main.jsx)
- [src/App.js](src/App.js)
- [src/AppView.jsx](src/AppView.jsx)
- [src/AuthPage.jsx](src/AuthPage.jsx)
- [src/ProtectedRoute.jsx](src/ProtectedRoute.jsx)
- [src/ProfilePage.jsx](src/ProfilePage.jsx)
- [src/ResultsPage.js](src/ResultsPage.js)
- [src/ResultsPageView.jsx](src/ResultsPageView.jsx)
- [src/supabaseClient.js](src/supabaseClient.js)
- [supabase/schema.sql](supabase/schema.sql)
- [supabase/rls.sql](supabase/rls.sql)

## Supabase Database Setup

1. Open Supabase project.
2. Go to SQL Editor.
3. Run SQL in [supabase/schema.sql](supabase/schema.sql).
4. Run SQL in [supabase/rls.sql](supabase/rls.sql).

This setup creates/updates:

- `users`
- `interests`
- `user_interests`
- `users.auth_user_id` linked to `auth.users(id)`
- RPC function `get_student_matches(target_user_id)`
- RPC function `get_user_interests(target_user_id)`
- RLS policies for profile and interest ownership

## Environment Variables

Create a `.env` file in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_anon_key
```

Then restart the dev server after changing `.env` values.

Do not hardcode keys in source files.

## Install and Run

```bash
npm install
npm run dev
```

Open the local URL printed in terminal (usually `http://localhost:5173`).

## Build for Production

```bash
npm run build
npm run preview
```

## How Matching Works

1. User registers or logs in through Supabase Auth.
2. User profile is stored in `users` and linked by `auth_user_id`.
3. Selected interests are synced in `user_interests`.
4. Results page calls RPC `get_student_matches` with current profile ID.
5. SQL returns users with shared interests (excluding current user), sorted by highest `common_interest_count`.

## Update Security Flow

Profile updates require current password verification:

1. User clicks Save Changes on profile page.
2. Re-auth modal asks for current password.
3. App verifies via `signInWithPassword`.
4. If verification succeeds, profile + interests are updated.
5. If password is wrong, update is blocked.

## Notes

- Interest options are loaded from `interests`.
- Users can only read/update their own data with RLS enabled.
- If Supabase config is missing, the UI shows a clear message.
