const app = document.getElementById('app');
const card = 'rounded-lg border border-zinc-200 bg-white p-4';
const muted = 'text-zinc-500';
const label = 'text-[11px] font-medium uppercase tracking-wide text-zinc-500';

const ICON = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-3.5 w-3.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4"><path d="M12 2s-6 6-6 11a6 6 0 0 0 12 0c0-1.5-1-3-2-3 0 2-1 3-2 2 1-3-1-5-2-7 0 2-1 3-3 3 .5-3 2-4 3-6Z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-3.5 w-3.5"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-3.5 w-3.5"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7L13 18"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-3 w-3"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

let data;
let range = 'today'; // today | week | all
let flashNote = '';

function topicsInRange(sessions, timer) {
  const now = Date.now();
  const cutoff = range === 'today' ? new Date().setHours(0, 0, 0, 0) : range === 'week' ? now - 7 * 864e5 : 0;
  const pool = timer ? [...sessions, { ...timer, start: timer.startedAt, duration: U.elapsed(timer) }] : sessions;
  return pool.filter((s) => s.start >= cutoff);
}

function aggregateTopics(list) {
  const m = {};
  for (const s of list) m[s.topic || 'General'] = (m[s.topic || 'General'] || 0) + s.duration;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function statCard(icon, title, value, sub, extra = '') {
  return `<div class="${card}">
    <div class="flex items-center justify-between">
      <div class="${label}">${title}</div>
      <span class="text-zinc-400">${icon}</span>
    </div>
    <div class="mt-2 flex items-baseline gap-2">
      <div class="text-2xl font-semibold tabular-nums">${value}</div>${extra}
    </div>
    <div class="mt-1 text-xs ${muted}">${sub}</div>
  </div>`;
}

function render() {
  const { sessions, timer, settings } = data;
  const byDay = U.byDay(sessions.concat(timer ? [{ start: timer.startedAt, duration: U.elapsed(timer) }] : []));
  const goal = settings.goalMin * 60000;
  const today = byDay[U.day(Date.now())] || 0;
  const pct = Math.min(100, Math.round((today / goal) * 100));
  const streakDays = U.streak(byDay);
  const completed = sessions.length;

  const rangeList = topicsInRange(sessions, timer);
  const topicAgg = aggregateTopics(rangeList);
  const order = new Map();
  topicAgg.forEach(([t]) => U.colorFor(t, order));
  const maxTopic = Math.max(1, ...topicAgg.map(([, v]) => v));

  const timerStatus = !timer ? { text: 'IDLE', cls: 'bg-zinc-100 text-zinc-500' }
    : timer.running ? { text: 'RUNNING', cls: 'bg-green-50 text-green-700' }
    : { text: 'PAUSED', cls: 'bg-amber-50 text-amber-700' };

  const history = sessions.slice().sort((a, b) => b.start - a.start).slice(0, 50);

  app.innerHTML = `
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded bg-zinc-900 text-sm font-bold text-white">F</div>
        <div class="leading-tight">
          <div class="font-semibold">FocusTrack</div>
          <div class="text-xs ${muted}">Web Study Companion</div>
        </div>
      </div>
      <button id="manual" class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">+ Log Manual Session</button>
    </header>

    <section class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      ${statCard(ICON.clock, "Today's Focus Time", U.human(today), `${pct}% of goal`)}
      <div class="${card}">
        <div class="flex items-center justify-between">
          <div class="${label}">Daily Goal</div>
          <button id="editGoal" class="text-zinc-400 hover:text-zinc-700">${ICON.pencil}</button>
        </div>
        <div id="goalValue" class="mt-2 text-2xl font-semibold tabular-nums">${U.human(goal)}</div>
        <div class="mt-1 text-xs ${muted}">Keep a consistent pace every day.</div>
      </div>
      ${statCard(ICON.flame, 'Active Streak', `${streakDays} ${streakDays === 1 ? 'Day' : 'Days'}`, 'Study today to keep your streak alive.', streakDays > 0 ? `<span class="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">&#10003; Active</span>` : '')}
      ${statCard(ICON.list, 'Completed Sessions', completed, 'Tracked across all web pages.')}
    </section>

    <section class="mt-3 grid gap-3 lg:grid-cols-3">
      <div class="${card} lg:col-span-2">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="font-medium">Topic Time Breakdown</h2>
            <p class="text-xs ${muted}">Time distribution for ${range === 'today' ? "today's" : range === 'week' ? "this week's" : 'all'} studied concepts</p>
          </div>
          <select id="range" class="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs">
            <option value="today" ${range === 'today' ? 'selected' : ''}>Today</option>
            <option value="week" ${range === 'week' ? 'selected' : ''}>This Week</option>
            <option value="all" ${range === 'all' ? 'selected' : ''}>All Time</option>
          </select>
        </div>
        ${topicAgg.length ? `
          <div class="mt-6 flex h-40 items-end justify-center gap-8 px-2">
            ${topicAgg.slice(0, 6).map(([t, v]) => `
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 rounded-t-sm" style="height:${Math.max(4, (v / maxTopic) * 140)}px;background:${U.colorFor(t, order)}"></div>
                <div class="max-w-[5rem] truncate text-center text-xs ${muted}" title="${U.esc(t)}">${U.esc(t)}</div>
              </div>`).join('')}
          </div>
          <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-zinc-100 pt-3 text-xs">
            ${topicAgg.map(([t, v]) => `<span class="flex items-center gap-1.5 ${muted}"><span class="h-2 w-2 rounded-sm" style="background:${U.colorFor(t, order)}"></span><span class="font-medium text-zinc-700">${U.esc(t)}:</span> ${U.human(v)}</span>`).join('')}
          </div>` : `<div class="flex h-40 items-center justify-center text-sm ${muted}">No sessions in this range yet.</div>`}
      </div>

      <div class="${card}">
        <h2 class="font-medium">Quick Action Tagger</h2>
        <p class="text-xs ${muted}">Presets for quick assignment${timer ? '' : ' — start a timer to use them'}</p>
        <div class="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Preset Study Topics</div>
        <div id="presets" class="mt-2 flex flex-wrap gap-1.5">
          ${settings.presets.map((p) => `
            <span class="inline-flex items-center gap-1 rounded-full border border-zinc-300 pl-2.5 pr-1 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
              <button data-preset="${U.esc(p)}" class="${timer ? '' : 'opacity-60'}">${U.esc(p)}</button>
              <button data-rmpreset="${U.esc(p)}" class="rounded-full p-0.5 text-zinc-300 hover:bg-zinc-200 hover:text-zinc-600">${ICON.close}</button>
            </span>`).join('')}
          <button id="addPreset" class="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50">+ Add</button>
        </div>
        ${flashNote ? `<div class="mt-2 text-xs text-amber-600">${flashNote}</div>` : ''}

        <div class="mt-4 rounded-md border border-zinc-200 p-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Active Live Timer State</span>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ${timerStatus.cls}">${timerStatus.text}</span>
          </div>
          <div id="liveClock" class="mt-2 font-mono text-2xl tabular-nums">${timer ? U.clock(U.elapsed(timer)) : '00:00:00'}</div>
          <div class="mt-1 text-xs ${muted}">Topic: ${timer ? U.esc(timer.topic) : 'Unassigned'}</div>
        </div>
      </div>
    </section>

    <section class="mt-3 ${card}">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-medium">Session History Log</h2>
          <p class="text-xs ${muted}">Detailed list of recorded study time blocks</p>
        </div>
        <button id="clear" class="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">&#128465; Clear Data</button>
      </div>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-400">
              <th class="pb-2 font-medium">Date &amp; Time</th>
              <th class="pb-2 font-medium">Topic / Concept</th>
              <th class="pb-2 font-medium">Website / Source</th>
              <th class="pb-2 font-medium">Duration</th>
              <th class="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            ${history.map((s) => `
              <tr>
                <td class="py-2.5 ${muted}">${U.day(s.start)}<span class="ml-1 text-zinc-400">${U.time(s.start)}</span></td>
                <td class="py-2.5 font-medium">${U.esc(s.topic || 'General')}</td>
                <td class="py-2.5">${s.url ? `<a href="${U.esc(U.safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-800 hover:underline">${ICON.link}${U.esc(U.hostname(s.url) || s.site)}</a>` : `<span class="${muted}">${U.esc(s.site || 'Manual entry')}</span>`}</td>
                <td class="py-2.5 tabular-nums">${U.human(s.duration)}</td>
                <td class="py-2.5 text-right"><button data-del="${s.id}" class="text-zinc-400 hover:text-red-600">${ICON.trash}</button></td>
              </tr>`).join('') || `<tr><td colspan="5" class="py-6 text-center ${muted}">No sessions recorded yet. Start the widget on any page to begin tracking.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <div id="modalRoot"></div>
  `;

  document.getElementById('range').addEventListener('change', (e) => { range = e.target.value; render(); });
}

function openManualModal() {
  const presets = data.settings.presets;
  document.getElementById('modalRoot').innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div class="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-xl">
        <h3 class="font-semibold">Log Manual Session</h3>
        <label class="mt-3 block ${label}">Topic / Concept</label>
        <input id="mTopic" list="mPresets" class="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm" placeholder="e.g. Binary Search" />
        <datalist id="mPresets">${presets.map((p) => `<option value="${U.esc(p)}">`).join('')}</datalist>
        <label class="mt-3 block ${label}">Duration (minutes)</label>
        <input id="mMinutes" type="number" min="1" value="30" class="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
        <label class="mt-3 block ${label}">Date</label>
        <input id="mDate" type="date" value="${U.day(Date.now())}" class="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
        <label class="mt-3 block ${label}">Source URL (optional)</label>
        <input id="mUrl" type="text" placeholder="https://geeksforgeeks.org/..." class="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
        <div class="mt-4 flex justify-end gap-2">
          <button id="mCancel" class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">Cancel</button>
          <button id="mSave" class="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">Save Session</button>
        </div>
      </div>
    </div>`;
  document.getElementById('mCancel').onclick = () => (document.getElementById('modalRoot').innerHTML = '');
  document.getElementById('mSave').onclick = async () => {
    const topic = document.getElementById('mTopic').value.trim() || 'General';
    const minutes = Number(document.getElementById('mMinutes').value) || 30;
    const date = document.getElementById('mDate').value;
    const url = document.getElementById('mUrl').value.trim();
    await U.send('manualAdd', { topic, minutes, date, url, site: U.hostname(url) });
    document.getElementById('modalRoot').innerHTML = '';
    await refresh();
  };
}

app.addEventListener('click', async (e) => {
  if (e.target.closest('#manual')) return openManualModal();

  if (e.target.closest('#editGoal')) {
    const el = document.getElementById('goalValue');
    const current = data.settings.goalMin;
    el.innerHTML = `<input id="goalInput" type="number" min="5" step="5" value="${current}" class="w-20 rounded-md border border-zinc-300 px-2 py-1 text-base" /> min`;
    const input = document.getElementById('goalInput');
    input.focus(); input.select();
    const save = async () => { await U.send('setGoal', { goalMin: input.value }); await refresh(); };
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
    input.addEventListener('blur', save);
    return;
  }

  const del = e.target.closest('[data-del]')?.dataset.del;
  if (del) { await U.send('deleteSession', { id: del }); return refresh(); }

  if (e.target.closest('#clear')) {
    if (confirm('Clear all recorded sessions? This cannot be undone.')) {
      await U.send('clearAll'); return refresh();
    }
    return;
  }

  const preset = e.target.closest('[data-preset]')?.dataset.preset;
  if (preset) {
    if (!data.timer) { flashNote = 'Start a timer first to assign a topic.'; render(); setTimeout(() => { flashNote = ''; render(); }, 2000); return; }
    await U.send('settopic', { topic: preset }); return refresh();
  }

  const rm = e.target.closest('[data-rmpreset]')?.dataset.rmpreset;
  if (rm) {
    await U.send('setPresets', { presets: data.settings.presets.filter((p) => p !== rm) }); return refresh();
  }

  if (e.target.closest('#addPreset')) {
    const name = prompt('New preset topic name:');
    if (name && name.trim()) {
      await U.send('setPresets', { presets: [...data.settings.presets, name.trim()] }); return refresh();
    }
  }
});

async function refresh() { data = await U.load(); render(); }

chrome.storage.onChanged.addListener(refresh);
setInterval(() => {
  if (!data?.timer) return;
  const el = document.getElementById('liveClock');
  if (el) el.textContent = U.clock(U.elapsed(data.timer));
}, 1000);
refresh();
