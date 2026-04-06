# Database Column Verification

## Check Images Column Status

Run this in Supabase SQL Editor:

```sql
-- Check if images column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory' AND column_name = 'images';
```

If returns empty result, add the column:

```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_inventory_images ON inventory USING GIN (images);
```

## Verify After Adding

```sql
SELECT 
  id,
  product_name,
  images,
  json_array_length(images) as image_count
FROM inventory 
WHERE product_name LIKE '%test%' OR product_name LIKE '%blue%'
ORDER BY updated_at DESC 
LIMIT 5;
```

Expected structure:
```
id                | product_name | images                        | image_count
prod-uuid-...     | Test Product | ["url1", "url2", "url3", ...] | 3
```

## After Deploy

Once backend is restarted with new code:
1. Re-sync product in WordPress admin
2. Check Supabase to verify images column populated
3. Check `/plugin/check-product` API response includes images array
4. Frontend carousel should display all images
