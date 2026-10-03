// Live record for the Vision page: feeds the "Where things stand today" strip and the per-ward details on the
// ward map. Real counts come from the Development Tracker and Promise Scorecard APIs.
//
// While the site is being built the API holds placeholder seed records (text starting with "[Placeholder]") so
// real updates can drop into the same slots later. They are shown here, labelled "Sample data" whenever any
// placeholder is on screen (the label disappears by itself once real records replace them). At launch, flip
// HIDE_PLACEHOLDERS in js/api.js to true and they are filtered out (the strip then stays hidden until real
// records exist, and wards say nothing has been published yet).
(function () {
  'use strict';
  var WARD_TOTAL = 5;
  var strip = document.getElementById('liveStrip');

  function keep(items) { return window.ApiClient.realOnly(items); }
  function anyPlaceholder(items) { return items.some(window.ApiClient.isPlaceholder); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var ready = (!window.ApiClient ? Promise.reject(new Error('no api client')) : Promise.all([
    window.ApiClient.get('/tracker', { limit: 200 }),
    window.ApiClient.get('/promises', { limit: 200 })
  ])).then(function (res) {
    var projects = keep(res[0].items || []);
    var promises = keep(res[1].items || []);
    return { projects: projects, promises: promises, sample: anyPlaceholder(projects) || anyPlaceholder(promises) };
  });

  function animateCount(el, target) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = target.toLocaleString(); return; }
    var t0 = performance.now(), dur = 900;
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(target * p).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function fillStrip(data) {
    if (!strip || !data.projects.length) return;
    var wards = {}, completed = 0, latest = 0;
    data.projects.forEach(function (p) {
      if (p.ward) wards[p.ward] = true;
      if (p.status === 'Completed') completed++;
      var t = Date.parse(p.updatedAt || p.createdAt || '');
      if (t && t > latest) latest = t;
    });
    var set = function (id, n) { var el = document.getElementById(id); if (el) animateCount(el, n); };
    set('liveProjects', data.projects.length);
    set('liveCompleted', completed);
    set('liveWards', Object.keys(wards).length);
    set('livePromises', data.promises.length);
    var of = document.getElementById('liveWardsOf');
    if (of) of.textContent = '/ ' + WARD_TOTAL;
    var stamp = document.getElementById('liveUpdated');
    if (stamp && latest) stamp.textContent = 'Last updated ' + new Date(latest).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    var badge = document.getElementById('liveSample');
    if (badge) badge.hidden = !data.sample;
    strip.hidden = false;
  }

  // Markup for the details shown under the ward chips when a ward is selected.
  function wardDetailHtml(wardName, data) {
    var href = 'tracker.html?ward=' + encodeURIComponent(wardName);
    var link = '<a class="ward-detail-link" href="' + href + '">See ' + esc(wardName) + ' on the tracker <i class="fa-solid fa-arrow-right"></i></a>';
    if (!data) {
      return '<p class="ward-detail-empty">The live record could not be loaded right now.</p>' + link;
    }
    var items = data.projects.filter(function (p) { return p.ward === wardName; });
    var sample = anyPlaceholder(items) ? '<span class="ward-detail-sample">Sample data</span>' : '';
    if (!items.length) {
      return sample + '<p class="ward-detail-empty">No published records for this ward yet.</p>' + link;
    }
    var counts = {};
    items.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });
    var order = ['Completed', 'Ongoing', 'Planned'];
    var chips = order.filter(function (s) { return counts[s]; }).map(function (s) {
      return '<span class="ward-detail-chip ward-detail-chip--' + s.toLowerCase() + '">' + counts[s] + ' ' + s.toLowerCase() + '</span>';
    }).join('');
    var rows = items.slice(0, 3).map(function (p) {
      var pct = Math.max(0, Math.min(100, Number(p.progressPercent) || 0));
      return '<li><span class="ward-detail-title">' + esc(p.title) + '</span>' +
        '<span class="ward-detail-meta">' + esc(p.category) + ' &middot; ' + esc(p.status) + ' &middot; ' + pct + '%</span>' +
        '<span class="ward-detail-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span></li>';
    }).join('');
    var more = items.length > 3 ? '<p class="ward-detail-more">and ' + (items.length - 3) + ' more on the tracker</p>' : '';
    return sample + '<p class="ward-detail-count"><strong>' + items.length + '</strong> ' + (items.length === 1 ? 'project' : 'projects') + ' logged</p>' +
      '<div class="ward-detail-chips">' + chips + '</div><ul class="ward-detail-list">' + rows + '</ul>' + more + link;
  }

  ready.then(fillStrip).catch(function (err) { console.error('Vision live record unavailable:', err); });

  window.VisionLive = {
    wardDetail: function (wardName) {
      return ready.then(function (data) { return wardDetailHtml(wardName, data); }, function () { return wardDetailHtml(wardName, null); });
    }
  };
})();
