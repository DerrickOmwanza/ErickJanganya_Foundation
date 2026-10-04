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
        allItems = data.items || [];
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
        grid.innerHTML = '';
        setState('Could not load promises right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  [categorySelect, statusSelect].forEach(function (el) {
    if (el) el.addEventListener('change', applyFiltersAndRender);
  });

  document.addEventListener('DOMContentLoaded', load);
})();
