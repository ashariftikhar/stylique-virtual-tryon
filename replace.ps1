$path = "c:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify\Shopify_new_tryon_upload_first.liquid"
$content = Get-Content $path -Raw
$headerRegex = "(?s)\s*<div class=`"stylique-tryon-header`">.*?</div>\s*</button>\s*</div>"
$content = $content -replace $headerRegex, ""

$brandingHtml = @"
          <div class="stylique-tryon-header">
            <div class="stylique-tryon-branding">
              <img
                src="{% if section.settings.logo_image %}{{ section.settings.logo_image | img_url: '60x60' }}{% else %}{{ section.settings.logo_url }}{% endif %}"
                alt="Stylique" class="stylique-tryon-logo">
              <div class="stylique-tryon-title">
                <h3>See Yourself Before You Buy</h3>
                <p>Upload a photo and preview how this item looks on you.</p>
              </div>
            </div>
          </div>
"@

$closeBtnHtml = @"
      <button class="stylique-modal-close-abs" onclick="window.closeStyliqueModal()" title="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Two-Column Layout Grid -->
"@

$content = $content -replace "<!-- Two-Column Layout Grid -->", $closeBtnHtml
$content = $content -replace "<div id=`"stylique-product-image-carousel`"", "$brandingHtml`n          <div id=`"stylique-product-image-carousel`""

Set-Content -Path $path -Value $content
