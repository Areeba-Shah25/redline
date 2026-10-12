/* rl-brand-feature.js — optional arrow buttons + mouse drag for the native scroller (touch/trackpad scroll natively). */
(function () {
  if (window.__rlBf) return; window.__rlBf = true;
  var inst = new WeakMap();

  function init(root) {
    var old = inst.get(root); if (old) old.abort();
    var sc = root.querySelector('.rl-bf__scroller'); if (!sc) return;
    var ac = new AbortController(), opt = { signal: ac.signal }; inst.set(root, ac);
    var prev = root.querySelector('[data-bf-prev]'), next = root.querySelector('[data-bf-next]');

    function stepSize() {
      var it = sc.querySelector('.rl-bf__item'); if (!it) return 200;
      var gap = parseFloat(getComputedStyle(sc).columnGap) || 0, cw = it.getBoundingClientRect().width + gap;
      return cw * Math.max(1, Math.floor(sc.clientWidth / cw) - 1);
    }
    function update() {
      if (!prev || !next) return;
      prev.disabled = sc.scrollLeft <= 4;
      next.disabled = sc.scrollLeft >= sc.scrollWidth - sc.clientWidth - 4;
    }
    if (prev) prev.addEventListener('click', function () { sc.scrollBy({ left: -stepSize(), behavior: 'smooth' }); }, opt);
    if (next) next.addEventListener('click', function () { sc.scrollBy({ left: stepSize(), behavior: 'smooth' }); }, opt);
    sc.addEventListener('scroll', update, { passive: true, signal: ac.signal });
    window.addEventListener('resize', update, opt);
    update();

    var down = false, moved = false, startX = 0, startLeft = 0;
    sc.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = sc.scrollLeft;
    }, opt);
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; sc.classList.add('is-dragging'); }
      if (moved) sc.scrollLeft = startLeft - dx;
    }, opt);
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false; sc.classList.remove('is-dragging');
      setTimeout(function () { moved = false; }, 0);
    }, opt);
    sc.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, { capture: true, signal: ac.signal });
    sc.addEventListener('dragstart', function (e) { e.preventDefault(); }, opt);
  }

  function initAll(scope) { [].forEach.call((scope || document).querySelectorAll('[data-rl-bf]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-rl-bf]'), function (r) { var a = inst.get(r); if (a) a.abort(); });
  });
})();
