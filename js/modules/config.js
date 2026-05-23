/**
 * Central configuration — edit this file to change bus stop, routes, or schedule.
 * GPS coordinates and stop details loaded from config/stop.json (not committed).
 * Copy config/stop.json.example to config/stop.json and fill in your values.
 */

// Defaults — overridden by config/stop.json at runtime
export let CONFIG = {
  apiUrl: "https://bus-arrival-proxy.danielsykes.workers.dev",
  busStopCode: "00000",
  serviceNo: "0",
  refreshInterval: 10_000,
  stopLat: 1.3521,
  stopLng: 103.8198,
  weatherArea: "Singapore",
  stopName: "My Stop",
};

export let SCHEDULE = {
  WD_FirstBus: "06:00", WD_LastBus: "23:00",
  SAT_FirstBus: "06:00", SAT_LastBus: "23:00",
  SUN_FirstBus: "07:00", SUN_LastBus: "22:00",
};

export async function loadConfig() {
  try {
    const res = await fetch("config/stop.json?v=" + Date.now());
    if (!res.ok) throw new Error("No stop.json found");
    const data = await res.json();
    if (data.config) Object.assign(CONFIG, data.config);
    if (data.schedule) Object.assign(SCHEDULE, data.schedule);
    // Update UI with stop name
    const nameEl = document.querySelector(".stop-name");
    if (nameEl && data.config?.stopName) {
      nameEl.innerHTML = `${data.config.stopName} <span class="stop-code">${data.config.busStopCode || ""}</span>`;
    }
    const routeEl = document.querySelector(".route-badge");
    if (routeEl && data.config?.serviceNo) {
      routeEl.textContent = data.config.serviceNo;
    }
  } catch (e) {
    console.warn("No config/stop.json found — using defaults. Copy stop.json.example to stop.json.");
  }
}
