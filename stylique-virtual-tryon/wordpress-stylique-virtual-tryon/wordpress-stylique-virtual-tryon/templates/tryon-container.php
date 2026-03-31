<!-- Main Content -->
<div class="stylique-section-content">

<!-- Not Logged In State - Minimal Design -->
<div id="stylique-login-required" class="stylique-login-prompt">
  <div class="stylique-login-content">

    <!-- Minimal Branding Header -->
    <div class="stylique-minimal-header">
      <span class="stylique-welcome-text">Welcome To&nbsp;</span><span class="stylique-brand-logo">Stylique</span>
      <p class="stylique-welcome-subtitle">Try-On clothes Virtually & Get Recommendations From Our AI</p>
    </div>

    <!-- Login Form -->
    <form id="stylique-login-form" class="stylique-login-form stylique-minimal-form">
      <div id="stylique-login-error" class="stylique-error-message" style="display: none;"></div>
      <div id="stylique-login-success" class="stylique-success-message" style="display: none;"></div>

      <!-- Email Step -->
      <div id="stylique-email-step" class="stylique-form-step">
        <div class="stylique-form-group">
          <!-- <label for="stylique-email">Email Address</label> -->
          <input type="email" id="stylique-email" name="email" required placeholder="Enter your email address">
        </div>

        <button type="button" class="stylique-btn-submit" id="stylique-send-otp-btn" onclick="sendOTP()">
          <span id="stylique-send-text">Send Verification Code</span>
          <div id="stylique-send-spinner" class="stylique-form-spinner" style="display: none;">
            <div class="stylique-spinner-small"></div>
          </div>
        </button>
      </div>

      <!-- OTP Step -->
      <div id="stylique-otp-step" class="stylique-form-step" style="display: none;">
        <div class="stylique-otp-minimal-header">
          <p class="stylique-otp-subtitle">Enter the 6-digit code sent to</p>
          <p class="stylique-otp-email" id="stylique-email-display"></p>
        </div>

        <div class="stylique-form-group">
          <label for="stylique-otp">Verification Code</label>
          <input type="text" id="stylique-otp" name="otp" required placeholder="Enter 6-digit code" maxlength="6"
            pattern="[0-9]{6}">
        </div>

        <button type="button" class="stylique-btn-submit" id="stylique-verify-btn" onclick="verifyOTP()">
          <span id="stylique-verify-text">Verify Code</span>
          <div id="stylique-verify-spinner" class="stylique-form-spinner" style="display: none;">
            <div class="stylique-spinner-small"></div>
          </div>
        </button>

        <div class="stylique-otp-actions">
          <button type="button" class="stylique-btn-link" onclick="resendOTP()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Resend Code
          </button>
          <button type="button" class="stylique-btn-link" onclick="changeEmail()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Change Email
          </button>
        </div>
      </div>
    </form>

    <div class="stylique-login-footer">
      <button class="stylique-btn-link" onclick="showLoginBenefits()">
        Powered by Stylique Technologies
      </button>
    </div>
  </div>
</div>

