// app-reader.js — 單書專用版

import { fetchJSON, fetchText, md2html, extractHeadings } from './loader.js';
import { setProgress, getProgress } from './ui.js';
import { buildTOC } from './toc.js';

const qs = new URLSearchParams(location.search);
let ch = (qs.get('ch') || '001').padStart(3, '0');

const chapterEl = document.querySelector('#chapter');
const titleEl   = document.querySelector('#book-title');
const footInfo  = document.querySelector('#foot-info');
const prevA     = document.querySelector('#prev');
const nextA     = document.querySelector('#next');
const progEl    = document.querySelector('#progress');

// 固定路徑
const meta = await fetchJSON(`./data/Chapter/meta.json`);
titleEl.textContent = meta.title || 'Griffin Journey';

// 初次載入
await loadChapter(ch);
buildTOC(meta, +ch);

// --- 鍵盤左右切章 ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' && !prevA.classList.contains('hidden')) prevA.click();
  if (e.key === 'ArrowRight' && !nextA.classList.contains('hidden')) nextA.click();
});

// --- 滾動存進度 ---
let t;
window.addEventListener('scroll', () => {
  clearTimeout(t);
  t = setTimeout(() => {
    setProgress(meta.id, { ch, scroll: Math.round(window.scrollY) });
  }, 150);
}, { passive: true });

async function loadChapter(chNo) {
  ch = String(chNo).padStart(3, '0');
  const entry = meta.chapters.find(c => String(c.no).padStart(3, '0') === ch);
  if (!entry) { chapterEl.textContent = '找不到該章節。'; return; }

  // 抓章節
  const md  = await fetchText(`./data/Chapter/${entry.file}`);
  const raw = md2html(md.trim());

  const { html, headings } = extractHeadings(raw);
  chapterEl.innerHTML = html;

  // 本章 TOC
  injectInpageTOC(headings);

  // 上下一章
  const idx  = meta.chapters.findIndex(c => c.file === entry.file);
  const prev = meta.chapters[idx-1], next = meta.chapters[idx+1];
  const mk   = c => `./reader.html?ch=${String(c.no).padStart(3,'0')}`;
  prevA.href = prev ? mk(prev) : '#';
  nextA.href = next ? mk(next) : '#';
  prevA.classList.toggle('hidden', !prev);
  nextA.classList.toggle('hidden', !next);

  // 進度顯示
  progEl.textContent = `第 ${entry.no} / ${meta.chapters.length} 章`;
  footInfo.textContent = `${meta.title} · 第 ${entry.no} 章${entry.title ? ' · ' + entry.title : ''}`;

  // 存進度
  setProgress(meta.id, { ch, scroll: 0, title: meta.title });

  // 捲動
  const saved = getProgress(meta.id);
  const y = (saved && saved.ch === ch && saved.scroll) ? saved.scroll : 0;
  requestAnimationFrame(() => window.scrollTo(0, y));
}

function injectInpageTOC(headings) {
  const old = chapterEl.querySelector('.inpage-toc');
  if (old) old.remove();
  if (!headings || !headings.length) return;
  const toc = document.createElement('nav');
  toc.className = 'inpage-toc';
  toc.innerHTML = `
    <details open>
      <summary>本章小節</summary>
      <ul>
        ${headings.map(h => `
          <li class="lv${h.level}">
            <a href="#${encodeURIComponent(h.id)}">${escapeHtml(h.text)}</a>
          </li>`).join('')}
      </ul>
    </details>`;
  chapterEl.prepend(toc);
}

function escapeHtml(s) {
  return (s||'').replace(/[&<>"']/g, ch => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]
  ));
}