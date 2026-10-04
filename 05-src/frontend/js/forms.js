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

  // Contact form
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var contactNote = document.getElementById('contactNote');
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        name: contactForm.name.value.trim(),
        email: contactForm.email.value.trim(),
        phone: contactForm.phone.value.trim(),
        subject: contactForm.subject.value.trim(),
        message: contactForm.message.value.trim(),
      };
      if (!payload.name || !payload.email || !payload.message) {
        showNote(contactNote, 'Please fill in your name, email, and message.', 'error');
        return;
      }
      withBusyButton(contactForm, 'Sending…', function () {
        return window.ApiClient.post('/contact', payload)
          .then(function (data) {
            showNote(contactNote, data.message || 'Thank you. Your message has been received.', 'success');
            contactForm.reset();
          })
          .catch(function (err) {
            showNote(contactNote, err.message || 'Something went wrong. Please try again.', 'error');
          });
      });
    });
  }
})();
