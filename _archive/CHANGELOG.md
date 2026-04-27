# Changes: Size Extraction Fix & WooCommerce Bulk Sync

## 1. Fixed Size Extraction for Products with Measurements but No Variants

### Changes Made

#### Shopify (`backend/src/services/shopifySync.ts`)
- **Lines 167-172**: Added logic to extract size keys from measurements when variant sizes are empty
- If a product has no variants (or variant sizes array is empty), but HAS measurements/size chart in metafields:
  - Extract the keys from the measurements object (e.g., "S", "M", "L")
  - Use these as the `sizes` array in the inventory record
  - Log: `[ShopifySync] No variant sizes found, extracted from measurements: S, M, L`

#### WooCommerce (`backend/src/routes/woocommerce.ts`)
- **Lines 41-45**: Added the same size extraction logic
- If no variant sizes but measurements exist in product meta:
  - Extract measurement keys as sizes
  - Log: `[WooCommerce] No variant sizes found, extracted from measurements: S, M, L`
- Also refactored sync logic into a reusable helper function `syncWooCommerceProductToInventory()` (lines 12-140) for use in bulk sync

### How It Works

**Before:**
- Product with size chart but no variants → sizes array = [] → widget shows nothing

**After:**
- Product with size chart but no variants → extract keys from measurements → sizes = ["S", "M", "L"] → widget shows proper sizes

---

## 2. Added WooCommerce Initial Bulk Sync Endpoint

### New Endpoint

**POST** `/api/woocommerce/bulk-sync`

### Request Body

```json
{
  "store_id": "myshop.com",
  "woocommerce_url": "https://myshop.com",
  "consumer_key": "ck_...",
  "consumer_secret": "cs_..."
}
```

**Parameters:**
- `store_id` (required): The WordPress/WooCommerce site domain or store slug (e.g., "myshop.com")
- `woocommerce_url` (optional): Full WooCommerce URL. If not provided, defaults to `https://{store_id}`
- `consumer_key` (optional): WooCommerce API consumer key. Required if products are not public
- `consumer_secret` (optional): WooCommerce API consumer secret. Required if products are not public

### Response

```json
{
  "status": "success",
  "message": "WooCommerce bulk sync completed",
  "results": {
    "synced": 42,
    "failed": 2,
    "total": 44
  }
}
```

### How It Works

1. **Store Lookup**: Find the store record in database by `store_id`
2. **Product Fetching**: Fetch all products from WooCommerce REST API (paginated, 100 per page)
   - Uses public API endpoint: `https://{woocommerce_url}/wp-json/wc/v3/products`
   - Attempts without auth first (for public products)
   - If no credentials provided and products are private (401/403), stops gracefully
3. **Product Syncing**: For each product, sync to inventory using the existing sync logic
   - Extracts variant sizes
   - **Extracts measurement keys as sizes if no variants**
   - Processes images in background
4. **Handles Errors Gracefully**:
   - Failed products don't stop the process
   - Returns count of synced vs. failed

### Usage in WooCommerce Plugin

The WooCommerce plugin can call this endpoint from the settings page:

```javascript
// In plugin settings page (e.g., admin section)
const response = await fetch('https://backend.com/api/woocommerce/bulk-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    store_id: 'myshop.com',
    // Optionally include credentials if products are not public
    // consumer_key: 'ck_...',
    // consumer_secret: 'cs_...',
  }),
});

const data = await response.json();
console.log(`Synced: ${data.results.synced}, Failed: ${data.results.failed}`);
```

---

## 3. Testing

### Test 1: Shopify Product with Size Chart but No Variants

**Setup:**
1. In Shopify admin, create or update a product
2. Add a size chart via metafields (namespace: `custom`, key: `size_chart`)
   - Size chart should have entries like: `S: {...}, M: {...}, L: {...}`
3. **Important**: Remove all variants or ensure product has only "Default Title" variant
4. Sync the product (via webhook or manual trigger)

**Expected Result:**
- Product synced successfully
- `sizes` array = `["L", "M", "S"]` (alphabetically sorted keys from measurements)
- In logs: `[ShopifySync] No variant sizes found, extracted from measurements: L, M, S`
- Size recommendation widget shows "S", "M", "L" as available sizes

