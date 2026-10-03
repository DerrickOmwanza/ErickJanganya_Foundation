function toggleDrawer(open) {
  var drawer = document.getElementById('mobile-drawer');
  if (drawer) drawer.classList.toggle('open', open);
  document.documentElement.classList.toggle('drawer-open', !!open);
}

// Search overlay: replaces the header with a big inline search field over the hero, closed via the
// X button or Escape. Kept in sync with the header's current top offset so it lines up whether or
// not the top announcement banner is still showing.
function toggleSearch(open) {
  var overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  var willOpen = typeof open === 'boolean' ? open : !overlay.classList.contains('open');
  var header = document.querySelector('.site-header');
  if (willOpen && header) overlay.style.top = Math.max(0, header.getBoundingClientRect().top) + 'px';
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
  // Filled immediately (not on scroll-into-view) so nothing waits on the viewport before showing.
  bars.forEach(function (el) { el.style.width = el.dataset.progress + '%'; });
}

// Rotates the hero's single word + background video together, so the headline word and the
// visible clip always change in sync. Each clip is pre-trimmed to ~4.5s and drives its own
// advance via the video's 'ended' event (rather than a fixed setInterval, which would drift out
// of sync with clips of slightly different lengths) — prev/next/pause controls (bottom-right,
// matching Obama.org's hero rail) let a visitor override that automatic pace at any time.
//
// Both the video and the word use the same "two layers take turns" trick: a standby layer is
// prepared while the active one keeps showing, then they swap. For video that means loading the
// next clip and waiting for 'loadeddata' before it fades to the front (see .hero-slide-video) —
// for the word it means two stacked spans (see .hero-rotate-word), where the outgoing one slides
// up and out while the incoming one slides up into place from below, at the same time, so the
// swap reads as a continuous reel rather than a fade.
function rotateHero() {
  var hero = document.getElementById('hero');
  if (!hero) return;
  var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero-slides li'));
  var wordA = document.getElementById('heroWordA');
  var wordB = document.getElementById('heroWordB');
  var videoA = document.getElementById('heroVideoA');
  var videoB = document.getElementById('heroVideoB');
  var prevBtn = document.getElementById('heroPrev');
  var nextBtn = document.getElementById('heroNext');
  var toggleBtn = document.getElementById('heroToggle');
  if (!slides.length || !wordA || !wordB || !videoA || !videoB) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var i = 0;
  var paused = reduce;
  var active = videoA;
  var standby = videoB;
  var activeWord = wordA;
  var standbyWord = wordB;
  var advancing = false;

  function setPaused(next) {
    paused = next;
    if (toggleBtn) {
      toggleBtn.innerHTML = paused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
      toggleBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    }
    if (paused) active.pause();
    else active.play().catch(function () {});
  }

  function swapWord(text) {
    standbyWord.textContent = text;
    standbyWord.style.transition = 'none';
    standbyWord.classList.remove('is-active', 'is-leaving');
    standbyWord.getBoundingClientRect(); // force reflow so the "parked below" reset above is committed
    standbyWord.style.transition = '';
    activeWord.classList.add('is-leaving');
    activeWord.classList.remove('is-active');
    standbyWord.classList.add('is-active');
    var justLeft = activeWord;
    activeWord = standbyWord;
    standbyWord = justLeft;
    setTimeout(function () { justLeft.classList.remove('is-leaving'); }, 500);
  }

  // Index of the slide currently loaded (or loading) into `standby`, so the fetch that matters —
  // the *next* clip — starts the moment the current one goes active, not only once it ends. On
  // localhost every clip loads from disk instantly either way, which is why this gap was invisible
  // there; over a real network, fetching ~1-3MB only after 'ended' fires left the last frame frozen
  // for however long that fetch took. preloadStandby() is called right after every reveal, so by the
  // time the new active clip's own 'ended' fires, its successor is typically already sitting ready.
  var standbyPreloadIndex = -1;

  function preloadStandby(index) {
    var target = (index + slides.length) % slides.length;
    if (standbyPreloadIndex === target) return; // already loading/loaded this one
    var slide = slides[target];
    standbyPreloadIndex = target;
    standby.poster = slide.dataset.poster || '';
    standby.src = slide.dataset.video;
    standby.currentTime = 0;
  }

  function goTo(index) {
    if (advancing) return;
    advancing = true;
    var target = (index + slides.length) % slides.length;
    var slide = slides[target];

    function reveal() {
      standby.removeEventListener('loadeddata', reveal);
      if (!paused) standby.play().catch(function () {});
      standby.classList.add('is-active');
      active.classList.remove('is-active');
      swapWord(slide.dataset.word);

      var justFinished = active;
      active = standby;
      standby = justFinished;
      i = target;
      standbyPreloadIndex = -1;
      preloadStandby(i + 1);
      setTimeout(function () { justFinished.pause(); advancing = false; }, 800);
    }

    if (standbyPreloadIndex === target && standby.readyState >= 2) {
      // Already preloaded (the common case: this is the clip we started fetching last time) —
      // reveal immediately instead of re-requesting it and waiting again.
      reveal();
      return;
    }
    if (standbyPreloadIndex !== target) preloadStandby(target);
    standby.addEventListener('loadeddata', reveal);
  }

  // Only whichever layer is actually active/playing can naturally reach 'ended', so both listeners
  // can be bound once up front rather than re-bound on every swap.
  function onEnded() { if (!paused) goTo(i + 1); }
  videoA.addEventListener('ended', onEnded);
  videoB.addEventListener('ended', onEnded);
  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(i - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(i + 1); });
  if (toggleBtn) toggleBtn.addEventListener('click', function () { setPaused(!paused); });

  // First slide has no predecessor to crossfade from — load it straight into the active layers.
  var first = slides[0];
  activeWord.textContent = first.dataset.word;
  active.poster = first.dataset.poster || '';
  active.src = first.dataset.video;
  active.addEventListener('loadeddata', function once() {
    active.removeEventListener('loadeddata', once);
    active.classList.add('is-active');
    activeWord.classList.add('is-active');
    if (!paused) active.play().catch(function () {});
    preloadStandby(1);
  });
  setPaused(paused);
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

  // Obama.org behaviour. At scroll 0 the nav links float over the hero with no bar behind them,
  // under the yellow banner. On the very first scroll the white bar appears (header--solid) right
  // beneath the banner; the banner is part of the page (position:absolute, see .top-banner) so it
  // scrolls away 1:1 with the wheel while the bar's top edge stays pinned to the banner's bottom
  // edge, until the banner is gone and the white bar sticks at top:0.
  // The banner/bar positioning itself is pure CSS (static banner + sticky header, see style.css) so it
  // stays perfectly in step with native scrolling; JS only measures heights and flips the bar's
  // colours on the first scroll.
  function measure() {
    var root = document.documentElement.style;
    root.setProperty('--banner-h', (ticker ? ticker.offsetHeight : 0) + 'px');
    root.setProperty('--header-h', header.offsetHeight + 'px');
  }
  function onScroll() {
    header.classList.toggle('header--solid', window.scrollY > 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  measure();
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

// Journey/Horizon rail: arrows nudge a scroll-snap strip one stop at a time — same interaction as
// the media carousel above (click, native arrow keys, or touch swipe; arrows disable at either
// end). Generalized (2026-09-17) to run on every .journey-rail-wrap on the page, scoped by
// .closest/.querySelector rather than a single hardcoded id, since the Vision page reuses this
// same component for its own roadmap alongside About's timeline. Uses behavior:'auto' rather than
// 'smooth' — tested and confirmed 'smooth' silently fights this container's
// scroll-snap-type:x mandatory and the scroll never actually moves; 'auto' is instant but
// reliable, and satisfies prefers-reduced-motion by default.
function initJourneyRail() {
  document.querySelectorAll('.journey-rail-wrap').forEach(function (wrapEl) {
    var scroller = wrapEl.querySelector('.journey-rail-scroll');
    var rail = wrapEl.querySelector('.journey-rail');
    var stop = wrapEl.querySelector('.journey-stop');
    var prevBtn = wrapEl.querySelector('.journey-prev');
    var nextBtn = wrapEl.querySelector('.journey-next');
    if (!scroller || !rail || !stop) return;

    function step() {
      var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap || 28);
      return stop.getBoundingClientRect().width + gap;
    }
    function updateArrows() {
      var max = scroller.scrollWidth - scroller.clientWidth - 6;
      if (prevBtn) prevBtn.disabled = scroller.scrollLeft <= 6;
      if (nextBtn) nextBtn.disabled = max <= 6 || scroller.scrollLeft >= max;
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { scroller.scrollBy({ left: -step(), behavior: 'auto' }); updateArrows(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { scroller.scrollBy({ left: step(), behavior: 'auto' }); updateArrows(); });
    scroller.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  });
}

// About's "Why I'm Running" scroll story: whichever .story-beat crosses a thin band at the vertical
// centre of the viewport becomes active, which fades the others back and swaps the pinned photo
// (.story-frame) with the same data-story index.
function initStoryScroll() {
  document.querySelectorAll('.story-scroll').forEach(function (wrap) {
    if (!('IntersectionObserver' in window)) return;
    var beats = wrap.querySelectorAll('.story-beat');
    var frames = wrap.querySelectorAll('.story-frame');
    function activate(idx) {
      beats.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-story') === idx); });
      frames.forEach(function (f) { f.classList.toggle('is-active', f.getAttribute('data-story') === idx); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) activate(e.target.getAttribute('data-story')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    beats.forEach(function (b) { io.observe(b); });
    wrap.classList.add('is-live');
  });
}

// Foundation's "Core Principles" accordion strip: the panel under the pointer (or keyboard focus)
// becomes .is-open; the last one opened stays open when the pointer leaves, so one is always showing.
function initPrinciplePanels() {
  document.querySelectorAll('.principle-panels').forEach(function (wrap) {
    var panels = wrap.querySelectorAll('.principle-panel');
    function open(p) { panels.forEach(function (x) { x.classList.toggle('is-open', x === p); }); }
    panels.forEach(function (p) {
      p.addEventListener('mouseenter', function () { open(p); });
      p.addEventListener('focus', function () { open(p); });
    });
    wrap.classList.add('is-live');
  });
}

// Foundation's "How Verification Works": the steps light up in order and a status strip narrates what the
// system is doing. Wide screens: the four steps sit in one row, so once the track scrolls into view they
// activate on a timer. Narrow screens: they stack, so each step activates as it scrolls into view and
// the strip stays pinned. Replay reruns it. Reduced motion (or no IntersectionObserver): jump straight to
// the finished state.
function initVerifySteps() {
  var sec = document.querySelector('.verify');
  if (!sec) return;
  var steps = Array.prototype.slice.call(sec.querySelectorAll('.verify-step'));
  var status = sec.querySelector('.verify-status');
  var text = sec.querySelector('.verify-status-text');
  var count = sec.querySelector('.verify-status-count');
  var replay = sec.querySelector('.verify-replay');
  var wide = window.matchMedia('(min-width: 961px)');
  var timers = [];

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    steps.forEach(function (s) { s.classList.remove('is-done', 'line-on'); });
    sec.classList.remove('is-running', 'is-complete');
    text.textContent = 'Claim received';
    count.textContent = '0 of ' + steps.length;
    status.style.setProperty('--p', 0);
    replay.hidden = true;
  }
  function activate(i) {
    if (steps[i].classList.contains('is-done')) return;
    steps[i].classList.add('is-done');
    if (i > 0) steps[i - 1].classList.add('line-on');
    var n = steps.filter(function (s) { return s.classList.contains('is-done'); }).length;
    text.textContent = steps[i].getAttribute('data-status');
    count.textContent = n + ' of ' + steps.length;
    status.style.setProperty('--p', n / steps.length);
    if (n === steps.length) {
      sec.classList.remove('is-running');
      sec.classList.add('is-complete');
      replay.hidden = false;
    } else {
      sec.classList.add('is-running');
    }
  }
  function playTimed() {
    reset();
    steps.forEach(function (s, i) { timers.push(setTimeout(function () { activate(i); }, 450 + i * 950)); });
  }

  sec.classList.add('is-live');
  reset();

  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach(function (s, i) { activate(i); });
    return;
  }

  var played = false;
  var list = sec.querySelector('.verify-steps');
  new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting && wide.matches && !played) { played = true; playTimed(); obs.unobserve(list); }
    });
  }, { threshold: 0.3 }).observe(list);

  var stepIO = new IntersectionObserver(function (entries) {
    if (wide.matches) return;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = steps.indexOf(e.target);
      for (var j = 0; j <= i; j++) activate(j);
    });
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0.2 });
  steps.forEach(function (s) { stepIO.observe(s); });

  replay.addEventListener('click', function () {
    if (wide.matches) { playTimed(); } else { reset(); activate(0); steps[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });
}

// In-page index bar (.page-index): marks the link of the section currently in view (the last section whose
// top has passed a line just under the sticky bar), hides links whose section is hidden, and keeps the active
// link visible inside the bar when it scrolls sideways on small screens.
function initPageIndex() {
  document.querySelectorAll('.page-index').forEach(function (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var items = links.map(function (a) {
      return { link: a, li: a.closest('li'), target: document.getElementById(a.getAttribute('href').slice(1)) };
    }).filter(function (it) { return it.target; });
    if (!items.length) return;

    function isShown(it) { return !it.target.hidden && it.target.offsetParent !== null; }
    function refreshVisibility() { items.forEach(function (it) { if (it.li) it.li.hidden = !isShown(it); }); }

    var ticking = false;
    function update() {
      ticking = false;
      var line = nav.getBoundingClientRect().bottom + 24;
      var current = null;
      items.forEach(function (it) {
        if (isShown(it) && it.target.getBoundingClientRect().top <= line) current = it;
      });
      var nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (nearBottom) { for (var i = items.length - 1; i >= 0; i--) { if (isShown(items[i])) { current = items[i]; break; } } }
      items.forEach(function (it) {
        var on = it === current;
        it.link.classList.toggle('is-active', on);
        if (on) { it.link.setAttribute('aria-current', 'true'); } else { it.link.removeAttribute('aria-current'); }
      });
      var box = nav.querySelector('.page-index-inner');
      if (current && box && box.scrollWidth > box.clientWidth) {
        var l = current.link.offsetLeft, w = current.link.offsetWidth;
        if (l < box.scrollLeft || l + w > box.scrollLeft + box.clientWidth) box.scrollTo({ left: Math.max(0, l - 24), behavior: 'auto' });
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

    refreshVisibility();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { refreshVisibility(); onScroll(); });
      items.forEach(function (it) { mo.observe(it.target, { attributes: true, attributeFilter: ['hidden'] }); });
    }
  });
}

// Vision's Priorities selector: a vertical tab list (click, hover on pointer devices, arrow keys) that shows
// one priority panel at a time. Without JS, or on narrow screens (CSS hides the list there), every panel is
// simply visible as a stacked card.
function initPriorityTabs() {
  document.querySelectorAll('.priorities-grid').forEach(function (wrap) {
    var list = wrap.querySelector('[role="tablist"]');
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(wrap.querySelectorAll('[role="tabpanel"]'));
    if (!list || tabs.length !== panels.length) return;
    var canHover = window.matchMedia('(hover: hover)').matches;

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      if (canHover) t.addEventListener('mouseenter', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });
    list.hidden = false;
    wrap.classList.add('is-live');
    select(0);
  });
}

