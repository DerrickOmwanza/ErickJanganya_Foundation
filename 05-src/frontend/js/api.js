// Thin client for the foundation's backend API. Shared by every page that
// reads or writes live data (tracker, promises, contact form, newsletter
// signup, and later news/events/media).
//
// NOTE: API_BASE points at your local backend for now. Once the backend is
// deployed somewhere public, change this one line and every page picks it up.
window.ApiClient = (function () {
  var API_BASE = 'http://localhost:4000/api';

  function buildUrl(path, params) {
    var url = new URL(API_BASE + path);
    if (params) {
      Object.keys(params).forEach(function (key) {
        var val = params[key];
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, val);
        }
      });
    }
    return url.toString();
  }

  function get(path, params) {
    return fetch(buildUrl(path, params)).then(function (res) {
      if (!res.ok) throw new Error('Request failed (' + res.status + ')');
      return res.json();
    });
  }

  function post(path, body) {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
        return data;
      });
    });
  }

  return { get: get, post: post, API_BASE: API_BASE };
})();

// Small shared helpers used by more than one page-specific script.
window.FoundationUtils = (function () {
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatKes(amount) {
    if (amount === null || amount === undefined) return '';
    var n = Number(amount);
    if (n >= 1000000) return 'KES ' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return 'KES ' + (n / 1000).toFixed(0) + 'K';
    return 'KES ' + n.toLocaleString();
  }

  function formatMonthYear(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function relativeTime(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    var seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    var steps = [
      [60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.345, 'week'], [12, 'month'], [Infinity, 'year'],
    ];
    var value = seconds, unit = 'second';
    for (var i = 0; i < steps.length; i++) {
      if (value < steps[i][0]) { unit = steps[i][1]; break; }
      value = value / steps[i][0];
      unit = steps[i][1];
    }
    value = Math.floor(value);
    if (unit === 'second' && value < 30) return 'just now';
    return value + ' ' + unit + (value === 1 ? '' : 's') + ' ago';
  }

  function uniqueSorted(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    });
    return out.sort();
  }

  function fillSelect(select, values, allLabel) {
    if (!select) return;
    var current = select.value;
    var opts = '<option value="">' + allLabel + '</option>';
    values.forEach(function (v) {
      opts += '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>';
    });
    select.innerHTML = opts;
    select.value = current;
  }

  // Skeleton loading placeholders — shimmering cards shaped like the real content, shown while a
  // fetch is in flight instead of a spinner. withImage=false renders the variant with no photo slot
  // (used by promise cards, which never have a photo).
  function skeletonProjCard(withImage) {
    var img = withImage === false ? '' : '<div class="skeleton-img"></div>';
    var bodyStyle = withImage === false ? ' style="padding-top:20px;"' : '';
    return (
      '<div class="card proj-card skeleton-proj-card">' + img +
        '<div class="proj-body"' + bodyStyle + '>' +
          '<div class="skeleton-line skeleton-line--tag"></div>' +
          '<div class="skeleton-line skeleton-line--title"></div>' +
          '<div class="skeleton-line skeleton-line--text"></div>' +
          '<div class="skeleton-line skeleton-line--text short"></div>' +
          '<div class="skeleton-line skeleton-line--pill"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function skeletonProjCards(count, withImage) {
    return Array(count || 3).fill(0).map(function () { return skeletonProjCard(withImage); }).join('');
  }

  function skeletonSplitCard() {
    return (
      '<div class="skeleton-split">' +
        '<div class="skeleton-img"></div>' +
        '<div class="skeleton-body">' +
          '<div class="skeleton-line skeleton-line--tag"></div>' +
          '<div class="skeleton-line skeleton-line--title"></div>' +
          '<div class="skeleton-line skeleton-line--text"></div>' +
          '<div class="skeleton-line skeleton-line--pill"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function skeletonSplitCards(count) {
    return Array(count || 3).fill(0).map(skeletonSplitCard).join('');
  }

  return {
    escapeHtml: escapeHtml,
    formatKes: formatKes,
    formatMonthYear: formatMonthYear,
    relativeTime: relativeTime,
    uniqueSorted: uniqueSorted,
    fillSelect: fillSelect,
    skeletonProjCards: skeletonProjCards,
    skeletonSplitCards: skeletonSplitCards,
  };
})();
