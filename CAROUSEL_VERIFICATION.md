# Carousel Implementation - Verification & Debugging

## Implementation Summary

✅ **Carousel.js** - Enhanced with comprehensive debugging
✅ **Carousel.css** - Mobile responsive with accessibility 
✅ **tryon-script.js** - Tier routing with detailed logging
✅ **Backend plugin.ts** - Returns images array in response

## The Flow

1. Product page loads → `tryon-script.js` initializes
2. Checks for carousel container in DOM
3. Calls `/plugin/check-product` with product ID
4. Backend queries `inventory` table for `images` field
5. Response includes `product.images` array
6. `applyTierRouting()` called with tier data
7. For Tier 1/2: `StyleiqueCarousel.init()` called with images
8. Carousel renders and attaches event listeners

## Debugging Steps

### Step 1: Open Browser Console
Press **F12** on the product page and look for these exact logs:

**Expected logs (in order):**
```
[Carousel] carousel.js loaded, defining window.StyleiqueCarousel
[DEBUG] Checking for carousel container:
[DEBUG] Carousel container element: FOUND
[DEBUG] window.StyleiqueCarousel defined: function
Stylique Plugin Config Loaded: {storeId: "...", backendUrl: "...", ...}
[DEBUG] check-product payload: ...
[DEBUG] Carousel image selected - index: 0
```

### Step 2: Manual Test - Copy to Console

Run this to see current state:
```javascript
// Check 1: Is carousel JS loaded?
console.log('Carousel loaded:', typeof window.StyleiqueCarousel);

// Check 2: Is container in DOM?
console.log('Container exists:', !!document.getElementById('stylique-product-image-carousel'));

// Check 3: Are product images stored?
console.log('Product images:', window.styliqueSection.productImages);
console.log('Product tier:', window.styliqueSection.productTier);

// Check 4: Is carousel initialized?
console.log('Carousel object:', window.styliqueSection.carousel);
```

### Step 3: Check Backend Response

1. Open **F12 → Network** tab
2. Reload page
3. Look for request: **`check-product`** (POST)
4. Click it → **Response** tab
5. Should see:
```json
{
  "success": true,
  "available": true,
  "product": {
    "id": "...",
    "name": "Product Name",
    "tier": 1,
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
      "https://example.com/image4.jpg"
    ]
  }
}
```

