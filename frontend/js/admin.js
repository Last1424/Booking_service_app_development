if (!Auth.requireAuth(true)) { /* redirected */ }
mountNavbar("admin");

const tabs = document.querySelectorAll(".tab");
tabs.forEach(t => {
  t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(`tab-${t.dataset.tab}`).classList.remove("hidden");
    if (t.dataset.tab === "users") loadUsers();
    if (t.dataset.tab === "courts") loadCourts();
    if (t.dataset.tab === "equipment") loadEquipment();
    if (t.dataset.tab === "notifications") loadNotifications();
  });
});

async function loadStats() {
  try {
    const s = await api("/admin/stats");
    document.getElementById("stats").innerHTML = `
      <div class="stat-card"><div class="label">Users</div><div class="value">${s.users}</div></div>
      <div class="stat-card"><div class="label">Courts</div><div class="value">${s.courts}</div></div>
      <div class="stat-card"><div class="label">Confirmed bookings</div><div class="value">${s.confirmed_bookings}</div></div>
      <div class="stat-card"><div class="label">Upcoming</div><div class="value">${s.upcoming_bookings}</div></div>
    `;
  } catch (err) { showAlert("alert", err.message); }
}

async function loadBookings() {
  const scope = document.getElementById("bookingScope").value;
  try {
    const data = await api(`/admin/bookings?scope=${scope}`);
    const el = document.getElementById("bookingsTable");
    if (!data.bookings.length) { el.innerHTML = `<div class="empty">No bookings.</div>`; return; }
    const now = new Date();
    el.innerHTML = `
      <table>
        <thead><tr>
          <th>#</th><th>User</th><th>Court</th><th>Sport</th><th>When</th>
          <th class="right">Total</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${data.bookings.map(b => {
            const isUpcoming = new Date(b.start_time) > now && b.status === "confirmed";
            return `
              <tr>
                <td>${b.id}</td>
                <td>${escapeHtml(b.user_name || "")}</td>
                <td>${escapeHtml(b.court_name)}</td>
                <td><span class="badge badge-${b.sport}">${b.sport}</span></td>
                <td>${fmtDate(b.start_time)}</td>
                <td class="right">$${b.total_price.toFixed(2)}</td>
                <td><span class="badge badge-${b.status}">${b.status}</span></td>
                <td>${isUpcoming ? `<button class="btn btn-sm btn-danger" data-cancel="${b.id}">Cancel</button>` : ""}</td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    el.querySelectorAll("button[data-cancel]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Cancel this booking?")) return;
        try {
          await api(`/bookings/${btn.dataset.cancel}/cancel`, { method: "POST" });
          await loadBookings();
          await loadStats();
        } catch (e) { showAlert("alert", e.message); }
      };
    });
  } catch (err) { showAlert("alert", err.message); }
}

document.getElementById("bookingScope").addEventListener("change", loadBookings);

async function loadUsers() {
  try {
    const data = await api("/admin/users");
    document.getElementById("usersTable").innerHTML = `
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td>${u.id}</td>
              <td>${escapeHtml(u.name)}</td>
              <td>${escapeHtml(u.email)}</td>
              <td>${escapeHtml(u.phone || "—")}</td>
              <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : ''}">${u.role}</span></td>
              <td class="muted">${fmtDate(u.created_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  } catch (err) { showAlert("alert", err.message); }
}

async function loadCourts() {
  try {
    const data = await api("/courts", { auth: false });
    const el = document.getElementById("courtsTable");
    el.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Sport</th><th>Rate ($/hr)</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${data.courts.map(c => `
            <tr data-id="${c.id}">
              <td>${c.id}</td>
              <td><input data-field="name" value="${escapeHtml(c.name)}" /></td>
              <td>
                <select data-field="sport">
                  ${["tennis","badminton","pickleball"].map(s =>
                    `<option value="${s}" ${c.sport===s?'selected':''}>${s}</option>`
                  ).join("")}
                </select>
              </td>
              <td><input data-field="hourly_rate" type="number" step="0.01" min="0" value="${c.hourly_rate}" style="width:90px;" /></td>
              <td>
                <select data-field="status">
                  <option value="open" ${c.status==='open'?'selected':''}>open</option>
                  <option value="closed" ${c.status==='closed'?'selected':''}>closed</option>
                </select>
              </td>
              <td><button class="btn btn-sm btn-primary" data-save>Save</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
    el.querySelectorAll("button[data-save]").forEach(btn => {
      btn.onclick = async () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const body = {};
        tr.querySelectorAll("[data-field]").forEach(inp => {
          body[inp.dataset.field] = inp.value;
        });
        try {
          await api(`/admin/courts/${id}`, { method: "PATCH", body });
          showAlert("alert", "Court updated.", "success");
          await loadCourts();
        } catch (e) { showAlert("alert", e.message); }
      };
    });
  } catch (err) { showAlert("alert", err.message); }
}

