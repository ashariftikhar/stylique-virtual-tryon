# Store Panel User Guide

The Stylique Store Panel is a web dashboard for managing your virtual try-on products, viewing analytics, and configuring your store.

**URL:** `https://your-storepanel-url.com` (deployed via Next.js / Vercel)

---

## Logging In

1. Open the Store Panel URL in your browser
2. Enter your **Store ID** and **Password**
   - These are created via `POST /api/auth/register` or automatically during Shopify OAuth
3. Click **Sign In**
4. You'll be redirected to the Dashboard

---

## Navigation

The sidebar (desktop) or hamburger menu (mobile) provides access to all sections:

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview stats, tier distribution, quick actions |
| **Inventory** | Browse, search, and manage all synced products |
| **Upload** | Manually add a new product |
| **Analytics** | View try-on events, conversion rates |
| **Conversions** | Track add-to-cart and purchase conversions |

---

## Dashboard (Home)

The dashboard shows at a glance:

### Stat Cards
- **Total Products** — Number of products in your inventory
- **Try-on Ready** — Products with a try-on image and Tier 1 or 2 assignment
- **Total Try-ons** — Number of try-on events from customers
- **Remaining Quota** — How many try-ons are left on your plan

### Tier Distribution
A visual breakdown of your products by tier:
- **Tier 1** (green) — Full try-on experience (5+ quality images)
- **Tier 2** (blue) — Limited angle try-on (2–4 quality images)
- **Tier 3** (amber) — Size recommendation only (0–1 quality images)

The progress bar shows proportions at a glance.

### Store Information
Shows your store name, email, phone, and subscription plan.

### Quick Actions
One-click navigation to Upload, Inventory, Analytics, and Conversions.

---

## Managing Inventory

### Browsing Products

The inventory page shows all your products with:
- **Product image** (primary try-on image preferred, with a green star indicator)
- **Product name**
- **Tier badge** — Color-coded (Tier 1/2/3 or Unscored)
- **Sync status badge** — Synced / Pending / Failed / Manual
- **Price and sizes**
- **Source** — Shopify, WooCommerce, or Manual

### Filtering

- **Search** — Type in the search bar to filter by product name
- **Tier filter** — Click the tier summary cards at the top to filter by tier

### Product Details (Expand)

Click the chevron (▼) on any product to expand its detail panel:

- **Images** — Shows the original product image and the primary try-on image side by side. The primary image has a "PRIMARY" label.
- **Details grid** — Tier assignment, Try-on Ready status (Yes/No), Source (Shopify/WooCommerce/Manual), Last updated date
- **Product link** — Link to the product on your store (if available)

### Manual Override

Click the **Manual Override** button on any expanded product to:

1. **Change the tier** — Select Tier 1, 2, or 3 manually
2. **Set a custom try-on image URL** — Paste a URL to override the automatically selected image
3. Click **Save Override**

This is useful when:
- The automatic image scoring selected the wrong image
- You want to force a product to a specific tier
- You have a better product image available

### Re-process Images

Click the **Re-process Images** button to re-run the image processing pipeline (Stage 1 filtering + Stage 2 AWS Rekognition scoring). This will:
- Re-evaluate all product images
- Select a new best image
- Reassign the tier

### Deleting Products

Click the trash icon (🗑) on any product. A confirmation dialog appears. This performs a hard delete from the inventory.

---

## Uploading Products Manually

1. Navigate to **Upload** from the sidebar
2. Fill in the form:
   - **Product Name** (required)
   - **Description** (optional)
   - **Price** (optional)
   - **Image URL** (optional — paste a direct image link)
   - **Available Sizes** (click to toggle: XS through 4XL)
3. Click **Upload Product**
4. A success message confirms the product was added

Manually uploaded products start with no tier assignment. Navigate to Inventory to run image processing or manually override the tier.

---

## Analytics

### Viewing Analytics

1. Navigate to **Analytics** from the sidebar
2. Select a time range: **Last 7 Days**, **Last 30 Days**, **Last 90 Days**, or **All Time**
3. View summary cards:
   - **Total Try-ons** — Number of try-on events in the selected period
   - **Unique Products** — How many different products were tried on
   - **Conversion Rate** — Percentage of try-ons that led to a redirect/purchase

### Analytics Table

Shows individual try-on events with:
- Date
- Try-on type (2D / 3D)
- Status (Converted / Viewed)

### Exporting

Click **Export CSV** to download the analytics data as a CSV file.

---

## Conversions

### Viewing Conversions

1. Navigate to **Conversions** from the sidebar
2. View summary cards:
   - **Total Conversions** — Number of conversion events
   - **Add to Cart** — How many resulted in an add-to-cart
   - **Conversion Rate** — Percentage

### Conversions Table

Shows individual conversion events with:
- Date
- Product ID
- Add to Cart (Yes/No)
- Status

### Exporting

Click **Export CSV** to download conversion data.

---

## Signing Out

Click **Sign Out** at the bottom of the sidebar. You'll be redirected to the login page.

---

## Tips

- **Refresh data** — Click the Refresh button on any page to reload data from the backend
- **Mobile friendly** — The panel works on mobile devices. Use the hamburger menu (☰) to access navigation.
- **Tier optimization** — For the best customer experience, aim to have most products at Tier 1 or 2. Upload high-quality, full-body product images.
- **Image best practices** — Front-facing, full product visible, clean background, good lighting
