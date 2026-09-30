// Shared helpers. Loaded by the content script, popup, dashboard and service worker.
const U = {
  DEFAULTS: {
    autoStart: true,
    idlePause: true,
    widget: true,
    goalMin: 180,
    presets: ['Binary Search', 'Dynamic Programming', 'Graph Theory', 'System Design', 'Trees'],
  },
  TARGETS: [0, 25, 45, 60], // minutes; 0 = Free (stopwatch, counts up)
  STREAK_MIN_MS: 5 * 60000,
  PALETTE: ['#18181b', '#475569', '#16a34a', '#d97706', '#2563eb', '#db2777', '#0891b2', '#7c3aed'],

  async load() {
    const d = await chrome.storage.local.get({ timer: null, sessions: [], settings: {} });
    d.settings = { ...U.DEFAULTS, ...d.settings };
    return d;
  },
  elapsed: (t) => (t ? t.accumulated + (t.running ? Date.now() - t.runStart : 0) : 0),
  clock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const p = (n) => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  },
  human(ms) {
    const m = Math.round(ms / 60000);
    if (m <= 0) return '0m';
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim();
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
  streak(byDayMap) {
    let n = 0;
    const d = new Date();
    if ((byDayMap[U.day(d)] || 0) < U.STREAK_MIN_MS) d.setDate(d.getDate() - 1); // today still open
    while ((byDayMap[U.day(d)] || 0) >= U.STREAK_MIN_MS) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  },
  // Best-effort topic guess from a page title, tuned for GeeksforGeeks-style titles.
  guessTopic(title) {
    if (!title) return 'General';
    let t = title
      .replace(/\s*[-|–]\s*GeeksforGeeks.*$/i, '')
      .replace(/\s*\|\s*Practice.*$/i, '')
      .replace(/\s*-\s*(Iterative|Recursive|Tutorial|Explained).*$/i, '')
      .trim();
    if (t.length > 40) t = t.slice(0, 40).trim() + '…';
    return t || 'General';
  },
  colorFor(topic, order) {
    if (!order.has(topic)) order.set(topic, order.size);
    return U.PALETTE[order.get(topic) % U.PALETTE.length];
  },
  hostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  },
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  safeUrl: (u) => (/^https?:\/\//i.test(u) ? u : '#'),
  uid: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  send: (type, ctx) => chrome.runtime.sendMessage({ type, ctx }),
};
