# WooCommerce Carousel - Quick Fix Reference

## What Was Wrong
Backend synced product but only stored 1 image instead of all 4-5 gallery images.

## What's Fixed

### Fix 1: woocommerce.ts (Lines 77-144)
✅ Extract all product images: `allImageUrls = product.images.map(img => img.src)`
✅ Store in baseRecord: `images: allImageUrls`
✅ Log URLs for debugging

### Fix 2: images.ts (Lines 195-224)
✅ Before updating tier/quality: fetch current images from DB
✅ Preserve images array: `images: currentImages` in update
✅ Log preserved count for debugging

---

## Deploy Now

```bash
# 1. Restart backend
cd backend && npm run dev

# 2. Re-sync product
WordPress → Products → Edit → Save

# 3. Verify in Supabase
SELECT product_name, images, json_array_length(images) as count 
FROM inventory WHERE product_name LIKE '%blue%' LIMIT 1;

# 4. Test frontend
Product page should show carousel with all images
```

---

## Expected Logs

**Backend (after re-sync)**:
```
[WooCommerce Sync] Found 5 images for carousel: ["url1", "url2", ...]
[WooCommerce Sync] inventoryRecord.images: ["url1", "url2", ...]
[WooCommerce Sync] Updating with images array: ["url1", "url2", ...]
[WooCommerce Sync] Product synced with 5 images
[Images] Current images array before update: ["url1", "url2", ...]
[Images] ... images_count=5
```

**Frontend (after refresh)**:
```
[Stylique: Stored 5 product images for carousel
[Carousel] Initializing carousel for Tier 1 with 5 images
[Carousel] Initialization complete
```

---

## Verify Success

Checklist:
- [ ] Backend logs show correct image count
- [ ] Database images column has JSON array
- [ ] Frontend carousel visible with all images
- [ ] Arrow buttons work
- [ ] Dot indicators work
- [ ] Swipe works on mobile
- [ ] Tier 1/2 show carousel, Tier 3 hidden

---

## Troubleshooting

**If still 1 image**:
1. Check backend restarted: `npm run dev` running?
2. Check product re-synced: WordPress save triggered?
3. Check logs: Is `allImageUrls.length > 1`?
4. Check database: `images` column shows array?

See: CAROUSEL_COMPLETE_FIX.md for detailed troubleshooting
