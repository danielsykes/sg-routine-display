/**
 * Theme — light/dark toggle with localStorage persistence.
 */

export function getTheme() {
  return localStorage.getItem("theme") || "light";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  btn.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("theme", theme);
}

export function initThemeToggle() {
  applyTheme(getTheme());
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = getTheme() === "light" ? "dark" : "light";
    applyTheme(next);
  });
}
