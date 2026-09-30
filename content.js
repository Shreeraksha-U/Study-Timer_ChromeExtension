// Floating widget injected into every page (inside a shadow root so page CSS can't touch it).
(async () => {
  if (window.top !== window) return;

  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;bottom:16px;right:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<link rel="stylesheet" href="${chrome.runtime.getURL('styles/tailwind.css')}"><div id="app" class="font-sans"></div>`;
  document.documentElement.appendChild(host);
  const app = root.getElementById('app');

  const ctx = () => ({ site: location.hostname, title: document.title, url: location.href });
  let st = await U.load();
  let minimized = false;
  let draftTopic = U.guessTopic(document.title);
  let draftTarget = 0;
  let typing = false;

  const pillBtn = (active) => `rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
    active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
  }`;

  function statusDot(timer) {
    if (!timer) return 'bg-zinc-500';
    if (timer.running) return 'bg-green-500 animate-pulse';
    return 'bg-amber-500';
  }

  function modeLabel(timer) {
    if (!timer) return 'STOPWATCH MODE';
    if (!timer.target) return 'STOPWATCH MODE';
    const remaining = timer.target * 60000 - U.elapsed(timer);
    return remaining <= 0 ? 'TARGET REACHED' : 'POMODORO MODE';
  }

  function clockText(timer) {
    if (!timer) return '00:00:00';
    if (timer.target) return U.clock(Math.max(0, timer.target * 60000 - U.elapsed(timer)));
    return U.clock(U.elapsed(timer));
  }

  function render() {
    const { timer, settings } = st;
    host.style.display = settings.widget ? 'block' : 'none';

    if (minimized) {
      app.innerHTML = `
        <button data-a="expand" class="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-2 text-white shadow-lg hover:bg-zinc-800">
          <span class="h-1.5 w-1.5 rounded-full ${statusDot(timer)}"></span>
          <span id="clock" class="font-mono text-xs tabular-nums">${clockText(timer)}</span>
        </button>`;
      return;
    }

    const canSave = timer && U.elapsed(timer) >= 1000;
    const targets = U.TARGETS;

    app.innerHTML = `
      <div class="w-72 overflow-hidden rounded-lg border border-zinc-800 bg-white shadow-xl">
        <div class="flex items-center justify-between bg-zinc-900 px-3 py-2">
          <div class="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white">
            <span class="h-1.5 w-1.5 rounded-full ${statusDot(timer)}"></span>
            FOCUSTRACK WIDGET
          </div>
          <button data-a="minimize" class="text-zinc-400 hover:text-white">&minus;</button>
        </div>
        <div class="p-3">
          <div class="rounded-md bg-black py-3 text-center">
            <div id="clock" class="font-mono text-3xl tabular-nums tracking-wider text-white">${clockText(timer)}</div>
            <div id="mode" class="mt-1 text-[10px] uppercase tracking-widest text-zinc-400">${modeLabel(timer)}</div>
          </div>

          <label class="mt-3 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Topic / Concept Tag</label>
          <input id="topic" type="text" maxlength="60" placeholder="What are you studying?"
            value="${U.esc(timer ? timer.topic : draftTopic)}"
            class="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none" />

          <label class="mt-3 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Target / Pomodoro</label>
          <div class="mt-1 grid grid-cols-4 gap-1">
            ${targets.map((m) => {
              const active = timer ? timer.target === m : draftTarget === m;
              return `<button data-target="${m}" ${timer ? 'disabled' : ''} class="${pillBtn(active)} ${timer ? 'cursor-not-allowed opacity-60' : ''}">${m === 0 ? 'Free' : m + 'm'}</button>`;
            }).join('')}
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <button data-a="${timer ? (timer.running ? 'pause' : 'resume') : 'start'}"
              class="rounded-md border border-zinc-300 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50">
              ${timer ? (timer.running ? '&#10073;&#10073; Pause' : '&#9654; Resume') : '&#9654; Start Timer'}
            </button>
            <button data-a="reset" class="rounded-md border border-zinc-300 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50">
              &#8634; Reset
            </button>
          </div>

          <button data-a="complete" ${canSave ? '' : 'disabled'}
            class="mt-2 w-full rounded-md bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40">
            &#10003; Complete &amp; Save Session
          </button>
        </div>
      </div>`;

    const topicInput = root.getElementById('topic');
    topicInput.addEventListener('focus', () => (typing = true));
    topicInput.addEventListener('blur', () => (typing = false));
    let debounce;
    topicInput.addEventListener('input', (e) => {
      draftTopic = e.target.value;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (st.timer) U.send('settopic', { topic: draftTopic || 'General' });
      }, 400);
    });
  }

  function tick() {
    if (minimized || typing) {
      const el = root.getElementById('clock');
      if (el && !typing) el.textContent = clockText(st.timer);
      return;
    }
    const clockEl = root.getElementById('clock');
    const modeEl = root.getElementById('mode');
    if (clockEl) clockEl.textContent = clockText(st.timer);
    if (modeEl) modeEl.textContent = modeLabel(st.timer);
  }

  app.addEventListener('click', (e) => {
    const target = e.target.closest('[data-target]');
    if (target && !st.timer) {
      draftTarget = Number(target.dataset.target);
      render();
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'minimize') { minimized = true; return render(); }
    if (a === 'expand') { minimized = false; return render(); }
    if (a === 'start') {
      U.send('start', { ...ctx(), topic: draftTopic || 'General', target: draftTarget });
      return;
    }
    U.send(a, ctx());
  });

  chrome.storage.onChanged.addListener(async () => {
    st = await U.load();
    if (!typing) render();
  });
  setInterval(tick, 1000);
  render();

  // Auto-start on GeeksforGeeks (only when nothing is running).
  if (st.settings.autoStart && !st.timer && /(^|\.)geeksforgeeks\.org$/.test(location.hostname)) {
    U.send('start', { ...ctx(), topic: draftTopic, target: 0 });
  }
})();
