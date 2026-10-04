// Renders the Events page from the live API: the hero "at a glance" panel and the event list (upcoming first, past below).
// An event's date is a plain calendar date, so it is compared as a date string (never shifted by a time zone). Requires
// api.js (window.ApiClient, window.FoundationUtils) to be loaded first.
(function () {
  var list = document.getElementById('eventsList');
  if (!list) return; // not on this page

  var stateEl = document.getElementById('eventsState');
  var U = window.FoundationUtils;
  var allItems = [];

  // ----- Dates -----

  function dateStr(e) { return String(e.eventDate || '').slice(0, 10); }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function asUtc(s) { var p = s.split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function daysUntil(s) { return Math.round((asUtc(s) - asUtc(todayStr())) / 86400000); }
  function fmt(s, opts) { return new Date(asUtc(s)).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, opts)); }
  function isUpcoming(e) { return dateStr(e) >= todayStr(); }

  // Event titles and descriptions come from the database; keep dashes out of visible copy.
  function clean(t) { return String(t || '').replace(/\s[–—]\s/g, ': ').replace(/[–—]/g, '-'); }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // ----- Hero "at a glance" panel -----

  function inText(s) {
    var n = daysUntil(s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    return n + ' days';
  }

  function whenText(s) {
    var n = daysUntil(s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    return 'In ' + n + ' days';
  }

  function renderGlance(items, failed) {
    var panel = document.getElementById('evGlance');
    if (!panel) return;
    var $ = function (id) { return document.getElementById(id); };
    var note = $('egNote');
    panel.classList.remove('is-loading');
    if (failed) {
      $('egUpcoming').textContent = '0';
      $('egNextTitle').textContent = 'Not available right now';
      $('egNextMeta').textContent = '';
      $('egIn').textContent = '-';
      $('egPast').textContent = '0';
      $('egWards').textContent = '0';
      note.hidden = false;
      note.textContent = 'The live figures could not be loaded right now.';
      return;
    }
    var upcoming = items.filter(isUpcoming).sort(function (a, b) { return dateStr(a) < dateStr(b) ? -1 : 1; });
    var past = items.filter(function (e) { return !isUpcoming(e); });
    var wards = {};
    items.forEach(function (e) { if (e.ward) wards[e.ward] = true; });
    $('egUpcoming').textContent = upcoming.length;
    $('egUpcomingLabel').textContent = upcoming.length === 1 ? 'upcoming event' : 'upcoming events';
    $('egPast').textContent = past.length;
    $('egWards').textContent = Object.keys(wards).length;
    $('egSample').hidden = !items.some(window.ApiClient.isPlaceholder);
    if (upcoming.length) {
      var n = upcoming[0];
      $('egNextTitle').textContent = clean(n.title);
      $('egNextMeta').textContent = fmt(dateStr(n), { weekday: 'short', day: 'numeric', month: 'short' }) + (n.eventTime ? ' at ' + n.eventTime : '') + (n.location ? ', ' + n.location : '');
      $('egIn').textContent = inText(dateStr(n));
      note.hidden = true;
    } else {
      $('egNextTitle').textContent = 'Nothing scheduled yet';
      $('egNextMeta').textContent = '';
      $('egIn').textContent = '-';
      note.hidden = false;
      note.textContent = items.length ? 'No events are coming up right now. Past events are listed below.' : 'No events have been published yet. Check back soon.';
    }
  }

  // ----- The list -----

  function dateTile(s) {
    return '<div class="ev-date" aria-hidden="true"><span class="ev-mon">' + U.escapeHtml(fmt(s, { month: 'short' })) + '</span>' +
      '<b>' + U.escapeHtml(fmt(s, { day: 'numeric' })) + '</b><span class="ev-dow">' + U.escapeHtml(fmt(s, { weekday: 'short' })) + '</span></div>';
  }

  function renderEvent(e, upcoming) {
    var s = dateStr(e);
    var when = fmt(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (e.eventTime ? ', ' + e.eventTime : '');
    var meta = [];
    meta.push('<li><i class="fa-regular fa-clock" aria-hidden="true"></i><span>' + U.escapeHtml(when) + '</span></li>');
    if (e.location) meta.push('<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>' + U.escapeHtml(e.location) + '</span></li>');
    return (
      '<article class="ev' + (upcoming ? '' : ' ev--past') + '" data-id="' + U.escapeHtml(String(e.id)) + '">' +
        dateTile(s) +
        '<div class="ev-body">' +
          '<div class="ev-tags">' +
            (e.ward ? '<span class="ev-ward">' + U.escapeHtml(e.ward) + '</span>' : '') +
            '<span class="ev-status ev-status--' + (upcoming ? 'up' : 'past') + '">' + (upcoming ? U.escapeHtml(whenText(s)) : 'Past') + '</span>' +
          '</div>' +
          '<h3>' + U.escapeHtml(clean(e.title)) + '</h3>' +
          (e.description ? '<p class="ev-desc">' + U.escapeHtml(clean(e.description)) + '</p>' : '') +
          '<ul class="ev-meta">' + meta.join('') + '</ul>' +
        '</div>' +
      '</article>'
    );
  }

  function group(title, count, html, extra) {
    return '<section class="ev-group"><header class="ev-head"><h3>' + title + '</h3><span class="ev-count">' + plural(count, 'event') + '</span></header>' + (extra || '') + html + '</section>';
  }

  // ----- Filtering -----
  // Chips for "when" (Upcoming, Past) and for ward, plus search. With no chip chosen in a group, everything shows. Chip
  // counts show what picking that chip WOULD give with the other filters on. Filters live in the address, e.g.
  // events.html?when=upcoming&ward=Kware&q=camp, so a filtered view can be shared.

  var filtersEl = document.getElementById('evFilters');
  var searchEl = document.getElementById('evSearch');
  var countEl = document.getElementById('evCount');
  var clearBtn = document.getElementById('evClear');
  var WARDS = ['Imara Daima', 'Kwa Njenga', 'Kwa Reuben', 'Pipeline', 'Kware'];
  var WHEN = ['Upcoming', 'Past'];
  var state = { q: '', when: [], ward: [] };

  function hasFilters() { return !!(state.q || state.when.length || state.ward.length); }

  function whenOf(e) { return isUpcoming(e) ? 'Upcoming' : 'Past'; }

  // `skip` leaves one group out (for the chip counts).
  function matches(e, skip) {
    if (skip !== 'when' && state.when.length && state.when.indexOf(whenOf(e)) < 0) return false;
    if (skip !== 'ward' && state.ward.length && state.ward.indexOf(e.ward) < 0) return false;
    if (state.q) {
      var hay = [e.title, e.description, e.location, e.ward].join(' ').toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  function updateChips() {
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.tb-chip'), function (chip) {
      var group = chip.getAttribute('data-group'), value = chip.getAttribute('data-value');
      var on = state[group].indexOf(value) >= 0;
      var n = allItems.filter(function (e) { return matches(e, group) && (group === 'when' ? whenOf(e) : e.ward) === value; }).length;
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      chip.classList.toggle('is-empty', n === 0 && !on);
      chip.querySelector('.tb-n').textContent = n;
    });
  }

  function syncUrl() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.when.length) params.set('when', state.when.map(function (w) { return w.toLowerCase(); }).join(','));
    if (state.ward.length) params.set('ward', state.ward.join(','));
    var qs = params.toString();
    try { history.replaceState(history.state, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash); } catch (e) { /* ignore */ }
  }

  function render() {
    var filtered = allItems.filter(function (e) { return matches(e); });
    var upcoming = filtered.filter(isUpcoming).sort(function (a, b) { return dateStr(a) < dateStr(b) ? -1 : 1; });
    var past = filtered.filter(function (e) { return !isUpcoming(e); }).sort(function (a, b) { return dateStr(a) < dateStr(b) ? 1 : -1; });
    var total = allItems.length;
    countEl.textContent = hasFilters() ? 'Showing ' + filtered.length + ' of ' + plural(total, 'event') : plural(total, 'event');
    clearBtn.hidden = !hasFilters();
    updateChips();
    syncUrl();

    if (!filtered.length) {
      list.innerHTML = '';
      stateEl.hidden = false;
      stateEl.innerHTML = '<i class="fa-solid fa-inbox"></i>No events match these filters. <button type="button" class="tb-inline-clear">Clear filters</button>';
      return;
    }
    setState(null);
    var html = '';
    if (upcoming.length) {
      html += group('Upcoming', upcoming.length, '<div class="ev-list">' + upcoming.map(function (e) { return renderEvent(e, true); }).join('') + '</div>');
    } else if (!hasFilters()) {
      html += group('Upcoming', 0, '', '<div class="ev-empty"><i class="fa-regular fa-calendar" aria-hidden="true"></i><div><b>No events are coming up right now.</b>' +
        '<p>New events appear here as soon as they are scheduled. Subscribe and we will tell you.</p>' +
        '<a class="btn btn-primary" href="index.html#stay-updated"><i class="fa-solid fa-bell"></i> Get notified</a></div></div>');
    }
    if (past.length) html += group('Past', past.length, '<div class="ev-list">' + past.map(function (e) { return renderEvent(e, false); }).join('') + '</div>');
    list.innerHTML = html;
  }

  function clearAll() {
    state.q = ''; state.when = []; state.ward = [];
    searchEl.value = '';
    render();
  }

  function chip(group, value) {
    return '<button type="button" class="tb-chip" data-group="' + group + '" data-value="' + U.escapeHtml(value) + '" aria-pressed="false">' +
      U.escapeHtml(value) + ' <span class="tb-n">0</span></button>';
  }

  function buildChips() {
    var wards = WARDS.slice();
    allItems.forEach(function (e) { if (e.ward && wards.indexOf(e.ward) < 0) wards.push(e.ward); });
    var groups = [['when', 'When', WHEN], ['ward', 'Ward', wards]];
    filtersEl.innerHTML = groups.map(function (g) {
      return '<div class="tb-group"><span class="tb-label" id="evl-' + g[0] + '">' + g[1] + '</span>' +
        '<div class="tb-chips" role="group" aria-labelledby="evl-' + g[0] + '">' + g[2].map(function (v) { return chip(g[0], v); }).join('') + '</div></div>';
    }).join('');
  }

  // Filters in the address. Comma separated values; only values that exist are applied.
  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    var validWard = Array.prototype.map.call(filtersEl.querySelectorAll('.tb-chip[data-group="ward"]'), function (c) { return c.getAttribute('data-value'); });
    var w = params.get('when');
    if (w) state.when = WHEN.filter(function (v) { return w.toLowerCase().split(',').indexOf(v.toLowerCase()) >= 0; });
    var wd = params.get('ward');
    if (wd) state.ward = wd.split(',').filter(function (v) { return validWard.indexOf(v) >= 0; });
    var q = params.get('q');
    if (q) { state.q = q.trim().toLowerCase(); searchEl.value = q.trim(); }
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
    clearBtn.addEventListener('click', clearAll);
    stateEl.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('tb-inline-clear')) clearAll();
    });
  }

  function setState(message, icon) {
    if (!stateEl) return;
    if (!message) { stateEl.hidden = true; return; }
    stateEl.hidden = false;
    stateEl.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + U.escapeHtml(message);
  }

  function load() {
    setState(null);
    list.innerHTML = U.skeletonProjCards(2, false);
    window.ApiClient.get('/events', { limit: 200 })
      .then(function (data) {
        allItems = window.ApiClient.realOnly(data.items || []);
        renderGlance(allItems, false);
        if (!allItems.length) {
          list.innerHTML = '';
          countEl.textContent = '0 events';
          setState('No events have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        buildChips();
        readUrl();
        render();
      })
      .catch(function (err) {
        console.error('Failed to load events:', err);
        renderGlance([], true);
        list.innerHTML = '';
        countEl.textContent = 'Events unavailable';
        setState('Could not load the events right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  bind();
  document.addEventListener('DOMContentLoaded', load);
})();
