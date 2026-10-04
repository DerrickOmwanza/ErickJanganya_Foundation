// Fills the homepage's "Development tracker" preview panel with the 3 most recently updated
// projects, live from the API — replaces the old static cards that showed literal "[Project name]"
// placeholder text. Requires api.js (window.ApiClient, window.FoundationUtils) loaded first.
(function () {
  var container = document.getElementById('homeTrackerCards');
  if (!container || !window.ApiClient) return;

  var U = window.FoundationUtils;

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

  // The project's own photo when it has one, otherwise its area's picture from js/area-meta.js (labelled illustrative),
  // otherwise the plain placeholder.
  function cardMedia(p, i) {
    if (p.photoUrl) return '<div class="split-card-img"><img src="' + U.escapeHtml(p.photoUrl) + '" alt="' + U.escapeHtml(p.title) + '" loading="lazy"></div>';
    var meta = window.AreaMeta && window.AreaMeta[p.category];
    var src = meta && (meta.imgs && meta.imgs.length ? meta.imgs[i % meta.imgs.length] : meta.img);
    if (src) return '<div class="split-card-img"><img src="' + U.escapeHtml(src) + '" alt="" loading="lazy"><span class="hw-illus">Illustrative photo</span></div>';
    return '<div class="ph split-card-img"><i class="fa-solid fa-image"></i></div>';
  }

  function renderCard(p, i) {
    var updated = U.relativeTime(p.updatedAt);
    return (
      '<a class="split-card" href="tracker.html">' +
        cardMedia(p, i) +
        '<div class="split-card-body">' +
          '<span class="tag-plain">' + U.escapeHtml(p.ward) + ' <i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.category) + '</span>' +
          '<h4>' + U.escapeHtml(p.title) + '</h4>' +
          (p.summary ? '<p>' + U.escapeHtml(p.summary) + '</p>' : '') +
          '<div class="progress-track"><div class="progress-fill" data-progress="' + (p.progressPercent || 0) + '"></div></div>' +
          '<div class="split-card-badges">' +
            '<span class="badge ' + badgeClass(p.status) + '"><i class="fa-solid fa-circle"></i> ' + U.escapeHtml(p.status) + '</span>' +
            (p.fundingSource ? '<span class="source-chip ' + sourceClass(p.fundingSource) + '">' + U.escapeHtml(p.fundingSource) + '</span>' : '') +
          '</div>' +
          (updated ? '<span class="latest-meta">Updated ' + U.escapeHtml(updated) + '</span>' : '') +
        '</div>' +
      '</a>'
    );
  }

  container.innerHTML = U.skeletonSplitCards(3);

  window.ApiClient.get('/tracker', { limit: 3 })
    .then(function (data) {
      var items = data.items || [];
      if (!items.length) {
        container.innerHTML = '<p class="data-state"><i class="fa-solid fa-inbox"></i> No projects published yet. Check back soon.</p>';
        return;
      }
      container.innerHTML = items.map(renderCard).join('');
      if (window.animateProgressBars) window.animateProgressBars();
    })
    .catch(function (err) {
      console.error('Home tracker preview: failed to load projects', err);
      container.innerHTML = '<p class="data-state"><i class="fa-solid fa-triangle-exclamation"></i> Could not load the latest projects right now.</p>';
    });
})();
