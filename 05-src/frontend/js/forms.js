// Wires the newsletter signup (index.html, #stay-updated) and the contact
// form (contact.html) to the live API. Requires api.js to be loaded first.
// Both blocks guard on the relevant element existing, so this file is safe
// to include on any page.
(function () {
  function showNote(el, message, kind) {
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.className = 'form-note form-note--' + kind;
  }

  function withBusyButton(form, busyLabel, task) {
    var btn = form.querySelector('button[type="submit"]');
    var originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + busyLabel;
    }
    return task().finally(function () {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });
  }

  // Newsletter signup
  var newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    var newsletterNote = document.getElementById('newsletterNote');
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        firstName: newsletterForm.firstName.value.trim(),
        lastName: newsletterForm.lastName.value.trim(),
        email: newsletterForm.email.value.trim(),
        zip: newsletterForm.zip.value.trim(),
        phone: newsletterForm.phone.value.trim(),
        agreedToTerms: newsletterForm.agreedToTerms.checked,
      };
      if (!payload.firstName || !payload.lastName || !payload.email) {
        showNote(newsletterNote, 'Please enter your first name, last name, and email.', 'error');
        return;
      }
      if (!payload.agreedToTerms) {
        showNote(newsletterNote, 'Please agree to the Terms of Service to subscribe.', 'error');
        return;
      }
      withBusyButton(newsletterForm, 'Subscribing…', function () {
        return window.ApiClient.post('/newsletter', payload)
          .then(function () {
            showNote(newsletterNote, "You're subscribed. Thank you.", 'success');
            newsletterForm.reset();
          })
          .catch(function (err) {
            showNote(newsletterNote, err.message || 'Something went wrong. Please try again.', 'error');
          });
      });
    });
  }

  // Vision page "Tell us what's missing" form. Reuses the contact endpoint (no backend change): the ward and
  // topic go in the subject and at the end of the message so submissions can be sorted. Smooth-flow details:
  // chip radios that can be unselected, a message box that grows with a character counter, validation as you
  // leave each field (and focus on the first problem on submit), a draft that survives a refresh, a ward chosen
  // on the map above pre-selecting here, and a thank-you panel in place of the form once it is sent.
  var visionForm = document.getElementById('visionInputForm');
  if (visionForm) {
    (function () {
      var note = document.getElementById('visionInputNote');
      var success = document.getElementById('viSuccess');
      var counter = document.getElementById('vi-count');
      var DRAFT_KEY = 'ejf.vision.draft';
      var MAX = 1000;
      var wardTouched = false;
      var fields = {
        message: { el: visionForm.message, wrap: visionForm.message.closest('.vi-field'), err: document.getElementById('vi-message-err') },
        name: { el: visionForm.elements.name, wrap: visionForm.elements.name.closest('.vi-field'), err: document.getElementById('vi-name-err') },
        email: { el: visionForm.email, wrap: visionForm.email.closest('.vi-field'), err: document.getElementById('vi-email-err') }
      };

      function problem(key) {
        var el = fields[key].el, v = el.value.trim();
        if (key === 'message') return v ? '' : 'Tell us what to include. A few words is enough.';
        if (key === 'name') return v ? '' : 'Please add your name.';
        if (!v) return 'Please add your email.';
        return el.validity.typeMismatch ? "That email address doesn't look right." : '';
      }
      function show(key, msg) {
        var f = fields[key];
        f.err.textContent = msg;
        f.wrap.classList.toggle('has-error', !!msg);
        if (msg) { f.el.setAttribute('aria-invalid', 'true'); } else { f.el.removeAttribute('aria-invalid'); }
      }
      function grow() {
        var t = fields.message.el;
        t.style.height = 'auto';
        t.style.height = Math.max(t.scrollHeight + 2, 132) + 'px';
        var n = t.value.length;
        counter.textContent = n + ' / ' + MAX;
        counter.classList.toggle('is-near', n >= MAX - 100);
      }
      function saveDraft() {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            ward: visionForm.ward.value, topic: visionForm.topic.value,
            message: fields.message.el.value, name: fields.name.el.value, email: fields.email.el.value
          }));
        } catch (e) { /* storage unavailable: the form simply works without a saved draft */ }
      }
      function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
      function setRadio(name, value) {
        Array.prototype.forEach.call(visionForm.querySelectorAll('input[name="' + name + '"]'), function (r) {
          r.checked = r.value === value;
          r._was = r.checked;
        });
      }

      // Restore a saved draft
      try {
        var saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
        if (saved) {
          fields.message.el.value = saved.message || '';
          fields.name.el.value = saved.name || '';
          fields.email.el.value = saved.email || '';
          if (saved.ward) { setRadio('ward', saved.ward); wardTouched = true; }
          if (saved.topic) setRadio('topic', saved.topic);
        }
      } catch (e) { /* ignore a bad draft */ }
      grow();

      // Chips: selecting the chosen one again clears it (they are optional)
      Array.prototype.forEach.call(visionForm.querySelectorAll('.vi-chip input'), function (r) {
        r._was = r.checked;
        r.addEventListener('click', function () {
          if (r._was) { r.checked = false; r._was = false; }
          else {
            Array.prototype.forEach.call(visionForm.querySelectorAll('input[name="' + r.name + '"]'), function (o) { o._was = false; });
            r._was = true;
          }
          if (r.name === 'ward') wardTouched = true;
          saveDraft();
        });
      });

      // Validate as people leave a field; clear the message as soon as it is fixed
      Object.keys(fields).forEach(function (key) {
        var el = fields[key].el;
        el.addEventListener('blur', function () { if (el.value.trim() || fields[key].wrap.classList.contains('has-error')) show(key, problem(key)); });
        el.addEventListener('input', function () {
          if (fields[key].wrap.classList.contains('has-error') && !problem(key)) show(key, '');
          if (key === 'message') grow();
          saveDraft();
        });
      });

      // A ward picked on the map above pre-selects here, unless the visitor already chose one
      window.addEventListener('ward-selected', function (e) {
        var name = e.detail && e.detail.name;
        if (name && !wardTouched) { setRadio('ward', name); saveDraft(); }
      });

      visionForm.addEventListener('submit', function (e) {
        e.preventDefault();
        showNote(note, '', 'success'); note.hidden = true;
        var firstBad = null;
        Object.keys(fields).forEach(function (key) {
          var msg = problem(key);
          show(key, msg);
          if (msg && !firstBad) firstBad = fields[key].el;
        });
        if (firstBad) { firstBad.focus(); return; }

        var ward = visionForm.ward.value, topic = visionForm.topic.value;
        var subject = 'Vision input: ' + [ward || 'No ward given'].concat(topic ? [topic] : []).join(', ');
        var context = [];
        if (ward) context.push('Ward: ' + ward);
        if (topic) context.push('Topic: ' + topic);
        var payload = {
          name: fields.name.el.value.trim(),
          email: fields.email.el.value.trim(),
          subject: subject,
          message: fields.message.el.value.trim() + (context.length ? '\n\n' + context.join('\n') : '')
        };
        withBusyButton(visionForm, 'Sending…', function () {
          return window.ApiClient.post('/contact', payload)
            .then(function () {
              var first = payload.name.split(' ')[0];
              document.getElementById('viSuccessTitle').textContent = 'Thank you, ' + first + '.';
              document.getElementById('viSuccessText').textContent = ward && ward !== 'Outside Embakasi South'
                ? 'Your suggestion for ' + ward + ' has been received.'
                : 'Your suggestion has been received.';
              clearDraft();
              visionForm.hidden = true;
              success.hidden = false;
              success.focus();
            })
            .catch(function (err) {
              showNote(note, err.message || 'Something went wrong. Please try again.', 'error');
            });
        });
      });

      document.getElementById('viAgain').addEventListener('click', function () {
        visionForm.reset();
        Array.prototype.forEach.call(visionForm.querySelectorAll('.vi-chip input'), function (r) { r._was = false; });
        wardTouched = false;
        Object.keys(fields).forEach(function (key) { show(key, ''); });
        grow();
        success.hidden = true;
        visionForm.hidden = false;
        fields.message.el.focus();
      });
    })();
  }

  // Contact page message form. The same smooth flow as the Vision form above: optional topic and ward chips (tap the chosen
  // one again to clear it), a message box that grows with a character counter, validation as you leave each field (and focus
  // on the first problem on submit), a draft that survives a refresh, and a thank-you panel in place of the form once it is
  // sent. It posts to the existing contact endpoint: the topic and ward go in the subject and at the end of the message so
  // the team can sort them, and the optional phone number goes in its own field.
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    (function () {
      var note = document.getElementById('contactNote');
      var success = document.getElementById('cfSuccess');
      var counter = document.getElementById('cf-count');
      var DRAFT_KEY = 'ejf.contact.draft';
      var MAX = 2000;
      var fields = {
        message: { el: contactForm.elements.message, wrap: contactForm.elements.message.closest('.vi-field'), err: document.getElementById('cf-message-err') },
        name: { el: contactForm.elements.name, wrap: contactForm.elements.name.closest('.vi-field'), err: document.getElementById('cf-name-err') },
        email: { el: contactForm.elements.email, wrap: contactForm.elements.email.closest('.vi-field'), err: document.getElementById('cf-email-err') }
      };

      function problem(key) {
        var el = fields[key].el, v = el.value.trim();
        if (key === 'message') return v ? '' : 'Please write your message.';
        if (key === 'name') return v ? '' : 'Please add your name.';
        if (!v) return 'Please add your email.';
        return el.validity.typeMismatch ? "That email address doesn't look right." : '';
      }
      function show(key, msg) {
        var f = fields[key];
        f.err.textContent = msg;
        f.wrap.classList.toggle('has-error', !!msg);
        if (msg) { f.el.setAttribute('aria-invalid', 'true'); } else { f.el.removeAttribute('aria-invalid'); }
      }
      function grow() {
        var t = fields.message.el;
        t.style.height = 'auto';
        t.style.height = Math.max(t.scrollHeight + 2, 132) + 'px';
        var n = t.value.length;
        counter.textContent = n + ' / ' + MAX;
        counter.classList.toggle('is-near', n >= MAX - 150);
      }
      function saveDraft() {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            topic: contactForm.topic.value, ward: contactForm.ward.value, message: fields.message.el.value,
            name: fields.name.el.value, email: fields.email.el.value, phone: contactForm.phone.value
          }));
        } catch (e) { /* storage unavailable: the form simply works without a saved draft */ }
      }
      function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
      function setRadio(name, value) {
        Array.prototype.forEach.call(contactForm.querySelectorAll('input[name="' + name + '"]'), function (r) {
          r.checked = r.value === value;
          r._was = r.checked;
        });
      }

      // Restore a saved draft
      try {
        var saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
        if (saved) {
          fields.message.el.value = saved.message || '';
          fields.name.el.value = saved.name || '';
          fields.email.el.value = saved.email || '';
          contactForm.phone.value = saved.phone || '';
          if (saved.topic) setRadio('topic', saved.topic);
          if (saved.ward) setRadio('ward', saved.ward);
        }
      } catch (e) { /* ignore a bad draft */ }
      // A link from another page (an event's "Tell us you are coming") can prefill the topic, ward and message.
      try {
        var linked = new URLSearchParams(window.location.search);
        if (linked.get('topic')) setRadio('topic', linked.get('topic'));
        if (linked.get('ward')) setRadio('ward', linked.get('ward'));
        if (linked.get('message') && !fields.message.el.value) fields.message.el.value = linked.get('message').slice(0, MAX);
      } catch (e) { /* ignore bad link parameters */ }
      grow();

      // Chips: selecting the chosen one again clears it (they are optional)
      Array.prototype.forEach.call(contactForm.querySelectorAll('.vi-chip input'), function (r) {
        r._was = r.checked;
        r.addEventListener('click', function () {
          if (r._was) { r.checked = false; r._was = false; }
          else {
            Array.prototype.forEach.call(contactForm.querySelectorAll('input[name="' + r.name + '"]'), function (o) { o._was = false; });
            r._was = true;
          }
          saveDraft();
        });
      });

      contactForm.phone.addEventListener('input', saveDraft);

      // Validate as people leave a field; clear the message as soon as it is fixed
      Object.keys(fields).forEach(function (key) {
        var el = fields[key].el;
        el.addEventListener('blur', function () { if (el.value.trim() || fields[key].wrap.classList.contains('has-error')) show(key, problem(key)); });
        el.addEventListener('input', function () {
          if (fields[key].wrap.classList.contains('has-error') && !problem(key)) show(key, '');
          if (key === 'message') grow();
          saveDraft();
        });
      });

      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        note.hidden = true;
        var firstBad = null;
        Object.keys(fields).forEach(function (key) {
          var msg = problem(key);
          show(key, msg);
          if (msg && !firstBad) firstBad = fields[key].el;
        });
        if (firstBad) { firstBad.focus(); return; }

        var topic = contactForm.topic.value, ward = contactForm.ward.value;
        var subject = (topic ? 'Contact: ' + topic : 'Contact message') + (ward ? ', ' + ward : '');
        var context = [];
        if (topic) context.push('Topic: ' + topic);
        if (ward) context.push('Ward: ' + ward);
        var payload = {
          name: fields.name.el.value.trim(),
          email: fields.email.el.value.trim(),
          phone: contactForm.phone.value.trim(),
          subject: subject,
          message: fields.message.el.value.trim() + (context.length ? '\n\n' + context.join('\n') : '')
        };
        withBusyButton(contactForm, 'Sending…', function () {
          return window.ApiClient.post('/contact', payload)
            .then(function () {
              var first = payload.name.split(' ')[0];
              document.getElementById('cfSuccessTitle').textContent = 'Thank you, ' + first + '.';
              document.getElementById('cfSuccessText').textContent = 'Your message has been received by the team.';
              clearDraft();
              contactForm.hidden = true;
              success.hidden = false;
              success.focus();
            })
            .catch(function (err) {
              showNote(note, err.message || 'Something went wrong. Please try again.', 'error');
            });
        });
      });

      document.getElementById('cfAgain').addEventListener('click', function () {
        contactForm.reset();
        Array.prototype.forEach.call(contactForm.querySelectorAll('.vi-chip input'), function (r) { r._was = false; });
        Object.keys(fields).forEach(function (key) { show(key, ''); });
        grow();
        success.hidden = true;
        contactForm.hidden = false;
        fields.message.el.focus();
      });
    })();
  }


  // Get Involved offer form. Same flow as the Contact form above, with a required "how would you like to help" choice (a
  // chip can be changed but not cleared), an optional ward and note, a draft that survives a refresh, and a thank-you panel in
  // place of the form. It posts to the existing contact endpoint with the way and ward in the subject and at the end of the
  // message so the team can sort offers. The "I want to..." buttons on each way pick the chip and scroll to the form, and
  // ?way= in a link does the same.
  var involveForm = document.getElementById('involveForm');
  if (involveForm) {
    (function () {
      var note = document.getElementById('involveNote');
      var success = document.getElementById('igSuccess');
      var counter = document.getElementById('ig-count');
      var wayErr = document.getElementById('ig-way-err');
      var DRAFT_KEY = 'ejf.involve.draft';
      var MAX = 1500;
      var fields = {
        name: { el: involveForm.elements.name, wrap: involveForm.elements.name.closest('.vi-field'), err: document.getElementById('ig-name-err') },
        email: { el: involveForm.elements.email, wrap: involveForm.elements.email.closest('.vi-field'), err: document.getElementById('ig-email-err') }
      };
      var message = involveForm.elements.message;

      function problem(key) {
        var el = fields[key].el, v = el.value.trim();
        if (key === 'name') return v ? '' : 'Please add your name.';
        if (!v) return 'Please add your email.';
        return el.validity.typeMismatch ? "That email address doesn't look right." : '';
      }
      function show(key, msg) {
        var f = fields[key];
        f.err.textContent = msg;
        f.wrap.classList.toggle('has-error', !!msg);
        if (msg) { f.el.setAttribute('aria-invalid', 'true'); } else { f.el.removeAttribute('aria-invalid'); }
      }
      function grow() {
        message.style.height = 'auto';
        message.style.height = Math.max(message.scrollHeight + 2, 110) + 'px';
        var n = message.value.length;
        counter.textContent = n + ' / ' + MAX;
        counter.classList.toggle('is-near', n >= MAX - 150);
      }
      function saveDraft() {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            way: involveForm.way.value, ward: involveForm.ward.value, message: message.value,
            name: fields.name.el.value, email: fields.email.el.value, phone: involveForm.phone.value
          }));
        } catch (e) { /* storage unavailable: the form simply works without a saved draft */ }
      }
      function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
      function setRadio(name, value) {
        Array.prototype.forEach.call(involveForm.querySelectorAll('input[name="' + name + '"]'), function (r) {
          r.checked = r.value === value;
          r._was = r.checked;
        });
      }
      function wayProblem() { return involveForm.way.value ? '' : 'Please choose how you would like to help.'; }
      function showWay(msg) { wayErr.textContent = msg; }

      // Restore a saved draft, then let a link (?way=) override the way
      try {
        var saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
        if (saved) {
          message.value = saved.message || '';
          fields.name.el.value = saved.name || '';
          fields.email.el.value = saved.email || '';
          involveForm.phone.value = saved.phone || '';
          if (saved.way) setRadio('way', saved.way);
          if (saved.ward) setRadio('ward', saved.ward);
        }
      } catch (e) { /* ignore a bad draft */ }
      try {
        var linked = new URLSearchParams(window.location.search).get('way');
        if (linked) setRadio('way', linked);
      } catch (e) { /* ignore bad link parameters */ }
      grow();

      // Ward chips are optional (tap again to clear); the way is required, so it can be changed but not cleared
      Array.prototype.forEach.call(involveForm.querySelectorAll('.vi-chip input'), function (r) {
        r._was = r.checked;
        r.addEventListener('click', function () {
          if (r.name === 'ward' && r._was) { r.checked = false; r._was = false; }
          else {
            Array.prototype.forEach.call(involveForm.querySelectorAll('input[name="' + r.name + '"]'), function (o) { o._was = false; });
            r._was = true;
          }
          if (r.name === 'way') showWay('');
          saveDraft();
        });
      });

      // "I want to ..." on each way: choose it and take the visitor to the form
      Array.prototype.forEach.call(document.querySelectorAll('.ig-offer'), function (btn) {
        btn.addEventListener('click', function () {
          setRadio('way', btn.getAttribute('data-way'));
          showWay('');
          saveDraft();
          var target = document.getElementById('offer');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      involveForm.phone.addEventListener('input', saveDraft);
      message.addEventListener('input', function () { grow(); saveDraft(); });

      Object.keys(fields).forEach(function (key) {
        var el = fields[key].el;
        el.addEventListener('blur', function () { if (el.value.trim() || fields[key].wrap.classList.contains('has-error')) show(key, problem(key)); });
        el.addEventListener('input', function () {
          if (fields[key].wrap.classList.contains('has-error') && !problem(key)) show(key, '');
          saveDraft();
        });
      });

      involveForm.addEventListener('submit', function (e) {
        e.preventDefault();
        note.hidden = true;
        var firstBad = null;
        var wayMsg = wayProblem();
        showWay(wayMsg);
        if (wayMsg) firstBad = involveForm.querySelector('input[name="way"]');
        Object.keys(fields).forEach(function (key) {
          var msg = problem(key);
          show(key, msg);
          if (msg && !firstBad) firstBad = fields[key].el;
        });
        if (firstBad) { firstBad.focus(); return; }

        var way = involveForm.way.value, ward = involveForm.ward.value;
        var context = ['Way to help: ' + way];
        if (ward) context.push('Ward: ' + ward);
        var payload = {
          name: fields.name.el.value.trim(),
          email: fields.email.el.value.trim(),
          phone: involveForm.phone.value.trim(),
          subject: 'Get involved: ' + way + (ward ? ', ' + ward : ''),
          message: (message.value.trim() ? message.value.trim() + '\n\n' : '') + context.join('\n')
        };
        withBusyButton(involveForm, 'Sending…', function () {
          return window.ApiClient.post('/contact', payload)
            .then(function () {
              var first = payload.name.split(' ')[0];
              document.getElementById('igSuccessTitle').textContent = 'Thank you, ' + first + '.';
              document.getElementById('igSuccessText').textContent = 'Your offer has been received. The team will be in touch.';
              clearDraft();
              involveForm.hidden = true;
              success.hidden = false;
              success.focus();
            })
            .catch(function (err) {
              showNote(note, err.message || 'Something went wrong. Please try again.', 'error');
            });
        });
      });

      document.getElementById('igAgain').addEventListener('click', function () {
        involveForm.reset();
        Array.prototype.forEach.call(involveForm.querySelectorAll('.vi-chip input'), function (r) { r._was = false; });
        Object.keys(fields).forEach(function (key) { show(key, ''); });
        showWay('');
        grow();
        success.hidden = true;
        involveForm.hidden = false;
        involveForm.querySelector('input[name="way"]').focus();
      });
    })();
  }

})();
