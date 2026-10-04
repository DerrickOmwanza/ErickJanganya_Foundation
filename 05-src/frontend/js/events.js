// The Events page, driven by the live API: the hero "at a glance" panel, a month CALENDAR (each event on its date with a small
// cropped photo) or a LIST, the filter toolbar, and an event detail drawer (add to calendar, open in maps, share link, RSVP).
// An event's date is a plain calendar date, so it is compared as a date string and never shifted by a time zone. Requires
// api.js (window.ApiClient, window.FoundationUtils) to be loaded first.
(function () {
  var list = document.getElementById('eventsList');
  if (!list) return; // not on this page

  var calEl = document.getElementById('eventsCalendar');
  var stateEl = document.getElementById('eventsState');
  var filtersEl = document.getElementById('evFilters');
  var searchEl = document.getElementById('evSearch');
  var countEl = document.getElementById('evCount');
  var clearBtn = document.getElementById('evClear');
  var U = window.FoundationUtils;
  var WARDS = ['Imara Daima', 'Kwa Njenga', 'Kwa Reuben', 'Pipeline', 'Kware'];
  var WHEN = ['Upcoming', 'Past'];
  var VIEWS = ['calendar', 'list'];
  var VIEW_KEY = 'ejf.events.view';
  var allItems = [];
  var state = { q: '', when: [], ward: [], view: 'calendar', month: '', monthDefault: '', event: null };

  // ----- Dates -----

  function dateStr(e) { return String(e.eventDate || '').slice(0, 10); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function asUtc(s) { var p = s.split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function daysUntil(s) { return Math.round((asUtc(s) - asUtc(todayStr())) / 86400000); }
  function fmt(s, opts) { return new Date(asUtc(s)).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, opts)); }
  function isUpcoming(e) { return dateStr(e) >= todayStr(); }
  function whenOf(e) { return isUpcoming(e) ? 'Upcoming' : 'Past'; }
  function byDate(a, b) { return dateStr(a) < dateStr(b) ? -1 : (dateStr(a) > dateStr(b) ? 1 : 0); }

  // Event titles and descriptions come from the database; keep dashes out of visible copy.
  function clean(t) { return String(t || '').replace(/\s[\u2013\u2014]\s/g, ': ').replace(/[\u2013\u2014]/g, '-'); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function whenText(s) {
    var n = daysUntil(s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    return 'In ' + n + ' days';
  }

  // Months are 'YYYY-MM'.
  function monthOf(s) { return s.slice(0, 7); }
  function monthLabel(m) { return fmt(m + '-01', { month: 'long', year: 'numeric' }); }
  function monthShort(m) { return fmt(m + '-01', { month: 'short', year: 'numeric' }); }
  function addMonth(m, d) {
    var p = m.split('-');
    var t = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1 + d, 1));
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1);
  }

  // ----- Pictures -----
  // Events have no photo field yet. An event's own photo (imageUrl) wins when it exists; until then a picture is chosen from
  // what the event is about. The real campaign photos are used where they fit; the rest are illustrative stand-ins.
  var PICTURES = [
    [/medical|health|clinic|screening|camp|maternal|hospital/i, 'img/hero-clinics-poster.jpg', false],
    [/skills|youth|training|hub|open day|jobs|enterprise/i, 'img/focus-youth.jpg', false],
    [/school|education|bursar|classroom|teacher/i, 'img/vision-education-youth.jpg', false],
    [/water|sanitation|hygiene|borehole|tap/i, 'img/hero-water-poster.jpg', false],
    [/road|drain|footbridge|bridge|infrastructure|construction|site/i, 'img/focus-infrastructure.jpg', false],
    [/distribution|donat|food|goods|supplies|give/i, 'img/ground-verification.jpg', true],
    [/walk|visit|tour|ward/i, 'img/ground-engagement.jpg', true],
    [/forum|meeting|town|hall|gathering|baraza|community|listen/i, 'img/community-forum.jpg', true]
  ];
  function pictureFor(e) {
    if (e.imageUrl) return { src: e.imageUrl, real: true };
    // The title decides first; the description is only a fallback when the title says nothing.
    var texts = [e.title || '', e.description || ''];
    for (var t = 0; t < texts.length; t++) {
      for (var i = 0; i < PICTURES.length; i++) {
        if (PICTURES[i][0].test(texts[t])) return { src: PICTURES[i][1], real: PICTURES[i][2] };
      }
    }
    return { src: 'img/community-forum.jpg', real: true };
  }

  // ----- Hero "at a glance" panel -----

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
    var upcoming = items.filter(isUpcoming).sort(byDate);
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
      var d = daysUntil(dateStr(n));
      $('egIn').textContent = d === 0 ? 'Today' : (d === 1 ? 'Tomorrow' : d + ' days');
      note.hidden = true;
    } else {
      $('egNextTitle').textContent = 'Nothing scheduled yet';
      $('egNextMeta').textContent = '';
      $('egIn').textContent = '-';
      note.hidden = false;
      note.textContent = items.length ? 'No events are coming up right now. Past events are listed below.' : 'No events have been published yet. Check back soon.';
    }
  }

  // ----- The list view -----

  function dateTile(s) {
    return '<div class="ev-date" aria-hidden="true"><span class="ev-mon">' + U.escapeHtml(fmt(s, { month: 'short' })) + '</span>' +
      '<b>' + U.escapeHtml(fmt(s, { day: 'numeric' })) + '</b><span class="ev-dow">' + U.escapeHtml(fmt(s, { weekday: 'short' })) + '</span></div>';
  }

  function eventHref(id) { return window.location.pathname + '?event=' + encodeURIComponent(id); }

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
          '<h3><a class="ev-open" href="' + eventHref(e.id) + '">' + U.escapeHtml(clean(e.title)) + '</a></h3>' +
          (e.description ? '<p class="ev-desc">' + U.escapeHtml(clean(e.description)) + '</p>' : '') +
          '<ul class="ev-meta">' + meta.join('') + '</ul>' +
        '</div>' +
      '</article>'
    );
  }

  function group(title, count, html, extra) {
    return '<section class="ev-group"><header class="ev-head"><h3>' + title + '</h3><span class="ev-count">' + plural(count, 'event') + '</span></header>' + (extra || '') + html + '</section>';
  }

  function renderListView(upcoming, past) {
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

  // ----- The calendar view -----
  // A month grid (Monday first). Each event sits on its date as a small cropped photo with its title; a day with more than two
  // shows "+ n more". On phones the cells show only the photos and the month's events are listed beneath the grid.

  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function calEvent(e) {
    var pic = pictureFor(e);
    var title = clean(e.title);
    return '<button type="button" class="cal-ev ' + (isUpcoming(e) ? 'cal-ev--up' : 'cal-ev--past') + '" data-id="' + U.escapeHtml(String(e.id)) + '" aria-label="' + U.escapeHtml(title + ', ' + fmt(dateStr(e), { day: 'numeric', month: 'long' })) + '">' +
      '<span class="cal-thumb"><img src="' + U.escapeHtml(pic.src) + '" alt="" loading="lazy"></span>' +
      '<span class="cal-ev-title">' + U.escapeHtml(title) + '</span></button>';
  }

  function monthCounts(items) {
    var c = {};
    items.forEach(function (e) { var m = monthOf(dateStr(e)); c[m] = (c[m] || 0) + 1; });
    return c;
  }

  function renderCalendar(filtered) {
    var m = state.month, p = m.split('-');
    var y = Number(p[0]), mo = Number(p[1]);
    var days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    var offset = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    var cells = Math.ceil((offset + days) / 7) * 7;
    var byDay = {};
    filtered.forEach(function (e) { if (monthOf(dateStr(e)) === m) (byDay[dateStr(e)] = byDay[dateStr(e)] || []).push(e); });
    var today = todayStr();
    var counts = monthCounts(filtered);
    var monthEvents = filtered.filter(function (e) { return monthOf(dateStr(e)) === m; }).sort(byDate);

    // The month strip: every month that has an event, plus this month and the one being viewed.
    var months = Object.keys(counts);
    [monthOf(today), m].forEach(function (k) { if (months.indexOf(k) < 0) months.push(k); });
    months.sort();

    var grid = DOW.map(function (d) { return '<div class="cal-dow" aria-hidden="true">' + d + '</div>'; }).join('');
    for (var i = 0; i < cells; i++) {
      var day = i - offset + 1;
      if (day < 1 || day > days) { grid += '<div class="cal-cell cal-cell--out" aria-hidden="true"></div>'; continue; }
      var ds = m + '-' + pad(day);
      var evs = byDay[ds] || [];
      var cls = 'cal-cell' + (ds === today ? ' is-today' : '') + (ds < today ? ' is-past' : '') + (evs.length ? ' has-events' : '');
      grid += '<div class="' + cls + '" role="gridcell"' + (ds === today ? ' aria-current="date"' : '') + '>' +
        '<span class="cal-day">' + day + '</span>' +
        evs.slice(0, 2).map(calEvent).join('') +
        (evs.length > 2 ? '<button type="button" class="cal-more" data-id="' + U.escapeHtml(String(evs[2].id)) + '">+ ' + (evs.length - 2) + ' more</button>' : '') +
        '</div>';
    }

    calEl.innerHTML =
      '<div class="cal-top">' +
        '<div class="cal-nav">' +
          '<button type="button" class="cal-btn" data-nav="-1" aria-label="Previous month"><i class="fa-solid fa-chevron-left"></i></button>' +
          '<h3 class="cal-title" aria-live="polite">' + U.escapeHtml(monthLabel(m)) + '</h3>' +
          '<button type="button" class="cal-btn" data-nav="1" aria-label="Next month"><i class="fa-solid fa-chevron-right"></i></button>' +
        '</div>' +
        '<button type="button" class="cal-today" data-today="1">Today</button>' +
      '</div>' +
      '<div class="cal-months" role="group" aria-label="Jump to a month">' + months.map(function (k) {
        return '<button type="button" class="cal-month" data-month="' + k + '" aria-pressed="' + (k === m ? 'true' : 'false') + '">' + U.escapeHtml(monthShort(k)) +
          (counts[k] ? ' <span class="tb-n">' + counts[k] + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="cal-grid" role="grid" aria-label="' + U.escapeHtml(monthLabel(m)) + '">' + grid + '</div>' +
      '<div class="cal-agenda"><h4>' + U.escapeHtml(monthLabel(m)) + '</h4>' +
        (monthEvents.length ? monthEvents.map(function (e) { return renderEvent(e, isUpcoming(e)); }).join('') : '<p class="cal-none">No events this month.</p>') +
      '</div>' +
      (monthEvents.length ? '' : '<p class="cal-none cal-none--wide">No events in ' + U.escapeHtml(monthLabel(m)) + (hasFilters() ? ' with these filters' : '') + '.</p>');
  }

  // ----- Filtering -----
  // Chips for "when" (Upcoming, Past) and for ward, plus search. With no chip chosen in a group, everything shows. Chip
  // counts show what picking that chip WOULD give with the other filters on. Filters live in the address, e.g.
  // events.html?when=upcoming&ward=Kware&q=camp, so a filtered view can be shared.

  function hasFilters() { return !!(state.q || state.when.length || state.ward.length); }

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
      var g = chip.getAttribute('data-group'), v = chip.getAttribute('data-value');
      var on = state[g].indexOf(v) >= 0;
      var n = allItems.filter(function (e) { return matches(e, g) && (g === 'when' ? whenOf(e) : e.ward) === v; }).length;
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      chip.classList.toggle('is-empty', n === 0 && !on);
      chip.querySelector('.tb-n').textContent = n;
    });
  }

  function buildQs() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.when.length) params.set('when', state.when.map(function (w) { return w.toLowerCase(); }).join(','));
    if (state.ward.length) params.set('ward', state.ward.join(','));
    if (state.view !== 'calendar') params.set('view', state.view);
    if (state.view === 'calendar' && state.month && state.month !== state.monthDefault) params.set('month', state.month);
    if (state.event) params.set('event', state.event);
    var qs = params.toString();
    return window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  }

  function syncUrl() {
    try { history.replaceState(history.state, '', buildQs()); } catch (e) { /* ignore */ }
  }

  function updateViewButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.tb-view-btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === state.view ? 'true' : 'false');
    });
  }

  // The month shown by default: the next upcoming event's month, else the latest past event's, else this month.
  function defaultMonth() {
    var up = allItems.filter(isUpcoming).sort(byDate);
    if (up.length) return monthOf(dateStr(up[0]));
    var past = allItems.slice().sort(byDate);
    if (past.length) return monthOf(dateStr(past[past.length - 1]));
    return monthOf(todayStr());
  }

  function render() {
    var filtered = allItems.filter(function (e) { return matches(e); });
    var upcoming = filtered.filter(isUpcoming).sort(byDate);
    var past = filtered.filter(function (e) { return !isUpcoming(e); }).sort(function (a, b) { return byDate(b, a); });
    var total = allItems.length;
    countEl.textContent = hasFilters() ? 'Showing ' + filtered.length + ' of ' + plural(total, 'event') : plural(total, 'event');
    clearBtn.hidden = !hasFilters();
    updateChips();
    updateViewButtons();
    syncUrl();

    var calendar = state.view === 'calendar';
    calEl.hidden = !calendar || !filtered.length;
    list.hidden = calendar || !filtered.length;
    if (!filtered.length) {
      list.innerHTML = '';
      calEl.innerHTML = '';
      stateEl.hidden = false;
      stateEl.innerHTML = '<i class="fa-solid fa-inbox"></i>No events match these filters. <button type="button" class="tb-inline-clear">Clear filters</button>';
      return;
    }
    setState(null);
    if (calendar) { renderCalendar(filtered); } else { renderListView(upcoming, past); }
  }

  function clearAll() {
    state.q = ''; state.when = []; state.ward = [];
    searchEl.value = '';
    render();
  }

  function chip(g, value) {
    return '<button type="button" class="tb-chip" data-group="' + g + '" data-value="' + U.escapeHtml(value) + '" aria-pressed="false">' +
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

  // Filters, view, month and event in the address. Comma separated values; only values that exist are applied.
  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    var validWard = Array.prototype.map.call(filtersEl.querySelectorAll('.tb-chip[data-group="ward"]'), function (c) { return c.getAttribute('data-value'); });
    var w = params.get('when');
    if (w) state.when = WHEN.filter(function (v) { return w.toLowerCase().split(',').indexOf(v.toLowerCase()) >= 0; });
    var wd = params.get('ward');
    if (wd) state.ward = wd.split(',').filter(function (v) { return validWard.indexOf(v) >= 0; });
    var q = params.get('q');
    if (q) { state.q = q.trim().toLowerCase(); searchEl.value = q.trim(); }
    var v = params.get('view');
    if (v && VIEWS.indexOf(v) >= 0) {
      state.view = v;
    } else {
      try { var saved = localStorage.getItem(VIEW_KEY); if (saved && VIEWS.indexOf(saved) >= 0) state.view = saved; } catch (e) { /* no saved view */ }
    }
    state.monthDefault = defaultMonth();
    var mo = params.get('month');
    state.month = mo && /^\d{4}-(0[1-9]|1[0-2])$/.test(mo) ? mo : state.monthDefault;
    state.event = findEvent(params.get('event')) ? String(params.get('event')) : null;
    // A link to one event shows the calendar on that event's month (unless a month was asked for)
    if (state.event && !(mo && /^\d{4}-(0[1-9]|1[0-2])$/.test(mo))) state.month = monthOf(dateStr(findEvent(state.event)));
  }

  // ----- The event detail drawer -----
  // Opens from the calendar, the list, or a shared link (?event=ID). Shows the event with its picture, steps through the
  // events currently shown, and offers: add to calendar (a downloadable .ics file and a Google Calendar link), open in maps,
  // a link to copy, and RSVP (the event's own link, or a message prefilled through the Contact form). The back button closes it.

  var pdPanel = document.getElementById('pdPanel');
  var pdOverlay = document.getElementById('pdOverlay');
  var pdBody = document.getElementById('pdBody');
  var pdPrev = document.getElementById('pdPrev');
  var pdNext = document.getElementById('pdNext');
  var pdCopy = document.getElementById('pdCopy');
  var pdClose = document.getElementById('pdClose');
  var pdOpen = false, pdHideTimer = null, pdCopyTimer = null, pdOpenerId = null, pdOpenerEl = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function findEvent(id) {
    if (id === null || id === undefined || id === '') return null;
    for (var i = 0; i < allItems.length; i++) { if (String(allItems[i].id) === String(id)) return allItems[i]; }
    return null;
  }

  // Parses the free text time ("10:00 AM", "8am", "14:30"); null when it cannot be read, which makes the event all day.
  function parseTime(t) {
    var m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(t || '');
    if (!m) return null;
    var h = Number(m[1]), min = Number(m[2] || 0), ap = (m[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return { h: h, min: min };
  }

  // Nairobi is UTC+3 all year, so a local time becomes UTC by subtracting three hours.
  function stamp(s, h, min) {
    var p = s.split('-');
    return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), h - 3, min)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function dayStamp(s, plus) {
    var d = new Date(asUtc(s) + plus * 86400000);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }

  function calendarTimes(e) {
    var s = dateStr(e), t = parseTime(e.eventTime);
    if (!t) return { allDay: true, start: dayStamp(s, 0), end: dayStamp(s, 1) };
    return { allDay: false, start: stamp(s, t.h, t.min), end: stamp(s, t.h + 2, t.min) };
  }

  function place(e) { return [e.location, e.ward ? e.ward + ' ward' : '', 'Embakasi South, Nairobi'].filter(Boolean).join(', '); }

  function icsText(t) { return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }

  function vevent(e) {
    var c = calendarTimes(e);
    return [
      'BEGIN:VEVENT',
      'UID:event-' + e.id + '@erickjanganyafoundation.org',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      c.allDay ? 'DTSTART;VALUE=DATE:' + c.start : 'DTSTART:' + c.start,
      c.allDay ? 'DTEND;VALUE=DATE:' + c.end : 'DTEND:' + c.end,
      'SUMMARY:' + icsText(clean(e.title)),
      'DESCRIPTION:' + icsText(clean(e.description)),
      'LOCATION:' + icsText(place(e)),
      'END:VEVENT'
    ];
  }

  // Downloads one calendar file holding every event given (one for the drawer, all upcoming for the page button).
  function downloadIcs(events, filename) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Erick Janganya Foundation//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach(function (e) { lines = lines.concat(vevent(e)); });
    lines.push('END:VCALENDAR');
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function slug(t) { return String(clean(t)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  // The page button: every upcoming event (not just the filtered ones) in one file.
  function updateAddAll() {
    var btn = document.getElementById('evAddAll');
    if (!btn) return;
    var n = allItems.filter(isUpcoming).length;
    btn.hidden = !n;
    var label = btn.querySelector('span');
    if (label) label.textContent = 'Add ' + (n === 1 ? 'the upcoming event' : 'all ' + n + ' upcoming events') + ' to my calendar';
  }

  function googleUrl(e) {
    var c = calendarTimes(e);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(clean(e.title)) +
      '&dates=' + c.start + '/' + c.end + '&details=' + encodeURIComponent(clean(e.description)) + '&location=' + encodeURIComponent(place(e));
  }

  function mapsUrl(e) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place(e)); }

  function rsvpHtml(e) {
    if (e.rsvpUrl && /^https?:\/\//i.test(e.rsvpUrl)) {
      return '<a class="pe-btn pe-btn--main" href="' + U.escapeHtml(e.rsvpUrl) + '" target="_blank" rel="noopener"><i class="fa-solid fa-ticket"></i> RSVP</a>';
    }
    var msg = 'I plan to attend ' + clean(e.title) + ' on ' + fmt(dateStr(e), { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
    var href = 'contact.html?topic=' + encodeURIComponent('Something else') + (e.ward ? '&ward=' + encodeURIComponent(e.ward) : '') + '&message=' + encodeURIComponent(msg) + '#message';
    return '<a class="pe-btn pe-btn--main" href="' + href + '"><i class="fa-solid fa-hand"></i> Tell us you are coming</a>';
  }

  function fillPanel(e) {
    var s = dateStr(e), up = isUpcoming(e), pic = pictureFor(e);
    var facts = [['Date', fmt(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })], ['Time', e.eventTime || 'All day']];
    if (e.location) facts.push(['Where', e.location]);
    if (e.ward) facts.push(['Ward', e.ward]);
    pdBody.innerHTML =
      '<div class="pd-media pd-media--' + (up ? 'ongoing' : 'planned') + '"><div class="ph"><img src="' + U.escapeHtml(pic.src) + '" alt="">' + (pic.real ? '' : '<span class="hw-illus">Illustrative photo</span>') + '</div></div>' +
      '<div class="pd-main">' +
        '<span class="pd-status pd-status--' + (up ? 'ongoing' : 'planned') + '"><i class="fa-solid fa-circle"></i> ' + (up ? U.escapeHtml(whenText(s)) : 'Past event') + '</span>' +
        '<p class="pd-where">' + U.escapeHtml(e.ward || 'Embakasi South') + '</p>' +
        '<h2 id="pdTitle">' + U.escapeHtml(clean(e.title)) + '</h2>' +
        (window.ApiClient.isPlaceholder(e) ? '<p class="pd-sample">Sample event, shown while the calendar is being set up.</p>' : '') +
        (e.description ? '<p class="pd-summary">' + U.escapeHtml(clean(e.description)) + '</p>' : '') +
        '<dl class="pd-facts pd-facts--compact">' + facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + U.escapeHtml(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
        (up ? '<div class="pe-actions">' + rsvpHtml(e) + '</div>' : '<p class="pd-note">This event has taken place.</p>') +
        '<section class="pd-pledges"><h3>Add it to your calendar</h3>' +
          '<div class="pe-row"><button type="button" class="pe-btn" data-ics="1"><i class="fa-solid fa-download"></i> Download (.ics)</button>' +
          '<a class="pe-btn" href="' + U.escapeHtml(googleUrl(e)) + '" target="_blank" rel="noopener"><i class="fa-brands fa-google"></i> Google Calendar</a></div>' +
          (e.location ? '<a class="pd-link" href="' + U.escapeHtml(mapsUrl(e)) + '" target="_blank" rel="noopener">Open in Maps <i class="fa-solid fa-arrow-up-right-from-square"></i></a>' : '') +
        '</section>' +
        (e.ward ? '<div class="pd-more"><button type="button" class="pd-ward" data-ward="' + U.escapeHtml(e.ward) + '">All events in ' + U.escapeHtml(e.ward) + ' <i class="fa-solid fa-arrow-right"></i></button></div>' : '') +
      '</div>';
    pdBody.scrollTop = 0;
  }

  function currentIds() {
    return allItems.filter(function (e) { return matches(e); }).sort(byDate).map(function (e) { return String(e.id); });
  }

  function updateStepButtons() {
    var ids = currentIds();
    pdPrev.disabled = pdNext.disabled = !(ids.indexOf(String(state.event)) >= 0 && ids.length > 1);
  }

  function openPanel(id, opts) {
    opts = opts || {};
    var e = findEvent(id);
    if (!e) return;
    clearTimeout(pdHideTimer);
    var wasOpen = pdOpen;
    state.event = String(e.id);
    pdOpenerId = opts.opener ? e.id : (wasOpen ? pdOpenerId : e.id);
    if (!wasOpen) pdOpenerEl = opts.opener || null;
    fillPanel(e);
    updateStepButtons();
    if (!opts.fromUrl) {
      try {
        if (wasOpen) { syncUrl(); } else { history.pushState({ ejfPanel: 1 }, '', buildQs()); }
      } catch (err) { /* ignore */ }
    }
    if (wasOpen) return;
    pdOpen = true;
    var gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = gap > 0 ? gap + 'px' : '';
    document.body.style.overflow = 'hidden';
    if (window.ejfScrollLock) window.ejfScrollLock(true);
    pdPanel.hidden = false;
    pdOverlay.hidden = false;
    void pdPanel.offsetWidth;
    pdPanel.classList.add('is-open');
    pdOverlay.classList.add('is-open');
    pdPanel.focus({ preventScroll: true });
  }

  function hidePanel() {
    if (!pdOpen) return;
    pdOpen = false;
    state.event = null;
    pdPanel.classList.remove('is-open');
    pdOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (window.ejfScrollLock) window.ejfScrollLock(false);
    function done() { pdPanel.hidden = true; pdOverlay.hidden = true; }
    if (reduceMotion) { done(); } else { pdHideTimer = setTimeout(done, 280); }
    var back = pdOpenerEl && document.contains(pdOpenerEl) ? pdOpenerEl : (pdOpenerId !== null ? document.querySelector('[data-id="' + pdOpenerId + '"]') : null);
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  function closePanel() {
    if (history.state && history.state.ejfPanel) { history.back(); return; }
    hidePanel();
    syncUrl();
  }

  function step(dir) {
    var ids = currentIds();
    var i = ids.indexOf(String(state.event));
    if (i < 0 || ids.length < 2) return;
    var nextId = ids[(i + dir + ids.length) % ids.length];
    var ne = findEvent(nextId);
    if (state.view === 'calendar' && ne) state.month = monthOf(dateStr(ne));
    openPanel(nextId);
    if (state.view === 'calendar') render();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { resolve(); } else { reject(new Error('copy')); }
    });
  }

  function flashCopy(text, icon) {
    pdCopy.querySelector('span').textContent = text;
    pdCopy.querySelector('i').className = 'fa-solid ' + icon;
    clearTimeout(pdCopyTimer);
    pdCopyTimer = setTimeout(function () {
      pdCopy.querySelector('span').textContent = 'Copy link';
      pdCopy.querySelector('i').className = 'fa-solid fa-link';
    }, 2200);
  }

  function bindPanel() {
    if (!pdPanel) return;
    pdClose.addEventListener('click', closePanel);
    pdOverlay.addEventListener('click', closePanel);
    pdPrev.addEventListener('click', function () { step(-1); });
    pdNext.addEventListener('click', function () { step(1); });
    pdCopy.addEventListener('click', function () {
      var url = new URL(eventHref(state.event), window.location.href).href;
      copyText(url).then(function () { flashCopy('Link copied', 'fa-check'); }, function () { flashCopy('Press Ctrl+C to copy', 'fa-link'); window.prompt('Copy this link', url); });
    });
    pdBody.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target : null;
      if (!t) return;
      if (t.closest('[data-ics]')) { var e = findEvent(state.event); if (e) downloadIcs([e], slug(e.title) + '.ics'); return; }
      var w = t.closest('.pd-ward');
      if (w) {
        state.ward = [w.getAttribute('data-ward')]; state.when = []; state.q = ''; searchEl.value = '';
        closePanel();
        render();
      }
    });
    document.addEventListener('keydown', function (ev) {
      if (!pdOpen) return;
      if (ev.key === 'Escape') { ev.preventDefault(); closePanel(); return; }
      if (ev.key === 'Tab') {
        var f = Array.prototype.filter.call(pdPanel.querySelectorAll('a[href],button:not([disabled])'), function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && (document.activeElement === first || document.activeElement === pdPanel)) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('popstate', function () {
      var e = findEvent(new URLSearchParams(window.location.search).get('event'));
      if (e) { openPanel(e.id, { fromUrl: true }); } else { hidePanel(); syncUrl(); }
    });
  }

  // ----- Wiring -----

  function setState(message, icon) {
    if (!stateEl) return;
    if (!message) { stateEl.hidden = true; return; }
    stateEl.hidden = false;
    stateEl.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + U.escapeHtml(message);
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
    var addAll = document.getElementById('evAddAll');
    if (addAll) addAll.addEventListener('click', function () {
      var up = allItems.filter(isUpcoming).sort(byDate);
      if (up.length) downloadIcs(up, 'embakasi-south-events.ics');
    });
    stateEl.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('tb-inline-clear')) clearAll();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tb-view-btn'), function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        try { localStorage.setItem(VIEW_KEY, state.view); } catch (e) { /* ignore */ }
        render();
      });
    });
    // Calendar controls and events
    calEl.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : null;
      if (!t) return;
      var nav = t.closest('[data-nav]');
      if (nav) { state.month = addMonth(state.month, Number(nav.getAttribute('data-nav'))); render(); return; }
      if (t.closest('[data-today]')) { state.month = monthOf(todayStr()); render(); return; }
      var m = t.closest('[data-month]');
      if (m) { state.month = m.getAttribute('data-month'); render(); return; }
      var ev = t.closest('.cal-ev, .cal-more');
      if (ev) { openPanel(ev.getAttribute('data-id'), { opener: ev }); return; }
      var row = t.closest('.ev');
      if (row) { e.preventDefault(); openPanel(row.getAttribute('data-id'), { opener: row.querySelector('.ev-open') }); }
    });
    // The list view: a click anywhere on an event opens it
    list.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('.ev') : null;
      if (!row) return;
      e.preventDefault();
      openPanel(row.getAttribute('data-id'), { opener: row.querySelector('.ev-open') });
    });
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
        updateAddAll();
        if (state.event) openPanel(state.event, { fromUrl: true });
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
  bindPanel();
  document.addEventListener('DOMContentLoaded', load);
})();
