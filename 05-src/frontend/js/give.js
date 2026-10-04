/* Give and help dialog (Get Involved page).
 *
 * The donate widget (#dnWidget) picks a frequency, currency and amount, and opens a two-panel dialog (#dnOverlay). The same dialog
 * is used by the Volunteer / Partner / Donate goods rows (buttons with data-mode).
 *
 * ONLINE PAYMENT IS NOT INTEGRATED. Nothing here collects card numbers or moves money. A cash gift is recorded as a PLEDGE
 * (amount, frequency, preferred method, contact details) and posted to the existing /api/contact endpoint, and every screen says
 * that nothing is charged. When a payment provider is chosen, replace the "method" step with its checkout and remove that wording.
 */
(function () {
  'use strict';

  var widget = document.getElementById('dnWidget');
  var overlay = document.getElementById('dnOverlay');
  if (!widget || !overlay) return;

  var modal = document.getElementById('dnModal');
  var bodyEl = document.getElementById('dnBody');
  var titleEl = document.getElementById('dnTitle');
  var backBtn = document.getElementById('dnBack');
  var bar = document.getElementById('dnBar');
  var sideText = document.getElementById('dnSideText');
  var sideStrong = document.getElementById('dnSideStrong');

  var AMOUNTS = {
    KES: [500, 1000, 2500, 5000, 10000, 20000],
    USD: [5, 10, 25, 50, 100, 250],
    GBP: [5, 10, 25, 50, 100, 250],
    EUR: [5, 10, 25, 50, 100, 250]
  };
  var DEFAULT_INDEX = 2;

  var METHODS = [
    { id: 'Card', label: 'Credit or debit card', icon: 'fa-credit-card' },
    { id: 'M-Pesa', label: 'M-Pesa', icon: 'fa-mobile-screen-button' },
    { id: 'Bank transfer', label: 'Bank transfer', icon: 'fa-building-columns' },
    { id: 'PayPal', label: 'PayPal', icon: 'fa-paypal' }
  ];

  var MODES = {
    cash: {
      label: 'Give cash',
      side: 'Your gift will help build work you can see and follow in Embakasi South, wherever in the world you give from.',
      strong: 'Become a monthly supporter and help the team plan projects with confidence.'
    },
    volunteer: {
      label: 'Volunteer',
      side: 'Time on the ground is how promises become projects. Tell us where you can help and the team will be in touch.',
      strong: 'Every volunteer is matched to a ward and a real task.',
      what: 'How would you like to volunteer?',
      chips: ['Ward events', 'Site visits', 'Spreading the word', 'A professional skill', 'Anything that helps'],
      noteLabel: 'Anything the team should know? (optional)',
      ward: true
    },
    partner: {
      label: 'Partner with us',
      side: 'Partners back real, ward-level work they can check for themselves, from anywhere in the world.',
      strong: 'Every project is public, dated and labelled with who funded it.',
      what: 'Who are you partnering as?',
      chips: ['Diaspora group', 'Development organisation', 'Mission-aligned investor', 'Company', 'Something else'],
      noteLabel: 'Tell us about your organisation and what you have in mind (optional)'
    },
    goods: {
      label: 'Donate goods',
      side: 'Materials and supplies can reach a project faster than money. Tell us what you have and where it could go.',
      strong: 'The team will say where your goods can be used before anything is moved.',
      what: 'What would you like to give?',
      chips: ['Building materials', 'School supplies', 'Medical supplies', 'Equipment', 'Food or essentials', 'Something else'],
      noteLabel: 'What do you have, and roughly how much? (optional)'
    }
  };

  var S = null;           // dialog state
  var lastFocus = null;
  var W = { freq: 'monthly', cur: 'KES', amount: AMOUNTS.KES[DEFAULT_INDEX] };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) {
    try { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n); } catch (e) { return String(n); }
  }
  function money(n, cur, monthly) { return fmt(n) + ' ' + cur + (monthly ? ' / month' : ''); }
  function nice(v, cur) {
    var step = v >= 1000 ? 50 : v >= 100 ? 10 : 1;
    if (cur !== 'KES' && v >= 100) step = 5;
    return Math.max(1, Math.round(v / step) * step);
  }

  /* ---------- the widget ---------- */
  var amountsEl = document.getElementById('dnAmounts');
  var amountInput = document.getElementById('dnAmount');
  var curSelect = document.getElementById('dnCurrency');
  var widgetErr = document.getElementById('dnWidgetErr');

  function renderAmounts() {
    var list = AMOUNTS[W.cur];
    amountsEl.innerHTML = list.map(function (n) {
      return '<button type="button" class="dn-amt" data-amount="' + n + '" aria-pressed="' + (n === W.amount) + '">' + esc(fmt(n)) + ' ' + W.cur + '</button>';
    }).join('');
    amountInput.value = W.amount ? String(W.amount) : '';
  }
  function setFreq(f) {
    W.freq = f;
    Array.prototype.forEach.call(widget.querySelectorAll('.dn-seg-btn'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-freq') === f));
    });
  }
  function parseAmount(v) {
    var n = parseFloat(String(v).replace(/[^\d.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  Array.prototype.forEach.call(widget.querySelectorAll('.dn-seg-btn'), function (b) {
    b.addEventListener('click', function () { setFreq(b.getAttribute('data-freq')); });
  });
  amountsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.dn-amt');
    if (!b) return;
    W.amount = Number(b.getAttribute('data-amount'));
    widgetErr.textContent = '';
    renderAmounts();
  });
  amountInput.addEventListener('input', function () {
    W.amount = parseAmount(amountInput.value);
    widgetErr.textContent = '';
    Array.prototype.forEach.call(amountsEl.querySelectorAll('.dn-amt'), function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-amount')) === W.amount));
    });
  });
  curSelect.addEventListener('change', function () {
    W.cur = curSelect.value;
    W.amount = AMOUNTS[W.cur][DEFAULT_INDEX];
    renderAmounts();
  });
  widget.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!(W.amount > 0)) { widgetErr.textContent = 'Please choose or enter an amount.'; amountInput.focus(); return; }
    open('cash', e.submitter || widget.querySelector('.dn-go'));
  });
  renderAmounts();

  /* ---------- the dialog ---------- */
  function stepsFor() {
    if (S.mode === 'cash') return (S.freq === 'once' ? ['upsell'] : []).concat(['details', 'method', 'done']);
    return ['what', 'details', 'confirm', 'done'];
  }
  function titleFor(step) {
    if (step === 'upsell') return 'Become a monthly supporter';
    if (step === 'what') return MODES[S.mode].label;
    if (step === 'details') return 'Enter your details';
    if (step === 'method') return 'Choose how to give';
    if (step === 'confirm') return 'Check and send';
    return 'Thank you';
  }

  function open(mode, trigger) {
    S = {
      mode: mode, freq: W.freq, cur: W.cur, amount: W.amount,
      picks: [], note: '', ward: '', first: '', last: '', email: '', phone: '', consent: false, method: '', step: ''
    };
    lastFocus = trigger || document.activeElement;
    sideText.textContent = MODES[mode].side;
    sideStrong.textContent = MODES[mode].strong;
    overlay.hidden = false;
    if (window.ejfScrollLock) window.ejfScrollLock(true);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    go(stepsFor()[0]);
  }
  function close() {
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    if (window.ejfScrollLock) window.ejfScrollLock(false);
    S = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }

  function go(step) {
    S.step = step;
    var steps = stepsFor();
    var i = steps.indexOf(step);
    titleEl.textContent = titleFor(step);
    backBtn.style.visibility = (i > 0 && step !== 'done') ? 'visible' : 'hidden';
    bar.style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
    bodyEl.innerHTML = render(step);
    bodyEl.scrollTop = 0;
    bind(step);
    var first = bodyEl.querySelector('input:not([type=checkbox]):not([type=radio]), textarea, button, [tabindex]');
    if (step === 'done') { bodyEl.setAttribute('tabindex', '-1'); bodyEl.focus(); }
    else if (first) { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function back() {
    var steps = stepsFor();
    var i = steps.indexOf(S.step);
    if (i > 0) go(steps[i - 1]);
  }

  function giftText() { return money(S.amount, S.cur, S.freq === 'monthly'); }

  function render(step) {
    var m = MODES[S.mode];
    if (step === 'upsell') {
      var m1 = nice(S.amount * 0.4, S.cur), m2 = nice(S.amount * 0.2, S.cur);
      if (m2 >= m1) m2 = Math.max(1, m1 - 1);
      S.upsell = [m1, m2];
      return '<p class="dn-lead">Will you turn your <b>' + esc(fmt(S.amount) + ' ' + S.cur) + '</b> gift into a monthly one? Your ongoing support helps the team plan projects with confidence.</p>' +
        '<div class="dn-actions">' +
        '<button type="button" class="dn-btn dn-btn--red" data-monthly="0"><i class="fa-solid fa-heart" aria-hidden="true"></i> Give ' + esc(fmt(m1) + ' ' + S.cur) + ' a month</button>' +
        '<button type="button" class="dn-btn dn-btn--blue" data-monthly="1">Give ' + esc(fmt(m2) + ' ' + S.cur) + ' a month</button>' +
        '<button type="button" class="dn-textlink" data-keep>No, keep my one-time ' + esc(fmt(S.amount) + ' ' + S.cur) + ' gift</button>' +
        '</div>';
    }
    if (step === 'what') {
      var chips = m.chips.map(function (c) {
        return '<label class="vi-chip"><input type="checkbox" name="pick" value="' + esc(c) + '"' + (S.picks.indexOf(c) > -1 ? ' checked' : '') + '><span>' + esc(c) + '</span></label>';
      }).join('');
      var wards = '';
      if (m.ward) {
        wards = '<fieldset class="dn-group"><legend>Which ward? <em>Optional</em></legend><div class="vi-chips">' +
          ['Imara Daima', 'Kwa Njenga', 'Kwa Reuben', 'Pipeline', 'Kware', 'Anywhere'].map(function (w) {
            return '<label class="vi-chip"><input type="radio" name="ward" value="' + w + '"' + (S.ward === w ? ' checked' : '') + '><span>' + w + '</span></label>';
          }).join('') + '</div></fieldset>';
      }
      return '<form class="dn-form" novalidate>' +
        '<fieldset class="dn-group"><legend>' + esc(m.what) + ' <em>Choose any</em></legend><div class="vi-chips">' + chips + '</div></fieldset>' +
        wards +
        '<label class="dn-label" for="dnNote">' + esc(m.noteLabel) + '</label>' +
        '<textarea id="dnNote" class="dn-input dn-textarea" rows="3" maxlength="1200">' + esc(S.note) + '</textarea>' +
        '<span class="dn-err" role="alert"></span>' +
        '<div class="dn-actions"><button type="submit" class="dn-btn dn-btn--blue">Continue</button></div></form>';
    }
    if (step === 'details') {
      return '<form class="dn-form" novalidate>' +
        '<div class="dn-fields">' +
        '<input class="dn-input" type="text" name="first" placeholder="First name" aria-label="First name" autocomplete="given-name" value="' + esc(S.first) + '">' +
        '<input class="dn-input" type="text" name="last" placeholder="Last name" aria-label="Last name" autocomplete="family-name" value="' + esc(S.last) + '">' +
        '<input class="dn-input" type="email" name="email" placeholder="Email address" aria-label="Email address" autocomplete="email" value="' + esc(S.email) + '">' +
        '<input class="dn-input" type="tel" name="phone" placeholder="Phone, with country code (optional)" aria-label="Phone, optional" autocomplete="tel" value="' + esc(S.phone) + '">' +
        '</div>' +
        '<label class="dn-check"><input type="checkbox" name="consent"' + (S.consent ? ' checked' : '') + '><span>I agree that the team may contact me about ' + (S.mode === 'cash' ? 'my gift' : 'my offer') + '.</span></label>' +
        '<span class="dn-err" role="alert"></span>' +
        '<div class="dn-actions"><button type="submit" class="dn-btn dn-btn--blue">Continue</button></div></form>';
    }
    if (step === 'method') {
      var list = METHODS.map(function (x) {
        var icon = x.id === 'PayPal' ? 'fa-brands' : 'fa-solid';
        return '<label class="dn-method"><input type="radio" name="method" value="' + x.id + '"' + (S.method === x.id ? ' checked' : '') + '><i class="' + icon + ' ' + x.icon + '" aria-hidden="true"></i><span>' + x.label + '</span></label>';
      }).join('');
      return '<form class="dn-form" novalidate>' +
        '<p class="dn-banner"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>Secure online payment is being set up. Choose how you would like to give and the team will send you the details. <b>Nothing is charged now.</b></span></p>' +
        '<div class="dn-methods" role="radiogroup" aria-label="Preferred way to give">' + list + '</div>' +
        '<span class="dn-err" role="alert"></span>' +
        '<div class="dn-total"><span>Your gift</span><b>' + esc(giftText()) + '</b></div>' +
        '<div class="dn-actions"><button type="submit" class="dn-btn dn-btn--blue">Send my pledge</button></div></form>';
    }
    if (step === 'confirm') {
      var rows = '<li><span>Offer</span><b>' + esc(m.label) + '</b></li>' +
        (S.picks.length ? '<li><span>' + (S.mode === 'goods' ? 'Goods' : 'Details') + '</span><b>' + esc(S.picks.join(', ')) + '</b></li>' : '') +
        (S.ward ? '<li><span>Ward</span><b>' + esc(S.ward) + '</b></li>' : '') +
        '<li><span>From</span><b>' + esc((S.first + ' ' + S.last).trim()) + '</b></li>' +
        '<li><span>Email</span><b>' + esc(S.email) + '</b></li>';
      return '<form class="dn-form" novalidate>' +
        '<ul class="dn-summary">' + rows + '</ul>' +
        '<span class="dn-err" role="alert"></span>' +
        '<div class="dn-actions"><button type="submit" class="dn-btn dn-btn--blue">Send to the team</button></div></form>';
    }
    // done
    var what = S.mode === 'cash'
      ? 'Your pledge of <b>' + esc(giftText()) + '</b> has been received. Nothing has been charged. The team will email you how to complete it by ' + esc(({ 'Card': 'card', 'Bank transfer': 'bank transfer' })[S.method] || S.method) + '.'
      : 'Your offer has been received. The team will be in touch.';
    return '<div class="dn-done"><span class="dn-done-icon" aria-hidden="true"><i class="fa-solid fa-check"></i></span>' +
      '<h3>Thank you, ' + esc(S.first || 'friend') + '.</h3><p>' + what + '</p>' +
      '<div class="dn-actions"><button type="button" class="dn-btn dn-btn--blue" data-done>Close</button></div></div>';
  }

  function setErr(msg) {
    var el = bodyEl.querySelector('.dn-err');
    if (el) el.textContent = msg;
  }

  function bind(step) {
    var form = bodyEl.querySelector('form');
    if (step === 'upsell') {
      Array.prototype.forEach.call(bodyEl.querySelectorAll('[data-monthly]'), function (b) {
        b.addEventListener('click', function () {
          S.freq = 'monthly';
          S.amount = S.upsell[Number(b.getAttribute('data-monthly'))];
          go('details');
        });
      });
      bodyEl.querySelector('[data-keep]').addEventListener('click', function () { go('details'); });
    } else if (step === 'what') {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        S.picks = Array.prototype.map.call(form.querySelectorAll('input[name=pick]:checked'), function (i) { return i.value; });
        var w = form.querySelector('input[name=ward]:checked');
        S.ward = w ? w.value : '';
        S.note = form.querySelector('#dnNote').value;
        if (!S.picks.length) { setErr('Please choose at least one option.'); return; }
        go('details');
      });
      // a ward chip can be tapped again to clear it
      Array.prototype.forEach.call(form.querySelectorAll('input[name=ward]'), function (r) {
        r._was = r.checked;
        r.addEventListener('click', function () {
          if (r._was) { r.checked = false; r._was = false; }
          else { Array.prototype.forEach.call(form.querySelectorAll('input[name=ward]'), function (o) { o._was = false; }); r._was = true; }
        });
      });
    } else if (step === 'details') {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        S.first = form.first.value.trim(); S.last = form.last.value.trim();
        S.email = form.email.value.trim(); S.phone = form.phone.value.trim();
        S.consent = form.consent.checked;
        if (!S.first) { setErr('Please add your first name.'); form.first.focus(); return; }
        if (!S.email) { setErr('Please add your email address.'); form.email.focus(); return; }
        if (form.email.validity.typeMismatch) { setErr("That email address doesn't look right."); form.email.focus(); return; }
        if (!S.consent) { setErr('Please tick the box so the team can contact you.'); return; }
        go(S.mode === 'cash' ? 'method' : 'confirm');
      });
    } else if (step === 'method') {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var r = form.querySelector('input[name=method]:checked');
        if (!r) { setErr('Please choose how you would like to give.'); return; }
        S.method = r.value;
        send(form);
      });
    } else if (step === 'confirm') {
      form.addEventListener('submit', function (e) { e.preventDefault(); send(form); });
    } else if (step === 'done') {
      bodyEl.querySelector('[data-done]').addEventListener('click', close);
    }
  }

  function send(form) {
    var btn = form.querySelector('button[type=submit]');
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending...';
    setErr('');
    var name = (S.first + ' ' + S.last).trim();
    var subject, message;
    if (S.mode === 'cash') {
      subject = 'Donation pledge: ' + fmt(S.amount) + ' ' + S.cur + (S.freq === 'monthly' ? ' monthly' : ' one-time');
      message = 'Pledge: ' + giftText() + '\nPreferred method: ' + S.method + '\nNothing has been charged. Follow up with payment details.';
    } else {
      subject = 'Get involved: ' + MODES[S.mode].label + (S.ward ? ', ' + S.ward : '');
      message = (S.note.trim() ? S.note.trim() + '\n\n' : '') + 'Way to help: ' + MODES[S.mode].label +
        (S.picks.length ? '\nDetails: ' + S.picks.join(', ') : '') + (S.ward ? '\nWard: ' + S.ward : '');
    }
    window.ApiClient.post('/contact', { name: name, email: S.email, phone: S.phone, subject: subject, message: message })
      .then(function () { go('done'); })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = label;
        setErr((err && err.message) || 'Something went wrong. Please try again.');
      });
  }

  /* ---------- wiring ---------- */
  backBtn.addEventListener('click', back);
  document.getElementById('dnClose').addEventListener('click', close);
  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex="-1"]');
      f = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null && el.getAttribute('tabindex') !== '-1'; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      if (mode === 'cash') {
        var t = document.getElementById('donate');
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      open(mode, btn);
    });
  });
})();
