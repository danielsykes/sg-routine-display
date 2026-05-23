/**
 * Mode detection — AM/PM switching based on time of day.
 */

export function getMode() {
  return new Date().getHours() < 12 ? "am" : "pm";
}

export function applyMode() {
  const mode = getMode();
  const badge = document.getElementById("mode-badge");
  badge.textContent = mode === "am" ? "☀ AM" : "🌙 PM";
  badge.className = `mode-badge ${mode}`;
  document.getElementById("app").className = `mode-${mode}`;
  return mode;
}
