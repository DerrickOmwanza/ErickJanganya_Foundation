// Renders the Promise Scorecard from the live API: the hero "scorecard at a glance" panel, the filter toolbar (search,
// status and area chips with live counts, sort, result count, clear) and the pledge list, grouped by area as scorecard
// rows. Filters can be shared as links, e.g. promises.html?category=Health&status=Not%20started&q=clinic, which is also
// how the Vision page links into the Scorecard. Requires api.js (window.ApiClient, window.FoundationUtils).
(function () {
  var list = document.getElementById('promisesList');
  if (!list) return; // not on this page

  var stateEl = document.getElementById('promisesState');
  var filtersEl = document.getElementById('pbFilters');
  var searchEl = document.getElementById('pbSearch');
  var sortEl = document.getElementById('pbSort');
  var countEl = document.getElementById('pbCount');
  var clearBtn = document.getElementById('pbClear');

  var U = window.FoundationUtils;
  var STATUSES = ['Kept', 'In progress', 'Not started'];
  var STATUS_ORDER = { 'Kept': 0, 'In progress': 1, 'Not started': 2 };
  var SORTS = ['area', 'status', 'target', 'title'];
  var allItems = [];
  var state = { q: '', category: [], status: [], sort: 'area', pledge: null };

  function slug(status) {
    if (status === 'Kept') return 'kept';
    if (status === 'In progress') return 'progress';
    return 'notstarted';
  }

  function two(n) { return n < 10 ? '0' + n : String(n); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // ----- Hero "scorecard at a glance" panel: totals across ALL pledges (not just the filtered ones) -----

  function renderGlance(items, failed) {
    var panel = document.getElementById('scoreGlance');
    if (!panel) return;
    var $ = function (id) { return document.getElementById(id); };
    var note = $('sgNote');
    panel.classList.remove('is-loading');
    if (failed) {
      ['sgTotal', 'sgKept', 'sgProgress', 'sgNotStarted', 'sgAreas'].forEach(function (id) { $(id).textContent = '0'; });
      $('sgRate').textContent = 'Not available';
      $('sgUpdated').textContent = 'Not available';
      note.hidden = false;
      note.textContent = 'The live figures could not be loaded right now.';
      return;
    }
    var counts = { Kept: 0, 'In progress': 0, 'Not started': 0 };
    var areas = {}, latest = 0;
    items.forEach(function (p) {
      if (counts[p.status] !== undefined) counts[p.status]++;
      if (p.category) areas[p.category] = true;
      var t = Date.parse(p.updatedAt || p.createdAt || '');
      if (t && t > latest) latest = t;
    });
    var total = items.length;
    $('sgTotal').textContent = total.toLocaleString();
    $('sgKept').textContent = counts.Kept;
    $('sgProgress').textContent = counts['In progress'];
    $('sgNotStarted').textContent = counts['Not started'];
    $('sgRate').textContent = total ? Math.round(counts.Kept / total * 100) + '%' : '0%';
    $('sgAreas').textContent = Object.keys(areas).length;
    $('sgUpdated').textContent = latest ? new Date(latest).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet';
    var bar = $('sgBar');
    bar.innerHTML = [['Kept', 'completed'], ['In progress', 'ongoing'], ['Not started', 'planned']].map(function (s) {
      return '<span class="glance-seg glance-seg--' + s[1] + '" data-w="' + (total ? (counts[s[0]] / total * 100) : 0) + '"></span>';
    }).join('');
    bar.setAttribute('aria-label', counts.Kept + ' kept, ' + counts['In progress'] + ' in progress, ' + counts['Not started'] + ' not started');
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(bar.children, function (seg) { seg.style.width = seg.getAttribute('data-w') + '%'; });
    });
    if (!total) {
      note.hidden = false;
      note.textContent = 'No pledges have been published yet. Check back soon.';
    } else if (!counts.Kept && !counts['In progress']) {
      note.hidden = false;
      note.textContent = 'Every pledge is still ahead of us. Each one is marked only when the work has been verified on site.';
    } else {
      note.hidden = true;
    }
  }

  function setState(message, icon) {
    if (!stateEl) return;
    if (!message) { stateEl.hidden = true; return; }
    stateEl.hidden = false;
    stateEl.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + U.escapeHtml(message);
  }

  // ----- Rendering -----

  function metaHtml(p) {
    var bits = [];
    var made = U.formatMonthYear(p.dateMade);
    var target = U.formatMonthYear(p.targetDate);
    if (made) bits.push('Made ' + U.escapeHtml(made));
    if (target) bits.push('Target ' + U.escapeHtml(target));
    if (p.linkedProject) {
      bits.push('<a class="sg-link" href="tracker.html?project=' + encodeURIComponent(p.linkedProject.id) + '"><i class="fa-solid fa-link"></i> ' + U.escapeHtml(p.linkedProject.title) + '</a>');
    }
    return bits.length ? '<p class="sg-meta">' + bits.join('<span aria-hidden="true"> &middot; </span>') + '</p>' : '';
  }

  // One pledge as a scorecard row: number, the pledge, and its status. `showWhere` adds the area above the title (used
  // when the list is not already grouped by area).
  function renderRow(p, n, showWhere) {
    var s = slug(p.status);
    return (
      '<li class="sg-row sg-row--' + s + '" data-id="' + U.escapeHtml(String(p.id)) + '">' +
        '<span class="sg-num" aria-hidden="true">' + two(n) + '</span>' +
        '<div class="sg-main">' +
          (showWhere ? '<span class="sg-where">' + U.escapeHtml(p.category) + '</span>' : '') +
          '<h4><a class="sg-open" href="' + pledgeHref(p.id) + '">' + U.escapeHtml(p.title) + '</a></h4>' +
          (p.description ? '<p class="sg-desc">' + U.escapeHtml(p.description) + '</p>' : '') +
          metaHtml(p) +
        '</div>' +
        '<span class="sg-status sg-status--' + s + '"><i class="fa-solid fa-circle" aria-hidden="true"></i> ' + U.escapeHtml(p.status) + '</span>' +
      '</li>'
    );
  }

  function groupBar(items) {
    var total = items.length;
    return ['Kept', 'In progress', 'Not started'].map(function (st) {
      var n = items.filter(function (p) { return p.status === st; }).length;
      return n ? '<span class="sg-seg sg-seg--' + slug(st) + '" style="width:' + (n / total * 100) + '%"></span>' : '';
    }).join('');
  }

  function groupSummary(items) {
    var kept = items.filter(function (p) { return p.status === 'Kept'; }).length;
    var prog = items.filter(function (p) { return p.status === 'In progress'; }).length;
    var parts = [plural(items.length, 'pledge')];
    if (kept) parts.push(kept + ' kept');
    if (prog) parts.push(prog + ' in progress');
    return parts.join(' · ');
  }

  function renderGrouped(items) {
    var groups = {}, order = [];
    items.forEach(function (p) {
      if (!groups[p.category]) { groups[p.category] = []; order.push(p.category); }
      groups[p.category].push(p);
    });
    return order.map(function (cat) {
      var g = groups[cat];
      return (
        '<section class="sg-group" aria-labelledby="sg-' + U.escapeHtml(slugify(cat)) + '">' +
          '<header class="sg-head">' +
            '<h3 id="sg-' + U.escapeHtml(slugify(cat)) + '">' + U.escapeHtml(cat) + '</h3>' +
            '<span class="sg-count">' + U.escapeHtml(groupSummary(g)) + '</span>' +
            '<span class="sg-bar" aria-hidden="true">' + groupBar(g) + '</span>' +
          '</header>' +
          '<ol class="sg-rows">' + g.map(function (p, i) { return renderRow(p, i + 1, false); }).join('') + '</ol>' +
        '</section>'
      );
    }).join('');
  }

  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  function renderFlat(items) {
    return '<ol class="sg-rows sg-rows--flat">' + items.map(function (p, i) { return renderRow(p, i + 1, true); }).join('') + '</ol>';
  }

  // ----- Filtering and sorting -----

  function hasFilters() { return !!(state.q || state.category.length || state.status.length); }

  // `skip` leaves one group out, so chip counts show what picking that chip WOULD give with the other filters on.
  function matches(p, skip) {
    if (skip !== 'category' && state.category.length && state.category.indexOf(p.category) < 0) return false;
    if (skip !== 'status' && state.status.length && state.status.indexOf(p.status) < 0) return false;
    if (state.q) {
      var hay = [p.title, p.description, p.category, p.status, p.evidenceNote, p.linkedProject && p.linkedProject.title].join(' ').toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  function byId(a, b) { return Number(a.id) - Number(b.id); }

  function sorted(items) {
    var out = items.slice();
    var cmp = {
      area: function (a, b) { return String(a.category).localeCompare(String(b.category)) || byId(a, b); },
      status: function (a, b) { return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || String(a.category).localeCompare(String(b.category)) || byId(a, b); },
      target: function (a, b) {
        var x = Date.parse(a.targetDate || '') || Infinity, y = Date.parse(b.targetDate || '') || Infinity;
        return (x === y ? 0 : x < y ? -1 : 1) || byId(a, b);
      },
      title: function (a, b) { return String(a.title).localeCompare(String(b.title)); }
    };
    return out.sort(cmp[state.sort] || cmp.area);
  }

  function updateChips() {
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.tb-chip'), function (chip) {
      var group = chip.getAttribute('data-group'), value = chip.getAttribute('data-value');
      var on = state[group].indexOf(value) >= 0;
      var n = allItems.filter(function (p) { return matches(p, group) && p[group === 'status' ? 'status' : 'category'] === value; }).length;
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      chip.classList.toggle('is-empty', n === 0 && !on);
      chip.querySelector('.tb-n').textContent = n;
    });
  }

  function buildQs() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    ['category', 'status'].forEach(function (g) { if (state[g].length) params.set(g, state[g].join(',')); });
    if (state.sort !== 'area') params.set('sort', state.sort);
    if (state.pledge) params.set('pledge', state.pledge);
    var qs = params.toString();
    return window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  }

  function syncUrl() {
    try { history.replaceState(history.state, '', buildQs()); } catch (e) { /* ignore */ }
  }

  function pledgeHref(id) { return window.location.pathname + '?pledge=' + encodeURIComponent(id); }

  function render() {
    var filtered = sorted(allItems.filter(function (p) { return matches(p); }));
    var total = allItems.length;
    countEl.textContent = hasFilters()
      ? 'Showing ' + filtered.length + ' of ' + plural(total, 'pledge')
      : plural(total, 'pledge');
    clearBtn.hidden = !hasFilters();
    updateChips();
    syncUrl();

    if (!filtered.length) {
      list.innerHTML = '';
      stateEl.hidden = false;
      stateEl.innerHTML = '<i class="fa-solid fa-inbox"></i>No pledges match these filters. <button type="button" class="tb-inline-clear">Clear filters</button>';
      return;
    }
    setState(null);
    list.innerHTML = state.sort === 'area' ? renderGrouped(filtered) : renderFlat(filtered);
  }

  function clearAll() {
    state.q = ''; state.category = []; state.status = [];
    searchEl.value = '';
    render();
  }

  function chip(group, value) {
    return '<button type="button" class="tb-chip" data-group="' + group + '" data-value="' + U.escapeHtml(value) + '" aria-pressed="false">' +
      U.escapeHtml(value) + ' <span class="tb-n">0</span></button>';
  }

  function buildChips() {
    var categories = U.uniqueSorted(allItems.map(function (p) { return p.category; }));
    var groups = [['status', 'Status', STATUSES], ['category', 'Area', categories]];
    filtersEl.innerHTML = groups.map(function (g) {
      return '<div class="tb-group"><span class="tb-label" id="pbl-' + g[0] + '">' + g[1] + '</span>' +
        '<div class="tb-chips" role="group" aria-labelledby="pbl-' + g[0] + '">' + g[2].map(function (v) { return chip(g[0], v); }).join('') + '</div></div>';
    }).join('');
  }

  // Filters in the address (shared links, and the Vision page's priorities). Comma separated values; only values that
  // exist are applied.
  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    var valid = {};
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.tb-chip'), function (c) {
      (valid[c.getAttribute('data-group')] = valid[c.getAttribute('data-group')] || []).push(c.getAttribute('data-value'));
    });
    ['category', 'status'].forEach(function (g) {
      var raw = params.get(g);
      if (!raw) return;
      state[g] = raw.split(',').filter(function (v) { return (valid[g] || []).indexOf(v) >= 0; });
    });
    var q = params.get('q');
    if (q) { state.q = q.trim().toLowerCase(); searchEl.value = q.trim(); }
    var s = params.get('sort');
    if (s && SORTS.indexOf(s) >= 0) { state.sort = s; sortEl.value = s; }
    state.pledge = findPledge(params.get('pledge')) ? String(params.get('pledge')) : null;
  }

  function bind() {
    filtersEl.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.tb-chip') : null;
      if (!c) return;
      var g = c.getAttribute('data-group'), v = c.getAttribute('data-value');
      var i = state[g].indexOf(v);
      if (i >= 0) { state[g].splice(i, 1); } else { state[g].push(v); }
      render();
    });
    var timer = null;
    searchEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = searchEl.value.trim().toLowerCase(); render(); }, 120);
    });
    sortEl.addEventListener('change', function () { state.sort = sortEl.value; render(); });
    clearBtn.addEventListener('click', clearAll);
    stateEl.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('tb-inline-clear')) clearAll();
    });
    // A click anywhere on a pledge row opens it (the title link also does, for keyboards). The Tracker link inside a
    // row is left alone.
    list.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.sg-link')) return;
      var row = e.target.closest ? e.target.closest('.sg-row') : null;
      if (!row) return;
      e.preventDefault();
      openPanel(row.getAttribute('data-id'), { opener: row.querySelector('.sg-open') });
    });
  }

  // ----- Pledge detail drawer -----
  // Opens from a pledge row or a shared link (?pledge=ID). Shows the pledge with a status track, its evidence and the
  // Tracker project it is linked to (or what the Tracker holds in the same area), steps through the currently
  // filtered pledges, copies a link, and closes with the back button, Escape or a click outside.

  var pdPanel = document.getElementById('pdPanel');
  var pdOverlay = document.getElementById('pdOverlay');
  var pdBody = document.getElementById('pdBody');
  var pdPrev = document.getElementById('pdPrev');
  var pdNext = document.getElementById('pdNext');
  var pdCopy = document.getElementById('pdCopy');
  var pdClose = document.getElementById('pdClose');
  var pdOpen = false, pdHideTimer = null, pdCopyTimer = null, pdOpenerId = null, pdOpenerEl = null, projectsP = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function findPledge(id) {
    if (id === null || id === undefined || id === '') return null;
    for (var i = 0; i < allItems.length; i++) { if (String(allItems[i].id) === String(id)) return allItems[i]; }
    return null;
  }

  function loadProjects() {
    if (!projectsP) {
      projectsP = window.ApiClient.get('/tracker', { limit: 200 })
        .then(function (d) { return window.ApiClient.realOnly(d.items || []); })
        .catch(function (err) { projectsP = null; throw err; });
    }
    return projectsP;
  }

  function trackHtml(p) {
    var now = STATUS_ORDER[p.status] === undefined ? 2 : STATUS_ORDER[p.status];
    // STATUS_ORDER is Kept 0, In progress 1, Not started 2; the track reads left to right as Not started, In progress, Kept.
    var steps = [['Not started', 2], ['In progress', 1], ['Kept', 0]];
    return '<ol class="pr-track pr-track--' + slug(p.status) + '" aria-label="Status: ' + U.escapeHtml(p.status) + '">' + steps.map(function (s) {
      var done = s[1] >= now;
      return '<li class="' + (done ? 'is-done' : '') + (s[1] === now ? ' is-now' : '') + '">' + s[0] + '</li>';
    }).join('') + '</ol>';
  }

  function projectSectionHtml(p, projects) {
    if (p.linkedProject) {
      return '<h3>Linked project</h3>' +
        '<a class="pr-proj" href="tracker.html?project=' + encodeURIComponent(p.linkedProject.id) + '"><div><b>' + U.escapeHtml(p.linkedProject.title) + '</b>' +
        '<span>' + U.escapeHtml(p.linkedProject.ward || '') + '</span></div><i class="fa-solid fa-arrow-right"></i></a>';
    }
    var n = projects ? projects.filter(function (x) { return x.category === p.category; }).length : 0;
    var intro = '<h3>Linked project</h3><p class="pd-note">No project is linked to this pledge yet. When work starts, it appears on the tracker and is linked here.</p>';
    if (!projects) return intro;
    if (!n) return intro + '<p class="pd-note">The tracker has no ' + U.escapeHtml(p.category) + ' projects yet.</p>';
    return intro + '<a class="pd-link" href="tracker.html?category=' + encodeURIComponent(p.category) + '">See the ' + plural(n, U.escapeHtml(p.category) + ' project') + ' on the tracker <i class="fa-solid fa-arrow-right"></i></a>';
  }

  function fillPanel(p) {
    var s = slug(p.status);
    var made = U.formatMonthYear(p.dateMade);
    var target = U.formatMonthYear(p.targetDate);
    var updated = U.relativeTime(p.updatedAt);
    var facts = [
      ['Area', p.category],
      ['Status', p.status],
      ['Made', made || 'Not recorded'],
      ['Target', target || 'No target set']
    ];
    var statusClass = s === 'kept' ? 'completed' : (s === 'progress' ? 'ongoing' : 'planned');
    pdBody.innerHTML =
      '<div class="pd-media pd-media--' + statusClass + '" style="border-bottom-width:6px"></div>' +
      '<div class="pd-main">' +
        '<span class="pd-status pd-status--' + statusClass + '"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span>' +
        '<p class="pd-where">' + U.escapeHtml(p.category) + '</p>' +
        '<h2 id="pdTitle">' + U.escapeHtml(p.title) + '</h2>' +
        trackHtml(p) +
        (p.description ? '<p class="pd-summary">' + U.escapeHtml(p.description) + '</p>' : '') +
        '<dl class="pd-facts pd-facts--compact">' + facts.map(function (f) {
          return '<div><dt>' + f[0] + '</dt><dd>' + U.escapeHtml(f[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        '<section class="pd-pledges"><h3>Evidence</h3><p class="pd-note" style="margin:0;">' +
          (p.evidenceNote ? U.escapeHtml(p.evidenceNote) : 'No evidence has been attached yet. It is added when the work is checked on site.') + '</p>' +
          (updated ? '<p class="pd-note" style="margin:10px 0 0;font-size:13px;">Record updated ' + U.escapeHtml(updated) + '.</p>' : '') +
        '</section>' +
        '<section class="pd-pledges" id="pdProject">' + projectSectionHtml(p, null) + '</section>' +
        '<div class="pd-more"><button type="button" class="pd-ward" data-category="' + U.escapeHtml(p.category) + '">All ' + U.escapeHtml(p.category) + ' pledges <i class="fa-solid fa-arrow-right"></i></button></div>' +
      '</div>';
    pdBody.scrollTop = 0;
    if (!p.linkedProject) {
      loadProjects().then(function (projects) {
        var slot = document.getElementById('pdProject');
        if (slot && state.pledge === String(p.id)) slot.innerHTML = projectSectionHtml(p, projects);
      }).catch(function () { /* keep the plain text */ });
    }
  }

  function currentIds() {
    return sorted(allItems.filter(function (p) { return matches(p); })).map(function (p) { return String(p.id); });
  }

  function updateStepButtons() {
    var ids = currentIds();
    var here = ids.indexOf(String(state.pledge)) >= 0 && ids.length > 1;
    pdPrev.disabled = pdNext.disabled = !here;
  }

  function openPanel(id, opts) {
    opts = opts || {};
    var p = findPledge(id);
    if (!p) return;
    clearTimeout(pdHideTimer);
    var wasOpen = pdOpen;
    state.pledge = String(p.id);
    pdOpenerId = opts.opener ? p.id : (wasOpen ? pdOpenerId : p.id);
    if (!wasOpen) pdOpenerEl = opts.opener || null;
    fillPanel(p);
    updateStepButtons();
    if (!opts.fromUrl) {
      try {
        if (wasOpen) { syncUrl(); } else { history.pushState({ ejfPanel: 1 }, '', buildQs()); }
      } catch (e) { /* ignore */ }
    }
    if (wasOpen) return;
    pdOpen = true;
    var gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = gap > 0 ? gap + 'px' : '';
    document.body.style.overflow = 'hidden';
    if (window.ejfScrollLock) window.ejfScrollLock(true);
    pdPanel.hidden = false;
    pdOverlay.hidden = false;
    void pdPanel.offsetWidth;
    pdPanel.classList.add('is-open');
    pdOverlay.classList.add('is-open');
    pdPanel.focus({ preventScroll: true });
  }

  function hidePanel() {
    if (!pdOpen) return;
    pdOpen = false;
    state.pledge = null;
    pdPanel.classList.remove('is-open');
    pdOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (window.ejfScrollLock) window.ejfScrollLock(false);
    function done() { pdPanel.hidden = true; pdOverlay.hidden = true; }
    if (reduceMotion) { done(); } else { pdHideTimer = setTimeout(done, 280); }
    var back = pdOpenerEl && document.contains(pdOpenerEl) ? pdOpenerEl : (pdOpenerId !== null ? list.querySelector('[data-id="' + pdOpenerId + '"] .sg-open') : null);
    if (back) back.focus({ preventScroll: true });
  }

  function closePanel() {
    if (history.state && history.state.ejfPanel) { history.back(); return; }
    hidePanel();
    syncUrl();
  }

  function step(dir) {
    var ids = currentIds();
    var i = ids.indexOf(String(state.pledge));
    if (i < 0 || ids.length < 2) return;
    openPanel(ids[(i + dir + ids.length) % ids.length]);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { resolve(); } else { reject(new Error('copy')); }
    });
  }

  function flashCopy(text, icon) {
    pdCopy.querySelector('span').textContent = text;
    pdCopy.querySelector('i').className = 'fa-solid ' + icon;
    clearTimeout(pdCopyTimer);
    pdCopyTimer = setTimeout(function () {
      pdCopy.querySelector('span').textContent = 'Copy link';
      pdCopy.querySelector('i').className = 'fa-solid fa-link';
    }, 2200);
  }

  function bindPanel() {
    if (!pdPanel) return;
    pdClose.addEventListener('click', closePanel);
    pdOverlay.addEventListener('click', closePanel);
    pdPrev.addEventListener('click', function () { step(-1); });
    pdNext.addEventListener('click', function () { step(1); });
    pdCopy.addEventListener('click', function () {
      var url = new URL(pledgeHref(state.pledge), window.location.href).href;
      copyText(url).then(function () { flashCopy('Link copied', 'fa-check'); }, function () { flashCopy('Press Ctrl+C to copy', 'fa-link'); window.prompt('Copy this link', url); });
    });
    pdBody.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.pd-ward') : null;
      if (!b) return;
      state.category = [b.getAttribute('data-category')];
      state.status = []; state.q = ''; searchEl.value = '';
      closePanel();
      render();
    });
    document.addEventListener('keydown', function (e) {
      if (!pdOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(pdPanel.querySelectorAll('a[href],button:not([disabled])'), function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === pdPanel)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('popstate', function () {
      var p = findPledge(new URLSearchParams(window.location.search).get('pledge'));
      if (p) { openPanel(p.id, { fromUrl: true }); } else { hidePanel(); syncUrl(); }
    });
  }

  function load() {
    list.innerHTML = U.skeletonProjCards(3, false);
    setState(null);
    window.ApiClient.get('/promises', { limit: 100 })
      .then(function (data) {
        allItems = window.ApiClient.realOnly(data.items || []);
        renderGlance(allItems, false);
        if (!allItems.length) {
          list.innerHTML = '';
          countEl.textContent = '0 pledges';
          setState('No pledges have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        buildChips();
        readUrl();
        render();
        if (state.pledge) openPanel(state.pledge, { fromUrl: true });
      })
      .catch(function (err) {
        console.error('Failed to load promises:', err);
        renderGlance([], true);
        list.innerHTML = '';
        countEl.textContent = 'Pledges unavailable';
        setState('Could not load the pledges right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  bind();
  bindPanel();
  document.addEventListener('DOMContentLoaded', load);
})();
