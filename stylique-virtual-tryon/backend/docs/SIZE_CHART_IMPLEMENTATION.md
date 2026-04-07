# Size Chart (Measurements) Extraction - Implementation Summary

**Date:** April 7, 2026  
**Status:** ✅ Complete  
**Sprint:** Phase 1 - Size Recommendation Enhancement

---

## Changes Made

### 1. New Utility Module: `src/utils/htmlUtils.ts`

**Purpose:** Provides HTML stripping and size chart parsing utilities used across both Shopify and WooCommerce sync.

**Exports:**
- `stripHtmlTags(html: string | null | undefined): string`
  - Removes HTML tags from product descriptions
  - Converts `<br>` to spaces
  - Decodes HTML entities (`&nbsp;`, `&amp;`, etc.)
  - Collapses multiple spaces into single spaces
  
- `parseSizeChart(data: any): Record<string, Record<string, number>>`
  - Parses size chart from JSON string or object
  - Validates structure: expects `{ "SIZE": { "measurement": value, ... }, ... }`
  - Filters non-numeric values
  - Returns empty object if parsing fails

**Testing:** `scripts/test-size-charts.mjs` includes 10 tests covering:
- HTML entity decoding
- Multiple space collapsing
- JSON parsing (valid and invalid)
- Null/undefined handling
- Non-numeric value filtering
- Real Shopify and WooCommerce formats

---

### 2. Shopify Service Enhancement: `src/services/shopifySync.ts`

**New function: `fetchShopifySizeChartMetafield()`**
- Fetches product metafield from Shopify Admin API
- Configurable namespace (env: `SHOPIFY_METAFIELD_NAMESPACE`, default: `custom`)
- Configurable key (env: `SHOPIFY_METAFIELD_KEY`, default: `size_chart`)
- Parses and returns measurements object
- Comprehensive logging:
  - Logs which namespace/key is being used
  - Logs if metafield was found
  - Logs parse success/failure with size count
  - Warns if meta found but couldn't parse

**Updated: `syncShopifyProductToInventory()`**
- Now accepts optional `accessToken` parameter
- Calls `fetchShopifySizeChartMetafield()` if token provided
- Strips HTML from `body_html` description using `stripHtmlTags()`
- Stores measurements in inventory record under `measurements` JSONB column
- Logs metafield fetch attempts

**Updated: `pullAllShopifyProductsAndSync()`**
- Passes `accessToken` to `syncShopifyProductToInventory()` for all products in bulk import

**Updated webhook handler in `src/routes/shopify.ts`**
- Fetches store's `shopify_access_token` from Supabase
- Passes token to `syncShopifyProductToInventory()` for webhook-triggered syncs

---

### 3. WooCommerce Route Enhancement: `src/routes/woocommerce.ts`

**Updated interfaces:**
- `WooCommerceProduct` now includes optional `meta_data` array

**New function: `extractWooCommerceSizeChart()`**
- Checks meta keys in priority order: `_size_chart`, `_wc_size_chart`, `size_chart`, `wc_size_chart`
- Logs which key was used (or all keys attempted if not found)
- Parses and returns measurements object

**Updated: `/api/sync/woocommerce` endpoint**
- Calls `stripHtmlTags()` on product description
- Calls `extractWooCommerceSizeChart()` on product meta data
- Stores measurements in inventory record
- Includes comprehensive logging for meta key search and parsing

---

## Database

**No schema changes required** – the `inventory.measurements` column was already present as JSONB:

```sql
measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
```

---

## Expected Data Format

### Size Chart JSON Structure

**Size chart must be a JSON object where:**
- **Outer keys** = Size labels (S, M, L, XS, etc.) matching product variants
- **Inner objects** = Measurement key-value pairs (all values must be numeric)

**Example:**
```json
{
  "S": { "chest": 84, "waist": 64, "shoulder": 38, "sleeve": 58, "length": 65 },
  "M": { "chest": 92, "waist": 72, "shoulder": 40, "sleeve": 61, "length": 68 },
  "L": { "chest": 100, "waist": 80, "shoulder": 42, "sleeve": 64, "length": 71 }
}
```

**Common measurement fields:**
- `chest`, `waist`, `hip`, `shoulder`, `sleeve`, `length`, `neck`, `inseam`

---

## Environment Variables

### New Environment Variables (Shopify)

```bash
# Shopify metafield configuration
SHOPIFY_METAFIELD_NAMESPACE=custom        # Default: custom
SHOPIFY_METAFIELD_KEY=size_chart          # Default: size_chart
```

These can be customized if the client uses different namespace/key names.

---

## How Size Recommendations Now Work

### Before (Generic Fallback)
- Size recommendation based on generic ranges (XS: 78-85cm chest, S: 85-92cm, etc.)
- Uses only user's body measurements
- Less accurate fit

### After (Product-Specific)
1. **Customer provides:** Body measurements (chest, waist, etc.)
2. **Stylique fetches:** Product's size chart from inventory.measurements
3. **Stylique compares:** Customer measurements to each size's measurements
4. **Stylique scores:** Weighted score (chest: 35%, waist: 35%, hips: 20%, other: 10%)
5. **Stylique recommends:** Size with highest score + confidence level (high/medium/low)
6. **Fallback:** If no product measurements, uses generic ranges

