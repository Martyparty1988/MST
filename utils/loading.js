(function () {
  const ID = 'mst-loading-overlay';
  window.showLoading = function (msg = 'Načítám…') {
    let el = document.getElementById(ID);
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.style.cssText = `
        position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,.35);backdrop-filter:saturate(120%) blur(2px);z-index:9999;
        color:#fff;font:500 16px/1.4 system-ui,-apple-system,Segoe UI,Roboto;
      `;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'flex';
  };
  window.hideLoading = function () {
    const el = document.getElementById(ID);
    if (el) el.style.display = 'none';
  };
})();
