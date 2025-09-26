// docs/assets/js/guard.js
(function () {
  // 注入本頁專用 CSS（禁止選取；放行表單與 .selectable）
  const css = `
    .no-select{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}
    input, textarea, .selectable{ -webkit-user-select:text !important; -moz-user-select:text !important;
      -ms-user-select:text !important; user-select:text !important }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // 套用 no-select 到 <body>
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('no-select');
  });

  // 阻擋複製/剪下/貼上/右鍵/拖曳/選取開始
  ['copy','cut','paste'].forEach(evt => document.addEventListener(evt, e => e.preventDefault(), {passive:false}));
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart',  e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());

  // 攔 Ctrl/Cmd + C / X / A
  document.addEventListener('keydown', e => {
    const k = e.key?.toLowerCase?.();
    if ((e.ctrlKey || e.metaKey) && (k === 'c' || k === 'x' || k === 'a')) e.preventDefault();
  });
})();
