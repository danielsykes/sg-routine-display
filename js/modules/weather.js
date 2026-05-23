/**
 * Weather — fetches 2-hour forecast and temperature from data.gov.sg
 */
import { CONFIG } from "./config.js";

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

const RAIN_KEYWORDS = ["rain", "shower", "storm", "thunder"];

function isRainy(forecast) {
  const lower = forecast.toLowerCase();
  return RAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function refreshWeather() {
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
    el.textContent = "";
    const iconSpan = document.createElement("span");
    iconSpan.className = "weather-icon";
    iconSpan.textContent = icon;
    el.appendChild(iconSpan);

    if (bestTemp !== null) {
      const tempSpan = document.createElement("span");
      tempSpan.className = "weather-temp";
      tempSpan.textContent = `${bestTemp}°`;
      el.appendChild(tempSpan);
    }

    const descSpan = document.createElement("span");
    descSpan.textContent = forecast;
    el.appendChild(descSpan);

    // Rain alert banner
    const existingAlert = document.getElementById("rain-alert");
    if (isRainy(forecast)) {
      if (!existingAlert) {
        const alert = document.createElement("div");
        alert.id = "rain-alert";
        alert.className = "rain-alert";
        alert.textContent = "☂️ Rain expected — bring umbrella!";
        document.querySelector("header").after(alert);
      }
    } else if (existingAlert) {
      existingAlert.remove();
    }
  } catch (e) {
    console.error("Weather fetch failed:", e);
  }
}
