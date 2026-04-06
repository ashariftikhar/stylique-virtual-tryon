# WooCommerce Image Carousel Sync - Fix Verification

## ✅ Changes Made

### Backend: woocommerce.ts
**Location**: `backend/src/routes/woocommerce.ts` line ~60-90

**Change**: Extract ALL image URLs from WooCommerce product and store in inventory table

```typescript
// Extract ALL image URLs for carousel (Tier 1/2)
const allImageUrls: string[] = (product.images || [])
  .map((img: WooCommerceImage) => img.src)
  .filter((url: string) => url && url.startsWith('http'));

const baseRecord: Record<string, unknown> = {
  store_id: store.id,
  product_name: productName,
  description,
  price: parseFloat(price),
  image_url: imageUrl,
  sizes: sizes.length > 0 ? sizes : [],
  product_link: product.permalink,
  images: allImageUrls,  // ← NEW: Store all image URLs
};
```

**What this does**:
- Extracts featured image + all gallery images from WooCommerce
- Stores complete array in inventory table's `images` JSONB column
- Data available immediately after sync

### Backend: plugin.ts
**Status**: ✅ Already includes `images` column in query

```typescript
const inventorySelect = 
  'id, product_name, tryon_image_url, image_url, tier, sizes, product_link, images';
```

---

## 🧪 Testing Steps

### Step 1: Create/Edit WooCommerce Product
1. WordPress Admin → Products → Add/Edit product
2. Upload featured image (used as default)
3. Add 4+ gallery images via Gallery section
4. Save product
5. Note the product ID (e.g., 123)

### Step 2: Sync Product to Backend
**Option A: Automatic (if webhook enabled)**
- Product should auto-sync after save
- Wait 5-10 seconds

**Option B: Manual Backend Verification**
- Backend should receive the sync
- Check backend logs for:
```
[WooCommerce Sync] Received request
[WooCommerce Sync] product: {product_name} id: 123
[WooCommerce Sync] Found 4 images for carousel
[WooCommerce Sync] DB operation SUCCESS
```

### Step 3: Verify Database (Supabase)
1. Open Supabase Dashboard
2. Navigate to `inventory` table
3. Find your product (filter by `product_name`)
4. Check the `images` column
5. Should show JSON array:
```json
[
  "https://example.com/image1.jpg",
  "https://example.com/image2.jpg",
  "https://example.com/image3.jpg",
  "https://example.com/image4.jpg"
]
```

**If empty/null**: Check backend logs for errors

### Step 4: Test Frontend API Response
1. Open browser
2. Go to product page
3. Open F12 → Network tab
4. Reload page
5. Look for request: `check-product` (POST)
6. Click it → Response tab
7. Should see:
```json
{
  "success": true,
  "available": true,
  "product": {
    "id": "prod-uuid",
    "name": "Product Name",
    "tryon_image_url": "https://example.com/image1.jpg",
    "tier": 1,
    "sizes": [],
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
      "https://example.com/image4.jpg"
    ]
  }
}
```

### Step 5: Verify Console Logs
Open F12 → Console tab:
```
[Stylique: Stored 4 product images for carousel
[DEBUG] Product images: [0] https://..., [1] https://..., [2] https://..., [3] https://...
[Stylique.applyTierRouting] Checking carousel conditions: {
  ...
  productImagesLength: 4,
  ...
}
[Stylique.applyTierRouting] Initializing carousel for Tier 1 with 4 images
[Carousel.init] Called with: {imagesCount: 4, ...}
[Carousel] Container found, rendering carousel with 4 images
[Carousel.renderCarousel] HTML rendered successfully
[Carousel.attachEventListeners] Event listeners attached successfully
[Carousel.attachEventListeners] Found buttons: {prev: true, next: true}
```

### Step 6: Visual Test - Carousel Display
1. Product page should show carousel
2. Verify elements:
   - [ ] Carousel wrapper visible (gray box above upload area)
   - [ ] First image displays
   - [ ] Previous arrow button visible (left side)
   - [ ] Next arrow button visible (right side)
   - [ ] Dot indicators visible (bottom)
   - [ ] Number of dots = number of images (e.g., 4 dots for 4 images)

### Step 7: Interaction Tests

**Test Arrow Navigation:**
- [ ] Click right arrow → next image shows
- [ ] Click left arrow → previous image shows
- [ ] Arrows loop (last image → first image)

