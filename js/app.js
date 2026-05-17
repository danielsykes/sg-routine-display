/*
 * sg-routine-display — AM/PM routine dashboard with Bus 92 arrivals
 */

const CONFIG = {
  apiUrl: "https://sg-bus-proxy.danielsykes.workers.dev",
  busStopCode: "12149",
  serviceNo: "92",
  refreshInterval: 10_000,
  stopLat: 1.31577,
  stopLng: 103.78266,
  weatherArea: "Bukit Timah",
};

// Bus 92 schedule at Henry Park (stop 12149)
const SCHEDULE = {
  WD_FirstBus: "06:13", WD_LastBus: "22:01",
  SAT_FirstBus: "06:14", SAT_LastBus: "22:06",
  SUN_FirstBus: "06:55", SUN_LastBus: "21:25",
};

// ── Mode Detection ──────────────────────────────────────
function getMode() {
  return new Date().getHours() < 12 ? "am" : "pm";
}

function applyMode() {
  const mode = getMode();
  const badge = document.getElementById("mode-badge");
  badge.textContent = mode === "am" ? "☀ AM" : "🌙 PM";
  badge.className = `mode-badge ${mode}`;
  document.getElementById("app").className = `mode-${mode}`;
  return mode;
}

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

// ── Clock ───────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString(
    "en-SG", { hour: "2-digit", minute: "2-digit", hour12: true }
  );
}

// ── Weather ─────────────────────────────────────────────
const weatherIcons = {
  "Fair": "☀️", "Fair (Day)": "☀️", "Fair (Night)": "🌙",
  "Fair & Warm": "🌡️",
  "Partly Cloudy": "⛅", "Partly Cloudy (Day)": "⛅", "Partly Cloudy (Night)": "☁️",
  "Cloudy": "☁️", "Hazy": "🌫️", "Windy": "💨",
  "Mist": "🌫️", "Fog": "🌫️",
  "Light Rain": "🌦️", "Moderate Rain": "🌧️", "Heavy Rain": "⛈️",
  "Passing Showers": "🌦️", "Light Showers": "🌦️", "Showers": "🌧️",
  "Heavy Showers": "⛈️", "Thundery Showers": "⛈️",
  "Heavy Thundery Showers": "⛈️",
  "Heavy Thundery Showers with Gusty Winds": "🌪️",
};

async function refreshWeather() {
  try {
    const [fcRes, tmpRes] = await Promise.all([
      fetch("https://api.data.gov.sg/v1/environment/2-hour-weather-forecast"),
      fetch("https://api.data.gov.sg/v1/environment/air-temperature"),
    ]);
    const [fc, tmp] = await Promise.all([fcRes.json(), tmpRes.json()]);

    const area = fc.items[0].forecasts.find((a) => a.area === CONFIG.weatherArea);
    const forecast = area ? area.forecast : "Unknown";
    const icon = weatherIcons[forecast] || "🌡️";

    const stations = tmp.metadata.stations;
    const readings = tmp.items[0].readings;
    let bestTemp = null;
    let bestDist = Infinity;
    stations.forEach((s) => {
      const d = Math.hypot(s.location.latitude - CONFIG.stopLat, s.location.longitude - CONFIG.stopLng);
      if (d < bestDist) {
        bestDist = d;
        const r = readings.find((r) => r.station_id === s.id);
        if (r) bestTemp = r.value;
      }
    });

    const el = document.getElementById("weather");
    el.innerHTML =
      `<span class="weather-icon">${icon}</span>` +
      (bestTemp !== null ? `<span class="weather-temp">${bestTemp}°</span>` : "") +
      `<span>${forecast}</span>`;
  } catch (e) {
    console.error("Weather fetch failed:", e);
  }
}

// ── Checklist ───────────────────────────────────────────
let routines = null;

