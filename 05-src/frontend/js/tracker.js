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

  function load() {
    grid.innerHTML = U.skeletonProjCards(6);
    setState(null);
    window.ApiClient.get('/tracker', { limit: 100 })
      .then(function (data) {
        allItems = data.items || [];
        if (!allItems.length) {
          grid.innerHTML = '';
          setState('No projects have been published yet — check back soon.', 'fa-inbox');
          return;
        }
        populateFilters();
        applyUrlFilters();
        applyFiltersAndRender();
      })
      .catch(function (err) {
        console.error('Failed to load tracker projects:', err);
        grid.innerHTML = '';
        setState('Could not load projects right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  [wardSelect, categorySelect, statusSelect].forEach(function (el) {
    if (el) el.addEventListener('change', applyFiltersAndRender);
  });

  document.addEventListener('DOMContentLoaded', load);
})();
