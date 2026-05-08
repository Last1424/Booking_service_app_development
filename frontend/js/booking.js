if (!Auth.requireAuth()) { /* redirected */ }
mountNavbar("booking");

const sportEl = document.getElementById("sport");
const courtEl = document.getElementById("court");
const dateEl = document.getElementById("date");
const slotsEl = document.getElementById("slots");
const courtInfoEl = document.getElementById("courtInfo");

let courts = [];
let equipmentBySport = {};
let selectedSlot = null;
let selectedCourt = null;

dateEl.value = todayStr();
dateEl.min = todayStr();

async function loadCourts() {
  const sport = sportEl.value;
  const data = await api(`/courts?sport=${sport}`, { auth: false });
  courts = data.courts;
  courtEl.innerHTML = courts.length
    ? courts.map(c => `<option value="${c.id}">${escapeHtml(c.name)} — $${c.hourly_rate.toFixed(2)}/hr ${c.status === 'closed' ? '(closed)' : ''}</option>`).join("")
    : `<option value="">No courts available</option>`;
  await loadEquipment(sport);
  await loadSlots();
}

async function loadEquipment(sport) {
  if (equipmentBySport[sport]) return;
  const data = await api(`/equipment?sport=${sport}`, { auth: false });
  equipmentBySport[sport] = data.equipment;
}

async function loadSlots() {
  const courtId = courtEl.value;
  const date = dateEl.value;
  if (!courtId || !date) {
    slotsEl.innerHTML = `<div class="empty">Select a court and date.</div>`;
    return;
  }
  slotsEl.innerHTML = `<div class="empty">Loading…</div>`;
  try {
    const data = await api(`/courts/${courtId}/availability?date=${date}`, { auth: false });
    selectedCourt = data.court;
    courtInfoEl.innerHTML = `${escapeHtml(data.court.name)} · <span class="badge badge-${data.court.sport}">${data.court.sport}</span> · $${data.court.hourly_rate.toFixed(2)}/hr · status: <strong>${data.court.status}</strong>`;
    if (data.court.status === "closed") {
      slotsEl.innerHTML = `<div class="empty">This court is currently closed for maintenance.</div>`;
      return;
    }
    slotsEl.innerHTML = data.slots.map(s => {
      const label = fmtTime(s.start);
      const cls = s.available ? "slot" : "slot unavailable";
      const reason = s.past ? "past" : (s.booked ? "booked" : "");
      return `<button class="${cls}" data-start="${s.start}" data-end="${s.end}" ${s.available ? '' : 'disabled'}>
        ${label}${reason ? `<br><span class="muted" style="font-size:11px;">${reason}</span>` : ''}
      </button>`;
    }).join("");
    slotsEl.querySelectorAll("button.slot:not(.unavailable)").forEach(btn => {
      btn.addEventListener("click", () => openModal(btn.dataset.start, btn.dataset.end));
    });
  } catch (err) {
    showAlert("alert", err.message);
  }
}

function openModal(start, end) {
  selectedSlot = { start, end };
  const sport = selectedCourt.sport;
  const eqList = equipmentBySport[sport] || [];

  document.getElementById("modalSummary").innerHTML = `
    <strong>${escapeHtml(selectedCourt.name)}</strong>
    <span class="badge badge-${sport}">${sport}</span><br/>
    ${fmtDate(start)} – ${fmtTime(end)}<br/>
    Court rate: $${selectedCourt.hourly_rate.toFixed(2)}
  `;

  const eqHtml = eqList.length ? eqList.map(e => `
    <div class="equipment-row">
      <div>
        <div class="name">${escapeHtml(e.name)}</div>
        <div class="price">$${e.hourly_rate.toFixed(2)} · stock: ${e.stock}</div>
      </div>
      <input type="number" min="0" max="${e.stock}" value="0" data-eq-id="${e.id}" data-price="${e.hourly_rate}" />
    </div>
  `).join("") : `<div class="muted">No equipment available for this sport.</div>`;
  document.getElementById("equipmentList").innerHTML = eqHtml;

  document.querySelectorAll('#equipmentList input[type="number"]').forEach(inp => {
    inp.addEventListener("input", recalcTotal);
  });
  recalcTotal();
  document.getElementById("modalAlert").innerHTML = "";
  document.getElementById("modal").classList.remove("hidden");
}

function recalcTotal() {
  let total = parseFloat(selectedCourt.hourly_rate);
  document.querySelectorAll('#equipmentList input[type="number"]').forEach(inp => {
    const qty = parseInt(inp.value || 0, 10);
    const price = parseFloat(inp.dataset.price);
    if (qty > 0) total += qty * price;
  });
  document.getElementById("totalPrice").textContent = total.toFixed(2);
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  selectedSlot = null;
}

document.getElementById("cancelBtn").onclick = closeModal;
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});

document.getElementById("confirmBtn").addEventListener("click", async () => {
  if (!selectedSlot || !selectedCourt) return;
  const rentals = [];
  document.querySelectorAll('#equipmentList input[type="number"]').forEach(inp => {
    const qty = parseInt(inp.value || 0, 10);
    if (qty > 0) rentals.push({ equipment_id: parseInt(inp.dataset.eqId, 10), quantity: qty });
  });
  try {
    await api("/bookings", {
      method: "POST",
      body: {
        court_id: selectedCourt.id,
        start_time: selectedSlot.start,
        rentals,
      },
    });
    closeModal();
    showAlert("alert", "Booking confirmed! Check your dashboard.", "success");
    equipmentBySport = {};
    await loadEquipment(selectedCourt.sport);
    await loadSlots();
  } catch (err) {
    showAlert("modalAlert", err.message);
  }
});

sportEl.addEventListener("change", loadCourts);
courtEl.addEventListener("change", loadSlots);
dateEl.addEventListener("change", loadSlots);

loadCourts();
