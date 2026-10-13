const ACCESS_COOKIE = "hrh_admin_access";
const REFRESH_COOKIE = "hrh_admin_refresh";
const COOKIE_PATH = "/api/admin";
const MAX_BODY_BYTES = 8192;

const ROLE_PERMISSIONS = {
  super_admin: [
    "dashboard.read",
    "users.read", "users.create", "users.update", "users.suspend",
    "roles.read", "roles.create", "roles.update", "roles.assign",
    "bookings.read", "bookings.create", "bookings.update", "bookings.cancel", "bookings.assign",
    "orders.read", "orders.update_status",
    "technicians.read", "technicians.create", "technicians.update", "technicians.assign",
    "reports.read", "reports.export", "audit.read", "settings.update"
  ],
  operations_manager: ["dashboard.read", "bookings.read", "bookings.create", "bookings.update", "bookings.cancel", "bookings.assign", "orders.read", "orders.update_status", "technicians.read", "technicians.update", "technicians.assign", "reports.read"],
  booking_agent: ["dashboard.read", "bookings.read", "bookings.create", "bookings.update", "orders.read"],
  technician_coordinator: ["dashboard.read", "bookings.read", "orders.read", "orders.update_status", "technicians.read", "technicians.update", "technicians.assign"],
  auditor: ["dashboard.read", "users.read", "roles.read", "bookings.read", "orders.read", "technicians.read", "reports.read", "reports.export", "audit.read"]
};

function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"
  });
  for (const [name, value] of Object.entries(extraHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearCookie(name) {
  return `${name}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const item of header.split(";")) {
    const index = item.indexOf("=");
    if (index > -1 && item.slice(0, index).trim() === name) {
      return item.slice(index + 1).trim();
    }
  }
  return "";
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("Request too large");
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("Request too large");
  return JSON.parse(raw);
}

function config(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.ADMIN_EMAIL || !env.ADMIN_DB) {
    throw new Error("Admin authentication is not configured");
  }
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  const parsed = new URL(base);
  if (parsed.protocol !== "https:") throw new Error("Supabase URL must use HTTPS");
  return { base, anon: env.SUPABASE_ANON_KEY, adminEmail: env.ADMIN_EMAIL.trim().toLowerCase(), db: env.ADMIN_DB };
}

async function supabaseFetch(cfg, path, init = {}) {
  return fetch(cfg.base + path, {
    ...init,
    headers: {
      "apikey": cfg.anon,
      "Accept": "application/json",
      ...(init.headers || {})
    }
  });
}

async function providerUser(cfg, accessToken) {
  const response = await supabaseFetch(cfg, "/auth/v1/user", {
    headers: { "Authorization": `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const user = await response.json();
  if (!user || !user.id || !user.email || user.email_confirmed_at == null) return null;
  return { id: String(user.id), email: String(user.email).trim().toLowerCase() };
}

async function tokensFromProvider(cfg, path, payload) {
  const response = await supabaseFetch(cfg, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token || !data.refresh_token) return null;
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresIn: Math.max(60, Math.min(Number(data.expires_in) || 3600, 3600))
  };
}

async function loadAdmin(cfg, user) {
  let row = await cfg.db.prepare(
    "SELECT user_id, email, role, active FROM admin_users WHERE user_id = ?1"
  ).bind(user.id).first();

  if (!row && user.email === cfg.adminEmail) {
    await cfg.db.prepare(
      "INSERT OR IGNORE INTO admin_users (user_id, email, role, active, created_at) VALUES (?1, ?2, 'super_admin', 1, CURRENT_TIMESTAMP)"
    ).bind(user.id, user.email).run();
    row = await cfg.db.prepare(
      "SELECT user_id, email, role, active FROM admin_users WHERE user_id = ?1"
    ).bind(user.id).first();
  }

  if (!row || Number(row.active) !== 1 || String(row.email).toLowerCase() !== user.email) return null;
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, row.role)) return null;
  return { id: String(row.user_id), email: user.email, role: row.role, permissions: ROLE_PERMISSIONS[row.role] };
}

async function audit(cfg, actor, action, outcome, request) {
  try {
    await cfg.db.prepare(
      "INSERT INTO admin_audit_log (actor_user_id, actor_email, action, outcome, request_method, created_at) VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)"
    ).bind(actor?.id || null, actor?.email || null, action, outcome, request.method).run();
  } catch {
    // Authentication should not leak database internals. Configure the schema before enabling production.
  }
}

function sessionPayload(admin) {
  return {
    authenticated: true,
    user: { id: admin.id, name: admin.email, email: admin.email, role: admin.role },
    permissions: admin.permissions,
    stats: { activeUsers: null, roles: 5, activeModules: 1, recentSecurityEvents: null }
  };
}