<!-- Inline Onboarding State (shows instead of login for new users) -->
<div id="stylique-inline-onboarding" class="stylique-inline-onboarding" style="display: none;">
  <div class="stylique-login-content">

    <!-- Minimal Branding Header -->
    <div class="stylique-minimal-header">
      <span class="stylique-welcome-text">Welcome To&nbsp;</span><span class="stylique-brand-logo">Stylique</span>
    </div>

    <!-- Step 1: Basic Info -->
    <div id="stylique-inline-step-1" class="stylique-inline-step">
      <p class="stylique-inline-subtitle">Let's set up your profile</p>

      <div class="stylique-login-form stylique-minimal-form">
        <div id="stylique-inline-error" class="stylique-error-message" style="display: none;"></div>

        <div class="stylique-form-group">
          <input type="text" id="stylique-inline-name" placeholder="Full Name" required>
        </div>

        <div class="stylique-form-group">
          <input type="tel" id="stylique-inline-phone" placeholder="Phone Number" required>
        </div>

        <button type="button" class="stylique-btn-submit" onclick="inlineOnboardingNext()">
          <span>Continue</span>
        </button>
      </div>
    </div>

    <!-- Step 2: Measurements & Skin Tone (optional) -->
    <div id="stylique-inline-step-2" class="stylique-inline-step" style="display: none;">
      <p class="stylique-inline-subtitle">Body measurements & skin tone (optional)</p>

      <div class="stylique-login-form stylique-minimal-form">
        <!-- Skin Tone Section -->
        <div class="stylique-inline-skin-section">
          <span class="stylique-inline-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align: text-bottom;">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>
            Extract your skin tone
          </span>
          <div class="stylique-skin-upload-area" id="stylique-skin-upload-area">
            <input type="file" id="stylique-skin-input" accept="image/*" style="display: none;"
              onchange="extractSkinTone(this)">
            <div class="stylique-skin-preview" id="stylique-skin-preview" style="display:none;">
              <canvas id="stylique-skin-canvas" width="60" height="60"></canvas>
              <div class="stylique-skin-color" id="stylique-skin-color"></div>
            </div>
            <button type="button" class="stylique-skin-upload-btn"
              onclick="document.getElementById('stylique-skin-input').click()">
              <span id="stylique-skin-btn-text">Upload Face Photo</span>
            </button>
            <input type="hidden" id="stylique-inline-skin-tone" value="">
          </div>
        </div>

        <!-- Body Measurements Grid -->
        <span class="stylique-inline-label" style="margin-top: 1rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align: text-bottom;">
                <path d="M2 12h20"></path>
                <path d="M2 12v4"></path>
                <path d="M22 12v4"></path>
                <path d="M6 12v2"></path>
                <path d="M10 12v2"></path>
                <path d="M14 12v2"></path>
                <path d="M18 12v2"></path>
            </svg>
            Body measurements
        </span>
        
        <!-- Unit Selector -->
        <div class="stylique-unit-selector">
          <button type="button" class="stylique-unit-btn active" data-unit="inches" onclick="selectMeasurementUnit('inches')">Inches</button>
          <button type="button" class="stylique-unit-btn" data-unit="cm" onclick="selectMeasurementUnit('cm')">Centimeters</button>
        </div>
        
        <div class="stylique-inline-measurements">
          <div class="stylique-inline-row">
            <input type="number" id="stylique-inline-chest" placeholder="Chest" step="0.1">
            <input type="number" id="stylique-inline-shoulder" placeholder="Shoulder" step="0.1">
          </div>
          <div class="stylique-inline-row">
            <input type="number" id="stylique-inline-waist" placeholder="Waist" step="0.1">
            <input type="number" id="stylique-inline-inseam" placeholder="Inseam" step="0.1">
          </div>
          <div class="stylique-inline-row">
            <input type="number" id="stylique-inline-sleeve" placeholder="Sleeve" step="0.1">
            <input type="number" id="stylique-inline-neck" placeholder="Neck" step="0.1">
          </div>
          <div class="stylique-inline-row">
            <input type="number" id="stylique-inline-shirt-length" placeholder="Shirt Len" step="0.1">
            <input type="number" id="stylique-inline-armhole" placeholder="Armhole" step="0.1">
          </div>
          <div class="stylique-inline-row">
            <input type="number" id="stylique-inline-thigh" placeholder="Thigh" step="0.1">
            <input type="number" id="stylique-inline-weight" placeholder="Weight" step="0.1">
          </div>
        </div>

        <!-- Body Type -->
        <div class="stylique-inline-body-type">
          <span class="stylique-inline-label">Body Type</span>
          <div class="stylique-inline-type-buttons">
            <button type="button" class="stylique-type-btn" data-value="slim"
              onclick="selectInlineBodyType('slim')">Slim</button>
            <button type="button" class="stylique-type-btn" data-value="moderate"
              onclick="selectInlineBodyType('moderate')">Regular</button>
            <button type="button" class="stylique-type-btn" data-value="fat"
              onclick="selectInlineBodyType('fat')">Curvy</button>
          </div>
        </div>

        <!-- Modify Later Message -->
        <p class="stylique-modify-later">You can modify these later at <a href="https://styliquetechnologies.com"
            target="_blank">styliquetechnologies.com</a></p>

        <div class="stylique-inline-actions">
          <button type="button" class="stylique-btn-link" onclick="inlineOnboardingBack()">← Back</button>
          <button type="button" class="stylique-btn-submit" id="stylique-inline-complete-btn"
            onclick="completeInlineOnboarding()">
            <span id="stylique-inline-complete-text">Start Try-On</span>
            <div id="stylique-inline-spinner" class="stylique-form-spinner" style="display: none;">
              <div class="stylique-spinner-small"></div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="stylique-login-footer">
      <button class="stylique-btn-link" onclick="skipInlineOnboarding()">
        Skip for now
      </button>
    </div>
  </div>
