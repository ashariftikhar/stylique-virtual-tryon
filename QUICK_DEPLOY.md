# Quick Deploy - WooCommerce Image Carousel Fix

## ✅ What Changed
File: `backend/src/routes/woocommerce.ts`

Added extraction and storage of ALL product images (featured + gallery):
```typescript
// Extract ALL image URLs for carousel
const allImageUrls: string[] = (product.images || [])
  .map((img: WooCommerceImage) => img.src)
  .filter((url: string) => url && url.startsWith('http'));

// Store in inventoryRecord
const baseRecord: Record<string, unknown> = {
  // ... other fields ...
  images: allImageUrls,  // ← Added this line
};
```

## 🚀 Deploy Now

### 1. Restart Backend
```bash
cd backend
npm run dev
```

### 2. Re-Sync Product
- WordPress Admin → Products → Edit → Save
- OR manually trigger sync if configured

### 3. Verify in Supabase
- Open inventory table
- Find your product
- Check `images` column (should have JSON array of URLs)

## 🧪 Quick Test

**In Supabase SQL**:
```sql
SELECT product_name, images FROM inventory 
WHERE product_name = 'Your Product' LIMIT 1;
```

**Expected**: `images` column shows `["url1", "url2", "url3", ...]`

## 📱 Frontend Test

Product page with 4+ images should show:
- Carousel container with all images
- Arrow buttons (left/right)
- Dot indicators (one per image)
- Swipe navigation on mobile

## ✨ That's It!
The images array will now be:
1. ✅ Stored in inventory table
2. ✅ Returned by `/plugin/check-product` API
3. ✅ Displayed in frontend carousel
4. ✅ Used in try-on requests

See `WOOCOMMERCE_IMAGE_SYNC_FIX.md` for detailed testing steps.
