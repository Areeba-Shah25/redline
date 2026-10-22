/* rl-collection-views.js — grid / list toggle + mobile filters drawer */
(function () {
  if (window.__rlCview) return;
  window.__rlCview = true;

  var KEY = 'rl-cview-mode';

  function layoutOf(root) {
    return root.getAttribute('data-rl-layout') || 'both';
  }

  function savedMode(root) {
    var layout = layoutOf(root);
    if (layout === 'grid' || layout === 'list') return layout;
    var schemaDefault = root.getAttribute('data-rl-default-view') || 'grid';
    /* Theme editor must always follow schema Default view (ignore localStorage) */
    if (window.Shopify && Shopify.designMode) {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
      return schemaDefault;
    }
    try {
      var s = localStorage.getItem(KEY);
      if (s === 'list' || s === 'grid') return s;
    } catch (e) {}
    return schemaDefault;
  }

  function apply(root, mode) {
    var layout = layoutOf(root);
    if (layout === 'grid' || layout === 'list') mode = layout;
    var grid = root.querySelector('[data-rl-cview-grid]');
    if (!grid) return;
    if (mode !== 'list' && mode !== 'grid') mode = 'grid';
    grid.setAttribute('data-rl-view', mode);
    [].forEach.call(root.querySelectorAll('[data-rl-cview-mode]'), function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-rl-cview-mode') === mode ? 'true' : 'false');
    });
    if (layout === 'both') {
      try {
        localStorage.setItem(KEY, mode);
      } catch (e) {}
    }
  }

  function sync(scope) {
    var roots = [];
    if (scope && scope.querySelectorAll) {
      if (scope.matches && scope.matches('[data-rl-cview]')) roots.push(scope);
      [].forEach.call(scope.querySelectorAll('[data-rl-cview]'), function (r) {
        roots.push(r);
      });
      var closest = scope.closest && scope.closest('[data-rl-cview]');
      if (closest && roots.indexOf(closest) === -1) roots.push(closest);
    }
    if (!roots.length) {
      roots = [].slice.call(document.querySelectorAll('[data-rl-cview]'));
    }
    roots.forEach(function (root) {
      apply(root, savedMode(root));
    });
  }

  function isMobileFilters() {
    return window.matchMedia('(max-width: 989px)').matches;
  }

  function setFilterBtn(root, expanded) {
    var btn = root.querySelector('[data-rl-cview-filters]');
    if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function setToolsDisabled(root, empty) {
    if (!root) return;
    root.classList.toggle('rl-cview-page--empty', empty);
    root.setAttribute('data-rl-empty', empty ? 'true' : 'false');
    [].forEach.call(
      root.querySelectorAll('[data-rl-cview-filters], [data-rl-sort-toggle], [data-rl-cview-mode]'),
      function (el) {
        if (empty) {
          el.setAttribute('disabled', '');
          el.setAttribute('aria-disabled', 'true');
        } else {
          el.removeAttribute('disabled');
          el.removeAttribute('aria-disabled');
        }
      }
    );
    if (empty) {
      [].forEach.call(root.querySelectorAll('[data-rl-sort].is-open'), closeSort);
    }
  }

  function syncEmptyState(root) {
    if (!root) return;
    var gridEmpty = !!root.querySelector('#ProductGridContainer .collection--empty');
    var countEl = root.querySelector('#ProductCountDesktop');
    var count = countEl ? parseInt(countEl.getAttribute('data-product-count'), 10) : NaN;
    if (isNaN(count) && countEl) {
      var m = (countEl.textContent || '').match(/(\d+)/);
      count = m ? parseInt(m[1], 10) : NaN;
    }
    var empty = gridEmpty || count === 0;
    setToolsDisabled(root, empty);
  }

  function syncEmptyAll(scope) {
    var roots = [];
    if (scope && scope.querySelectorAll) {
      if (scope.matches && scope.matches('[data-rl-cview]')) roots.push(scope);
      [].forEach.call(scope.querySelectorAll('[data-rl-cview]'), function (r) {
        roots.push(r);
      });
      var closest = scope.closest && scope.closest('[data-rl-cview]');
      if (closest && roots.indexOf(closest) === -1) roots.push(closest);
    }
    if (!roots.length) {
      roots = [].slice.call(document.querySelectorAll('[data-rl-cview]'));
    }
    roots.forEach(syncEmptyState);
  }

  function closeMobileFilters(root) {
    if (!root) return;
    root.classList.remove('is-filters-open');
    document.documentElement.style.overflow = '';
    setFilterBtn(root, false);
  }

  function openMobileFilters(root) {
    root.classList.add('is-filters-open');
    document.documentElement.style.overflow = 'hidden';
    setFilterBtn(root, true);
  }

  function toggleDesktopFilters(root) {
    var collapsed = root.classList.toggle('is-filters-collapsed');
    setFilterBtn(root, !collapsed);
  }

  function closeSort(form) {
    if (!form) return;
    form.classList.remove('is-open');
    var btn = form.querySelector('[data-rl-sort-toggle]');
    var menu = form.querySelector('[data-rl-sort-menu]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
  }

  function openSort(form) {
    [].forEach.call(document.querySelectorAll('[data-rl-sort].is-open'), function (f) {
      if (f !== form) closeSort(f);
    });
    form.classList.add('is-open');
    var btn = form.querySelector('[data-rl-sort-toggle]');
    var menu = form.querySelector('[data-rl-sort-menu]');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (menu) menu.hidden = false;
  }

  function pickSort(form, optionBtn) {
    var value = optionBtn.getAttribute('data-value');
    var label = optionBtn.textContent.trim();
    var select = form.querySelector('select[name="sort_by"]');
    var valueEl = form.querySelector('[data-rl-sort-value]');
    if (select && select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (valueEl) valueEl.textContent = label;
    [].forEach.call(form.querySelectorAll('[data-rl-sort-option]'), function (opt) {
      var on = opt === optionBtn;
      opt.classList.toggle('is-selected', on);
      opt.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    closeSort(form);
  }

  document.addEventListener('click', function (e) {
    var modeBtn = e.target.closest('[data-rl-cview-mode]');
    if (modeBtn) {
      if (modeBtn.disabled || modeBtn.getAttribute('aria-disabled') === 'true') return;
      var root = modeBtn.closest('[data-rl-cview]');
      if (!root || layoutOf(root) !== 'both') return;
      e.preventDefault();
      apply(root, modeBtn.getAttribute('data-rl-cview-mode'));
      return;
    }

    var sortToggle = e.target.closest('[data-rl-sort-toggle]');
    if (sortToggle) {
      if (sortToggle.disabled || sortToggle.getAttribute('aria-disabled') === 'true') return;
      var sortForm = sortToggle.closest('[data-rl-sort]');
      if (!sortForm) return;
      e.preventDefault();
      if (sortForm.classList.contains('is-open')) closeSort(sortForm);
      else openSort(sortForm);
      return;
    }

    var sortOption = e.target.closest('[data-rl-sort-option]');
    if (sortOption) {
      var sortFormOpt = sortOption.closest('[data-rl-sort]');
      if (!sortFormOpt) return;
      e.preventDefault();
      pickSort(sortFormOpt, sortOption);
      return;
    }

    var filterBtn = e.target.closest('[data-rl-cview-filters]');
    if (filterBtn) {
      if (filterBtn.disabled || filterBtn.getAttribute('aria-disabled') === 'true') return;
      var page = filterBtn.closest('[data-rl-cview]');
      if (!page) return;
      e.preventDefault();
      if (isMobileFilters()) {
        if (page.classList.contains('is-filters-open')) closeMobileFilters(page);
        else openMobileFilters(page);
      } else {
        toggleDesktopFilters(page);
      }
      return;
    }

    if (!e.target.closest('[data-rl-sort]')) {
      [].forEach.call(document.querySelectorAll('[data-rl-sort].is-open'), closeSort);
    }

    var openPage = document.querySelector('[data-rl-cview].is-filters-open');
    if (
      openPage &&
      isMobileFilters() &&
      !e.target.closest('[data-rl-cview-side]') &&
      !e.target.closest('[data-rl-cview-filters]')
    ) {
      closeMobileFilters(openPage);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    [].forEach.call(document.querySelectorAll('[data-rl-sort].is-open'), closeSort);
    var openPage = document.querySelector('[data-rl-cview].is-filters-open');
    if (openPage) closeMobileFilters(openPage);
  });

  function boot() {
    sync();
    syncEmptyAll();
    var grid = document.getElementById('ProductGridContainer');
    if (grid && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        syncEmptyAll();
      });
      mo.observe(grid, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) {
    sync(e.target);
    syncEmptyAll(e.target);
  });

  function watchGrid() {
    var host = document.getElementById('ProductGridContainer');
    if (!host || host.__rlCviewObs) return;
    host.__rlCviewObs = true;
    new MutationObserver(function () {
      sync(host);
      syncEmptyAll(host);
    }).observe(host, { childList: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchGrid);
  } else {
    watchGrid();
  }
  document.addEventListener('shopify:section:load', watchGrid);

  /* ---------- Redline dual price slider ---------- */
  function fmtPrice(n, format) {
    var amount = String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var f = format || 'Rs {{amount}}';
    return f.replace(/\{\{\s*amount[^}]*\}\}/g, amount);
  }

  function setupPrice(root) {
    if (!root || root.__rlPriceBound) return;
    root.__rlPriceBound = true;
    var max = Number(root.getAttribute('data-rl-price-max')) || 0;
    if (max <= 0) return;
    var format = root.getAttribute('data-rl-price-format') || 'Rs {{amount}}';
    var slider = root.querySelector('[data-rl-price-slider]');
    var rmin = root.querySelector('[data-rl-price-range-min]');
    var rmax = root.querySelector('[data-rl-price-range-max]');
    var nmin = root.querySelector('[data-rl-price-min]');
    var nmax = root.querySelector('[data-rl-price-max]');
    var label = root.querySelector('[data-rl-price-label]');
    if (!slider || !rmin || !rmax || !nmin || !nmax) return;

    function paint() {
      var lo = Number(rmin.value) || 0;
      var hi = Number(rmax.value) || max;
      slider.style.setProperty('--lo', (lo / max) * 100 + '%');
      slider.style.setProperty('--hi', (hi / max) * 100 + '%');
      if (label) label.textContent = fmtPrice(lo, format) + ' — ' + fmtPrice(hi, format);
    }

    function syncFromRanges(commit) {
      if (Number(rmin.value) > Number(rmax.value)) rmin.value = rmax.value;
      nmin.value = rmin.value;
      nmax.value = rmax.value;
      paint();
      if (commit) {
        nmin.dispatchEvent(new Event('input', { bubbles: true }));
        nmax.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function syncFromInputs(commit) {
      var lo = Math.max(0, Math.min(Number(nmin.value) || 0, max));
      var hi = Math.max(0, Math.min(Number(nmax.value) || max, max));
      if (lo > hi) lo = hi;
      nmin.value = lo;
      nmax.value = hi;
      rmin.value = lo;
      rmax.value = hi;
      paint();
      if (commit) {
        nmax.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    rmin.addEventListener('input', function () {
      if (Number(rmin.value) > Number(rmax.value)) rmin.value = rmax.value;
      nmin.value = rmin.value;
      paint();
    });
    rmax.addEventListener('input', function () {
      if (Number(rmax.value) < Number(rmin.value)) rmax.value = rmin.value;
      nmax.value = rmax.value;
      paint();
    });
    rmin.addEventListener('change', function () {
      syncFromRanges(true);
    });
    rmax.addEventListener('change', function () {
      syncFromRanges(true);
    });
    nmin.addEventListener('change', function () {
      syncFromInputs(true);
    });
    nmax.addEventListener('change', function () {
      syncFromInputs(true);
    });
    paint();
  }

  function initPrices(scope) {
    [].forEach.call((scope || document).querySelectorAll('[data-rl-price]'), setupPrice);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initPrices();
    });
  } else {
    initPrices();
  }
  document.addEventListener('shopify:section:load', function (e) {
    initPrices(e.target);
  });

  /* ---------- Brand facet search (delegation; block Dawn facet form AJAX) ---------- */
  function filterBrandList(input) {
    var fieldset = input.closest('fieldset');
    var root = input.closest('.js-filter--brand') || input.closest('.js-filter');
    var list =
      (fieldset && fieldset.querySelector('[data-rl-facet-list]')) ||
      (fieldset && fieldset.querySelector('ul.facets__list--vertical, ul.list-unstyled')) ||
      (root && root.querySelector('[data-rl-facet-list]')) ||
      (root && root.querySelector('ul.facets__list--vertical'));
    if (!list) return;
    var more = root && root.querySelector('show-more-button');
    var q = input.value.trim().toLowerCase();
    var lessEl = more && more.querySelector('.label-show-less');
    var expanded = !!(lessEl && !lessEl.classList.contains('hidden'));
    [].forEach.call(list.querySelectorAll('.facets__item'), function (li) {
      var labelEl = li.querySelector('.facet-checkbox__text-label');
      var label =
        li.getAttribute('data-rl-facet-label') ||
        (labelEl ? labelEl.textContent.trim().toLowerCase() : '');
      var match = !q || label.indexOf(q) !== -1;
      if (!match) {
        li.hidden = true;
        li.style.display = 'none';
        return;
      }
      li.hidden = false;
      li.style.display = '';
      if (q || expanded || !li.classList.contains('show-more-item')) {
        li.classList.remove('hidden');
      } else {
        li.classList.add('hidden');
      }
    });
    if (more) more.hidden = !!q;
  }

  function blockFacetForm(e) {
    if (!e.target || !e.target.closest || !e.target.closest('[data-rl-facet-search-input]')) return;
    e.stopPropagation();
  }

  /* Capture phase so Dawn's form input listener never sees brand search keystrokes */
  document.addEventListener('input', blockFacetForm, true);
  document.addEventListener('change', blockFacetForm, true);
  document.addEventListener('keydown', function (e) {
    if (!e.target.closest || !e.target.closest('[data-rl-facet-search-input]')) return;
    e.stopPropagation();
    if (e.key === 'Enter') e.preventDefault();
  }, true);

  document.addEventListener(
    'input',
    function (e) {
      var input = e.target.closest && e.target.closest('[data-rl-facet-search-input]');
      if (!input) return;
      e.stopPropagation();
      filterBrandList(input);
    },
    true
  );

  /* ---------- Load more ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-rl-loadmore-btn]');
    if (!btn) return;
    e.preventDefault();
    if (btn.classList.contains('is-busy')) return;

    var wrap = btn.closest('[data-rl-loadmore]');
    var page = btn.closest('[data-rl-cview]') || document.querySelector('[data-rl-cview]');
    var grid = (page && page.querySelector('[data-rl-cview-grid]')) || document.querySelector('[data-rl-cview-grid]');
    if (!wrap || !grid) return;

    var url = btn.getAttribute('href');
    var sectionId = wrap.getAttribute('data-rl-section');
    if (!url || !sectionId) return;

    btn.classList.add('is-busy');
    var fetchUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'section_id=' + encodeURIComponent(sectionId);

    fetch(fetchUrl, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        [].forEach.call(doc.querySelectorAll('[data-rl-cview-grid] > li'), function (li) {
          grid.appendChild(document.importNode(li, true));
        });

        var total = Number(wrap.getAttribute('data-rl-total')) || 0;
        var shown = grid.children.length;
        var textEl = wrap.querySelector('[data-rl-loadmore-text]');
        var bar = wrap.querySelector('[data-rl-loadmore-bar]');
        if (textEl) textEl.textContent = 'Showing ' + shown + ' of ' + total + ' products';
        if (bar && total > 0) bar.style.width = Math.min(100, (shown / total) * 100) + '%';

        var nextBtn = doc.querySelector('[data-rl-loadmore-btn]');
        if (nextBtn && nextBtn.getAttribute('href')) {
          btn.setAttribute('href', nextBtn.getAttribute('href'));
          btn.classList.remove('is-busy');
        } else {
          btn.remove();
        }

        if (page) apply(page, savedMode(page));
      })
      .catch(function () {
        location.href = url;
      });
  });

  /* Re-bind price after facet AJAX replaces filter HTML */
  var filtersHost = document.getElementById('main-collection-filters');
  if (filtersHost && !filtersHost.__rlPriceObs) {
    filtersHost.__rlPriceObs = true;
    new MutationObserver(function () {
      initPrices(filtersHost);
    }).observe(filtersHost, { childList: true, subtree: true });
  }
})();