</div>

<!-- Logged In State - Try-On Interface -->
<div id="stylique-tryon-interface" class="stylique-tryon-section" style="display: none;">


  <!-- Branding Header -->
  <div class="stylique-tryon-header">
    <div class="stylique-tryon-branding">
      <!-- Actual Logo -->
      <img src="https://spectrawear.pk/wp-content/uploads/2025/12/stylique_logo.png?v=2" alt="Stylique" class="stylique-tryon-logo">
      <div class="stylique-tryon-title">
        <h3>Virtual Try-On</h3>
        <p>Try Your Outfit Virtually & Get Recommendations With Our AI</p>
        
        <!-- User Info moved here -->
        <div class="stylique-user-info-header">
           <div class="stylique-user-identity">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stylique-user-icon-small">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
             </svg>
             <strong id="stylique-user-email"></strong>
           </div>
           <button class="stylique-btn-logout" onclick="logoutFromStylique()" title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
           </button>
        </div>
      </div>
    </div>
    
    <!-- User Info removed from here and moved inside title block -->
  </div>


  <!-- Product Info Removed as per request to maximize space -->
  <!-- The Try-On Controls below will now take full width -->

  <!-- Try-On Controls -->
  <div class="stylique-tryon-controls">
    <!-- Product Not Available State -->
    <div id="stylique-product-unavailable" class="stylique-product-unavailable" style="display: none;">
      <div class="stylique-unavailable-content">
        <div class="stylique-unavailable-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h5>Try-On Not Available</h5>
        <p>This product is not in your Stylique catalog yet. Save or update the product in WordPress admin to sync, wait a few seconds, then refresh. If it still fails, check your Store ID and backend URL in Stylique settings.</p>
      </div>
    </div>

    <!-- Upload Section (hidden when product unavailable) -->
    <div class="stylique-upload-section">
      <div class="stylique-upload-area" id="stylique-upload-area" onclick="document.getElementById('stylique-file-input').click()">
        <div class="stylique-upload-content">
          <div class="stylique-upload-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div class="stylique-upload-text">
            <h5>Upload Full Body Photo</h5>
            <p>Clear full-body image for best results</p>
            <input type="file" id="stylique-file-input" accept="image/*" style="display: none;">
            <button class="stylique-btn-upload-round">
              Choose Photo
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Image Preview -->
      <div class="stylique-image-preview" id="stylique-image-preview" style="display: none;">
        <img id="stylique-preview-img" alt="Selected photo">
        <div class="stylique-preview-actions">
          <button class="stylique-btn-icon" onclick="document.getElementById('stylique-file-input').click()"
            title="Change photo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Try-On Options -->
    <div class="stylique-action-section">
      <div class="stylique-tryon-options">
        <h6>Choose Your Try-On Experience</h6>
        <div class="stylique-tryon-buttons">
          <!-- 2D Try-On Button -->
          <button id="stylique-start-2d-tryon" class="stylique-btn-tryon stylique-btn-2d" onclick="start2DTryOn()"
            disabled>
            2D Try-On
          </button>

          <!-- 3D Try-On Button -->
          <button id="stylique-start-3d-tryon" class="stylique-btn-tryon stylique-btn-3d" onclick="start3DTryOn()"
            disabled>
            3D Try-On
          </button>
        </div>
        <div id="stylique-plan-note" class="stylique-requirements-note" style="margin-top: 8px; display: none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span id="stylique-plan-note-text"></span>
        </div>
      </div>

      <!-- Inline Try-On Result (replaces modal) -->
      <div id="stylique-inline-result" class="stylique-inline-result" style="display: none;">
        <div class="stylique-inline-result-card">
          <div class="stylique-inline-result-header">
            <h5>Your Virtual Try-On Result</h5>
            <span class="stylique-success-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Complete
            </span>
          </div>
          <div class="stylique-inline-result-image">
            <img id="stylique-inline-result-img" alt="Try-on result">
          </div>
          <div class="stylique-inline-result-actions">
            <button class="stylique-btn-secondary" id="stylique-try-again-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Try Again
            </button>
            <button class="stylique-btn-primary" id="stylique-add-to-cart-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      <!-- 3D Inline Result Container -->
      <div id="stylique-inline-3d-result" class="stylique-inline-result" style="display: none;">
        <div class="stylique-inline-result-card">
          <div class="stylique-inline-result-header">
            <h5>Your 3D Virtual Try-On Result</h5>
            <span class="stylique-success-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Complete
            </span>
          </div>
          <div class="stylique-inline-result-image" id="stylique-3d-inline-container" style="min-height: 400px; display: flex; align-items: center; justify-content: center; background: #fafafa;">
              <!-- Video will be injected here -->
          </div>
          <div class="stylique-inline-result-actions">
            <button class="stylique-btn-secondary" onclick="resetTryOn()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Try Again
            </button>
            <button class="stylique-btn-primary" onclick="addToCart()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      <!-- Recommendations Section (shown when image is uploaded, or immediately for tier 3) -->
      <div id="stylique-plugin-recommendations" style="display: none; margin-top: 2rem;">
        <!-- Size Recommendation Section -->
        <div class="stylique-size-recommendation-section" id="stylique-plugin-size-recommendation-section">
          <div class="stylique-section-header">
            <h5>AI Size Recommendation</h5>
            <div class="stylique-ai-badge">AI Powered</div>
          </div>
          <div class="stylique-size-recommendation-content" id="stylique-plugin-size-recommendation-content">
            <div class="stylique-loading-state">
              <div class="stylique-spinner-small"></div>
              <p>Analyzing your size...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Styling / Outfit Suggestions Section -->
      <div id="stylique-styling-suggestions" class="stylique-styling-section" style="display: none; margin-top: 1.5rem;">
        <div class="stylique-section-header">
          <h5>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Complete the Look
          </h5>
          <div class="stylique-ai-badge">AI Styling</div>
        </div>
        <div class="stylique-styling-content">
          <div class="stylique-styling-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h6>Outfit Suggestions Coming Soon</h6>
            <p>Our AI will suggest complementary items to complete your look — matching bottoms, accessories, and shoes based on your style and body type.</p>
          </div>
        </div>
      </div>

      <!-- Tier Badge (shown after product check) -->
      <div style="text-align: center; margin-top: 1rem;">
        <span id="stylique-tier-badge" class="stylique-tier-badge" style="display: none;"></span>
      </div>

    </div>
  </div>
  
  <!-- Footer Link -->
  <div class="stylique-plugin-footer">
    <a href="https://styliquetechnologies.com" target="_blank">To modify Personal Details go to styliquetechnologies.com</a>
  </div>
