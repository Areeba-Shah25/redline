/* rl-pdp.js — Hire purchase estimate on the Dawn product page.
   Pure arithmetic in the browser: monthly = (price − deposit) ÷ months. NO fetch / XHR / provider calls.
   Price comes from the page itself; it follows variant changes (Dawn's own event, or the form's variant id as a fallback). */
(function () {
  if (window.__rlPdp) return; window.__rlPdp = true;

  function fmt(cents, format) {                       // standard Shopify money-format helper
    var f = format || 'Rs {{amount}}', re = /\{\{\s*(\w+)\s*\}\}/, m = f.match(re), type = m ? m[1] : 'amount';
    function dp(n, p, t, d) {
      p = p == null ? 2 : p; t = t || ','; d = d || '.';
      n = (n / 100).toFixed(p); var parts = n.split('.');
      return parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + t) + (parts[1] ? d + parts[1] : '');
    }
    var v = { amount: dp(cents, 2), amount_no_decimals: dp(cents, 0), amount_with_comma_separator: dp(cents, 2, '.', ','),
              amount_no_decimals_with_comma_separator: dp(cents, 0, '.', ','), amount_with_apostrophe_separator: dp(cents, 2, "'", '.') }[type] || dp(cents, 2);
    return f.replace(re, v);
  }

  function setup(root) {
    var data; try { data = JSON.parse(root.querySelector('[data-hp-data]').textContent); } catch (e) { return; }
    var format = root.dataset.format, min = parseInt(root.dataset.min, 10) || 0;
    var q = function (s) { return root.querySelector(s); };
    var state = { price: data.price, dep: +q('[data-hp-group="dep"] [aria-checked="true"]').dataset.value, months: +q('[data-hp-group="months"] [aria-checked="true"]').dataset.value };

    function render() {
      var deposit = Math.round(state.price * state.dep / 100);
      var monthly = Math.round((state.price - deposit) / state.months / 100) * 100;   // whole currency units
      q('[data-hp-price]').textContent = fmt(state.price, format);
      q('[data-hp-deplabel]').textContent = state.dep + '%';
      q('[data-hp-dep]').textContent = fmt(deposit, format);
      q('[data-hp-monthly]').textContent = fmt(monthly, format);
      q('[data-hp-months]').textContent = state.months;
      q('[data-hp-total]').textContent = fmt(state.price, format);
      root.hidden = !!(min && state.price < min);
    }
    function pick(group) {
      [].forEach.call(root.querySelectorAll('[data-hp-group="' + group + '"] [role="radio"]'), function (b) {
        b.addEventListener('click', function () {
          [].forEach.call(root.querySelectorAll('[data-hp-group="' + group + '"] [role="radio"]'), function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
          state[group === 'dep' ? 'dep' : 'months'] = +b.dataset.value; render();
        });
      });
    }
    pick('dep'); pick('months');

    function setPrice(c) { if (c && c !== state.price) { state.price = c; render(); } }
    if (typeof subscribe === 'function' && window.PUB_SUB_EVENTS) {            // Dawn announces variant changes
      subscribe(PUB_SUB_EVENTS.variantChange, function (e) { var v = e && e.data && e.data.variant; if (v) setPrice(v.price); });
    }
    setInterval(function () {                                                    // safety net (no network): follow the form's variant id
      if (document.hidden) return;
      var input = document.querySelector('form[action*="/cart/add"] [name="id"]');
      if (input && data.map[input.value]) setPrice(data.map[input.value]);
    }, 700);
    render();
  }

  function initAll(scope) { [].forEach.call((scope || document).querySelectorAll('[data-rl-hpx]'), function (r) { if (!r.__hp) { r.__hp = true; setup(r); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); }); else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
