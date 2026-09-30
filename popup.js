const app = document.getElementById('app');
let st;
let draftTopic = '';
let draftTarget = 0;

function todayMs() {
  const { sessions, timer } = st;
  const sum = sessions.filter((s) => U.day(s.start) === U.day(Date.now())).reduce((a, s) => a + s.duration, 0);
  return sum + (timer && U.day(timer.startedAt) === U.day(Date.now()) ? U.elapsed(timer) : 0);
}

function clockText(timer) {
  if (!timer) return '00:00:00';
  if (timer.target) return U.clock(Math.max(0, timer.target * 60000 - U.elapsed(timer)));
  return U.clock(U.elapsed(timer));
}

function render() {
  const { timer, settings, sessions } = st;
  const goal = settings.goalMin * 60000;
  const pct = Math.min(100, (todayMs() / goal) * 100);
  const map = U.byDay(sessions);
  const days = U.lastDays(7);
  const max = Math.max(goal, ...days.map((d) => map[d.key] || 0));

  const preStart = !timer ? `
      <label class="mt-3 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Topic / Concept Tag</label>
      <input id="topic" type="text" value="${U.esc(draftTopic)}" placeholder="What are you studying?"
        class="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none" />
      <div class="mt-2 grid grid-cols-4 gap-1">
        ${U.TARGETS.map((m) => `<button data-target="${m}" class="rounded-md border px-2 py-1 text-[11px] font-medium ${draftTarget === m ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'}">${m === 0 ? 'Free' : m + 'm'}</button>`).join('')}
      </div>` : '';

  const controls = !timer
    ? `<button data-a="start" class="mt-3 w-full rounded-md bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">&#9654; Start Timer</button>`
    : `<div class="mt-3 grid grid-cols-2 gap-2">
         <button data-a="${timer.running ? 'pause' : 'resume'}" class="rounded-md border border-zinc-300 py-1.5 text-xs font-medium hover:bg-zinc-50">${timer.running ? 'Pause' : 'Resume'}</button>
         <button data-a="complete" class="rounded-md bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700">Complete &amp; Save</button>
       </div>`;

  app.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white">F</div>
        <h1 class="text-sm font-semibold">FocusTrack</h1>
      </div>
      <button data-a="dash" class="text-xs font-medium text-green-700 hover:underline">Dashboard</button>
    </div>

    <div class="mt-3 rounded-lg border border-zinc-800 bg-black p-3 text-center">
      <div id="clock" class="font-mono text-2xl tabular-nums tracking-wider text-white">${clockText(timer)}</div>
      <div class="mt-1 truncate text-[11px] text-zinc-400">${timer ? U.esc(timer.topic) : 'No session running'}</div>
    </div>
    ${preStart}
    ${controls}

    <div class="mt-4">
      <div class="flex items-baseline justify-between text-xs">
        <span class="font-medium uppercase tracking-wide text-zinc-500">Today's Focus</span>
        <span class="text-zinc-500"><span id="today">${U.human(todayMs())}</span> / ${U.human(goal)}</span>
      </div>
      <div class="mt-1.5 h-1.5 rounded-full bg-zinc-200"><div id="bar" class="h-1.5 rounded-full bg-green-600" style="width:${pct}%"></div></div>
    </div>

    <div class="mt-3 flex h-12 items-end gap-1.5">
      ${days.map((d) => {
        const h = Math.max(2, ((map[d.key] || 0) / max) * 100);
        const today = d.key === U.day(Date.now());
        return `<div class="flex-1" title="${d.label}: ${U.human(map[d.key] || 0)}"><div class="${today ? 'bg-green-600' : 'bg-zinc-200'} w-full rounded-sm" style="height:${h * 0.48}px"></div></div>`;
      }).join('')}
    </div>
  `;

  const topicInput = document.getElementById('topic');
  if (topicInput) topicInput.addEventListener('input', (e) => (draftTopic = e.target.value));
}

app.addEventListener('click', async (e) => {
  const tgt = e.target.closest('[data-target]');
  if (tgt) { draftTarget = Number(tgt.dataset.target); return render(); }
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (!a) return;
  if (a === 'dash') return chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  if (a === 'start') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const ctx = {
      site: tab?.url ? new URL(tab.url).hostname : '', title: tab?.title || '', url: tab?.url || '',
      topic: draftTopic || U.guessTopic(tab?.title) || 'General', target: draftTarget,
    };
    return U.send('start', ctx);
  }
  U.send(a);
});

chrome.storage.onChanged.addListener(async () => { st = await U.load(); render(); });
setInterval(() => {
  if (!st) return;
  const c = document.getElementById('clock');
  if (c) c.textContent = clockText(st.timer);
  const t = document.getElementById('today');
  if (t) t.textContent = U.human(todayMs());
}, 1000);
U.load().then((s) => { st = s; render(); });
