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

  var U = window.FoundationUtils;
  var WARDS = ['Imara Daima', 'Kwa Njenga', 'Kwa Reuben', 'Pipeline', 'Kware'];
  var STATUSES = ['Planned', 'Ongoing', 'Completed'];
  var SORTS = ['updated', 'progress', 'budget', 'title'];
  var VIEWS = ['cards', 'list'];
  var VIEW_KEY = 'ejf.tracker.view';
  var allItems = [];
  var state = { q: '', ward: [], category: [], status: [], sort: 'updated', view: 'cards' };

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
          '<h3>' + U.escapeHtml(p.title) + '</h3>' +
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
        '<th scope="row" class="pl-main"><span class="pl-title">' + U.escapeHtml(p.title) + '</span>' +
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

  function syncUrl() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    ['ward', 'category', 'status'].forEach(function (g) { if (state[g].length) params.set(g, state[g].join(',')); });
    if (state.sort !== 'updated') params.set('sort', state.sort);
    if (state.view !== 'cards') params.set('view', state.view);
    var qs = params.toString();
    try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash); } catch (e) { /* ignore */ }
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
    Array.prototype.forEach.call(document.querySelectorAll('.tb-view-btn'), function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        try { localStorage.setItem(VIEW_KEY, state.view); } catch (e) { /* ignore */ }
        render();
      });
    });
    stateEl.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('tb-inline-clear')) clearAll();
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
        readUrl();
        render();
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
  document.addEventListener('DOMContentLoaded', load);
})();
