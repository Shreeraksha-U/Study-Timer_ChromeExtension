// Shared helpers. Loaded by the content script, popup, dashboard and service worker.
const U = {
  DEFAULTS: { autoStart: true, idlePause: true, widget: true, goalMin: 60 },
  STREAK_MIN_MS: 5 * 60000,

  async load() {
    const d = await chrome.storage.local.get({ timer: null, sessions: [], settings: {} });
    d.settings = { ...U.DEFAULTS, ...d.settings };
    return d;
  },
  elapsed: (t) => (t ? t.accumulated + (t.running ? Date.now() - t.runStart : 0) : 0),
  clock(ms) {
    const s = Math.floor(ms / 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${Math.floor(s / 3600)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  },
  human(ms) {
    const m = Math.round(ms / 60000);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  },
  day: (ts) => new Date(ts).toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
  time: (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  lastDays(n) {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return { key: U.day(d), label: d.toLocaleDateString([], { weekday: 'short' }), date: d };
    });
  },
  byDay(sessions) {
    const m = {};
    for (const s of sessions) m[U.day(s.start)] = (m[U.day(s.start)] || 0) + s.duration;
    return m;
  },
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  safeUrl: (u) => (/^https?:\/\//i.test(u) ? u : '#'),
  send: (type, ctx) => chrome.runtime.sendMessage({ type, ctx }),
};
