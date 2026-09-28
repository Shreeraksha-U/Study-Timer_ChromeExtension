importScripts('utils.js');

const IDLE_SECONDS = 600; // pause after 10 minutes without input
chrome.idle.setDetectionInterval(IDLE_SECONDS);

async function handle(msg) {
  const { timer, sessions } = await U.load();
  const t = Date.now();

  if (msg.type === 'start') {
    if (timer) return;
    const { site = '', title = '', url = '' } = msg.ctx || {};
    return chrome.storage.local.set({
      timer: { startedAt: t, runStart: t, accumulated: 0, running: true, site, title, url },
    });
  }
  if (!timer) return;

  if (msg.type === 'pause' && timer.running) {
    timer.accumulated += t - timer.runStart;
    Object.assign(timer, { running: false, runStart: null, autoPaused: false });
    return chrome.storage.local.set({ timer });
  }
  if (msg.type === 'resume' && !timer.running) {
    Object.assign(timer, { running: true, runStart: t, autoPaused: false });
    return chrome.storage.local.set({ timer });
  }
  if (msg.type === 'stop') {
    const duration = U.elapsed(timer);
    if (duration >= 10000) {
      sessions.push({
        id: `${timer.startedAt}`, start: timer.startedAt, end: t, duration,
        site: timer.site, title: timer.title, url: timer.url,
      });
    }
    return chrome.storage.local.set({ timer: null, sessions });
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
