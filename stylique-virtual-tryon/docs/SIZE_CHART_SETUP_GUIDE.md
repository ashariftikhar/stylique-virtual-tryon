# Size Chart Setup Guide for Stylique

This guide explains how to add product-specific size measurements to your Shopify or WooCommerce store so that Stylique can provide accurate size recommendations to your customers.

## Overview

Stylique now supports storing detailed size measurements for each product size (e.g., chest, waist, shoulder, sleeve, length). These measurements are used to provide personalized size recommendations based on customer body measurements.

**Why this matters:** Instead of generic size recommendations (S, M, L), Stylique can now recommend sizes based on your actual product specifications, providing much more accurate fit predictions.

## Shopify Setup

### Step 1: Add Metafield Definition (Admin Portal)

1. Go to your **Shopify Admin Dashboard**
2. Navigate to **Settings** → **Custom data** → **Metafields**
3. Click **Product metafields**
4. Click **Add definition**
5. Fill in the following:
   - **Namespace**: `custom` (or use your preferred namespace)
   - **Key**: `size_chart` (or use your preferred key)
   - **Name**: `Size Chart` (display name)
   - **Type**: `Rich text` or `Single line text`
6. Click **Save**

**Note:** If you use a different namespace or key, inform your Stylique administrator to update the environment variables:
- `SHOPIFY_METAFIELD_NAMESPACE` (default: `custom`)
- `SHOPIFY_METAFIELD_KEY` (default: `size_chart`)

### Step 2: Add Size Chart Data to Products

1. Go to **Products** in your Shopify admin
2. Select a product
3. Scroll down to the **Metafields** section
4. In the **Size Chart** field, paste JSON data in the following format:

```json
{
  "XS": { "chest": 76, "waist": 56, "shoulder": 36, "sleeve": 55, "length": 62 },
  "S": { "chest": 84, "waist": 64, "shoulder": 38, "sleeve": 58, "length": 65 },
  "M": { "chest": 92, "waist": 72, "shoulder": 40, "sleeve": 61, "length": 68 },
  "L": { "chest": 100, "waist": 80, "shoulder": 42, "sleeve": 64, "length": 71 },
  "XL": { "chest": 108, "waist": 88, "shoulder": 44, "sleeve": 67, "length": 74 },
  "XXL": { "chest": 116, "waist": 96, "shoulder": 46, "sleeve": 70, "length": 77 }
}
```

### Key Requirements for Shopify Size Chart JSON:

- **Outermost keys**: Size labels (XS, S, M, L, XL, XXL, etc.) - must match your product variants
- **Nested object for each size**: Contains measurement keys and numeric values in cm
- **Measurement keys** (use consistent keys):
  - `chest` - chest circumference
  - `waist` - waist circumference
  - `shoulder` - shoulder width
  - `sleeve` - sleeve length
  - `length` - total garment length
  - Feel free to add additional measurements like `hip`, `inseam`, `neck`, etc.

### Example for a T-Shirt:
```json
{
  "S": { "chest": 88, "waist": 84, "shoulder": 38, "length": 65 },
  "M": { "chest": 96, "waist": 92, "shoulder": 40, "length": 68 },
  "L": { "chest": 104, "waist": 100, "shoulder": 42, "length": 71 },
  "XL": { "chest": 112, "waist": 108, "shoulder": 44, "length": 74 }
}
```

### Step 3: Sync Your Products

1. **Option A (Automatic):** If you've already connected Stylique, the product will be synced automatically when you save the metafield.
2. **Option B (Manual):** Trigger a full product sync from the Stylique Store Panel (Admin Dashboard).

### Verification

To confirm the size chart was synced correctly:
1. Log in to your Stylique Store Panel
2. Go to **Products**
3. Find your product
4. Check if **Measurements** shows the size chart data

---

## WooCommerce Setup

### Step 1: Understand Meta Key Naming

Stylique looks for size chart data in the following WooCommerce product meta keys (in priority order):
1. `_size_chart` (private meta)
2. `_wc_size_chart` (private meta)
3. `size_chart` (public meta)
4. `wc_size_chart` (public meta)

You can use any of these keys depending on your WooCommerce setup.

### Step 2: Add Size Chart Data to Products

#### Option A: Using WooCommerce Admin UI

If you've installed a custom fields plugin like [ACF Pro](https://www.advancedcustomfields.com/) or [Meta Box](https://metabox.io/):

1. Go to **Products** → Edit a product
2. Look for a **Size Chart** custom field (if configured by your developer)
3. Paste the JSON data (see format below)
4. Save the product

#### Option B: Using Direct Database Query (Advanced)

If you have direct database access:

```sql
INSERT INTO wp_postmeta (post_id, meta_key, meta_value) 
VALUES (123, '_size_chart', '{"S": {"chest": 84, ...}, ...}');
```

#### Option C: Using WP-CLI (Command Line)

```bash
wp post meta add 123 _size_chart '{"S": {"chest": 84, "waist": 64, ...}, ...}'
```

### Step 3: Size Chart JSON Format for WooCommerce

Use the same JSON format as Shopify:

