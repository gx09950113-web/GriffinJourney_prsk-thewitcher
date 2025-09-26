// 主理：主題 / 字級 / 回頂部 / 首頁「繼續閱讀」使用
const LS = {
  THEME: 'novel_theme',           // 'auto' | 'light' | 'dark'
  FONT:  'novel_font_size',       // 數值（px）
  PROG:  'novel_progress'         // { [seriesId]: { ch: '001', scroll: number, ts: number, title: string } }
};

export function getProgressMap() {
  try { return JSON.parse(localStorage.getItem(LS.PROG) || '{}'); } catch { return {}; }
}
export function setProgress(seriesId, data) {
  const all = getProgressMap();
  all[seriesId] = { ...all[seriesId], ...data, ts: Date.now() };
  localStorage.setItem(LS.PROG, JSON.stringify(all));
  return all[seriesId];
}
export function getProgress(seriesId) {
  return getProgressMap()[seriesId];
}

// 主題切換：auto/light/dark 三段循環
function cycleTheme(current) {
  return current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
}
function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('theme-light','theme-dark','theme-auto');
  body.classList.add(`theme-${theme}`);
  localStorage.setItem(LS.THEME, theme);
}
function initThemeButton() {
  const btn = document.querySelector('#btn-theme');
  if (!btn) return;
  const saved = localStorage.getItem(LS.THEME) || 'auto';
  applyTheme(saved);
  btn.addEventListener('click', () => {
    const next = cycleTheme(localStorage.getItem(LS.THEME) || 'auto');
    applyTheme(next);
    btn.blur();
  });
}

// 字級
function initFontButtons() {
  const dec = document.querySelector('#btn-font-dec');
  const inc = document.querySelector('#btn-font-inc');
  const root = document.documentElement;
  const saved = +(localStorage.getItem(LS.FONT) || 18);
  root.style.setProperty('--font-size', `${saved}px`);

  const set = v => {
    const size = Math.max(14, Math.min(26, v|0));
    root.style.setProperty('--font-size', `${size}px`);
    localStorage.setItem(LS.FONT, String(size));
  };

  dec?.addEventListener('click', () => set((+localStorage.getItem(LS.FONT) || saved) - 1));
  inc?.addEventListener('click', () => set((+localStorage.getItem(LS.FONT) || saved) + 1));
}

// 回頂部 FAB
function initBackToTop() {
  const btn = document.querySelector('#btn-top');
  if (!btn) return;
  const onScroll = () => btn.classList.toggle('hidden', window.scrollY < 300);
  onScroll(); window.addEventListener('scroll', onScroll, { passive:true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// 首頁「繼續閱讀」
export function renderContinue(container) {
  const map = getProgressMap();
  const entries = Object.entries(map).sort((a,b)=>b[1].ts-a[1].ts);
  if (!entries.length) { container.innerHTML = '<p class="small">尚無閱讀記錄</p>'; return; }
  container.innerHTML = entries.map(([sid, v]) => `
    <a class="card" href="./reader.html?series=${encodeURIComponent(sid)}&ch=${v.ch}">
      <div class="meta">
        <h3>${v.title || sid}</h3>
        <p>上次閱讀：第 ${+v.ch} 章</p>
        <small class="small">${new Date(v.ts).toLocaleString()}</small>
      </div>
    </a>
  `).join('');
}

// 初始化（每頁都可載入本檔）
document.addEventListener('DOMContentLoaded', () => {
  initThemeButton();
  initFontButtons();
  initBackToTop();
});
