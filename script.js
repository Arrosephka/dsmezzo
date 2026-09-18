const toggle = document.querySelector('[data-nav-toggle]');
document.documentElement.classList.add('has-js');
const nav = document.querySelector('[data-nav]');
const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
if (toggle && nav) {
  const openLabel = toggle.getAttribute('aria-label');
  const closeLabel = toggle.dataset.closeLabel || openLabel;
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? closeLabel : openLabel);
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

// A lightweight preview: the full YouTube player is created only after a click.
document.querySelectorAll('[data-video-id]').forEach((button) => {
  button.disabled = false;
  button.addEventListener('click', () => {
    const id = button.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    iframe.title = button.dataset.videoTitle;
    iframe.width = '560';
    iframe.height = '315';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    button.replaceWith(iframe);
    iframe.focus();
  });
});
