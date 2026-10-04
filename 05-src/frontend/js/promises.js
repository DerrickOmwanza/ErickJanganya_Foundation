// Renders the Promise Scorecard grid from the live API. Requires api.js
// (window.ApiClient, window.FoundationUtils) to be loaded first.
(function () {
  var grid = document.getElementById('promisesGrid');
  if (!grid) return; // not on this page

  var stateEl = document.getElementById('promisesState');
  var categorySelect = document.getElementById('filterCategory');
  var statusSelect = document.getElementById('filterStatus');

  var U = window.FoundationUtils;
  var allItems = [];

  function badgeClass(status) {
    if (status === 'Kept') return 'badge-complete';
    if (status === 'In progress') return 'badge-ongoing';
    return 'badge-planned';
  }

  function renderCard(p) {
    var made = U.formatMonthYear(p.dateMade);
    var target = U.formatMonthYear(p.targetDate);

    var metaBits = [];
    if (made) metaBits.push('Made ' + made);
    if (target) metaBits.push('Target ' + target);

    var linked = p.linkedProject
      ? '<a class="source-chip source-fnd linked-chip" href="tracker.html"><i class="fa-solid fa-link"></i> Linked: ' + U.escapeHtml(p.linkedProject.title) + '</a>'
      : '';

    return (
      '<div class="card proj-card">' +
        '<div class="proj-body" style="padding-top:20px;">' +
          '<span class="ward">' + U.escapeHtml(p.category) + '</span>' +
          '<h4>' + U.escapeHtml(p.title) + '</h4>' +
          (p.description ? '<p>' + U.escapeHtml(p.description) + '</p>' : '') +
          '<span class="badge ' + badgeClass(p.status) + '"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span>' +
          (metaBits.length ? '<div class="proj-meta"><span>' + metaBits.map(U.escapeHtml).join(' &middot; ') + '</span></div>' : '') +
          (p.evidenceNote ? '<div class="evidence-note"><i class="fa-solid fa-clipboard-check"></i><span>' + U.escapeHtml(p.evidenceNote) + '</span></div>' : '') +
          linked +
        '</div>' +
      '</div>'
    );
  }

  // Hero "scorecard at a glance" panel: totals across ALL pledges (not just the filtered ones).
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

  function applyFiltersAndRender() {
    var category = categorySelect ? categorySelect.value : '';
    var status = statusSelect ? statusSelect.value : '';

    var filtered = allItems.filter(function (p) {
      return (!category || p.category === category) && (!status || p.status === status);
    });

    if (!filtered.length) {
      grid.innerHTML = '';
      setState('No promises match these filters yet.', 'fa-inbox');
      return;
    }
    setState(null);
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  function populateFilters() {
    U.fillSelect(categorySelect, U.uniqueSorted(allItems.map(function (p) { return p.category; })), 'All categories');
  }

  // Lets other pages deep link into a filtered Scorecard, e.g. promises.html?category=Health (used by the Vision
  // page's priorities). Only values that exist in the filter dropdowns are applied.
  function applyUrlFilters() {
    var params = new URLSearchParams(window.location.search);
    [['category', categorySelect], ['status', statusSelect]].forEach(function (pair) {
      var value = params.get(pair[0]);
      var select = pair[1];
      if (!value || !select) return;
      var match = Array.prototype.some.call(select.options, function (o) { return o.value === value; });
      if (match) select.value = value;
    });
  }

  function load() {
    grid.innerHTML = U.skeletonProjCards(6, false);
    setState(null);
    window.ApiClient.get('/promises', { limit: 100 })
      .then(function (data) {
        allItems = window.ApiClient.realOnly(data.items || []);
        renderGlance(allItems, false);
        if (!allItems.length) {
          grid.innerHTML = '';
          setState('No promises have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        populateFilters();
        applyUrlFilters();
        applyFiltersAndRender();
      })
      .catch(function (err) {
        console.error('Failed to load promises:', err);
        renderGlance([], true);
        grid.innerHTML = '';
        setState('Could not load promises right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  [categorySelect, statusSelect].forEach(function (el) {
    if (el) el.addEventListener('change', applyFiltersAndRender);
  });

  document.addEventListener('DOMContentLoaded', load);
})();