</div>

<!-- Try-On Results Modal -->
<div id="stylique-results-modal" class="stylique-modal" style="display: none;">
  <div class="stylique-modal-backdrop" onclick="hideResultsModal()"></div>
  <div class="stylique-modal-content stylique-results-modal-content" onclick="event.stopPropagation()">
    <div class="stylique-modal-header">
      <h4>Your Virtual Try-On Result</h4>
      <button onclick="hideResultsModal()" ontouchend="hideResultsModal(); event.preventDefault();"
        class="stylique-close-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <div class="stylique-results-content">
      <div class="stylique-result-container">
        <img id="stylique-result-image" alt="Try-on result">
        <div class="stylique-result-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          Virtual Try-On Complete
        </div>
      </div>
      <div class="stylique-result-actions">
        <button class="stylique-btn-secondary" onclick="resetTryOn()"
          ontouchend="resetTryOn(); event.preventDefault();">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Try Again
        </button>
        <button class="stylique-btn-primary" onclick="addToCart()"
          ontouchend="addToCart(); event.preventDefault();">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          Add to Cart
        </button>
      </div>
      <!-- Size Recommendation Section (ULTIMATE only) -->
      <div class="stylique-size-recommendation-section" id="stylique-2d-size-recommendation-section"
        style="display: none;">
        <div class="stylique-section-header">
          <h5>AI Size Recommendation</h5>
          <div class="stylique-ai-badge">AI Powered</div>
        </div>
        <div class="stylique-size-recommendation-content" id="stylique-2d-size-recommendation-content">
          <div class="stylique-loading-state">
            <div class="stylique-spinner-small"></div>
            <p>Analyzing your size...</p>
          </div>
        </div>
      </div>

      <!-- Complete Look Recommendations Section (ULTIMATE only) -->
      <div class="stylique-complete-look-section" id="stylique-2d-complete-look-section" style="display: none;">
        <div class="stylique-section-header">
          <h5>Complete the Look</h5>
          <div class="stylique-ai-badge">AI Styling</div>
        </div>
        <div class="stylique-complete-look-content" id="stylique-2d-complete-look-content">
          <div class="stylique-loading-state">
            <div class="stylique-spinner-small"></div>
            <p>Finding perfect matches...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Processing Overlay - Enhanced Animation -->
