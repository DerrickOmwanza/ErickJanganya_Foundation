// The News & Media page, driven by the live API: the hero "at a glance" panel, the newest story featured, a filter toolbar (kind of
// story, search) and the remaining stories as cards. A story's date is a plain calendar date, so it is compared and shown as a
// date string and never shifted by a time zone. Requires api.js (window.ApiClient, window.FoundationUtils) to be loaded first.
(function () {
  var grid = document.getElementById('nwGrid');
  if (!grid) return; // not on this page

  var featEl = document.getElementById('nwFeature');
  var stateEl = document.getElementById('nwState');
  var filtersEl = document.getElementById('nwFilters');
  var searchEl = document.getElementById('nwSearch');
  var countEl = document.getElementById('nwCount');
  var clearBtn = document.getElementById('nwClear');
  var U = window.FoundationUtils;

  // sourceType in the database -> what visitors see
  var TYPES = [
    { key: 'Foundation', label: 'From the Foundation', short: 'Foundation' },
    { key: 'Press', label: 'In the press', short: 'Press' },
    { key: 'Statement', label: 'Statement', short: 'Statements' }
  ];
  var allItems = [];
  var state = { q: '', type: [] };

  // ----- Helpers -----

  function dateStr(n) { return String(n.publishedOn || '').slice(0, 10); }
  function asUtc(s) { var p = s.split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function fmt(s, opts) { return new Date(asUtc(s)).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, opts)); }
  function longDate(s) { return fmt(s, { day: 'numeric', month: 'long', year: 'numeric' }); }
  function newestFirst(a, b) { return dateStr(a) < dateStr(b) ? 1 : (dateStr(a) > dateStr(b) ? -1 : 0); }
  // Titles and summaries come from the database; keep dashes out of visible copy.
  function clean(t) { return String(t || '').replace(/\s[–—]\s/g, ': ').replace(/[–—]/g, '-'); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function typeOf(n) {
    for (var i = 0; i < TYPES.length; i++) { if (TYPES[i].key === n.sourceType) return TYPES[i]; }
    return { key: n.sourceType || 'Foundation', label: n.sourceType || 'Update', short: n.sourceType || 'Update' };
  }
  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }
  function tagClass(n) { return 'nw-tag nw-tag--' + String(typeOf(n).key).toLowerCase(); }

  // ----- Pictures -----
  // A story's own image (imageUrl) wins. Until then a picture is chosen from what it is about; real campaign photos where they
  // fit, illustrative stand-ins elsewhere (labelled on the picture).
  var PICTURES = [
    [/forum|town hall|baraza|meeting|gathering|listen/i, 'img/community-forum.jpg', true],
    [/medical|health|clinic|outreach|camp|hospital/i, 'img/hero-clinics-poster.jpg', false],
    [/drain|road|bridge|footbridge|construction|project|infrastructure|complete/i, 'img/focus-infrastructure.jpg', false],
    [/school|education|bursar|classroom/i, 'img/vision-education-youth.jpg', false],
    [/water|sanitation|borehole/i, 'img/hero-water-poster.jpg', false],
    [/youth|jobs|skills|enterprise|training/i, 'img/focus-youth.jpg', false],
    [/distribution|donat|supplies|goods/i, 'img/ground-verification.jpg', true]
  ];
  var BY_TYPE = {
    Foundation: { src: 'img/ground-engagement.jpg', real: true },
    Press: { src: 'img/2022-campaign.jpg', real: true },
    Statement: { src: 'img/value-transparency.jpg', real: false }
  };
  function pictureFor(n) {
    if (n.imageUrl) return { src: n.imageUrl, real: true };
    var texts = [n.title || '', n.summary || ''];
    for (var t = 0; t < texts.length; t++) {
      for (var i = 0; i < PICTURES.length; i++) {
        if (PICTURES[i][0].test(texts[t])) return { src: PICTURES[i][1], real: PICTURES[i][2] };
      }
    }
    return BY_TYPE[n.sourceType] || BY_TYPE.Foundation;
  }
  function photo(n, cls) {
    var p = pictureFor(n);
    return '<div class="' + cls + '"><img src="' + U.escapeHtml(p.src) + '" alt="" loading="lazy">' +
      (n.imageUrl ? '' : '<span class="hw-illus' + (p.real ? ' hw-illus--real' : '') + '">' + (p.real ? 'Embakasi South' : 'Illustrative photo') + '</span>') + '</div>';
  }

  // ----- Hero "at a glance" panel -----

  function renderGlance(items, failed) {
    var panel = document.getElementById('nwGlance');
    if (!panel) return;
    var $ = function (id) { return document.getElementById(id); };
    var note = $('ngNote');
    panel.classList.remove('is-loading');
    if (failed) {
      $('ngTotal').textContent = '0';
      $('ngLatestTitle').textContent = 'Not available right now';
      $('ngLatestMeta').textContent = '';
      ['ngFoundation', 'ngPress', 'ngStatement'].forEach(function (id) { $(id).textContent = '0'; });
      note.hidden = false;
      note.textContent = 'The live figures could not be loaded right now.';
      return;
    }
    var sorted = items.slice().sort(newestFirst);
    var count = function (k) { return items.filter(function (n) { return n.sourceType === k; }).length; };
    $('ngTotal').textContent = items.length;
    $('ngTotalLabel').textContent = items.length === 1 ? 'story published' : 'stories published';
    $('ngFoundation').textContent = count('Foundation');
    $('ngPress').textContent = count('Press');
    $('ngStatement').textContent = count('Statement');
    $('ngSample').hidden = !items.some(window.ApiClient.isPlaceholder);
    if (sorted.length) {
      var l = sorted[0];
      $('ngLatestTitle').textContent = clean(l.title);
      $('ngLatestMeta').textContent = longDate(dateStr(l)) + ', ' + typeOf(l).label.toLowerCase();
      note.hidden = true;
    } else {
      $('ngLatestTitle').textContent = 'Nothing published yet';
      $('ngLatestMeta').textContent = '';
      note.hidden = false;
      note.textContent = 'No stories have been published yet. Check back soon.';
    }
  }

  // ----- Stories -----

  function titleHtml(n) {
    var t = U.escapeHtml(clean(n.title));
    if (n.externalUrl) return '<a class="nw-open" href="' + U.escapeHtml(n.externalUrl) + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
    return '<span class="nw-open">' + t + '</span>';
  }
  function sourceLine(n) {
    if (!n.externalUrl) return '';
    var h = host(n.externalUrl);
    return '<span class="nw-source"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>' + (h ? 'Read at ' + U.escapeHtml(h) : 'Read the full story') + '</span>';
  }

  function renderFeature(n) {
    return '<article class="nw-feature" data-id="' + U.escapeHtml(String(n.id)) + '">' +
      photo(n, 'nw-feature-photo') +
      '<div class="nw-feature-body">' +
        '<div class="nw-meta"><span class="' + tagClass(n) + '">' + U.escapeHtml(typeOf(n).label) + '</span><time datetime="' + U.escapeHtml(dateStr(n)) + '">' + U.escapeHtml(longDate(dateStr(n))) + '</time></div>' +
        '<h3>' + titleHtml(n) + '</h3>' +
        (n.summary ? '<p>' + U.escapeHtml(clean(n.summary)) + '</p>' : '') +
        sourceLine(n) +
      '</div></article>';
  }

  function renderCard(n) {
    return '<article class="nw-card" data-id="' + U.escapeHtml(String(n.id)) + '">' +
      photo(n, 'nw-card-photo') +
      '<div class="nw-card-body">' +
        '<div class="nw-meta"><span class="' + tagClass(n) + '">' + U.escapeHtml(typeOf(n).label) + '</span><time datetime="' + U.escapeHtml(dateStr(n)) + '">' + U.escapeHtml(longDate(dateStr(n))) + '</time></div>' +
        '<h3>' + titleHtml(n) + '</h3>' +
        (n.summary ? '<p>' + U.escapeHtml(clean(n.summary)) + '</p>' : '') +
        sourceLine(n) +
      '</div></article>';
  }

  // ----- Filters -----
  // State lives in the address: news.html?type=press,statement&q=drain. With no chip chosen, everything shows.

  function hasFilters() { return !!(state.q || state.type.length); }
  function matches(n, skip) {
    if (skip !== 'type' && state.type.length && state.type.indexOf(n.sourceType) < 0) return false;
    if (state.q) {
      var hay = [n.title, n.summary, n.body].join(' ').toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }
  function updateChips() {
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.tb-chip'), function (chip) {
      var v = chip.getAttribute('data-value');
      var on = state.type.indexOf(v) >= 0;
      var n = allItems.filter(function (s) { return matches(s, 'type') && s.sourceType === v; }).length;
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      chip.classList.toggle('is-empty', n === 0 && !on);
      chip.querySelector('.tb-n').textContent = n;
    });
  }
  function buildQs() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.type.length) params.set('type', state.type.map(function (k) { return k.toLowerCase(); }).join(','));
    var qs = params.toString();
    return window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  }
  function syncUrl() {
    try { history.replaceState(history.state, '', buildQs()); } catch (e) { /* ignore */ }
  }
  function setState(message, icon) {
    if (!message) { stateEl.hidden = true; return; }
    stateEl.hidden = false;
    stateEl.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + U.escapeHtml(message);
  }

  function render() {
    var filtered = allItems.filter(function (n) { return matches(n); }).sort(newestFirst);
    countEl.textContent = hasFilters() ? 'Showing ' + filtered.length + ' of ' + plural(allItems.length, 'story').replace('storys', 'stories') : plural(allItems.length, 'story').replace('storys', 'stories');
    clearBtn.hidden = !hasFilters();
    updateChips();
    syncUrl();
    if (!filtered.length) {
      featEl.innerHTML = '';
      grid.innerHTML = '';
      stateEl.hidden = false;
      stateEl.innerHTML = '<i class="fa-solid fa-inbox"></i>No stories match these filters. <button type="button" class="tb-inline-clear">Clear filters</button>';
      return;
    }
    setState(null);
    // The newest story leads, but only while nothing narrows the list: a filtered list is just the matching cards.
    var lead = hasFilters() ? null : filtered[0];
    var rest = lead ? filtered.slice(1) : filtered;
    featEl.innerHTML = lead ? renderFeature(lead) : '';
    grid.innerHTML = rest.map(renderCard).join('');
    grid.hidden = !rest.length;
  }

  function clearAll() {
    state.q = ''; state.type = [];
    searchEl.value = '';
    render();
  }

  function buildChips() {
    filtersEl.innerHTML = '<div class="tb-group"><span class="tb-label" id="nwl-type">Type</span>' +
      '<div class="tb-chips" role="group" aria-labelledby="nwl-type">' + TYPES.map(function (t) {
        return '<button type="button" class="tb-chip" data-group="type" data-value="' + t.key + '" aria-pressed="false">' + U.escapeHtml(t.label) + ' <span class="tb-n">0</span></button>';
      }).join('') + '</div></div>';
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    var t = params.get('type');
    if (t) state.type = TYPES.map(function (x) { return x.key; }).filter(function (k) { return t.toLowerCase().split(',').indexOf(k.toLowerCase()) >= 0; });
    var q = params.get('q');
    if (q) { state.q = q.trim().toLowerCase(); searchEl.value = q.trim(); }
  }

  function bind() {
    filtersEl.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.tb-chip') : null;
      if (!chip) return;
      var v = chip.getAttribute('data-value');
      var i = state.type.indexOf(v);
      if (i >= 0) { state.type.splice(i, 1); } else { state.type.push(v); }
      render();
    });
    var timer = null;
    searchEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = searchEl.value.trim().toLowerCase(); render(); }, 150);
    });
    clearBtn.addEventListener('click', clearAll);
    stateEl.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.tb-inline-clear')) clearAll();
    });
  }

  function load() {
    setState(null);
    grid.innerHTML = U.skeletonProjCards(3, true);
    window.ApiClient.get('/news', { limit: 200 })
      .then(function (data) {
        allItems = window.ApiClient.realOnly(data.items || []);
        renderGlance(allItems, false);
        grid.innerHTML = '';
        if (!allItems.length) {
          countEl.textContent = '0 stories';
          setState('No stories have been published yet. Check back soon.', 'fa-inbox');
          return;
        }
        buildChips();
        readUrl();
        render();
      })
      .catch(function (err) {
        console.error('Failed to load news:', err);
        renderGlance([], true);
        grid.innerHTML = '';
        countEl.textContent = 'Stories unavailable';
        setState('Could not load the stories right now. Make sure the backend is running, then refresh.', 'fa-triangle-exclamation');
      });
  }

  bind();
  document.addEventListener('DOMContentLoaded', load);
})();
