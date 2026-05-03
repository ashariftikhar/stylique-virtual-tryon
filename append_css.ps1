$path = "c:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify\assets\stylique.css"
$content = Get-Content $path -Raw

$overrideCss = @"

/* === PREMIUM UPGRADE OVERRIDES === */

/* Restore 1fr 1fr Grid */
.stylique-modal-grid {
  grid-template-columns: 1fr 1fr !important;
  gap: 2rem !important;
  padding: 1.25rem !important;
}

/* Absolute Close Button */
.stylique-modal-close-abs {
  background: white;
  border: none;
  color: #667085;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.stylique-modal-close-abs:hover {
  background: #f8f9fa;
  color: #111827;
}

/* Left Column Carousel Card */
.stylique-left-column {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  padding: 16px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
.stylique-tryon-header {
  padding-bottom: 16px;
  border-bottom: none;
}

/* Fix Jumping Upload Box */
.stylique-upload-area {
  min-height: 220px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  position: relative;
}

/* Product Card - User Email Top Right */
.stylique-product-info {
  position: relative;
  align-items: flex-start;
}
.stylique-user-info {
  position: absolute;
  top: 16px;
  right: 16px;
}
.stylique-product-image {
  background: linear-gradient(180deg, #f8f9fa 0%, #eef2f6 100%);
  border-radius: 12px;
}

/* Upload Buttons from Old Code */
.stylique-btn-upload-round {
  background: linear-gradient(135deg, var(--stylique-primary), var(--stylique-secondary)) !important;
  color: white !important;
  border: none !important;
}
.stylique-filled-success-icon {
  background: #f3e8ff;
  border-radius: 50%;
  padding: 8px;
  color: #a855f7;
}
.stylique-filled-change-btn {
  background: white !important;
  color: black !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
  border: 1px solid #eee !important;
}

/* Try On Button Gradient Border from Old Code */
.stylique-btn-tryon {
  position: relative;
  background: transparent !important;
  color: var(--stylique-primary) !important;
  border: none !important;
  z-index: 1;
}
.stylique-btn-tryon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50px;
  padding: 2px;
  background: linear-gradient(135deg, var(--stylique-primary), var(--stylique-secondary));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  z-index: -1;
}

"@

$content = $content + $overrideCss
Set-Content -Path $path -Value $content

