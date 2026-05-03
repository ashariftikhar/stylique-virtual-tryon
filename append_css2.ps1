$path = "c:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify\assets\stylique.css"
$content = Get-Content $path -Raw

$overrideCss = @"

/* Prevent Scrolling on Upload View */
.stylique-modal-content.stylique-upload-view-active {
  overflow-y: hidden !important;
}

"@

$content = $content + $overrideCss
Set-Content -Path $path -Value $content

