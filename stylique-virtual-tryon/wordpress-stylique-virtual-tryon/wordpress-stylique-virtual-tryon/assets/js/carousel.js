/**
 * Image Carousel Component for Tier 1 & 2 Products
 * Handles swipe, arrow buttons, and dot navigation
 */

function carouselDebugEnabled() {
  return !!(
    (window.styliqueOptions && window.styliqueOptions.debugMode) ||
    (window.styliqueSection && window.styliqueSection.debugMode) ||
    (window.StyliqueConfig && window.StyliqueConfig.debugMode)
  );
}

function carouselDebugLog() {
  if (carouselDebugEnabled() && window.console) {
    console.log.apply(console, arguments);
  }
}

function carouselDebugWarn() {
  if (carouselDebugEnabled() && window.console) {
    console.warn.apply(console, arguments);
  }
}

carouselDebugLog('[Carousel] carousel.js loaded, defining window.StyleiqueCarousel');

window.StyleiqueCarousel = (function() {
  const state = {
    currentIndex: 0,
    images: [],
    container: null,
    onImageSelect: null, // Callback when image is selected
  };

  function init(images, containerId, options = {}) {
    carouselDebugLog('[Carousel.init] Called with:', {
      imagesCount: images ? images.length : 0,
      containerId,
      hasCallback: !!options.onImageSelect
    });

    if (!images || images.length === 0) {
      carouselDebugWarn('[Carousel.init] No images provided or empty array');
      return null;
    }

    state.images = images;
    state.currentIndex = 0;
    state.container = document.getElementById(containerId);
    state.onImageSelect = options.onImageSelect || null;

    if (!state.container) {
      console.error('[Carousel] Container not found with ID:', containerId);
      carouselDebugLog('[Carousel] Available elements:', {
        carouselDivExists: !!document.getElementById("stylique-product-image-carousel"),
        uploadSectionExists: !!document.querySelector(".stylique-upload-section")
      });
      return null;
    }

    carouselDebugLog('[Carousel.init] Container found, rendering carousel with', images.length, 'images');
    renderCarousel();
    attachEventListeners();

    // Trigger initial callback
    if (state.onImageSelect) {
      carouselDebugLog('[Carousel.init] Calling onImageSelect with first image');
      state.onImageSelect(state.images[0], 0);
    }

    carouselDebugLog('[Carousel.init] Initialization complete');
    return {
      getCurrentImage: getCurrentImage,
      selectImage: selectImage,
      destroy: destroy,
    };
  }

  function renderCarousel() {
    const { images, container } = state;
    carouselDebugLog('[Carousel.renderCarousel] Starting render with', images.length, 'images');

    if (images.length === 0) {
      carouselDebugWarn('[Carousel.renderCarousel] No images to render');
      return;
    }

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
    carouselDebugLog('[Carousel.renderCarousel] HTML rendered successfully');
  }

  function attachEventListeners() {
    const { container, images } = state;
    carouselDebugLog('[Carousel.attachEventListeners] Attaching listeners for', images.length, 'images');

    if (!container || images.length <= 1) {
      carouselDebugLog('[Carousel.attachEventListeners] Skipping: container=' + !!container + ', images.length=' + images.length);
      return;
    }

    // Arrow buttons
    const prevBtn = container.querySelector('.stylique-carousel-prev');
    const nextBtn = container.querySelector('.stylique-carousel-next');
    carouselDebugLog('[Carousel.attachEventListeners] Found buttons:', { prev: !!prevBtn, next: !!nextBtn });

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
      carouselDebugLog('[Carousel] Previous clicked');
      e.preventDefault();
      goToPrevious();
    });
    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      carouselDebugLog('[Carousel] Next clicked');
      e.preventDefault();
      goToNext();
    });

    // Dot buttons
    const dots = container.querySelectorAll('.stylique-carousel-dot');
    carouselDebugLog('[Carousel.attachEventListeners] Found', dots.length, 'dot indicators');

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        const index = parseInt(dot.dataset.index);
        carouselDebugLog('[Carousel] Dot clicked, index:', index);
        e.preventDefault();
        selectImage(index);
      });
    });

    // Touch swipe support
    let startX = 0;
    let endX = 0;
    const track = container.querySelector('.stylique-carousel-track');
    if (track) {
      carouselDebugLog('[Carousel.attachEventListeners] Attaching touch listeners');
      track.addEventListener('touchstart', (e) => {
        startX = e.changedTouches[0].screenX;
        carouselDebugLog('[Carousel] Touch start:', startX);
      }, false);
      track.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].screenX;
        carouselDebugLog('[Carousel] Touch end:', endX, 'diff:', startX - endX);
        handleSwipe();
      }, false);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!isCarouselFocused()) return;
      if (e.key === 'ArrowLeft') {
        carouselDebugLog('[Carousel] ArrowLeft pressed');
        goToPrevious();
      }
      if (e.key === 'ArrowRight') {
        carouselDebugLog('[Carousel] ArrowRight pressed');
        goToNext();
      }
    });

    carouselDebugLog('[Carousel.attachEventListeners] Event listeners attached successfully');
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
    const { container, currentIndex, images, onImageSelect } = state;
    if (!container) return;

    // Update images
    container.querySelectorAll('.stylique-carousel-image').forEach((img, idx) => {
      img.classList.toggle('active', idx === currentIndex);
    });

    // Update dots
    container.querySelectorAll('.stylique-carousel-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });

    // Trigger callback with current image URL and index
    if (onImageSelect && images[currentIndex]) {
      onImageSelect(images[currentIndex], currentIndex);
    }
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
