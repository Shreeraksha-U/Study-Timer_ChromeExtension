# Study Timer

A Chrome/Edge extension (Manifest V3) that adds a small floating timer to any webpage and shows daily study insights. Built for tracking practice on GeeksforGeeks.

## Features
- Floating timer on every page with start time, pause/resume and stop
- Auto-start on geeksforgeeks.org (optional), auto-pause after 10 minutes idle (optional)
- Dashboard: today vs goal, 7-day total, streak, 14-day chart, best hour of day, top topics, session log
- CSV export

## Install
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Develop
The compiled `styles/tailwind.css` is committed, so no build is needed to run it. To change styles:

```bash
npm install
npm run build   # or: npm run watch
```

## Privacy and security
- All data is stored locally with `chrome.storage.local`. Nothing is sent anywhere.
- No analytics, no network requests, no remote code, no API keys.
- Permissions: `storage` (save sessions), `idle` (pause when away), `activeTab` (read the current tab title when you start from the popup), and access to all pages so the floating timer can appear.

## License
MIT
