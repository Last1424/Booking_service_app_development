import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { fmtDate } from "../lib/helpers";
import Navbar from "../components/Navbar";
import Alert from "../components/Alert";

const SPORTS = ["tennis", "badminton", "pickleball"];

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState("bookings");
  const [stats, setStats] = useState(null);
  const [alert, setAlert] = useState({ message: "", type: "error" });

  async function loadStats() {
    try { setStats(await api("/admin/stats", { token })); }
    catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  useEffect(() => { loadStats(); }, []);

  return (
    <>
      <Navbar active="admin" />
      <div className="container">
        <Alert message={alert.message} type={alert.type} />

        {stats && (
          <div className="stat-grid">
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Courts" value={stats.courts} />
            <StatCard label="Confirmed bookings" value={stats.confirmed_bookings} />
            <StatCard label="Upcoming" value={stats.upcoming_bookings} />
          </div>
        )}

        <div className="card">
          <div className="tabs">
            {["bookings", "users", "courts", "equipment", "notifications"].map((t) => (
              <div key={t}
                className={"tab" + (tab === t ? " active" : "")}
                onClick={() => setTab(t)}
                style={{ textTransform: "capitalize" }}>
                {t}
              </div>
            ))}
          </div>

          {tab === "bookings" && <BookingsTab token={token} setAlert={setAlert} reloadStats={loadStats} />}
          {tab === "users" && <UsersTab token={token} setAlert={setAlert} />}
          {tab === "courts" && <CourtsTab token={token} setAlert={setAlert} reloadStats={loadStats} />}
          {tab === "equipment" && <EquipmentTab token={token} setAlert={setAlert} />}
          {tab === "notifications" && <NotificationsTab token={token} setAlert={setAlert} />}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

/* -------- Bookings tab -------- */
function BookingsTab({ token, setAlert, reloadStats }) {
  const [scope, setScope] = useState("upcoming");
  const [bookings, setBookings] = useState(null);

  async function load() {
    try {
      const d = await api(`/admin/bookings?scope=${scope}`, { token });
      setBookings(d.bookings);
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }
  useEffect(() => { load(); }, [scope]);

  async function cancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api(`/bookings/${id}/cancel`, { method: "POST", token });
      await load();
      reloadStats();
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  const now = new Date();
  return (
    <>
      <div className="toolbar">
        <div className="form-group">
          <label>Filter</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All bookings</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Confirmed (incl. past)</option>
          </select>
        </div>
      </div>
      {bookings === null ? <div className="empty">Loading…</div> :
        bookings.length === 0 ? <div className="empty">No bookings.</div> : (
          <table>
            <thead><tr>
              <th>#</th><th>User</th><th>Court</th><th>Sport</th><th>When</th>
              <th className="right">Total</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {bookings.map((b) => {
                const isUpcoming = new Date(b.start_time) > now && b.status === "confirmed";
                return (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.user_name}</td>
                    <td>{b.court_name}</td>
                    <td><span className={`badge badge-${b.sport}`}>{b.sport}</span></td>
                    <td>{fmtDate(b.start_time)}</td>
                    <td className="right">${b.total_price.toFixed(2)}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>{isUpcoming && <button className="btn btn-sm btn-danger" onClick={() => cancel(b.id)}>Cancel</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
    </>
  );
}

/* -------- Users tab -------- */
function UsersTab({ token, setAlert }) {
  const [users, setUsers] = useState(null);
  useEffect(() => {
    api("/admin/users", { token })
      .then((d) => setUsers(d.users))
      .catch((err) => setAlert({ message: err.message, type: "error" }));
  }, []);

  if (users === null) return <div className="empty">Loading…</div>;
  return (
    <table>
      <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.id}</td>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.phone || "—"}</td>
            <td><span className={"badge " + (u.role === "admin" ? "badge-admin" : "")}>{u.role}</span></td>
            <td className="muted">{fmtDate(u.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* -------- Courts tab -------- */
function CourtsTab({ token, setAlert, reloadStats }) {
  const [courts, setCourts] = useState(null);
  const [form, setForm] = useState({ name: "", sport: "tennis", hourly_rate: "" });

  async function load() {
    try {
      const d = await api("/courts");
      setCourts(d.courts);
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }
  useEffect(() => { load(); }, []);

  function updateRow(id, field, value) {
    setCourts((cs) => cs.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  async function save(c) {
    try {
      await api(`/admin/courts/${c.id}`, {
        method: "PATCH", token,
        body: { name: c.name, sport: c.sport, status: c.status, hourly_rate: c.hourly_rate },
      });
      setAlert({ message: "Court updated.", type: "success" });
      await load();
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  async function add(e) {
    e.preventDefault();
    try {
      await api("/admin/courts", {
        method: "POST", token,
        body: { name: form.name.trim(), sport: form.sport, hourly_rate: parseFloat(form.hourly_rate) },
      });
      setForm({ name: "", sport: "tennis", hourly_rate: "" });
      setAlert({ message: "Court added.", type: "success" });
      await load();
      reloadStats();
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  if (courts === null) return <div className="empty">Loading…</div>;
  return (
    <>
      <h3>Courts</h3>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Sport</th><th>Rate ($/hr)</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {courts.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td><input value={c.name} onChange={(e) => updateRow(c.id, "name", e.target.value)} /></td>
              <td>
                <select value={c.sport} onChange={(e) => updateRow(c.id, "sport", e.target.value)}>
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <input type="number" step="0.01" min="0" style={{ width: 90 }}
                  value={c.hourly_rate}
                  onChange={(e) => updateRow(c.id, "hourly_rate", e.target.value)} />
              </td>
              <td>
                <select value={c.status} onChange={(e) => updateRow(c.id, "status", e.target.value)}>
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </select>
              </td>
              <td><button className="btn btn-sm btn-primary" onClick={() => save(c)}>Save</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Add a court</h3>
      <form className="row" onSubmit={add}>
        <div className="form-group">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Sport</label>
          <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Hourly rate ($)</label>
          <input required type="number" step="0.01" min="0"
            value={form.hourly_rate}
            onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
        </div>
        <div className="form-group" style={{ display: "flex", alignItems: "end" }}>
          <button className="btn btn-primary" type="submit">Add court</button>
        </div>
      </form>
    </>
  );
}

/* -------- Equipment tab -------- */
function EquipmentTab({ token, setAlert }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ name: "", sport: "tennis", stock: 0, hourly_rate: 0 });

  async function load() {
    try {
      const d = await api("/equipment");
      setItems(d.equipment);
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }
  useEffect(() => { load(); }, []);

  function updateRow(id, field, value) {
    setItems((cs) => cs.map((e) => e.id === id ? { ...e, [field]: value } : e));
  }

  async function save(eq) {
    try {
      await api(`/admin/equipment/${eq.id}`, {
        method: "PATCH", token,
        body: { name: eq.name, sport: eq.sport, stock: parseInt(eq.stock, 10), hourly_rate: eq.hourly_rate },
      });
      setAlert({ message: "Equipment updated.", type: "success" });
      await load();
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  async function del(id) {
    if (!confirm("Delete this equipment?")) return;
    try {
      await api(`/admin/equipment/${id}`, { method: "DELETE", token });
      await load();
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  async function add(e) {
    e.preventDefault();
    try {
      await api("/admin/equipment", {
        method: "POST", token,
        body: {
          name: form.name.trim(), sport: form.sport,
          stock: parseInt(form.stock, 10), hourly_rate: parseFloat(form.hourly_rate),
        },
      });
      setForm({ name: "", sport: "tennis", stock: 0, hourly_rate: 0 });
      setAlert({ message: "Equipment added.", type: "success" });
      await load();
    } catch (err) { setAlert({ message: err.message, type: "error" }); }
  }

  if (items === null) return <div className="empty">Loading…</div>;
  return (
    <>
      <h3>Equipment</h3>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Sport</th><th>Stock</th><th>Rate ($/hr)</th><th></th></tr></thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td><input value={e.name} onChange={(ev) => updateRow(e.id, "name", ev.target.value)} /></td>
              <td>
                <select value={e.sport} onChange={(ev) => updateRow(e.id, "sport", ev.target.value)}>
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <input type="number" min="0" style={{ width: 80 }}
                  value={e.stock} onChange={(ev) => updateRow(e.id, "stock", ev.target.value)} />
              </td>
              <td>
                <input type="number" step="0.01" min="0" style={{ width: 90 }}
                  value={e.hourly_rate} onChange={(ev) => updateRow(e.id, "hourly_rate", ev.target.value)} />
              </td>
              <td>
                <button className="btn btn-sm btn-primary" onClick={() => save(e)}>Save</button>{" "}
                <button className="btn btn-sm btn-danger" onClick={() => del(e.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Add equipment</h3>
      <form className="row" onSubmit={add}>
        <div className="form-group">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Sport</label>
          <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Stock</label>
          <input required type="number" min="0"
            value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Hourly rate ($)</label>
          <input required type="number" step="0.01" min="0"
            value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
        </div>
        <div className="form-group" style={{ display: "flex", alignItems: "end" }}>
          <button className="btn btn-primary" type="submit">Add</button>
        </div>
      </form>
    </>
  );
}

/* -------- Notifications tab -------- */
function NotificationsTab({ token, setAlert }) {
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    api("/admin/notifications", { token })
      .then((d) => setLogs(d.notifications))
      .catch((err) => setAlert({ message: err.message, type: "error" }));
  }, []);

  if (logs === null) return <div className="empty">Loading…</div>;
  if (logs.length === 0) return <div className="empty">No notifications yet.</div>;
  return (
    <>
      <p className="muted">Mock email/SMS notifications (last 100). In production these would go to a real provider.</p>
      <table>
        <thead><tr><th>When</th><th>Channel</th><th>To</th><th>Subject</th><th>Message</th></tr></thead>
        <tbody>
          {logs.map((n) => (
            <tr key={n.id}>
              <td className="muted">{fmtDate(n.sent_at)}</td>
              <td><span className="badge">{n.channel}</span></td>
              <td>{n.recipient}</td>
              <td>{n.subject}</td>
              <td className="muted">{n.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