<div id="stylique-processing-overlay" class="stylique-processing-overlay" style="display: none;">
  <div class="stylique-processing-content">
    <!-- Logo Icon -->
    <div class="stylique-processing-icon-wrapper">
      <div class="stylique-processing-ring"></div>
      <div class="stylique-processing-ring stylique-ring-2"></div>
      <div class="stylique-processing-ring stylique-ring-3"></div>
      <div class="stylique-processing-icon" id="stylique-processing-icon">
        <!-- Logo injected by CSS/JS -->
      </div>
    </div>

    <!-- Main Title -->
    <h4 id="stylique-processing-title">Creating Your Look</h4>
    
    <!-- Dynamic Text -->
    <p id="stylique-processing-text" class="stylique-processing-status">Analyzing your photo...</p>

    <!-- Step Indicators with wider spacing -->
    <div class="stylique-processing-steps">
      <div class="stylique-proc-step active" id="stylique-step-1">
        <div class="stylique-proc-step-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </div>
        <span>Analyzing</span>
      </div>
      <div class="stylique-proc-step-line" id="stylique-line-1">
        <div class="stylique-line-fill"></div>
      </div>
      <div class="stylique-proc-step" id="stylique-step-2">
        <div class="stylique-proc-step-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          </svg>
        </div>
        <span>Styling</span>
      </div>
      <div class="stylique-proc-step-line" id="stylique-line-2">
        <div class="stylique-line-fill"></div>
      </div>
      <div class="stylique-proc-step" id="stylique-step-3">
        <div class="stylique-proc-step-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <span>Rendering</span>
      </div>
    </div>

    <!-- Simple Animated Spinner -->
    <div style="display: flex; justify-content: center; margin-top: 1.5rem;">
      <svg width="40" height="40" viewBox="0 0 40 40" style="animation: spin 1s linear infinite;">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" stroke-width="4"></circle>
        <circle cx="20" cy="20" r="16" fill="none" stroke="url(#gradient)" stroke-width="4" stroke-dasharray="80" stroke-dashoffset="60" stroke-linecap="round"></circle>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#642FD7"/>
            <stop offset="100%" stop-color="#F4536F"/>
          </linearGradient>
        </defs>
      </svg>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </div>
    <div id="stylique-progress-percent" style="font-size: 14px; font-weight: 700; color: #642FD7; margin-top: 0.75rem; text-align: center;">0%</div>
  </div>
</div>

