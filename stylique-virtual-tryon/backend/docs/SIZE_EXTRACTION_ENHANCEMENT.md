# Size Extraction Enhancement

## Overview
Updated the Shopify product sync to extract actual size options from product variants instead of defaulting to `["Default Title"]`.

## Changes Made

### 1. Updated `ShopifyRestProduct` Interface
**File:** [src/services/shopifySync.ts](src/services/shopifySync.ts)

Added support for all three Shopify variant option fields:
```typescript
variants?: Array<{
  price?: string;
  option1?: string | null;
  option2?: string | null;  // NEW
  option3?: string | null;  // NEW
}>;
```

### 2. Enhanced `sizesFromVariants()` Function
**File:** [src/services/shopifySync.ts](src/services/shopifySync.ts)

The function now:
- Extracts values from all three option fields (option1, option2, option3)
- Collects unique, non-null, non-empty values across all variants
- Returns a sorted array of unique size values
- Handles edge cases like empty strings and null values

**Example behavior:**
```
Input: Product with variants
  - Variant 1: option1="S", option2="Red", option3=null
  - Variant 2: option1="M", option2="Blue", option3=null
  - Variant 3: option1="L", option2="Black", option3="Cotton"

Output: sizes = ["Black", "Blue", "Cotton", "L", "M", "Red", "S"]
```

## How It Works

When a Shopify product is synced:
1. The `syncShopifyProductToInventory()` function calls `sizesFromVariants()`
2. For each variant in the product, all three option fields are examined
3. Non-null, non-empty values are collected into a Set (ensuring uniqueness)
4. The Set is converted to a sorted array
5. The array is stored in the `sizes` JSONB column in the inventory table

## Testing

### Automated Tests
Run the included test script:
```bash
cd backend
node scripts/test-size-extraction.mjs
```

**Output:** 6 tests pass, verifying:
- ✅ Size in option1 (S, M, L)
- ✅ Color + Size (option1=color, option2=size)
- ✅ Color + Material + Size (all three options)
- ✅ Mixed options across variants
- ✅ Empty/null options are filtered out
- ✅ Empty variants array

### Real Shopify Product Testing
To test with a live Shopify product:

1. Create a product with size variants in your Shopify store
2. Trigger a product sync via the store panel or webhook
3. Verify the sizes are correctly extracted in Supabase:
   ```sql
   SELECT product_name, sizes FROM inventory 
   WHERE shopify_product_id = 'YOUR_PRODUCT_ID';
   ```

Expected output example:
```
product_name: "T-Shirt"
sizes: ["L", "M", "S", "XL"]
```

## Compatibility

- ✅ Products with sizes in option1 (most common)
- ✅ Products with sizes in option2 (when option1 is color)
- ✅ Products with sizes in option3 (complex variants)
- ✅ Products with mixed option assignments
- ✅ Products with null or empty option values
- ✅ Products with no variants

## Benefits

1. **Accurate Size Data:** Extracts actual size values instead of generic defaults
2. **Flexible:** Works regardless of which option field contains size data
3. **Clean:** Removes null/empty values and duplicates
4. **Backward Compatible:** Existing products will have their sizes updated on next sync

## Files Modified

- [src/services/shopifySync.ts](src/services/shopifySync.ts) - Core implementation
- [scripts/test-size-extraction.mjs](scripts/test-size-extraction.mjs) - Test suite (NEW)
