// Renders the Development Tracker grid from the live API. Requires api.js
// (window.ApiClient, window.FoundationUtils) to be loaded first.
(function () {
  var grid = document.getElementById('trackerGrid');
  if (!grid) return; // not on this page

  var stateEl = document.getElementById('trackerState');
  var wardSelect = document.getElementById('filterWard');
  var categorySelect = document.getElementById('filterCategory');
  var statusSelect = document.getElementById('filterStatus');

  var U = window.FoundationUtils;
  var allItems = [];

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

  function renderCard(p) {
    var photo = p.photoUrl
      ? '<img class="proj-photo" src="' + U.escapeHtml(p.photoUrl) + '" alt="' + U.escapeHtml(p.title) + '">'
      : '<i class="fa-solid fa-image"></i><span>Photo coming soon</span>';

    var started = U.formatMonthYear(p.startedOn);
    var budget = U.formatKes(p.budgetKes);
    var metaLeft = started || (p.status === 'Planned' ? 'Not yet started' : '');

    return (
      '<div class="card proj-card">' +
        '<div class="ph">' + photo + '</div>' +
        '<div class="proj-body">' +
          '<span class="ward">' + U.escapeHtml(p.ward) + ' &middot; ' + U.escapeHtml(p.category) + '</span>' +
          '<h4>' + U.escapeHtml(p.title) + '</h4>' +
          (p.summary ? '<p>' + U.escapeHtml(p.summary) + '</p>' : '') +
          '<span class="badge ' + badgeClass(p.status) + '"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span>' +
          '<div class="progress-track"><div class="progress-fill" data-progress="' + (p.progressPercent || 0) + '"></div></div>' +
          '<div class="proj-meta"><span>' + U.escapeHtml(metaLeft) + '</span><span>' + U.escapeHtml(budget) + '</span></div>' +
          (p.fundingSource ? '<span class="source-chip ' + sourceClass(p.fundingSource) + '">' + U.escapeHtml(p.fundingSource) + '</span>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function setState(message, icon) {
    if (!stateEl) return;
    if (!message) { stateEl.hidden = true; return; }
    stateEl.hidden = false;
    stateEl.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + U.escapeHtml(message);
  }

  function applyFiltersAndRender() {
    var ward = wardSelect ? wardSelect.value : '';
    var category = categorySelect ? categorySelect.value : '';
    var status = statusSelect ? statusSelect.value : '';

    var filtered = allItems.filter(function (p) {
      return (!ward || p.ward === ward) && (!category || p.category === category) && (!status || p.status === status);
    });

    if (!filtered.length) {
      grid.innerHTML = '';
      setState('No projects match these filters yet.', 'fa-inbox');
      return;
    }
    setState(null);
    grid.innerHTML = filtered.map(renderCard).join('');
    if (window.animateProgressBars) window.animateProgressBars();
  }

  function populateFilters() {
    U.fillSelect(wardSelect, U.uniqueSorted(allItems.map(function (p) { return p.ward; })), 'All wards');
    U.fillSelect(categorySelect, U.uniqueSorted(allItems.map(function (p) { return p.category; })), 'All categories');
  }

  // Lets other pages deep link into a filtered tracker, e.g. tracker.html?ward=Kware (used by the Vision
  // page's ward map). Only values that exist in the filter dropdowns are applied.
  function applyUrlFilters() {
    var params = new URLSearchParams(window.location.search);
    [['ward', wardSelect], ['category', categorySelect], ['status', statusSelect]].forEach(function (pair) {
      var value = params.get(pair[0]);
      var select = pair[1];
      if (!value || !select) return;
      var match = Array.prototype.some.call(select.options, function (o) { return o.value === value; });
      if (match) select.value = value;
    });
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

  function load() {
    grid.innerHTML = U.skeletonProjCards(6);
    setState(null);
    window.ApiClient.get('/tracker', { limit: 200 })
      .then(function (data) {
        allItems = window.ApiClient.realOnly(data.items || []);
        renderGlance(allItems, false);
        if (!allItems.length) {
          grid.innerHTML = '';
          setState('No projects have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        populateFilters();
        applyUrlFilters();
        applyFiltersAndRender();
      })
      .catch(function (err) {
        console.error('Failed to load tracker projects:', err);
        renderGlance([], true);
        grid.innerHTML = '';
        setState('Could not load projects right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  [wardSelect, categorySelect, statusSelect].forEach(function (el) {
    if (el) el.addEventListener('change', applyFiltersAndRender);
  });

  document.addEventListener('DOMContentLoaded', load);
})();