document.getElementById("courtForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/admin/courts", {
      method: "POST",
      body: {
        name: document.getElementById("cName").value.trim(),
        sport: document.getElementById("cSport").value,
        hourly_rate: parseFloat(document.getElementById("cRate").value),
      },
    });
    e.target.reset();
    showAlert("alert", "Court added.", "success");
    await loadCourts();
    await loadStats();
  } catch (err) { showAlert("alert", err.message); }
});

async function loadEquipment() {
  try {
    const data = await api("/equipment", { auth: false });
    const el = document.getElementById("equipmentTable");
    el.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Sport</th><th>Stock</th><th>Rate ($/hr)</th><th></th></tr></thead>
        <tbody>
          ${data.equipment.map(e => `
            <tr data-id="${e.id}">
              <td>${e.id}</td>
              <td><input data-field="name" value="${escapeHtml(e.name)}" /></td>
              <td>
                <select data-field="sport">
                  ${["tennis","badminton","pickleball"].map(s =>
                    `<option value="${s}" ${e.sport===s?'selected':''}>${s}</option>`
                  ).join("")}
                </select>
              </td>
              <td><input data-field="stock" type="number" min="0" value="${e.stock}" style="width:80px;" /></td>
              <td><input data-field="hourly_rate" type="number" step="0.01" min="0" value="${e.hourly_rate}" style="width:90px;" /></td>
              <td>
                <button class="btn btn-sm btn-primary" data-save>Save</button>
                <button class="btn btn-sm btn-danger" data-delete>Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
    el.querySelectorAll("button[data-save]").forEach(btn => {
      btn.onclick = async () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const body = {};
        tr.querySelectorAll("[data-field]").forEach(inp => { body[inp.dataset.field] = inp.value; });
        try {
          await api(`/admin/equipment/${id}`, { method: "PATCH", body });
          showAlert("alert", "Equipment updated.", "success");
          await loadEquipment();
        } catch (e) { showAlert("alert", e.message); }
      };
    });
    el.querySelectorAll("button[data-delete]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Delete this equipment?")) return;
        const id = btn.closest("tr").dataset.id;
        try {
          await api(`/admin/equipment/${id}`, { method: "DELETE" });
          await loadEquipment();
        } catch (e) { showAlert("alert", e.message); }
      };
    });
  } catch (err) { showAlert("alert", err.message); }
}

document.getElementById("equipmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/admin/equipment", {
      method: "POST",
      body: {
        name: document.getElementById("eName").value.trim(),
        sport: document.getElementById("eSport").value,
        stock: parseInt(document.getElementById("eStock").value, 10),
        hourly_rate: parseFloat(document.getElementById("eRate").value),
      },
    });
    e.target.reset();
    document.getElementById("eStock").value = "0";
    document.getElementById("eRate").value = "0";
    showAlert("alert", "Equipment added.", "success");
    await loadEquipment();
  } catch (err) { showAlert("alert", err.message); }
});

async function loadNotifications() {
  try {
    const data = await api("/admin/notifications");
    const el = document.getElementById("notificationsTable");
    if (!data.notifications.length) { el.innerHTML = `<div class="empty">No notifications yet.</div>`; return; }
    el.innerHTML = `
      <table>
        <thead><tr><th>When</th><th>Channel</th><th>To</th><th>Subject</th><th>Message</th></tr></thead>
        <tbody>
          ${data.notifications.map(n => `
            <tr>
              <td class="muted">${fmtDate(n.sent_at)}</td>
              <td><span class="badge">${n.channel}</span></td>
              <td>${escapeHtml(n.recipient)}</td>
              <td>${escapeHtml(n.subject || "")}</td>
              <td class="muted">${escapeHtml(n.message)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  } catch (err) { showAlert("alert", err.message); }
}

loadStats();
loadBookings();
