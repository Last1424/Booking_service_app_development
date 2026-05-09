import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { fmtDate } from "../lib/helpers";
import Navbar from "../components/Navbar";
import Alert from "../components/Alert";

export default function Dashboard() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [alert, setAlert] = useState({ message: "", type: "error" });

  async function load() {
    try {
      const d = await api("/bookings/mine", { token });
      setBookings(d.bookings);
    } catch (err) {
      setAlert({ message: err.message, type: "error" });
    }
  }

  useEffect(() => { load(); }, []);

  async function cancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api(`/bookings/${id}/cancel`, { method: "POST", token });
      setAlert({ message: "Booking cancelled.", type: "success" });
      await load();
    } catch (err) {
      setAlert({ message: err.message, type: "error" });
    }
  }

  const now = new Date();

  return (
    <>
      <Navbar active="dashboard" />
      <div className="container">
        <Alert message={alert.message} type={alert.type} />

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>My bookings</h2>
          <p className="muted" style={{ marginTop: 0 }}>Upcoming bookings can be cancelled.</p>

          {bookings === null ? (
            <div className="empty">Loading…</div>
          ) : bookings.length === 0 ? (
            <div className="empty">No bookings yet. <a href="#/booking">Book your first court</a>.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Court</th><th>Sport</th><th>When</th><th>Equipment</th>
                  <th className="right">Total</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const isUpcoming = new Date(b.start_time) > now && b.status === "confirmed";
                  const rentals = (b.rentals || []).map((r) => `${r.equipment_name} ×${r.quantity}`).join(", ") || "—";
                  return (
                    <tr key={b.id}>
                      <td>{b.court_name}</td>
                      <td><span className={`badge badge-${b.sport}`}>{b.sport}</span></td>
                      <td>{fmtDate(b.start_time)}</td>
                      <td className="muted">{rentals}</td>
                      <td className="right">${b.total_price.toFixed(2)}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td>
                        {isUpcoming && (
                          <button className="btn btn-sm btn-danger" onClick={() => cancel(b.id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
