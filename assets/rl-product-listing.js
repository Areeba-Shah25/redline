/* rl-product-listing.js — collection page behaviour: AJAX filters / sort / load more, price slider, filter drawer, grid toggle.
   Uses Shopify's Section Rendering API (same-store requests) so results update without a full reload. */
(function () {
  if (window.__rlPlist) return; window.__rlPlist = true;
  var inst = new WeakMap();

  function fmt(cents, format) {
    var f = (format || 'Rs {{amount}}').replace(/\{\{\s*amount\s*\}\}/, '{{amount_no_decimals}}'), re = /\{\{\s*(\w+)\s*\}\}/, m = f.match(re), type = m ? m[1] : 'amount_no_decimals';
    function dp(n, p, t, d) { p = p == null ? 0 : p; t = t || ','; d = d || '.'; n = (n / 100).toFixed(p); var a = n.split('.'); return a[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + t) + (a[1] ? d + a[1] : ''); }
    var v = { amount_no_decimals: dp(cents, 0), amount_no_decimals_with_comma_separator: dp(cents, 0, '.', ','), amount_with_comma_separator: dp(cents, 0, '.', ','), amount_with_apostrophe_separator: dp(cents, 0, "'", '.') }[type] || dp(cents, 0);
    return f.replace(re, v);
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function setup(root) {
    var old = inst.get(root); if (old) old.abort();
    var ac = new AbortController(), opt = { signal: ac.signal }; inst.set(root, ac);

    var sid = root.dataset.sectionId, format = root.dataset.plistFormat;
    var form = root.querySelector('[data-plist-form]');
    var sortEl = root.querySelector('[data-plist-sort]');
    var side = root.querySelector('[data-plist-side]');
    var ftoggle = root.querySelector('[data-plist-filters-toggle]');
    var mq = window.matchMedia('(max-width: 989px)');
    var $ = function (s, c) { return (c || root).querySelector(s); };

    /* ---------- build the URL from the current controls ---------- */
    function currentUrl() {
      var qs = new URLSearchParams();
      if (form) {
        new FormData(form).forEach(function (v, k) { if (v !== '') qs.append(k, v); });
        [].forEach.call(form.querySelectorAll('[data-plist-default]'), function (el) { if (el.value === el.dataset.plistDefault || el.value === '') qs.delete(el.name); });
      }
      if (sortEl && sortEl.value) qs.set('sort_by', sortEl.value);
      var s = qs.toString();
      return location.pathname + (s ? '?' + s : '');
    }
    function fetchDoc(url) {
      var u = url + (url.indexOf('?') > -1 ? '&' : '?') + 'section_id=' + encodeURIComponent(sid);
      return fetch(u, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
    }

    /* ---------- apply filters / sort ---------- */
    function apply(url, push) {
      root.classList.add('is-loading');
      return fetchDoc(url).then(function (doc) {
        var nr = doc.querySelector('[data-plist]'); if (!nr) throw new Error('no section');
        var res = $('[data-plist-results]'), grid = $('[data-plist-grid]'), cols = grid && grid.dataset.plistView;
        res.innerHTML = nr.querySelector('[data-plist-results]').innerHTML;
        var g = $('[data-plist-grid]'); if (g && cols) g.dataset.plistView = cols;
        $('[data-plist-count]').innerHTML = nr.querySelector('[data-plist-count]').innerHTML;
        var ab = $('[data-plist-apply]'), nab = nr.querySelector('[data-plist-apply]'); if (ab && nab) ab.textContent = nab.textContent;
        var map = {}; [].forEach.call(nr.querySelectorAll('[data-plist-key]'), function (n) { map[n.dataset.plistKey] = n; });
        [].forEach.call(root.querySelectorAll('[data-plist-key]'), function (o) {                 // refresh counts + disabled state only
          var n = map[o.dataset.plistKey]; if (!n) return;
          o.querySelector('.rl-plist__n').textContent = n.querySelector('.rl-plist__n').textContent;
          var d = n.querySelector('input').disabled; o.querySelector('input').disabled = d; o.classList.toggle('is-disabled', d);
        });
        if (push) history.pushState({ rlPlist: 1 }, '', url);
      }).catch(function () { location.href = url; }).then(function () { root.classList.remove('is-loading'); });
    }
    var submit = debounce(function () { apply(currentUrl(), true); }, 250);

    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); apply(currentUrl(), true); }, opt);
      form.addEventListener('change', function (e) { if (e.target.type === 'checkbox') submit(); }, opt);
    }
    if (sortEl) sortEl.addEventListener('change', submit, opt);

    /* ---------- clear all ---------- */
    root.addEventListener('click', function (e) {
      var clear = e.target.closest('[data-plist-clear]');
      if (clear) {
        e.preventDefault();
        if (form) {
          [].forEach.call(form.querySelectorAll('input[type="checkbox"]'), function (c) { c.checked = false; });
          [].forEach.call(form.querySelectorAll('[data-plist-default]'), function (i) { i.value = i.dataset.plistDefault; });
          var pr = $('[data-plist-price]'); if (pr && pr.__paint) { pr.querySelector('[data-plist-range-min]').value = 0; pr.querySelector('[data-plist-range-max]').value = pr.querySelector('[data-plist-max]').dataset.plistDefault; pr.__paint(); }
        }
        apply(currentUrl(), true);
        return;
      }
      /* ---------- load more ---------- */
      var more = e.target.closest('[data-plist-more]');
      if (more) {
        e.preventDefault(); more.classList.add('is-busy');
        fetchDoc(more.getAttribute('href')).then(function (doc) {
          var grid = $('[data-plist-grid]');
          [].forEach.call(doc.querySelectorAll('[data-plist-grid] > li'), function (li) { grid.appendChild(document.importNode(li, true)); });
          var nb = doc.querySelector('[data-plist-more]');
          if (nb) { more.setAttribute('href', nb.getAttribute('href')); more.classList.remove('is-busy'); } else { more.remove(); }
          var footer = $('[data-plist-footer]'), total = +footer.dataset.plistTotal, shown = grid.children.length;
          $('[data-plist-showing]').textContent = root.dataset.plistShowing.replace('{count}', shown).replace('{total}', total);
          footer.querySelector('.rl-plist__progress i').style.width = Math.min(100, shown / total * 100) + '%';
        }).catch(function () { location.href = more.getAttribute('href'); });
      }
    }, opt);

    /* ---------- price range ---------- */
    var pr = $('[data-plist-price]');
    if (pr) {
      var rmin = $('[data-plist-range-min]', pr), rmax = $('[data-plist-range-max]', pr), nmin = $('[data-plist-min]', pr), nmax = $('[data-plist-max]', pr), label = $('[data-plist-price-label]', pr), slider = $('.rl-plist__slider', pr), MAX = +rmax.max || 1;
      var paint = function () {
        var lo = +rmin.value, hi = +rmax.value;
        slider.style.setProperty('--lo', (lo / MAX * 100) + '%'); slider.style.setProperty('--hi', (hi / MAX * 100) + '%');
        label.textContent = fmt(lo * 100, format) + ' — ' + fmt(hi * 100, format);
      };
      pr.__paint = paint;
      rmin.addEventListener('input', function () { if (+rmin.value > +rmax.value) rmin.value = rmax.value; nmin.value = rmin.value; paint(); }, opt);
      rmax.addEventListener('input', function () { if (+rmax.value < +rmin.value) rmax.value = rmin.value; nmax.value = rmax.value; paint(); }, opt);
      rmin.addEventListener('change', submit, opt); rmax.addEventListener('change', submit, opt);
      nmin.addEventListener('change', function () { var v = Math.max(0, Math.min(+nmin.value || 0, +nmax.value || MAX)); nmin.value = v; rmin.value = v; paint(); submit(); }, opt);
      nmax.addEventListener('change', function () { var v = Math.min(MAX, Math.max(+nmax.value || MAX, +nmin.value || 0)); nmax.value = v; rmax.value = v; paint(); submit(); }, opt);
      paint();
    }

    /* ---------- brand search + show more ---------- */
    [].forEach.call(root.querySelectorAll('.rl-plist__gbody'), function (body) {
      var list = $('[data-plist-list]', body); if (!list) return;
      var search = $('[data-plist-search]', body), btn = $('[data-plist-more-filters]', body);
      if (btn) btn.addEventListener('click', function () {
        var open = list.classList.toggle('is-open');
        btn.textContent = open ? root.dataset.plistLessText : root.dataset.plistMoreText;
      }, opt);
      if (search) search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        list.classList.toggle('is-open', !!q || (btn && btn.textContent === root.dataset.plistLessText));
        [].forEach.call(list.children, function (li) { li.hidden = !!q && li.dataset.plistLabel.indexOf(q) === -1; });
        if (btn) btn.hidden = !!q;
      }, opt);
    });

    /* ---------- filters button (hide column on desktop / drawer on mobile) ---------- */
    function openDrawer() { root.classList.add('rl-plist--drawer'); document.documentElement.style.overflow = 'hidden'; if (side) side.focus(); }
    function closeDrawer() { if (!root.classList.contains('rl-plist--drawer')) return; root.classList.remove('rl-plist--drawer'); document.documentElement.style.overflow = ''; if (ftoggle) ftoggle.focus(); }
    if (ftoggle) ftoggle.addEventListener('click', function () {
      if (mq.matches) { openDrawer(); return; }
      var hidden = root.classList.toggle('rl-plist--nofilters');
      ftoggle.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    }, opt);
    [].forEach.call(root.querySelectorAll('[data-plist-close]'), function (b) { b.addEventListener('click', closeDrawer, opt); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); }, opt);

    /* ---------- grid size toggle ---------- */
    var colBtns = [].slice.call(root.querySelectorAll('[data-plist-cols]'));
    function setCols(n) {
      var g = $('[data-plist-grid]'); if (g) g.dataset.plistView = n;
      colBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.plistCols === String(n) ? 'true' : 'false'); });
      try { localStorage.setItem('rlpl-view', n); } catch (e) {}
    }
    colBtns.forEach(function (b) { b.addEventListener('click', function () { setCols(b.dataset.plistCols); }, opt); });
    try { var saved = localStorage.getItem('rlpl-view'); if (saved === '3' || saved === '4') setCols(saved); } catch (e) {}

    /* ---------- back / forward ---------- */
    history.replaceState({ rlPlist: 1 }, '', location.href);
    window.addEventListener('popstate', function (e) { if (e.state && e.state.rlPlist) location.reload(); }, opt);
  }

  function initAll(scope) { [].forEach.call((scope || document).querySelectorAll('[data-plist]'), setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); }); else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