async function loadRoutines() {
  try {
    const res = await fetch("config/routines.json?v=" + Date.now());
    routines = await res.json();
    renderChecklist();
  } catch (e) {
    console.error("Failed to load routines:", e);
  }
}

function renderChecklist() {
  if (!routines) return;
  const mode = getMode();
  const data = routines[mode];
  document.getElementById("checklist-title").textContent = data.label;
  const ul = document.getElementById("checklist");
  ul.innerHTML = data.items
    .map((item) => `<li class="checklist-item">${item}</li>`)
    .join("");
}

// ── Map Setup ───────────────────────────────────────────
const map = L.map("map", {
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
  .bindTooltip("Henry Park", { permanent: true, direction: "top", className: "stop-tooltip", offset: [0, -12] });

const busMarkers = [];

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

// ── Fetch Arrivals ──────────────────────────────────────
async function fetchArrivals() {
  const url = `${CONFIG.apiUrl}?BusStopCode=${CONFIG.busStopCode}&ServiceNo=${CONFIG.serviceNo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

// ── Render ──────────────────────────────────────────────
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

function renderOffline() {
  const main = document.getElementById("arrivals");
  const info = getNextServiceTime();

  let html = `<div class="service-offline">`;
  html += `<div class="offline-title">🌙 Bus 92 has ended for today</div>`;

  if (info.lastBus) {
    html += `<div class="offline-detail">Last bus was at ${info.lastBus}</div>`;
  }

  html += `<div class="offline-next">→ First bus ${info.nextLabel}: ${info.nextBus}</div>`;

  const sched = getTodaySchedule();
  html += `<div class="offline-detail">${sched.label} hours: ${sched.first} – ${sched.last}</div>`;
  html += `</div>`;

  main.innerHTML = html;
  updateBusMarkers([]);
}

function renderArrivals(data) {
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

  main.innerHTML = buses
    .map((bus, i) => {
      const mins = minutesUntil(bus.data?.EstimatedArrival);
      const isArriving = mins !== null && mins <= 1;
      const minsText = mins === null ? "—" : isArriving ? "Arr" : String(mins);
      const unit = mins === null ? "" : isArriving ? "" : "min";
      const load = bus.data?.Load || "";
      const eta = bus.data?.EstimatedArrival
        ? new Date(bus.data.EstimatedArrival).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true })
        : "";
      const visit = bus.data?.VisitNumber;
      const visitTag = visit && visit !== "1" ? `<span class="arrival-visit">Loop ${visit}</span>` : "";

      return `
        <div class="arrival-card ${i === 0 ? "next" : ""}">
          <div class="arrival-label">${bus.label}</div>
          <div class="arrival-minutes ${isArriving ? "arriving" : ""}">${minsText}</div>
          <div class="arrival-unit">${unit}</div>
          <div class="arrival-eta">${eta}</div>
          ${visitTag}
          ${load ? `<div class="load-indicator"><span class="load-dot ${loadClass(load)}"></span>${loadLabel(load)}</div>` : ""}
        </div>`;
    })
    .join("");
}

function renderError(err) {
  document.getElementById("arrivals").innerHTML =
    `<div class="error-msg">${err.message}</div>`;
}

// ── Main Loop ───────────────────────────────────────────
async function refresh() {
  try {
    const data = await fetchArrivals();
    renderArrivals(data);
    document.getElementById("updated").textContent =
      `Updated ${new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  } catch (err) {
    renderError(err);
  }
}

// Check if mode changed (every minute)
let currentMode = getMode();
function checkModeChange() {
  const newMode = getMode();
  if (newMode !== currentMode) {
    currentMode = newMode;
    applyMode();
    renderChecklist();
  }
}

// ── Init ────────────────────────────────────────────────
applyMode();
updateClock();
setInterval(updateClock, 1_000);
setInterval(checkModeChange, 60_000);

loadRoutines();
refresh();
setInterval(refresh, CONFIG.refreshInterval);

refreshWeather();
setInterval(refreshWeather, 300_000);
