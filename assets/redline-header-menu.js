/* redline-header-menu.js — desktop nav hover/click + body blur below menu */
(function () {
  if (window.__rlHeaderMenu) return;
  window.__rlHeaderMenu = true;

  var CLOSE_DELAY = 120;
  var desktopMq = window.matchMedia('(min-width: 990px)');
  var leaveTimer = 0;
  var backdrop = null;

  function root() {
    return document.querySelector('.header-wrapper--redline[data-menu-open]');
  }

  function isHoverMode() {
    var el = root();
    if (!el || !desktopMq.matches) return false;
    return (el.getAttribute('data-menu-open') || 'hover') === 'hover';
  }

  function menus() {
    var el = root();
    if (!el) return [];
    return Array.prototype.slice.call(el.querySelectorAll('.header--redline header-menu'));
  }

  function detailsOf(menu) {
    return menu ? menu.querySelector('details') : null;
  }

  function menuFromNode(node) {
    if (!node || !node.closest) return null;
    if (node.closest && node.closest('.rl-mega-backdrop')) return null;
    var panel = node.closest('.rl-mega');
    if (panel) return panel.closest('header-menu');
    return node.closest('header-menu');
  }

  function anyMegaOpen() {
    return menus().some(function (menu) {
      var details = detailsOf(menu);
      return details && details.hasAttribute('open') && details.querySelector('.rl-mega');
    });
  }

  function ensureBackdrop() {
    if (backdrop && document.body.contains(backdrop)) return backdrop;
    backdrop = document.createElement('div');
    backdrop.className = 'rl-mega-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    // Mouse on blur (or click) closes menu + removes overlay
    backdrop.addEventListener('mouseenter', closeAll);
    backdrop.addEventListener('click', closeAll);
    return backdrop;
  }

  function positionBackdrop() {
    var bd = ensureBackdrop();
    // Start blur BELOW the dropdown panel — never over the menu itself
    var panel = document.querySelector(
      '.header-wrapper--redline details.mega-menu[open] .rl-mega'
    );
    var top = 0;
    if (panel) {
      top = Math.ceil(panel.getBoundingClientRect().bottom);
    } else {
      var header = root();
      if (header) top = Math.ceil(header.getBoundingClientRect().bottom);
    }
    bd.style.top = top + 'px';
  }

  function syncOverlay() {
    var open = desktopMq.matches && anyMegaOpen();
    document.body.classList.toggle('rl-mega-open', open);
    ensureBackdrop();
    if (open) {
      // After layout/paint so panel height is correct
      requestAnimationFrame(function () {
        positionBackdrop();
        requestAnimationFrame(positionBackdrop);
      });
    }
  }

  function openMenu(menu) {
    var details = detailsOf(menu);
    if (!details) return;
    if (!details.hasAttribute('open')) details.setAttribute('open', '');
    var summary = details.querySelector('summary');
    if (summary) summary.setAttribute('aria-expanded', 'true');
    var header = root();
    if (header) header.preventHide = true;
    syncOverlay();
  }

  function closeMenu(menu) {
    var details = detailsOf(menu);
    if (!details || !details.hasAttribute('open')) return;
    details.removeAttribute('open');
    var summary = details.querySelector('summary');
    if (summary) summary.setAttribute('aria-expanded', 'false');
  }

  function closeAll() {
    clearTimeout(leaveTimer);
    menus().forEach(closeMenu);
    var header = root();
    if (header) header.preventHide = false;
    document.body.classList.remove('rl-mega-open');
  }

  function closeOthers(except) {
    menus().forEach(function (menu) {
      if (menu !== except) closeMenu(menu);
    });
  }

  function onPointerOver(e) {
    if (!isHoverMode()) return;
    var menu = menuFromNode(e.target);
    if (!menu) return;
    clearTimeout(leaveTimer);
    closeOthers(menu);
    openMenu(menu);
  }

  function onPointerOut(e) {
    if (!isHoverMode()) return;
    var el = root();
    if (!el) return;

    var to = e.relatedTarget;

    // Onto the blur overlay → close immediately
    if (to && to.closest && to.closest('.rl-mega-backdrop')) {
      closeAll();
      return;
    }

    if (to && el.contains(to)) {
      var nextMenu = menuFromNode(to);
      if (nextMenu) {
        clearTimeout(leaveTimer);
        closeOthers(nextMenu);
        openMenu(nextMenu);
        return;
      }
      // Still in header/chrome/panel bridge
      clearTimeout(leaveTimer);
      return;
    }

    // Left header entirely (body / overlay) → close
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(function () {
      if (isHoverMode()) closeAll();
    }, CLOSE_DELAY);
  }

  function onSummaryClick(e) {
    if (!isHoverMode()) return;
    var summary = e.target.closest('summary');
    if (!summary) return;
    var menu = summary.closest('header-menu');
    var el = root();
    if (!menu || !el || !el.contains(menu)) return;
    var details = detailsOf(menu);
    if (details && details.hasAttribute('open')) e.preventDefault();
  }

  function onToggle(e) {
    var details = e.target;
    if (!details || details.tagName !== 'DETAILS') return;
    if (!details.closest('.header--redline')) return;
    syncOverlay();
  }

  function onScrollOrResize() {
    if (document.body.classList.contains('rl-mega-open')) positionBackdrop();
  }

  function bind() {
    var el = root();
    if (!el || el.__rlMenuDelegated) return;
    el.__rlMenuDelegated = true;
    el.addEventListener('mouseover', onPointerOver);
    el.addEventListener('mouseout', onPointerOut);
    el.addEventListener('click', onSummaryClick, true);
    el.addEventListener('toggle', onToggle, true);
  }

  function init() {
    ensureBackdrop();
    bind();
    syncOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function () {
    var el = root();
    if (el) el.__rlMenuDelegated = false;
    init();
  });

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);

  if (typeof desktopMq.addEventListener === 'function') {
    desktopMq.addEventListener('change', function () {
      if (!desktopMq.matches) closeAll();
      else syncOverlay();
    });
  }
})();
