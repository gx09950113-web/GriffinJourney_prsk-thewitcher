import { fetchJSON } from './loader.js';
import { renderContinue } from './ui.js';

const grid = document.querySelector('#series-grid');
const list = await fetchJSON('./data/series.json');

grid.innerHTML = list.map(s => `
  <a class="card" href="./reader.html?series=${encodeURIComponent(s.id)}&ch=001">
    <img class="thumb" src="${s.cover||'./assets/img/covers/griffin-journey.jpg'}" alt="${s.title}">
    <div class="meta">
      <h3>${s.title}</h3>
      <p>${s.intro || ''}</p>
      <small class="small">${s.chapters} 章｜更新：${s.updated || ''}</small>
    </div>
  </a>
`).join('');

renderContinue(document.querySelector('#continue'));