### Test 2: WooCommerce Product with Size Chart but No Variants

**Setup:**
1. In WooCommerce admin, create or update a product
2. Add a size chart in product meta (meta key: `_size_chart`, `_wc_size_chart`, or `size_chart`)
   - Format: JSON with entries like `{"S": {...}, "M": {...}, "L": {...}}`
3. **Important**: Do NOT add variants for sizes (or leave variant attributes empty)
4. Single product sync via webhook or manual trigger

**Expected Result:**
- Product synced successfully
- `sizes` array = `["L", "M", "S"]` (keys extracted from measurements)
- In logs: `[WooCommerce] No variant sizes found, extracted from measurements: L, M, S`
- Widget shows "S", "M", "L" sizes

### Test 3: WooCommerce Bulk Sync (10+ Products)

**Setup:**
1. Install Stylique Virtual Try-On plugin on WooCommerce site
2. Configure plugin settings (store ID, backend URL)
3. Create 10+ test products in WooCommerce (mix of products with/without size charts)
4. Products should NOT be previously synced

**Test Execution:**
```bash
curl -X POST http://localhost:5000/api/woocommerce/bulk-sync \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "myshop.com"
  }'
```

**Expected Result:**
- HTTP 200 response
- `results.synced` ≥ 10
- `results.failed` = 0 (or minimal)
- Log shows progress for each product:
  ```
  [WooCommerce BulkSync] Synced product 123: Test Product
  [WooCommerce BulkSync] Synced product 124: Another Product
  ...
  ```
- All products appear in inventory database with proper sizes and measurements
- Images are queued for processing in background

### Test 4: With Private Products (Requires API Credentials)

**Setup:**
1. Create WooCommerce store with private products (not publicly visible)
2. Generate WooCommerce API credentials:
   - WooCommerce → Settings → Advanced → REST API
   - Create new key, grant read access to products

**Test Execution:**
```bash
curl -X POST http://localhost:5000/api/woocommerce/bulk-sync \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "myshop.com",
    "consumer_key": "ck_xxxxx",
    "consumer_secret": "cs_xxxxx"
  }'
```

**Expected Result:**
- Successfully fetches and syncs private products
- Same results as Test 3, but with private product access

---

## Files Modified

1. `backend/src/services/shopifySync.ts`
   - Lines 167-172: Size extraction from measurements logic

2. `backend/src/routes/woocommerce.ts`
   - Lines 12-140: New helper function `syncWooCommerceProductToInventory()`
   - Lines 41-45: Size extraction from measurements logic
   - Lines 177-363: Refactored existing sync endpoint to use helper
   - Lines 365-474: New bulk sync endpoint

---

## Database Columns Used

- `inventory.sizes`: Array of size strings (e.g., `["S", "M", "L"]`)
- `inventory.measurements`: Object with size keys mapping to measurement data
- `inventory.woocommerce_product_id`: WooCommerce product ID (for matching)

---

## Environment Variables (No changes required)

The feature uses existing configuration:
- `SHOPIFY_METAFIELD_NAMESPACE` (default: `custom`)
- `SHOPIFY_METAFIELD_KEY` (default: `size_chart`)

---

## Logging

Both implementations add new log lines for debugging:
- `[ShopifySync] No variant sizes found, extracted from measurements: ...`
- `[WooCommerce] No variant sizes found, extracted from measurements: ...`
- `[WooCommerce BulkSync] Fetching products from: ...`
- `[WooCommerce BulkSync] Page X: Got Y products`
- `[WooCommerce BulkSync] Synced product ID: Name`
- `[WooCommerce BulkSync] Complete: synced=X failed=Y`

---

## Future Enhancements

1. Add WP-CLI command for bulk sync from WordPress
2. Store WooCommerce API credentials securely in database
3. Add webhook trigger for bulk sync (can sync one-time on store activation)
4. Add progress endpoint to check bulk sync status (for long operations)
5. Add re-sync functionality (update all existing products)
