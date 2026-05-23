/**
 * bus-arrival-proxy — Cloudflare Worker
 * Proxies LTA DataMall bus arrival requests with:
 *   - Origin whitelist (only allowed domains can call)
 *   - Per-IP rate limiting (via Cloudflare KV)
 *   - Input validation (BusStopCode format, ServiceNo format)
 *   - Proper CORS headers (restricted)
 *
 * Environment variables (set via `wrangler secret put`):
 *   LTA_API_KEY — your LTA DataMall AccountKey
 *
 * KV namespace binding (for rate limiting):
 *   RATE_LIMIT — bound KV namespace
 *
 * Deploy: `wrangler deploy`
 */

const ALLOWED_ORIGINS = [
  "https://danielsykes.github.io",
  "http://localhost:8000",
  "http://localhost:3000",
  "http://127.0.0.1:8000",
];

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

const LTA_API_BASE = "https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival";

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((allowed) => origin === allowed);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function errorResponse(status, message, origin) {
  const headers = { "Content-Type": "application/json" };
  if (origin && isAllowedOrigin(origin)) {
    Object.assign(headers, corsHeaders(origin));
  }
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

function validateBusStopCode(code) {
  return /^\d{5}$/.test(code);
}

function validateServiceNo(serviceNo) {
  return /^[0-9]{1,3}[A-Za-z]?$/.test(serviceNo);
}

async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT) return true; // Skip if KV not bound

  const key = `rl:${ip}`;
  const record = await env.RATE_LIMIT.get(key, { type: "json" });

  const now = Math.floor(Date.now() / 1000);

  if (!record || now - record.windowStart >= RATE_LIMIT_WINDOW_SEC) {
    await env.RATE_LIMIT.put(key, JSON.stringify({ windowStart: now, count: 1 }), {
      expirationTtl: RATE_LIMIT_WINDOW_SEC * 2,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  await env.RATE_LIMIT.put(key, JSON.stringify(record), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC * 2,
  });
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) {
        return errorResponse(403, "Origin not allowed", null);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Only allow GET
    if (request.method !== "GET") {
      return errorResponse(405, "Method not allowed", origin);
    }

    // Origin check — require Origin header from all callers
    if (!origin || !isAllowedOrigin(origin)) {
      return errorResponse(403, "Origin not allowed", null);
    }

    // Rate limiting
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const allowed = await checkRateLimit(clientIP, env);
    if (!allowed) {
      return errorResponse(429, "Rate limit exceeded. Try again in 60 seconds.", origin);
    }

    // Validate parameters
    const busStopCode = url.searchParams.get("BusStopCode");
    const serviceNo = url.searchParams.get("ServiceNo");

    if (!busStopCode) {
      return errorResponse(400, "BusStopCode parameter required", origin);
    }

    if (!validateBusStopCode(busStopCode)) {
      return errorResponse(400, "Invalid BusStopCode format (must be 5 digits)", origin);
    }

    if (serviceNo && !validateServiceNo(serviceNo)) {
      return errorResponse(400, "Invalid ServiceNo format", origin);
    }

    // Build upstream request
    const ltaUrl = new URL(LTA_API_BASE);
    ltaUrl.searchParams.set("BusStopCode", busStopCode);
    if (serviceNo) ltaUrl.searchParams.set("ServiceNo", serviceNo);

    try {
      const ltaRes = await fetch(ltaUrl.toString(), {
        headers: { AccountKey: env.LTA_API_KEY },
      });

      if (!ltaRes.ok) {
        return errorResponse(ltaRes.status, `LTA API error: ${ltaRes.status}`, origin);
      }

      const data = await ltaRes.json();

      const responseHeaders = {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=10",
        "X-Content-Type-Options": "nosniff",
      };

      if (origin && isAllowedOrigin(origin)) {
        Object.assign(responseHeaders, corsHeaders(origin));
      }

      return new Response(JSON.stringify(data), { headers: responseHeaders });
    } catch (e) {
      return errorResponse(502, "Upstream request failed", origin);
    }
  },
};
