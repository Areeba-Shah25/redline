/* rl-hire-purchase.js — recalculates the instalment breakdown. Follows the selected variant (polls the product form's id field,
   because themes change it without firing a standard event). */
(function () {
  if (window.__rlHp) return; window.__rlHp = true;
  var timers = new WeakMap();

  function init(root) {
    var old = timers.get(root); if (old) clearInterval(old);
    var data = {}; try { data = JSON.parse(root.querySelector('[data-hp-variants]').textContent); } catch (e) {}
    var prefix = root.getAttribute('data-prefix') || '', dec = parseInt(root.getAttribute('data-decimals'), 10) || 0;
    var rate = parseFloat(root.getAttribute('data-rate')) || 0, minPrice = parseFloat(root.getAttribute('data-min')) || 0;
    var variantId = root.getAttribute('data-start');
    var q = function (s) { return root.querySelector(s); };
    var out = { price: q('[data-hp-price]'), dpct: q('[data-hp-deposit-pct]'), damt: q('[data-hp-deposit-amt]'), interest: q('[data-hp-interest]'), monthly: q('[data-hp-monthly]'), total: q('[data-hp-total]') };

    function fmt(n) { return (prefix ? prefix + ' ' : '') + n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
    function checked(sel) { var el = root.querySelector(sel + ':checked'); return el ? parseFloat(el.value) : 0; }

    function calc() {
      var cents = data[variantId]; if (cents == null) return;
      var price = cents / 100;
      root.hidden = price < minPrice;
      var depPct = checked('[data-hp-deposit]'), months = checked('[data-hp-period]') || 1;
      var deposit = price * depPct / 100, financed = price - deposit;
      var interest = financed * (rate / 100) * (months / 12);
      var monthly = (financed + interest) / months, total = deposit + financed + interest;
      out.price.textContent = fmt(price);
      out.dpct.textContent = depPct;
      out.damt.textContent = fmt(deposit);
      if (out.interest) out.interest.textContent = fmt(interest);
      out.monthly.textContent = fmt(monthly);
      out.total.textContent = fmt(total);
    }

    root.addEventListener('change', calc);

    var toggle = q('[data-hp-toggle]'), body = q('[data-hp-body]');
    if (toggle && body) toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open)); body.hidden = open;
    });

    function currentVariant() {
      var f = document.querySelector('form[action*="/cart/add"] [name="id"]');
      if (f && f.value) return f.value;
      var u = new URLSearchParams(location.search).get('variant'); return u || variantId;
    }
    timers.set(root, setInterval(function () {
      var v = currentVariant(); if (v && v !== variantId && data[v] != null) { variantId = v; calc(); }
    }, 400));
    calc();
  }

  function initAll(scope) { [].forEach.call((scope || document).querySelectorAll('[data-rl-hp]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-rl-hp]'), function (r) { var t = timers.get(r); if (t) clearInterval(t); });
  });
})();
