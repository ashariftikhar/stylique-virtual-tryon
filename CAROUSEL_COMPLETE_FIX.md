# WooCommerce Image Carousel - Complete Fix & Deployment

## 🔍 Problem Analysis

**Symptom**: Console shows `Stylique: Stored 1 product images for carousel` despite product having 5 images

**Root Cause**: The `images` field in inventory table was not being populated during sync because:
1. After initial sync stored images in `baseRecord`
2. Then `processProductImages()` updated the row but only updated `tryon_image_url`, `tier`, and `quality_score`
3. The images field was lost/overwritten

## ✅ Fixes Applied

### Fix 1: Enhanced Logging in woocommerce.ts
Added comprehensive debug output:
```typescript
- Log allImageUrls array: [url1, url2, url3, ...]
- Log inventoryRecord.images before update
- Log images count in final sync summary
- Log error details if sync fails
```

### Fix 2: Preserve Images Array in images.ts
`processProductImages()` now:
```typescript
// Fetch current images before update
const currentProduct = await supabase
  .from('inventory')
  .select('images')
  .eq('id', productId)
  .single();

// Preserve images when updating tier/scores
const { error } = await supabase
  .from('inventory')
  .update({ 
    tryon_image_url: bestUrl,
    tier,
    quality_score: bestScore,
    images: currentProduct?.images || []  // ← Preserve!
  })
  .eq('id', productId);
```

### Fix 3: Database Column Verification
Confirmed migration 006 creates:
```sql
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS images jsonb NULL DEFAULT '[]'::jsonb;
```

---

## 🚀 Deployment Steps

### Step 1: Verify Database Column Exists
In Supabase SQL Editor, run:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory' AND column_name = 'images';
```

**If empty result**: Add column:
```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS images jsonb NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_inventory_images ON inventory USING GIN (images);
```

### Step 2: Deploy Backend Code
**Local Development**:
```bash
cd backend
npm run dev
```

**Production (Render)**:
1. Push changes to Git
2. Render auto-deploys
3. Monitor logs: `New service deployed` message

### Step 3: Force Product Re-Sync
In WordPress Admin:
1. Products → Edit any product with 4+ images
2. Make minor change (e.g., add space to description)
3. Click Save
4. Wait 5-10 seconds for sync to complete

### Step 4: Verify Logs
**Local** (terminal where npm run dev runs):
```
[WooCommerce Sync] Found 5 images for carousel: [url1, url2, url3, url4, url5]
[WooCommerce Sync] inventoryRecord.images: [url1, url2, url3, url4, url5]
[WooCommerce Sync] Updating with images array: [url1, url2, url3, url4, url5]
[WooCommerce Sync] DB operation SUCCESS
[WooCommerce Sync] Product synced with 5 images
[Images] Current images array before update: [url1, url2, url3, url4, url5]
[Images] product=... tier=1 ... images_count=5
```

**Production** (Render logs):
- Same logs should appear in Render dashboard

### Step 5: Verify Database
In Supabase SQL Editor:
```sql
SELECT 
  product_name,
  images,
  json_array_length(images) as image_count,
  tier,
  tryon_image_url
