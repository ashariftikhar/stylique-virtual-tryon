# WooCommerce Image Carousel Implementation Guide

## Overview
This document details the implementation of an image carousel for the Stylique Virtual Try-On WooCommerce plugin. The carousel displays all available product images (featured + gallery) for Tier 1 (5+ images) and Tier 2 (2-4 images) products.

## What Was Changed

### 1. **carousel.js** - Image Carousel Component
- **Fixed**: Event listener bug (changed `onClick` property to `addEventListener`)
- **Enhanced**: Added image selection callback mechanism
- **Features**:
  - Touch swipe support (mobile)
  - Arrow button navigation (desktop/mobile)
  - Dot indicator navigation
  - Keyboard navigation (ArrowLeft/Right)
  - Callback function when image is selected

#### Key Changes:
```javascript
// Before: Non-functional onclick
prevBtn.onClick = (e) => { ... };

// After: Proper event listener
prevBtn.addEventListener('click', (e) => { ... });

// New: Callback support
function init(images, containerId, options = {}) {
  state.onImageSelect = options.onImageSelect || null;
  // Triggers callback when image selected
}
```

### 2. **carousel.css** - Styling & Responsiveness
- Added box shadow for visual depth
- Improved spacing and margins
- Enhanced mobile responsiveness (480px, 768px breakpoints)
- Added accessibility features (focus indicators)
- Better touch device styling

### 3. **tryon-script.js** - Integration with Try-On System

#### `applyTierRouting(tier)` Updates:
```javascript
// For Tier 3: Hidden
if (tier === 3) {
  carouselContainer.style.display = "none";
}

// For Tier 1/2: Initialized with callback
if ((tier === 1 || tier === 2) && productImages.length > 0) {
  const onImageSelect = function(imageUrl, index) {
    window.styliqueSection.selectedProductImageUrl = imageUrl;
  };
  
  window.styliqueSection.carousel = window.StyleiqueCarousel.init(
    window.styliqueSection.productImages,
    "stylique-product-image-carousel",
    { onImageSelect: onImageSelect }
  );
}
```

#### `start2DTryOn()` and `start3DTryOn()` Updates:
- Both functions now use carousel-selected image if available
- Priority order:
  1. Carousel current image: `window.styliqueSection.carousel.getCurrentImage()`
  2. Stored product image: `window.styliqueSection.selectedProductImageUrl`
  3. Config product image: `styliqueConfig.product.image`

## How It Works

### 1. Product Availability Check
When a product page loads:
1. `checkProductAvailability()` is called
2. Backend returns product data with:
   - `tier` (1, 2, or 3)
   - `images` array (all product images)
   - `tryon_image_url` (primary image)

### 2. Carousel Initialization
Based on product tier:
- **Tier 1 (5+ images)**: Carousel shown with all images
- **Tier 2 (2-4 images)**: Carousel shown with all images
- **Tier 3 (<2 images)**: Carousel hidden, show size recommendations only

### 3. Image Selection
User can navigate carousel via:
- **Swipe gestures** (mobile) - drag left/right
- **Arrow buttons** (left/right arrows) - click to previous/next
- **Dot indicators** - click specific image
- **Keyboard** - ArrowLeft/Right keys (when carousel is focused)

### 4. Try-On Request
When user clicks "2D Try-On" or "3D Try-On":
1. System gets current selected image from carousel
2. Image URL is included in try-on request
3. Backend processes try-on with selected product image

## Testing Guide

### Prerequisites
- WooCommerce store with Stylique plugin installed
- Product synced to Stylique backend
- Product with 4+ images (to trigger carousel)

### Test Cases

#### Test 1: Carousel Appears for Tier 1 Product
1. Navigate to a product with 5+ images
2. **Expected**: Carousel visible below product details
3. **Verify**: All product images are displayable via carousel

#### Test 2: Carousel Appears for Tier 2 Product
1. Navigate to a product with 2-4 images
2. **Expected**: Carousel visible
3. **Verify**: All images displayable

#### Test 3: Carousel Hidden for Tier 3 Product
1. Navigate to a product with <2 images
2. **Expected**: No carousel visible
3. **Verify**: Only size recommendations/styling shown