**Example:**
- Customer has: chest=96, waist=76
- Product S: chest=84, waist=64
- Product M: chest=92, waist=72
- Product L: chest=100, waist=80
- **Recommendation:** Product L (closest match)

---

## Logging

All sync operations include detailed logging to help troubleshoot:

### Shopify Logs
```
[ShopifyMetafield] Found size_chart in namespace="custom", key="size_chart"
[ShopifyMetafield] Successfully parsed size_chart with 5 sizes
[ShopifySync] upsert completed: measurements stored
```

### WooCommerce Logs
```
[WooCommerce] Found size chart in meta key: _size_chart
[WooCommerce] Successfully parsed size_chart with 4 sizes
[WooCommerce] DB operation SUCCESS, inventory id: xxx
```

### Error Logs
```
[ShopifyMetafield] No size_chart found in namespace="custom", key="size_chart"
[WooCommerce] No size chart found in meta keys: _size_chart, _wc_size_chart, ...
[parseSizeChart] Failed to parse JSON string: [error details]
```

---

## Testing

### 1. Unit Tests
Run: `node scripts/test-size-charts.mjs`
- Tests HTML stripping
- Tests JSON parsing
- Tests error handling
- All 10 tests pass ✓

### 2. Integration Testing (Manual)

#### Shopify Test
1. Create/update a product with size variants (S, M, L, XL)
2. Add metafield `custom.size_chart` with valid JSON
3. Trigger sync via store panel or webhook
4. Check Supabase: `SELECT product_name, measurements FROM inventory WHERE shopify_product_id = '...';`
5. Verify measurements column contains the JSON

#### WooCommerce Test
1. Create/update a product with size variants (S, M, L, XL)
2. Add product meta `_size_chart` with valid JSON
3. Trigger sync via store panel or webhook
4. Check Supabase: `SELECT product_name, measurements FROM inventory WHERE woocommerce_product_id = '...';`
5. Verify measurements column contains the JSON

#### Size Recommendation Test
1. Call `/api/recommend-size` endpoint with:
   ```json
   {
     "product_id": "inventory-id",
     "measurements": { "chest": 96, "waist": 76, "hip": 105 }
   }
   ```
2. Verify response includes:
   - `recommended`: Size that matches best
   - `source`: "product_specific" (not "generic")
   - `confidence`: "high"/"medium"/"low" based on match quality

---

## Files Modified/Created

### New Files
- ✅ `src/utils/htmlUtils.ts` – HTML stripping and size chart parsing utilities
- ✅ `scripts/test-size-charts.mjs` – Comprehensive test suite
- ✅ `docs/SIZE_CHART_SETUP_GUIDE.md` – Client documentation

### Modified Files
- ✅ `src/services/shopifySync.ts` – Added metafield fetching + HTML stripping
- ✅ `src/routes/shopify.ts` – Updated webhook handler for metafield access
- ✅ `src/routes/woocommerce.ts` – Added meta key extraction + HTML stripping

---

## Changelog

### Version: Size Chart Extraction v1.0

**Added:**
- ✅ Shopify metafield extraction for size charts
- ✅ WooCommerce meta key extraction for size charts
- ✅ HTML stripping from product descriptions
- ✅ Size-specific measurement storage in `inventory.measurements`
- ✅ Product-specific size recommendation algorithm
- ✅ Comprehensive logging for debugging
- ✅ Client setup documentation

**Fixed:**
- ✅ Descriptions now appear as plain text (no HTML tags)
- ✅ Size recommendations now use product-specific measurements

**TypeScript Compilation:** ✓ PASS (0 errors)

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **Shopify:** Only fetches from one metafield (configurable namespace/key)
2. **WooCommerce:** Tries 4 meta keys, but doesn't auto-detect custom naming
3. **Measurements:** All numeric values in cm (no unit conversion)
4. **Confidence scoring:** Simple weighted average (could be improved with ML)

### Suggested Future Enhancements
1. **Multi-currency units:** Support inches, pounds, kg
2. **Smart unit conversion:** Auto-convert cm ↔ inches
3. **Fit prediction ML:** Train model on fit feedback data
4. **Size range recommendations:** "Out of stock in M, but L is very close"
5. **Brand normalization:** Account for brand-specific fit differences
6. **Regional defaults:** Different size standards (EU vs US vs UK)

---

## Support & Troubleshooting

See `docs/SIZE_CHART_SETUP_GUIDE.md` for:
- Step-by-step Shopify metafield setup
- Step-by-step WooCommerce meta setup
- JSON validation
- Troubleshooting common issues
- Measurement reference guide

---

## Validation Checklist

- ✅ TypeScript compilation passes
- ✅ Shopify metafield fetching implemented
- ✅ WooCommerce meta key extraction implemented
- ✅ HTML stripping works for both platforms
- ✅ Measurements stored in database
- ✅ Size recommendation endpoint uses product measurements
- ✅ Comprehensive logging added
- ✅ Client documentation provided
- ✅ Test script covers all scenarios
- ✅ Error handling graceful (doesn't break sync if size chart missing)

---

**Ready for:** Testing with real client data
