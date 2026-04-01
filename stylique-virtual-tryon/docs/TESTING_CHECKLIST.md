# Final Testing Checklist — Phase 1 Delivery

Use this checklist to verify that all Phase 1 deliverables are working correctly.

---

## 1. Backend API

- [ ] `GET /api/health` returns `{ "status": "OK" }`
- [ ] `GET /api/ping` returns `{ "ping": true }`
- [ ] `POST /api/auth/register` creates a new store successfully
- [ ] `POST /api/auth/login` returns a JWT token
- [ ] Protected endpoints return `401` without a token
- [ ] Protected endpoints work with a valid `Authorization: Bearer <token>` header

## 2. Shopify OAuth

- [ ] `GET /api/shopify/oauth?shop=your-store.myshopify.com` redirects to Shopify
- [ ] Completing OAuth stores the access token in Supabase `stores` table
- [ ] After OAuth, `shopify_access_token` and `shopify_shop_domain` are populated
- [ ] Products are automatically pulled and synced to `inventory` table
- [ ] Shopify product webhooks are registered (check Shopify admin → Notifications → Webhooks)
- [ ] Theme injection: `shopify_theme_injection_done` is `true` in Supabase
- [ ] Theme injection: `sections/stylique-virtual-try-on.liquid` exists in the active theme
- [ ] Theme injection: The section is referenced in `templates/product.json` (OS 2.0) or `product.liquid` (legacy)
- [ ] Theme injection: Widget appears on product pages without any manual theme editing
- [ ] Theme injection: Re-running OAuth for the same store does not duplicate the section

## 3. Shopify Webhooks

- [ ] Creating a product in Shopify creates a row in `inventory`
- [ ] Updating a product in Shopify updates the matching `inventory` row
- [ ] Deleting a product in Shopify removes it from `inventory`
- [ ] Webhook HMAC verification works (invalid signatures are rejected)

## 4. WooCommerce Plugin

- [ ] Plugin activates without errors (requires WooCommerce)
- [ ] Settings page appears under **Settings → Stylique Try-On**
- [ ] Store ID and Backend URL can be saved
- [ ] Saving a published product triggers sync to backend
- [ ] Product appears in `inventory` table with `woocommerce_product_id`
- [ ] Product images, title, price, sizes, and permalink are synced correctly

## 5. Image Processing

- [ ] `POST /api/process-images` processes images and returns scores
- [ ] Rule-based filtering removes obviously bad images
- [ ] AWS Rekognition scoring works (or mock scoring returns reasonable values)
- [ ] Best image is selected and stored as `tryon_image_url`
- [ ] Tier is assigned correctly:
  - [ ] Tier 1 for 5+ usable images
  - [ ] Tier 2 for 2–4 usable images
  - [ ] Tier 3 for 0–1 usable images

## 6. Widget (Shopify)

- [ ] Liquid section installs in theme editor
- [ ] Section appears on product pages when added via customizer
- [ ] Backend URL setting is read and used for API calls
- [ ] `testAPIConnection` succeeds (check console for `[Stylique] ── testAPIConnection OK ──`)
- [ ] Login form appears for unauthenticated users
- [ ] OTP authentication flow works (send → verify → login)
- [ ] Product availability check works (`check-product` returns correct result)
- [ ] Store status shows correct plan and quota
- [ ] Photo upload works
- [ ] 2D try-on produces a result image
- [ ] Size recommendation returns a size
- [ ] Tier-based UI works:
  - [ ] Tier 1/2: Full try-on experience shown
  - [ ] Tier 3: Size recommendation shown instead of try-on
- [ ] No CORS errors in browser console

## 7. Widget (WooCommerce)

- [ ] Widget appears on single product pages (below Add to Cart)
- [ ] Login/OTP flow works
- [ ] Product availability check works
- [ ] Photo upload and 2D try-on work
- [ ] Size recommendation works
- [ ] Conversion tracking fires on add-to-cart

## 8. Store Panel

