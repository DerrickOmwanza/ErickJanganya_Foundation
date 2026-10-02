// Vision page: an interactive map of Embakasi South's five wards. Boundaries come from
// data/embakasi-south-wards.geojson (OpenStreetMap administrative relations). Selecting a ward chip, or the
// ward on the map, zooms to it, outlines it and shows its approximate area; selecting it again (or "Show all
// wards") zooms back out. If Leaflet or the data fail to load, the plain OpenStreetMap iframe stays in place.
(function () {
  'use strict';
  var frame = document.querySelector('.map-frame');
  if (!frame || !window.L) return;
  var mapEl = frame.querySelector('.ward-map');
  var iframe = frame.querySelector('iframe');
  var statusEl = frame.querySelector('.map-status');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.ward-chip'));
  var hint = document.querySelector('.where-hint');
  if (!mapEl || !statusEl || !chips.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  fetch('data/embakasi-south-wards.geojson')
    .then(function (r) { if (!r.ok) throw new Error('data'); return r.json(); })
    .then(init)
    .catch(function () { /* keep the iframe fallback */ });

  // Approximate polygon area in km2 (local equirectangular projection, well within 1% at this size).
  function areaKm2(geom) {
    var polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    var R = 6371008.8, total = 0;
    polys.forEach(function (poly) {
      poly.forEach(function (ring, idx) {
        var lat0 = ring.reduce(function (s, p) { return s + p[1]; }, 0) / ring.length * Math.PI / 180;
        var sum = 0;
        for (var i = 0; i < ring.length - 1; i++) {
          var x1 = ring[i][0] * Math.PI / 180 * R * Math.cos(lat0), y1 = ring[i][1] * Math.PI / 180 * R;
          var x2 = ring[i + 1][0] * Math.PI / 180 * R * Math.cos(lat0), y2 = ring[i + 1][1] * Math.PI / 180 * R;
          sum += x1 * y2 - x2 * y1;
        }
        total += (idx === 0 ? 1 : -1) * Math.abs(sum) / 2;
      });
    });
    return total / 1e6;
  }

  function init(data) {
    mapEl.hidden = false;
    if (iframe) iframe.hidden = true;
    statusEl.hidden = false;
    if (hint) hint.hidden = false;
    chips.forEach(function (c) { c.classList.add('is-live'); });

    var map = L.map(mapEl, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: !coarse,
      touchZoom: !coarse,
      zoomSnap: 0.25
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    var current = null;
    var layers = {};
    var areas = {};
    var names = {};

    function baseStyle() { return { color: '#111', weight: 1.5, opacity: 0.85, dashArray: null, fillColor: '#111', fillOpacity: 0.05 }; }
    function dimStyle() { return { color: '#111', weight: 1, opacity: 0.4, dashArray: '4 4', fillColor: '#111', fillOpacity: 0.02 }; }
    function hoverStyle() { return { color: '#CE2227', weight: 2.5, opacity: 1, dashArray: null, fillColor: '#CE2227', fillOpacity: 0.14 }; }
    function activeStyle() { return { color: '#CE2227', weight: 3.5, opacity: 1, dashArray: null, fillColor: '#CE2227', fillOpacity: 0.2 }; }

    function restyle() {
      Object.keys(layers).forEach(function (slug) {
        layers[slug].setStyle(current ? (slug === current ? activeStyle() : dimStyle()) : baseStyle());
      });
      if (current) layers[current].bringToFront();
    }
    function hoverOn(slug) { if (current !== slug && layers[slug]) layers[slug].setStyle(hoverStyle()); }
    function setChipHover(slug, on) {
      chips.forEach(function (c) { if (c.getAttribute('data-ward') === slug) c.classList.toggle('is-hover', on); });
    }

    var geo = L.geoJSON(data, {
      style: baseStyle,
      onEachFeature: function (feature, layer) {
        var slug = feature.properties.slug;
        layers[slug] = layer;
        names[slug] = feature.properties.name;
        areas[slug] = areaKm2(feature.geometry);
        layer.bindTooltip(feature.properties.name, { sticky: true, direction: 'top', className: 'ward-tip' });
        layer.on('click', function () { select(slug); });
        layer.on('mouseover', function () { hoverOn(slug); setChipHover(slug, true); });
        layer.on('mouseout', function () { restyle(); setChipHover(slug, false); });
      }
    }).addTo(map);
    var allBounds = geo.getBounds();
    map.fitBounds(allBounds, { padding: [24, 24] });

    function fly(bounds, pad) {
      if (reduceMotion) {
        map.fitBounds(bounds, { padding: [pad, pad], maxZoom: 16 });
      } else {
        map.flyToBounds(bounds, { padding: [pad, pad], maxZoom: 16, duration: 0.9 });
      }
    }
    function renderStatus() {
      if (!current) {
        statusEl.innerHTML = '<span class="map-status-text">All five wards of Embakasi South</span>';
        return;
      }
      statusEl.innerHTML = '<span class="map-status-text"><strong>' + names[current] + ' ward</strong>' +
        '<span class="map-status-meta">About ' + areas[current].toFixed(1) + ' km&sup2;</span></span>' +
        '<button type="button" class="map-status-reset">Show all wards</button>';
      statusEl.querySelector('.map-status-reset').addEventListener('click', function (e) {
        e.stopPropagation();
        select(null);
      });
    }
    function select(slug) {
      if (slug === current) slug = null;
      if (current && layers[current]) {
        layers[current].unbindTooltip();
        layers[current].bindTooltip(names[current], { sticky: true, direction: 'top', className: 'ward-tip' });
      }
      current = slug;
      restyle();
      chips.forEach(function (c) {
        var on = c.getAttribute('data-ward') === current;
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
        c.classList.toggle('is-active', on);
      });
      if (current) {
        layers[current].unbindTooltip();
        layers[current].bindTooltip(names[current], { permanent: true, direction: 'center', className: 'ward-label' }).openTooltip();
        fly(layers[current].getBounds(), 56);
      } else {
        fly(allBounds, 24);
      }
      renderStatus();
    }

    chips.forEach(function (chip) {
      var slug = chip.getAttribute('data-ward');
      chip.addEventListener('click', function () {
        select(slug);
        frame.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      chip.addEventListener('mouseenter', function () { hoverOn(slug); });
      chip.addEventListener('mouseleave', restyle);
      chip.addEventListener('focus', function () { hoverOn(slug); });
      chip.addEventListener('blur', restyle);
    });
    renderStatus();

    // Wheel zoom (and, on touch screens, one finger panning) only after the map is clicked, so the page
    // never gets trapped inside it. It lets go when the pointer leaves, on Escape, or on a tap outside.
    function engage() {
      map.scrollWheelZoom.enable();
      if (coarse) { map.dragging.enable(); map.touchZoom.enable(); }
    }
    function release() {
      map.scrollWheelZoom.disable();
      if (coarse) { map.dragging.disable(); map.touchZoom.disable(); }
    }
    frame.addEventListener('click', engage);
    frame.addEventListener('mouseleave', release);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') release(); });
    document.addEventListener('touchstart', function (e) {
      if (!frame.contains(e.target)) { frame.classList.remove('is-active'); release(); }
    }, { passive: true });
    window.addEventListener('resize', function () { map.invalidateSize(); });
  }
})();
