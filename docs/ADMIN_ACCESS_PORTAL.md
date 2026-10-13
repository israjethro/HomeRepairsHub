# HomeRepairHub Admin Access Portal

## Product direction

HomeRepairHub is being developed as a modular service-management platform. Build and release modules incrementally, while keeping a shared identity, authorization, audit and data-access foundation.

Planned modules:
1. Admin overview
2. Users and access
3. Roles and permissions
4. Customer enquiries and bookings
5. Orders and job tracking
6. Technician profiles, availability and assignment
7. Service catalogue and pricing
8. Notifications
9. Reports
10. Audit and system settings

A menu item or front-end screen is not proof of authorization. Every protected API operation must enforce permissions server-side.

## Current portal status

The initial static portal UI is in `/admin/`. It deliberately fails closed and requests `GET /api/admin/session`. It does not implement password authentication, store credentials, create browser-only users, or claim that the backend is configured.

**Do not consider this production-ready until the API and Cloudflare Access policy are deployed and tested.** The repository currently contains no confirmed admin Worker/API implementation.

## Recommended production architecture

- Static UI: Cloudflare Pages, served at `/admin/`.
- Identity boundary: Cloudflare Access with an approved identity provider and an allow-list for authorized staff.
- Server API: Cloudflare Worker under `/api/admin/*`; validate the Cloudflare Access JWT on every request, including issuer, audience, signature and expiry. Never trust identity or role values sent by the browser.
- Authorization: server-side role-based access control (RBAC) and granular permissions. Use deny-by-default and least privilege.
- Data store: D1 or another managed database for users/role assignments, module records and audit events, selected before implementation.
- Secrets: store secrets in Cloudflare Worker secrets, not in JavaScript, HTML, GitHub, or `config.js`.
- Audit: append-only server-side events for sign-in/access decisions, user/role changes, booking edits, assignments, exports and other sensitive actions.
- Transport and sessions: HTTPS only; use Cloudflare Access's supported session mechanism. Do not store passwords, access tokens, or refresh tokens in localStorage/sessionStorage.
- Operational safeguards: rate limits, input validation, CSRF protection where cookie-authenticated state-changing requests are used, security headers, backup/restore and retention policies.

## Session API contract

The portal expects:

`GET /api/admin/session`

Authenticated example response:
```json
{
  "authenticated": true,
  "user": { "id": "user-id", "name": "Admin User" },
  "permissions": [
    "dashboard.read",
    "users.read",
    "roles.read",
    "audit.read"
  ],
  "stats": {
    "activeUsers": 0,
    "roles": 0,
    "activeModules": 1,
    "recentSecurityEvents": 0
  }
}
```

The endpoint must return 401 for no valid identity and 403 for a verified identity without the required access. Do not return a session as authenticated unless the Access identity has been verified by the Worker. Do not include tokens in this response.

## Proposed permission naming

Use explicit permission strings, rather than relying on hidden menu items:
- `dashboard.read`
- `users.read`, `users.create`, `users.update`, `users.suspend`
- `roles.read`, `roles.create`, `roles.update`, `roles.assign`
- `bookings.read`, `bookings.create`, `bookings.update`, `bookings.cancel`, `bookings.assign`
- `orders.read`, `orders.update_status`
- `technicians.read`, `technicians.create`, `technicians.update`, `technicians.assign`
- `reports.read`, `reports.export`
- `audit.read`, `settings.update`

Define roles as permission bundles. Suggested initial roles: Super Admin, Operations Manager, Booking Agent, Technician Coordinator and Read-only Auditor. Review the exact access boundaries before enabling writes. Keep the Super Admin role tightly restricted and audit all role changes.

## Rollout gates

1. Confirm identity provider and authorized admin email/domain allow-list.
2. Configure Cloudflare Access for `/admin/*` and `/api/admin/*`.
3. Implement and test the Worker JWT validation and session endpoint.
4. Select and create the database schema; seed only a controlled initial administrator.
5. Implement RBAC enforcement and audit logging server-side.
6. Add user/role management APIs and connect the UI.
7. Test unauthenticated access, unauthorized roles, expired/invalid identity, direct API calls, input validation and audit events.
8. Release to production only after tests pass. Add booking and other modules using the same authorization middleware and audit conventions.

## Security warning

A static website alone cannot securely administer users, permissions or private customer records. A front-end-only login, hardcoded password, or role stored in browser storage is not an acceptable substitute for server-side authentication and authorization.