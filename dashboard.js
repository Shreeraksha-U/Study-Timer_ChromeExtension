const app = document.getElementById('app');
const card = 'rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900';
const muted = 'text-zinc-500 dark:text-zinc-400';
const topic = (s) => (s.title || s.site || 'Untitled').replace(/\s*[-|–]\s*GeeksforGeeks.*$/i, '').trim() || 'Untitled';

function streak(byDay) {
  let n = 0;
  const d = new Date();
  if ((byDay[U.day(d)] || 0) < U.STREAK_MIN_MS) d.setDate(d.getDate() - 1); // today still open
  while ((byDay[U.day(d)] || 0) >= U.STREAK_MIN_MS) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Spread each session's time across the hours it spans, to find your best hour.
function hourBuckets(sessions) {
  const h = Array(24).fill(0);
  for (const s of sessions) {
    const wall = Math.max(1, s.end - s.start);
    for (let t = s.start; t < s.end; ) {
      const next = Math.min(s.end, new Date(t).setMinutes(60, 0, 0));
      h[new Date(t).getHours()] += s.duration * ((next - t) / wall);
      t = next;
    }
  }
  return h;
}

function render({ sessions, timer, settings }) {
  const all = timer
    ? [...sessions, { id: 'live', start: timer.startedAt, end: Date.now(), duration: U.elapsed(timer), title: timer.title, site: timer.site, url: timer.url, live: true }]
    : sessions;
  const map = U.byDay(all);
  const goal = settings.goalMin * 60000;
  const today = map[U.day(Date.now())] || 0;
  const yest = map[U.day(Date.now() - 864e5)] || 0;
  const week = U.lastDays(7).reduce((a, d) => a + (map[d.key] || 0), 0);
  const days = U.lastDays(14);
  const max = Math.max(goal, ...days.map((d) => map[d.key] || 0));
  const recent = all.filter((s) => s.start > Date.now() - 30 * 864e5);
  const hours = hourBuckets(recent);
  const hMax = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));
  const longest = recent.reduce((a, s) => Math.max(a, s.duration), 0);
  const avg = recent.length ? recent.reduce((a, s) => a + s.duration, 0) / recent.length : 0;
  const best = Object.entries(map).sort((a, b) => b[1] - a[1])[0];

  const topics = {};
  recent.forEach((s) => (topics[topic(s)] = (topics[topic(s)] || 0) + s.duration));
  const top = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const diff = today - yest;
  const compare = yest === 0 && today === 0 ? 'No study time yet today.'
    : diff >= 0 ? `${U.human(diff)} more than yesterday.` : `${U.human(-diff)} less than yesterday.`;

  const stat = (label, value, sub) => `<div class="${card}"><div class="${muted}">${label}</div><div class="mt-1 text-2xl font-semibold tabular-nums">${value}</div><div class="mt-1 text-xs ${muted}">${sub}</div></div>`;
  const todays = all.filter((s) => U.day(s.start) === U.day(Date.now())).sort((a, b) => b.start - a.start);
  const hourLabel = (h) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' });

  app.innerHTML = `
    <header class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Study Timer</h1>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 ${muted}">Daily goal
          <input id="goal" type="number" min="5" step="5" value="${settings.goalMin}" class="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"> min</label>
        <button id="export" class="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Export CSV</button>
      </div>
    </header>

    <section class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      ${stat('Today', U.human(today), `${Math.min(100, Math.round((today / goal) * 100))}% of goal`)}
      ${stat('Last 7 days', U.human(week), `${U.human(week / 7)} per day`)}
      ${stat('Streak', `${streak(map)} ${streak(map) === 1 ? 'day' : 'days'}`, 'Days with 5+ minutes')}
      ${stat('Avg session', U.human(avg), `Longest ${U.human(longest)}`)}
    </section>

    <section class="mt-3 ${card}">
      <div class="flex items-baseline justify-between"><h2 class="font-medium">Last 14 days</h2><span class="${muted}">${compare}</span></div>
      <div class="relative mt-4 flex h-40 items-end gap-2">
        <div class="absolute inset-x-0 border-t border-dashed border-zinc-400 dark:border-zinc-600" style="bottom:${(goal / max) * 100}%"></div>
        ${days.map((d) => {
          const v = map[d.key] || 0;
          const isToday = d.key === U.day(Date.now());
          return `<div class="flex h-full flex-1 items-end" title="${d.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}: ${U.human(v)}">
            <div class="w-full rounded-sm ${isToday ? 'bg-green-700' : 'bg-zinc-300 dark:bg-zinc-700'}" style="height:${Math.max(1, (v / max) * 100)}%"></div></div>`;
        }).join('')}
      </div>
      <div class="mt-2 flex gap-2 text-xs ${muted}">${days.map((d) => `<span class="flex-1 text-center">${d.date.getDate()}</span>`).join('')}</div>
      <div class="mt-2 text-xs ${muted}">Dashed line is your daily goal.</div>
    </section>

    <section class="mt-3 grid gap-3 md:grid-cols-2">
      <div class="${card}">
        <h2 class="font-medium">When you study</h2>
        <p class="mt-1 ${muted}">${hours[peak] > 0 ? `You focus most around ${hourLabel(peak)}.` : 'Complete a session to see your best hour.'}</p>
        <div class="mt-4 flex h-24 items-end gap-0.5">
          ${hours.map((v, h) => `<div class="flex-1 rounded-sm ${h === peak && v > 0 ? 'bg-green-700' : 'bg-zinc-300 dark:bg-zinc-700'}" style="height:${Math.max(2, (v / hMax) * 100)}%" title="${hourLabel(h)}: ${U.human(v)}"></div>`).join('')}
        </div>
        <div class="mt-1 flex justify-between text-xs ${muted}"><span>12 AM</span><span>12 PM</span><span>11 PM</span></div>
      </div>
      <div class="${card}">
        <h2 class="font-medium">Top topics, 30 days</h2>
        <p class="mt-1 ${muted}">${best ? `Best day: ${new Date(best[0] + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${U.human(best[1])}.` : 'No sessions yet.'}</p>
        <ul class="mt-3 space-y-2">
          ${top.map(([name, ms]) => `<li><div class="flex justify-between gap-3"><span class="truncate">${U.esc(name)}</span><span class="${muted} tabular-nums">${U.human(ms)}</span></div>
            <div class="mt-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800"><div class="h-1 rounded-full bg-green-700" style="width:${(ms / top[0][1]) * 100}%"></div></div></li>`).join('') || `<li class="${muted}">Start a session on any page to see topics here.</li>`}
        </ul>
      </div>
    </section>

    <section class="mt-3 ${card}">
      <h2 class="font-medium">Today's sessions</h2>
      <ul class="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
        ${todays.map((s) => `<li class="flex items-center justify-between gap-4 py-2">
          <div class="min-w-0"><a href="${U.esc(U.safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" class="block truncate hover:underline">${U.esc(topic(s))}</a>
            <div class="text-xs ${muted}">${U.time(s.start)} to ${s.live ? 'now' : U.time(s.end)}</div></div>
          <div class="flex items-center gap-3"><span class="tabular-nums">${U.human(s.duration)}</span>
            ${s.live ? `<span class="text-xs text-green-700 dark:text-green-500">Running</span>` : `<button data-del="${U.esc(s.id)}" class="text-xs ${muted} hover:text-red-600">Delete</button>`}</div></li>`).join('') || `<li class="py-2 ${muted}">No sessions today. Open a page and start the timer.</li>`}
      </ul>
    </section>`;
}

let data;
async function refresh() { data = await U.load(); render(data); }

app.addEventListener('click', async (e) => {
  const id = e.target.dataset.del;
  if (id) {
    data.sessions = data.sessions.filter((s) => s.id !== id);
    await chrome.storage.local.set({ sessions: data.sessions });
  }
  if (e.target.id === 'export') {
    const rows = [['date', 'start', 'end', 'minutes', 'title', 'url']].concat(
      data.sessions.map((s) => [U.day(s.start), U.time(s.start), U.time(s.end), (s.duration / 60000).toFixed(1), s.title, s.url])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'study-sessions.csv';
    a.click();
  }
});
app.addEventListener('change', async (e) => {
  if (e.target.id !== 'goal') return;
  const goalMin = Math.max(5, Number(e.target.value) || 60);
  await chrome.storage.local.set({ settings: { ...data.settings, goalMin } });
});

chrome.storage.onChanged.addListener(refresh);
setInterval(() => data && render(data), 30000);
refresh();
