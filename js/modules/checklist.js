/**
 * Checklist — loads routines, renders items, tracks completion state.
 * Persists checked state in localStorage; resets daily.
 */
import { getMode } from "./mode.js";

let routines = null;

const STORAGE_KEY = "checklist-state";

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Auto-reset if date changed
    if (parsed._date !== getTodayKey()) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveState(state) {
  state._date = getTodayKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function stateKey(mode, index) {
  return `${mode}-${index}`;
}

function updateProgress(mode, items) {
  const state = loadState();
  const total = items.length;
  const done = items.filter((_, i) => state[stateKey(mode, i)]).length;

  const progressEl = document.getElementById("checklist-progress");
  if (progressEl) {
    progressEl.textContent = `${done}/${total}`;
    progressEl.classList.toggle("all-done", done === total);
  }

  const barEl = document.getElementById("progress-bar");
  if (barEl) {
    barEl.style.width = total > 0 ? `${(done / total) * 100}%` : "0%";
  }
}

export async function loadRoutines() {
  try {
    const res = await fetch("config/routines.json?v=" + Date.now());
    routines = await res.json();
    renderChecklist();
  } catch (e) {
    console.error("Failed to load routines:", e);
  }
}

export function renderChecklist() {
  if (!routines) return;
  const mode = getMode();
  const data = routines[mode];
  const state = loadState();

  document.getElementById("checklist-title").textContent = data.label;

  const ul = document.getElementById("checklist");
  ul.innerHTML = "";

  data.items.forEach((item, i) => {
    const key = stateKey(mode, i);
    const checked = !!state[key];

    const li = document.createElement("li");
    li.className = `checklist-item${checked ? " done" : ""}`;
    li.dataset.index = i;
    li.dataset.mode = mode;

    const text = document.createElement("span");
    text.className = "checklist-text";
    text.textContent = item;
    li.appendChild(text);

    li.addEventListener("click", () => toggleItem(li, mode, i, data.items));
    ul.appendChild(li);
  });

  updateProgress(mode, data.items);
}

function toggleItem(li, mode, index, items) {
  const state = loadState();
  const key = stateKey(mode, index);
  state[key] = !state[key];
  saveState(state);

  li.classList.toggle("done", state[key]);
  updateProgress(mode, items);
}
