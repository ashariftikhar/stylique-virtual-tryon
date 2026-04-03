# WooCommerce Product Lookup Debug Guide

## Problem
WooCommerce products sync successfully to Supabase, but `/plugin/check-product` cannot find them by `woocommerce_product_id`.

## Solution Deployed

### 1. Backend Changes (commit: 79ab176)

#### Enhanced Logging in `findInventoryForCheckProduct()`
The function now logs:
- ✓ Input parameters (wooProductId type and value)
- ✓ Store UUID being used
- ✓ Each lookup attempt (Shopify ID → WooCommerce ID → URL matching)
- ✓ Actual SQL queries being executed
- ✓ Query results with database values
- ✓ Type information for debugging type mismatches

#### New Debug Endpoint: POST /api/debug/check-product
A temporary diagnostic endpoint that:
- Resolves store ID to UUID
- Lists ALL products in the store (showing woocommerce_product_id values and types)
- Executes the exact query used by check-product
- Returns detailed results for comparison

## Testing Steps

### Step 1: Deploy Backend
After merging commit 79ab176, redeploy the backend service.

### Step 2: Check Backend Logs
When the frontend calls check-product, look for logs like:

```
[Plugin] findInventoryForCheckProduct: store_uuid=37538877-..., wooProductId=36 (type: number)
[Plugin] Attempting WooCommerce ID match: wooStr="36" → wooNum=36 (isFinite: true, > 0: true)
[Plugin] Executing query: SELECT ... FROM inventory WHERE store_id='37538877-...' AND woocommerce_product_id=36
[Plugin] Query result: error=none, data=found (id=abc123, woocommerce_product_id=36)
[Plugin] ✓ MATCHED by woocommerce_product_id=36 (numeric), product_id=abc123
```

### Step 3: Use Debug Endpoint
Test the database query directly:

```bash
POST /api/debug/check-product
Content-Type: application/json

{
  "storeId": "stylique.local",
  "wooProductId": 36
}
```

Response will show:
- Store UUID resolved correctly
- ALL products in store (with their woocommerce_product_id values)
- Specific product lookup result
- Any query errors

### Step 4: Verify in Supabase
If the debug endpoint shows the product, manually verify in Supabase:

```sql
-- Check all products for store
SELECT id, product_name, woocommerce_product_id, store_id 
FROM inventory 
WHERE store_id = (SELECT id FROM stores WHERE store_id = 'stylique.local');

-- Check specific product
SELECT id, product_name, woocommerce_product_id, store_id, tier, product_link
FROM inventory 
WHERE woocommerce_product_id = 36;
```

## Expected Results

### If Everything Works:
1. ✓ Backend shows `✓ MATCHED by woocommerce_product_id=36` in logs
2. ✓ Widget appears on product page
3. ✓ Carousel shows for Tier 1/2 products
4. ✓ Debug endpoint returns the product

### If Still Not Working:

#### Case 1: Debug endpoint finds product but widget doesn't
- Check frontend logs for `/plugin/check-product` call
- Verify storeId is being sent correctly
- Check if woocommerce_product_id field name is correct in frontend

#### Case 2: Debug endpoint shows product is null
- Store UUID lookup might be wrong (check `stores` table)
- Product might have null woocommerce_product_id (needs resync)
- Product might be associated with wrong store

#### Case 3: Data type mismatch
- Debug endpoint will show actual types: `woocommerce_product_id=36 (type: number)` vs `"36" (type: string)`
- If showing string "36" instead of number 36, trigger product resync

## Forcing a Product Resync

In WooCommerce:
1. Edit any product
2. Change any field (e.g., price by $0.01)
3. Save
4. This triggers webhook → backend syncs → woocommerce_product_id updated as integer

## Manual SQL Query for Direct Testing

```sql
-- Find product by ID and verify all relevant fields
SELECT 
  id,
  store_id,
  product_name,
  woocommerce_product_id,
  tier,
  product_link,
  images,
  image_url,
  tryon_image_url
FROM inventory
WHERE woocommerce_product_id = 36
LIMIT 1;

-- Check store exists
SELECT id, store_id FROM stores WHERE store_id = 'stylique.local';

-- Check all products in store
SELECT 
  id,
  product_name,
  woocommerce_product_id,
  tier
FROM inventory
WHERE store_id = '37538877-aaaa-bbbb-cccc-dddddddddddd'
ORDER BY created_at DESC;
```

## Rollback Plan

If debug endpoint reveals the query is broken:

1. Check git log for the database schema changes
2. Verify migration 003 (`woocommerce_product_id` column) is applied
3. Check column type: `desc inventory;` in database
4. Column should be: `woocommerce_product_id int8` (INTEGER)

## Next Steps After Debug

Once the debug endpoint confirms the product exists and the query works:

1. ✓ Remove debug endpoint (or keep it for future troubleshooting)
2. ✓ Test widget on live product page
3. ✓ Verify carousel appears for multi-image products
4. ✓ Test try-on functionality

## Useful Logs to Share if Problem Persists

If the widget still doesn't appear, provide:
1. Output from POST /api/debug/check-product
2. Backend logs while loading product (with [Plugin] markers)
3. Frontend console logs
4. Result of: `SELECT * FROM inventory WHERE woocommerce_product_id = 36;`