FROM inventory 
WHERE product_name LIKE '%blue%' OR product_name LIKE '%test%'
ORDER BY updated_at DESC 
LIMIT 1;
```

**Expected result**:
```
product_name | image_count | tier | images
Blue Shirt   | 5           | 1    | ["url1", "url2", ...]
```

If `image_count` is 0 or 1: Sync didn't update properly → check logs for errors

### Step 6: Test Frontend
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh product page (Ctrl+F5)
3. Open F12 → Console
4. Look for:
```
[Stylique: Stored 5 product images for carousel
[DEBUG] Product images: [0] https://..., [1] https://..., [2] https://..., [3] https://..., [4] https://...
[Stylique.applyTierRouting] Initializing carousel for Tier 1 with 5 images
[Carousel.init] Initialization complete
```

5. Visual check:
   - [ ] Carousel visible above upload area
   - [ ] All 5 images can be navigated
   - [ ] Arrow buttons visible (left/right)
   - [ ] 5 dot indicators visible
   - [ ] Selected image highlighted

### Step 7: Test Interactions
- [ ] Click right arrow → next image
- [ ] Click left arrow → previous image  
- [ ] Click dot #3 → image 3 displays
- [ ] Swipe left (mobile) → next image
- [ ] Swipe right (mobile) → previous image
- [ ] Press ArrowRight key → next image
- [ ] Press ArrowLeft key → previous image

---

## 📋 Troubleshooting

### Issue: "Stored 1 images" still appearing

**Check 1: Backend restarted?**
```bash
npm run dev
# Should see startup logs
```

**Check 2: Product re-synced?**
- WordPress → Edit product → Save
- Check backend log for `[WooCommerce Sync] Found X images`

**Check 3: Database column exists?**
```sql
SELECT * FROM inventory LIMIT 1;
-- Should show 'images' column in results
```

### Issue: Database shows 1 image instead of 4

**Check logs for**:
```
[Images] Current images array before update: [url1]
```

This means `images` field only had 1 URL when `processProductImages()` ran.

**Solution**: 
- Ensure `baseRecord` includes `images: allImageUrls` (already done ✓)
- Re-sync product
- Check if `allImageUrls` array was correctly extracted

### Issue: Logs show correct images but frontend shows 1

**Check**:
1. Refresh page (Ctrl+F5)
2. Verify `/plugin/check-product` response includes images array
3. Network tab → check-product → Response tab
4. Should show `"images": [url1, url2, ...]`

---

## 🔧 Files Modified

1. **backend/src/routes/woocommerce.ts**
   - Added logging of allImageUrls array
   - Log inventoryRecord.images before update
   - Log final image count

2. **backend/src/routes/images.ts**
   - Fetch current images before update
   - Preserve images array when updating tier/scores
   - Log preserved image count

---

## ✅ Verification Checklist

- [ ] Database has `images` column (migration 006 applied)
- [ ] Backend code updated with new logging
- [ ] Backend restarted (`npm run dev`)
- [ ] Product re-synced (edit + save in WordPress)
- [ ] Backend logs show correct image count
- [ ] Database query shows images array populated
- [ ] Frontend console shows stored images
- [ ] Carousel displays with all images
- [ ] Navigation works (arrows/dots/swipe)
- [ ] Tier routing correct (Tier 1/2 show carousel, Tier 3 hidden)

---

## 📱 Expected End Result

**Tier 1 Product (5+ images)**:
```
Product Page
├── Carousel (visible)
│   ├── Image 1 (default shown)
│   ├── Image 2-5 (navigable)
│   ├── Left/Right arrows
│   ├── 5 dot indicators
│   └── Swipe + keyboard support
├── Upload area
└── Try-On buttons
```

**Tier 2 Product (2-4 images)**:
```
Same as Tier 1 but with 2-4 images
```

**Tier 3 Product (<2 images)**:
```
Product Page
├── Upload area (no carousel)
└── Size recommendations only
```

---

## 🚨 If Still Not Working

1. **Check Render deployment**:
   - Render dashboard → select service → Logs
   - Verify new code is deployed

2. **Force clear cache**:
   ```bash
   # Local: restart npm
   npm run dev
   
   # Browser: Ctrl+Shift+Delete → Clear all
   ```

3. **Check sync is triggered**:
   - WordPress → Products → Edit → Change title → Save
   - Watch backend logs for sync message
   - Check database for updated_at timestamp

4. **If database still shows 1 image**:
   - Run migration manually: Check DATABASE_SETUP.md
   - Verify column type is `jsonb` not `text`
   - Delete old product row and re-sync (creates new)

---

## Contact/Support

If carousel still not displaying:
1. Share backend logs (image count from sync)
2. Share database query result
3. Share frontend console logs
4. Share `/plugin/check-product` API response
