/* rl-hero-banner.js — slider: fade / slide / cut, arrows, dots, autoplay progress */
(function () {
  if (customElements.get('rl-hero-slider')) return;

  customElements.define(
    'rl-hero-slider',
    class extends HTMLElement {
      connectedCallback() {
        this.slides = Array.from(this.querySelectorAll('[data-rl-hero-slide]'));
        this.dots = Array.from(this.querySelectorAll('[data-rl-hero-dot]'));
        this.prevBtn = this.querySelector('[data-rl-hero-prev]');
        this.nextBtn = this.querySelector('[data-rl-hero-next]');
        this.index = 0;
        this.raf = null;
        this.started = 0;
        this.paused = false;
        this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.autoplay = this.dataset.autoplay === 'true' && this.slides.length > 1 && !this.reduce;
        this.speed = Math.max(2000, parseInt(this.dataset.speed || '5000', 10));
        this.transition = this.dataset.transition || 'fade';

        if (this.slides.length <= 1) {
          this.classList.add('rl-hero-slider--single');
          return;
        }

        this.prevBtn && this.prevBtn.addEventListener('click', () => this.go(this.index - 1));
        this.nextBtn && this.nextBtn.addEventListener('click', () => this.go(this.index + 1));
        this.dots.forEach((dot, i) => dot.addEventListener('click', () => this.go(i)));

        this.addEventListener('mouseenter', () => this.pause());
        this.addEventListener('mouseleave', () => this.resume());
        this.addEventListener('focusin', () => this.pause());
        this.addEventListener('focusout', (e) => {
          if (!this.contains(e.relatedTarget)) this.resume();
        });

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) this.pause();
          else this.resume();
        });

        this.go(0, true);
        this.start();
      }

      disconnectedCallback() {
        this.stop();
      }

      go(i, instant) {
        var n = this.slides.length;
        if (!n) return;
        var prev = this.index;
        var next = ((i % n) + n) % n;
        var dir = next >= prev || (prev === n - 1 && next === 0) ? 1 : -1;
        if (prev === 0 && next === n - 1) dir = -1;
        if (instant) dir = 1;

        this.index = next;

        this.slides.forEach((slide, idx) => {
          var on = idx === this.index;
          slide.classList.remove('is-active', 'is-left', 'is-right');
          if (on) {
            slide.classList.add('is-active');
          } else if (this.transition === 'slide') {
            slide.classList.add(idx < this.index ? 'is-left' : 'is-right');
            if (prev === n - 1 && this.index === 0 && idx === prev) slide.classList.add('is-left');
            if (prev === 0 && this.index === n - 1 && idx === prev) slide.classList.add('is-right');
          }
          slide.setAttribute('aria-hidden', on ? 'false' : 'true');
          slide.inert = !on;
        });

        if (this.transition === 'slide' && !instant) {
          var outgoing = this.slides[prev];
          if (outgoing && prev !== this.index) {
            outgoing.classList.remove('is-left', 'is-right');
            outgoing.classList.add(dir > 0 ? 'is-left' : 'is-right');
          }
        }

        this.dots.forEach((dot, idx) => {
          var on = idx === this.index;
          dot.classList.toggle('is-active', on);
          dot.setAttribute('aria-current', on ? 'true' : 'false');
          var fill = dot.querySelector('[data-rl-hero-progress]');
          if (fill) fill.style.transform = 'scaleX(0)';
        });

        this.started = performance.now();
      }

      start() {
        if (!this.autoplay) return;
        this.stop();
        this.started = performance.now();
        var tick = (now) => {
          if (this.paused) {
            this.raf = requestAnimationFrame(tick);
            return;
          }
          var p = Math.min(1, (now - this.started) / this.speed);
          var fill = this.dots[this.index] && this.dots[this.index].querySelector('[data-rl-hero-progress]');
          if (fill) fill.style.transform = 'scaleX(' + p + ')';
          if (p >= 1) {
            this.go(this.index + 1);
            this.started = performance.now();
          }
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      }

      stop() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
      }

      pause() {
        if (!this.autoplay || this.paused) return;
        this.paused = true;
        this._pausedAt = performance.now();
      }

      resume() {
        if (!this.autoplay || !this.paused) return;
        this.paused = false;
        this.started += performance.now() - (this._pausedAt || performance.now());
      }
    }
  );
})();
