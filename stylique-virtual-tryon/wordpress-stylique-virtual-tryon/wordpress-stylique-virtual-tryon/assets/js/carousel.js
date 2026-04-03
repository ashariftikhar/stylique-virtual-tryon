/**
 * Image Carousel Component for Tier 1 & 2 Products
 * Handles swipe, arrow buttons, and dot navigation
 */

window.StyleiqueCarousel = (function() {
  const state = {
    currentIndex: 0,
    images: [],
    container: null,
  };

  function init(images, containerId) {
    if (!images || images.length === 0) return null;

    state.images = images;
    state.currentIndex = 0;
    state.container = document.getElementById(containerId);

    if (!state.container) {
      console.warn('[Carousel] Container not found:', containerId);
      return null;
    }

    renderCarousel();
    attachEventListeners();
    return {
      getCurrentImage: getCurrentImage,
      selectImage: selectImage,
      destroy: destroy,
    };
  }

  function renderCarousel() {
    const { images, container } = state;
    if (images.length === 0) return;

    const html = `
      <div class="stylique-carousel-wrapper">
        <div class="stylique-carousel-track">
          ${images.map((url, idx) => `
            <img 
              src="${sanitizeUrl(url)}" 
              alt="Product image ${idx + 1}" 
              class="stylique-carousel-image ${idx === 0 ? 'active' : ''}"
              data-index="${idx}"
            />
          `).join('')}
        </div>

        <!-- Navigation Buttons (hidden on mobile) -->
        ${images.length > 1 ? `
          <button class="stylique-carousel-nav stylique-carousel-prev" aria-label="Previous image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button class="stylique-carousel-nav stylique-carousel-next" aria-label="Next image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        ` : ''}

        <!-- Dot Indicators -->
        ${images.length > 1 ? `
          <div class="stylique-carousel-dots">
            ${images.map((_, idx) => `
              <button 
                class="stylique-carousel-dot ${idx === 0 ? 'active' : ''}" 
                data-index="${idx}"
                aria-label="View image ${idx + 1}"
              ></button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
  }

  function attachEventListeners() {
    const { container, images } = state;
    if (!container || images.length <= 1) return;

    // Arrow buttons
    const prevBtn = container.querySelector('.stylique-carousel-prev');
    const nextBtn = container.querySelector('.stylique-carousel-next');
    if (prevBtn) prevBtn.onClick = (e) => { e.preventDefault(); goToPrevious(); };
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); goToNext(); });

    // Dot buttons
    container.querySelectorAll('.stylique-carousel-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        selectImage(parseInt(dot.dataset.index));
      });
    });

    // Touch swipe support
    let startX = 0;
    let endX = 0;
    const track = container.querySelector('.stylique-carousel-track');
    if (track) {
      track.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; }, false);
      track.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].screenX;
        handleSwipe();
      }, false);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!isCarouselFocused()) return;
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    });
  }

  function handleSwipe() {
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext(); // Swiped left, go next
      else goToPrevious(); // Swiped right, go prev
    }
  }

  function goToNext() {
    selectImage((state.currentIndex + 1) % state.images.length);
  }

  function goToPrevious() {
    selectImage((state.currentIndex - 1 + state.images.length) % state.images.length);
  }

  function selectImage(index) {
    if (index < 0 || index >= state.images.length) return;
    state.currentIndex = index;
    updateCarousel();
  }

  function updateCarousel() {
    const { container, currentIndex } = state;
    if (!container) return;

    // Update images
    container.querySelectorAll('.stylique-carousel-image').forEach((img, idx) => {
      img.classList.toggle('active', idx === currentIndex);
    });

    // Update dots
    container.querySelectorAll('.stylique-carousel-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  }

  function getCurrentImage() {
    return state.images[state.currentIndex] || null;
  }

  function isCarouselFocused() {
    const active = document.activeElement;
    return active && (
      active.classList.contains('stylique-carousel-dot') ||
      active.classList.contains('stylique-carousel-nav')
    );
  }

  function sanitizeUrl(url) {
    if (typeof url !==  'string') return '';
    return url.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }

  function destroy() {
    if (state.container) {
      state.container.innerHTML = '';
    }
    state = { currentIndex: 0, images: [], container: null };
  }

  return { init, destroy };
})();
