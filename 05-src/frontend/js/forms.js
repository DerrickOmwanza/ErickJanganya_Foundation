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
            showNote(newsletterNote, "You're subscribed — thank you.", 'success');
            newsletterForm.reset();
          })
          .catch(function (err) {
            showNote(newsletterNote, err.message || 'Something went wrong. Please try again.', 'error');
          });
      });
    });
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
            showNote(contactNote, data.message || 'Thank you — your message has been received.', 'success');
            contactForm.reset();
          })
          .catch(function (err) {
            showNote(contactNote, err.message || 'Something went wrong. Please try again.', 'error');
          });
      });
    });
  }
})();