async function login(request, cfg) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  let body;
  try { body = await readJson(request); } catch { return json({ error: "Invalid request body" }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || email.length > 254 || !password || password.length > 1024) {
    return json({ error: "Enter a valid email and password" }, 400);
  }

  const tokens = await tokensFromProvider(cfg, "/auth/v1/token?grant_type=password", { email, password });
  if (!tokens) {
    await audit(cfg, null, "auth.login", "denied", request);
    return json({ error: "Sign-in failed. Check your credentials and confirm your email." }, 401);
  }

  const user = await providerUser(cfg, tokens.accessToken);
  if (!user || user.email !== email) {
    await audit(cfg, null, "auth.login", "denied", request);
    return json({ error: "Sign-in could not be verified" }, 401);
  }

  const admin = await loadAdmin(cfg, user);
  if (!admin) {
    // Revoke the provider session when a valid customer account is not authorized for the admin portal.
    await supabaseFetch(cfg, "/auth/v1/logout", {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokens.accessToken}` }
    });
    await audit(cfg, user, "auth.login", "denied", request);
    return json({ error: "This account is not authorized for HomeRepairHub administration." }, 403);
  }

  await audit(cfg, admin, "auth.login", "success", request);
  return json({ ok: true }, 200, {
    "Set-Cookie": [
      cookie(ACCESS_COOKIE, tokens.accessToken, tokens.expiresIn),
      cookie(REFRESH_COOKIE, tokens.refreshToken, 60 * 60 * 24 * 14)
    ]
  });
}

async function currentSession(request, cfg) {
  let accessToken = getCookie(request, ACCESS_COOKIE);
  const refreshToken = getCookie(request, REFRESH_COOKIE);
  let user = accessToken ? await providerUser(cfg, accessToken) : null;
  let refreshed = null;

  if (!user && refreshToken) {
    refreshed = await tokensFromProvider(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: refreshToken });
    if (refreshed) {
      accessToken = refreshed.accessToken;
      user = await providerUser(cfg, accessToken);
    }
  }

  if (!user) {
    return json({ authenticated: false }, 401, {
      "Set-Cookie": [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)]
    });
  }

  const admin = await loadAdmin(cfg, user);
  if (!admin) {
    await audit(cfg, user, "auth.session", "denied", request);
    return json({ authenticated: false }, 403, {
      "Set-Cookie": [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)]
    });
  }

  const headers = {};
  if (refreshed) {
    headers["Set-Cookie"] = [
      cookie(ACCESS_COOKIE, refreshed.accessToken, refreshed.expiresIn),
      cookie(REFRESH_COOKIE, refreshed.refreshToken, 60 * 60 * 24 * 14)
    ];
  }
  return json(sessionPayload(admin), 200, headers);
}

async function logout(request, cfg) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const accessToken = getCookie(request, ACCESS_COOKIE);
  const actor = accessToken ? await providerUser(cfg, accessToken) : null;
  if (actor) await audit(cfg, actor, "auth.logout", "success", request);
  if (accessToken) {
    await supabaseFetch(cfg, "/auth/v1/logout", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` }
    }).catch(() => null);
  }
  return json({ ok: true }, 200, {
    "Set-Cookie": [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)]
  });
}

async function dispatch(request, env) {
  let cfg;
  try { cfg = config(env); } catch {
    return json({ error: "Admin authentication is not configured" }, 503);
  }
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/admin/login" && request.method === "POST") return login(request, cfg);
  if (path === "/api/admin/logout" && request.method === "POST") return logout(request, cfg);
  if (path === "/api/admin/session" && request.method === "GET") return currentSession(request, cfg);
  if (path === "/api/admin/session" && request.method !== "GET") return json({ error: "Method not allowed" }, 405, { "Allow": "GET" });

  // All other admin routes are deny-by-default until implemented with explicit server-side permission checks.
  const accessToken = getCookie(request, ACCESS_COOKIE);
  const user = accessToken ? await providerUser(cfg, accessToken) : null;
  if (!user) return json({ error: "Authentication required" }, 401);
  const admin = await loadAdmin(cfg, user);
  if (!admin) return json({ error: "Forbidden" }, 403);
  await audit(cfg, admin, "api.unimplemented", "denied", request);
  return json({ error: "This admin endpoint is not implemented yet" }, 404);
}

export async function onRequest(context) {
  try {
    return await dispatch(context.request, context.env);
  } catch {
    return json({ error: "Admin service error" }, 500);
  }
}