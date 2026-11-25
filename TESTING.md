# Student Course Portal Test Plan

## Automated checks

Run:

```bash
npm test
npm run build
```

The Node test suite covers email, password, name, UUID validation, and safe user serialization. These tests do not require a live database.

## API and authentication checks

With the migration applied and the API running against a test database, verify:

| Test | Expected result |
|---|---|
| Register a new account | One `public.users` row with bcrypt hash and `student` role; authenticated HttpOnly session cookie |
| Register an existing email, including different letter casing | Generic registration error; no duplicate user and no account-existence detail |
| Submit repeated registration/login attempts | HTTP 429 after the configured database-backed limit; no automatic retry |
| Login with correct credentials | Session created and role returned without `password_hash` |
| Login with incorrect credentials or an unactivated legacy account | Same generic credentials error |
| Refresh and request `GET /api/me` | Session persists and returns only safe user fields |
| Logout | Session deleted and cookie cleared |
| Activate a legacy account using a valid admin-issued code | Password hash set, one-time code consumed, original ID and role retained |
| Reuse or expire an activation code | Generic activation error |
| Student calls admin API or course mutation API | HTTP 403 |
| Student registers with `role: admin` in request body | Account is still created as `student` |
| Admin lists/edits/deletes accounts | Authorized actions succeed; hashes never appear in JSON |
| Admin deletes or demotes the last admin | HTTP 409 |
| Course list and detail | Available through API |
| Admin course create/edit/delete | Succeeds with valid data |
| Student/anonymous course create/edit/delete | HTTP 401/403 |
| State-changing request from an unapproved Origin | HTTP 403 |
| Session cookie in production | `HttpOnly`, `Secure`, `SameSite=Lax` |

Use a non-production database. Do not test account deletion or bootstrap against production data.

## Frontend checks

Use separate terminals for `npm run dev:api` and `npm run dev`:

- Signup validation, duplicate-email generic response, signup success, and student dashboard redirect.
- Admin and student login redirects; activation code flow; incorrect credentials; rate-limit message.
- Protected routes, student denial of admin pages, and logout/session persistence.
- Profile name update; course list/search/filter; admin course CRUD; admin stats and student account controls.
- Test responsive layout at desktop and mobile widths; check browser console and Network responses for leaked hashes or session values.

Live database/API and responsive browser tests must be reported separately from the automated tests; a passing Vite build does not validate them.
