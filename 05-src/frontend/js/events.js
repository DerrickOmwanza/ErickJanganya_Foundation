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

  function render() {
    var upcoming = allItems.filter(isUpcoming).sort(function (a, b) { return dateStr(a) < dateStr(b) ? -1 : 1; });
    var past = allItems.filter(function (e) { return !isUpcoming(e); }).sort(function (a, b) { return dateStr(a) < dateStr(b) ? 1 : -1; });
    var html = '';
    if (upcoming.length) {
      html += group('Upcoming', upcoming.length, '<div class="ev-list">' + upcoming.map(function (e) { return renderEvent(e, true); }).join('') + '</div>');
    } else {
      html += group('Upcoming', 0, '', '<div class="ev-empty"><i class="fa-regular fa-calendar" aria-hidden="true"></i><div><b>No events are coming up right now.</b>' +
        '<p>New events appear here as soon as they are scheduled. Subscribe and we will tell you.</p>' +
        '<a class="btn btn-primary" href="index.html#stay-updated"><i class="fa-solid fa-bell"></i> Get notified</a></div></div>');
    }
    if (past.length) html += group('Past', past.length, '<div class="ev-list">' + past.map(function (e) { return renderEvent(e, false); }).join('') + '</div>');
    list.innerHTML = html;
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
          setState('No events have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        render();
      })
      .catch(function (err) {
        console.error('Failed to load events:', err);
        renderGlance([], true);
        list.innerHTML = '';
        setState('Could not load the events right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  document.addEventListener('DOMContentLoaded', load);
})();
