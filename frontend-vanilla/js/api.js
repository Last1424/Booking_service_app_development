const API_BASE = "http://localhost:5000/api";

const Auth = {
  get token() { return localStorage.getItem("token"); },
  set token(v) { v ? localStorage.setItem("token", v) : localStorage.removeItem("token"); },
  get user() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },
  set user(u) { u ? localStorage.setItem("user", JSON.stringify(u)) : localStorage.removeItem("user"); },
  logout() { this.token = null; this.user = null; window.location.href = "index.html"; },
  requireAuth(adminOnly = false) {
    if (!this.token || !this.user) {
      window.location.href = "index.html";
      return false;
    }
    if (adminOnly && this.user.role !== "admin") {
      alert("Admin access required");
      window.location.href = "dashboard.html";
      return false;
    }
    return true;
  },
};

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    if (res.status === 401 && auth) {
      Auth.logout();
    }
    throw new Error(msg);
  }
  return data;
}

function renderNavbar(active) {
  const user = Auth.user;
  const isAdmin = user?.role === "admin";
  const links = [];
  if (user) {
    links.push(`<a href="booking.html" class="${active==='booking'?'active':''}">Book</a>`);
    links.push(`<a href="dashboard.html" class="${active==='dashboard'?'active':''}">My Bookings</a>`);
    if (isAdmin) {
      links.push(`<a href="admin.html" class="${active==='admin'?'active':''}">Admin</a>`);
    }
  }

  const right = user
    ? `<span class="user-info">${escapeHtml(user.name)}${isAdmin ? ' <span class="badge badge-admin">admin</span>' : ''}</span>
       <button class="btn btn-sm" id="logoutBtn">Logout</button>`
    : `<a href="index.html" class="${active==='login'?'active':''}">Login</a>
       <a href="signup.html" class="${active==='signup'?'active':''}">Sign up</a>`;

  return `
    <nav class="navbar">
      <a class="brand" href="${user ? 'booking.html' : 'index.html'}">🎾 CourtBook</a>
      ${links.join("")}
      ${right}
    </nav>
  `;
}

function mountNavbar(active) {
  const el = document.getElementById("navbar");
  if (!el) return;
  el.innerHTML = renderNavbar(active);
  const logout = document.getElementById("logoutBtn");
  if (logout) logout.onclick = () => Auth.logout();
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function showAlert(containerId, message, type = "error") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  if (type === "success") setTimeout(() => { el.innerHTML = ""; }, 3000);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
