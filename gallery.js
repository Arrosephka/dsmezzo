// Progressive enhancement: original photographs remain ordinary links without JS.
(() => {
  'use strict';
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const viewport = gallery.querySelector('[data-gallery-viewport]');
  const track = gallery.querySelector('[data-gallery-track]');
  const originals = Array.from(track.querySelectorAll('[data-photo-index]'));
  const count = originals.length;
  if (count < 2) return;
  const modulo = (value, length) => ((value % length) + length) % length;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let cycleWidth = 0;
  let animation = 0;
  let resizeFrame = 0;
  let pointer = null;
  let pendingClick = null;
  let keyboardNavigation = false;
  let resizePending = false;

  // Extra visual copies give the smaller thumbnails room to loop on wide screens. Only the
  // middle, original set participates in keyboard and screen-reader navigation.
  const makeCopy = (photo) => {
    const copy = photo.cloneNode(true);
    copy.dataset.galleryClone = '';
    copy.setAttribute('aria-hidden', 'true');
    copy.tabIndex = -1;
    return copy;
  };
  const before = [...originals, ...originals].map(makeCopy);
  const after = [...originals, ...originals].map(makeCopy);
  track.prepend(...before);
  track.append(...after);
  const all = [...before, ...originals, ...after];
  const leftOf = (photo) => photo.offsetLeft - all[0].offsetLeft;
  const stopAnimation = () => {
    window.cancelAnimationFrame(animation);
    animation = 0;
  };
  const normalizeScroll = () => {
    // Never move the strip between pointer-down and click. Keep keyboard focus
    // on the original control, but allow mouse/touch scrolling to keep looping.
    if (!cycleWidth || pointer || (keyboardNavigation && originals.includes(document.activeElement))) return;
    const lower = cycleWidth * 1.5;
    const current = viewport.scrollLeft;
    if (current < lower || current >= lower + cycleWidth) {
      viewport.scrollLeft = lower + modulo(current - lower, cycleWidth);
    }
  };
  const measure = () => {
    if (pointer) {
      resizePending = true;
      return;
    }
    resizePending = false;
    stopAnimation();
    const fraction = cycleWidth ? modulo(viewport.scrollLeft, cycleWidth) / cycleWidth : 0;
    cycleWidth = leftOf(originals[0]) / 2;
    if (!cycleWidth) return;
    viewport.scrollLeft = cycleWidth * (2 + fraction);
    const focused = document.activeElement;
    if (keyboardNavigation && originals.includes(focused)) revealPhoto(focused);
  };
  const revealPhoto = (photo) => {
    const left = leftOf(photo);
    const right = left + photo.offsetWidth;
    if (left < viewport.scrollLeft) viewport.scrollLeft = left;
    else if (right > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollLeft = right - viewport.clientWidth;
    }
  };
  const moveStrip = (direction) => {
    stopAnimation();
    normalizeScroll();
    const current = viewport.scrollLeft;
    let closest = 0;
    all.forEach((photo, index) => {
      if (Math.abs(leftOf(photo) - current) < Math.abs(leftOf(all[closest]) - current)) closest = index;
    });
    const target = all[Math.max(0, Math.min(all.length - 1, closest + direction))];
    const distance = leftOf(target) - current;
    if (motion.matches) {
      viewport.scrollLeft += distance;
      normalizeScroll();
      return;
    }
    // Animate deltas so recentering at a loop boundary never cancels a native
    // smooth-scroll animation halfway through a photograph.
    let started;
    let progress = 0;
    const frame = (time) => {
      if (started === undefined) started = time;
      const elapsed = Math.min(1, (time - started) / 240);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      viewport.scrollLeft += distance * (eased - progress);
      normalizeScroll();
      progress = eased;
      animation = elapsed < 1 ? window.requestAnimationFrame(frame) : 0;
    };
    animation = window.requestAnimationFrame(frame);
  };

  viewport.addEventListener('scroll', normalizeScroll, {passive: true});
  viewport.addEventListener('pointerdown', (event) => {
    stopAnimation();
    keyboardNavigation = false;
    pendingClick = null;
    if (!event.isPrimary || event.button !== 0) return;
    const photo = event.target.closest('[data-photo-index]');
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      index: photo ? Number(photo.dataset.photoIndex) : null,
      dragged: false
    };
  }, {passive: true});
  const trackMovement = (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) pointer.dragged = true;
  };
  window.addEventListener('pointermove', trackMovement, {passive: true});
  const finishPointer = (event, cancelled = false) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    trackMovement(event);
    pendingClick = {...pointer, dragged: pointer.dragged || cancelled};
    pointer = null;
    window.requestAnimationFrame(() => {
      if (resizePending) measure();
      else normalizeScroll();
    });
  };
  window.addEventListener('pointerup', (event) => finishPointer(event), {passive: true});
  window.addEventListener('pointercancel', (event) => finishPointer(event, true), {passive: true});
  window.addEventListener('blur', () => {
    pointer = null;
    pendingClick = null;
    if (resizePending) measure();
  });
  viewport.addEventListener('wheel', () => {
    stopAnimation();
    keyboardNavigation = false;
    if (pointer) pointer.dragged = true;
  }, {passive: true});
  viewport.addEventListener('focusin', (event) => {
    if (originals.includes(event.target)) {
      stopAnimation();
      if (!pointer && !pendingClick) keyboardNavigation = true;
      // Native focus already reveals a tabbed-to link. Moving every focused
      // thumbnail to the left edge used to move photos under a mouse click.
    }
  });
  viewport.addEventListener('focusout', () => window.requestAnimationFrame(normalizeScroll));
  const focusPhoto = (index) => {
    keyboardNavigation = true;
    stopAnimation();
    showPhoto(index);
    const photo = originals[modulo(index, count)];
    photo.focus({preventScroll: true});
    revealPhoto(photo);
  };
  viewport.addEventListener('keydown', (event) => {
    pendingClick = null;
    keyboardNavigation = true;
    const photo = event.target.closest('[data-photo-index]');
    if (!photo || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = Number(photo.dataset.photoIndex);
    const destinations = {ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: count - 1};
    if (event.key in destinations) {
      event.preventDefault();
      focusPhoto(destinations[event.key]);
    }
  });
  gallery.querySelector('[data-gallery-prev]').addEventListener('click', () => moveStrip(-1));
  gallery.querySelector('[data-gallery-next]').addEventListener('click', () => moveStrip(1));
  measure();
  gallery.querySelector('[data-gallery-controls]').hidden = false;
  if ('ResizeObserver' in window) {
    new window.ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(measure);
    }).observe(viewport);
  } else {
    window.addEventListener('resize', measure);
  }

  const image = gallery.querySelector('[data-gallery-image]');
  const counter = gallery.querySelector('[data-gallery-counter]');
  const stage = gallery.querySelector('[data-gallery-stage]');
  let selected = 0;
  let touchStart = null;

  const showPhoto = (index) => {
    selected = modulo(index, count);
    const photo = originals[selected];
    const thumbnail = photo.querySelector('img');
    image.src = photo.href;
    image.alt = thumbnail.alt;
    image.setAttribute('width', thumbnail.getAttribute('width'));
    image.setAttribute('height', thumbnail.getAttribute('height'));
    counter.textContent = `${selected + 1} / ${count}`;
    counter.setAttribute('aria-label', gallery.dataset.photoLabel
      .replace('{current}', selected + 1).replace('{total}', count));
    all.forEach((item) => item.setAttribute('aria-pressed', String(Number(item.dataset.photoIndex) === selected)));
  };
  const selectPhoto = (index) => {
    stopAnimation();
    showPhoto(index);
  };
  all.forEach((photo) => {
    photo.setAttribute('role', 'button');
    photo.setAttribute('aria-controls', stage.id);
    photo.setAttribute('draggable', 'false');
    photo.querySelector('img').setAttribute('draggable', 'false');
  });
  track.addEventListener('click', (event) => {
    const photo = event.target.closest('[data-photo-index]');
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // A physical click belongs to the photograph originally pressed, even if
    // the browser delivers it after focus, a loop boundary or a pending resize.
    // Keyboard and assistive-technology clicks use their actual target instead.
    const gesture = (event.detail > 0 || event.pointerType) ? pendingClick : null;
    pendingClick = null;
    if (!photo && gesture?.index == null) return;
    event.preventDefault();
    if (gesture?.dragged) return;
    selectPhoto(gesture?.index ?? Number(photo.dataset.photoIndex));
  });
  track.addEventListener('keydown', (event) => {
    if (event.key === ' ' && event.target.matches('[data-photo-index]')) {
      event.preventDefault();
      selectPhoto(Number(event.target.dataset.photoIndex));
    }
  });
  gallery.querySelector('[data-viewer-prev]').addEventListener('click', () => selectPhoto(selected - 1));
  gallery.querySelector('[data-viewer-next]').addEventListener('click', () => selectPhoto(selected + 1));
  stage.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = {ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: count - 1};
    if (event.key in destinations) {
      event.preventDefault();
      showPhoto(destinations[event.key]);
    }
  });
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' && event.isPrimary) {
      touchStart = {x: event.clientX, y: event.clientY, id: event.pointerId};
    } else touchStart = null;
  }, {passive: true});
  stage.addEventListener('pointerup', (event) => {
    if (!touchStart || event.pointerId !== touchStart.id) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      showPhoto(selected + (dx < 0 ? 1 : -1));
    }
  }, {passive: true});
  stage.addEventListener('pointercancel', () => { touchStart = null; }, {passive: true});
  gallery.querySelector('[data-gallery-selection-controls]').hidden = false;
  showPhoto(0);
})();