**If `images` array is empty or missing:** Database issue (see Fix #2 below)

### Step 4: Check Network Requests

Still in Network tab:
1. Look for `carousel.css` - should be **200** (green)
2. Look for `carousel.js` - should be **200** (green)
3. Look for image URLs from carousel - should be **200** (loading)

**If 404 on carousel.js/css:** Files not in correct path (see Fix #1)

---

## Common Issues & Fixes

### Issue A: "Carousel Container Not Found"

**Console shows:**
```
[DEBUG] Carousel container element: NOT FOUND
```

**Fix #1a: Verify Container Exists**
1. Open page → F12 → Elements tab
2. Search for: `stylique-product-image-carousel`
3. If not found, check file: `templates/tryon-container.php`
4. Should contain:
```html
<div id="stylique-product-image-carousel" class="stylique-product-carousel-container"></div>
```

**Fix #1b: Cache Issue**
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+F5
- If still not showing, check Database schema

### Issue B: "Product Images Array Empty"

**Console shows:**
```
Stylique: Stored 0 product images for carousel
[DEBUG] Product images: []
```

**Fix #2a: Ensure Database Has Images**

Check Supabase inventory table:
1. Go to Supabase dashboard
2. Navigate to `inventory` table
3. Find your product row
4. Check `images` column
5. Should contain JSON array like:
```json
["https://url1.jpg", "https://url2.jpg", "https://url3.jpg"]
```

**If empty/null:** Product wasn't synced with images

**Fix #2b: Re-sync Product**
1. WordPress Admin → Products → Edit product
2. Upload some gallery images (4+ for Tier 1)
3. Click Save
4. Wait 5-10 seconds
5. Refresh product page
6. Check console again

**Fix #2c: Verify Product Sync**
1. Admin → Products → Edit
2. Scroll to Stylique section (should show below product)
3. Should show sync status
4. If red/error: check backend is running

### Issue C: "Carousel JS Not Loading"

**Console shows:**
```
[DEBUG] window.StyleiqueCarousel defined: undefined
```

**Fix #3a: Verify Files Exist**
```
Check path exists:
/wordpress-stylique-virtual-tryon/assets/js/carousel.js
/wordpress-stylique-virtual-tryon/assets/css/carousel.css
```

**Fix #3b: Clear WP Transients**
In terminal (from WordPress root):
```bash
wp transient delete --all
```

Or in console (Supabase SQL editor):
```sql
-- Clear any cached scripts
DELETE FROM wp_options WHERE option_name LIKE '%transient%carousel%';
```

**Fix #3c: Verify Enqueue in Plugin**
File: `stylique-virtual-tryon.php`

Should contain:
```php
wp_enqueue_script('stylique-carousel-js', 
  plugin_dir_url(__FILE__) . 'assets/js/carousel.js', 
  array(), '1.0.0', true
);
```

### Issue D: "Backend Not Returning Images"

**Network response missing `images` field**

**Fix #4a: Verify Backend Code**
File: `backend/src/routes/plugin.ts` line 31

Should have:
```typescript
const inventorySelect = 'id, product_name, tryon_image_url, image_url, tier, sizes, product_link, images';
```

**Fix #4b: Restart Backend**
```bash
npm run dev
# or
npm start
```

**Fix #4c: Check Backend Logs**
Look for log on backend server:
```
[Plugin] check-product response being sent:
{
  "images": [...]
}
```

If `images: []` in log: Database issue (Fix #2a)

---

## Specific Test Scenario

### Test Product Setup:
1. Create WooCommerce product with 4+ images
2. Set to Tier 1+ (5+ images) or Tier 2 (2-4 images)
3. Save/Sync to Stylique backend

### Expected Result:
- Carousel appears above upload button
- Can swipe/click arrows to navigate
- Dots show at bottom
- Selected image used in try-on

### Console Should Show:
```
[Stylique.applyTierRouting] Initializing carousel for Tier 1 with 4 images
[Carousel.init] Called with: {imagesCount: 4, containerId: "...", hasCallback: true}
[Carousel.renderCarousel] HTML rendered successfully
[Carousel.attachEventListeners] Event listeners attached successfully
[Carousel.init] Initialization complete
```

---

## Production Checklist

Before deploying:

- [ ] `carousel.js` file exists and loads (Network tab shows 200)
- [ ] `carousel.css` file exists and loads (Network tab shows 200)
- [ ] Container div exists: `id="stylique-product-image-carousel"`
- [ ] Backend returns `images` array in `/plugin/check-product`
- [ ] Database `inventory` table has `images` column
- [ ] Tested with Tier 1 product (5+ images)
- [ ] Tested with Tier 2 product (2-4 images)
- [ ] Tested with Tier 3 product (carousel hidden)
- [ ] Carousel works on mobile (swipe)
- [ ] Carousel works on desktop (arrows/dots)
- [ ] Selected image used in 2D try-on
- [ ] Selected image used in 3D try-on

---

## File Locations

**Frontend:**
- `wordpress-stylique-virtual-tryon/assets/js/carousel.js` (with debug logs)
- `wordpress-stylique-virtual-tryon/assets/css/carousel.css` (mobile responsive)
- `wordpress-stylique-virtual-tryon/assets/js/tryon-script.js` (carousel integration with debug logs)
- `wordpress-stylique-virtual-tryon/templates/tryon-container.php` (must contain `<div id="stylique-product-image-carousel">`)

**Backend:**
- `backend/src/routes/plugin.ts` line ~463-495 (builds images array)
- Database: `inventory` table, `images` column

---

## Support Commands

For terminal debugging:

```bash
# Check if product synced
wp db query "SELECT id, product_name, woocommerce_product_id, images FROM inventory WHERE product_name LIKE '%YOUR_PRODUCT%';" --path=/var/www

# Check Supabase directly (if using CLI)
supabase db query "SELECT id, product_name, tier, images FROM inventory LIMIT 5;"

# Restart backend
cd backend && npm run dev

# View backend logs
tail -f backend.log | grep -i carousel
```
