// Development Tracker "By ward" map: the five Embakasi South ward boundaries (data/embakasi-south-wards.geojson,
// OpenStreetMap) shaded by how many projects each ward has. Clicking a ward calls back so the tracker can filter
// to it; selected wards get a heavy outline and the map zooms to them. The first render builds the map (so it only
// loads when the view is opened); later renders just restyle it. Requires Leaflet (js/vendor/leaflet.js).
window.TrackerWardMap = (function () {
  'use strict';
  var map = null, layers = {}, names = [], allBounds = null;
  var building = false, failed = false, pending = null, toggleCb = null, lastSelKey = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  function styleFor(ward, counts, selected, max) {
    var n = counts[ward] || 0;
    var on = selected.indexOf(ward) >= 0;
    var dim = selected.length > 0 && !on;
    var fill = n ? '#CE2227' : '#E4E1D6';
    var op = n ? 0.22 + 0.55 * (max ? n / max : 0) : 0.55;
    return {
      color: '#111', weight: on ? 4 : 1.5, opacity: dim ? 0.45 : 0.95,
      dashArray: dim ? '4 4' : null, fillColor: fill, fillOpacity: dim ? op * 0.5 : op
    };
  }

  function apply(payload) {
    if (!map) return;
    var counts = payload.counts, selected = payload.selected;
    var max = 0;
    names.forEach(function (w) { if ((counts[w] || 0) > max) max = counts[w] || 0; });
    names.forEach(function (w) {
      var layer = layers[w];
      if (!layer) return;
      var n = counts[w] || 0;
      layer.setStyle(styleFor(w, counts, selected, max));
      layer.unbindTooltip();
      layer.bindTooltip(w + ': ' + n + ' project' + (n === 1 ? '' : 's'), { sticky: true, direction: 'top', className: 'ward-tip' });
      if (selected.indexOf(w) >= 0) layer.bringToFront();
    });
    var key = selected.join('|');
    if (key !== lastSelKey) {
      var targets = selected.map(function (w) { return layers[w]; }).filter(Boolean);
      var bounds = targets.length ? L.featureGroup(targets).getBounds() : allBounds;
      var pad = targets.length ? 56 : 24;
      if (lastSelKey === null || reduce) { map.fitBounds(bounds, { padding: [pad, pad], maxZoom: 16 }); }
      else { map.flyToBounds(bounds, { padding: [pad, pad], maxZoom: 16, duration: 0.8 }); }
      lastSelKey = key;
    }
  }

  function build(container, data) {
    map = L.map(container, { zoomControl: false, scrollWheelZoom: false, dragging: !coarse, touchZoom: !coarse, zoomSnap: 0.25 });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    var geo = L.geoJSON(data, {
      style: function () { return { color: '#111', weight: 1.5, fillColor: '#E4E1D6', fillOpacity: 0.55 }; },
      onEachFeature: function (feature, layer) {
        var ward = feature.properties.name;
        names.push(ward);
        layers[ward] = layer;
        layer.on('click', function () { if (toggleCb) toggleCb(ward); });
      }
    }).addTo(map);
    allBounds = geo.getBounds();
    map.fitBounds(allBounds, { padding: [24, 24] });

    // Wheel zoom (and, on touch screens, one finger panning) only after the map is clicked, so the page never
    // gets trapped inside it. Lets go when the pointer leaves, on Escape, or on a tap outside.
    var frame = container.closest('.map-frame') || container;
    function engage() { map.scrollWheelZoom.enable(); if (coarse) { map.dragging.enable(); map.touchZoom.enable(); } }
    function release() { map.scrollWheelZoom.disable(); if (coarse) { map.dragging.disable(); map.touchZoom.disable(); } }
    frame.addEventListener('click', engage);
    frame.addEventListener('mouseleave', release);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') release(); });
    document.addEventListener('touchstart', function (e) {
      if (!frame.contains(e.target)) { frame.classList.remove('is-active'); release(); }
    }, { passive: true });
    window.addEventListener('resize', function () { map.invalidateSize(); });
  }

  function render(container, payload, onToggle) {
    toggleCb = onToggle;
    if (failed || !container) return;
    if (!window.L) { failed = true; container.innerHTML = '<p class="wv-map-error">The map could not be loaded. The ward list still works.</p>'; return; }
    if (map) { map.invalidateSize(); apply(payload); return; }
    pending = payload;
    if (building) return;
    building = true;
    fetch('data/embakasi-south-wards.geojson')
      .then(function (r) { if (!r.ok) throw new Error('data'); return r.json(); })
      .then(function (data) {
        build(container, data);
        building = false;
        map.invalidateSize();
        apply(pending);
      })
      .catch(function () {
        failed = true;
        building = false;
        container.innerHTML = '<p class="wv-map-error">The map could not be loaded. The ward list still works.</p>';
      });
  }

  return { render: render };
})();