#### Test 4: Swipe Navigation (Mobile)
1. Open on mobile device (or Chrome DevTools mobile emulation)
2. Swipe left on carousel
3. **Expected**: Move to next image
4. Swipe right
5. **Expected**: Move to previous image

#### Test 5: Arrow Button Navigation
1. Open on desktop or tablet
2. Click right arrow
3. **Expected**: Move to next image
4. Click left arrow
5. **Expected**: Move to previous image

#### Test 6: Dot Indicator Navigation
1. Click on a dot indicator
2. **Expected**: Jump to that image
3. **Verify**: Dot indicator shows active state (wider, white)

#### Test 7: Keyboard Navigation
1. Click arrow button (to focus carousel)
2. Press ArrowRight key
3. **Expected**: Move to next image
4. Press ArrowLeft key
5. **Expected**: Move to previous image

#### Test 8: Selected Image in Try-On
1. Open product with 4+ images
2. Select different image in carousel
3. Upload your photo
4. Click "2D Try-On"
5. **Expected**: Try-on uses the carousel-selected image (not the default)

#### Test 9: Responsive Design
1. Test on mobile (480px)
2. **Expected**: Navigation buttons smaller, dots adjusted
3. Test on tablet (768px)
4. **Expected**: Medium-sized buttons and dots
5. Test on desktop (1024px+)
6. **Expected**: Full-size carousel with comfortable spacing

#### Test 10: Comparison with Shopify
1. Open Shopify widget test (if available)
2. Open WooCommerce widget
3. **Expected**: Similar carousel behavior, navigation, and feel
4. **Verify**: Both support same interaction patterns

## Troubleshooting

### Issue: Carousel Not Showing
**Solution**:
1. Check browser console for errors
2. Verify product tier: should be 1 or 2
3. Verify `productImages` array has data
4. Check carousel container ID matches: `stylique-product-image-carousel`
5. Ensure `carousel.js` is loaded (check Network tab)

### Issue: Images Not Selectable
**Solution**:
1. Check if `onClick` is used instead of `addEventListener` (should be fixed)
2. Verify dots and arrows have proper event listeners
3. Check console for JavaScript errors

### Issue: Selected Image Not Used in Try-On
**Solution**:
1. Verify callback is firing (check console logs)
2. Check `selectedProductImageUrl` is being updated
3. Verify try-on request includes image URL parameter

### Issue: Mobile Swipe Not Working
**Solution**:
1. Check touch event listeners are attached
2. Verify swipe distance threshold (50px)
3. Check for CSS `touch-action` interference

## Console Debugging

Enable detailed logging by checking browser console:

```javascript
// Verify carousel initialization
console.log('Carousel images:', window.styliqueSection.productImages);
console.log('Product tier:', window.styliqueSection.productTier);

// Verify image selection
console.log('Selected image:', window.styliqueSection.carousel.getCurrentImage());

// Verify callback
console.log('Selected product image URL:', window.styliqueSection.selectedProductImageUrl);
```

## Files Modified

1. `/assets/js/carousel.js` - Event listeners, callback mechanism
2. `/assets/css/carousel.css` - Styling, responsiveness, accessibility
3. `/assets/js/tryon-script.js` - Carousel integration, tier routing, try-on functions
4. `/templates/tryon-container.php` - Already contains carousel container

## Performance Considerations

- Carousel initializes only for Tier 1/2 products
- Images are displayed one at a time (no preloading of hidden images)
- CSS transitions use GPU-accelerated opacity changes
- Touch events are passive listeners (non-blocking)
- Keyboard navigation only fires when carousel is focused

## Accessibility Features

✓ ARIA labels on buttons and indicators
✓ Keyboard navigation support
✓ Focus indicators (outline on buttons/dots)
✓ Alt text on images
✓ Semantic HTML structure

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- IE11: No support (uses `classList`, modern CSS)

## Future Enhancements

- Auto-play carousel with pause option
- Lazy loading for large image sets
- Thumbnail strip below main image
- Tap-to-zoom functionality
- Image counter (showing "1/5" etc.)
