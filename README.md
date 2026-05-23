# SG Routine Display

AM/PM routine dashboard for smart displays. Shows:
- **Bus arrivals** at your configured stop with live GPS map
- **Morning/Evening checklist** that auto-switches based on time of day
- **Weather** from Singapore NEA

## Setup

1. Copy `config/stop.json.example` to `config/stop.json` and fill in your bus stop details
2. Copy `config/routines.json.example` to `config/routines.json` and customise your checklists
3. Host on GitHub Pages or any static file server
4. Optionally cast to a smart display

## Architecture

- Static HTML/CSS/JS frontend (ES modules)
- Cloudflare Worker proxy in `worker/` (origin-restricted, rate-limited)
- No API keys in frontend code
- Private config files (stop.json, routines.json) are gitignored

## Security

- CDN resources use Subresource Integrity (SRI) hashes
- Content Security Policy restricts script/connect sources
- Worker proxy enforces origin whitelist + per-IP rate limiting
- Location data and routines kept in private config (not committed)
