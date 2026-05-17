# SG Routine Display

AM/PM routine dashboard for Google Nest Hub. Shows:
- **Bus 92 arrivals** at Henry Park (stop 12149) with live GPS map
- **Morning/Evening checklist** that auto-switches based on time of day
- **Weather** from Singapore NEA

## Setup

1. Edit `config/routines.json` to customise your AM/PM checklists
2. Hosted on GitHub Pages: https://danielsykes.github.io/sg-routine-display/
3. Cast to Nest Hub using CATT: `catt -d "Kitchen Display" cast_site <url>`

## Architecture

- Static HTML/CSS/JS frontend on GitHub Pages
- Cloudflare Worker proxy at `sg-bus-proxy.danielsykes.workers.dev` (shared with sg-bus-display)
- No API keys in frontend code
