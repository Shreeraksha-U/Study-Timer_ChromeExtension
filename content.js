// Floating timer injected into every page (inside a shadow root so page CSS can't touch it).
(async () => {
  if (window.top !== window) return;

  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;bottom:16px;right:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<link rel="stylesheet" href="${chrome.runtime.getURL('styles/tailwind.css')}"><div id="app" class="font-sans"></div>`;
  document.documentElement.appendChild(host);
  const app = root.getElementById('app');

  const ctx = () => ({ site: location.hostname, title: document.title, url: location.href });
  const btn = 'rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800';
  const box = 'flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100';
  let st = await U.load();

  function render() {
    const { timer, settings } = st;
    host.style.display = settings.widget ? 'block' : 'none';
    if (!timer) {
      app.innerHTML = `<div class="${box}"><button data-a="start" class="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">Start session</button></div>`;
      return;
    }
    const dot = timer.running ? 'bg-green-600' : 'bg-amber-500';
    const note = timer.running ? `Started ${U.time(timer.startedAt)}` : timer.autoPaused ? 'Paused, you were idle' : 'Paused';
    app.innerHTML = `<div class="${box}">
      <span class="h-2 w-2 rounded-full ${dot}"></span>
      <div class="leading-tight">
        <div id="t" class="text-base font-semibold tabular-nums">0:00:00</div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">${note}</div>
      </div>
      <button data-a="${timer.running ? 'pause' : 'resume'}" class="${btn}">${timer.running ? 'Pause' : 'Resume'}</button>
      <button data-a="stop" class="${btn}">Stop</button>
    </div>`;
    tick();
  }

  function tick() {
    const el = root.getElementById('t');
    if (el) el.textContent = U.clock(U.elapsed(st.timer));
  }

  app.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a) U.send(a, ctx());
  });

  chrome.storage.onChanged.addListener(async () => { st = await U.load(); render(); });
  setInterval(tick, 1000);
  render();

  // Auto-start on GeeksforGeeks (only when nothing is running).
  if (st.settings.autoStart && !st.timer && /(^|\.)geeksforgeeks\.org$/.test(location.hostname)) {
    U.send('start', ctx());
  }
})();
