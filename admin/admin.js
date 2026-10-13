(() => {
  "use strict";

  // This UI intentionally has no local login, password store, or browser-held API token.
  // The server must authenticate the request and return the caller's effective permissions.
  const API_BASE = "/api/admin";
  const views = ["overview", "users", "roles", "audit", "bookings", "orders", "technicians", "services", "reports"];
  const banner = document.getElementById("access-banner");

  function showLocked(message, detail) {
    delete window.__HRH_SESSION;
    document.querySelector(".stat-grid")?.classList.add("hidden");
    document.querySelector(".content-grid")?.classList.add("hidden");
    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
      button.disabled = button.dataset.view !== "overview";
    });
    document.getElementById("logout-button")?.classList.add("hidden");
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.classList.remove("hidden");
    document.getElementById("security-state").textContent = "Access not verified";
    document.getElementById("user-name").textContent = "Unauthenticated";
    document.getElementById("user-avatar").textContent = "!";
    banner.className = "notice notice-warning";
    banner.innerHTML = '<span class="notice-icon">!</span><div><strong></strong><p></p></div>';
    banner.querySelector("strong").textContent = message;
    banner.querySelector("p").textContent = detail;
    document.querySelectorAll("[data-requires-permission]").forEach(el => el.setAttribute("disabled", "disabled"));
  }

  function hasPermission(session, permission) {
    return Array.isArray(session.permissions) && session.permissions.includes(permission);
  }

  function activateView(view) {
    if (!views.includes(view)) return;
    document.querySelectorAll(".page").forEach(section => section.classList.add("hidden"));
    const page = document.getElementById("page-" + view);
    if (page) page.classList.remove("hidden");
    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    const crumb = document.getElementById("page-crumb");
    if (crumb) crumb.textContent = view.charAt(0).toUpperCase() + view.slice(1).replace("-", " ");
  }

  document.querySelectorAll(".nav-item[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const required = button.dataset.permission;
      if (!window.__HRH_SESSION) return;
      if (required && !hasPermission(window.__HRH_SESSION, required)) {
        showLocked("Permission denied", "Your account does not have permission to open this section.");
        return;
      }
      activateView(button.dataset.view);
    });
  });

  async function bootstrap() {
    document.getElementById("today-label").textContent =
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date());
    try {
      const response = await fetch(API_BASE + "/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" },
        cache: "no-store",
        redirect: "error"
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showLocked("Admin sign-in required", "Sign in through the configured identity provider. If you believe you should have access, contact the system administrator.");
        } else {
          showLocked("Admin service unavailable", "The protected admin API is not connected yet. No administrative actions are enabled.");
        }
        return;
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        showLocked("Secure session could not be verified", "The session endpoint did not return the expected JSON response. Access remains locked.");
        return;
      }
      const session = await response.json();
      if (session.authenticated !== true || !session.user || !Array.isArray(session.permissions)) {
        showLocked("Secure session could not be verified", "The API did not return a valid authenticated session and permissions. Access remains locked.");
        return;
      }
      window.__HRH_SESSION = Object.freeze({
        authenticated: true,
        user: Object.freeze({ id: String(session.user.id || ""), name: String(session.user.name || "Admin") }),
        permissions: Object.freeze(session.permissions.map(String))
      });
      document.querySelector(".stat-grid")?.classList.remove("hidden");
      document.querySelector(".content-grid")?.classList.remove("hidden");
      document.getElementById("login-form")?.classList.add("hidden");
      document.getElementById("logout-button")?.classList.remove("hidden");
      document.getElementById("security-state").textContent = "Access verified";
      document.getElementById("user-name").textContent = window.__HRH_SESSION.user.name;
      document.getElementById("user-avatar").textContent = window.__HRH_SESSION.user.name.trim().charAt(0).toUpperCase() || "A";
      banner.className = "notice notice-success";
      banner.innerHTML = '<span class="notice-icon">✓</span><div><strong>Secure session verified</strong><p>Your identity is verified. Available actions must still be authorized by the backend on every request.</p></div>';
      document.getElementById("stat-users").textContent = Number.isFinite(session.stats?.activeUsers) ? session.stats.activeUsers : "—";
      document.getElementById("stat-roles").textContent = Number.isFinite(session.stats?.roles) ? session.stats.roles : "—";
      document.getElementById("stat-modules").textContent = Number.isFinite(session.stats?.activeModules) ? session.stats.activeModules : "1";
      document.getElementById("stat-events").textContent = Number.isFinite(session.stats?.recentSecurityEvents) ? session.stats.recentSecurityEvents : "—";
      document.querySelectorAll(".nav-item[data-permission]").forEach(button => {
        button.disabled = !hasPermission(window.__HRH_SESSION, button.dataset.permission);
      });
      activateView("overview");
    } catch (_) {
      showLocked("Admin service not connected", "The protected session endpoint could not be reached or verified. Configure the Cloudflare Access policy and admin Worker/API before using this portal.");
    }
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const emailInput = document.getElementById("login-email");
      const passwordInput = document.getElementById("login-password");
      const error = document.getElementById("login-error");
      const submit = document.getElementById("login-submit");
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      error.textContent = "";
      if (!emailInput.checkValidity() || !password || password.length > 1024) {
        error.textContent = "Enter a valid email address and password.";
        return;
      }
      submit.disabled = true;
      submit.textContent = "Verifying…";
      try {
        const response = await fetch(API_BASE + "/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ email, password })
        });
        const result = await response.json().catch(() => ({}));
        passwordInput.value = "";
        if (!response.ok) {
          error.textContent = result.error || "Sign-in failed. Please try again.";
          return;
        }
        emailInput.value = email;
        await bootstrap();
        if (!window.__HRH_SESSION) {
          error.textContent = "Your session could not be verified. Please try again or contact the administrator.";
        }
      } catch (_) {
        passwordInput.value = "";
        error.textContent = "The sign-in service is unavailable. Your access has not been granted.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Sign in securely";
      }
    });
  }

  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        await fetch(API_BASE + "/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Accept": "application/json" },
          cache: "no-store"
        });
      } catch (_) {
        // The server-side session may still be active; local UI is locked immediately below.
      }
      showLocked("You have been signed out", "Your admin portal is locked. Sign in again to continue.");
      logoutButton.disabled = false;
    });
  }

  bootstrap();
})();