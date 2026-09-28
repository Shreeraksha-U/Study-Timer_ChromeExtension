const app = document.getElementById('app');
let st;

const primary = 'rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800';
const outline = 'rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';
const muted = 'text-zinc-500 dark:text-zinc-400';

function todayMs() {
  const { sessions, timer } = st;
  const sum = sessions.filter((s) => U.day(s.start) === U.day(Date.now())).reduce((a, s) => a + s.duration, 0);
  return sum + (timer && U.day(timer.startedAt) === U.day(Date.now()) ? U.elapsed(timer) : 0);
}

function render() {
  const { timer, settings, sessions } = st;
  const goal = settings.goalMin * 60000;
  const pct = Math.min(100, (todayMs() / goal) * 100);
  const days = U.lastDays(7);
  const map = U.byDay(sessions);
  const max = Math.max(goal, ...days.map((d) => map[d.key] || 0));

  const controls = !timer
    ? `<button data-a="start" class="${primary}">Start session</button>`
    : `<button data-a="${timer.running ? 'pause' : 'resume'}" class="${outline}">${timer.running ? 'Pause' : 'Resume'}</button>
       <button data-a="stop" class="${primary}">Stop and save</button>`;

  const check = (key, label) => `<label class="flex items-center justify-between py-1">
      <span>${label}</span><input type="checkbox" data-s="${key}" class="h-4 w-4 accent-green-700" ${settings[key] ? 'checked' : ''}></label>`;

  app.innerHTML = `
    <div class="flex items-center justify-between">
      <h1 class="text-base font-semibold">Study Timer</h1>
      <button data-a="dash" class="text-sm text-green-700 hover:underline dark:text-green-500">Open dashboard</button>
    </div>
    <div class="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div id="clock" class="text-3xl font-semibold tabular-nums">${U.clock(U.elapsed(timer))}</div>
      <div class="mt-1 truncate text-xs ${muted}">${timer ? U.esc(timer.title || timer.site) : 'No session running'}</div>
      <div class="mt-3 flex gap-2">${controls}</div>
    </div>
    <div class="mt-4">
      <div class="flex items-baseline justify-between">
        <span class="font-medium">Today</span>
        <span class="${muted}"><span id="today">${U.human(todayMs())}</span> of ${U.human(goal)}</span>
      </div>
      <div class="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800"><div id="bar" class="h-1.5 rounded-full bg-green-700" style="width:${pct}%"></div></div>
    </div>
    <div class="mt-4 flex h-16 items-end gap-1.5">
      ${days.map((d) => {
        const h = Math.max(2, ((map[d.key] || 0) / max) * 100);
        const today = d.key === U.day(Date.now());
        return `<div class="flex-1" title="${d.label}: ${U.human(map[d.key] || 0)}"><div class="${today ? 'bg-green-700' : 'bg-zinc-300 dark:bg-zinc-700'} w-full rounded-sm" style="height:${h * 0.64}px"></div></div>`;
      }).join('')}
    </div>
    <div class="mt-1 flex gap-1.5 text-xs ${muted}">${days.map((d) => `<span class="flex-1 text-center">${d.label[0]}</span>`).join('')}</div>
    <div class="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      ${check('widget', 'Show floating timer on pages')}
      ${check('autoStart', 'Auto-start on GeeksforGeeks')}
      ${check('idlePause', 'Pause after 10 minutes idle')}
    </div>`;
}

app.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (!a) return;
  if (a === 'dash') return chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  let ctx;
  if (a === 'start') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    ctx = { site: tab?.url ? new URL(tab.url).hostname : '', title: tab?.title || '', url: tab?.url || '' };
  }
  U.send(a, ctx);
});

app.addEventListener('change', async (e) => {
  const key = e.target.dataset.s;
  if (!key) return;
  const settings = { ...st.settings, [key]: e.target.checked };
  await chrome.storage.local.set({ settings });
});

chrome.storage.onChanged.addListener(async () => { st = await U.load(); render(); });
setInterval(() => {
  if (!st) return;
  const c = document.getElementById('clock');
  if (c) c.textContent = U.clock(U.elapsed(st.timer));
  const t = document.getElementById('today');
  if (t) t.textContent = U.human(todayMs());
}, 1000);
U.load().then((s) => { st = s; render(); });
