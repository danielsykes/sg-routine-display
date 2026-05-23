/**
 * Bus arrivals — fetch, render cards, manage bus markers on map.
 */
import { CONFIG, SCHEDULE } from "./config.js";

// ── Schedule helpers ────────────────────────────────────
function getTodaySchedule() {
  const day = new Date().getDay();
  if (day === 0) return { first: SCHEDULE.SUN_FirstBus, last: SCHEDULE.SUN_LastBus, label: "Sun" };
  if (day === 6) return { first: SCHEDULE.SAT_FirstBus, last: SCHEDULE.SAT_LastBus, label: "Sat" };
  return { first: SCHEDULE.WD_FirstBus, last: SCHEDULE.WD_LastBus, label: "Weekday" };
}

function getNextServiceTime() {
  const now = new Date();
  const hhmm = now.getHours() * 100 + now.getMinutes();
  const today = getTodaySchedule();
  const todayFirst = parseInt(today.first.replace(":", ""));

  if (hhmm < todayFirst) {
    return { lastBus: null, nextBus: today.first, nextLabel: "today" };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tDay = tomorrow.getDay();
  let nextFirst;
  if (tDay === 0) nextFirst = SCHEDULE.SUN_FirstBus;
  else if (tDay === 6) nextFirst = SCHEDULE.SAT_FirstBus;
  else nextFirst = SCHEDULE.WD_FirstBus;

  return { lastBus: today.last, nextBus: nextFirst, nextLabel: "tomorrow" };
}

// ── Map ─────────────────────────────────────────────────
let map = null;
const busMarkers = [];

export function initMap() {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
  }).setView([CONFIG.stopLat, CONFIG.stopLng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  const stopIcon = L.divIcon({ className: "stop-icon", iconSize: [16, 16] });
  L.marker([CONFIG.stopLat, CONFIG.stopLng], { icon: stopIcon })
    .addTo(map)
    .bindTooltip(CONFIG.stopName || "Bus Stop", { permanent: true, direction: "top", className: "stop-tooltip", offset: [0, -12] });
}

function updateBusMarkers(buses) {
  busMarkers.forEach((m) => map.removeLayer(m));
  busMarkers.length = 0;

  const validBuses = buses.filter((b) => b.lat && b.lng && b.lat !== 0 && b.lng !== 0);
  const statusEl = document.getElementById("map-status");

  if (validBuses.length === 0) {
    statusEl.textContent = "No GPS — waiting for tracked buses";
    map.setView([CONFIG.stopLat, CONFIG.stopLng], 15);
    return;
  }

  statusEl.textContent = `${validBuses.length} bus${validBuses.length > 1 ? "es" : ""} tracked live`;

  validBuses.forEach((bus, i) => {
    const icon = L.divIcon({
      className: i === 0 ? "bus-icon" : "bus-icon-dim",
      iconSize: i === 0 ? [18, 18] : [14, 14],
    });
    const marker = L.marker([bus.lat, bus.lng], { icon })
      .addTo(map)
      .bindTooltip(bus.label, { permanent: true, direction: "top", offset: [0, -12] });
    busMarkers.push(marker);
  });

  const points = [[CONFIG.stopLat, CONFIG.stopLng], ...validBuses.map((b) => [b.lat, b.lng])];
  map.fitBounds(L.latLngBounds(points).pad(0.15));
}

// ── Helpers ─────────────────────────────────────────────
function minutesUntil(isoString) {
  if (!isoString) return null;
  const diff = (new Date(isoString) - new Date()) / 60_000;
  return Math.max(0, Math.round(diff));
}

function loadLabel(code) {
  const m = { SEA: "Seats avail", SDA: "Standing", LSD: "Full" };
  return m[code] || "";
}

function loadClass(code) {
  return `load-${(code || "").toLowerCase()}`;
}

// ── Render ──────────────────────────────────────────────
function renderOffline() {
  const main = document.getElementById("arrivals");
  const info = getNextServiceTime();
  const sched = getTodaySchedule();

  main.replaceChildren();
  const div = document.createElement("div");
  div.className = "service-offline";

  const title = document.createElement("div");
  title.className = "offline-title";
  title.textContent = "🌙 Bus 92 has ended for today";
  div.appendChild(title);

  if (info.lastBus) {
    const detail = document.createElement("div");
    detail.className = "offline-detail";
    detail.textContent = `Last bus was at ${info.lastBus}`;
    div.appendChild(detail);
  }

  const next = document.createElement("div");
  next.className = "offline-next";
  next.textContent = `→ First bus ${info.nextLabel}: ${info.nextBus}`;
  div.appendChild(next);

  const hours = document.createElement("div");
  hours.className = "offline-detail";
  hours.textContent = `${sched.label} hours: ${sched.first} – ${sched.last}`;
  div.appendChild(hours);

  main.appendChild(div);
  updateBusMarkers([]);
}

function createArrivalCard(bus, index) {
  const mins = minutesUntil(bus.data?.EstimatedArrival);
  const isArriving = mins !== null && mins <= 1;
  const minsText = mins === null ? "—" : isArriving ? "Arr" : String(mins);
  const unit = mins === null ? "" : isArriving ? "" : "min";
  const load = bus.data?.Load || "";
  const eta = bus.data?.EstimatedArrival
    ? new Date(bus.data.EstimatedArrival).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "";
  const visit = bus.data?.VisitNumber;

  const card = document.createElement("div");
  card.className = `arrival-card${index === 0 ? " next" : ""}`;

  const labelEl = document.createElement("div");
  labelEl.className = "arrival-label";
  labelEl.textContent = bus.label;
  card.appendChild(labelEl);

  const minsEl = document.createElement("div");
  minsEl.className = `arrival-minutes${isArriving ? " arriving" : ""}`;
  minsEl.textContent = minsText;
  card.appendChild(minsEl);

  const unitEl = document.createElement("div");
  unitEl.className = "arrival-unit";
  unitEl.textContent = unit;
  card.appendChild(unitEl);

  const etaEl = document.createElement("div");
  etaEl.className = "arrival-eta";
  etaEl.textContent = eta;
  card.appendChild(etaEl);

  if (visit && visit !== "1") {
    const visitEl = document.createElement("span");
    visitEl.className = "arrival-visit";
    visitEl.textContent = `Loop ${visit}`;
    card.appendChild(visitEl);
  }

  if (load) {
    const loadEl = document.createElement("div");
    loadEl.className = "load-indicator";
    const dot = document.createElement("span");
    dot.className = `load-dot ${loadClass(load)}`;
    loadEl.appendChild(dot);
    loadEl.appendChild(document.createTextNode(loadLabel(load)));
    card.appendChild(loadEl);
  }

  return card;
}

export function renderArrivals(data) {
  const main = document.getElementById("arrivals");
  const service = data.Services && data.Services[0];

  if (!service) {
    renderOffline();
    return;
  }

  const buses = [
    { label: "Next", data: service.NextBus },
    { label: "2nd", data: service.NextBus2 },
    { label: "3rd", data: service.NextBus3 },
  ];

  const busPositions = buses.map((bus) => ({
    label: bus.label,
    lat: parseFloat(bus.data?.Latitude) || 0,
    lng: parseFloat(bus.data?.Longitude) || 0,
  }));
  updateBusMarkers(busPositions);

  main.replaceChildren();
  buses.forEach((bus, i) => {
    main.appendChild(createArrivalCard(bus, i));
  });
}

const ALLOWED_API_HOSTS = [
  "bus-arrival-proxy.danielsykes.workers.dev",
];

export async function fetchArrivals() {
  const url = new URL(`${CONFIG.apiUrl}?BusStopCode=${CONFIG.busStopCode}&ServiceNo=${CONFIG.serviceNo}`);
  if (!ALLOWED_API_HOSTS.includes(url.hostname)) {
    throw new Error("Blocked: untrusted API host");
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

export function renderError(err) {
  const main = document.getElementById("arrivals");
  main.replaceChildren();
  const div = document.createElement("div");
  div.className = "error-msg";
  div.textContent = err.message;
  main.appendChild(div);
}
