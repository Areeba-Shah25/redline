/* rl-instagram.js — OPTIONAL live feed. Loaded only when a Feed endpoint URL is set.
   Expects Instagram Graph API style JSON: { data: [ { media_url, permalink, media_type, thumbnail_url, caption } ] }
   On any error the manual posts stay visible. Needs rl-carousel.js loaded first. */
(function () {
  if (window.__rlIg) return; window.__rlIg = true;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

  function slideFor(root, item, iconHTML) {
    var src = item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url;
    if (!src) return null;
    var slide = el('div', 'rl-car__slide');
    var a = el('a', 'rl-ig__card'); a.href = item.permalink || '#'; a.target = '_blank'; a.rel = 'noopener'; a.draggable = false;
    var media = el('div', 'rl-ig__media');
    var img = document.createElement('img'); img.src = src; img.loading = 'lazy'; img.alt = (item.caption || '').slice(0, 120);
    media.appendChild(img);
    var foot = el('div', 'rl-ig__foot');
    var av = el('span', 'rl-ig__avatar');
    if (root.dataset.igAvatar) { var ai = document.createElement('img'); ai.src = root.dataset.igAvatar; ai.alt = ''; av.appendChild(ai); }
    else av.textContent = (root.dataset.igHandle || '@').charAt(1);
    foot.appendChild(av);
    foot.appendChild(el('span', 'rl-ig__handle', root.dataset.igHandle || ''));
    foot.insertAdjacentHTML('beforeend', iconHTML);
    a.appendChild(media); a.appendChild(foot); slide.appendChild(a);
    return slide;
  }

  function load(root) {
    var url = root.dataset.igEndpoint;
    if (!url || !window.RLCarousel) return;
    var tpl = root.querySelector('template[data-ig-icon]');
    var icon = tpl ? tpl.innerHTML : '';
    fetch(url, { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (json) {
        var items = (json && json.data) || (Array.isArray(json) ? json : []);
        var limit = parseInt(root.dataset.igLimit, 10) || 12;
        var slides = items.slice(0, limit).map(function (i) { return slideFor(root, i, icon); }).filter(Boolean);
        if (!slides.length) return;
        RLCarousel.destroy(root);
        var track = root.querySelector('.rl-car__track');
        track.innerHTML = '';
        slides.forEach(function (s) { track.appendChild(s); });
        RLCarousel.init(root);
      })
      .catch(function () { /* keep manual posts */ });
  }

  function run(scope) { [].forEach.call((scope || document).querySelectorAll('[data-ig-endpoint]'), load); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { run(); });
  else run();
  document.addEventListener('shopify:section:load', function (e) { run(e.target); });
})();