**Test Dot Navigation:**
- [ ] Click dot #2 → image 2 displays
- [ ] Clicked dot shows as active (wider, white)
- [ ] Other dots show inactive (narrower, gray)

**Test Swipe (Mobile):**
- [ ] On mobile/tablet: swipe left → next image
- [ ] Swipe right → previous image

**Test Keyboard (Desktop):**
- [ ] Click arrow button to focus carousel
- [ ] Press ArrowRight key → next image
- [ ] Press ArrowLeft key → previous image

### Step 8: Try-On Integration Test
1. Upload your photo
2. Click "2D Try-On"
3. Check Network tab → find request to backend
4. Verify request includes selected image:
```
form-data:
  image_url: "https://example.com/image3.jpg"  ← Carousel-selected image
```

---

## 📊 Expected Behavior Matrix

| Condition | Tier | Carousel | Reason |
|-----------|------|----------|--------|
| 5+ images | 1 | VISIBLE | Premium tier |
| 2-4 images | 2 | VISIBLE | Standard tier |
| 1 image | 3 | HIDDEN | Low tier |
| 0 images | 3 | HIDDEN | No images |

---

## 🐛 Troubleshooting

### Issue: Images Column Empty in Database

**Check**:
1. Product has gallery images in WP admin
2. Backend received sync (check backend logs)
3. WooCommerce.ts code updated correctly

**Fix**:
- Re-save product in WordPress admin
- Backend should trigger sync again
- Check database again

### Issue: `check-product` Returns Empty Images

**Check**:
1. Supabase inventory row has `images` data (not empty)
2. plugin.ts query includes 'images' in select string (already done ✓)

**Fix**:
- Restart backend server: `npm run dev`
- Force product re-sync from WordPress

### Issue: UI Shows No Carousel

**Check**:
1. Console logs show all [Stylique] messages ✓
2. `productImages.length > 0` in console
3. `tier === 1 or 2` in console

**Debug commands** (paste in console):
```javascript
console.log('Carousel container:', document.getElementById('stylique-product-image-carousel'));
console.log('Product images stored:', window.styliqueSection.productImages);
console.log('Product tier:', window.styliqueSection.productTier);
```

---

## 📋 Verification Checklist

Before declaring complete:
- [ ] Backend woocommerce.ts extracts all images
- [ ] Supabase inventory `images` column populated (JSON array)
- [ ] `/plugin/check-product` response includes images array
- [ ] Frontend console shows [Stylique: Stored N product images]
- [ ] Carousel visible on product page
- [ ] Arrow buttons work
- [ ] Dot indicators work
- [ ] Swipe works on mobile
- [ ] Keyboard navigation works
- [ ] Selected image used in try-on request
- [ ] Tier 3 products hide carousel

---

## 💾 Database Verification Query

**Via Supabase SQL Editor**:
```sql
SELECT 
  id,
  product_name,
  tier,
  images,
  image_url,
  tryon_image_url
FROM inventory
WHERE product_name LIKE '%YOUR_PRODUCT_NAME%'
LIMIT 1;
```

**Expected result**:
```
id                | product_name | tier | images                        | ...
prod-uuid-...     | Test Product | 1    | ["url1", "url2", "url3", ...] | ...
```

---

## 🚀 Deployment Steps

1. **Update backend code** (already done):
   - `backend/src/routes/woocommerce.ts` - has the fix

2. **Restart backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Re-sync product in WordPress**:
   - WordPress Admin → Products → Edit → Save
   - Or trigger webhook via API

4. **Verify in Supabase**:
   - Check `images` column populated

5. **Test on product page**:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+F5)
   - Verify carousel displays

---

## 📞 Quick Links

- **Backend logs**: Check terminal where `npm run dev` runs
- **Supabase**: https://supabase.com/dashboard
- **Frontend code**: `assets/js/carousel.js`
- **Frontend config**: `assets/js/tryon-script.js`
- **PHP plugin**: `stylique-virtual-tryon.php`

---

## Summary

The fix adds 1 field to WooCommerce product sync:
- **What**: Extracts all product images (featured + gallery)
- **Where**: Stored in inventory table's `images` JSONB column
- **Result**: Frontend carousel receives full image array
- **Impact**: Carousel now shows all product images instead of just featured image
