/* rl-collection.js — smooth contained slider with momentum drag, dots, autoplay */
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
    var dotsEl = root.querySelector('[data-cl-dots]');
    var autoplaySec = parseFloat(root.getAttribute('data-cl-autoplay')) || 0;
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
    var autoTimer = 0;
    var pageCount = 1;
    var currentPage = 0;

    function itemStep() {
      var it = sc.querySelector('.rl-collection__item');
      if (!it) return 200;
      var gap = parseFloat(getComputedStyle(sc).columnGap) || 0;
      return it.getBoundingClientRect().width + gap;
    }

    function visibleCount() {
      var v = parseFloat(getComputedStyle(root).getPropertyValue('--cl-pv'));
      return v > 0 ? v : 6;
    }

    function maxScroll() {
      return Math.max(0, sc.scrollWidth - sc.clientWidth);
    }

    function pageStep() {
      return itemStep() * Math.max(1, Math.floor(visibleCount()));
    }

    function calcPages() {
      var items = sc.querySelectorAll('.rl-collection__item').length;
      var vis = Math.max(1, Math.floor(visibleCount()));
      return Math.max(1, Math.ceil(items / vis));
    }

    function pageFromScroll() {
      var step = pageStep();
      if (step <= 0) return 0;
      var max = maxScroll();
      if (max <= 2) return 0;
      if (sc.scrollLeft >= max - 2) return pageCount - 1;
      return Math.min(pageCount - 1, Math.round(sc.scrollLeft / step));
    }

    function buildDots() {
      if (!dotsEl) return;
      pageCount = calcPages();
      dotsEl.innerHTML = '';
      if (pageCount <= 1) {
        dotsEl.hidden = true;
        return;
      }
      dotsEl.hidden = false;
      for (var i = 0; i < pageCount; i++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rl-collection__dot';
        btn.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        btn.setAttribute('role', 'tab');
        (function (index) {
          btn.addEventListener(
            'click',
            function () {
              stopAutoplay();
              goToPage(index);
              startAutoplay();
            },
            opt
          );
        })(i);
        dotsEl.appendChild(btn);
      }
      updateDots();
    }

    function updateDots() {
      if (!dotsEl) return;
      currentPage = pageFromScroll();
      var dots = dotsEl.querySelectorAll('.rl-collection__dot');
      for (var i = 0; i < dots.length; i++) {
        var on = i === currentPage;
        dots[i].classList.toggle('is-active', on);
        dots[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
    }

    function goToPage(index) {
      var target = Math.min(maxScroll(), Math.max(0, index * pageStep()));
      sc.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function updateArrows() {
      if (!prev || !next) return;
      var max = maxScroll();
      prev.disabled = sc.scrollLeft <= 2;
      next.disabled = sc.scrollLeft >= max - 2;
    }

    function onScrollUi() {
      updateArrows();
      updateDots();
    }

    function scrollByStep(dir) {
      /* one tile at a time */
      sc.scrollBy({ left: dir * itemStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function stopMomentum() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function stopAutoplay() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = 0;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (!autoplaySec || reduceMotion || maxScroll() <= 2) return;
      autoTimer = setInterval(function () {
        if (dragging) return;
        var max = maxScroll();
        if (sc.scrollLeft >= max - 2) {
          sc.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        } else {
          scrollByStep(1);
        }
      }, autoplaySec * 1000);
    }

    function momentum() {
      if (reduceMotion || Math.abs(velocity) < 0.15) {
        velocity = 0;
        sc.classList.remove('is-dragging');
        sc.style.scrollSnapType = '';
        onScrollUi();
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
        // Let mobile touchscreens use native horizontal scrolling.
  if (e.pointerType === 'touch') return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      /* Ignore drag start on controls so arrows/dots stay clickable */
      if (e.target.closest && e.target.closest('.rl-collection__arrow, .rl-collection__dot')) return;
      stopMomentum();
      stopAutoplay();
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startLeft = sc.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      /* Do not capture or mark dragging yet — keep category links clickable on tap */
    }

    function onPointerMove(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      var now = performance.now();
      var dx = e.clientX - startX;
      var dt = Math.max(1, now - lastT);
      var frameDx = e.clientX - lastX;

      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        sc.style.scrollSnapType = 'none';
        sc.classList.add('is-dragging');
        try {
          sc.setPointerCapture(e.pointerId);
        } catch (err) {}
      }

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
      var didDrag = moved;
      dragging = false;
      pointerId = null;
      try {
        sc.releasePointerCapture(e.pointerId);
      } catch (err) {}

      sc.classList.remove('is-dragging');
      sc.style.scrollSnapType = '';

      if (didDrag) {
        if (!reduceMotion && Math.abs(velocity) > 0.4) {
          raf = requestAnimationFrame(momentum);
        } else {
          var step = itemStep();
          var target = Math.round(sc.scrollLeft / step) * step;
          sc.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
          onScrollUi();
        }
      }

      startAutoplay();

      setTimeout(function () {
        moved = false;
      }, 40);
    }

    if (prev) {
      prev.addEventListener(
        'click',
        function () {
          stopAutoplay();
          scrollByStep(-1);
          startAutoplay();
        },
        opt
      );
    }
    if (next) {
      next.addEventListener(
        'click',
        function () {
          stopAutoplay();
          scrollByStep(1);
          startAutoplay();
        },
        opt
      );
    }

    sc.addEventListener('scroll', onScrollUi, { passive: true, signal: ac.signal });
    window.addEventListener(
      'resize',
      function () {
        buildDots();
        onScrollUi();
        startAutoplay();
      },
      opt
    );

    root.addEventListener('mouseenter', stopAutoplay, opt);
    root.addEventListener('mouseleave', startAutoplay, opt);
    root.addEventListener(
      'focusin',
      function () {
        stopAutoplay();
      },
      opt
    );
    root.addEventListener(
      'focusout',
      function (e) {
        if (!root.contains(e.relatedTarget)) startAutoplay();
      },
      opt
    );

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

    buildDots();
    onScrollUi();
    startAutoplay();

    inst.set(root, {
      destroy: function () {
        stopMomentum();
        stopAutoplay();
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
