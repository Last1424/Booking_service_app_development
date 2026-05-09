if (!Auth.requireAuth()) { /* redirected */ }
mountNavbar("dashboard");

const bookingsEl = document.getElementById("bookings");

async function load() {
  try {
    const data = await api("/bookings/mine");
    if (!data.bookings.length) {
      bookingsEl.innerHTML = `<div class="empty">No bookings yet. <a href="booking.html">Book your first court</a>.</div>`;
      return;
    }
    const now = new Date();
    bookingsEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Court</th>
            <th>Sport</th>
            <th>When</th>
            <th>Equipment</th>
            <th class="right">Total</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.bookings.map(b => {
            const isUpcoming = new Date(b.start_time) > now && b.status === "confirmed";
            const rentals = (b.rentals || []).map(r => `${escapeHtml(r.equipment_name)} ×${r.quantity}`).join(", ") || "—";
            return `
              <tr>
                <td>${escapeHtml(b.court_name)}</td>
                <td><span class="badge badge-${b.sport}">${b.sport}</span></td>
                <td>${fmtDate(b.start_time)}</td>
                <td class="muted">${rentals}</td>
                <td class="right">$${b.total_price.toFixed(2)}</td>
                <td><span class="badge badge-${b.status}">${b.status}</span></td>
                <td>${isUpcoming ? `<button class="btn btn-sm btn-danger" data-cancel="${b.id}">Cancel</button>` : ""}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
    bookingsEl.querySelectorAll("button[data-cancel]").forEach(btn => {
      btn.onclick = () => cancelBooking(parseInt(btn.dataset.cancel, 10));
    });
  } catch (err) {
    showAlert("alert", err.message);
  }
}

async function cancelBooking(id) {
  if (!confirm("Cancel this booking?")) return;
  try {
    await api(`/bookings/${id}/cancel`, { method: "POST" });
    showAlert("alert", "Booking cancelled.", "success");
    await load();
  } catch (err) {
    showAlert("alert", err.message);
  }
}

load();
