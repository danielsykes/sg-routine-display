/**
 * sg-routine-display — AM/PM routine dashboard with Bus 92 arrivals
 * Entry point — orchestrates modules.
 */
import { CONFIG } from "./modules/config.js";
import { startClock } from "./modules/clock.js";
import { getMode, applyMode } from "./modules/mode.js";
import { refreshWeather } from "./modules/weather.js";
import { loadRoutines, renderChecklist } from "./modules/checklist.js";
import { initMap, fetchArrivals, renderArrivals, renderError } from "./modules/arrivals.js";
import { initThemeToggle } from "./modules/theme.js";

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
initThemeToggle();
applyMode();
startClock();
initMap();

setInterval(checkModeChange, 60_000);

loadRoutines();
refresh();
setInterval(refresh, CONFIG.refreshInterval);

refreshWeather();
setInterval(refreshWeather, 300_000);
