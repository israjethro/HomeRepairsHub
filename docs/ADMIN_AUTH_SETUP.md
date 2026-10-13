# HomeRepairHub admin authentication setup (Supabase + Cloudflare Pages Functions)

## Status and safety

This change adds the authentication API source and sign-in UI foundation. It does not deploy Cloudflare settings, create a Supabase project, configure secrets, create the first admin account, or change the live site. Keep this branch separate until the checklist and security tests pass.

Authentication provider: Supabase Auth email/password. Server API: Cloudflare Pages Function at `/api/admin/*`. Admin roles and audit events: Cloudflare D1. The browser never receives provider tokens as JavaScript values; the Worker sets Secure, HttpOnly, SameSite=Strict cookies.

## 1. Create/configure Supabase Auth

1. Create a Supabase project or choose the intended project.
2. In Authentication settings, enable email/password and email confirmation. Disable public sign-ups after creating/inviting the initial admin, if compatible with your onboarding process. Do not expose a public admin registration form.
3. Create the first user in Supabase Dashboard using your own admin email. Complete email confirmation and configure a strong, unique password. Do not place the password in GitHub, chat, or source code.
4. Use the project's HTTPS URL and publishable/anon key. Never use a service-role key in this site or Worker.
5. Configure the project's Site URL and allowed redirect URLs for the intended HomeRepairHub admin URL before enabling email links.

## 2. Configure Cloudflare Pages + D1

1. Create a D1 database, for example `homerepairhub-admin`.
2. Bind it to the Pages project as `ADMIN_DB`.
3. Apply `migrations/0001_admin_access.sql` to that database using the Cloudflare dashboard or Wrangler CLI.
4. In the Pages project's Settings → Variables and Secrets, configure:
   - `SUPABASE_URL` — Supabase project HTTPS URL.
   - `SUPABASE_ANON_KEY` — project publishable/anon key (not the service-role key).
   - `ADMIN_EMAIL` — the exact email address of the initial Super Admin, lowercase preferred.
5. Ensure the deployment uses Pages Functions (the `functions/api/admin/[[path]].js` route is discovered automatically by Cloudflare Pages).

## 3. First administrator and account lifecycle

The first successful login for the exact `ADMIN_EMAIL` is bootstrapped as `super_admin` only after Supabase confirms the user's password session and email. Any other email must already have an active row in `admin_users` to access the admin API. This branch does not expose an API to create additional users; future user-management endpoints must require `users.create` and audit the action.

No password is stored in D1 or this repository. Supabase Auth handles password verification and password recovery. The Worker never returns provider access/refresh tokens in JSON. It stores them only in Secure, HttpOnly, SameSite=Strict cookies scoped to `/api/admin`; JavaScript cannot read these cookies. Provider tokens are sent back to Supabase for user verification and refresh.

## 4. Security controls before production

- Keep the site and API HTTPS-only.
- Configure Cloudflare WAF/rate limiting for `POST /api/admin/login` and monitor failed login attempts.
- Use a strong password and MFA for the provider account if enabled for the project/plan.
- Confirm email confirmation is required and public registration is disabled after the first user is provisioned.
- Keep the service-role key out of the Worker; this implementation uses the publishable/anon key.
- The login/logout endpoints require same-origin POST requests and use SameSite=Strict cookies. Test CSRF protections with the exact production domain.
- The API denies unimplemented routes by default. Do not connect user management, bookings, orders, technician assignment, or reports until each endpoint has server-side permission checks.
- Review cookie headers in browser devtools. Confirm both cookies are Secure, HttpOnly, SameSite=Strict, scoped to `/api/admin`, and never present in JSON responses.
- Test invalid password, unconfirmed email, unauthorized email, expired access token, invalid refresh token, disabled admin, and direct unauthenticated API calls.
- Do not merge or deploy until the sign-in flow is manually tested against a staging Pages deployment.

## 5. Endpoints

- `POST /api/admin/login` — accepts email/password and proxies credential verification to Supabase Auth.
- `GET /api/admin/session` — verifies the provider session, refreshes it if needed, and returns user identity plus server-calculated permissions.
- `POST /api/admin/logout` — asks Supabase to revoke the provider session where possible and clears cookies.
- All other admin API paths are deny-by-default and currently return 404 after authentication.

## 6. Deploy only after review

Use a staging Pages project or preview deployment connected to this branch. Do not merge into `main` or change the custom-domain production deployment until all tests pass. The static website remains unchanged by this branch unless it is merged/deployed.