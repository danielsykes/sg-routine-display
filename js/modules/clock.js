/**
 * Clock — updates the time display every second.
 */

let intervalId = null;

export function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString(
    "en-SG", { hour: "2-digit", minute: "2-digit", hour12: true }
  );
}

export function startClock() {
  updateClock();
  intervalId = setInterval(updateClock, 1_000);
}

export function stopClock() {
  if (intervalId) clearInterval(intervalId);
}