```json
{
  "S": { "chest": 84, "waist": 64, "shoulder": 38, "sleeve": 58, "length": 65 },
  "M": { "chest": 92, "waist": 72, "shoulder": 40, "sleeve": 61, "length": 68 },
  "L": { "chest": 100, "waist": 80, "shoulder": 42, "sleeve": 64, "length": 71 },
  "XL": { "chest": 108, "waist": 88, "shoulder": 44, "sleeve": 67, "length": 74 }
}
```

### Step 4: Trigger Product Sync

1. **Automatic:** When you update a product in WooCommerce, Stylique webhook automatically triggers a sync.
2. **Manual:** If needed, use **Settings -> Stylique Try-On -> Sync All Products** in WordPress.

The WordPress plugin sends only the supported size chart meta keys to the backend:
`_size_chart`, `_wc_size_chart`, `size_chart`, and `wc_size_chart`.
If the value is valid JSON or an object-like custom field value, the backend stores it in `inventory.measurements`.

### Verification

1. Log in to your Stylique Store Panel
2. Go to **Products**
3. Find your product
4. Check if **Measurements** shows the size chart data

---

## Troubleshooting

### Shopify: Measurements Not Showing

**Check these:**
1. ✓ Did you create the metafield definition with the correct namespace and key?
2. ✓ Did you add the JSON data to the product's metafield?
3. ✓ Is the JSON valid? (Use [jsonlint.com](https://www.jsonlint.com/) to validate)
4. ✓ Do the size labels (XS, S, M, etc.) match your product variants?

**Check logs:**
- See console logs on your server for messages like:
  - `[ShopifyMetafield] Found size_chart in namespace="custom", key="size_chart"`
  - `[ShopifyMetafield] Successfully parsed size_chart with X sizes`

### WooCommerce: Measurements Not Showing

**Check these:**
1. ✓ Is the JSON data added to the correct meta key? (`_size_chart`, `_wc_size_chart`, etc.)
2. ✓ Is the JSON valid?
3. ✓ Do the size labels match your product variants?
4. ✓ Did the webhook trigger? Check "Products" in Stylique admin.

**Check logs:**
- See console logs for messages like:
  - `[WooCommerce] Found size chart in meta key: _size_chart`
  - `[WooCommerce] Successfully parsed size_chart with X sizes`

### JSON Validation Issues

**Common errors:**
- **Missing quotes around keys:** `{"S": ...}` ✓ vs `{S: ...}` ✗
- **Trailing commas:** `{"S": {}, "M": {}}` ✓ vs `{"S": {}, "M": {},}` ✗
- **Non-numeric values:** `"chest": 84` ✓ vs `"chest": "84"` ✗

**Fix:** Paste your JSON at [jsonlint.com](https://www.jsonlint.com/) to find syntax errors.

---

## Size Measurement Reference

### Standard Measurement Fields

| Field | Unit | Description |
|-------|------|-------------|
| `chest` | cm | Chest circumference (across bust) |
| `waist` | cm | Waist circumference |
| `hip` | cm | Hip/seat circumference |
| `shoulder` | cm | Shoulder width (shoulder to shoulder) |
| `sleeve` | cm | Sleeve length (from shoulder seam to wrist) |
| `length` | cm | Total garment length (from shoulder seam to hem) |
| `neck` | cm | Neck circumference |
| `inseam` | cm | Inseam length (for pants) |

### Example for Different Garment Types

**T-Shirt:**
```json
{ "S": { "chest": 88, "waist": 84, "shoulder": 38, "length": 65 } }
```

**Dress Shirt:**
```json
{ "M": { "chest": 96, "waist": 88, "shoulder": 40, "sleeve": 61, "length": 70 } }
```

**Jeans:**
```json
{ "32": { "waist": 81, "inseam": 81 } }
```

**Dress:**
```json
{ "S": { "chest": 88, "waist": 66, "length": 85 } }
```

---

## How Size Recommendations Work

Once you've added size chart data:

1. **Customer provides measurements:** In the Stylique widget, customers provide their body measurements (chest, waist, hip, etc.)
2. **Stylique compares:** Stylique compares customer measurements to your product's size chart
3. **Recommendation:** The system recommends the size with the closest measurements
4. **Confidence score:** Shows how confident the recommendation is (high, medium, low)

### Confidence Levels

- **High (75%+):** Excellent match
- **Medium (50-74%):** Reasonable match
- **Low (<50%):** Poor match (consider manual size selection)

---

## API Environment Variables

If you need to customize the metafield namespace/key (Shopify only), contact your Stylique administrator to set:

- `SHOPIFY_METAFIELD_NAMESPACE` (default: `custom`)
- `SHOPIFY_METAFIELD_KEY` (default: `size_chart`)

---

## Support

If you encounter issues:

1. **Check logs:** Review server console logs for error messages
2. **Validate JSON:** Use [jsonlint.com](https://www.jsonlint.com/)
3. **Contact Stylique:** Reach out to support with:
   - Your product name and ID
   - The JSON data you added
   - Screenshots of where you added it
   - Any error messages from server logs

---

**Last Updated:** April 7, 2026
