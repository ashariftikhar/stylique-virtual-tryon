<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

$stylique_modal_only = isset( $stylique_modal_only ) ? (bool) $stylique_modal_only : false;
$stylique_plugin_url = plugin_dir_url( dirname( dirname( __FILE__ ) ) . '/stylique-virtual-tryon.php' );
$stylique_logo_url   = get_option( 'stylique_logo_url', '' );
$stylique_logo_url   = $stylique_logo_url ? $stylique_logo_url : $stylique_plugin_url . 'assets/images/stylique-logo.png';
$stylique_options    = isset( $stylique_options ) && is_array( $stylique_options ) ? $stylique_options : array(
  'logo_url'        => $stylique_logo_url,
  'primary_color'   => get_option( 'stylique_primary_color', '#642FD7' ),
  'secondary_color' => get_option( 'stylique_secondary_color', '#F4536F' ),
  'text_color'      => '#1f2937',
  'border_radius'   => '12',
);
$stylique_options['logo_url'] = ! empty( $stylique_options['logo_url'] ) ? $stylique_options['logo_url'] : $stylique_logo_url;
?>
<?php if ( ! $stylique_modal_only ) : ?>
<div class="stylique-trigger-wrap">
  <button type="button" id="stylique-open-modal" class="stylique-trigger-btn" onclick="window.openStyliqueModal && window.openStyliqueModal()">
    ✨ Virtual Try-On
  </button>
</div>
<?php endif; ?>


<div id="stylique-modal" class="stylique-modal-wrapper" style="display: none;">
  
  <div class="stylique-modal-backdrop" onclick="window.closeStyliqueModal()"></div>

  
  <div class="stylique-modal-content">
    
    <div class="stylique-brand-lockup" aria-label="Stylique Technologies">
      <div class="stylique-brand-main">
        <img
          src="<?php echo esc_url($stylique_options["logo_url"] ?? ""); ?>"
          alt=""
          class="stylique-modal-brand-mark"
          loading="lazy">
        <span>Stylique Technologies</span>
      </div>
    </div>

    <button class="stylique-modal-close" onclick="window.closeStyliqueModal()" aria-label="Close modal">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>

    
    <div class="stylique-section-content">
      <div id="stylique-main-section" class="stylique-section"
        style="--primary-color: <?php echo esc_attr($stylique_options["primary_color"] ?? "#642FD7"); ?>; --secondary-color: <?php echo esc_attr($stylique_options["secondary_color"] ?? "#1a1a1a"); ?>; --text-color: <?php echo esc_attr($stylique_options["text_color"] ?? "#1f2937"); ?>; --border-radius: <?php echo esc_attr($stylique_options["border_radius"] ?? "12"); ?>px;">


    <div id="stylique-login-required" class="stylique-login-prompt" style="display: none;">
      <div class="stylique-login-content">

        
        <div class="stylique-minimal-header">
          <span class="stylique-welcome-text">Welcome To&nbsp;</span><span class="stylique-brand-logo">Stylique</span>
          <p class="stylique-welcome-subtitle">Try-On clothes Virtually & Get Recommendations From Our AI</p>
        </div>

        
        <form id="stylique-login-form" class="stylique-login-form stylique-minimal-form">
          <div id="stylique-login-error" class="stylique-error-message" style="display: none;"></div>
          <div id="stylique-login-success" class="stylique-success-message" style="display: none;"></div>

          
          <div id="stylique-email-step" class="stylique-form-step">
            <div class="stylique-form-group">

              <input type="email" id="stylique-email" name="email" required placeholder="Enter your email address">
            </div>

            <button type="button" class="stylique-btn-submit" id="stylique-send-otp-btn" onclick="sendOTP()">
              <span id="stylique-send-text">Send Verification Code</span>
              <div id="stylique-send-spinner" class="stylique-form-spinner" style="display: none;">
                <div class="stylique-spinner-small"></div>
              </div>
            </button>
          </div>



          
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

    
    <div id="stylique-inline-onboarding" class="stylique-inline-onboarding" style="display: none;">
      <div class="stylique-login-content">

        
        <div class="stylique-minimal-header">
          <span class="stylique-welcome-text">Welcome To&nbsp;</span><span class="stylique-brand-logo">Stylique</span>
        </div>

        
        <div id="stylique-inline-step-1" class="stylique-inline-step">
          <p class="stylique-inline-subtitle">Let's set up your profile</p>

          <div class="stylique-login-form stylique-minimal-form">
            <div id="stylique-inline-error" class="stylique-error-message" style="display: none;"></div>

            <div class="stylique-form-group">
              <input type="text" id="stylique-inline-name" placeholder="Full Name" required>
            </div>

            <div class="stylique-form-group">
              <input type="tel" id="stylique-inline-phone" placeholder="Phone Number (Optional)">
            </div>

            <button type="button" class="stylique-btn-submit" onclick="inlineOnboardingNext()">
              <span>Continue</span>
            </button>
          </div>
        </div>

        
        <div id="stylique-inline-step-2" class="stylique-inline-step" style="display: none;">
          <p class="stylique-inline-subtitle">Body measurements & skin tone (optional)</p>

          <div class="stylique-login-form stylique-minimal-form">
            
            <div class="stylique-inline-skin-section">
              <span class="stylique-inline-label">📸 Extract your skin tone</span>
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

            
            <span class="stylique-inline-label" style="margin-top: 1rem;">📏 Body measurements</span>
            <div class="stylique-inline-measurements">
              <div class="stylique-inline-row">
                <input type="number" id="stylique-inline-chest" placeholder="Chest (inches)" step="0.1">
                <input type="number" id="stylique-inline-shoulder" placeholder="Shoulder (inches)" step="0.1">
              </div>
              <div class="stylique-inline-row">
                <input type="number" id="stylique-inline-waist" placeholder="Waist (inches)" step="0.1">
                <input type="number" id="stylique-inline-inseam" placeholder="Inseam (inches)" step="0.1">
              </div>
              <div class="stylique-inline-row">
                <input type="number" id="stylique-inline-sleeve" placeholder="Sleeve (inches)" step="0.1">
                <input type="number" id="stylique-inline-neck" placeholder="Neck (inches)" step="0.1">
              </div>
              <div class="stylique-inline-row">
                <input type="number" id="stylique-inline-shirt-length" placeholder="Shirt Length (inches)" step="0.1">
                <input type="number" id="stylique-inline-armhole" placeholder="Armhole (inches)" step="0.1">
              </div>
              <div class="stylique-inline-row">
                <input type="number" id="stylique-inline-thigh" placeholder="Thigh (inches)" step="0.1">
                <input type="number" id="stylique-inline-weight" placeholder="Weight (kg)" step="0.1">
              </div>
            </div>

            
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


    <div id="stylique-tryon-interface" class="stylique-tryon-section">

      
      <div class="stylique-tryon-header">
        <div class="stylique-tryon-branding">
          <img
            src="<?php echo esc_url($stylique_options["logo_url"] ?? ""); ?>"
            alt="Stylique" class="stylique-tryon-logo">
          <div class="stylique-tryon-title">
            <h3>See Yourself Before You Buy</h3>
            <p>Upload a photo and preview how this item looks on you.</p>
          </div>
        </div>
      </div>

      <!-- Two-Column Layout Grid -->
      <div class="stylique-modal-grid">

        <!-- Left Column: Product Carousel -->
        <div class="stylique-left-column">
          <div id="stylique-product-image-carousel" style="display: none;"></div>
        </div>

        <!-- Right Column: Product Info, Upload, Results -->
        <div class="stylique-right-column">

      <div class="stylique-product-info">
        <div class="stylique-product-image">
          <?php if ( isset($product) && $product && $product->get_image_id() ) : ?>
          <img src="<?php echo wp_get_attachment_image_url( $product->get_image_id(), "medium" ); ?>" alt="<?php echo esc_html( isset($product) && $product ? $product->get_name() : "" ); ?>">
          <?php endif; ?>
        </div>
        <div class="stylique-product-details">
          <h4><?php echo esc_html( isset($product) && $product ? $product->get_name() : "" ); ?></h4>
          <p class="stylique-product-price"><?php echo isset($product) && $product ? $product->get_price_html() : ""; ?></p>

          <div class="stylique-user-info" id="stylique-user-info-container">
            <span class="stylique-logged-in-as">Logged in as: <strong id="stylique-user-email"></strong></span>
            <button class="stylique-btn-logout" onclick="logoutFromStylique()" title="Logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="stylique-tryon-controls">
        
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
            <p>This product hasn't been added to try-on yet. Check back later!</p>
          </div>
        </div>

        
        <div class="stylique-upload-section">
          <div class="stylique-upload-area" id="stylique-upload-area">
            <div class="stylique-best-results-box">
              <div class="stylique-pose-graphic">
                <svg viewBox="0 0 450 450" width="48" height="48" fill="currentColor">
                  <g transform="translate(142.08)">
                    <path d="m80.464 46.312c2.879 5.759 1.241 10.697 0.521 16.455-7.475 6.998-31.078 3.504-34.891 9.753-7.947 12.037-32.768 47.87-33.012 58.78 0.292 9.58 20.009 44.25 31.403 56.01 2.711 0.6 7.019 1.03 8.741-0.39 0.898-4.93 1.165-8.9 2.209-12.63-1.445-0.85-3.172-0.19-5.263-0.06-5.79-7.04-11.969-33.65-13.056-40.28 5.266-9.52 8.786-21.77 17.701-35.794 2.478 18.584 7.906 47.884 5.562 58.894-19.574 42.67 3.037 130.68 3.622 146.86-6.45 30.65 9.279 90.59 9.678 96.15-0.428 5.14-3.491 8.94-1.545 12.12-2.603 11.04-4.497 15.03-2.337 21.51 2.159 6.48 17.766 8.09 20.767 4.1 0.934-6.07-0.608-21.38-2.767-24.26 1.148-2.46 2.541-11.11 0.197-18.52-2.757-9.48 5.825-63.07-0.775-78.04 0.841-3.4 2.173-14.49 2.187-19.44-0.804-2.97 0.48-35.1 2-60.19 1.527 25.12 2.807 57.43 2 60.41-2.879 2.88 0.518 18.51 2.6 21.5-2.052 6.29 3.223 66.5 7.494 73.5-2.34 7.41 0.29 14.82 1.44 17.28-2.16 2.88-4.53 19.84-3.6 25.91 3 4 19.44 0.73 21.6-5.75s-0.98-8.4-3.58-19.44c1.94-3.19-0.74-10.7-1.17-15.84 0.4-5.56 8.72-58.48 2.27-89.96-1.06-14.53 25.84-107.34 3.9-147.96 0.91-12.1-0.43-42.54 2.15-60.036-0.72 6.476 2.52 48.076 7.21 60.426-3.17 15.23 1.75 57.89-1.13 62.21-1.23 5.14-1.41 13.64-1.95 20.15 3.6-2.16 3.05-4.59 5.24-3.18 2.6 5.13-5.81 10.99-5.84 15.54 5.75 0 16.48-7.22 12.34-31.38-0.02-9.69 15.98-62.05 8.29-75.02 2.65-8.42-3.77-60.692-8.82-71.075-3.81-6.249-28-3.814-35.47-10.813-0.72-5.758-3.6-11.522-0.72-17.281 6.47-9.357 6.71-40.116-11.316-40.281-23.263 0.0131-20.359 30.705-13.88 40.062z"/>
                    <path fill="var(--stylique-text-secondary)" d="m91.781 3.6875c-7.44 0.3311-14.886 5.3164-18.031 16.938 0.478-0.24 0.894 0.12 1.54-0.061-0.657 2.69-0.276 5.571-0.276 5.571s1.054-0.404 1.861-0.48c-0.292-0.729 0.079-3.822 0.603-5.591 9.247-2.977 24.172-3.359 29.962 0.591 1.33 2.405 1.07 6.595 1.07 7.044 0.51-0.259 1.3 0.367 1.68-0.044 0-0.79 0.19-3.646-0.46-6.321 0.44 0.085 1.39 0.51 1.69 0.585-0.35-10.723-10.07-18.658-19.639-18.232z"/>
                  </g>
                </svg>
              </div>
              <div class="stylique-best-results-badges">
                <span class="stylique-badge-item"><svg class="stylique-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Front Facing</span>
                <span class="stylique-badge-item"><svg class="stylique-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Good Lighting</span>
                <span class="stylique-badge-item"><svg class="stylique-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Plain Background</span>
              </div>
            </div>

            <div class="stylique-upload-content">
              <div class="stylique-upload-core">
                <input type="file" id="stylique-file-input" accept="image/*" style="display: none;">
                <button class="stylique-btn-upload-round" onclick="handleUploadClick()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: -3px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose Photo
                </button>
              </div>
            </div>
          </div>

          
          <div class="stylique-image-preview" id="stylique-image-preview" style="display: none;">
            <img id="stylique-preview-img" alt="Selected photo">
            <div class="stylique-preview-actions">
              <button class="stylique-btn-icon" onclick="handleUploadClick()"
                title="Change photo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>
          
          
          <div class="stylique-privacy-box">
            <div class="stylique-privacy-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div class="stylique-privacy-text-content">
              <h6>Your Privacy</h6>
              <p>Your photo is securely processed to generate the try-on result and never saved on our server. We do not store, share, or re-use the images.</p>
            </div>
          </div>
        </div>


        <div class="stylique-action-section">
          <div class="stylique-tryon-options">
            <h6>Choose Your Try-On Experience</h6>
            <div class="stylique-tryon-buttons">

              <button id="stylique-start-2d-tryon" class="stylique-btn-tryon stylique-btn-2d" onclick="start2DTryOn()"
                disabled>
                2D Try-On
              </button>


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


          <div id="stylique-plugin-recommendations" style="display: none; margin-top: 2rem;">
            <div id="stylique-tier3-notice" class="stylique-tier3-notice" style="display: none; margin-bottom: 1rem; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(15, 23, 42, 0.08); background: #f8fafc;">
              <h5 style="margin: 0 0 4px; color: #111827; font-size: 14px; font-weight: 700;">Try-On not available for this product</h5>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.45;">This product does not have enough usable images for virtual try-on yet, so Stylique is showing fit guidance instead.</p>
            </div>

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

            <!-- Complete the Look Recommendations Section -->
            <div id="stylique-plugin-complete-look" class="stylique-complete-look-section" style="display: none; margin-top: 1.5rem;">
              <div class="stylique-section-header">
                <h5>Complete the Look</h5>
                <div class="stylique-ai-badge">AI Styling</div>
              </div>
              <div class="stylique-complete-look-content" id="stylique-plugin-complete-look-content">
                <div class="stylique-loading-state">
                  <div class="stylique-spinner-small"></div>
                  <p>Finding perfect matches...</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div> <!-- Ensure stylique-modal-grid is closed -->

    </div> <!-- End stylique-tryon-interface -->

      <div id="stylique-tier3-size-advisor" class="stylique-tier3-size-advisor" style="display: none;">
        <div class="stylique-tier3-visual">
          <div class="stylique-tier3-image-frame">
            <?php if ( isset($product) && $product && $product->get_image_id() ) : ?>
              <img
                id="stylique-tier3-product-image"
                src="<?php echo esc_url( wp_get_attachment_image_url( $product->get_image_id(), "large" ) ); ?>"
                alt="<?php echo esc_attr( $product->get_name() ); ?>">
            <?php else : ?>
              <div class="stylique-tier3-image-placeholder">
                <span><?php echo esc_html( substr( isset($product) && $product ? $product->get_name() : "Product", 0, 1 ) ); ?></span>
              </div>
            <?php endif; ?>
          </div>
        </div>

        <div class="stylique-tier3-panel">
          <div class="stylique-tier3-copy">
            <div class="stylique-tier3-eyebrow-row">
              <span class="stylique-tier3-eyebrow">Size guidance only</span>
            </div>
            <h4 id="stylique-tier3-product-title"><?php echo esc_html( isset($product) && $product ? $product->get_name() : "" ); ?></h4>
            <p>Try-On is unavailable for this item. Size guidance is still available.</p>
          </div>

          <div id="stylique-tier3-size-content" class="stylique-tier3-size-content">
            <div class="stylique-tier3-loading">
              <div class="stylique-spinner-small"></div>
              <span>Preparing your size advisor...</span>
            </div>
          </div>

          <div id="stylique-tier3-complete-look" class="stylique-tier3-complete-look" style="display: none;">
            <div class="stylique-tier3-section-head">
              <h5>Complete the Look</h5>
              <span>Styling suggestions</span>
            </div>
            <div id="stylique-tier3-complete-look-content" class="stylique-tier3-complete-look-content">
              <div class="stylique-tier3-loading">
                <div class="stylique-spinner-small"></div>
                <span>Finding matching pieces...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PREMIUM FULL-WIDGET RESULT VIEW (uwear.ai-style) -->
      <div id="stylique-result-view" class="stylique-result-view" style="display: none;">

    <!-- Left Column: Clean Result Image -->
    <div class="stylique-result-left" style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; position: relative;">
      <div id="stylique-result-image-loading" style="position: absolute; text-align: center; color: #666; font-size: 14px;">
        <div class="stylique-spinner-small" style="margin: 0 auto 10px;"></div>
        Loading your try-on...
      </div>
      <div id="stylique-result-image-error" style="position: absolute; text-align: center; color: #e53e3e; font-size: 14px; display: none;">
        Failed to load image.
      </div>
      <div class="stylique-result-image-container" style="z-index: 2;">
        <img id="stylique-result-main-image" alt="Virtual try-on result" style="display: none; opacity: 0; transition: opacity 0.5s ease;" />
      </div>
    </div>

    <!-- Right Column: Items in this look -->
    <div class="stylique-result-right">
      <div class="stylique-result-items-header">
        <h5>Items in this look:</h5>
      </div>
      <div class="stylique-result-items-list" id="stylique-result-items-list">
        <!-- Populated dynamically by JS -->
      </div>
      
      <!-- Complete the Look -->
      <div id="stylique-complete-look-container" style="display: none;">
        <div class="stylique-result-items-header" style="padding-top: 16px;">
          <h5>Complete the look</h5>
        </div>
        <div class="stylique-suggestions-carousel" id="stylique-suggestions-carousel">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Size recommendation loaded dynamically -->
      <div id="stylique-result-size-details" style="display:none;"></div>
    </div>

    <!-- Bottom Action Bar -->
    <div class="stylique-result-bottom-bar">
      <button class="stylique-pill-btn stylique-pill-primary stylique-result-add-to-cart" id="stylique-result-add-to-cart" onclick="window.addToCart(window.styliqueLastRecommendedSize)">
        Add to Cart
      </button>
      <button class="stylique-pill-btn stylique-pill-secondary stylique-result-icon-btn" onclick="window.downloadResultImage()" id="stylique-result-download" aria-label="Download try-on result" title="Download">
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
        <span class="stylique-pill-label">Download</span>
      </button>
      <button class="stylique-pill-btn stylique-pill-secondary stylique-result-icon-btn" onclick="window.resetTryOnFromResult()" id="stylique-result-try-again" aria-label="Try again" title="Try Again">
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          <path d="M20 4v5h-5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <span class="stylique-pill-label">Try Again</span>
      </button>
    </div>
    </div>
  </div> <!-- End stylique-section-content -->

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


        </div>
      </div>
    </div>

    <div id="stylique-processing-overlay" class="stylique-processing-overlay" style="display: none;">
      <div class="stylique-processing-content">
        
        <div class="stylique-processing-icon-wrapper">
          <div class="stylique-processing-ring"></div>
          <div class="stylique-processing-ring stylique-ring-2"></div>
          <div class="stylique-processing-ring stylique-ring-3"></div>
          <div class="stylique-processing-icon" id="stylique-processing-icon">
            <img src="<?php echo esc_url($stylique_options["logo_url"] ?? ""); ?>" alt="Stylique" class="stylique-processing-logo-img">
          </div>
        </div>

        
        <h4 id="stylique-processing-title">Creating Your Look</h4>
        
        
        <p id="stylique-processing-text" class="stylique-processing-status">Analyzing your photo...</p>

        
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

    
    <div id="stylique-onboarding-modal" class="stylique-modal" style="display: none;">
      <div class="stylique-modal-backdrop"></div>
      <div class="stylique-modal-content stylique-onboarding-modal-content">
        
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
              <label for="stylique-onboarding-phone">Phone Number (Optional)</label>
              <input type="tel" id="stylique-onboarding-phone" placeholder="Enter your phone number">
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
  </div>
    

    </div>
    
  </div>
  
</div>






<?php
$stylique_product_image_urls = array();
$stylique_woo_product_id = null;
$stylique_woo_product_type = null;
$stylique_woo_product_url = null;
$stylique_woo_cart_url = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/cart/' );
$stylique_woo_ajax_add_to_cart_url = class_exists( 'WC_AJAX' ) ? WC_AJAX::get_endpoint( 'add_to_cart' ) : add_query_arg( 'wc-ajax', 'add_to_cart', home_url( '/' ) );
$stylique_woo_add_to_cart_url = null;
$stylique_woo_variations = array();
if ( isset( $product ) && $product ) {
  $stylique_woo_product_id = $product->get_id();
  $stylique_woo_product_type = $product->get_type();
  $stylique_woo_product_url = get_permalink( $stylique_woo_product_id );
  $stylique_woo_add_to_cart_url = add_query_arg( 'add-to-cart', $stylique_woo_product_id, $stylique_woo_product_url ? $stylique_woo_product_url : home_url( '/' ) );

  if ( $product->is_type( 'variable' ) && method_exists( $product, 'get_available_variations' ) ) {
    foreach ( $product->get_available_variations() as $variation ) {
      $stylique_woo_variations[] = array(
        'variation_id' => isset( $variation['variation_id'] ) ? (int) $variation['variation_id'] : 0,
        'attributes' => isset( $variation['attributes'] ) && is_array( $variation['attributes'] ) ? $variation['attributes'] : array(),
        'is_in_stock' => ! empty( $variation['is_in_stock'] ),
        'is_purchasable' => ! empty( $variation['is_purchasable'] ),
      );
    }
  }

  $featured_image_id = $product->get_image_id();
  if ( $featured_image_id ) {
    $featured_image_url = wp_get_attachment_image_url( $featured_image_id, 'large' );
    if ( $featured_image_url ) {
      $stylique_product_image_urls[] = $featured_image_url;
    }
  }

  foreach ( $product->get_gallery_image_ids() as $gallery_image_id ) {
    $gallery_image_url = wp_get_attachment_image_url( $gallery_image_id, 'large' );
    if ( $gallery_image_url ) {
      $stylique_product_image_urls[] = $gallery_image_url;
    }
  }

  $stylique_product_image_urls = array_values( array_unique( $stylique_product_image_urls ) );
}
?>

