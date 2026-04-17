(function () {
  "use strict";

  // ============================================================================
  // STYLIQUE VIRTUAL TRY-ON WIDGET - WOOCOMMERCE IMPLEMENTATION
  // ============================================================================
  // Comprehensive JavaScript for the Stylique virtual try-on modal
  // Ported from Shopify Liquid section + adapted for WordPress/WooCommerce

  // ============================================================================
  // 1. INITIALIZATION & SETUP
  // ============================================================================

  // API Helper: Inject ngrok header if needed
  function styFetch(url, opts) {
    opts = opts || {};
    if (window.STYLIQUE_API_BASE && typeof url === 'string' && url.indexOf(window.STYLIQUE_API_BASE) === 0) {
      if (opts.headers instanceof Headers) {
        if (!opts.headers.has('ngrok-skip-browser-warning')) {
          opts.headers.set('ngrok-skip-browser-warning', 'true');
        }
      } else if (opts.headers && typeof opts.headers === 'object' && !Array.isArray(opts.headers)) {
        opts.headers = Object.assign({ 'ngrok-skip-browser-warning': 'true' }, opts.headers);
      } else {
        opts.headers = { 'ngrok-skip-browser-warning': 'true' };
      }
    }
    return fetch(url, opts);
  }

  // Make styFetch globally accessible
  window.styFetch = styFetch;

  // Initialize global state when DOM is ready
  function initializeStyliqueWidget() {
    // Get config from wp_localize_script
    if (typeof styliqueConfig === 'undefined') {
      console.error('[Stylique] styliqueConfig not found. Check wp_localize_script in PHP.');
      return;
    }

    // Set the API base URL globally
    window.STYLIQUE_API_BASE = styliqueConfig.backendUrl || 'http://localhost:5000';

    // Initialize state object
    window.styliqueSection = {
      storeId: styliqueConfig.storeId,
      currentUrl: window.location.href,
      backendUrl: window.STYLIQUE_API_BASE,
      selectedImage: null,
      currentProduct: null,
      user: null,
      authToken: null,
      isLoggedIn: false,
      isNewUser: false,
      userMeasurements: {},
      pendingEmail: null,
      storePlan: null,
      planActive: true,
      tryonsQuota: 100,
      tryonsUsed: 0,
      storeStatus: null,
      internalProductId: styliqueConfig.product.id,
      shopifyProductImages: styliqueConfig.productImages || [],
      currentBodyType: null,
      skinTone: null
    };

    console.log('[Stylique] Widget initialized on', styliqueConfig.product.title);
    console.log('[Stylique] Store:', window.styliqueSection.storeId);
    console.log('[Stylique] API Base:', window.STYLIQUE_API_BASE);

    // Restore session from localStorage if exists
    checkLoginStatus();

    // Fetch store status and configure try-on buttons
    fetchStoreStatus();

    // Set CSS variables for colors
    applyBrandColors();

    // Setup event listeners
    setupEventListeners();
  }

  // Apply brand colors from config to CSS variables
  function applyBrandColors() {
    const root = document.documentElement;
    if (styliqueConfig.colors.primary) {
      root.style.setProperty('--stylique-primary', styliqueConfig.colors.primary);
    }
    if (styliqueConfig.colors.secondary) {
      root.style.setProperty('--stylique-secondary', styliqueConfig.colors.secondary);
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // File input change event
    const fileInput = document.getElementById('stylique-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', handleFileSelect);
    }

    // Drag and drop
    const uploadArea = document.getElementById('stylique-upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
      });
      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
      });
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const fileInput = document.getElementById('stylique-file-input');
          if (fileInput) {
            fileInput.files = files;
            handleFileSelect({ target: { files: files } });
          }
        }
      });
    }

    // "Try Again" button
    const tryAgainBtn = document.getElementById('stylique-try-again-btn');
    if (tryAgainBtn) {
      tryAgainBtn.addEventListener('click', resetTryOn);
    }

    // "Add to Cart" button
    const addToCartBtn = document.getElementById('stylique-add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', addToCart);
    }

    // OTP input auto-formatting
    const otpInput = document.getElementById('stylique-otp');
    if (otpInput) {
      otpInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
      });
    }
  }

  // ============================================================================
  // 2. MODAL CONTROL
  // ============================================================================

  window.openStyliqueModal = function () {
    const modal = document.getElementById('stylique-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // Check login status when modal opens
      checkLoginStatus();
    }
  };

  window.closeStyliqueModal = function () {
    const modal = document.getElementById('stylique-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  };

  // ============================================================================
  // 3. AUTHENTICATION - LOGIN & OTP
  // ============================================================================

  window.checkLoginStatus = function () {
    const token = localStorage.getItem('stylique_auth_token');
    const user = localStorage.getItem('stylique_user');

    if (token && user) {
      try {
        window.styliqueSection.authToken = token;
        window.styliqueSection.user = JSON.parse(user);
        window.styliqueSection.isLoggedIn = true;
        showTryOnInterface();
        console.log('[Stylique] User restored from localStorage:', window.styliqueSection.user.email);
      } catch (e) {
        localStorage.removeItem('stylique_auth_token');
        localStorage.removeItem('stylique_user');
        showLoginRequired();
      }
    } else {
      showLoginRequired();
    }
  };

  window.sendOTP = async function () {
    const email = document.getElementById('stylique-email').value.trim();
    if (!email) {
      showError('Please enter your email address');
      return;
    }

    const btn = document.getElementById('stylique-send-otp-btn');
    const spinner = document.getElementById('stylique-send-spinner');
    const text = document.getElementById('stylique-send-text');

    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'flex';

    try {
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'send_otp' })
      });

      const result = await response.json();
      if (result.success) {
        document.getElementById('stylique-email-step').style.display = 'none';
        document.getElementById('stylique-otp-step').style.display = 'block';
        document.getElementById('stylique-email-display').textContent = email;
        window.styliqueSection.pendingEmail = email;
        document.getElementById('stylique-otp').focus();
        showSuccess('Code sent! Check your email.');
      } else {
        showError(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      showError('Network error. Please try again.');
    } finally {
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
  };

  window.verifyOTP = async function () {
    const email = window.styliqueSection.pendingEmail;
    const otp = document.getElementById('stylique-otp').value.trim();

    if (!otp || otp.length !== 6) {
      showError('Please enter a valid 6-digit code');
      return;
    }

    const btn = document.getElementById('stylique-verify-btn');
    const spinner = document.getElementById('stylique-verify-spinner');
    const text = document.getElementById('stylique-verify-text');

    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'flex';

    try {
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, action: 'verify_otp' })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('stylique_auth_token', result.token);
        localStorage.setItem('stylique_user', JSON.stringify(result.user));
        window.styliqueSection.isLoggedIn = true;
        window.styliqueSection.user = result.user;
        window.styliqueSection.authToken = result.token;
        window.styliqueSection.isNewUser = result.isNewUser;
        window.styliqueSection.pendingEmail = null;

        if (result.isNewUser) {
          setTimeout(() => showOnboarding(), 500);
        } else {
          setTimeout(() => showTryOnInterface(), 500);
        }
      } else {
        showError(result.error || 'Invalid code');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      showError('Network error. Please try again.');
    } finally {
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
  };

  window.resendOTP = async function () {
    const email = window.styliqueSection.pendingEmail;
    if (!email) return;
    document.getElementById('stylique-otp').value = '';
    await sendOTP();
  };

  window.changeEmail = function () {
    window.styliqueSection.pendingEmail = null;
    document.getElementById('stylique-email-step').style.display = 'block';
    document.getElementById('stylique-otp-step').style.display = 'none';
    document.getElementById('stylique-email').value = '';
    document.getElementById('stylique-otp').value = '';
    clearMessages();
  };

  window.logoutFromStylique = function () {
    localStorage.removeItem('stylique_auth_token');
    localStorage.removeItem('stylique_user');
    window.styliqueSection.isLoggedIn = false;
    window.styliqueSection.user = null;
    window.styliqueSection.authToken = null;
    showLoginRequired();
    console.log('[Stylique] Logged out');
  };

  // ============================================================================
  // 4. ONBOARDING
  // ============================================================================

  window.showOnboarding = function () {
    document.getElementById('stylique-inline-onboarding').style.display = 'block';
    document.getElementById('stylique-login-required').style.display = 'none';
    document.getElementById('stylique-tryon-interface').style.display = 'none';
  };

  window.inlineOnboardingNext = function () {
    const name = document.getElementById('stylique-inline-name').value.trim();
    if (!name) {
      document.getElementById('stylique-inline-error').textContent = 'Please enter your name';
      document.getElementById('stylique-inline-error').style.display = 'block';
      return;
    }
    window.styliqueSection.userMeasurements.name = name;
    window.styliqueSection.userMeasurements.phone = document.getElementById('stylique-inline-phone').value;

    document.getElementById('stylique-inline-step-1').style.display = 'none';
    document.getElementById('stylique-inline-step-2').style.display = 'block';
  };

  window.inlineOnboardingBack = function () {
    document.getElementById('stylique-inline-step-2').style.display = 'none';
    document.getElementById('stylique-inline-step-1').style.display = 'block';
  };

  window.selectInlineBodyType = function (type) {
    window.styliqueSection.currentBodyType = type;
    document.querySelectorAll('.stylique-type-btn').forEach((btn) => {
      btn.classList.remove('selected');
      if (btn.getAttribute('data-value') === type) {
        btn.classList.add('selected');
      }
    });
  };

  window.skipInlineOnboarding = function () {
    showTryOnInterface();
  };

  window.completeInlineOnboarding = async function () {
    const btn = document.getElementById('stylique-inline-complete-btn');
    const spinner = document.getElementById('stylique-inline-spinner');
    const text = document.getElementById('stylique-inline-complete-text');

    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'flex';

    try {
      // Collect measurements
      const measurements = {
        chest: parseFloat(document.getElementById('stylique-inline-chest').value) || null,
        shoulder: parseFloat(document.getElementById('stylique-inline-shoulder').value) || null,
        waist: parseFloat(document.getElementById('stylique-inline-waist').value) || null,
        inseam: parseFloat(document.getElementById('stylique-inline-inseam').value) || null,
        bodyType: window.styliqueSection.currentBodyType,
        skinTone: document.getElementById('stylique-inline-skin-tone').value || null
      };

      // Send to backend (optional - can skip for MVP)
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + window.styliqueSection.authToken
        },
        body: JSON.stringify(measurements)
      });

      window.styliqueSection.userMeasurements = measurements;
      showTryOnInterface();
    } catch (error) {
      console.error('Onboarding error:', error);
      // Allow skipping if API fails
      showTryOnInterface();
    } finally {
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
  };

  window.extractSkinTone = function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.getElementById('stylique-skin-canvas');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data from center
        const center = ctx.getImageData(30, 30, 1, 1).data;
        const hex = '#' + [center[0], center[1], center[2]].map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();

        document.getElementById('stylique-skin-color').style.backgroundColor = hex;
        document.getElementById('stylique-skin-preview').style.display = 'flex';
        document.getElementById('stylique-inline-skin-tone').value = hex;
        window.styliqueSection.skinTone = hex;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // 5. PRODUCT CHECK & TIER ROUTING
  // ============================================================================

  window.checkProductAvailability = async function () {
    const payload = {
      storeId: window.styliqueSection.storeId,
      currentUrl: window.styliqueSection.currentUrl,
      productId: window.styliqueSection.internalProductId
    };

    try {
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/check-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('[Stylique] Product check result:', data);

      if (data.available && data.product) {
        window.styliqueSection.currentProduct = data.product;
        applyTierRouting(data.product.tier || 1);
        initializeCarousel(data.product);
      } else {
        showProductUnavailable();
      }
    } catch (error) {
      console.error('Product availability check error:', error);
      // Gracefully degrade - show upload anyway
      applyTierRouting(1);
    }
  };

  window.applyTierRouting = function (tier) {
    console.log('[Stylique] Applying tier routing - Tier ' + tier);

    const tryOnOptions = document.querySelector('.stylique-tryon-options');
    const uploadSection = document.querySelector('.stylique-upload-section');
    const recsSection = document.getElementById('stylique-plugin-recommendations');

    if (tier === 3) {
      // Tier 3: Hide try-on, show size only
      if (tryOnOptions) tryOnOptions.style.display = 'none';
      if (uploadSection) uploadSection.style.display = 'none';
      if (recsSection) recsSection.style.display = 'block';
    } else {
      // Tier 1-2: Full experience
      if (tryOnOptions) tryOnOptions.style.display = 'block';
      if (uploadSection) uploadSection.style.display = 'block';
    }
  };

  window.showProductUnavailable = function () {
    const unavailable = document.getElementById('stylique-product-unavailable');
    const upload = document.querySelector('.stylique-upload-section');
    if (unavailable) unavailable.style.display = 'block';
    if (upload) upload.style.display = 'none';
  };

  // ============================================================================
  // 6. STORE STATUS & QUOTA
  // ============================================================================

  window.fetchStoreStatus = async function () {
    try {
      const url = window.STYLIQUE_API_BASE + '/api/plugin/store-status?storeId=' + encodeURIComponent(window.styliqueSection.storeId);
      const response = await styFetch(url);
      const data = await response.json();

      if (data.success && data.store) {
        window.styliqueSection.storeStatus = data.store;
        window.styliqueSection.storePlan = data.store.subscription_name || 'FREE';
        window.styliqueSection.tryonsQuota = data.store.tryons_quota || 100;
        window.styliqueSection.tryonsUsed = data.store.tryons_used || 0;
        window.styliqueSection.planActive = data.store.subscription_active !== false;
      }
    } catch (error) {
      console.warn('[Stylique] Store status fetch failed:', error);
    }

    updateTryOnButtonsState();
  };

  window.updateTryOnButtonsState = function () {
    const start2D = document.getElementById('stylique-start-2d-tryon');
    const start3D = document.getElementById('stylique-start-3d-tryon');
    const hasImage = !!window.styliqueSection.selectedImage;
    const isActive = window.styliqueSection.planActive;
    const remaining = window.styliqueSection.tryonsQuota - window.styliqueSection.tryonsUsed;

    const canTryOn = hasImage && isActive && remaining > 0;

    if (start2D) start2D.disabled = !canTryOn;
    if (start3D) start3D.disabled = !canTryOn;
  };

  // ============================================================================
  // 7. FILE UPLOAD & IMAGE HANDLING
  // ============================================================================

  window.handleUploadClick = function () {
    if (!window.styliqueSection.user) {
      showLoginRequired();
      return;
    }
    document.getElementById('stylique-file-input').click();
  };

  window.handleFileSelect = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Max 10MB.');
      return;
    }

    window.styliqueSection.selectedImage = file;

    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById('stylique-preview-img');
      if (preview) preview.src = e.target.result;
      
      document.getElementById('stylique-image-preview').style.display = 'block';
      document.querySelector('.stylique-upload-area').style.display = 'none';

      updateTryOnButtonsState();
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // 8. CAROUSEL
  // ============================================================================

  window.initializeCarousel = function (product) {
    if (!window.styliqueSection.shopifyProductImages || window.styliqueSection.shopifyProductImages.length === 0) {
      return;
    }

    const container = document.getElementById('stylique-product-image-carousel');
    if (!container) return;

    const carouselHTML = window.styliqueSection.shopifyProductImages.map((image, index) => `
      <div class="stylique-carousel-item" style="display: ${index === 0 ? 'flex' : 'none'};">
        <img src="${image}" alt="Product image ${index + 1}" />
      </div>
    `).join('');

    container.innerHTML = `
      <div class="stylique-carousel">
        ${carouselHTML}
        <button class="stylique-carousel-nav stylique-carousel-prev" onclick="prevCarouselImage()">‹</button>
        <button class="stylique-carousel-nav stylique-carousel-next" onclick="nextCarouselImage()">›</button>
        <div class="stylique-carousel-counter">${1}/${window.styliqueSection.shopifyProductImages.length}</div>
      </div>
    `;
    container.style.display = 'block';

    // Store current carousel index
    window.styliqueSection.carouselIndex = 0;
  };

  window.nextCarouselImage = function () {
    const images = window.styliqueSection.shopifyProductImages;
    if (!images) return;
    window.styliqueSection.carouselIndex = (window.styliqueSection.carouselIndex + 1) % images.length;
    updateCarouselDisplay();
  };

  window.prevCarouselImage = function () {
    const images = window.styliqueSection.shopifyProductImages;
    if (!images) return;
    window.styliqueSection.carouselIndex = (window.styliqueSection.carouselIndex - 1 + images.length) % images.length;
    updateCarouselDisplay();
  };

  window.updateCarouselDisplay = function () {
    const items = document.querySelectorAll('.stylique-carousel-item');
    const counter = document.querySelector('.stylique-carousel-counter');
    items.forEach((item, index) => {
      item.style.display = index === window.styliqueSection.carouselIndex ? 'flex' : 'none';
    });
    if (counter) {
      counter.textContent = (window.styliqueSection.carouselIndex + 1) + '/' + window.styliqueSection.shopifyProductImages.length;
    }
  };

  window.getCurrentCarouselImage = function () {
    const images = window.styliqueSection.shopifyProductImages;
    return images ? images[window.styliqueSection.carouselIndex] : null;
  };

  // ============================================================================
  // 9. 2D TRY-ON
  // ============================================================================

  window.start2DTryOn = async function () {
    if (!window.styliqueSection.selectedImage) {
      alert('Please select an image first.');
      return;
    }

    showProcessingOverlay('Creating Your Try-On...', 'Analyzing your photo...');

    const formData = new FormData();
    formData.append('storeId', window.styliqueSection.storeId);
    formData.append('currentUrl', window.styliqueSection.currentUrl);
    formData.append('userImage', window.styliqueSection.selectedImage);
    formData.append('garmentType', 'upper_body');

    if (window.styliqueSection.currentProduct && window.styliqueSection.currentProduct.id) {
      formData.append('product_id', window.styliqueSection.currentProduct.id);
    }

    const carouselImage = window.getCurrentCarouselImage();
    if (carouselImage) {
      formData.append('productImageUrl', carouselImage);
    }

    if (window.styliqueSection.user && window.styliqueSection.user.id) {
      formData.append('userId', window.styliqueSection.user.id);
    }

    try {
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/embed-tryon-2d', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Try-on service error: ' + response.status);
      }

      const result = await response.json();
      if (result.success && result.resultImage) {
        displayTryOnResult(result.resultImage, result.product);
        consumeTryonQuota('2d');
      } else {
        throw new Error(result.error || 'Try-on failed');
      }
    } catch (error) {
      console.error('2D try-on error:', error);
      alert('Try-on failed: ' + error.message);
    } finally {
      hideProcessingOverlay();
    }
  };

  window.start3DTryOn = async function () {
    showProcessingOverlay('Generating 3D Try-On...', 'This may take a moment...');

    const formData = new FormData();
    formData.append('storeId', window.styliqueSection.storeId);
    formData.append('userImage', window.styliqueSection.selectedImage);

    if (window.styliqueSection.user) {
      formData.append('userId', window.styliqueSection.user.id);
    }

    try {
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/embed-tryon-3d', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('3D service error');

      const data = await response.json();
      if (data.success && data.operationName) {
        // Poll for video
        pollFor3DResult(data.operationName);
      } else {
        throw new Error(data.error || 'Failed to start 3D generation');
      }
    } catch (error) {
      console.error('3D try-on error:', error);
      hideProcessingOverlay();
      alert('3D try-on failed: ' + error.message);
    }
  };

  window.pollFor3DResult = async function (operationName) {
    const maxAttempts = 60; // 5 minutes with 5s interval
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/embed-tryon-3d?operationName=' + encodeURIComponent(operationName));
        const data = await response.json();

        if (data.done && data.videoUrl) {
          display3DMVideo(data.videoUrl);
          consumeTryonQuota('3d');
          hideProcessingOverlay();
        } else if (data.done && data.error) {
          throw new Error(data.error);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          throw new Error('3D generation timeout');
        }
      } catch (error) {
        console.error('Poll error:', error);
        hideProcessingOverlay();
        alert('3D processing failed: ' + error.message);
      }
    };

    poll();
  };

  // ============================================================================
  // 10. RESULTS DISPLAY
  // ============================================================================

  window.displayTryOnResult = function (imageUrl, product) {
    document.querySelector('.stylique-upload-area').style.display = 'none';
    document.querySelector('.stylique-tryon-options').style.display = 'none';

    const resultImg = document.getElementById('stylique-inline-result-img');
    if (resultImg) resultImg.src = imageUrl;

    document.getElementById('stylique-inline-result').style.display = 'block';

    // Load recommendations if available
    if (window.styliqueSection.storePlan === 'PRO' || window.styliqueSection.storePlan === 'ULTIMATE') {
      loadSizeRecommendation(product?.id || window.styliqueSection.currentProduct?.id);
    }
  };

  window.display3DMVideo = function (videoUrl) {
    const container = document.getElementById('stylique-3d-inline-container');
    if (!container) return;

    container.innerHTML = '';
    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.controls = true;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '600px';
    video.style.borderRadius = '8px';
    container.appendChild(video);

    document.querySelector('.stylique-upload-area').style.display = 'none';
    document.querySelector('.stylique-tryon-options').style.display = 'none';
    document.getElementById('stylique-inline-3d-result').style.display = 'block';
  };

  window.resetTryOn = function () {
    window.styliqueSection.selectedImage = null;
    document.getElementById('stylique-file-input').value = '';
    document.getElementById('stylique-preview-img').src = '';
    document.getElementById('stylique-image-preview').style.display = 'none';
    document.querySelector('.stylique-upload-area').style.display = 'block';
    document.querySelector('.stylique-tryon-options').style.display = 'block';
    document.getElementById('stylique-inline-result').style.display = 'none';
    document.getElementById('stylique-inline-3d-result').style.display = 'none';
    updateTryOnButtonsState();
  };

  window.loadSizeRecommendation = async function (productId) {
    if (!productId) return;

    const container = document.getElementById('stylique-plugin-size-recommendation-content');
    if (!container) return;

    try {
      const response = await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/size-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          userId: window.styliqueSection.user?.id
        })
      });

      const data = await response.json();
      if (data.success) {
        container.innerHTML = '<div style="padding: 1rem; text-align: center;">' + (data.recommendation || 'Size: ' + data.size) + '</div>';
      }
    } catch (error) {
      console.warn('Size recommendation failed:', error);
    }
  };

  // ============================================================================
  // 11. CART INTEGRATION
  // ============================================================================

  window.addToCart = async function () {
    const productId = window.styliqueSection.internalProductId;
    if (!productId) {
      alert('Product ID not found');
      return;
    }

    // WooCommerce uses REST API or simple form submission
    try {
      // Try WooCommerce AJAX
      await fetch(wc.Cart.getCartURL(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1
        })
      });

      alert('Added to cart!');
      window.closeStyliqueModal();
    } catch (error) {
      // Fallback: redirect to product page with add-to-cart param
      window.location.href = '?add-to-cart=' + productId;
    }
  };

  window.consumeTryonQuota = async function (type) {
    try {
      await styFetch(window.STYLIQUE_API_BASE + '/api/plugin/consume-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: window.styliqueSection.storeId,
          type: type,
          userId: window.styliqueSection.user?.id
        })
      });
      window.styliqueSection.tryonsUsed++;
    } catch (error) {
      console.warn('Failed to track try-on usage:', error);
    }
  };

  // ============================================================================
  // 12. UI HELPERS
  // ============================================================================

  window.showLoginRequired = function () {
    document.getElementById('stylique-login-required').style.display = 'block';
    document.getElementById('stylique-inline-onboarding').style.display = 'none';
    document.getElementById('stylique-tryon-interface').style.display = 'none';
  };

  window.showTryOnInterface = function () {
    document.getElementById('stylique-login-required').style.display = 'none';
    document.getElementById('stylique-inline-onboarding').style.display = 'none';
    document.getElementById('stylique-tryon-interface').style.display = 'block';

    const userEmail = document.getElementById('stylique-user-email');
    if (userEmail && window.styliqueSection.user) {
      userEmail.textContent = window.styliqueSection.user.email;
    }

    // Load product availability
    checkProductAvailability();
    fetchStoreStatus();
  };

  window.showProcessingOverlay = function (title, text) {
    const overlay = document.getElementById('stylique-processing-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const titleEl = document.getElementById('stylique-processing-title');
      const textEl = document.getElementById('stylique-processing-text');
      if (titleEl) titleEl.textContent = title;
      if (textEl) textEl.textContent = text;
    }
  };

  window.hideProcessingOverlay = function () {
    const overlay = document.getElementById('stylique-processing-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.showError = function (message) {
    const errorEl = document.getElementById('stylique-login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  };

  window.showSuccess = function (message) {
    const successEl = document.getElementById('stylique-login-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
    }
  };

  window.clearMessages = function () {
    const errorEl = document.getElementById('stylique-login-error');
    const successEl = document.getElementById('stylique-login-success');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
  };

  window.showLoginBenefits = function () {
    alert('Stylique Virtual Try-On:\n\n✨ See how clothes look on you\n📸 AI-powered fitting\n📊 Perfect size matches\n🎁 Exclusive styling tips');
  };

  // ============================================================================
  // 13. INITIALIZATION
  // ============================================================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStyliqueWidget);
  } else {
    initializeStyliqueWidget();
  }
})();
