/* rl-product-tabs.js — accessible tabs (click, arrow keys, Home/End, deep links). No dependencies, no network. */
(function () {
  if (window.__rlPtabs) return; window.__rlPtabs = true;
  var KEYS = ['reviews', 'description', 'specifications', 'delivery'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(root) {
    var tabs = [].slice.call(root.querySelectorAll('[data-pt-tab]'));
    if (!tabs.length) return;

    function panelOf(tab) { return document.getElementById(tab.getAttribute('aria-controls')); }
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab, p = panelOf(t);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    function byKey(key) { return tabs.filter(function (t) { return t.dataset.ptTab === key; })[0]; }
    function open(key, scroll) {
      var t = byKey(key); if (!t) return false;
      select(t, false);
      if (scroll) root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return true;
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, to = null;
        if (e.key === 'ArrowRight') to = tabs[(i + 1) % n];
        else if (e.key === 'ArrowLeft') to = tabs[(i - 1 + n) % n];
        else if (e.key === 'Home') to = tabs[0];
        else if (e.key === 'End') to = tabs[n - 1];
        if (to) { e.preventDefault(); select(to, true); }
      });
    });

    /* Deep links: yourstore.com/products/x#reviews, and any link on the page like <a href="#reviews"> (e.g. the star rating under the title) */
    function fromHash() {
      var key = location.hash.replace('#', '');
      if (key === 'product-tabs') { root.scrollIntoView(); return; }
      if (KEYS.indexOf(key) > -1) open(key, true);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var key = a.getAttribute('href').slice(1);
      if (KEYS.indexOf(key) > -1 && byKey(key)) { e.preventDefault(); open(key, true); history.replaceState(null, '', '#' + key); }
    });
    window.addEventListener('hashchange', fromHash);
    fromHash();

    /* Theme Editor: selecting a block jumps to the Reviews tab */
    document.addEventListener('shopify:block:select', function (e) { if (root.contains(e.target)) open('reviews', false); });
  }

  function initAll(scope) {
    [].forEach.call((scope || document).querySelectorAll('[data-rl-ptabs]'), function (r) { if (!r.__pt) { r.__pt = true; setup(r); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); }); else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
