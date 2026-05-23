# Cloudflare Worker — sg-bus-proxy

Hardened proxy for LTA DataMall bus arrival API.

## Security features

- **Origin whitelist** — only `danielsykes.github.io` and localhost dev origins are accepted
- **Rate limiting** — 30 requests/minute per IP via Cloudflare KV
- **Input validation** — BusStopCode must be 5 digits, ServiceNo must match bus format
- **Restricted CORS** — `Access-Control-Allow-Origin` set to specific origin, not `*`
- **Response hardening** — `X-Content-Type-Options: nosniff`, short cache TTL

## Setup

```bash
cd worker

# Install wrangler (if not already)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace for rate limiting
wrangler kv:namespace create "RATE_LIMIT"
# Copy the ID into wrangler.toml

# Set LTA DataMall API key
wrangler secret put LTA_API_KEY
# Paste your AccountKey when prompted

# Deploy
wrangler deploy
```

## Updating allowed origins

Edit the `ALLOWED_ORIGINS` array in `index.js` to add/remove domains
that are permitted to call the proxy.