<!-- Onboarding Modal -->
<div id="stylique-onboarding-modal" class="stylique-modal" style="display: none;">
  <div class="stylique-modal-backdrop"></div>
  <div class="stylique-modal-content stylique-onboarding-modal-content">
    <!-- Progress Steps -->
    <div class="stylique-onboarding-progress">
      <div class="stylique-progress-step active" id="stylique-progress-step-1">
        <div class="stylique-step-circle">1</div>
        <span>Basic Info</span>
      </div>
      <div class="stylique-progress-line" id="stylique-progress-line-1"></div>
      <div class="stylique-progress-step" id="stylique-progress-step-2">
        <div class="stylique-step-circle">2</div>
        <span>Measurements</span>
      </div>
    </div>

    <!-- Step 1: Basic Information -->
    <div id="stylique-onboarding-step-1" class="stylique-onboarding-step">
      <div class="stylique-onboarding-header">
        <div class="stylique-onboarding-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h4>Welcome to Stylique!</h4>
        <p>Let's set up your profile for the best experience</p>
      </div>

      <div class="stylique-onboarding-form">
        <div id="stylique-onboarding-error" class="stylique-error-message" style="display: none;"></div>

        <div class="stylique-form-group">
          <label for="stylique-onboarding-name">Full Name *</label>
          <input type="text" id="stylique-onboarding-name" placeholder="Enter your full name" required>
        </div>

        <div class="stylique-form-group">
          <label for="stylique-onboarding-phone">Phone Number *</label>
          <input type="tel" id="stylique-onboarding-phone" placeholder="Enter your phone number" required>
        </div>
      </div>

      <div class="stylique-onboarding-actions">
        <button class="stylique-btn-primary" onclick="goToOnboardingStep2()">
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Step 2: Body Measurements -->
    <div id="stylique-onboarding-step-2" class="stylique-onboarding-step" style="display: none;">
      <div class="stylique-onboarding-header">
        <div class="stylique-onboarding-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h4>Body Measurements</h4>
        <p>Help us provide better fit recommendations (all optional)</p>
      </div>

      <div class="stylique-onboarding-form stylique-measurements-form">
        <div class="stylique-measurements-grid">
          <div class="stylique-form-group">
            <label for="stylique-onboarding-chest">Chest (inches)</label>
            <input type="number" id="stylique-onboarding-chest" placeholder="e.g. 38" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-shoulder">Shoulder (inches)</label>
            <input type="number" id="stylique-onboarding-shoulder" placeholder="e.g. 18" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-waist">Waist (inches)</label>
            <input type="number" id="stylique-onboarding-waist" placeholder="e.g. 32" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-inseam">Inseam (inches)</label>
            <input type="number" id="stylique-onboarding-inseam" placeholder="e.g. 31" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-sleeve">Sleeve Length (inches)</label>
            <input type="number" id="stylique-onboarding-sleeve" placeholder="e.g. 24" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-neck">Neck (inches)</label>
            <input type="number" id="stylique-onboarding-neck" placeholder="e.g. 15.5" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-thigh">Thigh (inches)</label>
            <input type="number" id="stylique-onboarding-thigh" placeholder="e.g. 22" step="0.1">
          </div>
          <div class="stylique-form-group">
            <label for="stylique-onboarding-weight">Weight (kg)</label>
            <input type="number" id="stylique-onboarding-weight" placeholder="e.g. 70" step="0.1">
          </div>
        </div>

        <div class="stylique-form-group stylique-body-type-group">
          <label>Body Type</label>
          <div class="stylique-body-type-options">
            <button type="button" class="stylique-body-type-btn" data-value="slim" onclick="selectBodyType('slim')">
              Slim
            </button>
            <button type="button" class="stylique-body-type-btn" data-value="moderate"
              onclick="selectBodyType('moderate')">
              Regular
            </button>
            <button type="button" class="stylique-body-type-btn" data-value="fat" onclick="selectBodyType('fat')">
              Curvy
            </button>
          </div>
        </div>
      </div>

      <div class="stylique-onboarding-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>You can edit these later at <a href="https://styliquetechnologies.com"
            target="_blank">styliquetechnologies.com</a></span>
      </div>

      <div class="stylique-onboarding-actions stylique-onboarding-actions-split">
        <button class="stylique-btn-secondary" onclick="goToOnboardingStep1()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Back
        </button>
        <button class="stylique-btn-primary" id="stylique-complete-onboarding-btn" onclick="completeOnboarding()">
          <span id="stylique-complete-text">Complete Setup</span>
          <div id="stylique-complete-spinner" class="stylique-form-spinner" style="display: none;">
            <div class="stylique-spinner-small"></div>
          </div>
        </button>
      </div>
    </div>
  </div>
</div>

</div>
<!-- End Main Content -->
