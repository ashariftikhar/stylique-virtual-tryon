# WooCommerce Carousel Debugging Guide

## Quick Test Instructions

1. Go to a WooCommerce product page with 4+ images
2. **Open Browser Console**: Press `F12` or right-click → Inspect → Console tab
3. Look for the logs below

## What To Check in Console

### Step 1: Verify Plugin Loads
You should see:
```
[Carousel] carousel.js loaded, defining window.StyleiqueCarousel
Stylique Plugin Config Loaded: {storeId: "...", backendUrl: "...", ...}
[DEBUG] Checking for carousel container:
[DEBUG] Carousel container element: FOUND
[DEBUG] window.StyleiqueCarousel defined: function
```

**If missing**: The carousel.js file is not loading properly
- Check: Settings → Stylique Try-On → verify Store ID and Backend URL are set
- Browser Network tab (F12 → Network) → search for `carousel.js`

### Step 2: Verify Product Data Fetched
Look for:
```
Stylique check-product payload: {storeId: "...", currentUrl: "...", wooProductId: 123}
Stylique check-product response: {available: true, product: {...}}
Stylique: Product tier: 1
Stylique: Stored 4 product images for carousel
[DEBUG] Product images: [0] https://..., [1] https://..., [2] https://..., [3] https://...
```

**If "Stored 0 product images"**: The backend is not returning images
- Check: Flask backend is running
- Check: Product is synced (admin → Products → Edit → Save)
- Check: WooCommerce product has gallery images uploaded

**If "No product images array in backend response"**: Backend response format is wrong
- Check: Backend `/plugin/check-product` endpoint returns `product.images` array

### Step 3: Verify Carousel Tier Routing
Look for:
```
[Stylique.applyTierRouting] Called with tier: 1
[Stylique.applyTierRouting] DOM elements found: {
  tryOnOptions: true,
  uploadSection: true,
  carouselContainer: true,  ← Should be TRUE
  ...
}
[Stylique.applyTierRouting] Checking carousel conditions: {
  isTier1or2: true,
  hasProductImages: true,
  productImagesLength: 4,
  carouselComponentExists: true,  ← Should be TRUE (function)
  hasCarouselContainer: true  ← Should be TRUE
}
[Stylique.applyTierRouting] Initializing carousel for Tier 1 with 4 images
[Carousel.init] Called with: {imagesCount: 4, containerId: "stylique-product-image-carousel", hasCallback: true}
[Carousel] Container found, rendering carousel with 4 images
[Carousel.renderCarousel] Starting render with 4 images
[Carousel.renderCarousel] HTML rendered successfully
[Carousel.attachEventListeners] Attaching listeners for 4 images
[Carousel.attachEventListeners] Found buttons: {prev: true, next: true}
[Carousel.attachEventListeners] Found 4 dot indicators
[Carousel.attachEventListeners] Attaching touch listeners
[Carousel.attachEventListeners] Event listeners attached successfully
[Carousel.init] Initialization complete
[Stylique.applyTierRouting] Carousel initialized successfully
```

## Common Issues & Solutions

### Issue 1: Carousel Container Not Found
**Console shows**: `[DEBUG] Carousel container element: NOT FOUND`

**Solution**:
1. Check file: `templates/tryon-container.php`
2. Verify it contains: `<div id="stylique-product-image-carousel" class="stylique-product-carousel-container"></div>`
3. If missing, add it before the upload area
4. Clear browser cache (Ctrl+Shift+Delete) and reload

### Issue 2: carousel.js Not Loading
**Console shows**: `[DEBUG] window.StyleiqueCarousel defined: undefined`

**Solution**:
1. Check Network tab (F12 → Network)
2. Reload page
3. Search for "carousel.js"
4. Should show 200 status (success)
5. If 404 or missing:
   - Check plugin directory: `wordpress-stylique-virtual-tryon/assets/js/carousel.js` exists
   - Verify enqueue in plugin file has correct path
   - Clear WP transients: `wp-cli transient delete --all`

### Issue 3: Product Images Not Fetched
**Console shows**: `Stylique: Stored 0 product images for carousel`

**Solution**:
1. Check product has images:
   - WP Admin → Products → Edit product → Gallery section
   - Ensure at least 4 images are uploaded
2. Sync product to backend:
   - Save the product in WP Admin (any minor edit)
   - Wait 5-10 seconds
   - Refresh product page
