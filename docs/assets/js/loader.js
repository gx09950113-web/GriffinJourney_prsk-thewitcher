// loader.js — 單書版 + marked.js 擴充（::: letter） + 一行=一段 + 保留大段落空行
// - 404 後備：./data/... → ./docs/data/...
// - md2html：行級前處理（避開 ```/~~~ 與 ::: letter 區塊），再交給 marked 解析
// - 支援自訂區塊：::: letter ... :::  →  <div class="letter">...</div>
// - extractHeadings：從 HTML 抽 h2/h3 並補 id

// -------- 低階取檔，具備 fallback 到 ./docs/data --------
async function fetchWithFallback(url, as = 'text') {
  const urls = [url];
  if (url.startsWith('./data/')) {
    urls.push(url.replace('./data/', './docs/data/'));
  }
  let lastErr = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: 'no-cache' });
      if (!res.ok) {
        if (res.status === 404) continue; // 試下一個
        throw new Error(`HTTP ${res.status} @ ${u}`);
      }
      return as === 'json' ? res.json() : res.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Fetch failed for: ${urls.join(' OR ')}`);
}

export async function fetchJSON(url) { return fetchWithFallback(url, 'json'); }
export async function fetchText(url) { return fetchWithFallback(url, 'text'); }

// -------- 前處理：將「單個換行」轉成「段落」；保留原始空行為 GAP（HTML 註解），避開 code/letter 區塊 --------
function toParagraphs(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');

  // 會觸發 Markdown 區塊的行開頭（遇到這些就不強制把相鄰兩行拆成兩段）
  const blockStart = /^(#{1,6}\s|>\s|[-*+]\s+\S|\d+\.\s+\S|\||\s*---\s*$|\s*\*\s*\*\s*\*\s*$|\s*_{3,}\s*$|`{3,}|~{3,}|:::\s*letter\b)/;

  let out = [];
  let i = 0;
  let inFence = false;
  let fenceMarker = ''; // '`' 或 '~'
  let inLetter = false;

  while (i < lines.length) {
    const cur = lines[i];

    // 1) ::: letter 開始/結束（整塊原樣保留）
    if (!inFence) {
      const openLetter = cur.match(/^\s*:::\s*letter\b/);
      if (openLetter && !inLetter) {
        inLetter = true;
        out.push(cur); // keep
        i++;
        while (i < lines.length) {
          const ln = lines[i];
          out.push(ln);
          const closeLetter = /^\s*:::\s*$/.test(ln);
          i++;
          if (closeLetter) { inLetter = false; break; }
        }
        continue;
      }
    }
    if (inLetter) {
      // 保險：letter 區塊內原樣輸出
      out.push(cur);
      i++;
      continue;
    }

    // 2) ``` / ~~~ fenced code（整塊原樣保留）
    const fenceOpen = cur.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (fenceOpen) {
      const marker = fenceOpen[2][0]; // '`' or '~'
      if (!inFence) { inFence = true; fenceMarker = marker; }
      out.push(cur);
      i++;
      while (i < lines.length) {
        const ln = lines[i];
        out.push(ln);
        const fenceClose = ln.match(/^(\s*)(`{3,}|~{3,})\s*$/);
        i++;
        if (fenceClose && fenceClose[2][0] === fenceMarker) { inFence = false; fenceMarker = ''; break; }
      }
      continue;
    }
    if (inFence) {
      out.push(cur);
      i++;
      continue;
    }

    // 3) 多個連續空行 => 折疊成一個 GAP 註解（僅在前後都有內容時）
    if (cur.trim() === '') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const hasPrev = out.length > 0 && out[out.length - 1].trim() !== '';
      const hasNext = j < lines.length;
      if (hasPrev && hasNext) {
        out.push('<!--PARA-GAP-->'); // 區塊級，占位不會被包進 <p>
      }
      i = j;
      continue;
    }

    // 4) 一般行輸出；決定與下一行之間是否加空行，讓「一行＝一段」
    out.push(cur);

    const next = lines[i + 1];
    if (next === undefined) break;
    if (next.trim() === '') { i++; continue; } // 空行交給上面處理

    // 兩行皆非空：若涉及區塊語法，用單換行；否則補一個空行（形成段落）
    if (blockStart.test(cur) || blockStart.test(next)) {
      out.push('\n'); // 保留原換行
    } else {
      out.push('\n'); // 原換行
      out.push('');   // 追加一個空行 → 新段
    }
    i++;
  }

  return out.join('\n');
}

// -------- Markdown 轉 HTML：使用 marked（標準 Markdown + ::: letter 擴充） --------
export function md2html(md) {
  if (!window.marked) {
    throw new Error('marked.js 未載入：請確認 reader.html 已引入 CDN。');
  }

  // 先套用你的行文模式
  const normalized = toParagraphs(md);

  // 基本設定
  window.marked.setOptions({
    gfm: true,
    breaks: false,      // 用空行分段，不額外輸出 <br>
    smartypants: true,
    mangle: false,
    headerIds: false
  });

  // ::: letter 擴充
  window.marked.use({
    extensions: [{
      name: 'letter',
      level: 'block',
      start(src) { const i = src.indexOf(':::'); return i >= 0 ? i : undefined; },
      tokenizer(src) {
        // 嚴謹找出 ::: letter 起訖（允許內容含換行）
        const m = src.match(/^:::\s*letter[ \t]*\n([\s\S]*?)\n:::[ \t]*\n?/);
        if (m) {
          return {
            type: 'letter',
            raw: m[0],
            text: m[1]  // 內文仍交回給 marked 再 parse（支援粗體/斜體/連結等）
          };
        }
      },
      renderer(token) {
        return `<div class="letter">${window.marked.parse(token.text)}</div>\n`;
      }
    }]
  });

  // 解析
  let html = window.marked.parse(normalized);

  // 把 GAP 註解換成可視化分隔
  html = html.replace(/<!--PARA-GAP-->/g, '<div class="para-gap" aria-hidden="true"></div>');

  return html;
}

// -------- 從 HTML 中抽取 h2/h3，並自動補 id --------
export function extractHeadings(html) {
  const el = document.createElement('div');
  el.innerHTML = html;

  const slugSet = new Set();
  const slugify = (text) => {
    const base = (text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')                 // 空白轉 dash
      .replace(/[^\w\-一-龥ぁ-んァ-ヶー]/g, ''); // 去除多餘符號（保留 CJK）
    let slug = base || 'sec';
    let i = 1;
    while (slugSet.has(slug)) slug = `${base}-${++i}`;
    slugSet.add(slug);
    return slug;
  };

  const nodes = [...el.querySelectorAll('h2, h3')];
  const headings = nodes.map(h => {
    if (!h.id) h.id = slugify(h.textContent || '');
    return { id: h.id, text: (h.textContent || '').trim(), level: h.tagName === 'H2' ? 2 : 3 };
  });

  return { html: el.innerHTML, headings };
}
