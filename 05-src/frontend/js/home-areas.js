// Homepage "What we track": one photo tile per area of work, built from the shared list in js/area-meta.js so the pictures
// and icons match the Development Tracker and the Promise Scorecard. Each tile links to that area on the tracker. Requires
// area-meta.js to be loaded first.
(function () {
  var wrap = document.getElementById('homeAreaTiles');
  var meta = window.AreaMeta;
  if (!wrap || !meta) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var names = Object.keys(meta);
  if (!names.length) { var sec = wrap.parentNode; if (sec) sec.hidden = true; return; }
  wrap.style.setProperty('--ar-n', Math.min(names.length, 5));
  wrap.setAttribute('data-n', String(Math.min(names.length, 5)));
  wrap.innerHTML = names.map(function (name) {
    var m = meta[name];
    return (
      '<a class="ar-tile" href="tracker.html?category=' + encodeURIComponent(name) + '">' +
        (m.img ? '<img src="' + esc(m.img) + '" alt="" loading="lazy">' : '') +
        '<span class="ar-shade" aria-hidden="true"></span>' +
        '<span class="ar-body">' +
          '<span class="ar-ico" aria-hidden="true"><i class="fa-solid ' + esc(m.icon || 'fa-flag') + '"></i></span>' +
          '<span class="ar-name">' + esc(name) + '</span>' +
          '<span class="ar-count">See the projects <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>' +
        '</span>' +
      '</a>'
    );
  }).join('');
})();
