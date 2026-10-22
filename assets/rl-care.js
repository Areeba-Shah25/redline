/* rl-care.js — Care Guides filters + video lightbox */
(function () {
  if (window.__rlCare) return;
  window.__rlCare = true;

  function youtubeId(url) {
    if (!url) return '';
    var str = String(url).trim();
    var patterns = [
      /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtu\.be\/)([A-Za-z0-9_-]{6,11})/,
      /^([A-Za-z0-9_-]{11})$/,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = str.match(patterns[i]);
      if (m && m[1]) return m[1];
    }
    try {
      var u = new URL(str);
      var v = u.searchParams.get('v');
      if (v) return v;
    } catch (err) {}
    return '';
  }

  function getLightbox() {
    return document.querySelector('[data-rl-care-lightbox]');
  }

  function clearPlayer(player) {
    if (!player) return;
    var vids = player.querySelectorAll('video');
    for (var i = 0; i < vids.length; i++) {
      try {
        vids[i].pause();
      } catch (err) {}
    }
    player.innerHTML = '';
  }

  function openLightbox(srcType, src) {
    var box = getLightbox();
    if (!box) return;
    var player = box.querySelector('[data-rl-care-player]');
    if (!player) return;
    clearPlayer(player);

    var type = String(srcType || '').toLowerCase();
    var source = String(src || '').trim();
    if (!source) return;

    if (type === 'youtube' || type.indexOf('youtube') !== -1 || /youtu\.?be|youtube\.com/i.test(source)) {
      var id = youtubeId(source);
      if (!id) return;
      var iframe = document.createElement('iframe');
      iframe.src =
        'https://www.youtube.com/embed/' +
        encodeURIComponent(id) +
        '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      iframe.title = 'Care guide video';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );
      iframe.setAttribute('frameborder', '0');
      player.appendChild(iframe);
    } else if (type === 'mp4' || /\.mp4(\?|$)/i.test(source)) {
      var video = document.createElement('video');
      video.src = source;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      player.appendChild(video);
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    } else {
      return;
    }

    box.hidden = false;
    box.removeAttribute('hidden');
    document.body.classList.add('rl-care-lightbox-open');
    var closeBtn = box.querySelector('[data-rl-care-close]');
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    var box = getLightbox();
    if (!box) return;
    var player = box.querySelector('[data-rl-care-player]');
    clearPlayer(player);
    box.hidden = true;
    box.setAttribute('hidden', '');
    document.body.classList.remove('rl-care-lightbox-open');
  }

  function setFilter(root, handle) {
    var pills = root.querySelectorAll('[data-rl-care-filter]');
    for (var i = 0; i < pills.length; i++) {
      var on = pills[i].getAttribute('data-rl-care-filter') === handle;
      pills[i].classList.toggle('is-active', on);
      pills[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    var groups = root.querySelectorAll('[data-rl-care-group]');
    for (var g = 0; g < groups.length; g++) {
      var gh = groups[g].getAttribute('data-rl-care-group');
      var show = handle === 'all' || gh === handle;
      groups[g].hidden = !show;
    }
  }

  document.addEventListener(
    'click',
    function (e) {
      var filterBtn = e.target.closest('[data-rl-care-filter]');
      if (filterBtn) {
        var root = filterBtn.closest('[data-rl-care-guides]');
        if (!root) return;
        e.preventDefault();
        setFilter(root, filterBtn.getAttribute('data-rl-care-filter') || 'all');
        return;
      }

      var playBtn = e.target.closest('[data-rl-care-play]');
      if (playBtn) {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(playBtn.getAttribute('data-video-type'), playBtn.getAttribute('data-video-src'));
        return;
      }

      if (e.target.closest('[data-rl-care-close]') || e.target.closest('[data-rl-care-backdrop]')) {
        e.preventDefault();
        closeLightbox();
      }
    },
    true
  );

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });
})();
