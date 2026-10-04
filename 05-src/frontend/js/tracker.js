// Renders the Development Tracker from the live API: the hero "at a glance" panel, the filter toolbar (search,
// status / ward / category chips with live counts, sort, result count, clear) and the project grid. Filters can be
// shared as links, e.g. tracker.html?ward=Kware,Pipeline&status=Ongoing&q=water. Requires api.js
// (window.ApiClient, window.FoundationUtils) to be loaded first.
(function () {
  var grid = document.getElementById('trackerGrid');
  if (!grid) return; // not on this page

  var stateEl = document.getElementById('trackerState');
  var filtersEl = document.getElementById('trackerFilters');
  var searchEl = document.getElementById('tbSearch');
  var sortEl = document.getElementById('tbSort');
  var countEl = document.getElementById('tbCount');
  var clearBtn = document.getElementById('tbClear');
  var wardView = document.getElementById('wardView');
  var wardListEl = document.getElementById('wardList');
  var mapEl = document.getElementById('trackerMap');

  var U = window.FoundationUtils;
  var WARDS = ['Imara Daima', 'Kwa Njenga', 'Kwa Reuben', 'Pipeline', 'Kware'];
  var STATUSES = ['Planned', 'Ongoing', 'Completed'];
  var SORTS = ['updated', 'progress', 'budget', 'title'];
  var VIEWS = ['cards', 'list', 'ward'];
  var VIEW_KEY = 'ejf.tracker.view';
  var allItems = [];
  var state = { q: '', ward: [], category: [], status: [], sort: 'updated', view: 'cards', project: null };

  function badgeClass(status) {
    if (status === 'Completed') return 'badge-complete';
    if (status === 'Ongoing') return 'badge-ongoing';
    return 'badge-planned';
  }

  function sourceClass(source) {
    if (!source) return 'source-adv';
    if (source.indexOf('Foundation') === 0) return 'source-fnd';
    if (source.indexOf('Government') === 0) return 'source-gov';
    if (source.indexOf('Partner') === 0) return 'source-partner';
    return 'source-adv';
  }

  function pct(p) { return Math.max(0, Math.min(100, Number(p.progressPercent) || 0)); }
  function startedText(p) { return U.formatMonthYear(p.startedOn) || (p.status === 'Planned' ? 'Not yet started' : 'Not recorded'); }
  function fundingChip(p) {
    return p.fundingSource ? '<span class="source-chip ' + sourceClass(p.fundingSource) + '">' + U.escapeHtml(p.fundingSource) + '</span>' : '';
  }

  // Cards view: a status coloured top edge, photo with the status on it, then place, title, summary, a progress
  // line, budget and start, and the funding source with when it was last updated.
  function renderCard(p) {
    var photo = p.photoUrl
      ? '<img class="proj-photo" src="' + U.escapeHtml(p.photoUrl) + '" alt="' + U.escapeHtml(p.title) + '" loading="lazy">'
      : '<i class="fa-solid fa-image"></i><span>Photo coming soon</span>';
    var updated = U.relativeTime(p.updatedAt);
    return (
      '<article class="pc pc--' + U.escapeHtml(String(p.status).toLowerCase()) + '" data-id="' + U.escapeHtml(String(p.id)) + '">' +
        '<div class="pc-media"><div class="ph">' + photo + '</div>' +
          '<span class="pc-status"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span></div>' +
        '<div class="pc-body">' +
          '<span class="pc-where">' + U.escapeHtml(p.ward) + ' &middot; ' + U.escapeHtml(p.category) + '</span>' +
          '<h3><a class="pc-open" href="' + projectHref(p.id) + '">' + U.escapeHtml(p.title) + '</a></h3>' +
          (p.summary ? '<p class="pc-summary">' + U.escapeHtml(p.summary) + '</p>' : '') +
          '<div class="pc-progress"><div class="pc-progress-head"><span>Progress</span><b>' + pct(p) + '%</b></div>' +
            '<div class="progress-track"><div class="progress-fill" data-progress="' + pct(p) + '"></div></div></div>' +
          '<dl class="pc-facts">' +
            '<div><dt>Budget</dt><dd>' + U.escapeHtml(U.formatKes(p.budgetKes) || 'Not published') + '</dd></div>' +
            '<div><dt>Started</dt><dd>' + U.escapeHtml(startedText(p)) + '</dd></div>' +
          '</dl>' +
          '<div class="pc-foot">' + fundingChip(p) + (updated ? '<span class="pc-updated">Updated ' + U.escapeHtml(updated) + '</span>' : '') + '</div>' +
        '</div>' +
      '</article>'
    );
  }

  // List view: one compact row per project (stacks into labelled blocks on phones).
  function renderRow(p) {
    var updated = U.relativeTime(p.updatedAt);
    return (
      '<tr class="pl-row pl-row--' + U.escapeHtml(String(p.status).toLowerCase()) + '" data-id="' + U.escapeHtml(String(p.id)) + '">' +
        '<th scope="row" class="pl-main"><a class="pl-title pc-open" href="' + projectHref(p.id) + '">' + U.escapeHtml(p.title) + '</a>' +
          '<span class="pl-sub">' + U.escapeHtml(p.ward) + ' &middot; ' + U.escapeHtml(p.category) + '</span></th>' +
        '<td data-label="Status"><span class="badge ' + badgeClass(p.status) + '"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span></td>' +
        '<td data-label="Progress"><div class="pl-prog"><div class="progress-track"><div class="progress-fill" data-progress="' + pct(p) + '"></div></div><b>' + pct(p) + '%</b></div></td>' +
        '<td data-label="Budget">' + U.escapeHtml(U.formatKes(p.budgetKes) || 'Not published') + '</td>' +
        '<td data-label="Funding">' + (fundingChip(p) || 'Not stated') + '</td>' +
        '<td data-label="Updated">' + U.escapeHtml(updated || 'Not yet') + '</td>' +
      '</tr>'
    );
  }

  function renderList(list) {
    return '<table class="pl"><thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Progress</th>' +
      '<th scope="col">Budget</th><th scope="col">Funding</th><th scope="col">Updated</th></tr></thead><tbody>' +
      list.map(renderRow).join('') + '</tbody></table>';
  }

  // Hero "at a glance" panel: totals across ALL projects (not just the filtered ones).
  function renderGlance(items, failed) {
    var panel = document.getElementById('glance');
    if (!panel) return;
    var $ = function (id) { return document.getElementById(id); };
    var note = $('glanceNote');
    panel.classList.remove('is-loading');
    if (failed) {
      ['glanceProjects', 'glanceCompleted', 'glanceOngoing', 'glancePlanned', 'glanceBudget', 'glanceWards', 'glanceUpdated'].forEach(function (id) { $(id).textContent = '0'; });
      $('glanceBudget').textContent = 'None yet';
      $('glanceUpdated').textContent = 'Not available';
      note.hidden = false;
      note.textContent = 'The live figures could not be loaded right now.';
      return;
    }
    var counts = { Completed: 0, Ongoing: 0, Planned: 0 };
    var wards = {}, budget = 0, hasBudget = false, latest = 0;
    items.forEach(function (p) {
      if (counts[p.status] !== undefined) counts[p.status]++;
      if (p.ward) wards[p.ward] = true;
      if (p.budgetKes !== null && p.budgetKes !== undefined) { budget += Number(p.budgetKes) || 0; hasBudget = true; }
      var t = Date.parse(p.updatedAt || p.createdAt || '');
      if (t && t > latest) latest = t;
    });
    var total = items.length;
    $('glanceProjects').textContent = total.toLocaleString();
    $('glanceCompleted').textContent = counts.Completed;
    $('glanceOngoing').textContent = counts.Ongoing;
    $('glancePlanned').textContent = counts.Planned;
    $('glanceBudget').textContent = hasBudget ? U.formatKes(budget) : 'None yet';
    $('glanceWards').textContent = Object.keys(wards).length;
    $('glanceUpdated').textContent = latest ? new Date(latest).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet';
    $('glanceSample').hidden = !items.some(window.ApiClient.isPlaceholder);
    var bar = $('glanceBar');
    bar.innerHTML = ['Completed', 'Ongoing', 'Planned'].map(function (s) {
      return '<span class="glance-seg glance-seg--' + s.toLowerCase() + '" data-w="' + (total ? (counts[s] / total * 100) : 0) + '"></span>';
    }).join('');
    bar.setAttribute('aria-label', counts.Completed + ' completed, ' + counts.Ongoing + ' ongoing, ' + counts.Planned + ' planned');
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(bar.children, function (seg) { seg.style.width = seg.getAttribute('data-w') + '%'; });
    });
    note.hidden = total > 0;
    if (!total) note.textContent = 'No projects have been published yet. Check back soon.';
  }

  // Legend: live counts beside each status and funding source, and a "Show" button that filters the list above to it.
  function renderLegend() {
    var legend = document.getElementById('legend');
    if (!legend) return;
    Array.prototype.forEach.call(legend.querySelectorAll('.lg-show'), function (btn) {
      var status = btn.getAttribute('data-status'), funding = btn.getAttribute('data-funding');
      var n = allItems.filter(function (p) { return status ? p.status === status : p.fundingSource === funding; }).length;
      btn.querySelector('.lg-label').textContent = n ? 'Show ' + n + ' project' + (n === 1 ? '' : 's') : 'None yet';
      btn.disabled = !n;
    });
    Array.prototype.forEach.call(legend.querySelectorAll('.lg-big'), function (big) {
      var s = big.getAttribute('data-count-status');
      big.textContent = allItems.filter(function (p) { return p.status === s; }).length;
    });
  }

  // Funding explorer: one source is shown at a time (tabs, with arrow key navigation).
  function selectFund(tab) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.lg-tab'));
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    tab.focus({ preventScroll: true });
  }

  function showFromLegend(btn) {
    var status = btn.getAttribute('data-status'), funding = btn.getAttribute('data-funding');
    state.ward = []; state.category = []; state.status = [];
    state.q = funding ? funding.toLowerCase() : '';
    searchEl.value = funding || '';
    if (status) state.status = [status];
    render();
    var target = document.getElementById('projects');
    if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function setState(message, icon) {
    if (!stateEl) return;
    if (!message) { stateEl.hidden = true; return; }
    stateEl.hidden = false;
    stateEl.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + U.escapeHtml(message);
  }

  // ----- Filtering -----

  function hasFilters() {
    return !!(state.q || state.ward.length || state.category.length || state.status.length);
  }

  // `skip` leaves one group out, so chip counts show what picking that chip WOULD give with the other filters on.
  function matches(p, skip) {
    if (skip !== 'ward' && state.ward.length && state.ward.indexOf(p.ward) < 0) return false;
    if (skip !== 'category' && state.category.length && state.category.indexOf(p.category) < 0) return false;
    if (skip !== 'status' && state.status.length && state.status.indexOf(p.status) < 0) return false;
    if (state.q) {
      var hay = [p.title, p.summary, p.ward, p.category, p.location, p.fundingSource, p.status].join(' ').toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  function sorted(list) {
    var by = {
      updated: function (a, b) { return (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0); },
      progress: function (a, b) { return (Number(b.progressPercent) || 0) - (Number(a.progressPercent) || 0); },
      budget: function (a, b) {
        var x = a.budgetKes === null || a.budgetKes === undefined ? -1 : Number(a.budgetKes);
        var y = b.budgetKes === null || b.budgetKes === undefined ? -1 : Number(b.budgetKes);
        return y - x;
      },
      title: function (a, b) { return String(a.title).localeCompare(String(b.title)); }
    };
    return list.slice().sort(by[state.sort] || by.updated);
  }

  function updateChips() {
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.tb-chip'), function (chip) {
      var group = chip.getAttribute('data-group'), value = chip.getAttribute('data-value');
      var on = state[group].indexOf(value) >= 0;
      var n = allItems.filter(function (p) { return matches(p, group) && p[group] === value; }).length;
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      chip.classList.toggle('is-empty', n === 0 && !on);
      chip.querySelector('.tb-n').textContent = n;
    });
  }

  function buildQs() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    ['ward', 'category', 'status'].forEach(function (g) { if (state[g].length) params.set(g, state[g].join(',')); });
    if (state.sort !== 'updated') params.set('sort', state.sort);
    if (state.view !== 'cards') params.set('view', state.view);
    if (state.project) params.set('project', state.project);
    var qs = params.toString();
    return window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  }

  function syncUrl() {
    try { history.replaceState(history.state, '', buildQs()); } catch (e) { /* ignore */ }
  }

  function projectHref(id) { return window.location.pathname + '?project=' + encodeURIComponent(id); }

  // Per-ward numbers for the By ward view, counted over projects that match every filter EXCEPT the ward one, so
  // the map and list stay meaningful while wards are selected.
  function wardStats() {
    var stats = {};
    var list = WARDS.slice();
    allItems.forEach(function (p) { if (p.ward && list.indexOf(p.ward) < 0) list.push(p.ward); });
    list.forEach(function (w) { stats[w] = { n: 0, Completed: 0, Ongoing: 0, Planned: 0, budget: 0, hasBudget: false }; });
    allItems.forEach(function (p) {
      if (!matches(p, 'ward') || !stats[p.ward]) return;
      var s = stats[p.ward];
      s.n++;
      if (s[p.status] !== undefined) s[p.status]++;
      if (p.budgetKes !== null && p.budgetKes !== undefined) { s.budget += Number(p.budgetKes) || 0; s.hasBudget = true; }
    });
    return { list: list, stats: stats };
  }

  function renderWardList(ws) {
    wardListEl.innerHTML = ws.list.map(function (w) {
      var s = ws.stats[w];
      var on = state.ward.indexOf(w) >= 0;
      var bar = ['Completed', 'Ongoing', 'Planned'].map(function (k) {
        return s.n && s[k] ? '<span class="wv-seg wv-seg--' + k.toLowerCase() + '" style="width:' + (s[k] / s.n * 100) + '%"></span>' : '';
      }).join('');
      return '<li><button type="button" class="wv-row' + (s.n ? '' : ' is-empty') + '" data-ward="' + U.escapeHtml(w) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="wv-name">' + U.escapeHtml(w) + '</span>' +
        '<span class="wv-count"><b>' + s.n + '</b> project' + (s.n === 1 ? '' : 's') + '</span>' +
        '<span class="wv-bar" aria-hidden="true">' + bar + '</span>' +
        '<span class="wv-budget">' + (s.hasBudget ? U.escapeHtml(U.formatKes(s.budget)) + ' budget' : 'No budget published') + '</span>' +
        '</button></li>';
    }).join('');
  }

  function toggleWard(w) {
    var i = state.ward.indexOf(w);
    if (i >= 0) { state.ward.splice(i, 1); } else { state.ward.push(w); }
    render();
  }

  function render() {
    var filtered = sorted(allItems.filter(function (p) { return matches(p); }));
    var total = allItems.length;
    countEl.textContent = hasFilters()
      ? 'Showing ' + filtered.length + ' of ' + total + ' project' + (total === 1 ? '' : 's')
      : total + ' project' + (total === 1 ? '' : 's');
    clearBtn.hidden = !hasFilters();
    updateChips();
    updateViewButtons();
    syncUrl();

    wardView.hidden = state.view !== 'ward';
    if (state.view === 'ward') {
      var ws = wardStats();
      renderWardList(ws);
      var counts = {};
      ws.list.forEach(function (w) { counts[w] = ws.stats[w].n; });
      if (window.TrackerWardMap) window.TrackerWardMap.render(mapEl, { counts: counts, selected: state.ward.slice() }, toggleWard);
    }

    if (!filtered.length) {
      grid.innerHTML = '';
      stateEl.hidden = false;
      stateEl.innerHTML = '<i class="fa-solid fa-inbox"></i>No projects match these filters. <button type="button" class="tb-inline-clear">Clear filters</button>';
      return;
    }
    setState(null);
    grid.className = state.view === 'list' ? 'pl-wrap' : 'grid grid-3 pc-grid';
    grid.innerHTML = state.view === 'list' ? renderList(filtered) : filtered.map(renderCard).join('');
    if (window.animateProgressBars) window.animateProgressBars();
  }

  function updateViewButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.tb-view-btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === state.view ? 'true' : 'false');
    });
  }

  function clearAll() {
    state.q = ''; state.ward = []; state.category = []; state.status = [];
    searchEl.value = '';
    render();
  }

  function chip(group, value) {
    return '<button type="button" class="tb-chip" data-group="' + group + '" data-value="' + U.escapeHtml(value) + '" aria-pressed="false">' +
      U.escapeHtml(value) + ' <span class="tb-n">0</span></button>';
  }

  function buildChips() {
    var wardList = WARDS.slice();
    allItems.forEach(function (p) { if (p.ward && wardList.indexOf(p.ward) < 0) wardList.push(p.ward); });
    var categories = U.uniqueSorted(allItems.map(function (p) { return p.category; }));
    var groups = [
      ['status', 'Status', STATUSES],
      ['ward', 'Ward', wardList],
      ['category', 'Category', categories]
    ];
    filtersEl.innerHTML = groups.map(function (g) {
      return '<div class="tb-group"><span class="tb-label" id="tbl-' + g[0] + '">' + g[1] + '</span>' +
        '<div class="tb-chips" role="group" aria-labelledby="tbl-' + g[0] + '">' + g[2].map(function (v) { return chip(g[0], v); }).join('') + '</div></div>';
    }).join('');
  }

  // Filters in the address (shared links, and the Vision map's ward links). Comma separated values; only values
  // that exist are applied.
  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    var valid = {};
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.tb-chip'), function (c) {
      (valid[c.getAttribute('data-group')] = valid[c.getAttribute('data-group')] || []).push(c.getAttribute('data-value'));
    });
    ['ward', 'category', 'status'].forEach(function (g) {
      var raw = params.get(g);
      if (!raw) return;
      state[g] = raw.split(',').filter(function (v) { return (valid[g] || []).indexOf(v) >= 0; });
    });
    var q = params.get('q');
    if (q) { state.q = q.trim().toLowerCase(); searchEl.value = q.trim(); }
    var v = params.get('view');
    if (v && VIEWS.indexOf(v) >= 0) {
      state.view = v;
    } else {
      try { var saved = localStorage.getItem(VIEW_KEY); if (saved && VIEWS.indexOf(saved) >= 0) state.view = saved; } catch (e) { /* no saved view */ }
    }
    var s = params.get('sort');
    if (s && SORTS.indexOf(s) >= 0) { state.sort = s; sortEl.value = s; }
    state.project = findProject(params.get('project')) ? String(params.get('project')) : null;
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
    wardListEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.wv-row') : null;
      if (b) toggleWard(b.getAttribute('data-ward'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tb-view-btn'), function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        try { localStorage.setItem(VIEW_KEY, state.view); } catch (e) { /* ignore */ }
        render();
      });
    });
    var legend = document.getElementById('legend');
    if (legend) {
      legend.addEventListener('click', function (e) {
        var tab = e.target.closest ? e.target.closest('.lg-tab') : null;
        if (tab) { selectFund(tab); return; }
        var b = e.target.closest ? e.target.closest('.lg-show') : null;
        if (b && !b.disabled) showFromLegend(b);
      });
      legend.addEventListener('keydown', function (e) {
        var tab = e.target.closest ? e.target.closest('.lg-tab') : null;
        if (!tab) return;
        var tabs = Array.prototype.slice.call(legend.querySelectorAll('.lg-tab'));
        var i = tabs.indexOf(tab), dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); selectFund(tabs[0]); }
        else if (e.key === 'End') { e.preventDefault(); selectFund(tabs[tabs.length - 1]); }
        else if (dir) { e.preventDefault(); selectFund(tabs[(i + dir + tabs.length) % tabs.length]); }
      });
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest || t.closest('#pdPanel') || t.closest('.tb-chip')) return;
      var host = t.closest('.pc, .pl-row');
      if (!host || !grid.contains(host)) return;
      e.preventDefault();
      openPanel(host.getAttribute('data-id'), { opener: host.querySelector('.pc-open') });
    });
    stateEl.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('tb-inline-clear')) clearAll();
    });
  }

  // ----- Project detail drawer -----
  // Opens from a card, a list row, or a shared link (?project=ID). Shows the full record, steps through the
  // currently filtered projects, copies a link, and lists the pledges the project relates to. The back button closes it.

  var pdPanel = document.getElementById('pdPanel');
  var pdOverlay = document.getElementById('pdOverlay');
  var pdBody = document.getElementById('pdBody');
  var pdPrev = document.getElementById('pdPrev');
  var pdNext = document.getElementById('pdNext');
  var pdCopy = document.getElementById('pdCopy');
  var pdClose = document.getElementById('pdClose');
  var pdOpen = false, pdHideTimer = null, pdCopyTimer = null, pdOpenerId = null, pdOpenerEl = null, pledgesP = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function findProject(id) {
    if (id === null || id === undefined || id === '') return null;
    for (var i = 0; i < allItems.length; i++) { if (String(allItems[i].id) === String(id)) return allItems[i]; }
    return null;
  }

  function loadPledges() {
    if (!pledgesP) {
      pledgesP = window.ApiClient.get('/promises', { limit: 200 })
        .then(function (d) { return window.ApiClient.realOnly(d.items || []); })
        .catch(function (err) { pledgesP = null; throw err; });
    }
    return pledgesP;
  }

  function pledgeBadge(status) {
    if (status === 'Kept') return 'badge-complete';
    if (status === 'In progress') return 'badge-ongoing';
    return 'badge-planned';
  }

  function pledgeList(items) {
    return '<ul class="pd-pledge-list">' + items.map(function (x) {
      return '<li><span class="badge ' + pledgeBadge(x.status) + '">' + U.escapeHtml(x.status) + '</span>' +
        '<span class="pd-pledge-title">' + U.escapeHtml(x.title) + '</span></li>';
    }).join('') + '</ul>';
  }

  // A linked pledge is the one this project delivers. With none linked, show the pledges made in the same area, so
  // the reader sees what the project contributes to.
  function pledgeSectionHtml(p, items) {
    var linked = items.filter(function (x) { return Number(x.linkedProjectId) === Number(p.id); });
    var scorecard = 'promises.html?category=' + encodeURIComponent(p.category);
    if (linked.length) {
      return '<h3>The pledge this delivers</h3>' + pledgeList(linked) +
        '<a class="pd-link" href="' + scorecard + '">See it on the Promise Scorecard <i class="fa-solid fa-arrow-right"></i></a>';
    }
    var related = items.filter(function (x) { return x.category === p.category; });
    if (!related.length) {
      return '<h3>Related pledges</h3><p class="pd-note">No pledge has been linked to this project yet.</p>' +
        '<a class="pd-link" href="promises.html">Open the Promise Scorecard <i class="fa-solid fa-arrow-right"></i></a>';
    }
    return '<h3>Pledges in ' + U.escapeHtml(p.category) + '</h3>' +
      '<p class="pd-note">No single pledge is tied to this project yet. These are the pledges made in the same area.</p>' +
      pledgeList(related.slice(0, 3)) +
      '<a class="pd-link" href="' + scorecard + '">' + (related.length > 3 ? 'See all ' + related.length + ' in ' + U.escapeHtml(p.category) : 'See them on the Promise Scorecard') +
      ' <i class="fa-solid fa-arrow-right"></i></a>';
  }

  function fillPanel(p) {
    var photo = p.photoUrl
      ? '<img src="' + U.escapeHtml(p.photoUrl) + '" alt="' + U.escapeHtml(p.title) + '">'
      : '<i class="fa-solid fa-image"></i><span>Photo coming soon</span>';
    var updated = U.relativeTime(p.updatedAt);
    var updatedExact = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    var status = String(p.status).toLowerCase();
    var facts = [
      ['Budget', U.formatKes(p.budgetKes) || 'Not published'],
      ['Started', startedText(p)],
      ['Funding', p.fundingSource || 'Not stated'],
      ['Location', p.location || p.ward],
      ['Last updated', updated ? updated + (updatedExact ? ' (' + updatedExact + ')' : '') : 'Not yet']
    ];
    pdBody.innerHTML =
      '<div class="pd-media pd-media--' + U.escapeHtml(status) + '"><div class="ph">' + photo + '</div></div>' +
      '<div class="pd-main">' +
        '<span class="pd-status pd-status--' + U.escapeHtml(status) + '"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span>' +
        '<p class="pd-where">' + U.escapeHtml(p.ward) + ' &middot; ' + U.escapeHtml(p.category) + '</p>' +
        '<h2 id="pdTitle">' + U.escapeHtml(p.title) + '</h2>' +
        (window.ApiClient.isPlaceholder(p) ? '<p class="pd-sample">Sample record, shown while the tracker is being set up.</p>' : '') +
        '<div class="pd-progress"><div class="pc-progress-head"><span>Progress</span><b>' + pct(p) + '%</b></div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:0"></div></div></div>' +
        (p.summary ? '<p class="pd-summary">' + U.escapeHtml(p.summary) + '</p>' : '') +
        '<dl class="pd-facts">' + facts.map(function (f) {
          return '<div><dt>' + f[0] + '</dt><dd>' + U.escapeHtml(f[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        '<section class="pd-pledges" id="pdPledges"><h3>Related pledges</h3><p class="pd-note">Loading</p></section>' +
        '<div class="pd-more"><button type="button" class="pd-ward" data-ward="' + U.escapeHtml(p.ward) + '">All projects in ' + U.escapeHtml(p.ward) + ' <i class="fa-solid fa-arrow-right"></i></button></div>' +
      '</div>';
    var fill = pdBody.querySelector('.progress-fill');
    requestAnimationFrame(function () { fill.style.width = pct(p) + '%'; });
    pdBody.scrollTop = 0;
    loadPledges().then(function (items) {
      var slot = document.getElementById('pdPledges');
      if (slot && state.project === String(p.id)) slot.innerHTML = pledgeSectionHtml(p, items);
    }).catch(function () {
      var slot = document.getElementById('pdPledges');
      if (slot && state.project === String(p.id)) slot.innerHTML = '<h3>Related pledges</h3><p class="pd-note">The related pledges could not be loaded right now.</p>';
    });
  }

  function currentIds() {
    return sorted(allItems.filter(function (p) { return matches(p); })).map(function (p) { return String(p.id); });
  }

  function updateStepButtons() {
    var ids = currentIds();
    var here = ids.indexOf(String(state.project)) >= 0 && ids.length > 1;
    pdPrev.disabled = pdNext.disabled = !here;
  }

  function openPanel(id, opts) {
    opts = opts || {};
    var p = findProject(id);
    if (!p) return;
    clearTimeout(pdHideTimer);
    var wasOpen = pdOpen;
    state.project = String(p.id);
    pdOpenerId = opts.opener ? p.id : (wasOpen ? pdOpenerId : p.id);
    if (!wasOpen) pdOpenerEl = opts.opener && opts.opener.closest && !opts.opener.closest('#projects') ? opts.opener : null;
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
    state.project = null;
    pdPanel.classList.remove('is-open');
    pdOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    function done() { pdPanel.hidden = true; pdOverlay.hidden = true; }
    if (reduceMotion) { done(); } else { pdHideTimer = setTimeout(done, 280); }
    var back = pdOpenerEl && document.contains(pdOpenerEl) ? pdOpenerEl : (pdOpenerId !== null ? grid.querySelector('[data-id="' + pdOpenerId + '"] .pc-open') : null);
    if (back) back.focus({ preventScroll: true });
  }

  function closePanel() {
    if (history.state && history.state.ejfPanel) { history.back(); return; }
    hidePanel();
    syncUrl();
  }

  function step(dir) {
    var ids = currentIds();
    var i = ids.indexOf(String(state.project));
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
    pdClose.addEventListener('click', closePanel);
    pdOverlay.addEventListener('click', closePanel);
    pdPrev.addEventListener('click', function () { step(-1); });
    pdNext.addEventListener('click', function () { step(1); });
    pdCopy.addEventListener('click', function () {
      var url = new URL(projectHref(state.project), window.location.href).href;
      copyText(url).then(function () { flashCopy('Link copied', 'fa-check'); }, function () { flashCopy('Press Ctrl+C to copy', 'fa-link'); window.prompt('Copy this link', url); });
    });
    pdBody.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.pd-ward') : null;
      if (!b) return;
      state.ward = [b.getAttribute('data-ward')];
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
      var p = findProject(new URLSearchParams(window.location.search).get('project'));
      if (p) { openPanel(p.id, { fromUrl: true }); } else { hidePanel(); syncUrl(); }
    });
  }

  function load() {
    grid.innerHTML = U.skeletonProjCards(6);
    setState(null);
    window.ApiClient.get('/tracker', { limit: 200 })
      .then(function (data) {
        allItems = window.ApiClient.realOnly(data.items || []);
        renderGlance(allItems, false);
        if (!allItems.length) {
          grid.innerHTML = '';
          countEl.textContent = '0 projects';
          setState('No projects have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        buildChips();
        renderLegend();
        if (window.TrackerCompare) window.TrackerCompare.render(allItems, function (id, opener) { openPanel(id, { opener: opener }); });
        readUrl();
        render();
        if (state.project) openPanel(state.project, { fromUrl: true });
      })
      .catch(function (err) {
        console.error('Failed to load tracker projects:', err);
        renderGlance([], true);
        grid.innerHTML = '';
        countEl.textContent = 'Projects unavailable';
        setState('Could not load projects right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  bind();
  bindPanel();
  document.addEventListener('DOMContentLoaded', load);
})();