3. Check backend is running:
   - Open Network tab (F12 → Network)
   - Reload page
   - Look for `check-product` request
   - Should be 200 response (green)
   - If red/fails, backend URL is wrong or server down

### Issue 4: Tier 3 Shows Carousel
**Console shows**: `Stylique: Product tier: 3` BUT carousel visible

**Solution**:
1. Verify product sync:
   - Product should have 2+ high-quality images to be Tier 1/2
   - WP Admin → Edit product → Save
   - Check backend dashboard to confirm tier
2. Force tier change:
   - Backend might cache tier classification
   - Delete product cache and re-sync

### Issue 5: Carousel Shows But Not Functional
**Console shows**: `[Carousel.attachEventListeners] Event listeners attached successfully`
BUT clicks don't work

**Solution**:
1. Check CSS is loaded (F12 → Network → carousel.css should be 200)
2. Right-click carousel → Inspect → Check HTML structure
3. Look for: `<button class="stylique-carousel-prev...">` 
4. Try clicking arrow button → check console for: `[Carousel] Previous clicked`
   - If no log: Event listeners not attached
   - If log appears: CSS might be hiding buttons

### Issue 6: Images Load But Wrong Images
**Console shows**: Multiple images but not the product gallery

**Solution**:
1. Check backend is fetching images correctly:
   - Backend code should get WooCommerce gallery images
   - Verify SQL query returns correct images
2. Check image URLs are valid:
   - Open browser Network tab
   - Click through carousel
   - Monitor if image requests load (200 status)
   - If 404s: URLs might be relative/incorrect

## Manual DOM Check

Open console and run:

```javascript
// Check carousel container
console.log('Carousel container:', document.getElementById('stylique-product-image-carousel'));

// Check stored images
console.log('Stored images:', window.styliqueSection.productImages);

// Check carousel component
console.log('Carousel object:', window.styliqueSection.carousel);

// Check current selected image
console.log('Current image URL:', window.styliqueSection.selectedProductImageUrl);

// Test carousel methods
if (window.styliqueSection.carousel) {
  console.log('Current image:', window.styliqueSection.carousel.getCurrentImage());
  window.styliqueSection.carousel.selectImage(1); // Try selecting image at index 1
  console.log('After selectImage(1):', window.styliqueSection.carousel.getCurrentImage());
}
```

## Test Images Display

In console, run:
```javascript
// Check if images exist and are displayable
const images = document.querySelectorAll('.stylique-carousel-image');
console.log('Found', images.length, 'image elements');
images.forEach((img, i) => {
  console.log(`Image ${i}:`, {
    src: img.src,
    alt: img.alt,
    complete: img.complete,
    width: img.width,
    height: img.height
  });
});
```

## Network Request Debugging

1. Open F12 → Network tab
2. Reload page
3. Look for request: `check-product`
4. Click on it → Preview tab
5. Should show JSON like:
```json
{
  "available": true,
  "product": {
    "id": "prod-uuid",
    "tier": 1,
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
      "https://example.com/image4.jpg"
    ],
    "tryon_image_url": "https://example.com/image1.jpg"
  }
}
```

**If `images` array is missing or empty**: Backend issue
**If images array exists but console shows 0**: Frontend parsing issue

## Reporting Issues

If carousel still doesn't work, provide:
1. Browser console output (copy all [Carousel] and [Stylique] logs)
2. Network tab response for `check-product` request
3. Product ID and product URL
4. Backend server URL and status
5. Browser and version (Chrome, Safari, Edge, etc.)

## Quick Test Commands

Copy-paste into console:

```javascript
// Full debug dump
console.log('=== STYLIQUE CAROUSEL DEBUG ===');
console.log('Plugin version:', styliqueConfig);
console.log('Carousel JS loaded:', typeof window.StyleiqueCarousel);
console.log('Product section state:', window.styliqueSection);
console.log('Product images:', window.styliqueSection.productImages);
console.log('Product tier:', window.styliqueSection.productTier);
console.log('Carousel object:', window.styliqueSection.carousel);
console.log('Container element:', document.getElementById('stylique-product-image-carousel'));
console.log('=== END DEBUG ===');
```

## Performance Check

```javascript
// Check if carousel is causing performance issues
console.time('carousel-select-image');
window.styliqueSection.carousel.selectImage(2);
console.timeEnd('carousel-select-image');
// Should be < 50ms
```
