// The form is usable HTML. Report errors only when sending needs attention.
(() => {
  'use strict';
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const status = form.querySelector('[role="status"]');
  const pageAddress = form.querySelector('input[name="_url"]');
  const id = String((window.DS_CONTACT && window.DS_CONTACT.formsubmitId) || '').trim();
  const validId = /^[A-Za-z0-9_-]{16,160}$/.test(id);
  if (validId) form.action = `https://formsubmit.co/${id}`;
  const configured = /^https:\/\/formsubmit\.co\/[A-Za-z0-9_-]{16,160}$/.test(form.getAttribute('action') || '');
  const webPage = ['http:', 'https:'].includes(window.location.protocol);

  const showStatus = (message) => {
    status.textContent = message;
    status.hidden = false;
  };
  const updatePageAddress = () => {
    if (!pageAddress) return;
    // Do not send a local file path, URL query or fragment to the provider.
    pageAddress.value = webPage ? window.location.origin + window.location.pathname : '';
    pageAddress.disabled = !webPage;
  };

  updatePageAddress();
  if (!configured) showStatus(form.dataset.configurationError);
  else status.hidden = true;

  form.addEventListener('submit', (event) => {
    // Keep the fields editable in every preview. Explain only why sending
    // cannot proceed, and preserve everything the visitor has already typed.
    if (!configured || !webPage) {
      event.preventDefault();
      showStatus(configured ? form.dataset.localSubmitError : form.dataset.configurationError);
      status.focus();
      return;
    }
    form.querySelectorAll('input[required], textarea[required]').forEach((field) => {
      field.value = field.value.trim();
    });
    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }
    updatePageAddress();
    // Normal browser POST; FormSubmit handles CAPTCHA and delivery status.
  });
})();
