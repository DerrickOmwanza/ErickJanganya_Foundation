// Live "impact so far" stat strip on the homepage. Real counts pulled from the API — not hardcoded —
// and animated (count-up) the first time the strip scrolls into view. If the API can't be reached,
// the section hides itself rather than showing broken zeros.
(function () {
  var section = document.getElementById('impactStats');
  if (!section || !window.ApiClient) return;

  var els = {
    projects: document.getElementById('statProjects'),
    wards: document.getElementById('statWards'),
    promises: document.getElementById('statPromises'),
    events: document.getElementById('statEvents'),
  };

  function setTarget(el, value) {
    if (el) el.dataset.target = value;
  }

  function animateCount(el) {
    var target = parseInt(el.dataset.target, 10) || 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = target.toLocaleString(); return; }
    var dur = 1000, t0 = performance.now();
    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(target * p).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function armObserver() {
    // Counts up as soon as the data arrives, not when the strip scrolls into view.
    Object.keys(els).map(function (k) { return els[k]; }).filter(Boolean).forEach(animateCount);
  }

  Promise.all([
    window.ApiClient.get('/tracker', { limit: 100 }),
    window.ApiClient.get('/promises', { limit: 1 }),
    window.ApiClient.get('/events', { limit: 1 }),
  ]).then(function (results) {
    var trackerItems = results[0].items || [];
    var wardSet = {};
    trackerItems.forEach(function (p) { if (p.ward) wardSet[p.ward] = true; });

    setTarget(els.projects, results[0].total || trackerItems.length);
    setTarget(els.wards, Object.keys(wardSet).length);
    setTarget(els.promises, results[1].total || 0);
    setTarget(els.events, results[2].total || 0);

    section.hidden = false;
    armObserver();
  }).catch(function (err) {
    console.error('Impact stats: could not load live counts, hiding strip.', err);
    section.hidden = true;
  });
})();
