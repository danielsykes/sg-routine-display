/**
 * Central configuration — edit this file to change bus stop, routes, or schedule.
 */
export const CONFIG = {
  apiUrl: "https://sg-bus-proxy.danielsykes.workers.dev",
  busStopCode: "12149",
  serviceNo: "92",
  refreshInterval: 10_000,
  stopLat: 1.31577,
  stopLng: 103.78266,
  weatherArea: "Bukit Timah",
};

export const SCHEDULE = {
  WD_FirstBus: "06:13", WD_LastBus: "22:01",
  SAT_FirstBus: "06:14", SAT_LastBus: "22:06",
  SUN_FirstBus: "06:55", SUN_LastBus: "21:25",
};