- [ ] Login page loads and works
- [ ] Dashboard shows correct stats (total products, try-on ready, try-ons, quota)
- [ ] Tier distribution chart shows correct breakdown
- [ ] Store information section shows correct data
- [ ] Sidebar navigation works (all 5 sections accessible)
- [ ] Mobile hamburger menu works

### Inventory Management
- [ ] Products list loads and displays correctly
- [ ] Search filtering works
- [ ] Tier filter (click summary cards) works
- [ ] Expanding a product shows detail panel with images and metadata
- [ ] Tier badge, sync status badge, and try-on ready status display correctly
- [ ] Manual Override modal opens and saves (tier + image URL)
- [ ] Re-process Images button triggers image pipeline
- [ ] Delete button removes product after confirmation

### Upload
- [ ] Upload form submits and creates a product
- [ ] Success message appears
- [ ] New product appears in Inventory

### Analytics
- [ ] Time range filter works (7d, 30d, 90d, All)
- [ ] Summary cards show correct counts
- [ ] Table shows try-on events
- [ ] Export CSV downloads a file

### Conversions
- [ ] Conversion data loads
- [ ] Summary cards show correct counts and rate
- [ ] Table shows conversion events
- [ ] Export CSV downloads a file

## 9. Data Integrity

- [ ] Multi-tenant isolation: Store A cannot see Store B's products
- [ ] Products synced from Shopify have `shopify_product_id` set
- [ ] Products synced from WooCommerce have `woocommerce_product_id` set
- [ ] Manually uploaded products have neither platform ID
- [ ] Tier assignments persist after page reload
- [ ] Manual overrides persist after page reload

## 10. Error Handling

- [ ] Invalid Shopify OAuth returns a clear error redirect
- [ ] Webhook with invalid HMAC returns 401
- [ ] API calls with invalid JSON return 400
- [ ] Network failures show user-friendly error messages in the widget
- [ ] "Service Temporarily Unavailable" appears when backend is unreachable (not a crash)

## 11. Documentation

- [ ] API Documentation is complete and accurate
- [ ] Shopify Installation Guide covers all steps
- [ ] WordPress Installation Guide covers all steps
- [ ] Store Panel User Guide covers all features
- [ ] Deployment Guide covers all environment variables
- [ ] Database Schema documentation matches actual schema

---

## Agreement Checklist (Section 3 — Scope of Work)

| Section | Feature | Status |
|---------|---------|--------|
| 3.1 | Shopify OAuth custom app | ✅ |
| 3.1 | Product sync via Admin API | ✅ |
| 3.1 | Real-time webhooks (create/update/delete) | ✅ |
| 3.2 | WooCommerce plugin | ✅ |
| 3.2 | Auto product sync on save | ✅ |
| 3.3 | Integration layer (data mapping, normalization) | ✅ |
| 3.3 | Multi-tenant data isolation | ✅ |
| 3.4 | Stage 1: Rule-based image filtering | ✅ |
| 3.4 | Stage 2: AWS Rekognition scoring | ✅ |
| 3.4 | Primary try-on image selection | ✅ |
| 3.4 | Quality scores and tryon_ready status | ✅ |
| 3.5 | Tier 1/2/3 assignment logic | ✅ |
| 3.5 | Tier-based widget routing | ✅ |
| 3.6 | Frontend widget popup/modal | ✅ |
| 3.6 | Try-on visual layer | ✅ |
| 3.6 | Size recommendation display | ✅ |
| 3.6 | Responsive design (desktop + mobile) | ✅ |
| 3.6 | Add to cart integration | ✅ |
| 3.7 | Admin dashboard — view synced products | ✅ |
| 3.7 | Admin dashboard — sync status | ✅ |
| 3.7 | Admin dashboard — image quality scores | ✅ |
| 3.7 | Admin dashboard — tier assignments | ✅ |
| 3.7 | Admin dashboard — primary_tryon_image | ✅ |
| 3.7 | Admin dashboard — manual override | ✅ |
| 3.7 | Admin dashboard — product count/summary | ✅ |
| 3.8 | Testing & QA | ✅ (this checklist) |
| 3.9 | Documentation | ✅ |
| 3.9 | Deployment guide | ✅ |
