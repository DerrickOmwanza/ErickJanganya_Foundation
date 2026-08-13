function toggleDrawer(open) {
  var drawer = document.getElementById('mobile-drawer');
  if (drawer) drawer.classList.toggle('open', open);
}

// Search overlay: replaces the header with a big inline search field over the hero, closed via the
// X button or Escape. Kept in sync with the header's current top offset so it lines up whether or
// not the top announcement banner is still showing.
function toggleSearch(open) {
  var overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  var willOpen = typeof open === 'boolean' ? open : !overlay.classList.contains('open');
  var header = document.querySelector('.site-header');
  if (willOpen && header) overlay.style.top = header.style.top || getComputedStyle(header).top;
  overlay.classList.toggle('open', willOpen);
  overlay.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
  if (willOpen) {
    var input = overlay.querySelector('.search-overlay-input');
    if (input) setTimeout(function () { input.focus(); }, 150);
  }
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') toggleSearch(false);
});

function animateCounters() {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.cnt').forEach(function (el) {
    var target = parseInt(el.dataset.target, 10);
    if (reduce) { el.textContent = target.toLocaleString(); return; }
    var dur = 900, t0 = performance.now();
    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(target * p).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function animateProgressBars() {
  var bars = document.querySelectorAll('.progress-fill[data-progress]');
  if (!bars.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fill(el) { el.style.width = el.dataset.progress + '%'; }

  if (reduce || !('IntersectionObserver' in window)) {
    bars.forEach(fill);
    return;
  }
  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        fill(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  bars.forEach(function (el) { io.observe(el); });
}

// Reveals the mission line's words (and inline photo chips) one after another the first time the
// section scrolls into view — also fires correctly on load if the page opens already scrolled there.
function revealMissionLine() {
  var line = document.getElementById('missionLine');
  if (!line) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    line.classList.add('in-view');
    return;
  }
  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        line.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  io.observe(line);
}

// Rotates the hero's single word + background photo together, so the
// headline word and the visible image always change in sync.
function rotateHero() {
  var hero = document.getElementById('hero');
  if (!hero) return;
  var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero-slides li'));
  var wordEl = document.getElementById('heroRotateWord');
  var imgEl = document.getElementById('heroSlideImg');
  if (!slides.length || !wordEl) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var interval = parseInt(hero.dataset.interval, 10) || 3800;
  var i = 0;

  function applySlide(index) {
    var slide = slides[index];
    wordEl.textContent = slide.dataset.word;
    if (imgEl && slide.dataset.image) imgEl.src = slide.dataset.image;
  }

  applySlide(0);
  if (reduce || slides.length < 2) return;

  setInterval(function () {
    i = (i + 1) % slides.length;
    wordEl.classList.add('is-swapping');
    if (imgEl) imgEl.classList.add('is-swapping');
    setTimeout(function () {
      applySlide(i);
      wordEl.classList.remove('is-swapping');
      if (imgEl) imgEl.classList.remove('is-swapping');
    }, 350);
  }, interval);
}

// On pages with a full-bleed hero, the header starts transparent (overlaying the hero image,
// white text — like Obama.org) and solidifies to a clear-white bar with black text once the
// page is scrolled. Pages with no hero keep whatever state is set in their HTML (header--solid).
// If a top announcement banner (.top-banner) is present, it sits above the header while
// unscrolled and fades out on scroll, at which point the header slides up to occupy the top itself.
function initHeaderScroll() {
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero.hero-full');
  if (!header || !hero) return;
  var ticker = document.querySelector('.top-banner');
  var threshold = 60;

  function positionHeader() {
    if (ticker) header.style.top = ticker.offsetHeight + 'px';
  }
  if (ticker) positionHeader();

  function onScroll() {
    var scrolled = window.scrollY > threshold;
    header.classList.toggle('header--solid', scrolled);
    if (ticker) {
      ticker.classList.toggle('is-hidden', scrolled);
      header.style.top = scrolled ? '0px' : ticker.offsetHeight + 'px';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (ticker) window.addEventListener('resize', function () { if (window.scrollY <= threshold) positionHeader(); }, { passive: true });
  onScroll();
}

// "Recent moments" carousel: arrows nudge the native-scroll track one tile (+gap) at a time.
// No autoplay — advancing only happens on click, arrow keys (native, since it's a scroll container),
// or touch swipe. Arrows disable themselves at either end.
function initMediaCarousel() {
  var wrap = document.getElementById('mediaTrackWrap');
  if (!wrap) return;
  var track = wrap.querySelector('.media-track');
  var tile = wrap.querySelector('.media-tile');
  var prevBtn = document.querySelector('.carousel-arrow--prev');
  var nextBtn = document.querySelector('.carousel-arrow--next');
  if (!track || !tile) return;

  function step() {
    var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 14);
    return tile.getBoundingClientRect().width + gap;
  }
  function updateArrows() {
    var max = wrap.scrollWidth - wrap.clientWidth - 2;
    if (prevBtn) prevBtn.disabled = wrap.scrollLeft <= 2;
    if (nextBtn) nextBtn.disabled = max <= 2 || wrap.scrollLeft >= max;
  }
  if (prevBtn) prevBtn.addEventListener('click', function () { wrap.scrollBy({ left: -step(), behavior: 'smooth' }); });
  if (nextBtn) nextBtn.addEventListener('click', function () { wrap.scrollBy({ left: step(), behavior: 'smooth' }); });
  wrap.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

document.addEventListener('DOMContentLoaded', function () {
  // mark current nav item
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(function (el) {
    if (el.getAttribute('data-nav') === path) el.classList.add('current');
  });

  animateProgressBars();
  revealMissionLine();
  rotateHero();
  initHeaderScroll();
  initMediaCarousel();
});
