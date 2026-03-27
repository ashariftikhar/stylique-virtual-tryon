(function () {
  "use strict";

  // Initialize State
  window.styliqueSection = {
    storeId: styliqueConfig.storeId,
    storeUuid: null, // [NEW] Store UUID from DB
    user: null,
    selectedImage: null,
    garmentImage: null,
    currentProduct: null,
    productUuid: null, // [NEW] Product UUID from DB
    currentUrl: window.location.href,
    selectedBodyType: "",
    tryonsQuota: 0, // Default fallback
    tryonsUsed: 0,
    planActive: true,
  };

  console.log("Stylique Plugin Config Loaded:", styliqueConfig);

  if (!styliqueConfig.storeId) {
    console.error("Stylique Error: Store ID is missing in configuration.");
  }

  const API_BASE_URL = "https://www.styliquetechnologies.com/api";

  // Apply Custom Colors
  function applyColors() {
    const root = document.documentElement;
    if (styliqueConfig.colors.primary) {
      root.style.setProperty(
        "--stylique-primary",
        styliqueConfig.colors.primary,
      );
    }
    if (styliqueConfig.colors.secondary) {
      root.style.setProperty(
        "--stylique-secondary",
        styliqueConfig.colors.secondary,
      );
    }
  }

  // ==========================================
  // AUTHENTICATION FUNCTIONS
  // ==========================================

  window.sendOTP = async function () {
    const emailInput = document.getElementById("stylique-email");
    const email = emailInput.value.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      showError("Please enter a valid email address");
      return;
    }

    const btn = document.getElementById("stylique-send-otp-btn");
    const spinner = document.getElementById("stylique-send-spinner");
    const text = document.getElementById("stylique-send-text");

    btn.disabled = true;
    text.style.display = "none";
    spinner.style.display = "flex";
    hideError();

    try {
      const response = await fetch(`${API_BASE_URL}/plugin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          action: "send_otp",
        }),
      });

      const data = await response.json();

      if (data.success) {
        document.getElementById("stylique-email-step").style.display = "none";
        document.getElementById("stylique-otp-step").style.display = "block";
        document.getElementById("stylique-email-display").textContent = email;
        showSuccess("Verification code sent!");
        setTimeout(() => document.getElementById("stylique-otp").focus(), 100);
      } else {
        // Generic error message for user
        showError("Unable to send code. Please check your email and try again.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      showError("Connection error. Please try again.");
    } finally {
      btn.disabled = false;
      text.style.display = "block";
      spinner.style.display = "none";
    }
  };

  window.verifyOTP = async function () {
    const email = document.getElementById("stylique-email").value.trim();
    const otpInput = document.getElementById("stylique-otp");
    const otp = otpInput.value.trim();

    if (!otp || otp.length !== 6) {
      showError("Please enter the 6-digit code");
      return;
    }

    const btn = document.getElementById("stylique-verify-btn");
    const spinner = document.getElementById("stylique-verify-spinner");
    const text = document.getElementById("stylique-verify-text");

    btn.disabled = true;
    text.style.display = "none";
    spinner.style.display = "flex";
    hideError();

    try {
      const response = await fetch(`${API_BASE_URL}/plugin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          otp: otp,
          action: "verify_otp",
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        localStorage.setItem("stylique_user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("stylique_token", data.token);

        window.styliqueSection.user = data.user;
        
        // Track Sign In
        trackUserAction('sign_in');

        if (data.isNewUser) {
          showOnboardingModal();
        } else {
          showTryOnInterface();
        }
      } else {
        // Generic error message for user
        showError("Invalid verification code. Please try again.");
        otpInput.value = "";
      }
    } catch (error) {
      console.error("Verify error:", error);
      showError("Verification failed. Please try again.");
    } finally {
      btn.disabled = false;
      text.style.display = "block";
      spinner.style.display = "none";
    }
  };

  window.logoutFromStylique = function () {
    localStorage.removeItem("stylique_user");
    localStorage.removeItem("stylique_token");
    window.styliqueSection.user = null;
    location.reload();
  };

  function checkLoginStatus() {
    const storedUser = localStorage.getItem("stylique_user");
    if (storedUser) {
      try {
        window.styliqueSection.user = JSON.parse(storedUser);
        showTryOnInterface();
      } catch {
        localStorage.removeItem("stylique_user");
      }
    }
  }

  // ==========================================
  // UI HELPER FUNCTIONS
  // ==========================================

  function showError(msg) {
    const el = document.getElementById("stylique-login-error");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
    const inlineEl = document.getElementById("stylique-inline-error");
    if (inlineEl) {
      inlineEl.textContent = msg;
      inlineEl.style.display = "block";
    }
  }

  function hideError() {
    const el = document.getElementById("stylique-login-error");
    if (el) el.style.display = "none";
    const inlineEl = document.getElementById("stylique-inline-error");
    if (inlineEl) inlineEl.style.display = "none";
  }

  function showSuccess(msg) {
    const el = document.getElementById("stylique-login-success");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
      setTimeout(() => {
        el.style.display = "none";
      }, 3000);
    }
  }

  function showTryOnInterface() {
    document.getElementById("stylique-login-required").style.display = "none";
    document.getElementById("stylique-inline-onboarding").style.display =
      "none";
    document.getElementById("stylique-tryon-interface").style.display = "grid";

    const displayName =
      window.styliqueSection.user.name ||
      window.styliqueSection.user.email ||
      "User";
    document.getElementById("stylique-user-email").textContent = displayName;

    const p = styliqueConfig.product;
    const imgEl = document.getElementById("stylique-current-product-img");
    const titleEl = document.getElementById("stylique-current-product-title");
    const priceEl = document.getElementById("stylique-current-product-price");

    if (imgEl && p.image) imgEl.src = p.image;
    if (titleEl && p.title) titleEl.textContent = p.title;
    if (priceEl && p.price) priceEl.textContent = p.price;

    checkProductAvailability(p.url || window.location.href);
  }

  async function checkProductAvailability(url) {
    try {
      const response = await fetch(`${API_BASE_URL}/plugin/check-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: styliqueConfig.storeId,
          currentUrl: url,
        }),
      });
      const data = await response.json();

      if (data.available) {
        // [NEW] Capture Product UUID
        if (data.product && data.product.id) {
            window.styliqueSection.productUuid = data.product.id;
            console.log('✅ Product UUID resolved:', data.product.id);
        }

        document.getElementById("stylique-product-unavailable").style.display =
          "none";
        document.querySelector(".stylique-upload-section").style.display =
          "block";
      } else {
        document.getElementById("stylique-product-unavailable").style.display =
          "block";
        document.querySelector(".stylique-upload-section").style.display =
          "none";
      }
    } catch (e) {
      console.warn("Failed to check product availability", e);
      document.getElementById("stylique-product-unavailable").style.display =
        "none";
    }
  }

  // ==========================================
  // TRY-ON LOGIC
  // ==========================================

  window.handleFileSelect = function (event) {
    const file = event.target.files[0];
    if (file) {
      window.styliqueSection.selectedImage = file;

      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("stylique-preview-img").src = e.target.result;
        document.getElementById("stylique-upload-area").style.display = "none";
        document.getElementById("stylique-image-preview").style.display =
          "inline-block";

        updateTryOnButtonsState();

        // Load recommendations immediately if possible
        if (styliqueConfig.product.id) {
          loadSizeRecommendation(styliqueConfig.product.id);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Animation state
  let processingState = {
    progress: 0,
    interval: null,
    currentStep: 1,
  };

  function simulateProcessingProgress() {
    // Reset state
    processingState.progress = 0;
    processingState.currentStep = 1;

    const titleEl = document.getElementById("stylique-processing-title");
    const textEl = document.getElementById("stylique-processing-text");
    const percentEl = document.getElementById("stylique-progress-percent");

    // Reset Steps
    ["stylique-step-1", "stylique-step-2", "stylique-step-3"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active", "completed");
    });
    ["stylique-line-1", "stylique-line-2"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active");
    });

    // Set initial state
    const s1 = document.getElementById("stylique-step-1");
    if (s1) s1.classList.add("active");
    if (titleEl) titleEl.textContent = "Analyzing Body";
    if (textEl) textEl.textContent = "Scanning measurements...";
    if (percentEl) percentEl.textContent = "0%";

    // Start Interval
    if (processingState.interval) clearInterval(processingState.interval);

    processingState.interval = setInterval(() => {
      // Increment progress
      // Slower at higher percentages to allow API time to finish
      let increment = 0.5;
      if (processingState.progress > 80) increment = 0.1;
      else if (processingState.progress > 50) increment = 0.3;

      processingState.progress += increment;

      // Cap at 95% until actual success
      if (processingState.progress > 95) processingState.progress = 95;

      const currentP = Math.floor(processingState.progress);
      if (percentEl) percentEl.textContent = currentP + "%";

      // Logic for steps
      updateProcessingSteps(currentP);
    }, 50);
  }

  function updateProcessingSteps(percent) {
    const titleEl = document.getElementById("stylique-processing-title");
    const textEl = document.getElementById("stylique-processing-text");

    // Step 1: Analyzing (0-30%)
    if (percent < 30) {
      if (processingState.currentStep !== 1) {
        processingState.currentStep = 1;
        if (titleEl) titleEl.textContent = "Analyzing Body";
        if (textEl) textEl.textContent = "Scanning measurements...";

        const s1 = document.getElementById("stylique-step-1");
        if (s1) s1.classList.add("active");
      }
    }
    // Step 2: Styling (30-70%)
    else if (percent >= 30 && percent < 70) {
      if (processingState.currentStep !== 2) {
        processingState.currentStep = 2;
        if (titleEl) titleEl.textContent = "Styling the Garment";
        if (textEl) textEl.textContent = "Fitting clothing to your body...";

        const s1 = document.getElementById("stylique-step-1");
        if (s1) {
          s1.classList.remove("active");
          s1.classList.add("completed");
        }

        document.getElementById("stylique-line-1").classList.add("active");
        document.getElementById("stylique-step-2").classList.add("active");
      }
    }
    // Step 3: Rendering (70%+)
    else if (percent >= 70) {
      if (processingState.currentStep !== 3) {
        processingState.currentStep = 3;
        if (titleEl) titleEl.textContent = "Finalizing Result";
        if (textEl) textEl.textContent = "Rendering final image...";

        const s2 = document.getElementById("stylique-step-2");
        if (s2) {
          s2.classList.remove("active");
          s2.classList.add("completed");
        }

        document.getElementById("stylique-line-2").classList.add("active");
        document.getElementById("stylique-step-3").classList.add("active");
      }
    }
  }

  function completeProcessingAnimation() {
    clearInterval(processingState.interval);
    const percentEl = document.getElementById("stylique-progress-percent");
    if (percentEl) percentEl.textContent = "100%";

    const s3 = document.getElementById("stylique-step-3");
    if (s3) {
      s3.classList.remove("active");
      s3.classList.add("completed");
    }
  }

  window.start2DTryOn = async function () {
    if (!window.styliqueSection.selectedImage) return;

    if (!styliqueConfig.storeId) {
      alert(
        "Service configuration issue. Please contact support.",
      );
      console.error("Missing Store ID");
      return;
    }

    showProcessingOverlay();
    simulateProcessingProgress();

    try {
      const formData = new FormData();
      formData.append("storeId", styliqueConfig.storeId);
      formData.append("currentUrl", window.styliqueSection.currentUrl);
      formData.append("userImage", window.styliqueSection.selectedImage);
      formData.append("garmentType", "upper_body");

      if (window.styliqueSection.user && window.styliqueSection.user.id) {
        formData.append("userId", window.styliqueSection.user.id);
      }

      // Using the endpoint discovered in liquid file
      const response = await fetch(`${API_BASE_URL}/plugin/embed-tryon-2d`, {
        method: "POST",
        body: formData,
        headers: {
          "X-Current-URL": window.styliqueSection.currentUrl,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.resultImage) {
        // Animate to completion before hiding
        completeProcessingAnimation();

        // Small delay to let user see 100%
        setTimeout(() => {
          document.getElementById("stylique-result-image").src =
            result.resultImage;
          const inlineResultImg = document.getElementById(
            "stylique-inline-result-img",
          );
          if (inlineResultImg) inlineResultImg.src = result.resultImage;

          // Show inline result
          const inlineResult = document.getElementById(
            "stylique-inline-result",
          );
          if (inlineResult) inlineResult.style.display = "block";

          if (result.product) {
            window.styliqueSection.currentProduct = result.product;
            if (result.product.id) {
              loadSizeRecommendation(
                result.product.id,
                "stylique-plugin-size-recommendation-content",
              );
            }
          }

          hideProcessingOverlay();
          showResultsModal(result.resultImage);
          // Also show inline result
          document.getElementById("stylique-inline-result").style.display =
            "block";
        }, 800);

        // Fire analytics and consume try-on
        consumeTryonAndTrack(
          "2d",
          result.product?.id || styliqueConfig.product.id,
        );
      } else {
        throw new Error("Processing failed");
      }
    } catch (error) {
      console.error("Try-on error:", error);
      clearInterval(processingState.interval);
      hideProcessingOverlay();
      alert("We encountered a temporary issue. Please try again.");
    }
  };



  // 3D Virtual try-on process
  // 3D Virtual try-on process
  window.start3DTryOn = async function () {
    if (!window.styliqueSection.selectedImage) {
      alert("Please select a full-body image first.");
      return;
    }

    if (!styliqueConfig.storeId) {
      alert("Service configuration issue. Please contact support.");
      return;
    }

    // Gate: only ULTIMATE and active with quota
    const plan = window.styliqueSection.storePlan;
    const active = window.styliqueSection.planActive;
    const remaining = Math.max(0, window.styliqueSection.tryonsQuota - window.styliqueSection.tryonsUsed);
    if (!(plan === 'ULTIMATE' && active && remaining > 0)) {
        alert('3D Try-On is available only for ULTIMATE plan with active subscription and remaining quota.');
        return;
    }

    showProcessingOverlay();

    const processingTexts = [
      "Preparing 3D environment...",
      "Analyzing body posture...",
      "Generating 360° preview...",
      "Compiling assets...",
      "Finalizing your virtual try-on...",
    ];
    let textIndex = 0;
    const textInterval = setInterval(() => {
      document.getElementById("stylique-processing-text").textContent =
        processingTexts[textIndex];
      textIndex = (textIndex + 1) % processingTexts.length;
    }, 4000);

    let clientTimeout;
    let pollInterval;

    try {
      let currentProductId = styliqueConfig.product.id;

      // Note: WordPress plugin might not pass garmentImage if backend handles it via productId
      // But keeping logic consistent with valid data
      /*
      if (productImageUrl) {
        garmentImage = await fetchGarmentImage(productImageUrl);
      }
      */

      const formData = new FormData();
      formData.append("storeId", styliqueConfig.storeId);
      formData.append("userImage", window.styliqueSection.selectedImage);
      // formData.append("userId", window.styliqueSection.user.id); // Typically added if available
      if (window.styliqueSection.user && window.styliqueSection.user.id) {
          formData.append("userId", window.styliqueSection.user.id);
      }
      formData.append("productId", currentProductId);

      // Client-side timeout warning
      clientTimeout = setTimeout(() => {
        const procText = document.getElementById('stylique-processing-text');
        if(procText) procText.textContent = 'Generating high-quality 3D video... Please wait.';
      }, 30000);

      // 1. Start Generation
      const response = await fetch(`${API_BASE_URL}/plugin/embed-tryon-3d`, {
        method: "POST",
        body: formData,
        headers: {
          "X-Current-URL": window.styliqueSection.currentUrl,
        },
      });

      if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Service error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      if (!data.success) {
          throw new Error(data.error || 'Failed to start 3D generation');
      }

      const operationName = data.operationName;
      console.log('3D Operation started:', operationName);

      // 2. Poll for Video
       pollInterval = setInterval(async () => {
           try {
               const statusResp = await fetch(`${API_BASE_URL}/plugin/embed-tryon-3d?operationName=${encodeURIComponent(operationName)}`);
               const statusData = await statusResp.json();
               
               if (statusData.done && statusData.videoUrl) {
                    // Success!
                    clearInterval(pollInterval);
                    clearInterval(textInterval);
                    clearTimeout(clientTimeout);

                    const videoUrl = statusData.videoUrl;
                    
                    // Show Result
                    show3DVideoResult(videoUrl);

                    // Load Size Recommendations if Product ID is available
                    const productId3d = data.product?.id || styliqueConfig.product.id;
                    if (productId3d) {
                         const recContainer = document.getElementById('stylique-plugin-recommendations');
                         if(recContainer) recContainer.style.display = 'block';
                         
                         loadSizeRecommendation(
                            productId3d, 
                            "stylique-plugin-size-recommendation-content"
                         );
                    }

                    // Fire analytics and consume try-on
                    console.log('📊 3D Try-On Success - Logging analytics for product:', productId3d);
                    consumeTryonAndTrack('3d', productId3d).catch(e => console.error('Analytics error:', e));
                    
                    hideProcessingOverlay();
               } else if (statusData.done && statusData.error) {
                    // Failure
                    clearInterval(pollInterval);
                    throw new Error(statusData.error);
               }
               // Else: still processing...
           } catch (pollErr) {
               console.error("Polling error", pollErr);
               clearInterval(pollInterval);
               clearInterval(textInterval);
               clearTimeout(clientTimeout);
               hideProcessingOverlay();
               alert('We encountered a temporary issue. Please try again.');
           }
      }, 5000); // Check every 5s

    } catch (error) {
      console.error("3D try-on error:", error);
      clearInterval(textInterval);
      if(pollInterval) clearInterval(pollInterval);
      if(clientTimeout) clearTimeout(clientTimeout);
      hideProcessingOverlay();
      alert("We encountered a temporary issue. Please try again.");
    }
  };

  function show3DVideoResult(videoUrl) {
      const inlineResult3D = document.getElementById('stylique-inline-3d-result');
      const container = document.getElementById('stylique-3d-inline-container');
      const tryonOptions = document.querySelector('.stylique-tryon-options');
      const uploadArea = document.querySelector('.stylique-upload-section');
      
      if (!inlineResult3D || !container) {
          console.error("3D result container missing");
          return;
      }
      
      // Inject Video
      container.innerHTML = `
        <video src="${videoUrl}" autoplay loop playsinline controls style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"></video>
      `;
      
      // Toggle visibility
      if (tryonOptions) tryonOptions.style.display = 'none';
      if (uploadArea) uploadArea.style.display = 'none';
      if (document.getElementById('stylique-inline-result')) document.getElementById('stylique-inline-result').style.display = 'none';
      
      inlineResult3D.style.display = 'block';
  }

  function showProcessingOverlay() {
    document.getElementById("stylique-processing-overlay").style.display =
      "flex";
  }
  function hideProcessingOverlay() {
    document.getElementById("stylique-processing-overlay").style.display =
      "none";
  }

  function showResultsModal(imgUrl) {
    if (imgUrl) document.getElementById("stylique-result-image").src = imgUrl;
    document.getElementById("stylique-results-modal").style.display = "flex";
  }

  window.hideResultsModal = function () {
    document.getElementById("stylique-results-modal").style.display = "none";
  };

  // Show 3D result


  window.hide3DResultsModal = function () {
    const modal = document.getElementById("stylique-3d-results-modal");
    if (modal) modal.style.display = "none";

    // Reset 3D viewer logic
    if (window.stylique3DViewer) {
      cancelAnimationFrame(window.stylique3DViewer.animationId);
      window.stylique3DViewer.renderer.dispose();
      window.stylique3DViewer = {};
    }
  };

  window.resetTryOn = function () {
    window.styliqueSection.selectedImage = null;
    document.getElementById("stylique-image-preview").style.display = "none";
    document.getElementById("stylique-file-input").value = "";
    
    // Reset 2D
    const result2D = document.getElementById("stylique-inline-result");
    if (result2D) result2D.style.display = "none";
    
    // Reset 3D
    const result3D = document.getElementById("stylique-inline-3d-result");
    if (result3D) result3D.style.display = "none";
    const container3D = document.getElementById("stylique-3d-inline-container");
    if (container3D) container3D.innerHTML = "";
    
    // Show Controls
    const uploadSection = document.querySelector(".stylique-upload-section");
    if (uploadSection) uploadSection.style.display = "block";
    const uploadArea = document.getElementById("stylique-upload-area");
    if (uploadArea) uploadArea.style.display = "block";
    const options = document.querySelector(".stylique-tryon-options");
    if (options) options.style.display = "block";

    updateTryOnButtonsState();
    hideResultsModal();
  };

  window.addToCart = function () {
    // Broaden selectors to catch standard WooCommerce and theme-specific buttons
    const selectors = [
      ".single_add_to_cart_button",
      'button[name="add-to-cart"]',
      'form.cart button[type="submit"]',
      "form.cart .button",
    ];

    let addToCartBtn = null;
    for (const sel of selectors) {
      addToCartBtn = document.querySelector(sel);
      if (addToCartBtn && addToCartBtn.offsetParent !== null) {
        // Check visibility
        break;
      }
    }

    if (addToCartBtn) {
      // Scroll to the button
      addToCartBtn.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight button
      addToCartBtn.classList.add("stylique-highlight-btn");
      const originalTransition = addToCartBtn.style.transition;
      addToCartBtn.style.transition = "all 0.3s ease";
      addToCartBtn.style.boxShadow = "0 0 0 4px rgba(100, 47, 215, 0.4)";

      // Highlight attribute selectors if present (to guide user to select size)
      const variations = document.querySelector(".variations_form");
      if (variations) {
        const selects = variations.querySelectorAll("select");
        selects.forEach((s) => {
          if (!s.value) {
            s.style.border = "2px solid var(--stylique-primary)";
            s.style.backgroundColor = "rgba(100, 47, 215, 0.05)";
            setTimeout(() => {
              s.style.border = "";
              s.style.backgroundColor = "";
            }, 3000);
          }
        });
      }

      // Attempt to click it
      setTimeout(() => {
        addToCartBtn.click();
        // Clean up visual cue
        setTimeout(() => {
          addToCartBtn.style.boxShadow = "";
          addToCartBtn.classList.remove("stylique-highlight-btn");
          addToCartBtn.style.transition = originalTransition;
        }, 2000);
      }, 800);
      return;
    }

    // Fallback: Standard WooCommerce add to cart via URL redirect
    const pid = styliqueConfig.product.id;
    if (pid) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("add-to-cart", pid);
      window.location.href = currentUrl.toString();
    } else {
      console.error("No product ID found for add to cart");
      alert("Please verify your selection above and click Add to Cart.");
    }
  };

  // 3D VIEWER LOGIC (Simplified wrapper for Three.js)
  window.stylique3DViewer = {};




    // Load Model


  // ==========================================
  // STORE STATUS & ANALYTICS
  // ==========================================

  async function fetchStoreStatus() {
    if (!styliqueConfig.storeId) return;

    function applyStoreRow(s) {
      window.styliqueSection.storeStatus = s;
      window.styliqueSection.storeUuid = s.id; // [NEW] Capture Store UUID
      window.styliqueSection.storePlan = s.subscription_name || null;

      let active = false;
      const hasDates = !!s.subscription_start_at && !!s.subscription_end_at;
      if (hasDates) {
        const today = new Date();
        const start = new Date(s.subscription_start_at);
        const end = new Date(s.subscription_end_at);
        active = today >= start && today <= end;
      } else if (s.subscription_name) {
        // Assumption: if plan exists but no dates, considered active or handle logic
        active = true;
      }

      window.styliqueSection.planActive = active;
      window.styliqueSection.tryonsQuota =
        typeof s.tryons_quota === "number" ? s.tryons_quota : 0;
      window.styliqueSection.tryonsUsed =
        typeof s.tryons_used === "number" ? s.tryons_used : 0;

      console.log("Store status:", {
        plan: s.subscription_name,
        active: active,
        quota: window.styliqueSection.tryonsQuota,
        used: window.styliqueSection.tryonsUsed,
      });

      updateTryOnButtonsState();
    }

    try {
      const url = `${API_BASE_URL}/plugin/store-status?storeId=${encodeURIComponent(styliqueConfig.storeId)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.success && json.store) {
          applyStoreRow(json.store);
          return;
        }
      }
    } catch (e) {
      console.warn("Store status fetch failed", e);
    }

    // Fallback
    try {
      const url2 = `${API_BASE_URL}/plugin/list-stores`;
      const resp2 = await fetch(url2);
      if (resp2.ok) {
        const json2 = await resp2.json();
        if (json2 && json2.success && Array.isArray(json2.stores)) {
          const match = json2.stores.find(function (x) {
            return x && x.store_id === styliqueConfig.storeId;
          });
          if (match) {
            applyStoreRow(match);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Fallback store list failed", e);
    }

    updateTryOnButtonsState();
  }

  // ==========================================
  // ANALYTICS & TRACKING
  // ==========================================

  async function trackUserAction(actionType, productId = null) {
      if (!styliqueConfig.storeId) {
        console.warn('Analytics: Store ID missing, cannot track.');
        return;
      }

      try {
          // Resolve Product ID (Prefer UUID if available/matching)
          let pid = productId;
          
          // If no ID passed, or it matches current WC ID, try to use UUID
          if ((!pid || String(pid) === String(styliqueConfig.product.id)) && window.styliqueSection.productUuid) {
              pid = window.styliqueSection.productUuid;
          } else if (!pid && styliqueConfig.product && styliqueConfig.product.id) {
              // Fallback to WC ID
              pid = styliqueConfig.product.id;
          }

          // Resolve Store ID (Prefer UUID)
          const storeIdToUse = window.styliqueSection.storeUuid || styliqueConfig.storeId;
          const currentUserId = window.styliqueSection.user?.id || null;

          // 1. General Analytics Tracking
          const payload = {
            storeId: storeIdToUse,
            tryonType: actionType, // 'sign_in', 'add_to_cart', '2d', '3d'
            currentUrl: window.styliqueSection.currentUrl,
            userId: currentUserId,
            productId: pid ? String(pid) : null
          };

          console.log(`📊 Tracking Action [${actionType}]:`, payload);

          // Use keepalive: true so the request survives page redirects/reloads (e.g. form submission)
          await fetch(`${API_BASE_URL}/plugin/tryon-analytics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
          });

          // 2. Conversion Tracking (Strict Database Update)
          // Only for 'add_to_cart' to update the Conversions table
          if (actionType === 'add_to_cart' && currentUserId && pid) {
              console.log('💰 Tracking Conversion [Add to Cart]');
              await fetch(`${API_BASE_URL}/plugin/track-conversion`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      user_id: currentUserId,
                      store_id: storeIdToUse, // Use resolved UUID
                      product_id: String(pid),
                      status: 'Logged In',
                      add_to_cart: true
                  }),
                  keepalive: true
              });
          }

      } catch (e) {
          console.error("Tracking error:", e);
      }
  }

  function setupAddToCartTracking() {
      // 1. Listen for WooCommerce AJAX Add to Cart (jQuery event) - Standard for AJAX themes
      if (typeof jQuery !== 'undefined') {
          jQuery(document.body).on('added_to_cart', function(event, fragments, cart_hash, $button) {
              let pid = null;
              if ($button && $button.data('product_id')) {
                  pid = $button.data('product_id');
              }
              console.log('🛒 WooCommerce AJAX Add to Cart Event detected. PID:', pid);
              trackUserAction('add_to_cart', pid);
          });
      }

      // 2. Fallback: Listen for Main Add To Cart Button Click (Intent tracking)
      // We use event delegation on body to catch buttons even if they are dynamically replaced
      document.body.addEventListener('click', function(e) {
          // Broad selector for various theme button implementations
          const btn = e.target.closest('.single_add_to_cart_button, button[name="add-to-cart"], .add_to_cart_button');
          
          if (btn) {
               // Retrieve ID from button value or hidden input if available, else standard fallback
               let pid = btn.value; 
               if (!pid || isNaN(parseInt(pid))) {
                   // Try finding the input inside the form
                   const form = btn.closest('form.cart');
                   if (form) {
                       const pidInput = form.querySelector('input[name="add-to-cart"]');
                       if (pidInput) pid = pidInput.value;
                   }
                   // Fallback to data attribute
                   if (!pid && btn.dataset.product_id) pid = btn.dataset.product_id;
               }
               
               console.log('🛒 Add to Cart Click intercepted. PID:', pid);
               trackUserAction('add_to_cart', pid);
          }
      }, true); // Use capture to ensure we catch it before some other handlers might stop prop logic (though less common for clicks)
  }

  async function consumeTryonAndTrack(type, productId) {
    try {
      // Analytics
      await trackUserAction(type, productId);

      // Consume try-on quota
      let resp = await fetch(`${API_BASE_URL}/plugin/consume-tryon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: styliqueConfig.storeId,
          tryonType: type,
        }),
      });

      const json = await resp.json().catch(() => ({ success: false }));
      if (json && json.success) {
        window.styliqueSection.tryonsUsed =
          (window.styliqueSection.tryonsUsed || 0) + 1;
        updateTryOnButtonsState();
      }
    } catch (e) {
      console.warn("consumeTryonAndTrack error", e);
    }
  }

  function updateTryOnButtonsState() {
    const start2D = document.getElementById("stylique-start-2d-tryon");
    const start3D = document.getElementById("stylique-start-3d-tryon");

    const imageSelected = !!window.styliqueSection.selectedImage;
    const active = window.styliqueSection.planActive !== false;
    const quota = window.styliqueSection.tryonsQuota || 0;
    const used = window.styliqueSection.tryonsUsed || 0;
    const remaining = Math.max(0, quota - used);

    const quotaOK = remaining > 0;

    if (start2D) {
      start2D.disabled = !imageSelected || !quotaOK || !active;
    }
    if (start3D) {
      const plan = window.styliqueSection.storePlan;
      const isUltimate = plan === "ULTIMATE";

      if (!isUltimate) {
        start3D.style.display = "none";
      } else {
        start3D.style.display = "inline-block";
        start3D.disabled = !imageSelected || !quotaOK || !active;
      }
    }
  }

  // ONBOARDING
  window.showOnboardingModal = function () {
    document.getElementById("stylique-login-required").style.display = "none";
    document.getElementById("stylique-inline-onboarding").style.display =
      "block";
    document.getElementById("stylique-inline-step-1").style.display = "block";
  };

  window.inlineOnboardingNext = function () {
    const name = document.getElementById("stylique-inline-name").value;
    const phone = document.getElementById("stylique-inline-phone").value;
    if (!name || !phone) {
      document.getElementById("stylique-inline-error").textContent =
        "Please fill all fields";
      document.getElementById("stylique-inline-error").style.display = "block";
      return;
    }
    document.getElementById("stylique-inline-step-1").style.display = "none";
    document.getElementById("stylique-inline-step-2").style.display = "block";
  };

  window.completeInlineOnboarding = async function () {
    const btn = document.getElementById("stylique-inline-complete-btn");
    btn.disabled = true;

    // Helper to get value
    // const val = (id) => document.getElementById(id) ? document.getElementById(id).value : null;

    // Get selected body type
    // const selectedBodyTypeBtn = document.querySelector('.stylique-type-btn.selected');
    // const bodyType = selectedBodyTypeBtn ? selectedBodyTypeBtn.getAttribute('data-value') : null;

    // Construct User Data with Correct API Keys
    const user = window.styliqueSection.user || {};
    const token = localStorage.getItem("stylique_token");

    const userData = {
      userId: user.id,
      token: token,
      name: document.getElementById("stylique-inline-name").value,
      phone: document.getElementById("stylique-inline-phone").value,

      // Measurements (Exact keys matching DB schema & API)
      chest:
        parseFloat(document.getElementById("stylique-inline-chest").value) ||
        null,
      shoulder_width:
        parseFloat(document.getElementById("stylique-inline-shoulder").value) ||
        null,
      waist:
        parseFloat(document.getElementById("stylique-inline-waist").value) ||
        null,
      inseam:
        parseFloat(document.getElementById("stylique-inline-inseam").value) ||
        null,
      sleeve_length:
        parseFloat(document.getElementById("stylique-inline-sleeve").value) ||
        null,
      neck_circumference:
        parseFloat(document.getElementById("stylique-inline-neck").value) ||
        null,
      shirt_length:
        parseFloat(
          document.getElementById("stylique-inline-shirt-length").value,
        ) || null,
      armhole_size:
        parseFloat(document.getElementById("stylique-inline-armhole").value) ||
        null,
      thigh_circumference:
        parseFloat(document.getElementById("stylique-inline-thigh").value) ||
        null,
      weight:
        parseFloat(document.getElementById("stylique-inline-weight").value) ||
        null,

      // Body Type & Skin Tone
      body_type: window.styliqueSection.selectedBodyType || "moderate",
      skin_tone_hex:
        document.getElementById("stylique-inline-skin-tone").value || null,
    };

    console.log("Saving profile data:", userData);

    // Update via API
    fetch("https://www.styliquetechnologies.com/api/plugin/update-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Profile update success:", data);

        // Update Local User Object
        Object.assign(window.styliqueSection.user, userData);

        // Show Try-On Interface
        document.getElementById("stylique-inline-onboarding").style.display =
          "none";
        showTryOnInterface();
      })
      .catch((err) => {
        console.error("Profile update error:", err);
        // Even if save fails, proceed? Ideally show error, but for flow smoothness we proceed
        // or show error message. Stick to proceeding with warning for now or simple alert.
        // But let's just proceed to not block user.
        document.getElementById("stylique-inline-onboarding").style.display =
          "none";
        showTryOnInterface();
      })
      .finally(() => {
        // Assuming these elements exist for spinner/text
        const spinner = document.getElementById("stylique-inline-spinner");
        const completeText = document.getElementById(
          "stylique-inline-complete-text",
        );
        if (spinner) spinner.style.display = "none";
        if (completeText) completeText.style.display = "inline";
        btn.disabled = false;
      });
  };

  window.skipInlineOnboarding = function () {
    document.getElementById("stylique-inline-onboarding").style.display =
      "none";
    showTryOnInterface();
  };

  // MODAL ONBOARDING FUNCTIONS
  window.showOnboardingModalFull = function () {
    const modal = document.getElementById("stylique-onboarding-modal");
    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  };

  window.hideOnboardingModal = function () {
    const modal = document.getElementById("stylique-onboarding-modal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  };

  window.goToOnboardingStep2 = function () {
    const name = document.getElementById("stylique-onboarding-name")?.value;
    const phone = document.getElementById("stylique-onboarding-phone")?.value;
    const errorDiv = document.getElementById("stylique-onboarding-error");

    if (!name || !phone) {
      if (errorDiv) {
        errorDiv.textContent = "Please fill all required fields";
        errorDiv.style.display = "block";
      }
      return;
    }

    if (errorDiv) errorDiv.style.display = "none";

    // Update progress indicators
    const step1 = document.getElementById("stylique-progress-step-1");
    const step2 = document.getElementById("stylique-progress-step-2");
    const line1 = document.getElementById("stylique-progress-line-1");

    if (step1) step1.classList.add("completed");
    if (step2) step2.classList.add("active");
    if (line1) line1.classList.add("active");

    // Switch steps
    document.getElementById("stylique-onboarding-step-1").style.display =
      "none";
    document.getElementById("stylique-onboarding-step-2").style.display =
      "block";
  };

  window.goToOnboardingStep1 = function () {
    const step1 = document.getElementById("stylique-progress-step-1");
    const step2 = document.getElementById("stylique-progress-step-2");
    const line1 = document.getElementById("stylique-progress-line-1");

    if (step1) step1.classList.remove("completed");
    if (step2) step2.classList.remove("active");
    if (line1) line1.classList.remove("active");

    document.getElementById("stylique-onboarding-step-2").style.display =
      "none";
    document.getElementById("stylique-onboarding-step-1").style.display =
      "block";
  };

  window.selectBodyType = function (type) {
    const btns = document.querySelectorAll(".stylique-body-type-btn");
    btns.forEach(function (b) {
      if (b.getAttribute("data-value") === type) {
        b.classList.add("selected");
      } else {
        b.classList.remove("selected");
      }
    });
    window.styliqueSection.selectedBodyType = type;
  };

  window.completeOnboarding = async function () {
    const btn = document.getElementById("stylique-complete-onboarding-btn");
    const spinner = document.getElementById("stylique-complete-spinner");
    const text = document.getElementById("stylique-complete-text");

    if (btn) btn.disabled = true;
    if (spinner) spinner.style.display = "flex";
    if (text) text.style.display = "none";

    const user = window.styliqueSection.user || {};
    const token = localStorage.getItem("stylique_token");

    const userData = {
      userId: user.id,
      token: token,
      name: document.getElementById("stylique-onboarding-name")?.value || "",
      phone: document.getElementById("stylique-onboarding-phone")?.value || "",
      chest:
        parseFloat(
          document.getElementById("stylique-onboarding-chest")?.value,
        ) || null,
      shoulder_width:
        parseFloat(
          document.getElementById("stylique-onboarding-shoulder")?.value,
        ) || null,
      waist:
        parseFloat(
          document.getElementById("stylique-onboarding-waist")?.value,
        ) || null,
      inseam:
        parseFloat(
          document.getElementById("stylique-onboarding-inseam")?.value,
        ) || null,
      sleeve_length:
        parseFloat(
          document.getElementById("stylique-onboarding-sleeve")?.value,
        ) || null,
      neck_circumference:
        parseFloat(
          document.getElementById("stylique-onboarding-neck")?.value,
        ) || null,
      thigh_circumference:
        parseFloat(
          document.getElementById("stylique-onboarding-thigh")?.value,
        ) || null,
      weight:
        parseFloat(
          document.getElementById("stylique-onboarding-weight")?.value,
        ) || null,
      body_type: window.styliqueSection.selectedBodyType || "moderate",
    };

    try {
      await fetch(`${API_BASE_URL}/plugin/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      Object.assign(window.styliqueSection.user || {}, userData);
    } catch (err) {
      console.error("Profile update error:", err);
    }

    hideOnboardingModal();
    showTryOnInterface();

    if (spinner) spinner.style.display = "none";
    if (text) text.style.display = "inline";
    if (btn) btn.disabled = false;
  };

  // Back button for inline onboarding
  window.inlineOnboardingBack = function () {
    document.getElementById("stylique-inline-step-2").style.display = "none";
    document.getElementById("stylique-inline-step-1").style.display = "block";
  };

  // --- Skin Tone Extraction ---
  // Extract skin tone (API-based)
  window.extractSkinTone = async function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.getElementById("stylique-skin-canvas");
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 60, 60);
        document.getElementById("stylique-skin-preview").style.display = "flex";
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Update Button Text
    const btnText = document.getElementById("stylique-skin-btn-text");
    if (btnText) btnText.textContent = "Extracting...";

    try {
      // Call HuggingFace-powered API
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(
        "https://www.styliquetechnologies.com/api/detect-skin-tone",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();
      console.log("Skin tone API result:", result);

      if (response.ok && result.hexColor) {
        // Success! Show the extracted color
        document.getElementById("stylique-skin-color").style.backgroundColor =
          result.hexColor;
        document.getElementById("stylique-inline-skin-tone").value =
          result.hexColor;
        if (btnText) btnText.textContent = "Change Photo ✓";
      } else {
        // Fallback to simple canvas extraction
        console.warn("HF API failed, using fallback:", result.error);
        fallbackExtractSkinTone(file);
        if (btnText) btnText.textContent = "Change Photo";
      }
    } catch (error) {
      console.error("Skin tone extraction error:", error);
      fallbackExtractSkinTone(file);
      if (btnText) btnText.textContent = "Change Photo";
    }
  };

  // Fallback Extraction (Canvas)
  function fallbackExtractSkinTone(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.getElementById("stylique-skin-canvas");
        const ctx = canvas.getContext("2d");
        // Canvas already drawn in main function usually, but redraw to be safe
        ctx.drawImage(img, 0, 0, 60, 60);

        // Simple center pixel extraction
        const p = ctx.getImageData(30, 30, 1, 1).data;
        const hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);

        document.getElementById("stylique-skin-color").style.backgroundColor =
          hex;
        document.getElementById("stylique-inline-skin-tone").value = hex;
        document.getElementById("stylique-skin-preview").style.display = "flex";
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255) throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
  }

  // Measurement Unit Selection
  window.styliqueSection.selectedUnit = 'inches'; // Default

  window.selectMeasurementUnit = function (unit) {
    const btns = document.querySelectorAll('.stylique-unit-btn');
    btns.forEach(function(btn) {
      if (btn.getAttribute('data-unit') === unit) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    window.styliqueSection.selectedUnit = unit;
    console.log('Measurement unit set to:', unit);
  };

  // Body Type Selection Logic
  window.selectInlineBodyType = function (type) {
    // Update UI
    const btns = document.querySelectorAll(".stylique-type-btn");
    btns.forEach((b) => {
      if (b.getAttribute("data-value") === type) {
        b.classList.add("selected");
      } else {
        b.classList.remove("selected");
      }
    });

    // Update State
    window.styliqueSection.selectedBodyType = type;
    console.log("Selected Body Type:", type);
  };

  // Remove redundant event listeners as we use onclick in HTML now
  function setupOnboardingEvents() {
    // Deprecated: logic moved to window.selectInlineBodyType
  }

  // RECCOMENDATIONS
  async function loadSizeRecommendation(productId, containerId) {
    if (!containerId)
      containerId = "stylique-plugin-size-recommendation-content";
    const container = document.getElementById(containerId);
    if (!container) return;

    const userId = window.styliqueSection.user?.id;
    if (!userId) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/plugin/size-recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: styliqueConfig.storeId,
          productId: productId,
          userId: userId,
          currentUrl: window.styliqueSection.currentUrl,
        }),
      });
      const data = await resp.json();
      if (data.success && data.recommendation) {
        const rec = data.recommendation;
        container.innerHTML = `
                  <div style="padding:10px; background:#f0f9ff; border-radius:8px;">
                    <strong>Best Fit: ${rec.bestFit}</strong> (${rec.confidence}% Confidence)
                    <p style="font-size:12px; margin-top:5px;">${rec.detailedInsights?.whyBestFit || ""}</p>
                  </div>
                `;
        document.getElementById(
          "stylique-plugin-recommendations",
        ).style.display = "block";
      }
    } catch (e) {
      console.warn("Size rec failed", e);
    }
  }

  // FIX: Move modals to body to prevent theme container clipping/z-index issues
  function moveModalsToBody() {
    const modals = [
      "stylique-results-modal",
      "stylique-onboarding-modal",
      "stylique-processing-overlay",
      "stylique-3d-results-modal", // potential dynamic modal
    ];

    modals.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentNode !== document.body) {
        document.body.appendChild(el);
      }
    });
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", function () {
    moveModalsToBody(); // Apply fix immediately
    applyColors();
    checkLoginStatus();
    fetchStoreStatus();
    setupOnboardingEvents();

    // Input listeners
    const fileInput = document.getElementById("stylique-file-input");
    if (fileInput)
      fileInput.addEventListener("change", window.handleFileSelect);

    // Inline Result Actions
    const inlineAddToCart = document.getElementById("stylique-add-to-cart-btn");
    if (inlineAddToCart)
      inlineAddToCart.addEventListener("click", window.addToCart);

    const inlineTryAgain = document.getElementById("stylique-try-again-btn");
    if (inlineTryAgain)
      inlineTryAgain.addEventListener("click", function () {
        document.getElementById("stylique-inline-result").style.display =
          "none";
      });

    // Make window functions avail
    window.loadSizeRecommendation = loadSizeRecommendation;
    
    // Setup Tracking
    setupAddToCartTracking();
  });
})(jQuery);
