
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

1. Open your Supabase project.
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

Important: `src/supabaseClient.js` contains fallback Supabase values for convenience during local development. Replace or remove these defaults before publishing to avoid leaking project identifiers.

## Install and Run

```bash
npm install
npm run dev
```

Open the local URL printed in terminal (usually `http://localhost:5173`).

## Scripts

- **dev**: starts the Vite development server (`npm run dev`).
- **build**: builds a production bundle using Vite (`npm run build`).
- **preview**: locally serves the production build (`npm run preview`).
- **lint**: runs ESLint across the repository (`npm run lint`).

## Build for Production

```bash
npm run build
npm run preview
```

## Development Notes

- Node: use a modern Node.js runtime (recommended >= 18). If you use `nvm`, set node to a recent LTS.
- Environment: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to a `.env` file in project root and restart the dev server.
- Supabase client: `src/supabaseClient.js` contains fallback `supabaseUrl` and `supabaseAnonKey` values for convenience. Remove or replace these defaults and keep secrets out of source control.
- Session storage: the app stores the current profile id using the key `sim_user_id` (see `src/supabaseClient.js`). Clearing localStorage or calling the app's logout will remove it.
- SQL: apply both [supabase/schema.sql](supabase/schema.sql) and [supabase/rls.sql](supabase/rls.sql) in your Supabase project's SQL editor to create tables, RPCs, and RLS policies.

## Linting & Formatting

- ESLint is configured; run `npm run lint` to check code quality. Fix issues or integrate an editor plugin for autofix.
- Tailwind CSS is configured via `tailwind.config.js` and `postcss.config.js`.

## Where to Look in Source

- App entry: [src/main.jsx](src/main.jsx#L1)
- Top-level app component: [src/App.js](src/App.js#L1)
- Auth and profile flows: [src/AuthPage.jsx](src/AuthPage.jsx#L1), [src/ProfilePage.jsx](src/ProfilePage.jsx#L1)
- Supabase client and API: [src/supabaseClient.js](src/supabaseClient.js#L1)
- SQL schema and RLS: [supabase/schema.sql](supabase/schema.sql#L1), [supabase/rls.sql](supabase/rls.sql#L1)

## Troubleshooting

- If the UI shows "Supabase is not configured", confirm your `.env` values and restart the dev server.
- If auth or data fails, verify that `users`, `interests`, and `user_interests` tables exist and RLS policies are applied.

## Contributing

- Open an issue or PR with a clear description and reproduction steps.
- Run `npm run lint` before opening a PR; include screenshots where relevant.

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
