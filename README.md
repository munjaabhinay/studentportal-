# Student Course Management Portal

React 19 and Vite frontend with an Express API and Supabase-hosted PostgreSQL database. The application does not use Supabase Auth or the Supabase JavaScript client. Password hashing, login, sessions, authorization, and all database access happen on the server.

## Architecture

- `src/`: React pages, role-aware routes, and same-origin `/api` requests.
- `server/`: Express API, PostgreSQL connection pool, database-backed sessions and rate limits, password hashing, authorization, and the one-time admin bootstrap utility.
- `api/[...path].js`: Vercel Node function entry point for the Express API.
- `supabase/migrations/20261125180000_custom_database_auth.sql`: incremental migration for custom accounts, activation codes, sessions, rate limits, role grants, and legacy profile import.
- `database/schema.sql`: base schema for a new database; existing installations must use the incremental migration.

## Local setup

Requirements: Node.js 20.19+ (or 22.12+) and an existing Supabase PostgreSQL project.

1. Apply `supabase/migrations/20261125180000_custom_database_auth.sql` in the Supabase SQL Editor. It imports profile IDs, names, emails, roles, and timestamps into `public.users` with a null password hash, preserves the existing `profiles` and `courses` rows, and removes the old `on_auth_user_created` trigger. It does not import Supabase Auth password hashes, which are not exportable.
2. The migration creates a non-login `portal_api` database role with the API's table permissions. Create a dedicated database login in Supabase **Database → Roles** and grant it membership:

   ```sql
   GRANT portal_api TO portal_api_login;
   ```

   Use that login for the API, not the database owner. Keep its credentials on the server only.
3. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the dedicated login's PostgreSQL connection string (TLS enabled), generate independent random values for `SESSION_SECRET` and `RATE_LIMIT_SECRET`, and set the exact local origins in `APP_ORIGINS`. Never prefix server secrets with `VITE_`.
4. Install packages:

   ```bash
   npm install
   ```
5. Start the API and frontend in separate terminals:

   ```bash
   npm run dev:api
   npm run dev
   ```

   Open `http://localhost:5173`. Vite proxies `/api` requests to the local Express server.

### Initial administrator and legacy accounts

An authorized database operator runs `npm run bootstrap-admin` once from an interactive terminal. The script asks for email, name, and a password without echoing the password, then promotes or creates that first admin and permanently marks bootstrap complete. It does not grant admin through the public registration endpoint. Keep the bootstrap command and database credentials restricted to a trusted operator.

Legacy accounts cannot reuse their old Supabase Auth passwords. After the initial admin signs in, open **Registered students** and issue each legacy user a one-time setup/reset code. Codes expire in 48 hours, are stored as hashes, and are shown only once; deliver them to the intended user through a secure channel. Users select **Enter a code** on the login page to set a new password. No email or password-recovery messages are sent.

All self-service registrations receive the `student` role. Authenticated admins may manage accounts through the server API. The API checks the user's current database role for every protected request and prevents deleting or demoting the last admin.

## Database migration notes

- Apply the new migration once to an existing project. Do not rerun `database/schema.sql` against an existing database.
- The migration aborts before importing when it detects missing or duplicate profile emails, so an operator can resolve those records rather than silently losing them.
- Existing course and profile tables/data remain in place. New custom accounts and roles are stored in `public.users`.
- The prior timestamped migration is retained as historical migration history. The new migration drops the legacy Auth profile trigger/function. The application no longer calls Auth or references `auth.users`; no new schema relation points to it.
- If setting up a brand-new database manually, run `database/schema.sql`, then the timestamped migration. The migration skips profile import when no legacy `profiles` table exists.

## Security

- Passwords use bcrypt with cost factor 12; plain-text passwords are never stored. API serializers never return password hashes.
- Sessions use an HttpOnly, SameSite cookie and the PostgreSQL-backed session store; production cookies are Secure.
- Login, registration, and activation are rate-limited using PostgreSQL-backed counters. The API validates request bodies, uses parameterized SQL, sends security headers, limits JSON size, and checks request origins on state-changing requests.
- Role checks come from `public.users` on the server for each protected operation. Frontend role-based route checks are only for UX and are not an authorization boundary.
- `DATABASE_URL`, session secrets, and rate-limit secrets must exist only in backend environment settings. The frontend does not contain a Supabase URL, anon key, service-role key, or database credential.
- Because this is a custom password system without email, users cannot prove email ownership through verification. Password changes for legacy accounts and account resets require an administrator-issued one-time code.

## Vercel deployment

The project is configured as a Vite static site plus Vercel Node functions. `api/[...path].js` serves the Express application under `/api/*`; the existing SPA rewrite serves client-side routes. Keep the project root as the Vercel Root Directory, build command `npm run build`, and output directory `dist`.

Set these **server-side environment variables** for every Vercel environment that should run the app (Production and Preview):

- `DATABASE_URL` — PostgreSQL connection string for a dedicated login that is a member of `portal_api`; use the Supabase pooler/connection option suitable for your deployment region and require TLS.
- `SESSION_SECRET` — independent random secret, at least 32 characters.
- `RATE_LIMIT_SECRET` — another independent random secret, at least 32 characters.
- `APP_ORIGINS` — comma-separated exact browser origins for the deployment, such as `https://your-project.vercel.app`. Add Preview origins explicitly if Preview deployments should be usable.
- `DATABASE_SSL=true`
- `PG_POOL_MAX=2` (adjust only with awareness of the Supabase connection limit).

Do not use `VITE_` on these variables. Do not configure Supabase Auth keys for the frontend. Redeploy after changing Vercel environment variables. Configure the Vercel function region near the PostgreSQL project to reduce latency. Vercel functions and the Vite frontend share the same origin, so the session cookie remains first-party.

## Commands

```bash
npm test
npm run build
npm run preview
```

End-to-end authentication and database tests require a configured PostgreSQL project and server environment; they are not simulated by the build.
