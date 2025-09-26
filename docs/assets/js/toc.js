// 章節目錄抽屜：由 app-reader.js 呼叫 buildTOC(meta, currentNo)
export function buildTOC(meta, currentNo) {
  const wrap = document.querySelector('#toc-list');
  const title = document.querySelector('#toc-title');
  if (!wrap) return;
  title.textContent = `${meta.title} — 章節目錄`;
  wrap.innerHTML = meta.chapters.map(c => `
    <a class="toc-item ${c.no === currentNo ? 'active':''}"
       href="./reader.html?series=${encodeURIComponent(meta.id)}&ch=${String(c.no).padStart(3,'0')}">
      <span>${String(c.no).padStart(2,'0')}．${c.title||('Chapter '+c.no)}</span>
      <small class="small">${c.file}</small>
    </a>
  `).join('');
}

function openDrawer(open) {
  document.querySelector('#toc-drawer')?.classList.toggle('open', open);
  document.querySelector('#scrim')?.classList.toggle('show', open);
}
function initTocToggle() {
  const openBtn = document.querySelector('#btn-toc');
  const closeBtn = document.querySelector('#btn-toc-close');
  const scrim = document.querySelector('#scrim');
  openBtn?.addEventListener('click', () => openDrawer(true));
  closeBtn?.addEventListener('click', () => openDrawer(false));
  scrim?.addEventListener('click', () => openDrawer(false));
}
initTocToggle();