<script>
  (function () {
    window.styliqueOptions = Object.assign(window.styliqueOptions || {}, {
      storeId: <?php echo wp_json_encode( get_option( 'stylique_store_id' ) ); ?>,
      backendUrl: <?php echo wp_json_encode( get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL ) ); ?>,
      primaryColor: <?php echo wp_json_encode( get_option( 'stylique_primary_color', '#642FD7' ) ); ?>,
      secondaryColor: <?php echo wp_json_encode( get_option( 'stylique_secondary_color', '#F4536F' ) ); ?>,
      wooProductId: <?php echo wp_json_encode( $stylique_woo_product_id ); ?>,
      wooProductTitle: <?php echo isset( $product ) && $product ? wp_json_encode( $product->get_name() ) : 'null'; ?>,
      wooProductType: <?php echo wp_json_encode( $stylique_woo_product_type ); ?>,
      wooProductUrl: <?php echo wp_json_encode( $stylique_woo_product_url ); ?>,
      wooCartUrl: <?php echo wp_json_encode( $stylique_woo_cart_url ); ?>,
      wooAddToCartUrl: <?php echo wp_json_encode( $stylique_woo_add_to_cart_url ); ?>,
      wooAjaxAddToCartUrl: <?php echo wp_json_encode( $stylique_woo_ajax_add_to_cart_url ); ?>,
      wooVariations: <?php echo wp_json_encode( $stylique_woo_variations ); ?>
    });

    var STYLIQUE_API_BASE = window.styliqueOptions.backendUrl || "https://www.styliquetechnologies.com";

    console.log('[Stylique] API base URL:', STYLIQUE_API_BASE);
    console.log('[Stylique] Store ID:', window.styliqueOptions.storeId);

    /**
     * Wrapper around fetch() that automatically injects
     * ngrok-skip-browser-warning for any request to STYLIQUE_API_BASE.
     * Without this header ngrok free-tier returns an HTML interstitial
     * page that has NO CORS headers, which causes the browser to block it.
     */
    function styFetch(url, opts) {
      opts = opts || {};
      var isApiCall = (typeof url === 'string') && url.indexOf(STYLIQUE_API_BASE) === 0;
      if (isApiCall) {
        var widgetToken = window.styliqueOptions && window.styliqueOptions.widgetToken;
        if (opts.headers instanceof Headers) {
          if (!opts.headers.has('ngrok-skip-browser-warning')) {
            opts.headers.set('ngrok-skip-browser-warning', 'true');
          }
          if (widgetToken && !opts.headers.has('X-Stylique-Widget-Token')) {
            opts.headers.set('X-Stylique-Widget-Token', widgetToken);
          }
        } else if (opts.headers && typeof opts.headers === 'object' && !Array.isArray(opts.headers)) {
          opts.headers = Object.assign({ 'ngrok-skip-browser-warning': 'true' }, widgetToken ? { 'X-Stylique-Widget-Token': widgetToken } : {}, opts.headers);
        } else {
          opts.headers = Object.assign({ 'ngrok-skip-browser-warning': 'true' }, widgetToken ? { 'X-Stylique-Widget-Token': widgetToken } : {});
        }
      }
      return fetch(url, opts).then(function(response) {
        if (isApiCall && response && response.clone) {
          response.clone().json().then(function(payload) {
            if (payload && payload.widgetToken) {
              window.styliqueOptions.widgetToken = payload.widgetToken;
            }
          }).catch(function() {});
        }
        return response;
      });
    }

    // Configuration
    window.styliqueOptions = Object.assign(window.styliqueOptions || {}, {
      // storeId comes from backend
      currentUrl: window.location.href,
      domain: window.location.hostname,
      selectedImage: null,
      currentProduct: null,
      isLoggedIn: false,
      storePlan: null,
      planActive: false,
      tryonsQuota: 0,
      tryonsUsed: 0,
      storeStatus: null,
      stores: null
    });

    console.log('[Stylique] Section initialized, store:', window.styliqueOptions.storeId);

    // Capture ALL Shopify product images for carousel (primary source, not fallback)
    window.styliqueOptions.shopifyProductImages = [];
    window.styliqueOptions.shopifyProductImages = <?php echo wp_json_encode( $stylique_product_image_urls ); ?>;
    console.log('[Stylique] WooCommerce product images captured:', window.styliqueOptions.shopifyProductImages.length, 'images');

    async function _styProbe(label, url, opts) {
      console.log('[Stylique probe]', label, '→', url);
      try {
        var resp = await styFetch(url, opts || {});
        var ct = resp.headers.get('content-type') || '';
        var bodyText = await resp.text();
        var isJson = ct.indexOf('application/json') !== -1;
        var isHtml = ct.indexOf('text/html') !== -1 || bodyText.trim().charAt(0) === '<';
        console.log('[Stylique probe]', label, 'status:', resp.status, 'type:', ct);
        if (isHtml) {
          console.warn('[Stylique probe]', label, 'GOT HTML (ngrok warning page?), first 300 chars:', bodyText.slice(0, 300));
        } else {
          console.log('[Stylique probe]', label, 'body:', bodyText.slice(0, 500));
        }
        return { ok: resp.ok, status: resp.status, isJson: isJson, isHtml: isHtml, bodyText: bodyText,
          json: function () { try { return JSON.parse(bodyText); } catch (e) { return null; } } };
      } catch (err) {
        console.error('[Stylique probe]', label, 'EXCEPTION:', err.name, err.message);
        return { ok: false, status: 0, isJson: false, isHtml: false, bodyText: '', error: err,
          json: function () { return null; } };
      }
    }

    async function testAPIConnection() {
      console.log('[Stylique] ── testAPIConnection start ──');
      console.log('[Stylique] API base:', STYLIQUE_API_BASE);
      console.log('[Stylique] Page origin:', window.location.origin);

      var ping = await _styProbe('ping', STYLIQUE_API_BASE + '/api/ping');
      if (!ping.ok) {
        console.error('[Stylique] /api/ping failed — cannot reach backend. Status:', ping.status,
          ping.error ? ('Error: ' + ping.error.message) : '');
        if (ping.isHtml) {
          console.error('[Stylique] Received HTML instead of JSON. This usually means ngrok is showing its browser-warning page or the URL is wrong.');
        }
        console.log('[Stylique] ── testAPIConnection FAILED ──');
        return false;
      }

      var stores = await _styProbe('list-stores', STYLIQUE_API_BASE + '/api/plugin/list-stores');
      if (stores.ok) {
        var j = stores.json();
        if (j && j.stores && Array.isArray(j.stores)) {
          window.styliqueOptions.stores = j.stores;
        }
        console.log('[Stylique] list-stores OK, count:', (j && j.stores ? j.stores.length : '?'));
      } else {
        console.warn('[Stylique] list-stores failed (non-fatal), status:', stores.status);
      }

      console.log('[Stylique] ── testAPIConnection OK ──');
      return true;
    }

    // Fetch store plan/quota
    async function fetchStoreStatus() {
      // Helper to normalize and apply store data
      function applyStoreRow(s) {
        // Store the full store object for recommendations
        window.styliqueOptions.storeStatus = s;

        window.styliqueOptions.storePlan = s.subscription_name || null;
        let active = false;
        if (typeof s.subscription_active === 'boolean') {
          active = s.subscription_active;
        } else {
          const hasDates = !!s.subscription_start_at && !!s.subscription_end_at;
          if (hasDates) {
            const today = new Date();
            const start = new Date(s.subscription_start_at);
            const end = new Date(s.subscription_end_at);
            active = today >= start && today <= end;
          } else {
            const q = typeof s.tryons_quota === 'number' ? s.tryons_quota : 0;
            active = q > 0 && (s.subscription_name === 'FREE' || !s.subscription_name);
          }
        }
        window.styliqueOptions.planActive = active;
        window.styliqueOptions.tryonsQuota = typeof s.tryons_quota === 'number' ? s.tryons_quota : 0;
        window.styliqueOptions.tryonsUsed = typeof s.tryons_used === 'number' ? s.tryons_used : 0;

        console.log('✅ Store status updated:', {
          subscription_name: s.subscription_name,
          planActive: active,
          quota: window.styliqueOptions.tryonsQuota,
          used: window.styliqueOptions.tryonsUsed
        });

        updatePlanNote();
        updateTryOnButtonsState();
        if (Number(window.styliqueOptions.productTier) === 3) {
          applyTierRouting(3);
        }
      }

      // Try plugin endpoint first
      try {
        const url = STYLIQUE_API_BASE + '/api/plugin/store-status?storeId=' + encodeURIComponent(window.styliqueOptions.storeId);
        console.log('Fetching store status (plugin):', url);
        const resp = await styFetch(url, { credentials: 'omit' });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.success && json.store) {
            applyStoreRow(json.store);
            return;
          }
          console.warn('Plugin store-status response missing data', json);
        } else {
          console.warn('Plugin store-status HTTP', resp.status);
        }
      } catch (e) {
        console.warn('Plugin store-status fetch error', e);
      }

      // Fallback: use CORS-safe plugin endpoint and match by store_id
      try {
        const url2 = STYLIQUE_API_BASE + '/api/plugin/list-stores';
        console.log('Falling back to plugin stores list:', url2);
        const resp2 = await styFetch(url2, { credentials: 'omit' });
        if (!resp2.ok) throw new Error('stores http ' + resp2.status);
        const json2 = await resp2.json();
        // Expected: { success: true, stores: [...] }
        if (json2 && json2.success && Array.isArray(json2.stores)) {
          // Store the stores array for fallback in recommendations
          window.styliqueOptions.stores = json2.stores;

          const match = json2.stores.find(function (x) { return x && (x.store_id === window.styliqueOptions.storeId); });
          if (match) {
            applyStoreRow(match);
            return;
          }
          console.warn('No store matched store_id in stores list');
        } else {
          console.warn('Unexpected list-stores response shape', json2);
        }
      } catch (e2) {
        console.warn('Fallback list-stores fetch error', e2);
      }

      // If we reached here, both attempts failed
      updatePlanNote(true);
      updateTryOnButtonsState();
    }

    function updatePlanNote(fetchFailed) {
      const note = document.getElementById('stylique-plan-note');
      const noteText = document.getElementById('stylique-plan-note-text');
      if (!note || !noteText) return;
      // Do not show plan/quota note in plugin UI per request
      note.style.display = 'none';
    }

    function updateTryOnButtonsState() {
      var start2DButton = document.getElementById('stylique-start-2d-tryon');
      var start3DButton = document.getElementById('stylique-start-3d-tryon');
      var imageSelected = !!window.styliqueOptions.selectedImage;
      var plan = window.styliqueOptions.storePlan;
      var active = window.styliqueOptions.planActive !== false;
      var quota = window.styliqueOptions.tryonsQuota || 0;
      var used = window.styliqueOptions.tryonsUsed || 0;
      var remaining = Math.max(0, quota - used);

      // If store status never loaded, don't block on quota — allow try-on
      var storeLoaded = !!window.styliqueOptions.storeStatus;
      var quotaOK = !storeLoaded || remaining > 0;

      var canTryOn = imageSelected && quotaOK && active;

      console.log('Stylique button state:', {
        imageSelected: imageSelected, active: active, storeLoaded: storeLoaded,
        quota: quota, used: used, remaining: remaining, quotaOK: quotaOK, canTryOn: canTryOn
      });

      // 2D button: always visible, enabled when image selected + quota OK + plan active
      if (start2DButton) {
        start2DButton.disabled = !canTryOn;
        if (canTryOn) {
          start2DButton.classList.remove('stylique-btn-disabled');
        } else {
          start2DButton.classList.add('stylique-btn-disabled');
        }
      }

      // 3D button: visible only for ULTIMATE plan
      if (start3DButton) {
        var isUltimate = plan === 'ULTIMATE';
        if (!isUltimate) {
          start3DButton.style.display = 'none';
        } else {
          start3DButton.style.display = 'inline-block';
          start3DButton.disabled = !canTryOn;
        }
      }
    }

    // Check login status on load
    function checkLoginStatus() {
      // Check if user is logged in to Stylique
      const styliqueToken = localStorage.getItem('stylique_auth_token');
      const styliqueUser = localStorage.getItem('stylique_user');

      if (styliqueToken && styliqueUser) {
        try {
          window.styliqueOptions.isLoggedIn = true;
          window.styliqueOptions.user = JSON.parse(styliqueUser);
          window.styliqueOptions.authToken = styliqueToken;
          showTryOnInterface();
          console.log('User logged in to Stylique:', window.styliqueOptions.user.email);
        } catch (e) {
          // Invalid stored data, clear it
          clearStyliqueSession();
          showLoginScreen('Your session expired. Please log in again.');
        }
      } else {
        clearStyliqueSession();
        showLoginRequired();
      }
    }

    function isStyliqueLoggedIn() {
      return !!(window.styliqueOptions && window.styliqueOptions.user && window.styliqueOptions.authToken);
    }

    function resetLoginFormState() {
      const emailStep = document.getElementById('stylique-email-step');
      const otpStep = document.getElementById('stylique-otp-step');
      const otpInput = document.getElementById('stylique-otp');
      const errorDiv = document.getElementById('stylique-login-error');
      const successDiv = document.getElementById('stylique-login-success');

      if (emailStep) emailStep.style.display = 'block';
      if (otpStep) otpStep.style.display = 'none';
      if (otpInput) otpInput.value = '';
      if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
      }
      if (successDiv) {
        successDiv.textContent = '';
        successDiv.style.display = 'none';
      }
    }

    function clearStyliqueSession() {
      localStorage.removeItem('stylique_auth_token');
      localStorage.removeItem('stylique_user');
      localStorage.removeItem('stylique_token');

      window.styliqueOptions.isLoggedIn = false;
      window.styliqueOptions.user = null;
      window.styliqueOptions.authToken = null;
      window.styliqueOptions.pendingEmail = null;
      window.styliqueOptions.isNewUser = false;

      const userInfo = document.getElementById('stylique-user-info-container');
      const userEmail = document.getElementById('stylique-user-email');
      const inlineOnboarding = document.getElementById('stylique-inline-onboarding');
      const onboardingModal = document.getElementById('stylique-onboarding-modal');
      const processingOverlay = document.getElementById('stylique-processing-overlay');

      if (userInfo) userInfo.style.display = 'none';
      if (userEmail) userEmail.textContent = '';
      if (inlineOnboarding) inlineOnboarding.style.display = 'none';
      if (onboardingModal) onboardingModal.style.display = 'none';
      if (processingOverlay) {
        processingOverlay.style.display = 'none';
        processingOverlay.classList.remove('is-active', 'is-hiding');
      }

      resetLoginFormState();
      if (typeof resetTryOn === 'function') {
        try { resetTryOn(); } catch (err) { console.warn('[Stylique] Could not reset try-on state after logout:', err); }
      }
    }

    function showLoginScreen(reason) {
      const loginRequired = document.getElementById('stylique-login-required');
      const tryOnInterface = document.getElementById('stylique-tryon-interface');
      const inlineOnboarding = document.getElementById('stylique-inline-onboarding');
      const successDiv = document.getElementById('stylique-login-success');

      if (tryOnInterface) tryOnInterface.style.display = 'none';
      if (inlineOnboarding) inlineOnboarding.style.display = 'none';
      if (loginRequired) loginRequired.style.display = 'block';
      resetLoginFormState();

      if (reason && successDiv) {
        successDiv.textContent = reason;
        successDiv.style.display = 'block';
      }

      setTimeout(() => {
        const emailInput = document.getElementById('stylique-email');
        if (emailInput) emailInput.focus();
      }, 50);
      scrollToTryOn();
    }

    function requireLogin(reason) {
      if (isStyliqueLoggedIn()) return true;
      clearStyliqueSession();
      showLoginScreen(reason || 'Please log in to continue.');
      return false;
    }

    async function parseStyliqueJsonResponse(response) {
      try {
        return await response.json();
      } catch (err) {
        return {
          success: false,
          code: 'invalid_response',
          error: 'The server returned an invalid response. Please try again shortly.'
        };
      }
    }

    function getStyliqueAuthErrorMessage(result, response) {
      if (result && result.code === 'otp_email_not_configured') {
        return 'Verification email is not configured yet. Please contact the store owner.';
      }
      if (result && result.code === 'otp_email_delivery_failed') {
        return 'Verification email could not be delivered. Please try again shortly.';
      }
      if (result && result.code === 'invalid_response') {
        return result.error;
      }
      if (response && response.status >= 500) {
        return 'Login service is temporarily unavailable. Please try again shortly.';
      }
      return (result && result.error) || 'Something went wrong. Please try again.';
    }

    function getStyliqueOtpSuccessMessage(result) {
      if (result && result.dev_otp) {
        return 'Development verification code: ' + result.dev_otp;
      }
      return (result && result.message) || 'Verification code sent.';
    }

    // Show/hide interface states
    // Show/hide interface states
    function showLoginRequired() {
      // In upload-first flow, we actually show the try-on interface initially, but without user info
      document.getElementById('stylique-login-required').style.display = 'none';
      document.getElementById('stylique-tryon-interface').style.display = 'block';
      const userInfo = document.getElementById('stylique-user-info-container');
      if (userInfo) userInfo.style.display = 'none';
      
      // Initialize layout
      checkProductAvailability();
      fetchStoreStatus();
    }

    function showTryOnInterface() {
      document.getElementById('stylique-login-required').style.display = 'none';
      document.getElementById('stylique-tryon-interface').style.display = 'block';
      const userInfo = document.getElementById('stylique-user-info-container');
      if (userInfo) userInfo.style.display = 'flex'; // Restore normal flex layout

      // Update user email display
      if (window.styliqueOptions.user && window.styliqueOptions.user.email) {
        document.getElementById('stylique-user-email').textContent = window.styliqueOptions.user.email;
      }

      // Check product availability before showing upload section
      checkProductAvailability();

      // Fetch store status for gating
      fetchStoreStatus();
    }

    // Intercept Upload Clicks
    window.handleUploadClick = function() {
      if (!requireLogin('Please log in to upload your photo.')) return;
      document.getElementById('stylique-file-input').click();
    };

    // Check if current product is available for try-on
    async function checkProductAvailability() {
      const unavailableSection = document.getElementById('stylique-product-unavailable');
      const uploadSection = document.querySelector('.stylique-upload-section');
      const tryonOptions = document.querySelector('.stylique-tryon-options');

      // Default: hide unavailable, show upload
      if (unavailableSection) unavailableSection.style.display = 'none';
      if (uploadSection) uploadSection.style.display = 'block';
      if (tryonOptions) tryonOptions.style.display = 'block';

      const payload = {
        storeId: window.styliqueOptions.storeId,
        currentUrl: window.styliqueOptions.currentUrl,
        wooProductId: <?php echo isset( $product ) && $product ? wp_json_encode( $product->get_id() ) : 'null'; ?>
      };
      console.log('Stylique check-product payload:', payload);

      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/check-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Stylique check-product response:', data);
        console.log('Stylique check-product response.product:', data.product);
        console.log('Stylique check-product response.product.id:', data.product?.id);

        if (data.available === true && data.product) {
          // Product is available - store product info
          console.log('BEFORE assignment: window.styliqueOptions.currentProduct =', window.styliqueOptions.currentProduct);
          window.styliqueOptions.currentProduct = data.product;
          window.styliqueOptions.internalProductId = data.product.id;
          console.log('AFTER assignment: window.styliqueOptions.currentProduct =', window.styliqueOptions.currentProduct);
          console.log('Product assigned with id:', window.styliqueOptions.currentProduct.id);

          // Fallback: if API doesn't provide images, use Shopify product images
          if (!data.product.images || !Array.isArray(data.product.images) || data.product.images.length === 0) {
            if (window.styliqueOptions.shopifyProductImages && window.styliqueOptions.shopifyProductImages.length > 0) {
              data.product.images = window.styliqueOptions.shopifyProductImages;
              window.styliqueOptions.currentProduct.images = window.styliqueOptions.shopifyProductImages;
              console.log('Stylique: Using Shopify images fallback, loaded', window.styliqueOptions.shopifyProductImages.length, 'images');
            }
          }

          // Capture Product UUID for analytics
          if (data.product.id) {
            window.styliqueOptions.productUuid = data.product.id;
            console.log('Stylique: Product UUID resolved:', data.product.id);
          }

          // Capture product tier (1, 2, or 3) — default to 3 if missing
          var tier = (data.product && data.product.tier) ? Number(data.product.tier) : 3;
          window.styliqueOptions.productTier = tier;
          console.log('Stylique: Product tier:', tier);

          // Hide unavailable message
          if (unavailableSection) unavailableSection.style.display = 'none';
          if (uploadSection) uploadSection.style.display = 'block';

          // Apply tier-based routing (hides buttons for tier 3)
          applyTierRouting(tier);

          // Update UI state based on product availability
          updateTryOnButtonsState();
        } else {
          // Product not available - show unavailable message
          console.log('Stylique: Product not available for try-on:', data.message || data.reason);

          if (unavailableSection) unavailableSection.style.display = 'block';
          if (uploadSection) uploadSection.style.display = 'none';
          if (tryonOptions) tryonOptions.style.display = 'none';
        }
      } catch (error) {
        console.error('Stylique: Error checking product availability:', error);
        if (unavailableSection) {
          unavailableSection.style.display = 'block';
          var msg = unavailableSection.querySelector('p');
          if (msg) {
            msg.textContent = 'Could not reach Stylique. Check your network and backend URL. If the issue persists, contact support.';
          }
        }
        if (uploadSection) uploadSection.style.display = 'none';
        if (tryonOptions) tryonOptions.style.display = 'none';
      }
    }

    /**
     * Stylique Image Carousel Module
     * Supports: Tier 1 (5+ images), Tier 2 (2-4 images)
     * Features: Touch swipe, arrow navigation, keyboard navigation, dot indicators
     */
    const StyleiqueCarousel = (function() {
      let state = {
        currentIndex: 0,
        images: [],
        container: null,
        touchStartX: 0
      };

      function init(imagesArray, containerId) {
        if (!imagesArray || imagesArray.length === 0) {
          console.warn('[Carousel] No images provided');
          return;
        }

        state.images = imagesArray;
        state.currentIndex = 0;
        state.container = document.getElementById(containerId);

        if (!state.container) {
          console.warn('[Carousel] Container not found:', containerId);
          return;
        }

        // Clear any existing carousel
        state.container.innerHTML = '';

        // Build carousel HTML
        const carouselHTML = `
          <div class="stylique-carousel-wrapper">
            <div class="stylique-carousel-main">
              <img id="stylique-carousel-image" src="${imagesArray[0]}" alt="Product image" class="stylique-carousel-image">
              ${imagesArray.length > 1 ? `
                <button class="stylique-carousel-nav stylique-carousel-prev" onclick="StyleiqueCarousel.goToPrevious()" aria-label="Previous image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button class="stylique-carousel-nav stylique-carousel-next" onclick="StyleiqueCarousel.goToNext()" aria-label="Next image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              ` : ''}
            </div>
            ${imagesArray.length > 1 ? `
              <div class="stylique-carousel-dots">
                ${imagesArray.map((_, i) => `
                  <button class="stylique-carousel-dot ${i === 0 ? 'active' : ''}" onclick="StyleiqueCarousel.selectImage(${i})" aria-label="Image ${i + 1}"></button>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;

        state.container.innerHTML = carouselHTML;

        // Show the carousel container
        state.container.style.display = 'block';

        // Programmatically attach event listeners to carousel navigation (fallback for CSP)
        const prevButton = state.container.querySelector('.stylique-carousel-prev');
        const nextButton = state.container.querySelector('.stylique-carousel-next');
        if (prevButton) {
          prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            goToPrevious();
          });
          console.log('[Carousel] Prev button listener attached');
        }
        if (nextButton) {
          nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            goToNext();
          });
          console.log('[Carousel] Next button listener attached');
        }

        // Attach event listeners to carousel image
        const carouselImage = document.getElementById('stylique-carousel-image');
        if (carouselImage) {
          carouselImage.addEventListener('touchstart', handleTouchStart, false);
          carouselImage.addEventListener('touchend', handleTouchEnd, false);
        }
        document.addEventListener('keydown', handleKeydown);

        console.log('[Carousel] Initialized with', state.images.length, 'images');
      }

      function handleTouchStart(e) {
        state.touchStartX = e.touches[0].clientX;
      }

      function handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = state.touchStartX - touchEndX;

        if (Math.abs(diff) > 50) { // Minimum swipe distance
          if (diff > 0) {
            goToNext();
          } else {
            goToPrevious();
          }
        }
      }

      function handleKeydown(e) {
        if (!state.container || !state.container.offsetParent) return; // Check if visible

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPrevious();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToNext();
        }
      }

      function selectImage(index) {
        if (index < 0 || index >= state.images.length) return;

        state.currentIndex = index;
        const img = document.getElementById('stylique-carousel-image');
        if (img) {
          img.src = state.images[index];
        }

        // Update dots
        document.querySelectorAll('.stylique-carousel-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });

        console.log('[Carousel] Selected image', index + 1, 'of', state.images.length);
      }

      function goToNext() {
        console.log('[Carousel] Next clicked, current index:', state.currentIndex, 'total images:', state.images.length);
        const nextIndex = (state.currentIndex + 1) % state.images.length;
        selectImage(nextIndex);
      }

      function goToPrevious() {
        console.log('[Carousel] Previous clicked, current index:', state.currentIndex, 'total images:', state.images.length);
        const prevIndex = (state.currentIndex - 1 + state.images.length) % state.images.length;
        selectImage(prevIndex);
      }

      function getCurrentImage() {
        return state.images[state.currentIndex] || null;
      }

      function destroy() {
        const img = document.getElementById('stylique-carousel-image');
        if (img) {
          img.removeEventListener('touchstart', handleTouchStart);
          img.removeEventListener('touchend', handleTouchEnd);
        }
        document.removeEventListener('keydown', handleKeydown);
        state = { currentIndex: 0, images: [], container: null, touchStartX: 0 };
      }

      // Public API
      return {
        init: init,
        selectImage: selectImage,
        goToNext: goToNext,
        goToPrevious: goToPrevious,
        getCurrentImage: getCurrentImage,
        destroy: destroy
      };
    })();

    // Export StyleiqueCarousel to window
    window.StyleiqueCarousel = StyleiqueCarousel;

    /**
     * Show/hide UI sections based on the product tier.
     * Tier 1-2: full try-on experience (2D/3D buttons visible).
     * Tier 3: only size recommendation and styling suggestions.
     */
    function applyTierRouting(tier) {
      var tryOnOptions = document.querySelector('.stylique-tryon-options');
      var uploadSection = document.querySelector('.stylique-upload-section');
      var recsSection = document.getElementById('stylique-plugin-recommendations');
      var tierNotice = document.getElementById('stylique-tier3-notice');
      var completeLookSection = document.getElementById('stylique-plugin-complete-look');
      var tier3Advisor = document.getElementById('stylique-tier3-size-advisor');
      var tier3CompleteLook = document.getElementById('stylique-tier3-complete-look');
      var tryOnHeader = document.querySelector('#stylique-tryon-interface .stylique-tryon-header');
      var modalContent = document.querySelector('.stylique-modal-content');
      var tierBadge = document.getElementById('stylique-tier-badge');
      var modalGrid = document.querySelector('.stylique-modal-grid');

      if (tier === 3) {
        console.log('Stylique: Tier 3 — hiding try-on buttons, showing size rec only');

        if (modalContent) modalContent.classList.add('stylique-tier3-active');
        if (tryOnHeader) tryOnHeader.style.display = 'none';
        if (modalGrid) {
          modalGrid.classList.add('stylique-tier-3');
          modalGrid.style.display = 'none';
        }
        if (tier3Advisor) tier3Advisor.style.display = 'grid';
        if (tryOnOptions) tryOnOptions.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';

        if (recsSection) recsSection.style.display = 'none';
        if (tierNotice) tierNotice.style.display = 'none';
        if (tierBadge) {
          tierBadge.textContent = 'Size & Style Only';
          tierBadge.style.display = 'inline-block';
        }

        // Auto-load size recommendation if product ID available
        var productId = window.styliqueOptions.productUuid || window.styliqueOptions.internalProductId;
        var isUltimateTier3 = window.styliqueOptions.storePlan === 'ULTIMATE' || (window.styliqueOptions.storeStatus && window.styliqueOptions.storeStatus.subscription_name === 'ULTIMATE');
        if (completeLookSection) completeLookSection.style.display = 'none';
        if (tier3CompleteLook) tier3CompleteLook.style.display = (isUltimateTier3 && productId) ? 'block' : 'none';
        if (productId) {
          loadTier3SizeAdvisor(productId);
          if (isUltimateTier3 && window.styliqueOptions.user && window.styliqueOptions.user.id) {
            loadTier3CompleteLook(productId);
          }
        } else {
          renderTier3SizeAdvisorMessage('Size recommendation unavailable', 'We could not identify this product yet. Please refresh the page or try again shortly.');
        }
      } else {
        console.log('Stylique: Tier ' + tier + ' — full try-on experience available');

        if (modalContent) modalContent.classList.remove('stylique-tier3-active');
        if (tryOnHeader) tryOnHeader.style.display = '';
        if (tier3Advisor) tier3Advisor.style.display = 'none';
        if (modalGrid) {
          modalGrid.classList.remove('stylique-tier-3');
          modalGrid.style.display = '';
        }
        if (tryOnOptions) tryOnOptions.style.display = 'block';
        if (uploadSection) uploadSection.style.display = 'block';
        if (tierNotice) tierNotice.style.display = 'none';
        if (tierBadge) {
          tierBadge.textContent = tier === 1 ? 'Premium' : 'Standard';
          tierBadge.style.display = 'inline-block';
        }

        // Initialize carousel for Tier 1 (5+ images) and Tier 2 (2-4 images)
        if (tier === 1 || tier === 2) {
          // Prefer Shopify product images (complete list) over backend images (limited set)
          var imagesToUse = window.styliqueOptions.shopifyProductImages && window.styliqueOptions.shopifyProductImages.length > 0
            ? window.styliqueOptions.shopifyProductImages
            : (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.images);

          if (imagesToUse && Array.isArray(imagesToUse) && imagesToUse.length > 0) {
            console.log('Stylique: Initializing carousel with', imagesToUse.length, 'images for Tier', tier);
            console.log('Stylique: Using ' + (imagesToUse === window.styliqueOptions.shopifyProductImages ? 'Shopify' : 'backend') + ' images for carousel');
            StyleiqueCarousel.init(imagesToUse, 'stylique-product-image-carousel');
          } else {
            console.log('Stylique: No images available for carousel initialization');
          }
        }
      }
    }

    function styliqueTier3EscapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function styliqueTier3ReadMeasurement(source, key) {
      if (!source || !key) return null;
      const measurements = source.measurements || source;
      const unwrap = (value) => {
        if (value == null) return null;
        if (typeof value === 'object' && value.value != null) return value.value;
        return value;
      };
      const direct = unwrap(measurements[key]);
      if (direct != null) return direct;
      const width = unwrap(measurements.width);
      if ((key === 'chest' || key === 'waist') && width != null) return Number(width) * 2;
      return null;
    }

    function styliqueTier3FormatMeasurement(value) {
      if (value == null || value === '') return '&mdash;';
      if (typeof value === 'object' && value.value != null) {
        const unit = value.unit || 'in';
        return styliqueTier3EscapeHtml(value.value) + ' ' + styliqueTier3EscapeHtml(unit);
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        const rounded = Math.round(value * 10) / 10;
        return styliqueTier3EscapeHtml(String(rounded).replace(/\.0$/, '')) + ' in';
      }
      return styliqueTier3EscapeHtml(value);
    }

    function styliqueTier3Confidence(value) {
      let confidence = Number(value || 0);
      if (confidence > 0 && confidence <= 1) confidence = confidence * 100;
      return Math.max(0, Math.min(100, Math.round(confidence)));
    }

    function styliqueTier3NormalizeSizeLabel(rec) {
      const candidates = [
        rec && rec.bestFit,
        rec && rec.recommendedSize,
        rec && rec.recommended_size,
        rec && rec.best_size,
        rec && rec.size
      ];
      for (const candidate of candidates) {
        const value = String(candidate || '').trim();
        if (!value) continue;
        const lower = value.toLowerCase();
        if (lower === 'default title' || lower === 'default' || lower === 'title') return 'One Size';
        if (value.length > 12) continue;
        return value;
      }
      return 'One Size';
    }

    function styliqueTier3FitClass(text) {
      const value = String(text || '').toLowerCase();
      if (value.includes('tight') || value.includes('short') || value.includes('small')) return 'is-alert';
      if (value.includes('relaxed') || value.includes('loose') || value.includes('room')) return 'is-relaxed';
      if (value.includes('balanced') || value.includes('perfect') || value.includes('ideal') || value.includes('comfortable')) return 'is-good';
      return 'is-neutral';
    }

    function syncTier3ProductPreview() {
      const product = window.styliqueOptions.currentProduct || {};
      const title = product.title || product.product_name || <?php echo wp_json_encode( isset($product) && $product ? $product->get_name() : "Product" ); ?>;
      const titleEl = document.getElementById('stylique-tier3-product-title');
      if (titleEl && title) titleEl.textContent = title;

      const imageEl = document.getElementById('stylique-tier3-product-image');
      const imageFromList = Array.isArray(product.images) && product.images.length > 0
        ? (typeof product.images[0] === 'string' ? product.images[0] : (product.images[0].url || product.images[0].src))
        : '';
      const imageUrl = product.tryon_image_url || product.image_url || imageFromList;
      if (imageEl && imageUrl) imageEl.src = imageUrl;
    }

    function renderTier3SizeAdvisorMessage(title, message, showLogin) {
      const container = document.getElementById('stylique-tier3-size-content');
      if (!container) return;
      container.innerHTML = `
        <div class="stylique-tier3-message-card">
          <div class="stylique-tier3-message-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          </div>
          <div>
            <h5>${styliqueTier3EscapeHtml(title)}</h5>
            <p>${styliqueTier3EscapeHtml(message)}</p>
            ${showLogin ? '<button type="button" class="stylique-tier3-primary-btn" onclick="window.openStyliqueTier3Login()">Continue with email</button>' : ''}
          </div>
        </div>
      `;
    }

    async function loadTier3SizeAdvisor(productId) {
      const container = document.getElementById('stylique-tier3-size-content');
      if (!container) return;

      syncTier3ProductPreview();

      const userId = window.styliqueOptions.user?.id;
      if (!userId) {
        window.styliqueTier3AdvisorLoadedKey = '';
        renderTier3SizeAdvisorMessage('Sign in to view your recommended size', 'Your saved measurements are needed before Stylique can calculate the best fit for this product.', true);
        return;
      }

      const resolvedProductId = window.styliqueOptions.productUuid || productId;
      const loadKey = resolvedProductId + ':' + userId;
      if (window.styliqueTier3AdvisorLoadedKey === loadKey && container.dataset.loaded === 'true') return;
      window.styliqueTier3AdvisorLoadedKey = loadKey;

      container.dataset.loaded = 'false';
      container.innerHTML = `
        <div class="stylique-tier3-loading">
          <div class="stylique-spinner-small"></div>
          <span>Preparing your size advisor...</span>
        </div>
      `;

      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/size-recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: window.styliqueOptions.storeId,
            productId: resolvedProductId,
            userId: userId,
            currentUrl: window.styliqueOptions.currentUrl
          })
        });
        const data = await response.json();
        if (!data.success || !data.recommendation) {
          renderTier3SizeAdvisorMessage('Size recommendation unavailable', data.error || 'We could not load the size recommendation for this product yet.', false);
          return;
        }

        const rec = data.recommendation;
        const bestFit = styliqueTier3NormalizeSizeLabel(rec);
        const rawBestFit = rec.bestFit || bestFit;
        const confidence = styliqueTier3Confidence(rec.confidence);
        const fitFeel = rec.fitFeel || {};
        const userM = rec.userMeasurements || {};
        const sizeChart = Array.isArray(rec.sizeChart) ? rec.sizeChart : [];
        const bestSizeData = sizeChart.find(function(size) {
          return size && size.size && String(size.size).toUpperCase() === String(rawBestFit).toUpperCase();
        }) || {};
        const rows = [
          { key: 'chest', userKey: 'chest', label: 'Chest' },
          { key: 'shoulder', userKey: 'shoulder', label: 'Shoulders' },
          { key: 'length', userKey: 'length', label: 'Length' },
          { key: 'sleeve', userKey: 'sleeve', label: 'Sleeve' },
          { key: 'waist', userKey: 'waist', label: 'Waist' }
        ];

        const summaryChips = rows
          .filter(function(row) { return fitFeel[row.key]; })
          .slice(0, 3)
          .map(function(row) {
            const fit = fitFeel[row.key];
            return `<span class="stylique-tier3-fit-chip ${styliqueTier3FitClass(fit)}"><strong>${row.label}</strong>${styliqueTier3EscapeHtml(fit)}</span>`;
          }).join('');

        const rowData = rows.map(function(row) {
          const userRaw = styliqueTier3ReadMeasurement(userM, row.userKey);
          const garmentRaw = styliqueTier3ReadMeasurement(bestSizeData, row.key);
          const fitRaw = fitFeel[row.key] || '';
          return {
            label: row.label,
            user: styliqueTier3FormatMeasurement(userRaw),
            garment: styliqueTier3FormatMeasurement(garmentRaw),
            fit: fitRaw ? styliqueTier3EscapeHtml(fitRaw) : '&mdash;',
            fitClass: styliqueTier3FitClass(fitRaw),
            hasData: userRaw != null || garmentRaw != null || !!fitRaw
          };
        });
        const hasFitAnalysisData = rowData.some(function(row) { return row.hasData; });
        const tableRows = rowData.map(function(row) {
          return `
            <tr>
              <td>${row.label}</td>
              <td>${row.user}</td>
              <td>${row.garment}</td>
              <td><span class="stylique-tier3-fit-result ${row.fitClass}">${row.fit}</span></td>
            </tr>
          `;
        }).join('');
        const fitAnalysisHtml = hasFitAnalysisData ? `
          <div class="stylique-tier3-table-card">
            <div class="stylique-tier3-section-head">
              <h5>Fit Analysis</h5>
              <span>Your profile vs Size ${styliqueTier3EscapeHtml(bestFit)}</span>
            </div>
            <table class="stylique-tier3-fit-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>You</th>
                  <th>Garment</th>
                  <th>Fit</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        ` : `
          <div class="stylique-tier3-fit-empty">
            <div>
              <span>Fit profile pending</span>
              <p>Detailed measurements will appear after shopper profile and size-chart data are connected.</p>
            </div>
          </div>
        `;

        const safeBestFit = styliqueTier3EscapeHtml(bestFit);
        const sizeClass = bestFit.length > 4 ? ' is-compact' : '';
        const buttonLabel = bestFit && bestFit !== 'N/A' && bestFit !== 'One Size' ? `Add Size ${safeBestFit} to Cart` : 'Add to Cart';
        const fitSummaryHtml = summaryChips ? `<div class="stylique-tier3-fit-summary">${summaryChips}</div>` : '';

        container.dataset.loaded = 'true';
        container.innerHTML = `
          <div class="stylique-tier3-rec-grid">
            <div class="stylique-tier3-size-card">
              <span>Recommended</span>
              <strong class="${sizeClass}">${safeBestFit}</strong>
              <small>Best match from your profile</small>
            </div>
            <div class="stylique-tier3-confidence-card">
              <div>
                <span>Fit confidence</span>
                <strong>${confidence}%</strong>
              </div>
              <div class="stylique-tier3-confidence-track"><i style="width: ${confidence}%;"></i></div>
            </div>
          </div>

          ${fitSummaryHtml}
          ${fitAnalysisHtml}

          <div class="stylique-tier3-actions">
            <button type="button" class="stylique-tier3-primary-btn" data-size="${safeBestFit}" onclick="window.addToCart(this.dataset.size)">
              ${buttonLabel}
            </button>
            <button type="button" class="stylique-tier3-secondary-btn" onclick="window.closeStyliqueModal()">Close</button>
          </div>
        `;
      } catch (error) {
        console.error('Tier 3 size advisor error:', error);
        renderTier3SizeAdvisorMessage('Size recommendation unavailable', 'We could not load the size recommendation. Please try again shortly.', false);
      }
    }

    async function loadTier3CompleteLook(productId) {
      const container = document.getElementById('stylique-tier3-complete-look-content');
      if (!container) return;

      const userId = window.styliqueOptions.user?.id;
      if (!userId) {
        container.innerHTML = '<p class="stylique-tier3-empty-note">Sign in to unlock styling suggestions.</p>';
        return;
      }

      const lookKey = productId + ':' + userId;
      if (window.styliqueTier3LookLoadedKey === lookKey && container.dataset.loaded === 'true') return;
      window.styliqueTier3LookLoadedKey = lookKey;
      container.dataset.loaded = 'false';
      container.innerHTML = `
        <div class="stylique-tier3-loading">
          <div class="stylique-spinner-small"></div>
          <span>Finding matching pieces...</span>
        </div>
      `;

      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/complete-look', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: window.styliqueOptions.storeId,
            productId: productId,
            userId: userId,
            currentUrl: window.styliqueOptions.currentUrl,
            limit: 3
          })
        });
        const data = await response.json();
        if (!data.success || !Array.isArray(data.outfits) || data.outfits.length === 0) {
          container.innerHTML = '<p class="stylique-tier3-empty-note">Styling suggestions are not available for this product yet.</p>';
          return;
        }

        const items = [];
        data.outfits.forEach(function(outfit) {
          (outfit.items || []).forEach(function(item) {
            if (item && items.length < 3) items.push(item);
          });
        });

        if (items.length === 0) {
          container.innerHTML = '<p class="stylique-tier3-empty-note">Styling suggestions are not available for this product yet.</p>';
          return;
        }

        container.dataset.loaded = 'true';
        const styleNote = data.reasoning
          ? `<p class="stylique-tier3-style-note">${styliqueTier3EscapeHtml(data.reasoning)}</p>`
          : '<p class="stylique-tier3-style-note">Styling picks selected to complement this item.</p>';
        container.innerHTML = `
          ${styleNote}
          <div class="stylique-tier3-look-row">
            ${items.map(function(item) {
              const name = styliqueTier3EscapeHtml(item.product_name || item.title || 'Product');
              const image = item.image_url || item.image || '';
              const link = item.product_link || item.url || '';
              const openTag = link ? `<a class="stylique-tier3-look-card" href="${styliqueTier3EscapeHtml(link)}" target="_blank" rel="noopener">` : '<div class="stylique-tier3-look-card">';
              const closeTag = link ? '</a>' : '</div>';
              return `
                ${openTag}
                  <div class="stylique-tier3-look-image">
                    ${image ? `<img src="${styliqueTier3EscapeHtml(image)}" alt="${name}">` : '<span></span>'}
                  </div>
                  <span>${name}</span>
                ${closeTag}
              `;
            }).join('')}
          </div>
        `;
      } catch (error) {
        console.error('Tier 3 complete look error:', error);
        container.innerHTML = '<p class="stylique-tier3-empty-note">Styling suggestions could not load right now.</p>';
      }
    }

    window.openStyliqueTier3Login = function() {
      var tier3Advisor = document.getElementById('stylique-tier3-size-advisor');
      if (tier3Advisor) tier3Advisor.style.display = 'none';
      document.getElementById('stylique-tryon-interface').style.display = 'none';
      document.getElementById('stylique-login-required').style.display = 'block';
      scrollToTryOn();
    };

    // Logout from Stylique
    function logoutFromStylique() {
      clearStyliqueSession();
      showLoginScreen('You have been logged out. Please log in to continue.');
      console.log('Logged out from Stylique');
    }

    // Send OTP to email
    async function sendOTP() {
      const email = document.getElementById('stylique-email').value;
      if (!email) {
        showError('Please enter your email address');
        return;
      }

      // Show loading state
      const sendBtn = document.getElementById('stylique-send-otp-btn');
      const sendText = document.getElementById('stylique-send-text');
      const sendSpinner = document.getElementById('stylique-send-spinner');
      const errorDiv = document.getElementById('stylique-login-error');
      const successDiv = document.getElementById('stylique-login-success');

      sendBtn.disabled = true;
      sendText.style.display = 'none';
      sendSpinner.style.display = 'flex';
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            action: 'send_otp'
          })
        });

        const result = await parseStyliqueJsonResponse(response);

        if (response.ok && result.success) {
          // Show success message
          successDiv.textContent = getStyliqueOtpSuccessMessage(result);
          successDiv.style.display = 'block';

          // Store email for verification step
          window.styliqueOptions.pendingEmail = email;

          // Switch to OTP step
          document.getElementById('stylique-email-step').style.display = 'none';
          document.getElementById('stylique-otp-step').style.display = 'block';
          document.getElementById('stylique-email-display').textContent = email;

          // Focus on OTP input
          setTimeout(() => {
            document.getElementById('stylique-otp').focus();
          }, 100);

          console.log('OTP sent successfully to:', email);

        } else {
          // Show error message
          errorDiv.textContent = getStyliqueAuthErrorMessage(result, response);
          errorDiv.style.display = 'block';
        }

      } catch (error) {
        console.error('Send OTP error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        // Reset loading state
        sendBtn.disabled = false;
        sendText.style.display = 'inline';
        sendSpinner.style.display = 'none';
      }
    }

    // Verify OTP code
    async function verifyOTP() {
      const email = window.styliqueOptions.pendingEmail;
      const otp = document.getElementById('stylique-otp').value;

      if (!otp) {
        showError('Please enter the verification code');
        return;
      }

      if (otp.length !== 6) {
        showError('Please enter a valid 6-digit code');
        return;
      }

      // Show loading state
      const verifyBtn = document.getElementById('stylique-verify-btn');
      const verifyText = document.getElementById('stylique-verify-text');
      const verifySpinner = document.getElementById('stylique-verify-spinner');
      const errorDiv = document.getElementById('stylique-login-error');
      const successDiv = document.getElementById('stylique-login-success');

      verifyBtn.disabled = true;
      verifyText.style.display = 'none';
      verifySpinner.style.display = 'flex';
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            otp,
            action: 'verify_otp'
          })
        });

        const result = await parseStyliqueJsonResponse(response);

        if (response.ok && result.success) {
          // Store auth data
          localStorage.setItem('stylique_auth_token', result.token);
          localStorage.setItem('stylique_user', JSON.stringify(result.user));

          // Update state
          window.styliqueOptions.isLoggedIn = true;
          window.styliqueOptions.user = result.user;
          window.styliqueOptions.authToken = result.token;
          window.styliqueOptions.pendingEmail = null;
          window.styliqueOptions.isNewUser = result.isNewUser;

          // Show success message
          successDiv.textContent = result.message || 'Welcome!';
          successDiv.style.display = 'block';

          // Check if new user needs onboarding
          if (result.isNewUser) {
            console.log('New user detected, showing onboarding...');
            setTimeout(() => {
              showOnboardingModal();
            }, 1000);
          } else {
            // Existing user, go directly to try-on interface
            setTimeout(() => {
              showTryOnInterface();
            }, 1500);
          }

          console.log('Stylique authentication successful:', result.user.email, 'isNewUser:', result.isNewUser);

        } else {
          // Show error message
          errorDiv.textContent = getStyliqueAuthErrorMessage(result, response);
          errorDiv.style.display = 'block';
        }

      } catch (error) {
        console.error('Verify OTP error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        // Reset loading state
        verifyBtn.disabled = false;
        verifyText.style.display = 'inline';
        verifySpinner.style.display = 'none';
      }
    }

    // Resend OTP
    async function resendOTP() {
      const email = window.styliqueOptions.pendingEmail;
      if (!email) return;

      // Clear OTP input
      document.getElementById('stylique-otp').value = '';

      // Send OTP again
      await sendOTPForEmail(email);
    }

    // Change email - go back to email step
    function changeEmail() {
      window.styliqueOptions.pendingEmail = null;
      document.getElementById('stylique-otp-step').style.display = 'none';
      document.getElementById('stylique-email-step').style.display = 'block';
      document.getElementById('stylique-otp').value = '';
      document.getElementById('stylique-login-error').style.display = 'none';
      document.getElementById('stylique-login-success').style.display = 'none';
    }

    // Helper function to send OTP for specific email
    async function sendOTPForEmail(email) {
      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            action: 'send_otp'
          })
        });

        const result = await parseStyliqueJsonResponse(response);

        if (response.ok && result.success) {
          const successDiv = document.getElementById('stylique-login-success');
          successDiv.textContent = getStyliqueOtpSuccessMessage(result);
          successDiv.style.display = 'block';
        } else {
          showError(getStyliqueAuthErrorMessage(result, response));
        }

      } catch (error) {
        console.error('Resend OTP error:', error);
        showError('Network error. Please try again.');
      }
    }

    // Helper function to show error
    function showError(message) {
      const errorDiv = document.getElementById('stylique-login-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';

      const successDiv = document.getElementById('stylique-login-success');
      successDiv.style.display = 'none';
    }

    // Show/hide modals
    function showBenefitsModal() {
      document.getElementById('stylique-benefits-modal').style.display = 'flex';
      lockStyliqueBodyScroll('benefits');
    }

    function hideBenefitsModal() {
      document.getElementById('stylique-benefits-modal').style.display = 'none';
      unlockStyliqueBodyScroll('benefits');
    }

    function showResultsModal() {
      // Show inline result instead of modal
      showInlineResult();
    }

    function showInlineResult() {
      const inlineResult = document.getElementById('stylique-inline-result');
      const uploadSection = document.querySelector('.stylique-upload-section');
      const tryonOptions = document.querySelector('.stylique-tryon-options');

      // Hide upload section and show result
      if (uploadSection) uploadSection.style.display = 'none';
      if (tryonOptions) tryonOptions.style.display = 'none';
      if (inlineResult) inlineResult.style.display = 'block';

      // Scroll to result
      inlineResult?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Load recommendations if PRO or ULTIMATE plan and product is available
      const storeStatus = window.styliqueOptions.storeStatus || window.styliqueOptions.stores?.find(s => s.store_id === window.styliqueOptions.storeId);
      const planName = storeStatus?.subscription_name;
      const hasSizeRecommendations = planName === 'PRO' || planName === 'ULTIMATE';
      const product = window.styliqueOptions.currentProduct;

      if (hasSizeRecommendations && product?.id) {
        const recommendationsSection = document.getElementById('stylique-plugin-recommendations');
        if (recommendationsSection) {
          recommendationsSection.style.display = 'block';
          loadSizeRecommendation(product.id, 'stylique-plugin-size-recommendation-content');

          // Also load complete look for ULTIMATE users
          if (planName === 'ULTIMATE') {
            const completeLookSection = document.getElementById('stylique-plugin-complete-look');
            if (completeLookSection) {
              completeLookSection.style.display = 'block';
              loadCompleteLook(product.id, 'stylique-plugin-complete-look-content');
            }
          }
        }
      }
    }

    function hideInlineResult() {
      const inlineResult = document.getElementById('stylique-inline-result');
      const inlineResult3D = document.getElementById('stylique-inline-3d-result');
      const uploadSection = document.querySelector('.stylique-upload-section');
      const tryonOptions = document.querySelector('.stylique-tryon-options');
      const recommendationsSection = document.getElementById('stylique-plugin-recommendations');

      // Show upload section and hide result
      if (inlineResult) inlineResult.style.display = 'none';
      if (inlineResult3D) inlineResult3D.style.display = 'none';
      if (uploadSection) uploadSection.style.display = 'block';
      if (tryonOptions) tryonOptions.style.display = 'block';
      if (recommendationsSection) recommendationsSection.style.display = 'none';
      
      // Clear video content to stop playback
      const container3d = document.getElementById('stylique-3d-inline-container');
      if (container3d) container3d.innerHTML = '';
    }

    function hideResultsModal() {
      // Hide both modal and inline result
      document.getElementById('stylique-results-modal').style.display = 'none';
      hideInlineResult();
    }

    // Processing animation state
    window.styliqueProcessing = {
      progressInterval: null,
      stepInterval: null,
      currentStep: 1,
      currentProgress: 0
    };

    function showProcessingOverlay() {
      const overlay = document.getElementById('stylique-processing-overlay');
      const modalContent = document.querySelector('.stylique-modal-content');
      if (!overlay) return;
      if (modalContent) modalContent.classList.add('stylique-processing-active');
      overlay.classList.remove('is-hiding');
      overlay.style.display = 'flex';
      window.requestAnimationFrame(() => overlay.classList.add('is-active'));
      
      // Reset state
      window.styliqueProcessing.currentStep = 1;
      window.styliqueProcessing.currentProgress = 0;
      
      // Get DOM elements
      const progressFill = document.getElementById('stylique-progress');
      const progressPercent = document.getElementById('stylique-progress-percent');
      
      // Reset progress bar immediately
      if (progressFill) {
        progressFill.style.width = '0%';
      }
      if (progressPercent) {
        progressPercent.textContent = '0%';
      }
      
      // Reset steps
      document.querySelectorAll('.stylique-proc-step').forEach((step, idx) => {
        step.classList.remove('active', 'completed');
        if (idx === 0) step.classList.add('active');
      });
      
      // Reset progress lines
      document.querySelectorAll('.stylique-proc-step-line').forEach(line => {
        line.classList.remove('completed');
      });
      
      // SVG spinner is animated via CSS, no JS needed
      
      // Update percentage text
      window.styliqueProcessing.progressInterval = setInterval(function() {
        window.styliqueProcessing.currentProgress += 2 + Math.random() * 3;
        
        if (window.styliqueProcessing.currentProgress > 90) {
          window.styliqueProcessing.currentProgress = 90;
        }
        
        var progress = window.styliqueProcessing.currentProgress;
        
        var pct = document.getElementById('stylique-progress-percent');
        if (pct) pct.textContent = Math.round(progress) + '%';
        
        // Update steps based on progress
        if (progress >= 35 && window.styliqueProcessing.currentStep < 2) {
          setProcessingStep(2);
        } else if (progress >= 70 && window.styliqueProcessing.currentStep < 3) {
          setProcessingStep(3);
        }
      }, 500);
    }

    function hideProcessingOverlay(onHidden) {
      var overlay = document.getElementById('stylique-processing-overlay');
      var modalContent = document.querySelector('.stylique-modal-content');
      if (!overlay) {
        if (typeof onHidden === 'function') onHidden();
        return;
      }
      
      // Complete progress to 100% before hiding
      var progressPercent = document.getElementById('stylique-progress-percent');
      if (progressPercent) progressPercent.textContent = '100%';
      
      // Clear all intervals
      if (window.styliqueProcessing.progressInterval) {
        clearInterval(window.styliqueProcessing.progressInterval);
        window.styliqueProcessing.progressInterval = null;
      }
      if (window.styliqueProcessing.loadingInterval) {
        clearInterval(window.styliqueProcessing.loadingInterval);
        window.styliqueProcessing.loadingInterval = null;
      }
      if (window.styliqueProcessing.stepInterval) {
        clearInterval(window.styliqueProcessing.stepInterval);
        window.styliqueProcessing.stepInterval = null;
      }
      
      overlay.classList.remove('is-active');
      overlay.classList.add('is-hiding');

      // Hide overlay after brief delay to show 100%
      setTimeout(function() {
        overlay.style.display = 'none';
        overlay.classList.remove('is-hiding');
        if (modalContent) modalContent.classList.remove('stylique-processing-active');
        if (typeof onHidden === 'function') onHidden();
      }, 300);
    }

    function setProcessingStep(step) {
      window.styliqueProcessing.currentStep = Math.min(step, 3);
      
      const steps = document.querySelectorAll('.stylique-proc-step');
      const lines = document.querySelectorAll('.stylique-proc-step-line');
      const statusText = document.getElementById('stylique-processing-text');
      const titleEl = document.getElementById('stylique-processing-title');
      
      const stepTexts = [
        { title: 'Analyzing Your Photo', status: 'Detecting body pose and proportions...' },
        { title: 'Styling the Garment', status: 'Fitting the clothing to your body...' },
        { title: 'Rendering Your Look', status: 'Creating your personalized try-on...' }
      ];
      
      steps.forEach((stepEl, idx) => {
        stepEl.classList.remove('active', 'completed');
        if (idx < step - 1) {
          stepEl.classList.add('completed');
        } else if (idx === step - 1) {
          stepEl.classList.add('active');
        }
      });
      
      lines.forEach((line, idx) => {
        line.classList.remove('completed');
        if (idx < step - 1) {
          line.classList.add('completed');
        }
      });
      
      if (statusText && stepTexts[step - 1]) {
        statusText.textContent = stepTexts[step - 1].status;
      }
      if (titleEl && stepTexts[step - 1]) {
        titleEl.textContent = stepTexts[step - 1].title;
      }
    }

    // Kept for backwards compatibility but no longer used
    function updateProcessingProgress(percent) {
      // No longer needed - progress is managed internally
    }

    // File handling
    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image file is too large. Please choose a file under 10MB.');
        return;
      }

      window.styliqueOptions.selectedImage = file;

      // Show preview
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('stylique-preview-img').src = e.target.result;
        document.getElementById('stylique-image-preview').style.display = 'block';
        
        // Hide the upload area after image is selected
        var uploadSection = document.querySelector('.stylique-upload-section');
        if (uploadSection) uploadSection.style.display = 'none';
        
        // Enable try-on buttons when image is selected
        const start2DButton = document.getElementById('stylique-start-2d-tryon');
        const start3DButton = document.getElementById('stylique-start-3d-tryon');
        if (start2DButton) start2DButton.disabled = false;
        if (start3DButton) start3DButton.disabled = false;

        // Recommendations will be loaded after try-on completes when product is identified
        // Don't load here as we don't have the product yet
      };
      reader.readAsDataURL(file);

      console.log('Image selected:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // 2D Virtual try-on process
    async function start2DTryOn() {
      if (!requireLogin('Please log in to start your virtual try-on.')) return;
      if (!window.styliqueOptions.selectedImage) {
        alert('Please select a full-body image first.');
        return;
      }

      // Check quota/plan
      const remaining = Math.max(0, window.styliqueOptions.tryonsQuota - window.styliqueOptions.tryonsUsed);
      if (!window.styliqueOptions.planActive || remaining <= 0) {
        alert('Your store has no remaining try-on quota or plan is inactive.');
        return;
      }

      showProcessingOverlay();

      const processingTexts = [
        'Analyzing your photo...',
        'Finding the perfect fit...',
        'Applying virtual garment...',
        'Adding final touches...'
      ];

      let textIndex = 0;
      const textInterval = setInterval(() => {
        document.getElementById('stylique-processing-text').textContent = processingTexts[textIndex];
        textIndex = (textIndex + 1) % processingTexts.length;
      }, 3000);

      // Declare variables outside try block so they're accessible in catch
      let clientTimeout;
      let progressInterval;
      let timeoutId;

      try {
        // Prepare FormData for the API call
        const formData = new FormData();
        formData.append('storeId', window.styliqueOptions.storeId);
        formData.append('currentUrl', window.styliqueOptions.currentUrl);
        formData.append('userImage', window.styliqueOptions.selectedImage);
        formData.append('garmentType', 'upper_body');

        // Debug: log currentProduct state
        console.log('DEBUG: currentProduct exists?', !!window.styliqueOptions.currentProduct);
        console.log('DEBUG: currentProduct=', window.styliqueOptions.currentProduct);
        console.log('DEBUG: currentProduct.id=', window.styliqueOptions.currentProduct?.id);

        // Add product ID (inventory UUID for backend tracking)
        if (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.id) {
          formData.append('product_id', window.styliqueOptions.currentProduct.id);
          console.log('Product ID added to try-on request:', window.styliqueOptions.currentProduct.id);
        } else {
          console.log('WARN: Could not add product_id - currentProduct or id missing');
        }

        // Add product image URL (from carousel selection or fallback to product image)
        const carouselImage = StyleiqueCarousel.getCurrentImage();
        if (carouselImage) {
          formData.append('productImageUrl', carouselImage);
          console.log('Carousel image selected:', carouselImage);
        } else if (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.tryon_image_url) {
          formData.append('productImageUrl', window.styliqueOptions.currentProduct.tryon_image_url);
          console.log('Using product tryon_image_url:', window.styliqueOptions.currentProduct.tryon_image_url);
        } else if (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.image_url) {
          formData.append('productImageUrl', window.styliqueOptions.currentProduct.image_url);
          console.log('Using product image_url:', window.styliqueOptions.currentProduct.image_url);
        }

        // Add user authentication
        if (window.styliqueOptions.user && window.styliqueOptions.user.id) {
          formData.append('userId', window.styliqueOptions.user.id);
        }

        console.log('Sending try-on request to embed API...');
        console.log('User ID:', window.styliqueOptions.user?.id);

        // Progress is now managed by showProcessingOverlay()

        // Add client-side timeout warning
        clientTimeout = setTimeout(() => {
          document.getElementById('stylique-processing-text').textContent = 'This is taking longer than usual... Please wait.';
        }, 45000); // 45 seconds

        // Call the embedded try-on API with timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        // Add request debugging
        console.log('📤 Sending request to:', STYLIQUE_API_BASE + '/api/plugin/embed-tryon-2d');
        console.log('📋 FormData contents:', {
          storeId: formData.get('storeId'),
          currentUrl: formData.get('currentUrl'),
          userImageSize: formData.get('userImage')?.size,
          garmentType: formData.get('garmentType'),
          userId: formData.get('userId')
        });

        try {
          const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/embed-tryon-2d', {
            method: 'POST',
            body: formData,
            headers: {
              'X-Current-URL': window.styliqueOptions.currentUrl
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log('📥 Response received:', response.status, response.statusText);
          console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Try-on service unavailable (${response.status})`);
          }

          const result = await response.json();
          console.log('Try-on result:', result);
          console.log('Result success?', result.success, 'Has image?', !!result.resultImage);

          if (result.success && result.resultImage) {
            console.log('✅ SUCCESS: Proceeding to show result view...');
            // Complete progress
            clearInterval(progressInterval);
            clearTimeout(clientTimeout);
            // Progress is completed by hideProcessingOverlay()

            // Wait a moment before showing result
            setTimeout(() => {
              console.log('⏱️ Inside setTimeout - about to show result view');
              // Show the actual try-on result (both modal and inline)
              const resultImage = document.getElementById('stylique-result-image');
              const inlineResultImage = document.getElementById('stylique-inline-result-img');
              if (resultImage) resultImage.src = result.resultImage;
              if (inlineResultImage) inlineResultImage.src = result.resultImage;

              // Store product info for potential purchase
              window.styliqueOptions.currentProduct = result.product;

              // Load recommendations in plugin interface after 2D try-on completes
              const storeStatus = window.styliqueOptions.storeStatus || window.styliqueOptions.stores?.find(s => s.store_id === window.styliqueOptions.storeId);
              const planName = storeStatus?.subscription_name;
              const hasSizeRecommendations = planName === 'PRO' || planName === 'ULTIMATE';
              console.log('📊 Checking recommendations eligibility:', {
                planName: planName,
                hasSizeRecommendations: hasSizeRecommendations,
                hasProduct: !!result.product?.id,
                productId: result.product?.id
              });

              if (hasSizeRecommendations && result.product?.id) {
                console.log('📊 Loading recommendations for product:', result.product.id);
                const recommendationsSection = document.getElementById('stylique-plugin-recommendations');
                if (recommendationsSection) {
                  recommendationsSection.style.display = 'block';
                  console.log('✅ Recommendations section shown');
                  // Load recommendations with product from try-on result
                  loadSizeRecommendation(result.product.id, 'stylique-plugin-size-recommendation-content');

                  // Load complete look for ULTIMATE users
                  if (planName === 'ULTIMATE') {
                    const completeLookSection = document.getElementById('stylique-plugin-complete-look');
                    if (completeLookSection) {
                      completeLookSection.style.display = 'block';
                      loadCompleteLook(result.product.id, 'stylique-plugin-complete-look-content');
                    }
                  }
                } else {
                  console.warn('⚠️ Recommendations section element not found');
                }
              } else {
                console.log('⚠️ Recommendations not shown:', {
                  hasSizeRecommendations: hasSizeRecommendations,
                  hasProduct: !!result.product?.id
                });
              }

              // Fire analytics and consume try-on
              consumeTryonAndTrack('2d', result.product?.id).catch(() => { });

              clearInterval(textInterval);
              hideProcessingOverlay(() => {
                // Show the premium full-widget result view after the processing sheet fades.
                showResultView(result.resultImage, result.product?.id);
              });
              // Don't show result modal - result is now inline in the upload area
              // showResultsModal() removed - result displays inline instead
            }, 800);
          } else {
            console.error('❌ RESULT VALIDATION FAILED:');
            console.error('  success:', result.success);
            console.error('  resultImage:', result.resultImage);
            console.error('  Full result object:', result);
            throw new Error(result.error || 'Try-on processing failed');
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Try-on request timed out after 2 minutes. Please try again with a smaller image or contact support if the issue persists.');
          }
          throw fetchError;
        }

      } catch (error) {
        console.error('Try-on error:', error);
        clearInterval(textInterval);
        clearTimeout(clientTimeout);
        hideProcessingOverlay();
        alert('Try-on failed: ' + error.message);
      }
    }

    // Fetch garment image from product
    async function fetchGarmentImage(productImageUrl) {
      try {
        const response = await fetch(productImageUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch garment image');
        }
        const blob = await response.blob();
        return new File([blob], 'garment-image.jpg', { type: 'image/jpeg' });
      } catch (error) {
        console.error('Error fetching garment image:', error);
        throw error;
      }
    }

    // 3D Virtual try-on process
    async function start3DTryOn() {
      if (!requireLogin('Please log in to start your virtual try-on.')) return;
      if (!window.styliqueOptions.selectedImage) {
        alert('Please select a full-body image first.');
        return;
      }

      // Gate: only ULTIMATE and active with quota
      const plan = window.styliqueOptions.storePlan;
      const active = window.styliqueOptions.planActive;
      const remaining = Math.max(0, window.styliqueOptions.tryonsQuota - window.styliqueOptions.tryonsUsed);
      if (!(plan === 'ULTIMATE' && active && remaining > 0)) {
        alert('3D Try-On is available only for ULTIMATE plan with active subscription and remaining quota.');
        return;
      }

      showProcessingOverlay();

      const processingTexts = [
        'Preparing 3D environment...',
        'Analyzing body posture...',
        'Generating 360° preview...',
        'Compiling assets...',
        'Finalizing your virtual try-on...'
      ];

      let textIndex = 0;
      const textInterval = setInterval(() => {
        document.getElementById('stylique-processing-text').textContent = processingTexts[textIndex];
        textIndex = (textIndex + 1) % processingTexts.length;
      }, 4000);

      // Declare variables outside try block
      let clientTimeout;
      let progressInterval;
      
      try {
        // Prepare FormData
        const formData = new FormData();
        formData.append('storeId', window.styliqueOptions.storeId);
        formData.append('userImage', window.styliqueOptions.selectedImage);
        formData.append('userId', window.styliqueOptions.user?.id || '');
        
        // Add product image URL (from carousel selection or fallback to product image)
        const carouselImage = StyleiqueCarousel.getCurrentImage();
        if (carouselImage) {
          formData.append('productImageUrl', carouselImage);
          console.log('3D: Carousel image selected:', carouselImage);
        } else if (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.tryon_image_url) {
          formData.append('productImageUrl', window.styliqueOptions.currentProduct.tryon_image_url);
          console.log('3D: Using product tryon_image_url:', window.styliqueOptions.currentProduct.tryon_image_url);
        } else if (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.image_url) {
          formData.append('productImageUrl', window.styliqueOptions.currentProduct.image_url);
          console.log('3D: Using product image_url:', window.styliqueOptions.currentProduct.image_url);
        }
        
        // Pass current product ID if available
        if (window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.id) {
           formData.append('productId', window.styliqueOptions.currentProduct.id);
        }

        console.log('Sending 3D try-on request to embed API...');

        // Client-side timeout warning
        clientTimeout = setTimeout(() => {
          document.getElementById('stylique-processing-text').textContent = 'Generating high-quality 3D video... Please wait.';
        }, 30000); 

        // 1. Start Generation
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/embed-tryon-3d', {
            method: 'POST',
            body: formData,
            headers: {
              'X-Current-URL': window.styliqueOptions.currentUrl
            }
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
        const pollInterval = setInterval(async () => {
             try {
                 const statusResp = await styFetch(`${STYLIQUE_API_BASE}/api/plugin/embed-tryon-3d?operationName=${encodeURIComponent(operationName)}`);
                 const statusData = await statusResp.json();
                 
                 if (statusData.done && statusData.videoUrl) {
                      // Success!
                      clearInterval(pollInterval);
                      clearInterval(textInterval);
                      clearTimeout(clientTimeout);

                      const videoUrl = statusData.videoUrl;
                      
                      // Show Result
                      show3DVideoResult(videoUrl);

                      // Fire analytics and consume try-on
                      const productId3d = data.product?.id || window.styliqueOptions.currentProduct?.id || null;
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
                 alert('Error during 3D generation: ' + pollErr.message);
             }
        }, 5000); // Check every 5s

      } catch (error) {
        console.error('3D try-on error:', error);
        clearInterval(textInterval);
        clearTimeout(clientTimeout);
        hideProcessingOverlay();
        alert('3D try-on failed: ' + error.message);
      }
    }


    function show3DVideoResult(videoUrl) {
      const inlineResult3D = document.getElementById('stylique-inline-3d-result');
      const container = document.getElementById('stylique-3d-inline-container');
      const uploadSection = document.querySelector('.stylique-upload-section');
      const tryonOptions = document.querySelector('.stylique-tryon-options');
      
      if (!inlineResult3D || !container) {
          console.error("3D Inline result container not found");
          return;
      }

      // Hide upload and options
      if (uploadSection) uploadSection.style.display = 'none';
      if (tryonOptions) tryonOptions.style.display = 'none';
      
      // Also hide 2D result if it happens to be open
      const inlineResult2D = document.getElementById('stylique-inline-result');
      if (inlineResult2D) inlineResult2D.style.display = 'none';
      
      // Clear previous content
      container.innerHTML = '';
      
      // Create video element
      const video = document.createElement('video');
      video.src = videoUrl;
      video.autoplay = true;
      video.loop = true;
      video.muted = true; // Always mute as requested
      video.playsInline = true;
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '600px'; // Reasonable height limit
      video.style.objectFit = 'contain';
      video.style.borderRadius = '8px';
      
      container.appendChild(video);
      
      // Show 3D result container
      inlineResult3D.style.display = 'block';
      inlineResult3D.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Trigger size recommendation if ULTIMATE (Reuse logic from 2D result)
      const storeStatus = window.styliqueOptions.storeStatus || window.styliqueOptions.stores?.find(s => s.store_id === window.styliqueOptions.storeId);
      const planName = storeStatus?.subscription_name;
      const hasSizeRecommendations = planName === 'PRO' || planName === 'ULTIMATE';
      const productId = window.styliqueOptions.currentProduct?.id;

      if (hasSizeRecommendations && productId) {
          console.log('📊 Loading recommendations for product (3D):', productId);
          const recommendationsSection = document.getElementById('stylique-plugin-recommendations');
          if (recommendationsSection) {
              recommendationsSection.style.display = 'block';
              loadSizeRecommendation(productId, 'stylique-plugin-size-recommendation-content');
          }
      }
    }

    async function consumeTryonAndTrack(type, productId) {
      try {
        // Analytics
        try {
          console.log('📊 Sending analytics:', { type, productId, storeId: window.styliqueOptions.storeId });
          const analyticsPayload = {
            storeId: window.styliqueOptions.storeId,
            tryonType: type,
            currentUrl: window.styliqueOptions.currentUrl,
            userId: window.styliqueOptions.user?.id || null,
            productId: productId ? String(productId) : null
          };
          console.log('📊 Analytics payload:', analyticsPayload);

          let respA = await styFetch(STYLIQUE_API_BASE + '/api/plugin/tryon-analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analyticsPayload)
          });
          console.log('📊 Analytics response status:', respA.status);

          if (respA.status === 405) {
            const qs = new URLSearchParams({
              storeId: String(window.styliqueOptions.storeId || ''),
              tryonType: String(type || ''),
              currentUrl: String(window.styliqueOptions.currentUrl || ''),
              userId: String(window.styliqueOptions.user?.id || ''),
              productId: productId ? String(productId) : ''
            }).toString();
            console.log('📊 Falling back to GET with query:', qs);
            // Fallback to GET if POST is not allowed
            await styFetch(STYLIQUE_API_BASE + '/api/plugin/tryon-analytics?' + qs, { method: 'GET' });
          } else if (respA.ok) {
            const analyticsResult = await respA.json().catch(() => null);
            console.log('📊 Analytics result:', analyticsResult);
          }
        } catch (analyticsError) {
          console.error('📊 Analytics error:', analyticsError);
        }

        // Consume try-on quota
        let resp = await styFetch(STYLIQUE_API_BASE + '/api/plugin/consume-tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: window.styliqueOptions.storeId, tryonType: type })
        });
        if (resp.status === 405) {
          const qs2 = new URLSearchParams({
            storeId: String(window.styliqueOptions.storeId || ''),
            tryonType: String(type || '')
          }).toString();
          // Fallback to GET if POST is not allowed
          resp = await styFetch(STYLIQUE_API_BASE + '/api/plugin/consume-tryon?' + qs2, { method: 'GET' });
        }
        const json = await resp.json().catch(() => ({ success: false }));
        if (json && json.success) {
          // Update local counters
          window.styliqueOptions.tryonsUsed = (window.styliqueOptions.tryonsUsed || 0) + 1;
          updatePlanNote();
          updateTryOnButtonsState();
        } else {
          console.warn('Consume try-on failed');
        }
      } catch (e) {
        console.warn('consumeTryonAndTrack error', e);
      }
    }

    // Show 3D result
    function show3DResult(result) {
      // Check if store has ULTIMATE plan
      const storeStatus = window.styliqueOptions.storeStatus || window.styliqueOptions.stores?.find(s => s.store_id === window.styliqueOptions.storeId);
      const isUltimate = storeStatus?.subscription_name === 'ULTIMATE';
      console.log('📊 show3DResult - Checking ULTIMATE plan:', {
        isUltimate: isUltimate,
        storeStatus: storeStatus,
        hasProduct: !!result.product?.id
      });

      // Create a 3D result modal similar to the 2D one but with 3D viewer
      const modal = document.createElement('div');
      modal.id = 'stylique-3d-results-modal';
      modal.className = 'stylique-modal';
      modal.style.display = 'flex';

      modal.innerHTML = `
      <div class="stylique-modal-backdrop" onclick="hide3DResultsModal()"></div>
      <div class="stylique-modal-content stylique-3d-results-modal-content">
        <div class="stylique-modal-header">
          <h4>Your 3D Virtual Try-On Result</h4>
          <button onclick="hide3DResultsModal()" class="stylique-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="stylique-3d-results-content">
          <div class="stylique-3d-result-container">
            <div class="stylique-3d-viewer" id="stylique-3d-viewer">
              <div class="stylique-3d-loading">
                <div class="stylique-spinner"></div>
                <p>Loading 3D model...</p>
              </div>
            </div>
            <div class="stylique-result-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              3D Virtual Try-On Complete
            </div>
          </div>
          <div class="stylique-result-actions">
            <button class="stylique-btn-secondary" onclick="resetTryOn()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              Try Again
            </button>
            <button class="stylique-btn-primary" onclick="addToCart()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Add to Cart
            </button>
          </div>
          ${isUltimate ? `
          
          <div class="stylique-size-recommendation-section" id="stylique-size-recommendation-section">
            <div class="stylique-section-header">
              <h5>AI Size Recommendation</h5>
              <div class="stylique-ai-badge">AI Powered</div>
            </div>
            <div class="stylique-size-recommendation-content" id="stylique-size-recommendation-content">
              <div class="stylique-loading-state">
                <div class="stylique-spinner-small"></div>
                <p>Analyzing your size...</p>
              </div>
            </div>
          </div>
          
          
          <div class="stylique-complete-look-section" id="stylique-complete-look-section">
            <div class="stylique-section-header">
              <h5>Complete the Look</h5>
              <div class="stylique-ai-badge">AI Styling</div>
            </div>
            <div class="stylique-complete-look-content" id="stylique-complete-look-content">
              <div class="stylique-loading-state">
                <div class="stylique-spinner-small"></div>
                <p>Finding perfect matches...</p>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

      document.body.appendChild(modal);
      lockStyliqueBodyScroll('3d');

      // Load the 3D model
      load3DModel(result.threeDModelUrl);

      // Load size recommendation and complete look if ULTIMATE
      if (isUltimate && result.product?.id) {
        loadSizeRecommendation(result.product.id);
        loadCompleteLook(result.product.id);
      }
    }

    // Load 3D model in the viewer
    function load3DModel(modelUrl) {
      const viewer = document.getElementById('stylique-3d-viewer');
      if (!viewer) return;

      // Create a proper 3D viewer with Three.js
      viewer.innerHTML = `
      <div class="stylique-3d-viewer-container">
        <div class="stylique-3d-controls">
          <div class="stylique-3d-control-group">
            <button class="stylique-3d-control-btn" onclick="rotate3DModel()" title="Auto Rotate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button class="stylique-3d-control-btn" onclick="reset3DView()" title="Reset View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
            <button class="stylique-3d-control-btn" onclick="zoomIn3D()" title="Zoom In">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button class="stylique-3d-control-btn" onclick="zoomOut3D()" title="Zoom Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button class="stylique-3d-control-btn" onclick="toggleFullscreen3D()" title="Fullscreen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
            <button class="stylique-3d-control-btn" onclick="download3DModel('${modelUrl}')" title="Download Model">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="stylique-3d-canvas-container">
          <canvas id="stylique-3d-canvas"></canvas>
          <div class="stylique-3d-loading-overlay" id="stylique-3d-loading">
            <div class="stylique-spinner"></div>
            <p class="stylique-3d-progress-text">Loading 3D model...</p>
            <div class="stylique-3d-progress-container">
              <div class="stylique-3d-progress-bar"></div>
            </div>
          </div>
        </div>
        <div class="stylique-3d-instructions">
          <p><strong>Controls:</strong> Drag to rotate • Scroll to zoom • Right-click to pan</p>
        </div>
      </div>
    `;

      // Initialize Three.js 3D viewer
      initialize3DViewer(modelUrl);
    }

    // Initialize Three.js 3D viewer
    function initialize3DViewer(modelUrl) {
      // Check if Three.js is available
      if (typeof THREE === 'undefined') {
        // Load Three.js and required modules dynamically
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        threeScript.onload = () => {
          // Load OrbitControls
          const controlsScript = document.createElement('script');
          controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
          controlsScript.onload = () => {
            // Load OBJLoader
            const objLoaderScript = document.createElement('script');
            objLoaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js';
            objLoaderScript.onload = () => {
              loadThreeJSModel(modelUrl);
            };
            document.head.appendChild(objLoaderScript);
          };
          document.head.appendChild(controlsScript);
        };
        document.head.appendChild(threeScript);
      } else {
        loadThreeJSModel(modelUrl);
      }
    }

    // Global 3D viewer state
    window.stylique3DViewer = {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      model: null,
      autoRotate: false,
      initialCameraPosition: null,
      initialTarget: null,
      animationId: null
    };

    // Load 3D model with Three.js
    function loadThreeJSModel(modelUrl) {
      const canvas = document.getElementById('stylique-3d-canvas');
      const loading = document.getElementById('stylique-3d-loading');

      if (!canvas) return;

      // Scene setup with gradient background
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });

      renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create gradient background
      const gradientTexture = createGradientTexture();
      scene.background = gradientTexture;

      renderer.shadowMap.enabled = false; // Disable shadows to preserve original colors
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.NoToneMapping; // Disable tone mapping to preserve original colors

      // Minimal lighting setup to preserve original colors - just enough to see details
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // Single main directional light - minimal intensity
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
      mainLight.position.set(5, 8, 5);
      mainLight.castShadow = false; // Disable shadows to preserve colors
      scene.add(mainLight);

      // Enhanced controls
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 1.5;
      controls.maxDistance = 10;
      controls.enablePan = true;
      controls.panSpeed = 0.8;
      controls.rotateSpeed = 0.8;
      controls.zoomSpeed = 1.2;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 2.0;

      // Store references globally
      window.stylique3DViewer.scene = scene;
      window.stylique3DViewer.camera = camera;
      window.stylique3DViewer.renderer = renderer;
      window.stylique3DViewer.controls = controls;

      // Update progress indicator
      function updateProgress(percent) {
        if (loading) {
          const progressBar = loading.querySelector('.stylique-3d-progress-bar');
          if (progressBar) {
            progressBar.style.width = percent + '%';
          }
          const progressText = loading.querySelector('.stylique-3d-progress-text');
          if (progressText) {
            progressText.textContent = `Loading... ${Math.round(percent)}%`;
          }
        }
      }

      // Load OBJ model
      const loader = new THREE.OBJLoader();
      loader.load(
        modelUrl,
        function (object) {
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2.5 / maxDim;

          object.scale.setScalar(scale);
          object.position.sub(center.multiplyScalar(scale));

          // Enhanced material handling - preserve original colors from OBJ
          object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
              // Check if geometry has vertex colors
              const hasVertexColors = child.geometry && child.geometry.attributes && child.geometry.attributes.color;

              if (hasVertexColors) {
                // If vertex colors exist, use them and don't override with material color
                child.geometry.attributes.color.needsUpdate = true;
                // Use MeshPhongMaterial which preserves vertex colors better
                child.material = new THREE.MeshPhongMaterial({
                  vertexColors: true, // Use vertex colors instead of material color
                  shininess: 30,
                  flatShading: false
                });
              } else if (child.material) {
                // If material exists, preserve its color and properties
                const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xcccccc);
                const originalMap = child.material.map; // Preserve texture if exists

                // Use MeshPhongMaterial which preserves colors better than StandardMaterial
                child.material = new THREE.MeshPhongMaterial({
                  color: originalColor,
                  map: originalMap, // Preserve texture
                  shininess: 30,
                  flatShading: false
                });
              } else {
                // Only create default material if none exists and no vertex colors
                child.material = new THREE.MeshPhongMaterial({
                  color: 0xcccccc,
                  shininess: 30,
                  flatShading: false
                });
              }
              // Shadows disabled to preserve original colors
            }
          });

          scene.add(object);
          window.stylique3DViewer.model = object;

          // Position camera with better initial view
          const distance = maxDim * 1.5;
          camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
          controls.target.set(0, 0, 0);
          controls.update();

          // Store initial camera position for reset
          window.stylique3DViewer.initialCameraPosition = camera.position.clone();
          window.stylique3DViewer.initialTarget = controls.target.clone();

          // Hide loading with fade
          if (loading) {
            loading.style.opacity = '0';
            loading.style.transition = 'opacity 0.5s';
            setTimeout(() => {
              loading.style.display = 'none';
            }, 500);
          }

          // Enhanced animation loop
          function animate() {
            window.stylique3DViewer.animationId = requestAnimationFrame(animate);

            // Update auto-rotate
            if (window.stylique3DViewer.autoRotate) {
              controls.autoRotate = true;
            } else {
              controls.autoRotate = false;
            }

            controls.update();
            renderer.render(scene, camera);
          }
          animate();

          // Handle window resize
          const handleResize = () => {
            const rect = canvas.getBoundingClientRect();
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
            renderer.setSize(rect.width, rect.height);
          };
          window.addEventListener('resize', handleResize);

          // Store resize handler for cleanup
          window.stylique3DViewer.handleResize = handleResize;
        },
        function (progress) {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            updateProgress(percent);
          }
        },
        function (error) {
          console.error('Error loading 3D model:', error);
          if (loading) {
            loading.innerHTML = `
            <div class="stylique-3d-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <p>Failed to load 3D model</p>
              <button onclick="download3DModel('${modelUrl}')" class="stylique-btn-secondary">
                Download Model Instead
              </button>
            </div>
          `;
          }
        }
      );
    }

    // Create gradient background texture
    function createGradientTexture() {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');

      const gradient = context.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, '#f8f9fa');
      gradient.addColorStop(0.5, '#e9ecef');
      gradient.addColorStop(1, '#dee2e6');

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    // 3D viewer control functions
    function rotate3DModel() {
      if (!window.stylique3DViewer.controls) return;

      window.stylique3DViewer.autoRotate = !window.stylique3DViewer.autoRotate;
      const btn = document.querySelector('.stylique-3d-control-btn[onclick*="rotate3DModel"]');
      if (btn) {
        if (window.stylique3DViewer.autoRotate) {
          btn.classList.add('active');
          btn.title = 'Stop Auto Rotate';
        } else {
          btn.classList.remove('active');
          btn.title = 'Auto Rotate';
        }
      }
    }

    function reset3DView() {
      if (!window.stylique3DViewer.camera || !window.stylique3DViewer.controls) return;

      const viewer = window.stylique3DViewer;
      if (viewer.initialCameraPosition && viewer.initialTarget) {
        // Smooth transition to initial position
        const startPos = viewer.camera.position.clone();
        const startTarget = viewer.controls.target.clone();
        const endPos = viewer.initialCameraPosition.clone();
        const endTarget = viewer.initialTarget.clone();

        let progress = 0;
        const duration = 1000; // 1 second
        const startTime = Date.now();

        function animateReset() {
          const elapsed = Date.now() - startTime;
          progress = Math.min(elapsed / duration, 1);

          // Easing function (ease-out)
          const eased = 1 - Math.pow(1 - progress, 3);

          viewer.camera.position.lerpVectors(startPos, endPos, eased);
          viewer.controls.target.lerpVectors(startTarget, endTarget, eased);
          viewer.controls.update();

          if (progress < 1) {
            requestAnimationFrame(animateReset);
          }
        }
        animateReset();
      }
    }

    function zoomIn3D() {
      if (!window.stylique3DViewer.camera || !window.stylique3DViewer.controls) return;
      const distance = window.stylique3DViewer.camera.position.distanceTo(window.stylique3DViewer.controls.target);
      const newDistance = Math.max(distance * 0.8, 1.5);
      const direction = new THREE.Vector3()
        .subVectors(window.stylique3DViewer.camera.position, window.stylique3DViewer.controls.target)
        .normalize();
      const targetPos = window.stylique3DViewer.controls.target.clone().add(direction.multiplyScalar(newDistance));
      window.stylique3DViewer.camera.position.lerp(targetPos, 0.3);
      window.stylique3DViewer.controls.update();
    }

    function zoomOut3D() {
      if (!window.stylique3DViewer.camera || !window.stylique3DViewer.controls) return;
      const distance = window.stylique3DViewer.camera.position.distanceTo(window.stylique3DViewer.controls.target);
      const newDistance = Math.min(distance * 1.25, 10);
      const direction = new THREE.Vector3()
        .subVectors(window.stylique3DViewer.camera.position, window.stylique3DViewer.controls.target)
        .normalize();
      const targetPos = window.stylique3DViewer.controls.target.clone().add(direction.multiplyScalar(newDistance));
      window.stylique3DViewer.camera.position.lerp(targetPos, 0.3);
      window.stylique3DViewer.controls.update();
    }

    function toggleFullscreen3D() {
      const container = document.querySelector('.stylique-3d-viewer-container');
      if (!container) return;

      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          console.log('Error attempting to enable fullscreen:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }

    function download3DModel(modelUrl) {
      const link = document.createElement('a');
      link.href = modelUrl;
      link.download = '3d-tryon-model.obj';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Load size recommendation
    async function loadSizeRecommendation(productId, containerId = 'stylique-size-recommendation-content') {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('Stylique size-rec: container not found:', containerId);
        return;
      }

      const userId = window.styliqueOptions.user?.id;
      if (!userId) {
        console.log('Stylique size-rec: skipped — no user ID (not logged in)');
        return;
      }

      // Prefer the inventory UUID resolved from check-product; fall back to the
      // Shopify numeric ID passed as argument (the backend will try both).
      const resolvedProductId = window.styliqueOptions.productUuid || productId;

      const payload = {
        storeId: window.styliqueOptions.storeId,
        productId: resolvedProductId,
        userId: userId,
        currentUrl: window.styliqueOptions.currentUrl
      };

      console.log('=== Stylique Size Recommendation Request ===');
      console.log('Endpoint:', STYLIQUE_API_BASE + '/api/plugin/size-recommendation');
      console.log('productId (resolved):', resolvedProductId);
      console.log('productId (original):', productId);
      console.log('productUuid:', window.styliqueOptions.productUuid);
      console.log('userId:', userId);

      try {
        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/size-recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('📊 Size recommendation response:', data);

        if (data.success && data.recommendation) {
          const rec = data.recommendation;
          const bestFit = rec.bestFit || 'N/A';
          const oversized = rec.oversized || null;
          const confidence = rec.confidence || 0;
          const bestFitNote = rec.bestFitNote || '';
          const oversizedNote = rec.oversizedNote || '';
          const sizeChart = rec.sizeChart || [];
          const userM = rec.userMeasurements || {};




          const fitFeel = rec.fitFeel || {};
          const sizeUpDownInfo = rec.sizeUpDownInfo || {};
          
          const allowedKeys = ['chest', 'waist', 'shoulder', 'length', 'sleeve'];
          const labelMap = { chest: 'Chest', waist: 'Waist', shoulder: 'Shoulder', length: 'Length', sleeve: 'Sleeve' };
          const userKeyMap = { chest: 'chest', waist: 'waist', shoulder: 'shoulder', length: 'length', sleeve: 'sleeve' };

          // HTML Builders
          const bestSizeData = sizeChart.find(s => s.size === bestFit || s.size.toUpperCase() === bestFit.toUpperCase());
          
          const valExtractor = (data, key) => {
            if (!data || !data.measurements) return null;
            const m = data.measurements;
            
            // The API might return measurements as nested objects { value: number, unit: string } 
            // OR as direct numbers depending on the schema version. Handle both.
            const extractVal = (val) => {
               if (val === null || val === undefined) return null;
               if (typeof val === 'object' && val.value !== undefined) return val.value;
               return val;
            };

            const directVal = extractVal(m[key]);
            if (directVal != null) return directVal;
            
            const widthVal = extractVal(m.width);
            if (key === 'chest' && widthVal != null) return widthVal * 2;
            if (key === 'waist' && widthVal != null) return widthVal * 2; // Rough fallback if waist missing
            
            return null;
          };

          // Gather sizes to display in table
          const tableSizes = [];
          if (sizeUpDownInfo.sizeDown && sizeUpDownInfo.sizeDown.size) {
            tableSizes.push({ title: sizeUpDownInfo.sizeDown.size, data: sizeChart.find(s => s.size.toUpperCase() === sizeUpDownInfo.sizeDown.size.toUpperCase()) });
          }
          tableSizes.push({ title: bestFit, data: bestSizeData, isBest: true });
          if (sizeUpDownInfo.sizeUp && sizeUpDownInfo.sizeUp.size) {
            tableSizes.push({ title: sizeUpDownInfo.sizeUp.size, data: sizeChart.find(s => s.size.toUpperCase() === sizeUpDownInfo.sizeUp.size.toUpperCase()) });
          }

          // Fit Breakdown List
          const activeKeys = allowedKeys.filter(k => fitFeel[k]);
          let fitBreakdownHtml = '';
          if (activeKeys.length > 0) {
            fitBreakdownHtml = `<div class="stylique-section-spacing">
              <p class="stylique-section-title">Fit Breakdown</p>
              <div class="stylique-fit-list-container">`;
            
            activeKeys.forEach(key => {
              const feelText = fitFeel[key];
              let dotClass = 'stylique-dot-neutral';
              const lowerFeel = feelText.toLowerCase();
              if (lowerFeel.includes('comfortable') || lowerFeel.includes('true') || lowerFeel.includes('perfect') || lowerFeel.includes('good') || lowerFeel.includes('ideal')) {
                  dotClass = 'stylique-dot-good';
              } else if (lowerFeel.includes('tight') || lowerFeel.includes('short')) {
                  dotClass = 'stylique-dot-bad';
              } else if (lowerFeel.includes('fitted') || lowerFeel.includes('relaxed')) {
                  dotClass = 'stylique-dot-warn';
              }
              
              fitBreakdownHtml += `
                <div class="stylique-fit-list-row">
                  <div class="stylique-fit-dot ${dotClass}"></div>
                  <span class="stylique-fit-label">${labelMap[key]}</span>
                  <span class="stylique-fit-value">&mdash; ${feelText}</span>
                </div>
              `;
            });
            fitBreakdownHtml += `</div></div>`;
          }

          // Size Up/Down Section
          let altSizesHtml = '';
          if (sizeUpDownInfo.sizeUp || sizeUpDownInfo.sizeDown) {
            altSizesHtml = `<div class="stylique-section-spacing">
              <p class="stylique-section-title">Prefer a Different Fit?</p>
              <div class="stylique-alt-sizes-grid">`;
              
            if (sizeUpDownInfo.sizeDown) {
              altSizesHtml += `
                <button type="button" class="stylique-alt-card stylique-alt-card-button" data-stylique-alt-size="${sizeUpDownInfo.sizeDown.size}">
                  <span class="stylique-alt-title">Try ${sizeUpDownInfo.sizeDown.size} (Snug)</span>
                  <span class="stylique-alt-notes">${(sizeUpDownInfo.sizeDown.notes || []).join(' &bull; ')}</span>
                </button>
              `;
            }
            if (sizeUpDownInfo.sizeUp) {
              altSizesHtml += `
                <button type="button" class="stylique-alt-card stylique-alt-card-button" data-stylique-alt-size="${sizeUpDownInfo.sizeUp.size}">
                  <span class="stylique-alt-title">Try ${sizeUpDownInfo.sizeUp.size} (Relaxed)</span>
                  <span class="stylique-alt-notes">${(sizeUpDownInfo.sizeUp.notes || []).join(' &bull; ')}</span>
                </button>
              `;
            }
            altSizesHtml += `</div></div>`;
          }

          // Collapsible Table
          let tableRows = '';
          if (sizeChart && sizeChart.length > 0) {
            tableRows = allowedKeys.map((key, i) => {
              const label = labelMap[key];
              const userKey = userKeyMap[key];
              const userVal = userKey && userM[userKey] ? userM[userKey] + '"' : '&mdash;';
              
              let rowHtml = `
                <tr class="${i > 0 ? 'stylique-table-border-top' : ''}">
                  <td class="stylique-simplified-label">${label}</td>
                  <td class="stylique-simplified-user">${userVal}</td>
              `;

              tableSizes.forEach(col => {
                const val = valExtractor(col.data, key);
                const displayVal = val != null ? val + '"' : '&mdash;';
                if (col.isBest) {
                  rowHtml += `<td class="stylique-simplified-best">${displayVal}</td>`;
                } else {
                  rowHtml += `<td class="stylique-simplified-alt text-center py-3 px-4 text-[#475569] font-medium">${displayVal}</td>`;
                }
              });

              rowHtml += `</tr>`;
              return rowHtml;
            }).join('');
          }

          let collapsibleTableHtml = '';
          if (tableRows) {
            let headersHtml = `
              <th class="stylique-simplified-label-header">Area</th>
              <th class="stylique-simplified-user-header">You</th>
            `;
            tableSizes.forEach(col => {
              if (col.isBest) {
                headersHtml += `<th class="stylique-simplified-best-header text-center">Size ${col.title}</th>`;
              } else {
                headersHtml += `<th class="text-center py-3 px-4 text-[#475569] font-bold text-[11px] uppercase tracking-wider bg-white/50">Size ${col.title}</th>`;
              }
            });

            collapsibleTableHtml = `
              <details class="stylique-details-accordion stylique-section-spacing">
                <summary class="stylique-accordion-summary">
                  <span>See detailed measurements</span>
                  <svg fill="none" class="stylique-accordion-icon" height="16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                </summary>
                <div class="stylique-chart-wrapper stylique-chart-accordion-bg">
                  <div class="stylique-chart-scroll">
                    <table class="stylique-size-chart-table stylique-simplified-table stylique-accordion-table">
                      <thead>
                        <tr>${headersHtml}</tr>
                      </thead>
                      <tbody>${tableRows}</tbody>
                    </table>
                  </div>
                </div>
              </details>
            `;
          }

          container.innerHTML = `
          <div class="stylique-size-rec-main">
            <p class="stylique-anchor-text">Based on your body measurements and this garment's cut:</p>

            <div class="stylique-best-card-wrapper">
              <div class="stylique-best-card-header">
                <div>
                  <p class="stylique-best-card-subtitle">Your Best Size</p>
                  <p class="stylique-best-card-title">${bestFit}</p>
                </div>
              </div>
              <div class="stylique-confidence-bar-wrapper">
                <span class="stylique-confidence-label">Confidence</span>
                <div class="stylique-confidence-bar" style="--width: ${confidence}%">
                  <div style="width: ${confidence}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); border-radius: 3px;"></div>
                </div>
              </div>
              ${bestFitNote ? `<p class="stylique-best-card-note">&ldquo;${bestFitNote}&rdquo;</p>` : ''}
            </div>

            ${fitBreakdownHtml}
            ${altSizesHtml}
            
            <div class="stylique-cta-wrapper">
              <button onclick="window.addToCart('${bestFit}')" class="stylique-add-button stylique-primary-cta">
                Add Size ${bestFit} to Cart
              </button>
              <p class="stylique-footer-microtext">Based on your body inputs + brand size chart.</p>
            </div>

            ${collapsibleTableHtml}
          </div>
        `;
          container.querySelectorAll('[data-stylique-alt-size]').forEach(function(button) {
            button.addEventListener('click', function() {
              var size = button.getAttribute('data-stylique-alt-size');
              if (size && window.addToCart) window.addToCart(size);
            });
          });
        } else {
          container.innerHTML = `<p class="stylique-error-text">${data.error || 'Failed to load size recommendation'}</p>`;
        }
      } catch (error) {
        console.error('❌ Size recommendation error:', error);
        container.innerHTML = '<p class="stylique-error-text">Failed to load size recommendation: ' + (error.message || 'Unknown error') + '</p>';
      }
    }

    // Load complete look recommendations
    async function loadCompleteLook(productId, containerId = 'stylique-complete-look-content') {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('📊 Complete look container not found:', containerId);
        return;
      }

      console.log('📊 Loading complete look for product:', productId, 'container:', containerId);

      try {
        const userId = window.styliqueOptions.user?.id;
        if (!userId) {
          console.warn('📊 User not logged in, cannot load complete look');
          container.innerHTML = '<p class="stylique-error-text">Please log in to see complete look recommendations</p>';
          return;
        }

        console.log('📊 Fetching complete look with:', {
          storeId: window.styliqueOptions.storeId,
          productId: productId,
          userId: userId,
          currentUrl: window.styliqueOptions.currentUrl
        });

        const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/complete-look', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: window.styliqueOptions.storeId,
            productId: productId,
            userId: userId,
            currentUrl: window.styliqueOptions.currentUrl,
            limit: 3
          })
        });

        const data = await response.json();
        console.log('📊 Complete look response:', data);

        if (data.success && data.outfits && data.outfits.length > 0) {
          console.log('✅ Complete look loaded successfully, outfits:', data.outfits.length);
          container.innerHTML = `
          <div class="stylique-outfits-grid">
            ${data.outfits.slice(0, 3).map((outfit, idx) => `
              <div class="stylique-outfit-card">
                <div class="stylique-outfit-header">
                  <h6>Outfit ${idx + 1}</h6>
                  ${outfit.totalConfidence ? `<span class="stylique-outfit-score">${Math.round(outfit.totalConfidence * 10) / 10}/10</span>` : ''}
                </div>
                <div class="stylique-outfit-items">
                  ${outfit.items && outfit.items.slice(0, 4).map(item => {
            const itemData = item || {};
            return `
                    <div class="stylique-outfit-item">
                      ${itemData.image_url ? `
                        <img src="${itemData.image_url}" alt="${itemData.product_name || 'Product'}" class="stylique-outfit-item-image" />
                      ` : ''}
                      <div class="stylique-outfit-item-info">
                        <p class="stylique-outfit-item-name">${itemData.product_name || 'Product'}</p>
                        ${itemData.brand ? `<p class="stylique-outfit-item-brand">${itemData.brand}</p>` : ''}
                        ${itemData.product_link ? `
                          <a href="${itemData.product_link}" target="_blank" class="stylique-outfit-item-link">View Product</a>
                        ` : ''}
                      </div>
                    </div>
                  `;
          }).join('')}
                </div>
                ${outfit.items && outfit.items.length > 4 ? `<p class="stylique-outfit-more">+${outfit.items.length - 4} more items</p>` : ''}
              </div>
            `).join('')}
          </div>
          ${data.reasoning ? `
            <div class="stylique-outfit-reasoning">
              <h6>Why This Look?</h6>
              <p>${data.reasoning}</p>
            </div>
          ` : ''}
        `;
        } else {
          container.innerHTML = `<p class="stylique-info-text">${data.error || 'No outfit recommendations available at this time'}</p>`;
        }
      } catch (error) {
        console.error('❌ Complete look error:', error);
        container.innerHTML = '<p class="stylique-error-text">Failed to load complete look recommendations: ' + (error.message || 'Unknown error') + '</p>';
      }
    }

    // Hide 3D results modal
    function hide3DResultsModal() {
      const modal = document.getElementById('stylique-3d-results-modal');
      if (modal) {
        // Cleanup 3D viewer resources
        if (window.stylique3DViewer) {
          // Stop animation loop
          if (window.stylique3DViewer.animationId) {
            cancelAnimationFrame(window.stylique3DViewer.animationId);
          }

          // Remove resize listener
          if (window.stylique3DViewer.handleResize) {
            window.removeEventListener('resize', window.stylique3DViewer.handleResize);
          }

          // Dispose of Three.js resources
          if (window.stylique3DViewer.renderer) {
            window.stylique3DViewer.renderer.dispose();
          }

          if (window.stylique3DViewer.scene) {
            window.stylique3DViewer.scene.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                  if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                  } else {
                    object.material.dispose();
                  }
                }
              }
            });
          }

          // Reset viewer state
          window.stylique3DViewer = {
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            model: null,
            autoRotate: false,
            initialCameraPosition: null,
            initialTarget: null,
            animationId: null
          };
        }

        modal.remove();
      }
      unlockStyliqueBodyScroll('3d');
    }

    // Reset try-on
    function resetTryOn() {
      window.styliqueOptions.selectedImage = null;
      window.styliqueOptions.garmentImage = null;
      document.getElementById('stylique-image-preview').style.display = 'none';
      document.getElementById('stylique-file-input').value = '';

      // Reset 2D result
      var result2D = document.getElementById('stylique-inline-result');
      if (result2D) result2D.style.display = 'none';

      // Reset 3D result
      var result3D = document.getElementById('stylique-inline-3d-result');
      if (result3D) result3D.style.display = 'none';
      var container3D = document.getElementById('stylique-3d-inline-container');
      if (container3D) container3D.innerHTML = '';

      // Hide premium result view
      var resultView = document.getElementById('stylique-result-view');
      if (resultView) resultView.style.display = 'none';
      var rightColumn = document.querySelector('.stylique-right-column');
      if (rightColumn) rightColumn.classList.remove('stylique-result-mode');

      // Restore upload area
      var uploadArea = document.getElementById('stylique-upload-area');
      if (uploadArea) uploadArea.style.display = 'block';
      var uploadSection = document.querySelector('.stylique-upload-section');
      if (uploadSection) uploadSection.style.display = 'block';

      // Restore action section
      var actionSection = document.querySelector('.stylique-action-section');
      if (actionSection) actionSection.style.display = 'block';

      // Re-apply tier routing to restore correct visibility
      var tier = window.styliqueOptions.productTier;
      if (tier) {
        applyTierRouting(tier);
      } else {
        var options = document.querySelector('.stylique-tryon-options');
        if (options) options.style.display = 'block';
      }

      updateTryOnButtonsState();
      hideResultsModal();
      hide3DResultsModal();
    }

    function normalizeWooAttributeValue(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/&amp;/g, '&')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    function findWooVariationForSize(sizeName) {
      var desired = normalizeWooAttributeValue(sizeName);
      if (!desired) return null;

      var variations = Array.isArray(window.styliqueOptions.wooVariations)
        ? window.styliqueOptions.wooVariations
        : [];

      return variations.find(function(variation) {
        if (!variation || !variation.variation_id || variation.is_in_stock === false || variation.is_purchasable === false) {
          return false;
        }

        var attributes = variation.attributes || {};
        return Object.keys(attributes).some(function(key) {
          var normalizedKey = String(key || '').toLowerCase();
          var normalizedValue = normalizeWooAttributeValue(attributes[key]);
          var keyLooksLikeSize = normalizedKey.indexOf('size') !== -1 || normalizedKey.indexOf('pa_size') !== -1;
          return keyLooksLikeSize && normalizedValue === desired;
        });
      }) || null;
    }

    function redirectToNativeWooProduct(message) {
      if (message) alert(message);
      window.location.href = window.styliqueOptions.wooProductUrl || window.location.href;
    }

    // Add to cart
    function addToCart(sizeName) {
      var productId = window.styliqueOptions.wooProductId;
      var productType = window.styliqueOptions.wooProductType || 'simple';
      var ajaxUrl = window.styliqueOptions.wooAjaxAddToCartUrl;
      var cartUrl = window.styliqueOptions.wooCartUrl || '/cart/';
      var params = new URLSearchParams();

      if (!productId) {
        redirectToNativeWooProduct('We could not identify this WooCommerce product. Please use the product page Add to Cart button.');
        return;
      }

      params.append('product_id', productId);
      params.append('quantity', '1');

      if (productType === 'variable') {
        var variation = findWooVariationForSize(sizeName);
        if (!variation) {
          redirectToNativeWooProduct('We could not match the recommended size to an available variation. Please choose your size on the product page.');
          return;
        }

        params.append('variation_id', variation.variation_id);
        Object.keys(variation.attributes || {}).forEach(function(key) {
          params.append(key, variation.attributes[key]);
        });
      }

      if (!ajaxUrl) {
        window.location.href = window.styliqueOptions.wooAddToCartUrl || (window.location.pathname + '?add-to-cart=' + encodeURIComponent(productId));
        return;
      }

      fetch(ajaxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        credentials: 'same-origin',
        body: params.toString()
      })
        .then(function(response) {
          return response.text().then(function(text) {
            var data = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch (parseError) {
              data = {};
            }
            if (!response.ok) {
              throw new Error(data.message || 'WooCommerce add-to-cart request failed.');
            }
            return data;
          });
        })
        .then(function(data) {
          if (data && data.error) {
            if (data.product_url) {
              window.location.href = data.product_url;
              return;
            }
            throw new Error(data.message || 'WooCommerce could not add this product to the cart.');
          }

          console.log('Added WooCommerce product to cart:', data);
          trackConversion(productId);
          hideResultsModal();
          window.location.href = cartUrl;
        })
        .catch(function(error) {
          console.error('Error adding WooCommerce product to cart:', error);
          redirectToNativeWooProduct('We could not add this item automatically. Please choose your options on the product page.');
        });
    }

  // Event listeners
  document.addEventListener('DOMContentLoaded', function () {
    // Test API connection first
    testAPIConnection().then(isConnected => {
      if (isConnected) {
        // Fetch store status early so note/buttons reflect plan even before login
        fetchStoreStatus();
        checkLoginStatus();
      } else {
        console.error('[Stylique] Cannot proceed — API connection failed. Check console above for [Stylique probe] details.');
        var apiUrl = STYLIQUE_API_BASE || '(not set)';
        document.getElementById('stylique-login-required').innerHTML =
          '<div style="text-align: center; padding: 2rem;">' +
            '<h4 style="color: #dc2626; margin-bottom: 1rem;">Service Temporarily Unavailable</h4>' +
            '<p style="color: #6c757d; margin-bottom: .5rem;">Unable to connect to Stylique services.</p>' +
            '<p style="color: #999; font-size: 12px; margin-bottom: 1rem;">API: ' + apiUrl + '/api/ping</p>' +
            '<button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Retry</button>' +
          '</div>';
      }
    });

    // OTP input formatting
    const otpInput = document.getElementById('stylique-otp');
    if (otpInput) {
      otpInput.addEventListener('input', function (e) {
        // Only allow numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');

        // Auto-submit when 6 digits entered
        if (e.target.value.length === 6) {
          setTimeout(() => {
            verifyOTP();
          }, 500);
        }
      });

      // Handle paste
      otpInput.addEventListener('paste', function (e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const numbers = paste.replace(/[^0-9]/g, '').slice(0, 6);
        e.target.value = numbers;

        if (numbers.length === 6) {
          setTimeout(() => {
            verifyOTP();
          }, 500);
        }
      });
    }

    // File input
    const fileInput = document.getElementById('stylique-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', function (e) { handleFileSelect(e); updateTryOnButtonsState(); });
    }

    // Enhanced drag and drop
    const uploadArea = document.getElementById('stylique-upload-area');
    if (uploadArea) {
      let dragCounter = 0;

      uploadArea.addEventListener('dragenter', function (e) {
        e.preventDefault();
        dragCounter++;
        uploadArea.classList.add('drag-over');
      });

      uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
      });

      uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
          uploadArea.classList.remove('drag-over');
        }
      });

      uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        dragCounter = 0;
        uploadArea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          fileInput.files = files;
          handleFileSelect({ target: { files: files } });
          updateTryOnButtonsState();
        }
      });
    }

    // Set up inline result button event listeners
    const tryAgainBtn = document.getElementById('stylique-try-again-btn');
    const addToCartBtn = document.getElementById('stylique-add-to-cart-btn');

    if (tryAgainBtn) {
      tryAgainBtn.addEventListener('click', function (e) {
        e.preventDefault();
        resetTryOn();
      });
    }

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        addToCart();
      });
    }
  });

  // ===== ONBOARDING FUNCTIONS =====

  // Selected body type for onboarding
  window.styliqueOptions.selectedBodyType = '';

  // Show onboarding modal
  // Show inline onboarding (not modal)
  function showOnboardingModal() {
    // Hide login prompt
    document.getElementById('stylique-login-required').style.display = 'none';
    // Show inline onboarding
    document.getElementById('stylique-inline-onboarding').style.display = 'block';
    // Reset to step 1
    document.getElementById('stylique-inline-step-1').style.display = 'block';
    document.getElementById('stylique-inline-step-2').style.display = 'none';
  }

  // Inline onboarding - go to step 2
  function inlineOnboardingNext() {
    const name = document.getElementById('stylique-inline-name').value.trim();
    // phone is now optional
    const phone = document.getElementById('stylique-inline-phone').value.trim();

    if (!name) {
      document.getElementById('stylique-inline-error').textContent = 'Please enter your full name';
      document.getElementById('stylique-inline-error').style.display = 'block';
      return;
    }

    document.getElementById('stylique-inline-error').style.display = 'none';
    document.getElementById('stylique-inline-step-1').style.display = 'none';
    document.getElementById('stylique-inline-step-2').style.display = 'block';
  }

  // Inline onboarding - go back to step 1
  function inlineOnboardingBack() {
    document.getElementById('stylique-inline-step-1').style.display = 'block';
    document.getElementById('stylique-inline-step-2').style.display = 'none';
  }

  // Select body type for inline onboarding
  let inlineSelectedBodyType = 'moderate';
  function selectInlineBodyType(type) {
    inlineSelectedBodyType = type;
    document.querySelectorAll('.stylique-type-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.value === type);
    });
  }

  // Extract skin tone using HuggingFace API
  async function extractSkinTone(input) {
    const file = input.files[0];
    if (!file) return;

    // Show loading state
    const btnText = document.getElementById('stylique-skin-btn-text');
    const originalText = btnText.textContent;
    btnText.textContent = 'Analyzing...';

    // Also show preview of uploaded image
    const reader = new FileReader();
    reader.onload = function (e) {
      const canvas = document.getElementById('stylique-skin-canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = function () {
        canvas.width = 60;
        canvas.height = 60;
        ctx.drawImage(img, 0, 0, 60, 60);
        document.getElementById('stylique-skin-preview').style.display = 'flex';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    try {
      // Call our HuggingFace-powered API
      const formData = new FormData();
      formData.append('image', file);

      const response = await styFetch(STYLIQUE_API_BASE + '/api/detect-skin-tone', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('Skin tone API result:', result);

      if (response.ok && result.hexColor) {
        // Success! Show the extracted color
        document.getElementById('stylique-skin-color').style.backgroundColor = result.hexColor;
        document.getElementById('stylique-inline-skin-tone').value = result.hexColor;
        btnText.textContent = 'Change Photo ✓';
        console.log('Extracted skin tone:', result.hexColor);
      } else {
        // Fallback to simple canvas extraction
        console.warn('HF API failed, using fallback:', result.error);
        fallbackExtractSkinTone(file);
        btnText.textContent = 'Change Photo';
      }
    } catch (error) {
      console.error('Skin tone API error:', error);
      // Fallback to simple canvas extraction
      fallbackExtractSkinTone(file);
      btnText.textContent = 'Change Photo';
    }
  }

  // Fallback simple skin tone extraction using canvas
  function fallbackExtractSkinTone(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.getElementById('stylique-skin-canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = 60;
        canvas.height = 60;
        ctx.drawImage(img, 0, 0, 60, 60);

        // Sample center region
        const centerX = 30, centerY = 25;
        const sampleSize = 10;
        let r = 0, g = 0, b = 0, count = 0;

        for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
          for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
            const data = ctx.getImageData(x, y, 1, 1).data;
            r += data[0];
            g += data[1];
            b += data[2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        const hexColor = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

        document.getElementById('stylique-skin-color').style.backgroundColor = hexColor;
        document.getElementById('stylique-inline-skin-tone').value = hexColor;
        console.log('Fallback extracted skin tone:', hexColor);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Complete inline onboarding
  async function completeInlineOnboarding() {
    const btn = document.getElementById('stylique-inline-complete-btn');
    const text = document.getElementById('stylique-inline-complete-text');
    const spinner = document.getElementById('stylique-inline-spinner');

    // Get user from our stored state
    const user = window.styliqueOptions.user;
    if (!user || !user.id) {
      console.error('No user found in styliqueSection');
      document.getElementById('stylique-inline-error').textContent = 'Session expired. Please refresh and log in again.';
      document.getElementById('stylique-inline-error').style.display = 'block';
      return;
    }

    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'flex';

    try {
      const userData = {
        userId: user.id,
        token: user.token || localStorage.getItem('stylique_token') || 'plugin-auth',
        name: document.getElementById('stylique-inline-name').value.trim(),
        phone: document.getElementById('stylique-inline-phone').value.trim(),
        chest: parseFloat(document.getElementById('stylique-inline-chest').value) || null,
        shoulder_width: parseFloat(document.getElementById('stylique-inline-shoulder').value) || null,
        waist: parseFloat(document.getElementById('stylique-inline-waist').value) || null,
        inseam: parseFloat(document.getElementById('stylique-inline-inseam').value) || null,
        sleeve_length: parseFloat(document.getElementById('stylique-inline-sleeve').value) || null,
        neck_circumference: parseFloat(document.getElementById('stylique-inline-neck').value) || null,
        shirt_length: parseFloat(document.getElementById('stylique-inline-shirt-length').value) || null,
        armhole_size: parseFloat(document.getElementById('stylique-inline-armhole').value) || null,
        thigh_circumference: parseFloat(document.getElementById('stylique-inline-thigh').value) || null,
        weight: parseFloat(document.getElementById('stylique-inline-weight').value) || null,
        body_type: inlineSelectedBodyType,
        skin_tone_hex: document.getElementById('stylique-inline-skin-tone').value || null
      };

      console.log('Saving profile data:', userData);

      // Update user profile via API
      const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const result = await response.json();
      console.log('Profile update result:', result);

      if (!response.ok) {
        console.warn('Profile update failed:', result.error);
      } else {
        console.log('Profile saved successfully!');
      }

      // Update local user data
      Object.assign(user, userData);
      window.styliqueOptions.user = user;

      // Show try-on interface
      document.getElementById('stylique-inline-onboarding').style.display = 'none';
      document.getElementById('stylique-tryon-interface').style.display = 'block';

    } catch (error) {
      console.error('Onboarding error:', error);
      // Still proceed to try-on
      document.getElementById('stylique-inline-onboarding').style.display = 'none';
      document.getElementById('stylique-tryon-interface').style.display = 'block';
    } finally {
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
  }

  // Skip inline onboarding
  function skipInlineOnboarding() {
    document.getElementById('stylique-inline-onboarding').style.display = 'none';
    document.getElementById('stylique-tryon-interface').style.display = 'block';
  }

  // Legacy function for modal (no longer used but kept for compatibility)
  function showOldOnboardingModal() {
    const modal = document.getElementById('stylique-onboarding-modal');
    modal.style.display = 'flex';
    lockStyliqueBodyScroll('onboarding');

    // Reset to step 1
    document.getElementById('stylique-onboarding-step-1').style.display = 'block';
    document.getElementById('stylique-onboarding-step-2').style.display = 'none';

    // Reset progress indicators
    document.getElementById('stylique-progress-step-1').classList.add('active');
    document.getElementById('stylique-progress-step-1').classList.remove('completed');
    document.getElementById('stylique-progress-step-2').classList.remove('active', 'completed');
    document.getElementById('stylique-progress-line-1').classList.remove('active');

    // Hide login form
    document.getElementById('stylique-login-required').style.display = 'none';

    console.log('Onboarding modal shown');
  }

  // Hide onboarding modal
  function hideOnboardingModal() {
    document.getElementById('stylique-onboarding-modal').style.display = 'none';
    unlockStyliqueBodyScroll('onboarding');
  }

  // Go to step 2
  function goToOnboardingStep2() {
    const name = document.getElementById('stylique-onboarding-name').value.trim();
    const phone = document.getElementById('stylique-onboarding-phone').value.trim();
    const errorDiv = document.getElementById('stylique-onboarding-error');

    // Validate required fields
    if (!name) {
      errorDiv.textContent = 'Please enter your full name';
      errorDiv.style.display = 'block';
      return;
    }

    errorDiv.style.display = 'none';

    // Update progress indicators
    document.getElementById('stylique-progress-step-1').classList.remove('active');
    document.getElementById('stylique-progress-step-1').classList.add('completed');
    document.getElementById('stylique-progress-step-2').classList.add('active');
    document.getElementById('stylique-progress-line-1').classList.add('active');

    // Switch steps
    document.getElementById('stylique-onboarding-step-1').style.display = 'none';
    document.getElementById('stylique-onboarding-step-2').style.display = 'block';

    console.log('Moved to onboarding step 2');
  }

  // Go back to step 1
  function goToOnboardingStep1() {
    // Update progress indicators
    document.getElementById('stylique-progress-step-1').classList.add('active');
    document.getElementById('stylique-progress-step-1').classList.remove('completed');
    document.getElementById('stylique-progress-step-2').classList.remove('active');
    document.getElementById('stylique-progress-line-1').classList.remove('active');

    // Switch steps
    document.getElementById('stylique-onboarding-step-1').style.display = 'block';
    document.getElementById('stylique-onboarding-step-2').style.display = 'none';

    console.log('Moved back to onboarding step 1');
  }

  // Select body type
  function selectBodyType(type) {
    window.styliqueOptions.selectedBodyType = type;

    // Update button states
    const buttons = document.querySelectorAll('.stylique-body-type-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-value') === type) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    console.log('Body type selected:', type);
  }

  // Complete onboarding - submit data to API
  async function completeOnboarding() {
    const completeBtn = document.getElementById('stylique-complete-onboarding-btn');
    const completeText = document.getElementById('stylique-complete-text');
    const completeSpinner = document.getElementById('stylique-complete-spinner');
    const errorDiv = document.getElementById('stylique-onboarding-error');

    // Gather form data
    const name = document.getElementById('stylique-onboarding-name').value.trim();
    const phone = document.getElementById('stylique-onboarding-phone').value.trim();

    // Optional measurements
    const chest = document.getElementById('stylique-onboarding-chest').value;
    const shoulder_width = document.getElementById('stylique-onboarding-shoulder').value;
    const waist = document.getElementById('stylique-onboarding-waist').value;
    const inseam = document.getElementById('stylique-onboarding-inseam').value;
    const sleeve_length = document.getElementById('stylique-onboarding-sleeve').value;
    const neck_circumference = document.getElementById('stylique-onboarding-neck').value;
    const thigh_circumference = document.getElementById('stylique-onboarding-thigh').value;
    const weight = document.getElementById('stylique-onboarding-weight').value;
    const body_type = window.styliqueOptions.selectedBodyType;

    // Show loading state
    completeBtn.disabled = true;
    completeText.style.display = 'none';
    completeSpinner.style.display = 'flex';

    try {
      const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: window.styliqueOptions.user.id,
          token: window.styliqueOptions.authToken,
          name,
          phone,
          chest,
          shoulder_width,
          waist,
          inseam,
          sleeve_length,
          neck_circumference,
          thigh_circumference,
          weight,
          body_type
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update stored user data
        window.styliqueOptions.user = result.user;
        localStorage.setItem('stylique_user', JSON.stringify(result.user));
        window.styliqueOptions.isNewUser = false;

        console.log('Onboarding completed successfully');

        // Hide onboarding and show try-on interface
        hideOnboardingModal();
        showTryOnInterface();
      } else {
        if (errorDiv) {
          errorDiv.textContent = result.error || 'Failed to save profile';
          errorDiv.style.display = 'block';
        }
      }

    } catch (error) {
      console.error('Onboarding error:', error);
      if (errorDiv) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
      }
    } finally {
      // Reset loading state
      completeBtn.disabled = false;
      completeText.style.display = 'inline';
      completeSpinner.style.display = 'none';
    }
  }

  // Track Conversion (with debounce)
  let lastTrackedProductId = null;
  let lastTrackedTime = 0;

  async function trackConversion(productId) {
    if (!window.styliqueOptions.user || !window.styliqueOptions.user.id) return;
    
    const now = Date.now();
    // Debounce: verify if same product was tracked within 2 seconds
    if (productId === lastTrackedProductId && (now - lastTrackedTime) < 2000) {
      console.log('⏳ Conversion tracking skipped (duplicate/debounce)');
      return;
    }

    lastTrackedProductId = productId;
    lastTrackedTime = now;
    
    try {
      console.log('📈 Tracking conversion for:', productId);
      await styFetch(STYLIQUE_API_BASE + '/api/plugin/track-conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: window.styliqueOptions.user.id,
          store_id: (window.styliqueOptions.storeStatus && window.styliqueOptions.storeStatus.id) 
            ? window.styliqueOptions.storeStatus.id 
            : window.styliqueOptions.storeId, // Fallback to domain if UUID missing
          product_id: window.styliqueOptions.internalProductId || productId
        })
      });
      console.log('✅ Conversion tracked');
    } catch (e) {
      console.error('❌ Failed to track conversion:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PREMIUM RESULT VIEW — uwear.ai-style
  // ─────────────────────────────────────────────────────────────

  function showResultView(resultImage, productId) {
    try {
      console.log('🎨 showResultView: Entering full-widget mode...', { hasImage: !!resultImage, productId });

      const resultView = document.getElementById('stylique-result-view');
      const mainInterface = document.getElementById('stylique-tryon-interface');

      if (!resultView) {
        console.error('❌ Critical: stylique-result-view not found');
        return;
      }

      // 🛡️ BULLETPROOF FIX: HTML Parser Escape 🛡️
      // Due to missing </div> tags upstream, resultView is often incorrectly parsed as a descendant of mainInterface.
      // If we hide mainInterface, resultView becomes 0x0. We MUST teleport it outside physically!
      if (mainInterface && resultView.parentNode !== mainInterface.parentNode) {
        console.log('🚀 Extricating resultView from broken HTML tree and teleporting to safety!');
        mainInterface.parentNode.insertBefore(resultView, mainInterface.nextSibling);
      }

      // 1. Swap Visibility
      if (mainInterface) {
        mainInterface.style.cssText = 'display: none !important;';
      }
      
      // Force parents to 100% width to prevent flex-shrink dimensional collapse
      // ALSO: strip out padding from the main section to prevent nested double-padding which creates unwanted scrollbars!
      const parentSection = resultView.closest('.stylique-section-content');
      const mainSection = resultView.closest('.stylique-section');
      
      if (parentSection) {
        parentSection.style.setProperty('width', '100%', 'important');
        parentSection.style.setProperty('flex', '1', 'important');
      }
      if (mainSection) {
        mainSection.style.setProperty('padding', '0', 'important');
      }
      
      const modalContent = document.querySelector('.stylique-modal-content');
      if (modalContent) {
        modalContent.style.setProperty('overflow', 'hidden', 'important'); // Prevent total modal scrolling
      }

      // 2. Hide global headers
      document.querySelectorAll('.stylique-tryon-header').forEach(el => el.style.setProperty('display', 'none', 'important'));

      // 3. Show result-view naturally
      resultView.classList.remove('is-visible');
      resultView.classList.add('show-result');
      
      // Provide an aggressive backup style sequence just in case
      resultView.style.cssText = 'display: grid !important; visibility: visible !important; min-height: 0 !important; width: 100% !important; z-index: 99999 !important; background: #fafafa !important;';
      window.requestAnimationFrame(() => {
        resultView.classList.add('is-visible');
      });

      console.log('✅ Result-view teleported and shown.');

      // 5. Set the result image with loading/error state
      const resultImg = document.getElementById('stylique-result-main-image');
      const loadingState = document.getElementById('stylique-result-image-loading');
      const errorState = document.getElementById('stylique-result-image-error');

      if (resultImg && resultImage) {
        if (loadingState) loadingState.style.display = 'block';
        if (errorState) errorState.style.display = 'none';
        resultImg.style.display = 'none';
        resultImg.style.opacity = '0';

        resultImg.onload = function() {
          if (loadingState) loadingState.style.display = 'none';
          resultImg.style.setProperty('display', 'block', 'important');
          resultImg.style.opacity = '1';

          // Debug: Log image and container dimensions
          const container = document.querySelector('.stylique-result-image-container');
          const leftCol = document.querySelector('.stylique-result-left');
          const resultView = document.getElementById('stylique-result-view');

          console.log('✅ Result image loaded successfully.');
          console.log('📏 IMAGE DIAGNOSTICS:');
          console.log('  - Image naturalWidth:', resultImg.naturalWidth, 'naturalHeight:', resultImg.naturalHeight);
          console.log('  - Image offsetWidth:', resultImg.offsetWidth, 'offsetHeight:', resultImg.offsetHeight);
          console.log('  - Image style:', {
            display: resultImg.style.display,
            opacity: resultImg.style.opacity,
            width: resultImg.style.width,
            height: resultImg.style.height
          });
          if (container) {
            console.log('  - Container offsetWidth:', container.offsetWidth, 'offsetHeight:', container.offsetHeight);
            console.log('  - Container style:', window.getComputedStyle(container).display, window.getComputedStyle(container).overflow);
          }
          if (leftCol) {
            console.log('  - LeftCol offsetWidth:', leftCol.offsetWidth, 'offsetHeight:', leftCol.offsetHeight);
          }
          if (resultView) {
            console.log('  - ResultView offsetWidth:', resultView.offsetWidth, 'offsetHeight:', resultView.offsetHeight);
            console.log('  - ResultView display:', window.getComputedStyle(resultView).display);
          }
        };

        resultImg.onerror = function() {
          if (loadingState) loadingState.style.display = 'none';
          if (errorState) errorState.style.display = 'block';
          console.error('❌ Result image failed to load. URL:', resultImage.slice(0, 50) + '...');
        };

        resultImg.src = resultImage;
      } else {
        if (errorState) {
          errorState.textContent = 'No result image returned by API.';
          errorState.style.display = 'block';
        }
      }

      // 6. Populate items and recommendations
      try {
        buildItemsInThisLook(productId);
      } catch (e) {
        console.error('❌ Error building items panel:', e);
      }
      
      // 7. Populate 'Complete the Look' cross-sell carousel
      try {
        buildCompleteTheLook(productId);
      } catch (e) {
        console.error('❌ Error building complete the look panel:', e);
      }

      console.log('✅ Result view shown successfully.');
    } catch (criticalError) {
      console.error('CRITICAL JS ERROR IN showResultView:', criticalError);
      alert('Stylique Widget Error: ' + criticalError.message);
    }
  }

  // Build the "Items in this look" right panel (uwear.ai style)
  function buildItemsInThisLook(productId) {
    const itemsList = document.getElementById('stylique-result-items-list');
    if (!itemsList) return;

    // Get current product info
    const product = window.styliqueOptions.currentProduct || {};
    const productTitle = product.title || <?php echo isset($product) && $product ? wp_json_encode($product->get_name()) : "null"; ?> || 'Product';
    const productImage = product.featured_image
      || (product.images && product.images[0])
      || <?php echo isset($product) && $product && $product->get_image_id() ? wp_json_encode(wp_get_attachment_image_url($product->get_image_id(), "medium")) : "null"; ?>;
    const productUrl = product.url || <?php echo isset($product) && $product ? wp_json_encode($product->get_permalink()) : "null"; ?>;

    // Show loading state first
    itemsList.innerHTML = `
      <div class="stylique-result-item-card">
        <img class="stylique-result-item-thumb" src="${productImage}" alt="${productTitle}" />
        <div class="stylique-result-item-info">
          <p class="stylique-result-item-name">${productTitle}</p>
          <p class="stylique-result-item-size" style="color: #6b7280;">
            <span style="display:inline-flex;align-items:center;gap:6px;">
              <span class="stylique-spinner-small" style="width:14px;height:14px;border-width:2px;margin:0;"></span>
              Finding your best size…
            </span>
          </p>
        </div>
      </div>`;

    // Load size recommendation
    if (productId) {
      loadSizeRecommendationForResultV2(productId, productTitle, productImage, productUrl);
    }
  }

  // Load size rec and populate the items card (uwear.ai style)
  async function loadSizeRecommendationForResultV2(productId, productTitle, productImage, productUrl) {
    const itemsList = document.getElementById('stylique-result-items-list');
    if (!itemsList) return;

    try {
      const resolvedProductId = window.styliqueOptions.productUuid || productId;
      const userId = window.styliqueOptions.user?.id;

      if (!userId) {
        // No user = no size rec, show item card without size
        renderItemCard(itemsList, productTitle, productImage, productUrl, null, null, null);
        return;
      }

      const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/size-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: window.styliqueOptions.storeId,
          productId: resolvedProductId,
          userId: userId,
          currentUrl: window.styliqueOptions.currentUrl
        })
      });

      const data = await response.json();
      console.log('📊 Result view size rec:', data);

      if (data.success && data.recommendation) {
        const rec = data.recommendation;
        const bestFit = rec.bestFit || rec.recommendedSize || 'N/A';
        window.styliqueLastRecommendedSize = bestFit !== 'N/A' ? bestFit : null;
        const confidence = rec.confidence || 0;
        const fitFeel = rec.fitFeel || {};
        const userM = rec.userMeasurements || {};
        const sizeChart = rec.sizeChart || [];

        // Build premium fit content with concise summary + detailed breakdown
        const fitNotes = buildHumanFitNotes(fitFeel, userM, sizeChart, bestFit, confidence);

        renderItemCard(itemsList, productTitle, productImage, productUrl, bestFit, confidence, fitNotes);
      } else {
        window.styliqueLastRecommendedSize = null;
        renderItemCard(itemsList, productTitle, productImage, productUrl, null, null, null);
      }
    } catch (error) {
      console.error('❌ Result view size rec error:', error);
      window.styliqueLastRecommendedSize = null;
      renderItemCard(itemsList, productTitle, productImage, productUrl, null, null, null);
    }
  }

  // Build human-readable fit notes like uwear.ai ("Chest: 2in looser · Waist: 1in looser")
  function buildHumanFitNotes(fitFeel, userM, sizeChart, bestFit, confidence) {
    const tableKeys = ['chest', 'shoulder', 'length', 'sleeve', 'waist', 'hips', 'inseam'];
    const summaryKeys = ['chest', 'length', 'waist', 'hips', 'shoulder', 'sleeve'];
    const labelMap = {
      chest: 'Chest',
      shoulder: 'Shoulders',
      length: 'Length',
      sleeve: 'Sleeve',
      waist: 'Waist',
      hips: 'Hips',
      inseam: 'Inseam'
    };

    // Try to compute measurement deltas first
    const bestSizeData = sizeChart.find(s =>
      s && s.size && (s.size === bestFit || s.size.toUpperCase() === bestFit.toUpperCase())
    );

    const normalizeNumber = (value) => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'object' && value.value !== undefined) return normalizeNumber(value.value);
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : null;
    };

    const valExtractor = (data, key) => {
      if (!data || !data.measurements) return null;
      const m = data.measurements;
      const directVal = normalizeNumber(m[key]);
      if (directVal != null) return directVal;

      const widthVal = normalizeNumber(m.width);
      if ((key === 'chest' || key === 'waist') && widthVal != null) return widthVal * 2;
      return null;
    };

    const formatMeasurement = (value) => {
      const numericValue = normalizeNumber(value);
      if (numericValue == null) return '&mdash;';
      const rounded = Math.round(numericValue * 10) / 10;
      return `${rounded}"`;
    };

    const formatDeltaFit = (key, userVal, garmentVal, fallback) => {
      if (userVal == null || garmentVal == null) return fallback || '&mdash;';

      const delta = Math.round((garmentVal - userVal) * 10) / 10;
      const absDelta = Math.round(Math.abs(delta) * 10) / 10;
      if (absDelta < 0.5) {
        return key === 'length' || key === 'sleeve' || key === 'inseam' ? 'Balanced' : 'Perfect';
      }
      if (key === 'length' || key === 'sleeve' || key === 'inseam') {
        return delta > 0 ? `${absDelta}" longer` : `${absDelta}" shorter`;
      }
      if (key === 'shoulder') {
        return delta > 0 ? `${absDelta}" relaxed` : `${absDelta}" tight`;
      }
      return delta > 0 ? `${absDelta}" looser` : `${absDelta}" tighter`;
    };

    const tableRows = tableKeys.map(key => {
      const userVal = normalizeNumber(userM[key]);
      const garmentVal = bestSizeData ? valExtractor(bestSizeData, key) : null;
      const fallbackFit = fitFeel && fitFeel[key] ? fitFeel[key] : '';
      const fit = formatDeltaFit(key, userVal, garmentVal, fallbackFit);

      if (userVal == null && garmentVal == null && !fallbackFit) return null;

      return {
        key,
        label: labelMap[key],
        you: formatMeasurement(userVal),
        garment: formatMeasurement(garmentVal),
        fit
      };
    }).filter(Boolean);
    const displayTableRows = tableRows.length > 0 ? tableRows : [
      { key: 'chest', label: 'Chest', you: '&mdash;', garment: '&mdash;', fit: 'Slightly relaxed' },
      { key: 'shoulder', label: 'Shoulders', you: '&mdash;', garment: '&mdash;', fit: 'Relaxed' },
      { key: 'length', label: 'Length', you: '&mdash;', garment: '&mdash;', fit: 'Balanced' },
      { key: 'sleeve', label: 'Sleeve', you: '&mdash;', garment: '&mdash;', fit: 'Comfortable' },
      { key: 'waist', label: 'Waist', you: '&mdash;', garment: '&mdash;', fit: 'Regular' }
    ];

    const summaryLines = summaryKeys
      .map(key => displayTableRows.find(row => row.key === key && row.fit && row.fit !== '&mdash;'))
      .filter(Boolean)
      .slice(0, 2)
      .map(row => `${row.label}: ${row.fit}`);
    const fallbackSummary = ['Chest: Slightly relaxed', 'Length: Balanced'];
    const displaySummaryLines = summaryLines.length > 0 ? summaryLines : fallbackSummary;
    const summaryLine = displaySummaryLines.join(' &middot; ');

    return {
      summaryLines: displaySummaryLines,
      summaryLine,
      tableRows: displayTableRows,
      isFallbackTable: tableRows.length === 0,
      sizeLabel: bestFit
    };
  }

  function normalizeDisplaySizeLabel(size) {
    if (size === null || size === undefined) return '';
    const normalized = String(size).trim();
    if (!normalized || normalized.toLowerCase() === 'default title' || normalized.toLowerCase() === 'title') {
      return 'M';
    }
    return normalized;
  }

  window.closeAllStyliqueFitDetails = function() {
    document.querySelectorAll('.stylique-result-fit-details.is-open').forEach(wrapper => {
      wrapper.classList.remove('is-open');
      const trigger = wrapper.querySelector('.stylique-result-fit-details-summary');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  };

  window.toggleStyliqueFitDetails = function(button, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const wrapper = button.closest('.stylique-result-fit-details');
    const wasOpen = wrapper && wrapper.classList.contains('is-open');
    window.closeAllStyliqueFitDetails();

    if (wrapper && !wasOpen) {
      wrapper.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
    }
  };

  window.closeStyliqueFitDetails = function(button, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const wrapper = button.closest('.stylique-result-fit-details');
    if (wrapper) {
      wrapper.classList.remove('is-open');
      const trigger = wrapper.querySelector('.stylique-result-fit-details-summary');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  };

  if (!window.styliqueFitDetailsListenersBound) {
    window.styliqueFitDetailsListenersBound = true;
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.stylique-result-fit-details')) {
        window.closeAllStyliqueFitDetails();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') window.closeAllStyliqueFitDetails();
    });
  }

  // Render a single item card (uwear.ai style)
  function renderItemCard(container, title, image, url, size, confidence, fitNotes) {
    const displaySize = normalizeDisplaySizeLabel(size);
    let sizeHtml = '';
    if (displaySize) {
      // Uwear styling: bold green size letter
      sizeHtml = `<p class="stylique-result-item-size">Recommended size: <strong style="color: #10b981; font-weight: 700; font-size: 15px;">${displaySize}</strong></p>`;
    }

    const numericConfidence = Number(confidence);
    const normalizedConfidence = Number.isFinite(numericConfidence)
      ? Math.max(0, Math.min(100, numericConfidence <= 1 ? numericConfidence * 100 : numericConfidence))
      : null;
    const roundedConfidence = normalizedConfidence != null ? Math.round(normalizedConfidence) : null;

    let fitContent = fitNotes;
    if (typeof fitContent === 'string') {
      const detailLinesFromString = fitContent
        .split(/Â·|·|&middot;/)
        .map(item => item.trim())
        .filter(Boolean);
      fitContent = {
        summaryLines: detailLinesFromString.slice(0, 2),
        summaryLine: detailLinesFromString.slice(0, 2).join(' &middot; '),
        tableRows: [
          { label: 'Chest', you: '&mdash;', garment: '&mdash;', fit: 'Slightly relaxed' },
          { label: 'Shoulders', you: '&mdash;', garment: '&mdash;', fit: 'Relaxed' },
          { label: 'Length', you: '&mdash;', garment: '&mdash;', fit: 'Balanced' },
          { label: 'Sleeve', you: '&mdash;', garment: '&mdash;', fit: 'Comfortable' },
          { label: 'Waist', you: '&mdash;', garment: '&mdash;', fit: 'Regular' }
        ],
        isFallbackTable: true,
        sizeLabel: displaySize
      };
    }

    // Default fallback fit content if undefined (for premium visual completeness)
    if (!fitContent && displaySize) {
      fitContent = {
        summaryLines: ['Chest: Slightly relaxed', 'Length: Balanced'],
        summaryLine: 'Chest: Slightly relaxed &middot; Length: Balanced',
        tableRows: [
          { label: 'Chest', you: '&mdash;', garment: '&mdash;', fit: 'Slightly relaxed' },
          { label: 'Shoulders', you: '&mdash;', garment: '&mdash;', fit: 'Relaxed' },
          { label: 'Length', you: '&mdash;', garment: '&mdash;', fit: 'Balanced' },
          { label: 'Sleeve', you: '&mdash;', garment: '&mdash;', fit: 'Comfortable' },
          { label: 'Waist', you: '&mdash;', garment: '&mdash;', fit: 'Regular' }
        ],
        isFallbackTable: true,
        sizeLabel: displaySize
      };
    }
    if (fitContent && fitContent.sizeLabel) {
      fitContent.sizeLabel = normalizeDisplaySizeLabel(fitContent.sizeLabel);
    }
    if (fitContent && Array.isArray(fitContent.tableRows) && fitContent.tableRows.length === 0 && displaySize) {
      fitContent.tableRows = [
        { label: 'Chest', you: '&mdash;', garment: '&mdash;', fit: 'Slightly relaxed' },
        { label: 'Shoulders', you: '&mdash;', garment: '&mdash;', fit: 'Relaxed' },
        { label: 'Length', you: '&mdash;', garment: '&mdash;', fit: 'Balanced' },
        { label: 'Sleeve', you: '&mdash;', garment: '&mdash;', fit: 'Comfortable' },
        { label: 'Waist', you: '&mdash;', garment: '&mdash;', fit: 'Regular' }
      ];
      fitContent.isFallbackTable = true;
    }

    let confidenceHtml = '';
    if (roundedConfidence != null && roundedConfidence > 0) {
      confidenceHtml = `
        <div class="stylique-result-confidence" role="group" aria-label="Fit confidence">
          <span class="stylique-result-confidence-label">Fit confidence</span>
          <div class="stylique-result-confidence-bar" aria-hidden="true">
            <div class="stylique-result-confidence-fill" style="width: ${roundedConfidence}%;"></div>
          </div>
          <span class="stylique-result-confidence-value">${roundedConfidence}%</span>
        </div>`;
    }

    let fitSummaryLineHtml = '';
    if (fitContent && (typeof fitContent.summaryLine === 'string' || (Array.isArray(fitContent.summaryLines) && fitContent.summaryLines.length > 0))) {
      const summaryLine = fitContent.summaryLine || [
        ...(Array.isArray(fitContent.summaryLines) ? fitContent.summaryLines.slice(0, 2) : [])
      ].filter(Boolean).join(' &middot; ');

      fitSummaryLineHtml = `<p class="stylique-result-item-fit-summary-line stylique-result-item-fit-summary-line-single">${summaryLine}</p>`;
    }

    let detailsHtml = '';
    const tableRows = fitContent && Array.isArray(fitContent.tableRows) ? fitContent.tableRows : [];
    if (tableRows.length > 0) {
      const sizeLabel = fitContent.sizeLabel ? `Size ${fitContent.sizeLabel}` : 'Garment';
      const tableNote = fitContent.isFallbackTable
        ? '<p class="stylique-result-fit-table-note">Full measurement values appear after user and size-chart data are connected.</p>'
        : '';
      const rowsHtml = tableRows.map(row => `
        <tr>
          <td>${row.label}</td>
          <td>${row.you}</td>
          <td>${row.garment}</td>
          <td>${row.fit}</td>
        </tr>
      `).join('');

      detailsHtml = `
        <div class="stylique-result-fit-details">
          <button type="button" class="stylique-result-fit-details-summary" aria-expanded="false" onclick="window.toggleStyliqueFitDetails(this, event)">
            <span>Fit details</span>
            <svg class="stylique-result-fit-details-icon" fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24" width="14"><path d="M6 9l6 6 6-6"></path></svg>
          </button>
          <div class="stylique-result-fit-popover" role="dialog" aria-label="Fit details" onclick="event.stopPropagation()">
            <div class="stylique-result-fit-popover-header">
              <span>Fit details</span>
              <button type="button" class="stylique-result-fit-popover-close" aria-label="Close fit details" onclick="window.closeStyliqueFitDetails(this, event)">&times;</button>
            </div>
            <table class="stylique-result-fit-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>You</th>
                  <th>${sizeLabel}</th>
                  <th>Fit</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            ${tableNote}
          </div>
        </div>`;
    }

    const fitHtml = fitSummaryLineHtml || detailsHtml
      ? `<div class="stylique-result-item-fit-summary" aria-label="Fit summary">${fitSummaryLineHtml}${detailsHtml}</div>`
      : '';

    container.innerHTML = `
      <div class="stylique-result-item-card">
        <div class="stylique-result-item-main">
          ${image ? `<div class="stylique-result-item-thumb-wrap"><img class="stylique-result-item-thumb" src="${image}" alt="${title}"></div>` : ''}
          <div class="stylique-result-item-info">
            <div class="stylique-result-item-heading">
              <p class="stylique-result-item-name">${title}</p>
              ${sizeHtml}
            </div>
            ${fitHtml}
          </div>
        </div>
        ${confidenceHtml ? `<div class="stylique-result-confidence-row">${confidenceHtml}</div>` : ''}
      </div>`;
  }
  
  // Build the "Complete the Look" horizontally scrolling carousel.
  async function buildCompleteTheLook(productId) {
    const container = document.getElementById('stylique-complete-look-container');
    const carousel = document.getElementById('stylique-suggestions-carousel');
    if (!container || !carousel) return;
    
    // Resolve product ID or fallback safely
    let numericProductId = null;
    if (productId) {
      numericProductId = productId.toString().includes('/') ? productId.split('/').pop() : productId;
    } else if (window.styliqueOptions && window.styliqueOptions.currentProduct && window.styliqueOptions.currentProduct.id) {
      numericProductId = window.styliqueOptions.currentProduct.id;
    }

    try {
      let data = { products: [] };

      // 1. Attempt Stylique outfit recommendations first.
      try {
        const userId = window.styliqueOptions.user?.id;
        if (userId && numericProductId) {
          const response = await styFetch(STYLIQUE_API_BASE + '/api/plugin/complete-look', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId: window.styliqueOptions.storeId,
              productId: numericProductId,
              userId: userId,
              currentUrl: window.styliqueOptions.currentUrl,
              limit: 4
            })
          });
          if (response.ok) {
            const completeLookData = await response.json();
            if (completeLookData.success && Array.isArray(completeLookData.outfits)) {
              data.products = completeLookData.outfits
                .flatMap(outfit => Array.isArray(outfit.items) ? outfit.items : [])
                .map(item => ({
                  title: item.product_name || item.title || 'Product',
                  price: item.price || 59.00,
                  featured_image: item.image_url || item.featured_image || '',
                  url: item.product_link || item.url || '#'
                }))
                .filter(item => item.title && item.featured_image)
                .slice(0, 4);
            }
          }
        }
      } catch (e) {
        // Ignore recommendation failure and fall back to WooCommerce catalog.
      }

      // 2. Fallback to WooCommerce Store API if outfit data is empty.
      try {
        if (!data.products || data.products.length === 0) {
          const fallbackRes = await fetch('/wp-json/wc/store/v1/products?per_page=4');
          if (fallbackRes.ok) {
            const fallbackProducts = await fallbackRes.json();
            if (Array.isArray(fallbackProducts)) {
              data.products = fallbackProducts
                .filter(p => !numericProductId || String(p.id) !== String(numericProductId))
                .slice(0, 4)
                .map(p => {
                  const image = Array.isArray(p.images) && p.images[0] ? p.images[0].src : '';
                  const rawPrice = p.prices && p.prices.price ? Number(p.prices.price) : 5900;
                  const minorUnit = p.prices && Number.isFinite(Number(p.prices.currency_minor_unit))
                    ? Number(p.prices.currency_minor_unit)
                    : 2;
                  const parsedPrice = Number.isFinite(rawPrice) ? rawPrice / Math.pow(10, minorUnit) : 59.00;
                  return {
                    title: p.name || 'Product',
                    price: parsedPrice,
                    featured_image: image,
                    url: p.permalink || '#'
                  };
                });
            }
          }
        }
      } catch (e) {
        // Ignore catalog failure and use visual fallback below.
      }

      // 3. ULTIMATE FALLBACK: For local testing or blank stores, inject premium mock data!
      if (!data.products || data.products.length === 0) {
        data.products = [
          { title: "Classic Denim Jacket", price: 89.00, featured_image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=80", url: "#" },
          { title: "Minimalist White Sneakers", price: 65.00, featured_image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&q=80", url: "#" },
          { title: "Premium Wool Beanie", price: 32.00, featured_image: "https://images.unsplash.com/photo-1576871337645-33a5fbdf6b32?w=200&q=80", url: "#" },
          { title: "Canvas Tote Bag", price: 45.00, featured_image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200&q=80", url: "#" }
        ];
      }

      // Render the result
      if (data.products && data.products.length > 0) {
        let html = '';
        data.products.forEach(p => {
          let imgUrl = p.featured_image || 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=80';
          if (imgUrl.includes('cdn.shopify.com')) {
            imgUrl = imgUrl.replace(/(\.[^.]*)$/, '_200x200$1');
          }
          
          let parsedPrice = 59.00;
          if (typeof p.price === 'number') {
            parsedPrice = p.price > 1000 ? p.price / 100 : p.price;
          } else if (typeof p.price === 'string') {
            parsedPrice = parseFloat(p.price);
          }
          const price = parsedPrice.toFixed(2);
          
          html += `
            <a href="${p.url}" class="stylique-suggestion-card">
              <div class="stylique-suggestion-img-wrap">
                <img src="${imgUrl}" alt="${p.title}">
              </div>
              <div class="stylique-suggestion-info">
                <p class="stylique-suggestion-title">${p.title}</p>
                <p class="stylique-suggestion-price">$${price}</p>
              </div>
            </a>
          `;
        });
        
        carousel.innerHTML = html;
        container.style.display = 'block';
      }
    } catch (error) {
      console.warn('Stylique: Fatal UI error in Complete The Look generation.', error);
    }
  }

  function hideResultView() {
    console.log('🔄 hideResultView: Restoring interface...');
    const resultView = document.getElementById('stylique-result-view');
    const mainInterface = document.getElementById('stylique-tryon-interface');

    if (resultView) {
      resultView.style.cssText = 'display: none !important;';
      resultView.classList.remove('show-result');
      resultView.classList.remove('is-visible');
      
      const resultImg = document.getElementById('stylique-result-main-image');
      const loadingState = document.getElementById('stylique-result-image-loading');
      const errorState = document.getElementById('stylique-result-image-error');
      
      if (resultImg) {
        resultImg.src = '';
        resultImg.style.display = 'none';
        resultImg.style.opacity = '0';
      }
      if (loadingState) loadingState.style.display = 'none';
      if (errorState) errorState.style.display = 'none';
    }

    if (mainInterface) {
      // Re-enable main interface visibility
      mainInterface.style.cssText = 'display: block !important; visibility: visible !important;';
      
      // Re-enable padding on parent
      const mainSection = document.getElementById('stylique-main-section');
      if (mainSection) {
        mainSection.style.padding = '';
      }
      
      const modalContent = document.querySelector('.stylique-modal-content');
      if (modalContent) {
        modalContent.style.overflow = '';
      }
    }

    // Restore headers
    document.querySelectorAll('.stylique-tryon-header').forEach(el => el.style.display = '');
  }

  // Legacy function — kept for backward compat but no longer used
  async function loadSizeRecommendationForResult(productId) {
    // Redirect to new V2 function
    const product = window.styliqueOptions.currentProduct || {};
    const productTitle = product.title || <?php echo isset( $product ) && $product ? wp_json_encode( $product->get_name() ) : '""'; ?>;
    const productImage = product.featured_image || <?php echo isset( $product ) && $product && $product->get_image_id() ? wp_json_encode( wp_get_attachment_image_url( $product->get_image_id(), 'medium' ) ) : '""'; ?>;
    const productUrl = product.url || <?php echo isset( $product ) && $product ? wp_json_encode( $product->get_permalink() ) : '""'; ?>;
    await loadSizeRecommendationForResultV2(productId, productTitle, productImage, productUrl);
  }

  function downloadResultImage() {
    const resultImg = document.getElementById('stylique-result-main-image');
    if (!resultImg || !resultImg.src) {
      alert('No result image to download');
      return;
    }

    const downloadBtn = document.getElementById('stylique-result-download');
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.style.opacity = '0.5';
    }

    try {
      const canvas = document.createElement('canvas');
      const img = new Image();

      img.crossOrigin = 'anonymous';
      img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const productName = window.styliqueOptions.currentProduct?.title || 'product';
        const filename = `stylique-tryon-${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;

        canvas.toBlob(function(blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
          }
        }, 'image/png');
      };

      img.onerror = function() {
        console.error('Failed to load image for download');
        // Fallback: open image in new tab
        window.open(resultImg.src, '_blank');
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.style.opacity = '1';
        }
      };

      img.src = resultImg.src;
    } catch (error) {
      console.error('Download failed:', error);
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
      }
    }
  }

  function resetTryOnFromResult() {
    hideResultView();
    resetTryOn();
  }

  // Make functions globally available (deduplicated)
  window.logoutFromStylique = logoutFromStylique;
  window.sendOTP = sendOTP;
  window.verifyOTP = verifyOTP;
  window.resendOTP = resendOTP;
  window.changeEmail = changeEmail;
  window.showLoginBenefits = showBenefitsModal;
  window.hideBenefitsModal = hideBenefitsModal;
  window.hideResultsModal = hideResultsModal;
  window.hide3DResultsModal = hide3DResultsModal;
  window.start2DTryOn = start2DTryOn;
  window.start3DTryOn = start3DTryOn;
  window.resetTryOn = resetTryOn;
  window.addToCart = addToCart;
  window.showResultView = showResultView;
  window.hideResultView = hideResultView;
  window.downloadResultImage = downloadResultImage;
  window.resetTryOnFromResult = resetTryOnFromResult;
  window.buildItemsInThisLook = buildItemsInThisLook;
  // 3D viewer controls
  window.rotate3DModel = rotate3DModel;
  window.reset3DView = reset3DView;
  window.zoomIn3D = zoomIn3D;
  window.zoomOut3D = zoomOut3D;
  window.toggleFullscreen3D = toggleFullscreen3D;
  window.download3DModel = download3DModel;
  // Onboarding functions
  window.showOnboardingModal = showOnboardingModal;
  window.hideOnboardingModal = hideOnboardingModal;
  window.goToOnboardingStep1 = goToOnboardingStep1;
  window.goToOnboardingStep2 = goToOnboardingStep2;
  window.selectBodyType = selectBodyType;
  window.completeOnboarding = completeOnboarding;
  // Inline onboarding functions
  window.inlineOnboardingNext = inlineOnboardingNext;
  window.inlineOnboardingBack = inlineOnboardingBack;
  window.selectInlineBodyType = selectInlineBodyType;
  window.completeInlineOnboarding = completeInlineOnboarding;
  window.skipInlineOnboarding = skipInlineOnboarding;
  window.extractSkinTone = extractSkinTone;
  window.trackConversion = trackConversion;

  function lockStyliqueBodyScroll(lockKey) {
    const key = lockKey || 'main';
    if (!window.styliqueBodyScrollLocks) {
      window.styliqueBodyScrollLocks = new Set();
    }

    if (window.styliqueBodyScrollLocks.size === 0) {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      window.styliqueBodyScrollState = {
        scrollY,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow
      };

      document.documentElement.classList.add('stylique-modal-open');
      document.body.classList.add('stylique-modal-open');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }

    window.styliqueBodyScrollLocks.add(key);
  }

  function unlockStyliqueBodyScroll(lockKey) {
    const key = lockKey || 'main';
    const locks = window.styliqueBodyScrollLocks;
    if (!locks) return;

    locks.delete(key);
    if (locks.size > 0) return;

    const state = window.styliqueBodyScrollState || {};
    document.documentElement.classList.remove('stylique-modal-open');
    document.body.classList.remove('stylique-modal-open');
    document.body.style.position = state.position || '';
    document.body.style.top = state.top || '';
    document.body.style.left = state.left || '';
    document.body.style.right = state.right || '';
    document.body.style.width = state.width || '';
    document.body.style.overflow = state.overflow || '';

    const restoreY = Number.isFinite(state.scrollY) ? state.scrollY : 0;
    window.styliqueBodyScrollState = null;
    window.requestAnimationFrame(() => window.scrollTo(0, restoreY));
  }

  function initStyliqueMobileModalPolish() {
    if (window.styliqueMobileModalPolishBound) return;

    const modalContent = document.querySelector('#stylique-modal .stylique-modal-content');
    if (!modalContent) return;

    window.styliqueMobileModalPolishBound = true;
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
    let touchStartY = 0;
    let touchStartX = 0;
    let trackingSwipe = false;
    let downwardSwipe = false;
    let swipeScrollTarget = modalContent;
    const getSwipeScrollTarget = (event) => {
      let el = event.target;
      while (el && el !== modalContent) {
        const style = window.getComputedStyle(el);
        const canScrollY = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
        if (canScrollY) return el;
        el = el.parentElement;
      }
      return modalContent;
    };

    modalContent.addEventListener('touchstart', (event) => {
      if (!isMobile() || event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStartY = touch.clientY;
      touchStartX = touch.clientX;
      swipeScrollTarget = getSwipeScrollTarget(event);
      trackingSwipe = swipeScrollTarget.scrollTop <= 0;
      downwardSwipe = false;
    }, { passive: true });

    modalContent.addEventListener('touchmove', (event) => {
      if (!trackingSwipe || !isMobile() || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const deltaY = touch.clientY - touchStartY;
      const deltaX = touch.clientX - touchStartX;
      downwardSwipe = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);

      if (downwardSwipe && swipeScrollTarget.scrollTop <= 0) {
        event.preventDefault();
      }
    }, { passive: false });

    modalContent.addEventListener('touchend', (event) => {
      if (!trackingSwipe || !isMobile()) return;
      const touch = event.changedTouches && event.changedTouches[0];
      const deltaY = touch ? touch.clientY - touchStartY : 0;

      if (downwardSwipe && deltaY >= 80 && swipeScrollTarget.scrollTop <= 0) {
        window.closeStyliqueModal();
      }

      trackingSwipe = false;
      downwardSwipe = false;
      swipeScrollTarget = modalContent;
    }, { passive: true });

    modalContent.addEventListener('focusin', (event) => {
      if (!isMobile()) return;
      if (event.target && event.target.matches('input, select, textarea')) {
        modalContent.classList.add('stylique-keyboard-active');
      }
    });

    modalContent.addEventListener('focusout', () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (!active || !modalContent.contains(active) || !active.matches('input, select, textarea')) {
          modalContent.classList.remove('stylique-keyboard-active');
        }
      }, 0);
    });
  }

  // Modal functions
  window.openStyliqueModal = function () {
    const modal = document.getElementById('stylique-modal');
    if (modal) {
      initStyliqueMobileModalPolish();
      modal.style.display = 'flex';
      lockStyliqueBodyScroll('main');
    }
  };

  window.closeStyliqueModal = function () {
    const modal = document.getElementById('stylique-modal');
    if (modal) {
      const modalContent = modal.querySelector('.stylique-modal-content');
      const processingOverlay = modal.querySelector('#stylique-processing-overlay');
      if (modalContent) modalContent.classList.remove('stylique-keyboard-active', 'stylique-processing-active');
      if (processingOverlay) processingOverlay.classList.remove('is-active', 'is-hiding');
      modal.style.display = 'none';
      unlockStyliqueBodyScroll('main');
    }
  };

  // Global "Add to Cart" Listener
  document.addEventListener('submit', function(e) {
    if (e.target && e.target.action && e.target.action.includes('/cart/add')) {
       // Best effort to get product ID from form input
       const idInput = e.target.querySelector('[name="id"]');
       if (idInput && window.styliqueOptions.user) {
         // We might not have the exact Shopify Product ID easily mappable to our DB ID here
         // But we pass what we have. If store_id + product_id match logic is consistent.
         // In this context, we'll try to use the current product context if available, or just log.
         // For now, let's assume if they are on the product page, window.styliqueOptions.currentProduct might have data OR we rely on liquid injection.
         // But window.styliqueOptions.currentProduct is only set during Try-On flow.
         // A more robust way:
         /* 
            Since this snippet is usually on the product page, we can inject the product ID via Liquid.
         */
         const currentPageProductId = <?php echo isset( $product ) && $product ? wp_json_encode( $product->get_id() ) : '""'; ?>;
         if (currentPageProductId) {
            trackConversion(currentPageProductId);
         }
       }
    }
  });

  // Also listen for clicks on things that look like Add to Cart buttons (ajax carts)
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[name="add"], .product-form__submit, .add-to-cart');
    if (target && window.styliqueOptions.user) {
       const currentPageProductId = <?php echo isset( $product ) && $product ? wp_json_encode( $product->get_id() ) : '""'; ?>;
       if (currentPageProductId) {
          trackConversion(currentPageProductId);
       }
    }
  });
})();
</script>
