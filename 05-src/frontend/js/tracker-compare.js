// Development Tracker "Before and After": a comparison slider (before on the left, after on the right) for projects
// that are Ongoing or Completed and have photos from before and after the work. Drag the handle, click the image, or
// use the arrow keys. While it is on screen it sweeps back and forth by itself until a visitor takes over, and it
// always has a Pause button. Real photos come from a project's beforePhotoUrl and afterPhotoUrl (or its main
// photoUrl); until those exist, placeholder projects show clearly labelled sample images. The section hides itself
// when no project qualifies. Requires api.js (window.ApiClient, window.FoundationUtils).
window.TrackerCompare = (function () {
  'use strict';
  var U = window.FoundationUtils;
  var SAMPLES = {
    'Infrastructure': ['img/hero-roads-poster.jpg', 'img/focus-infrastructure.jpg'],
    'Health': ['img/hero-clinics-poster.jpg'],
    'Youth & Employment': ['img/focus-youth.jpg'],
    'Water & Sanitation': ['img/hero-water-poster.jpg'],
    'Education': ['img/vision-education-youth.jpg']
  };
  var SAMPLE_DEFAULT = 'img/tracker-preview.jpg';
  var CYCLE = 9;      // seconds for one full sweep
  var SWING = 42;     // the handle sweeps 50% +/- 42%
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var el = {};
  var pairs = [], current = 0, pos = 50;
  var bound = false, openCb = null;
  var dragging = false, inView = false, paused = reduce, raf = null, phase0 = 0, t0 = null;

  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  function pairFor(p, used) {
    if (p.status !== 'Ongoing' && p.status !== 'Completed') return null;
    var after = p.afterPhotoUrl || p.photoUrl;
    if (p.beforePhotoUrl && after) {
      return { p: p, before: p.beforePhotoUrl, after: after, sample: false };
    }
    if (window.ApiClient.isPlaceholder(p)) {
      var list = SAMPLES[p.category] || [SAMPLE_DEFAULT];
      var n = used[p.category] || 0;
      used[p.category] = n + 1;
      var img = list[n % list.length];
      return { p: p, before: img, after: img, sample: true };
    }
    return null;
  }

  function setPos(v) {
    pos = clamp(v);
    el.before.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
    el.before.style.webkitClipPath = el.before.style.clipPath;
    el.handle.style.left = pos + '%';
    el.handle.setAttribute('aria-valuenow', String(Math.round(pos)));
    el.handle.setAttribute('aria-valuetext', Math.round(pos) + ' percent before');
  }

  // ----- Automatic sweep -----

  function tick(ts) {
    if (!shouldPlay()) { raf = null; return; }
    if (t0 === null) t0 = ts;
    var angle = phase0 + (ts - t0) / 1000 * (2 * Math.PI / CYCLE);
    setPos(50 + SWING * Math.sin(angle));
    raf = requestAnimationFrame(tick);
  }

  function shouldPlay() { return inView && !paused && !dragging; }

  function startSweep() {
    if (raf !== null || !shouldPlay()) return;
    phase0 = Math.asin(Math.max(-1, Math.min(1, (pos - 50) / SWING)));
    t0 = null;
    raf = requestAnimationFrame(tick);
  }

  function stopSweep() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }

  function updatePlayButton() {
    var playing = !paused;
    el.play.setAttribute('aria-pressed', playing ? 'false' : 'true');
    el.play.querySelector('span').textContent = playing ? 'Pause' : 'Play';
    el.play.querySelector('i').className = 'fa-solid ' + (playing ? 'fa-pause' : 'fa-play');
  }

  // A visitor taking hold of the slider ends the automatic sweep for good (until they press Play).
  function takeOver() {
    stopSweep();
    if (!paused) { paused = true; updatePlayButton(); }
  }

  // ----- Rendering -----

  function renderList() {
    el.list.innerHTML = pairs.map(function (x, i) {
      var p = x.p;
      return '<li><button type="button" class="ba-item" data-i="' + i + '" aria-current="' + (i === current ? 'true' : 'false') + '">' +
        '<span class="ba-thumb"><img src="' + U.escapeHtml(x.after) + '" alt="" loading="lazy"></span>' +
        '<span class="ba-item-text"><b>' + U.escapeHtml(p.title) + '</b>' +
        '<span>' + U.escapeHtml(p.ward) + ' &middot; ' + U.escapeHtml(p.status) + '</span></span></button></li>';
    }).join('');
  }

  function renderCaption(x) {
    var p = x.p;
    var meta = [];
    if (!x.sample) {
      var b = U.formatMonthYear(p.beforeTakenOn), a = U.formatMonthYear(p.afterTakenOn);
      if (b) meta.push('Before: ' + b);
      if (a) meta.push((p.status === 'Completed' ? 'After: ' : 'Latest: ') + a);
    }
    var pct = Math.max(0, Math.min(100, Number(p.progressPercent) || 0));
    meta.push(p.status === 'Completed' ? 'Completed' : pct + '% complete');
    el.caption.innerHTML =
      '<div class="ba-cap-main"><span class="ba-cap-where">' + U.escapeHtml(p.ward) + ' &middot; ' + U.escapeHtml(p.category) + '</span>' +
        '<h3>' + U.escapeHtml(p.title) + '</h3>' +
        '<p class="ba-cap-meta">' + meta.map(U.escapeHtml).join(' &middot; ') + '</p>' +
        (x.sample ? '<p class="ba-cap-note">Sample images, shown until real site photos are added for this project.</p>' : '') +
      '</div>' +
      '<button type="button" class="ba-open" data-id="' + U.escapeHtml(String(p.id)) + '">View project details <i class="fa-solid fa-arrow-right"></i></button>';
  }

  function select(i) {
    current = i;
    var x = pairs[i];
    var p = x.p;
    el.stage.classList.toggle('is-sample', x.sample);
    el.sample.hidden = !x.sample;
    el.afterTag.textContent = p.status === 'Completed' ? 'After' : 'Latest';
    el.beforeImg.src = x.before;
    el.afterImg.src = x.after;
    el.beforeImg.alt = 'Before work started: ' + p.title + ', ' + p.ward;
    el.afterImg.alt = (p.status === 'Completed' ? 'After the work: ' : 'The work so far: ') + p.title + ', ' + p.ward;
    el.stage.classList.remove('is-fresh');
    void el.stage.offsetWidth;
    el.stage.classList.add('is-fresh');
    Array.prototype.forEach.call(el.list.querySelectorAll('.ba-item'), function (b, n) {
      b.setAttribute('aria-current', n === i ? 'true' : 'false');
    });
    renderCaption(x);
    stopSweep();
    setPos(50);
    startSweep();
  }

  // ----- Interaction -----

  function posFromEvent(e) {
    var r = el.stage.getBoundingClientRect();
    return r.width ? (e.clientX - r.left) / r.width * 100 : 50;
  }

  function bind() {
    el.stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      takeOver();
      try { el.stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      setPos(posFromEvent(e));
      el.stage.classList.add('is-dragging');
    });
    el.stage.addEventListener('pointermove', function (e) { if (dragging) setPos(posFromEvent(e)); });
    function release() { dragging = false; el.stage.classList.remove('is-dragging'); }
    el.stage.addEventListener('pointerup', release);
    el.stage.addEventListener('pointercancel', release);
    el.handle.addEventListener('keydown', function (e) {
      var step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -15, PageUp: 15 }[e.key];
      if (step !== undefined) { e.preventDefault(); takeOver(); setPos(pos + step); }
      else if (e.key === 'Home') { e.preventDefault(); takeOver(); setPos(0); }
      else if (e.key === 'End') { e.preventDefault(); takeOver(); setPos(100); }
    });
    el.play.addEventListener('click', function () {
      paused = !paused;
      updatePlayButton();
      if (paused) { stopSweep(); } else { startSweep(); }
    });
    el.list.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.ba-item') : null;
      if (b) select(Number(b.getAttribute('data-i')));
    });
    el.caption.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.ba-open') : null;
      if (b && openCb) openCb(b.getAttribute('data-id'), b);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) { startSweep(); } else { stopSweep(); }
      }, { threshold: 0.4 }).observe(el.stage);
    } else {
      inView = true;
    }
  }

  function render(items, onOpen) {
    el.section = document.getElementById('before-after');
    if (!el.section) return;
    openCb = onOpen;
    var used = {};
    pairs = [];
    (items || []).slice().sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'Completed' ? -1 : 1;
      return (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
    }).forEach(function (p) {
      var pair = pairFor(p, used);
      if (pair && pairs.length < 6) pairs.push(pair);
    });
    if (!pairs.length) { el.section.hidden = true; return; }
    el.stage = document.getElementById('baStage');
    el.before = document.getElementById('baBefore');
    el.beforeImg = document.getElementById('baBeforeImg');
    el.afterImg = document.getElementById('baAfter');
    el.afterTag = document.getElementById('baAfterTag');
    el.sample = document.getElementById('baSample');
    el.handle = document.getElementById('baHandle');
    el.play = document.getElementById('baPlay');
    el.list = document.getElementById('baList');
    el.caption = document.getElementById('baCaption');
    el.section.hidden = false;
    renderList();
    if (!bound) { bind(); bound = true; }
    updatePlayButton();
    select(0);
  }

  return { render: render };
})();