// Embedded maps: an iframe under the pointer swallows the mouse wheel, trapping the page scroll. Once JS is
// live the map is inert until clicked (the overlay lets the wheel scroll the page), becomes interactive on
// click, and goes inert again when the pointer leaves or the user presses Escape.
function initMapFrames() {
  document.querySelectorAll('.map-frame').forEach(function (frame) {
    var hint = frame.querySelector('.map-frame-hint');
    function activate() { frame.classList.add('is-active'); }
    function deactivate() { frame.classList.remove('is-active'); }
    frame.classList.add('is-live');
    if (hint) hint.hidden = false;
    frame.addEventListener('click', activate);
    frame.addEventListener('mouseleave', deactivate);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') deactivate(); });
  });
}

// Site-wide smooth, inertial page scrolling via Lenis (loaded on demand so no page needs its own
// <script> tag). Wheel events over a nested scroller (the homepage tracker list) stay with that
// scroller while it can still move in the wheel's direction, and pass to the page the moment it hits
// its top/bottom — so the cursor position never traps the page scroll. Skipped entirely for
// visitors who prefer reduced motion (native scrolling is used instead).
function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js';
  s.onload = function () {
    if (!window.Lenis) return;
    var lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    document.querySelectorAll('.split-cards, .value-grid').forEach(function (el) {
      el.addEventListener('wheel', function (e) {
        var atTop = el.scrollTop <= 0;
        var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        var canScroll = e.deltaY < 0 ? !atTop : !atBottom;
        if (canScroll) e.stopPropagation();
      }, { passive: true });
    });
  };
  document.head.appendChild(s);
}

document.addEventListener('DOMContentLoaded', function () {
  initSmoothScroll();
  // Lenis (smooth page scroll) intercepts every wheel event on the window, which froze the side menu
  // and search overlay's own scrolling. data-lenis-prevent tells it to leave these panels alone.
  document.querySelectorAll('.mobile-drawer-inner, .search-overlay').forEach(function (el) {
    el.setAttribute('data-lenis-prevent', '');
  });
  // mark current nav item
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(function (el) {
    if (el.getAttribute('data-nav') === path) el.classList.add('current');
  });

  animateProgressBars();
  rotateHero();
  initHeaderScroll();
  initMediaCarousel();
  initJourneyRail();
  initStoryScroll();
  initPrinciplePanels();
  initVerifySteps();
  initMapFrames();
  initPriorityTabs();
  initPageIndex();
});
