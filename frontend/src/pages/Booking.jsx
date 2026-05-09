import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { fmtDate, fmtTime, todayStr } from "../lib/helpers";
import Navbar from "../components/Navbar";
import Alert from "../components/Alert";

const SPORT_LABEL = { tennis: "🎾 Tennis", badminton: "🏸 Badminton", pickleball: "🥒 Pickleball" };

export default function Booking() {
  const { token } = useAuth();
  const [sport, setSport] = useState("tennis");
  const [courts, setCourts] = useState([]);
  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [availability, setAvailability] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rentalQty, setRentalQty] = useState({}); // { equipmentId: qty }
  const [alert, setAlert] = useState({ message: "", type: "error" });

  // Load courts whenever sport changes
  useEffect(() => {
    let alive = true;
    api(`/courts?sport=${sport}`).then((d) => {
      if (!alive) return;
      setCourts(d.courts);
      setCourtId(d.courts[0]?.id?.toString() || "");
    }).catch((err) => setAlert({ message: err.message, type: "error" }));
    api(`/equipment?sport=${sport}`).then((d) => {
      if (!alive) return;
      setEquipment(d.equipment);
    }).catch(() => {});
    return () => { alive = false; };
  }, [sport]);

  // Load availability when court or date changes
  useEffect(() => {
    if (!courtId || !date) { setAvailability(null); return; }
    let alive = true;
    api(`/courts/${courtId}/availability?date=${date}`).then((d) => {
      if (alive) setAvailability(d);
    }).catch((err) => setAlert({ message: err.message, type: "error" }));
    return () => { alive = false; };
  }, [courtId, date]);

  const selectedCourt = useMemo(
    () => courts.find((c) => c.id.toString() === courtId),
    [courts, courtId]
  );

  const total = useMemo(() => {
    if (!selectedCourt) return 0;
    let t = parseFloat(selectedCourt.hourly_rate);
    for (const eq of equipment) {
      const qty = rentalQty[eq.id] || 0;
      if (qty > 0) t += qty * parseFloat(eq.hourly_rate);
    }
    return t;
  }, [selectedCourt, equipment, rentalQty]);

  function openModal(slot) {
    setSelectedSlot(slot);
    setRentalQty({});
    setAlert({ message: "", type: "error" });
  }

  function closeModal() {
    setSelectedSlot(null);
  }

  async function confirmBooking() {
    if (!selectedSlot || !selectedCourt) return;
    const rentals = Object.entries(rentalQty)
      .filter(([, qty]) => qty > 0)
      .map(([equipment_id, quantity]) => ({ equipment_id: parseInt(equipment_id, 10), quantity }));

    try {
      await api("/bookings", {
        method: "POST",
        token,
        body: { court_id: selectedCourt.id, start_time: selectedSlot.start, rentals },
      });
      closeModal();
      setAlert({ message: "Booking confirmed! Check your dashboard.", type: "success" });
      // refresh
      const [avail, eq] = await Promise.all([
        api(`/courts/${courtId}/availability?date=${date}`),
        api(`/equipment?sport=${sport}`),
      ]);
      setAvailability(avail);
      setEquipment(eq.equipment);
    } catch (err) {
      setAlert({ message: err.message, type: "error" });
    }
  }

  return (
    <>
      <Navbar active="booking" />
      <div className="container">
        <Alert message={alert.message} type={alert.type} />

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Book a court</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Pick a sport, court, and date — then choose a 1-hour slot.
          </p>

          <div className="toolbar">
            <div className="form-group">
              <label>Sport</label>
              <select value={sport} onChange={(e) => setSport(e.target.value)}>
                {Object.entries(SPORT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Court</label>
              <select value={courtId} onChange={(e) => setCourtId(e.target.value)}>
                {courts.length === 0 && <option value="">No courts</option>}
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ${c.hourly_rate.toFixed(2)}/hr {c.status === "closed" ? "(closed)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {availability && (
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {availability.court.name} ·{" "}
              <span className={`badge badge-${availability.court.sport}`}>{availability.court.sport}</span>{" "}
              · ${availability.court.hourly_rate.toFixed(2)}/hr · status:{" "}
              <strong>{availability.court.status}</strong>
            </div>
          )}

          {availability?.court.status === "closed" ? (
            <div className="empty">This court is currently closed for maintenance.</div>
          ) : (
            <div className="slot-grid">
              {availability?.slots.map((s) => {
                const reason = s.past ? "past" : s.booked ? "booked" : "";
                const cls = s.available ? "slot" : "slot unavailable";
                return (
                  <button
                    key={s.start}
                    className={cls}
                    disabled={!s.available}
                    onClick={() => openModal(s)}
                  >
                    {fmtTime(s.start)}
                    {reason && <><br /><span className="muted" style={{ fontSize: 11 }}>{reason}</span></>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedSlot && selectedCourt && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <h3>Confirm booking</h3>
            <div className="muted" style={{ marginBottom: 14 }}>
              <strong>{selectedCourt.name}</strong>{" "}
              <span className={`badge badge-${selectedCourt.sport}`}>{selectedCourt.sport}</span>
              <br />
              {fmtDate(selectedSlot.start)} – {fmtTime(selectedSlot.end)}
              <br />
              Court rate: ${selectedCourt.hourly_rate.toFixed(2)}
            </div>

            <h4 style={{ margin: "8px 0" }}>Optional equipment</h4>
            {equipment.length === 0 ? (
              <div className="muted">No equipment available for this sport.</div>
            ) : (
              equipment.map((eq) => (
                <div className="equipment-row" key={eq.id}>
                  <div style={{ flex: 1 }}>
                    <div className="name">{eq.name}</div>
                    <div className="price">${eq.hourly_rate.toFixed(2)} · stock: {eq.stock}</div>
                  </div>
                  <input
                    type="number" min="0" max={eq.stock}
                    value={rentalQty[eq.id] || 0}
                    onChange={(e) => setRentalQty({ ...rentalQty, [eq.id]: parseInt(e.target.value || 0, 10) })}
                  />
                </div>
              ))
            )}

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", fontWeight: 600 }}>
              Total: ${total.toFixed(2)}
            </div>

            <Alert message={alert.message} type={alert.type} />

            <div className="modal-actions">
              <button className="btn" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmBooking}>Confirm booking</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
