// streak.js — the running-10k-everyday bar. The only real-world datum on the page.
export function initStreak() {
  const start = new Date(2026, 0, 1);
  const end = new Date(2027, 0, 1);
  const now = new Date();
  const t = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const day = Math.min(365, Math.max(1, Math.floor((now - start) / 864e5) + 1));

  const dayEl = document.getElementById('runday');
  const pctEl = document.getElementById('runpct');
  const fill = document.getElementById('runfill');
  if (!dayEl || !pctEl || !fill) return;

  dayEl.textContent = now < start ? '2026 starts soon' : 'Day ' + day + ' of 365';
  pctEl.textContent = (t * 100).toFixed(1) + '% of 2026';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.width = t * 100 + '%';
  }));
}
