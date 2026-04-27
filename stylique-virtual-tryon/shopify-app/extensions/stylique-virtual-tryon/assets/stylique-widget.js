(function () {
  'use strict';

  var VERSION = '0.1.0';
  var NS = 'StyliqueWidget';
  var mountedRoots = new WeakSet();
  var globalListeners = false;

  function log(config) {
    if (config && config.debugMode && window.console) {
      console.log.apply(console, ['[StyliqueWidget]'].concat([].slice.call(arguments, 1)));
    }
  }

  function normalizeBackend(url) {
    return String(url || 'https://stylique-api.onrender.com').replace(/\/$/, '');
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text || '{}');
    } catch (error) {
      return {};
    }
  }

  function getConfig(root) {
    var script = root.querySelector('[data-stylique-config]');
    return safeJsonParse(script ? script.textContent : '{}');
  }

  function api(config, path, options) {
    var headers = Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {});
    if (config.widgetToken) {
      headers['X-Stylique-Widget-Token'] = config.widgetToken;
    }
    var init = Object.assign({}, options || {}, { headers: headers });
    if (init.body && typeof init.body !== 'string' && !(init.body instanceof FormData)) {
      init.body = JSON.stringify(init.body);
    }
    if (init.body instanceof FormData) {
      delete init.headers['Content-Type'];
    }
    return fetch(normalizeBackend(config.backendUrl) + path, init).then(function (response) {
      return response.text().then(function (text) {
        var payload = safeJsonParse(text);
        if (payload && payload.widgetToken) {
          config.widgetToken = payload.widgetToken;
        }
        if (!response.ok) {
          var message = payload.error || payload.message || ('HTTP ' + response.status);
          throw new Error(message);
        }
        return payload;
      });
    });
  }

  function storageKey(config, key) {
    return 'stylique_ext_' + (config.storeId || config.shopDomain || 'store') + '_' + key;
  }

  function getStoredAuth(config) {
    var token = localStorage.getItem(storageKey(config, 'token')) || localStorage.getItem('stylique_auth_token');
    var rawUser = localStorage.getItem(storageKey(config, 'user')) || localStorage.getItem('stylique_user');
    if (!token || !rawUser) return null;
    var user = safeJsonParse(rawUser);
    return user && user.id ? { token: token, user: user } : null;
  }

  function setStoredAuth(config, token, user) {
    localStorage.setItem(storageKey(config, 'token'), token);
    localStorage.setItem(storageKey(config, 'user'), JSON.stringify(user));
    localStorage.setItem('stylique_auth_token', token);
    localStorage.setItem('stylique_user', JSON.stringify(user));
  }

  function clearStoredAuth(config) {
    localStorage.removeItem(storageKey(config, 'token'));
    localStorage.removeItem(storageKey(config, 'user'));
    localStorage.removeItem('stylique_auth_token');
    localStorage.removeItem('stylique_user');
    localStorage.removeItem('stylique_token');
  }

  function normalizeSize(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function matchVariant(product, recommendedSize) {
    var variants = (product && product.variants) || [];
    var desired = normalizeSize(recommendedSize);
    if (desired) {
      for (var i = 0; i < variants.length; i += 1) {
        var variant = variants[i];
        var values = [variant.title, variant.option1, variant.option2, variant.option3];
        if (values.some(function (value) { return normalizeSize(value) === desired; })) {
          return variant;
        }
      }
    }
    return variants.find(function (variant) { return variant.available !== false; }) || variants[0] || null;
  }

  function imageUrl(config) {
    var product = config.product || {};
    var images = product.images || [];
    return product.featuredImage || (images[0] && images[0].url) || '';
  }

  function cssVars(config) {
    var theme = config.theme || {};
    return [
      '--stylique-primary:' + (theme.primaryColor || '#642FD7'),
      '--stylique-secondary:' + (theme.secondaryColor || '#F4536F'),
      '--stylique-text:' + (theme.textColor || '#111827'),
      '--stylique-radius:' + (theme.borderRadius || 14) + 'px'
    ].join(';');
  }

  function heartbeat(config) {
    return api(config, '/api/shopify/widget/heartbeat', {
      method: 'POST',
      body: {
        storeId: config.storeId,
        shopDomain: config.shopDomain,
        productId: config.product && config.product.id,
        productHandle: config.product && config.product.handle,
        installMethod: config.installMethod || 'theme_app_block',
        extensionVersion: config.extensionVersion || VERSION,
        currentUrl: config.currentUrl || window.location.href
      }
    }).catch(function (error) {
      log(config, 'heartbeat failed', error.message);
    });
  }

  function buildWidget(root, config) {
    var placement = config.placementStyle || 'inline';
    var className = 'stylique-extension-widget' + (placement === 'floating' ? ' stylique-extension-floating' : '');
    root.innerHTML = [
      '<div class="' + className + '" data-placement="' + placement + '" style="' + cssVars(config) + '">',
      '  <button type="button" class="stylique-extension-trigger" data-stylique-open>',
      '    <span>' + (config.buttonLabel || 'Virtual Try-On') + '</span>',
      '  </button>',
      '  <div class="stylique-extension-modal" data-stylique-modal aria-hidden="true">',
      '    <div class="stylique-extension-backdrop" data-stylique-close></div>',
      '    <div class="stylique-extension-shell" role="dialog" aria-modal="true" aria-label="Stylique Virtual Try-On">',
      '      <div class="stylique-extension-header">',
      '        <div class="stylique-extension-brand">',
      '          <img class="stylique-extension-logo" src="' + ((config.theme && config.theme.logoUrl) || '') + '" alt="">',
      '          <div><strong>Stylique Virtual Try-On</strong><span data-stylique-subtitle>Premium fit preview</span></div>',
      '        </div>',
      '        <button type="button" class="stylique-extension-close" data-stylique-close aria-label="Close">&times;</button>',
      '      </div>',
      '      <div class="stylique-extension-body">',
      '        <div class="stylique-extension-product">',
      '          <div class="stylique-extension-product-frame"><img data-stylique-product-image alt=""></div>',
      '          <div class="stylique-extension-gallery" data-stylique-gallery></div>',
      '        </div>',
      '        <div class="stylique-extension-panel">',
      '          <h3 class="stylique-extension-title" data-stylique-title></h3>',
      '          <p class="stylique-extension-note" data-stylique-note>Check fit, upload a photo, and add your best size to cart.</p>',
      '          <div class="stylique-extension-card" data-stylique-auth></div>',
      '          <div class="stylique-extension-card" data-stylique-upload-card></div>',
      '          <div class="stylique-extension-card stylique-extension-fit" data-stylique-fit></div>',
      '          <div class="stylique-extension-card stylique-extension-result" data-stylique-result></div>',
      '          <div class="stylique-extension-card stylique-extension-complete-look" data-stylique-complete-look></div>',
      '          <div class="stylique-extension-status" data-stylique-status></div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function mount(root, config) {
    if (!root || mountedRoots.has(root)) return;
    mountedRoots.add(root);

    config = Object.assign({}, getConfig(root), config || {});
    if (!config.product) {
      heartbeat(config);
      return;
    }

    if (
      root.hasAttribute('data-stylique-embed') &&
      (
        window.__StyliqueOriginalWidgetMounting ||
        (window.__StyliqueOriginalWidgetState && (window.__StyliqueOriginalWidgetState.mounting || window.__StyliqueOriginalWidgetState.mounted)) ||
        document.querySelector('[data-stylique-original-widget-root]')
      )
    ) {
      installNativeTracking(config);
      heartbeat(config);
      return;
    }

    if (root.hasAttribute('data-stylique-embed') && document.querySelector('[data-stylique-block] .stylique-extension-widget')) {
      installNativeTracking(config);
      heartbeat(config);
      return;
    }

    if (root.hasAttribute('data-stylique-embed') && !config.enableFallbackButton) {
      installNativeTracking(config);
      heartbeat(config);
      return;
    }

    buildWidget(root, config);
    var state = {
      auth: getStoredAuth(config),
      pendingEmail: '',
      selectedFile: null,
      inventoryProduct: null,
      recommendedSize: null,
      completeLookLoadedFor: '',
      modalReturnFocus: null,
      modalCloseTimer: null,
      scrollState: null
    };

    var product = config.product || {};
    var modal = root.querySelector('[data-stylique-modal]');
    var statusEl = root.querySelector('[data-stylique-status]');
    var authEl = root.querySelector('[data-stylique-auth]');
    var uploadEl = root.querySelector('[data-stylique-upload-card]');
    var fitEl = root.querySelector('[data-stylique-fit]');
    var resultEl = root.querySelector('[data-stylique-result]');
    var completeLookEl = root.querySelector('[data-stylique-complete-look]');
    var imageEl = root.querySelector('[data-stylique-product-image]');
    var galleryEl = root.querySelector('[data-stylique-gallery]');

    root.querySelector('[data-stylique-title]').textContent = product.title || 'Virtual Try-On';
    imageEl.src = imageUrl(config);
    imageEl.alt = product.title || 'Product image';
    galleryEl.innerHTML = (product.images || []).slice(0, 4).map(function (img) {
      return '<img src="' + img.url + '" alt="' + (img.alt || product.title || '') + '">';
    }).join('');

    function setStatus(message, tone) {
      statusEl.textContent = message || '';
      statusEl.className = 'stylique-extension-status' + (tone ? ' is-' + tone : '');
    }

    function focusableElements(container) {
      return [].slice.call(container.querySelectorAll([
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(','))).filter(function (el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
    }

    function focusFirstInModal() {
      var first = modal.querySelector('[data-stylique-close]') || focusableElements(modal)[0];
      if (first && first.focus) {
        setTimeout(function () {
          try { first.focus({ preventScroll: true }); } catch (error) { first.focus(); }
        }, 0);
      }
    }

    function lockBodyScroll() {
      if (state.scrollState) return;
      var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      state.scrollState = {
        scrollY: scrollY,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow
      };
      document.documentElement.classList.add('stylique-extension-modal-open');
      document.body.classList.add('stylique-extension-modal-open');
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + scrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }

    function unlockBodyScroll() {
      if (!state.scrollState) return;
      var restoreY = Number.isFinite(state.scrollState.scrollY) ? state.scrollState.scrollY : 0;
      document.documentElement.classList.remove('stylique-extension-modal-open');
      document.body.classList.remove('stylique-extension-modal-open');
      document.body.style.position = state.scrollState.position || '';
      document.body.style.top = state.scrollState.top || '';
      document.body.style.left = state.scrollState.left || '';
      document.body.style.right = state.scrollState.right || '';
      document.body.style.width = state.scrollState.width || '';
      document.body.style.overflow = state.scrollState.overflow || '';
      state.scrollState = null;
      window.requestAnimationFrame(function () { window.scrollTo(0, restoreY); });
    }

    function handleModalKeydown(event) {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusables = focusableElements(modal);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function open() {
      if (modal.classList.contains('is-open') || modal.classList.contains('is-opening')) return;
      clearTimeout(state.modalCloseTimer);
      state.modalReturnFocus = document.activeElement;
      lockBodyScroll();
      modal.classList.remove('is-closing');
      modal.classList.add('is-opening');
      modal.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', handleModalKeydown);
      window.requestAnimationFrame(function () {
        modal.classList.add('is-open');
        modal.classList.remove('is-opening');
        focusFirstInModal();
      });
      checkProduct();
    }

    function close() {
      if (modal.classList.contains('is-closing')) return;
      modal.classList.remove('is-open', 'is-opening');
      modal.classList.add('is-closing');
      document.removeEventListener('keydown', handleModalKeydown);
      clearTimeout(state.modalCloseTimer);
      state.modalCloseTimer = setTimeout(function () {
        modal.classList.remove('is-closing');
        modal.setAttribute('aria-hidden', 'true');
        unlockBodyScroll();
        if (state.modalReturnFocus && state.modalReturnFocus.focus) {
          try { state.modalReturnFocus.focus({ preventScroll: true }); } catch (error) { state.modalReturnFocus.focus(); }
        }
      }, 300);
    }

    function renderAuth() {
      if (state.auth && state.auth.user) {
        authEl.innerHTML = [
          '<div class="stylique-extension-actions">',
          '  <span class="stylique-extension-note">Signed in as <strong>' + (state.auth.user.email || 'customer') + '</strong></span>',
          '  <button type="button" class="stylique-extension-btn" data-stylique-logout>Logout</button>',
          '</div>'
        ].join('');
        authEl.querySelector('[data-stylique-logout]').addEventListener('click', function () {
          clearStoredAuth(config);
          state.auth = null;
          state.selectedFile = null;
          renderAuth();
          renderUpload();
          setStatus('Logged out. Please log in to upload your photo.');
        });
        return;
      }

      authEl.innerHTML = [
        '<div class="stylique-extension-form">',
        '  <input class="stylique-extension-input" type="email" data-stylique-email placeholder="Enter email for verification">',
        '  <div class="stylique-extension-actions">',
        '    <button type="button" class="stylique-extension-btn stylique-extension-btn-primary" data-stylique-send>Send code</button>',
        '  </div>',
        '  <input class="stylique-extension-input" type="text" data-stylique-otp placeholder="Enter 6-digit code" maxlength="6" style="display:none">',
        '  <button type="button" class="stylique-extension-btn" data-stylique-verify style="display:none">Verify code</button>',
        '</div>'
      ].join('');

      var emailInput = authEl.querySelector('[data-stylique-email]');
      var otpInput = authEl.querySelector('[data-stylique-otp]');
      var verifyBtn = authEl.querySelector('[data-stylique-verify]');
      authEl.querySelector('[data-stylique-send]').addEventListener('click', function () {
        var email = emailInput.value.trim().toLowerCase();
        if (!email) return setStatus('Enter your email first.', 'error');
        setStatus('Sending verification code...');
        api(config, '/api/plugin/auth', { method: 'POST', body: { action: 'send_otp', email: email } })
          .then(function (payload) {
            state.pendingEmail = email;
            otpInput.style.display = '';
            verifyBtn.style.display = '';
            if (payload.dev_otp) {
              setStatus('Dev code: ' + payload.dev_otp, 'success');
            } else {
              setStatus(payload.message || 'Verification code sent.', 'success');
            }
          })
          .catch(function (error) { setStatus(error.message || 'Could not send code.', 'error'); });
      });

      verifyBtn.addEventListener('click', function () {
        var otp = otpInput.value.trim();
        if (!state.pendingEmail || !otp) return setStatus('Enter the code from your email.', 'error');
        setStatus('Verifying code...');
        api(config, '/api/plugin/auth', {
          method: 'POST',
          body: { action: 'verify_otp', email: state.pendingEmail, otp: otp }
        }).then(function (payload) {
          state.auth = { token: payload.token, user: payload.user };
          setStoredAuth(config, payload.token, payload.user);
          renderAuth();
          renderUpload();
          setStatus('Logged in. You can upload your photo now.', 'success');
        }).catch(function (error) {
          setStatus(error.message || 'Invalid verification code.', 'error');
        });
      });
    }

    function renderUpload() {
      if (!state.auth) {
        uploadEl.innerHTML = '<p class="stylique-extension-note">Please log in to upload your photo and generate a try-on.</p>';
        return;
      }
      uploadEl.innerHTML = [
        '<div class="stylique-extension-upload">',
        '  <label class="stylique-extension-file">',
        '    <input type="file" accept="image/*" data-stylique-file hidden>',
        '    <span data-stylique-file-label>Choose or drop your photo</span>',
        '  </label>',
        '  <div class="stylique-extension-actions">',
        '    <button type="button" class="stylique-extension-btn stylique-extension-btn-primary" data-stylique-tryon>Generate Try-On</button>',
        '    <button type="button" class="stylique-extension-btn" data-stylique-size>Recommend Size</button>',
        '  </div>',
        '</div>'
      ].join('');
      var fileInput = uploadEl.querySelector('[data-stylique-file]');
      var fileLabel = uploadEl.querySelector('[data-stylique-file-label]');
      fileInput.addEventListener('change', function () {
        state.selectedFile = fileInput.files && fileInput.files[0];
        fileLabel.textContent = state.selectedFile ? state.selectedFile.name : 'Choose or drop your photo';
      });
      uploadEl.querySelector('[data-stylique-tryon]').addEventListener('click', runTryOn);
      uploadEl.querySelector('[data-stylique-size]').addEventListener('click', loadSizeRecommendation);
    }

    function checkProduct() {
      api(config, '/api/plugin/check-product', {
        method: 'POST',
        body: {
          storeId: config.storeId || config.shopDomain,
          currentUrl: config.currentUrl || window.location.href,
          shopifyProductId: product.id
        }
      }).then(function (payload) {
        if (payload.available && payload.product) {
          state.inventoryProduct = payload.product;
          setStatus('Stylique is ready for this product.', 'success');
          loadCompleteLook();
          if (Number(payload.product.tier || 3) >= 3) loadSizeRecommendation();
        } else {
          setStatus('This product is syncing. You can still use size recommendation if data is available.');
        }
      }).catch(function (error) {
        setStatus(error.message || 'Could not check product availability.', 'error');
      });
    }

    function normalizeCompleteLookItems(payload) {
      if (!payload || !payload.success) return [];
      var source = [];
      if (Array.isArray(payload.outfits)) {
        payload.outfits.forEach(function (outfit) {
          if (outfit && Array.isArray(outfit.items)) {
            source = source.concat(outfit.items);
          }
        });
      }
      if (source.length === 0 && Array.isArray(payload.items)) source = payload.items;
      if (source.length === 0 && Array.isArray(payload.products)) source = payload.products;

      return source.map(function (item) {
        return {
          title: item.product_name || item.title || 'Product',
          image: item.image_url || item.featured_image || item.image || '',
          url: item.product_link || item.url || '',
          price: item.price
        };
      }).filter(function (item) {
        return item.title && item.image;
      }).slice(0, 4);
    }

    function formatCompleteLookPrice(value) {
      if (value == null || value === '') return '';
      var numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(numeric)) return escapeHtml(value);
      return '$' + numeric.toFixed(2);
    }

    function renderCompleteLook(items) {
      if (!completeLookEl) return;
      if (!items || items.length === 0) {
        completeLookEl.classList.remove('is-visible');
        completeLookEl.innerHTML = '';
        return;
      }

      completeLookEl.classList.add('is-visible');
      completeLookEl.innerHTML = [
        '<div class="stylique-extension-complete-head">',
        '  <div>',
        '    <p class="stylique-extension-note">Same-store styling picks</p>',
        '    <h4>Complete the Look</h4>',
        '  </div>',
        '</div>',
        '<div class="stylique-extension-look-grid">',
        items.map(function (item) {
          var price = formatCompleteLookPrice(item.price);
          var openTag = item.url
            ? '<a class="stylique-extension-look-card" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">'
            : '<div class="stylique-extension-look-card">';
          var closeTag = item.url ? '</a>' : '</div>';
          return [
            openTag,
            '  <div class="stylique-extension-look-image"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '"></div>',
            '  <div class="stylique-extension-look-info">',
            '    <strong>' + escapeHtml(item.title) + '</strong>',
            price ? '    <span>' + price + '</span>' : '',
            item.url ? '    <em>View Product</em>' : '',
            '  </div>',
            closeTag
          ].join('');
        }).join(''),
        '</div>'
      ].join('');
    }

    function loadCompleteLook() {
      var inventoryId = state.inventoryProduct && state.inventoryProduct.id;
      if (!inventoryId) return;
      if (state.completeLookLoadedFor === inventoryId) return;
      state.completeLookLoadedFor = inventoryId;

      api(config, '/api/plugin/complete-look', {
        method: 'POST',
        body: {
          storeId: config.storeId || config.shopDomain,
          productId: inventoryId,
          currentUrl: config.currentUrl || window.location.href,
          limit: 4
        }
      }).then(function (payload) {
        renderCompleteLook(normalizeCompleteLookItems(payload));
      }).catch(function (error) {
        log(config, 'complete look failed', error.message);
        renderCompleteLook([]);
      });
    }

    function loadSizeRecommendation() {
      if (!state.auth) return setStatus('Please log in to get your size recommendation.', 'error');
      setStatus('Calculating size recommendation...');
      api(config, '/api/plugin/size-recommendation', {
        method: 'POST',
        body: {
          storeId: config.storeId || config.shopDomain,
          productId: state.inventoryProduct && state.inventoryProduct.id,
          currentUrl: config.currentUrl || window.location.href,
          userId: state.auth.user && state.auth.user.id
        }
      }).then(function (payload) {
        var rec = payload.recommendation || {};
        state.recommendedSize = rec.bestFit || rec.recommendedSize || rec.recommended || rec.size || null;
        var confidence = Math.max(0, Math.min(100, Math.round(Number(rec.confidence || 0))));
        var fitFeel = rec.fitFeel || {};
        var fitRows = ['chest', 'shoulder', 'waist', 'length', 'sleeve', 'hips']
          .filter(function (key) { return fitFeel[key]; })
          .slice(0, 2)
          .map(function (key) {
            return '<span class="stylique-extension-fit-line">' + escapeHtml(key.charAt(0).toUpperCase() + key.slice(1)) + ': ' + escapeHtml(fitFeel[key]) + '</span>';
          })
          .join('');
        var alternatives = Array.isArray(rec.alternatives) ? rec.alternatives.filter(Boolean).slice(0, 2) : [];
        var alternativeHtml = alternatives.length
          ? '<div class="stylique-extension-alt-sizes">' + alternatives.map(function (size) {
              return '<button type="button" class="stylique-extension-size-choice" data-stylique-alt-size="' + escapeHtml(size) + '">Size ' + escapeHtml(size) + '</button>';
            }).join('') + '</div>'
          : '';
        fitEl.classList.add('is-visible');
        fitEl.innerHTML = [
          '<p class="stylique-extension-note">Recommended size</p>',
          '<strong>' + escapeHtml(state.recommendedSize || 'Best available') + '</strong>',
          '<div class="stylique-extension-confidence" aria-label="Fit confidence">',
          '  <span>Fit confidence</span><span>' + confidence + '%</span>',
          '  <div class="stylique-extension-confidence-track"><div style="width:' + confidence + '%"></div></div>',
          '</div>',
          fitRows ? '<div class="stylique-extension-fit-lines">' + fitRows + '</div>' : '',
          alternativeHtml,
          '<div class="stylique-extension-actions">',
          '  <button type="button" class="stylique-extension-btn stylique-extension-btn-primary" data-stylique-cart>Use this size</button>',
          '</div>'
        ].join('');
        fitEl.querySelectorAll('[data-stylique-alt-size]').forEach(function (button) {
          button.addEventListener('click', function () {
            state.recommendedSize = button.getAttribute('data-stylique-alt-size');
            fitEl.querySelectorAll('[data-stylique-alt-size]').forEach(function (item) { item.classList.remove('is-selected'); });
            button.classList.add('is-selected');
          });
        });
        fitEl.querySelector('[data-stylique-cart]').addEventListener('click', addToCart);
        setStatus('Size recommendation ready.', 'success');
      }).catch(function (error) {
        setStatus(error.message || 'Could not calculate size recommendation.', 'error');
      });
    }

    function runTryOn() {
      if (!state.auth) return setStatus('Please log in to upload your photo.', 'error');
      if (!state.selectedFile) return setStatus('Choose a photo first.', 'error');
      var form = new FormData();
      form.append('storeId', config.storeId || config.shopDomain);
      form.append('currentUrl', config.currentUrl || window.location.href);
      form.append('userImage', state.selectedFile);
      form.append('product_id', state.inventoryProduct && state.inventoryProduct.id ? state.inventoryProduct.id : '');
      form.append('image_url', imageUrl(config));
      form.append('userId', state.auth.user && state.auth.user.id ? state.auth.user.id : '');
      setStatus('Creating your try-on...');
      api(config, '/api/plugin/embed-tryon-2d', { method: 'POST', body: form, headers: {} })
        .then(function (payload) {
          resultEl.classList.add('is-visible', 'is-entering');
          resultEl.innerHTML = [
            '<div class="stylique-extension-result-frame">',
            '  <img class="stylique-extension-result-image" data-stylique-result-image src="' + (payload.resultImage || imageUrl(config)) + '" alt="Virtual try-on result">',
            '</div>',
            '<div class="stylique-extension-actions">',
            '  <button type="button" class="stylique-extension-btn stylique-extension-btn-primary" data-stylique-cart>Add to cart</button>',
            '  <button type="button" class="stylique-extension-btn" data-stylique-again>Try again</button>',
            '</div>'
          ].join('');
          var resultImageEl = resultEl.querySelector('[data-stylique-result-image]');
          if (resultImageEl) {
            resultImageEl.addEventListener('load', function () {
              resultEl.classList.add('is-loaded');
              resultEl.classList.remove('is-entering');
            }, { once: true });
            if (resultImageEl.complete) {
              resultEl.classList.add('is-loaded');
              resultEl.classList.remove('is-entering');
            }
          }
          resultEl.querySelector('[data-stylique-cart]').addEventListener('click', addToCart);
          resultEl.querySelector('[data-stylique-again]').addEventListener('click', function () {
            resultEl.classList.remove('is-visible', 'is-entering', 'is-loaded');
            state.selectedFile = null;
            renderUpload();
          });
          loadSizeRecommendation();
          loadCompleteLook();
          setStatus('Try-on result ready.', 'success');
        })
        .catch(function (error) { setStatus(error.message || 'Try-on failed.', 'error'); });
    }

    function addToCart() {
      var variant = matchVariant(product, state.recommendedSize);
      if (!variant || !variant.id) {
        setStatus('Please choose your size on the product page.', 'error');
        return;
      }
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variant.id, quantity: 1 })
      }).then(function (response) {
        if (!response.ok) throw new Error('Add to cart failed');
        return response.json();
      }).then(function () {
        trackConversion();
        window.location.href = '/cart';
      }).catch(function (error) {
        setStatus(error.message || 'Could not add to cart.', 'error');
      });
    }

    function trackConversion() {
      api(config, '/api/plugin/track-conversion', {
        method: 'POST',
        body: {
          store_id: config.storeId || config.shopDomain,
          product_id: state.inventoryProduct && state.inventoryProduct.id,
          user_id: state.auth && state.auth.user && state.auth.user.id,
          status: 'added_to_cart',
          add_to_cart: true
        }
      }).catch(function () {});
    }

    root.querySelector('[data-stylique-open]').addEventListener('click', open);
    root.querySelectorAll('[data-stylique-close]').forEach(function (button) {
      button.addEventListener('click', close);
    });
    renderAuth();
    renderUpload();
    installNativeTracking(config);
    heartbeat(config);
  }

  function installNativeTracking(config) {
    if (!config.enableNativeCartTracking || globalListeners) return;
    globalListeners = true;
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest && event.target.closest('[name="add"], .product-form__submit, .add-to-cart');
      if (!target) return;
      api(config, '/api/plugin/track-conversion', {
        method: 'POST',
        body: {
          store_id: config.storeId || config.shopDomain,
          product_id: config.product && config.product.id,
          status: 'native_add_to_cart',
          add_to_cart: true
        }
      }).catch(function () {});
    });
  }

  function boot() {
    document.querySelectorAll('[data-stylique-block], [data-stylique-embed]').forEach(function (root) {
      mount(root);
    });
  }

  window[NS] = window[NS] || {};
  window[NS].mount = mount;
  window[NS].version = VERSION;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
