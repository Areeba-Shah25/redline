/* ==========================================================================
   rl-carousel.js — tiny infinite carousel, no dependencies.
   Markup contract:  [data-rl-carousel]  (+ data-centered, data-autoplay, data-speed)
                       .rl-car__viewport > .rl-car__track > .rl-car__slide*
                       optional: [data-car-prev] [data-car-next] .rl-car__stepper > .rl-car__thumb
   Public API: window.RLCarousel.init(el) / destroy(el) / initAll(scope) / get(el)
   ========================================================================== */
(function () {
  if (window.RLCarousel) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var inst = new WeakMap();

  function create(root) {
    var vp = root.querySelector('.rl-car__viewport');
    var track = root.querySelector('.rl-car__track');
    if (!vp || !track) return null;
    var originals = [].slice.call(track.querySelectorAll('.rl-car__slide:not(.rl-car__clone)'));
    var count = originals.length;
    if (!count) return null;

    var thumb = root.querySelector('.rl-car__thumb');
    var stepper = root.querySelector('.rl-car__stepper');
    var dots = [].slice.call(root.querySelectorAll('[data-car-dot]'));
    var prevBtn = root.querySelector('[data-car-prev]');
    var nextBtn = root.querySelector('[data-car-next]');
    var ac = new AbortController(), opt = { signal: ac.signal };
    var centered = root.dataset.centered === 'true';

    var w, sw, step, gap, pv, k = 0, index = 0, pos = 0;
    var dragging = false, paused = false, visible = true, blockClick = false;
    var timer, fallback, rt, io;

    function clearClones() {
      [].forEach.call(track.querySelectorAll('.rl-car__clone'), function (n) { n.remove(); });
    }
    function measure() {
      var cs = getComputedStyle(root);
      pv = parseFloat(cs.getPropertyValue('--car-pv')) || 1;
      gap = parseFloat(cs.getPropertyValue('--car-gap')) || 0;
      w = vp.clientWidth;
      sw = originals[0].getBoundingClientRect().width;
      step = sw + gap;
    }
    function cloneOf(o) {
      var c = o.cloneNode(true);
      c.classList.add('rl-car__clone'); c.classList.remove('is-active');
      c.setAttribute('aria-hidden', 'true');
      [].forEach.call(c.querySelectorAll('a,button'), function (n) { n.tabIndex = -1; });
      return c;
    }
    function layout() {                       // copies on both sides => seamless infinite loop
      clearClones();
      k = Math.ceil((pv + 2) / count);
      var before = document.createDocumentFragment(), after = document.createDocumentFragment();
      for (var i = 0; i < k; i++) originals.forEach(function (o) { before.appendChild(cloneOf(o)); after.appendChild(cloneOf(o)); });
      track.insertBefore(before, track.firstChild);
      track.appendChild(after);
      index = k * count + pos;
    }
    function xFor(i) { return (centered ? (w - sw) / 2 : 0) - i * step; }

    function mark() {
      var kids = track.children;
      for (var i = 0; i < kids.length; i++) kids[i].classList.toggle('is-active', i === index);
      if (thumb) { var wd = 100 / count; thumb.style.width = wd + '%'; thumb.style.left = (pos * wd) + '%'; }
      for (var d = 0; d < dots.length; d++) {
        dots[d].classList.toggle('is-active', d === pos);
        dots[d].setAttribute('aria-current', d === pos ? 'true' : 'false');
      }
    }
    function go(i, animate) {
      index = i;
      track.style.transition = (animate && !reduce) ? 'transform .55s cubic-bezier(.22,.61,.36,1)' : 'none';
      track.style.transform = 'translate3d(' + xFor(i) + 'px,0,0)';
      pos = ((i - k * count) % count + count) % count;
      if (animate) { clearTimeout(fallback); fallback = setTimeout(normalize, reduce ? 0 : 650); }
      mark();
    }
    function normalize() {                    // silent jump back to the middle set
      var s = k * count;
      if (index >= s + count) go(index - count, false);
      else if (index < s) go(index + count, false);
    }
    function next() { go(index + 1, true); }
    function prev() { go(index - 1, true); }

    track.addEventListener('transitionend', function (e) {
      if (e.target === track && e.propertyName === 'transform') normalize();
    }, opt);
    if (prevBtn) prevBtn.addEventListener('click', prev, opt);
    if (nextBtn) nextBtn.addEventListener('click', next, opt);
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { go(k * count + i, true); }, opt);
    });
    if (stepper) stepper.addEventListener('click', function (e) {
      var r = stepper.getBoundingClientRect();
      var i = Math.min(count - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * count)));
      go(k * count + i, true);
    }, opt);

    /* drag / swipe */
    var startX = 0, startTx = 0, lastDx = 0;
    vp.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; blockClick = false; startX = e.clientX; lastDx = 0;
      startTx = new DOMMatrix(getComputedStyle(track).transform).m41;
      track.style.transition = 'none';
      track.style.transform = 'translate3d(' + startTx + 'px,0,0)';
      vp.classList.add('is-dragging');
    }, opt);
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      lastDx = e.clientX - startX;
      if (Math.abs(lastDx) > 6) blockClick = true;
      track.style.transform = 'translate3d(' + (startTx + lastDx) + 'px,0,0)';
    }, opt);
    function endDrag() {
      if (!dragging) return;
      dragging = false; vp.classList.remove('is-dragging');
      var base = Math.round((xFor(0) - startTx) / step);
      var move = Math.abs(lastDx) > 40 ? Math.max(1, Math.round(Math.abs(lastDx) / step)) * (lastDx < 0 ? 1 : -1) : 0;
      go(Math.max(0, Math.min(track.children.length - 1, base + move)), true);
      setTimeout(function () { blockClick = false; }, 60);
    }
    window.addEventListener('pointerup', endDrag, opt);
    window.addEventListener('pointercancel', endDrag, opt);
    vp.addEventListener('click', function (e) { if (blockClick) { e.preventDefault(); e.stopPropagation(); } }, { capture: true, signal: ac.signal });
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); }, opt);
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    }, opt);

    /* autoplay: pauses on hover/focus, when off-screen, or tab hidden */
    if (root.dataset.autoplay === 'true' && !reduce) {
      timer = setInterval(function () {
        if (!paused && !dragging && visible && !document.hidden) next();
      }, parseInt(root.dataset.speed, 10) || 5000);
      vp.addEventListener('mouseenter', function () { paused = true; }, opt);
      vp.addEventListener('mouseleave', function () { paused = false; }, opt);
      vp.addEventListener('focusin', function () { paused = true; }, opt);
      vp.addEventListener('focusout', function () { paused = false; }, opt);
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; });
        io.observe(root);
      }
    }

    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); layout(); go(index, false); }, 120);
    }, opt);

    measure(); layout(); go(index, false);

    return {
      originals: originals,
      goTo: function (i) { go(k * count + i, true); },
      destroy: function () {
        ac.abort(); clearInterval(timer); clearTimeout(fallback); clearTimeout(rt);
        if (io) io.disconnect();
        clearClones();
        track.style.transform = ''; track.style.transition = '';
        originals.forEach(function (o) { o.classList.remove('is-active'); });
      }
    };
  }

  function destroy(root) { var c = inst.get(root); if (c) { c.destroy(); inst.delete(root); } }
  function init(root) { destroy(root); var c = create(root); if (c) inst.set(root, c); return c; }
  function initAll(scope) { [].forEach.call((scope || document).querySelectorAll('[data-rl-carousel]'), init); }

  window.RLCarousel = { init: init, destroy: destroy, initAll: initAll, get: function (r) { return inst.get(r); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  /* Shopify Theme Editor support */
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-rl-carousel]'), destroy);
  });
  document.addEventListener('shopify:block:select', function (e) {
    var slide = e.target.closest && e.target.closest('.rl-car__slide');
    var root = slide && slide.closest('[data-rl-carousel]');
    var c = root && inst.get(root);
    if (c) c.goTo(c.originals.indexOf(slide));
  });
})();
