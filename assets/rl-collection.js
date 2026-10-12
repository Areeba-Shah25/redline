/* rl-collection.js — smooth contained slider with momentum drag */
(function () {
  if (window.__rlCollection) return;
  window.__rlCollection = true;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var inst = new WeakMap();

  function init(root) {
    var old = inst.get(root);
    if (old) old.destroy();

    var sc = root.querySelector('.rl-collection__scroller');
    if (!sc) return;

    var prev = root.querySelector('[data-cl-prev]');
    var next = root.querySelector('[data-cl-next]');
    var ac = new AbortController();
    var opt = { signal: ac.signal };

    var dragging = false;
    var moved = false;
    var startX = 0;
    var startLeft = 0;
    var lastX = 0;
    var lastT = 0;
    var velocity = 0;
    var raf = 0;
    var pointerId = null;

    function itemStep() {
      var it = sc.querySelector('.rl-collection__item');
      if (!it) return 200;
      var gap = parseFloat(getComputedStyle(sc).columnGap) || 0;
      return it.getBoundingClientRect().width + gap;
    }

    function maxScroll() {
      return Math.max(0, sc.scrollWidth - sc.clientWidth);
    }

    function updateArrows() {
      if (!prev || !next) return;
      var max = maxScroll();
      prev.disabled = sc.scrollLeft <= 2;
      next.disabled = sc.scrollLeft >= max - 2;
    }

    function scrollByStep(dir) {
      var amount = itemStep() * Math.max(1, Math.floor(sc.clientWidth / itemStep()) || 1);
      sc.scrollBy({ left: dir * amount, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function stopMomentum() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function momentum() {
      if (reduceMotion || Math.abs(velocity) < 0.15) {
        velocity = 0;
        sc.classList.remove('is-dragging');
        // re-enable snap so it settles on a tile
        sc.style.scrollSnapType = '';
        updateArrows();
        return;
      }
      sc.scrollLeft += velocity;
      velocity *= 0.95;
      if (sc.scrollLeft <= 0 || sc.scrollLeft >= maxScroll()) {
        velocity = 0;
      }
      raf = requestAnimationFrame(momentum);
    }

    function onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      stopMomentum();
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startLeft = sc.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      sc.style.scrollSnapType = 'none';
      sc.classList.add('is-dragging');
      try {
        sc.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    function onPointerMove(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      var now = performance.now();
      var dx = e.clientX - startX;
      var dt = Math.max(1, now - lastT);
      var frameDx = e.clientX - lastX;

      if (Math.abs(dx) > 4) moved = true;

      if (moved) {
        e.preventDefault();
        sc.scrollLeft = startLeft - dx;
        velocity = (-frameDx / dt) * 16;
        lastX = e.clientX;
        lastT = now;
      }
    }

    function onPointerUp(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      dragging = false;
      pointerId = null;
      try {
        sc.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (moved && !reduceMotion && Math.abs(velocity) > 0.4) {
        raf = requestAnimationFrame(momentum);
      } else {
        sc.classList.remove('is-dragging');
        sc.style.scrollSnapType = '';
        // gentle snap settle
        if (moved) {
          var step = itemStep();
          var target = Math.round(sc.scrollLeft / step) * step;
          sc.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
        updateArrows();
      }

      setTimeout(function () {
        moved = false;
      }, 40);
    }

    if (prev) {
      prev.addEventListener(
        'click',
        function () {
          scrollByStep(-1);
        },
        opt
      );
    }
    if (next) {
      next.addEventListener(
        'click',
        function () {
          scrollByStep(1);
        },
        opt
      );
    }

    sc.addEventListener('scroll', updateArrows, { passive: true, signal: ac.signal });
    window.addEventListener('resize', updateArrows, opt);

    sc.addEventListener('pointerdown', onPointerDown, opt);
    sc.addEventListener('pointermove', onPointerMove, { passive: false, signal: ac.signal });
    sc.addEventListener('pointerup', onPointerUp, opt);
    sc.addEventListener('pointercancel', onPointerUp, opt);
    sc.addEventListener(
      'lostpointercapture',
      function () {
        if (dragging) onPointerUp({ pointerId: pointerId });
      },
      opt
    );

    sc.addEventListener(
      'click',
      function (e) {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true, signal: ac.signal }
    );
    sc.addEventListener(
      'dragstart',
      function (e) {
        e.preventDefault();
      },
      opt
    );

    updateArrows();

    inst.set(root, {
      destroy: function () {
        stopMomentum();
        ac.abort();
        sc.classList.remove('is-dragging');
        sc.style.scrollSnapType = '';
      },
    });
  }

  function initAll(scope) {
    [].forEach.call((scope || document).querySelectorAll('[data-rl-collection]'), init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-rl-collection]'), function (r) {
      var a = inst.get(r);
      if (a) a.destroy();
    });
  });
})();
