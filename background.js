importScripts('utils.js');

const IDLE_SECONDS = 600; // pause after 10 minutes without input
chrome.idle.setDetectionInterval(IDLE_SECONDS);

async function handle(msg) {
  const { timer, sessions, settings } = await U.load();
  const t = Date.now();
  const ctx = msg.ctx || {};

  switch (msg.type) {
    case 'start': {
      if (timer) return;
      const topic = ctx.topic || U.guessTopic(ctx.title) || 'General';
      return chrome.storage.local.set({
        timer: {
          startedAt: t, runStart: t, accumulated: 0, running: true,
          site: ctx.site || '', title: ctx.title || '', url: ctx.url || '',
          topic, target: Number(ctx.target) || 0,
        },
      });
    }
    case 'pause': {
      if (!timer || !timer.running) return;
      timer.accumulated += t - timer.runStart;
      Object.assign(timer, { running: false, runStart: null, autoPaused: false });
      return chrome.storage.local.set({ timer });
    }
    case 'resume': {
      if (!timer || timer.running) return;
      Object.assign(timer, { running: true, runStart: t, autoPaused: false });
      return chrome.storage.local.set({ timer });
    }
    case 'reset': {
      if (!timer) return;
      return chrome.storage.local.set({ timer: null });
    }
    case 'complete': {
      if (!timer) return;
      const duration = U.elapsed(timer);
      if (duration > 0) {
        sessions.push({
          id: U.uid(), start: timer.startedAt, end: t, duration,
          site: timer.site, title: timer.title, url: timer.url, topic: timer.topic || 'General',
        });
      }
      return chrome.storage.local.set({ timer: null, sessions });
    }
    case 'settopic': {
      if (!timer) return;
      timer.topic = ctx.topic || 'General';
      return chrome.storage.local.set({ timer });
    }
    case 'manualAdd': {
      const start = new Date(ctx.date).getTime() || t;
      const duration = Math.max(60000, Math.round((Number(ctx.minutes) || 0) * 60000));
      sessions.push({
        id: U.uid(), start, end: start + duration, duration,
        site: ctx.site || 'Manual entry', title: ctx.topic, url: ctx.url || '',
        topic: ctx.topic || 'General', manual: true,
      });
      return chrome.storage.local.set({ sessions });
    }
    case 'deleteSession': {
      return chrome.storage.local.set({ sessions: sessions.filter((s) => s.id !== ctx.id) });
    }
    case 'clearAll': {
      return chrome.storage.local.set({ sessions: [] });
    }
    case 'setGoal': {
      return chrome.storage.local.set({ settings: { ...settings, goalMin: Math.max(5, Number(ctx.goalMin) || settings.goalMin) } });
    }
    case 'setPresets': {
      return chrome.storage.local.set({ settings: { ...settings, presets: ctx.presets } });
    }
    case 'setSetting': {
      return chrome.storage.local.set({ settings: { ...settings, [ctx.key]: ctx.value } });
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  handle(msg).then(() => reply({ ok: true }));
  return true;
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'active') return;
  const { timer, settings } = await U.load();
  if (!timer || !timer.running || !settings.idlePause) return;
  // Discard the idle window so it isn't counted as study time.
  timer.accumulated += Math.max(0, Date.now() - timer.runStart - IDLE_SECONDS * 1000);
  Object.assign(timer, { running: false, runStart: null, autoPaused: true });
  chrome.storage.local.set({ timer });
});
