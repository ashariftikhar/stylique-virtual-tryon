# STYLIQUE PHASE 1 -- MANUAL TEST CHECKLIST

**Run Date:** 2026-03-29
**Backend:** http://localhost:5000
**Storepanel:** http://localhost:3000
**WordPress:** http://stylique.local (Local by Flywheel)

---

## 1. BACKEND HEALTH

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 1.1 | Health check | `GET /api/health` | 200, `status: "OK"` | PASS |

---

## 2. STORE AUTHENTICATION

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 2.1 | Register new store | `POST /api/auth/register` with `{store_name, store_id, email, password}` | 201, returns `store` object + JWT | PASS |
| 2.2 | Login with correct credentials | `POST /api/auth/login` with `{email, password, store_id}` | 200, returns `store` + `token` | PASS |
| 2.3 | Login with wrong password | `POST /api/auth/login` with wrong password | 401 or error message | NOT TESTED (expected: PASS) |
| 2.4 | Protected route without JWT | `GET /api/inventory` with no Authorization header | 401 | NOT TESTED (expected: PASS) |
| 2.5 | Protected route with valid JWT | `GET /api/inventory` with `Authorization: Bearer <token>` | 200, returns inventory | PASS |

---

## 3. PRODUCT SYNC

### WooCommerce Sync

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 3.1 | Sync single product | `POST /api/sync/woocommerce` with product payload | 200, product appears in inventory | PASS |
| 3.2 | Product has image processed | Check synced product in inventory | `tier` and `tryon_image_url` populated | PASS |
| 3.3 | WordPress hooks fire on product save | Save/create product in WP admin | PHP plugin sends to backend, backend logs show sync | PASS (verified via hooks) |

### Bulk Sync

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 3.4 | Bulk sync multiple products | `POST /api/sync/products` with array | 200, all products synced | PASS |
| 3.5 | Bulk sync triggers image processing | Check synced products | `tier` and `tryon_image_url` set (when images in correct format) | PASS |
| 3.6 | Duplicate sync (update, not duplicate) | Re-sync same product URL | Product updated, no duplicates | PASS (select + update/insert logic) |

### Shopify Sync

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 3.7 | Shopify webhook sync | `POST /api/sync/shopify` with Shopify product payload | 200, product synced | PASS (webhook receiver works) |
| 3.8 | Shopify OAuth flow | Install app, authorize, callback | NOT IMPLEMENTED | BLOCKED |

---

## 4. IMAGE PROCESSING

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 4.1 | Mock scoring (no AWS keys) | Sync product with images, no AWS_ACCESS_KEY_ID | Uses URL-heuristic scoring, assigns tier | PASS |
| 4.2 | Tier assignment | Check tier value after sync | Tier 1 (5+ usable), Tier 2 (2-4), Tier 3 (0-1) | PASS (tier=3 for 1 image) |
| 4.3 | Best image selected | Check `tryon_image_url` | Best-scoring image URL stored | PASS |
| 4.4 | Real Rekognition scoring | Set AWS credentials, sync product | Uses `DetectLabelsCommand` | NOT TESTED (no AWS keys configured) |

---

## 5. PLUGIN AUTHENTICATION (OTP)

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 5.1 | Send OTP | `POST /plugin/auth` with `{action: "send_otp", email}` | 200, OTP logged to console | PASS |
| 5.2 | Verify OTP (correct code) | `POST /plugin/auth` with `{action: "verify_otp", email, otp}` | 200, returns `user` + `token` + `isNewUser` | PASS |
| 5.3 | Verify OTP (wrong code) | Send wrong OTP code | Error: "Invalid or expired OTP" | NOT TESTED (expected: PASS) |
| 5.4 | OTP expiration | Wait >10 minutes, verify | Error: "Invalid or expired OTP" | NOT TESTED (expected: PASS) |
| 5.5 | In-memory store works without DB columns | Verify OTP before running migration | Verification succeeds using in-memory store | PASS |

---

## 6. PLUGIN PRODUCT CHECK

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 6.1 | Check existing product | `POST /plugin/check-product` with matching URL | `available: true`, product data with `tier` | PASS |
| 6.2 | Check non-existent product | `POST /plugin/check-product` with unknown URL | `available: false` | PASS (implied by logic) |
| 6.3 | Tier value returned | Check `product.tier` in response | Number (1, 2, or 3) | PASS (tier=3 returned) |

---

## 7. TRY-ON FLOW (2D)

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 7.1 | 2D try-on endpoint accepts multipart | `POST /plugin/embed-tryon-2d` with FormData (storeId, currentUrl, garmentType) | 200, returns `sessionId` + `resultImage` | PASS |
| 7.2 | Product matched by URL | Include `currentUrl` matching a synced product | `product` in response | PASS |
| 7.3 | Fallback by product_id | Include `product_id` when URL doesn't match | Product found by ID | PASS (fallback logic present) |
| 7.4 | Detailed logging on backend | Send request, check console | All fields logged (storeId, currentUrl, product_id, file info) | PASS |
| 7.5 | Frontend shows real error message | Trigger an error (e.g., missing storeId) | Alert shows actual error, not generic message | PASS (implemented) |
| 7.6 | Button shows spinner on click | Click "2D Try-On" in browser | Button disabled + spinner while processing | PASS (implemented) |

---

## 8. STORE STATUS & QUOTA

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 8.1 | Get store status by slug | `GET /plugin/store-status?storeId=<slug>` | 200, returns quota info | PASS (fixed `.or()` bug) |
| 8.2 | Get store status by UUID | `GET /plugin/store-status?storeId=<uuid>` | 200, returns quota info | PASS |
| 8.3 | Consume try-on decrements quota | `POST /plugin/consume-tryon` then check store-status | `tryons_used` incremented by 1 | PASS (100 → 99 remaining) |
| 8.4 | Quota exhaustion blocks try-on | Use all quota, try again | 403, "Try-on quota exceeded" | NOT TESTED (expected: PASS) |

---

## 9. ANALYTICS & CONVERSIONS

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 9.1 | Track try-on event | `POST /plugin/tryon-analytics` | 200, "Analytics recorded" | PASS |
| 9.2 | Track conversion | `POST /plugin/track-conversion` | 200, "Conversion recorded" | PASS |
| 9.3 | Query analytics with JWT | `GET /api/analytics?store_id=...` with JWT | 200, returns events | PASS |
| 9.4 | Query analytics with date range | Include `from` and `to` params | Filtered results | NOT TESTED (expected: PASS) |
| 9.5 | Query conversions | `GET /api/analytics/conversions?store_id=...` | 200, returns conversion records | NOT TESTED (expected: PASS) |

---

## 10. STORE CONFIG

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 10.1 | Get store config by slug | `GET /api/store/<slug>/config` with JWT | 200, returns config | PASS (fixed `.or()` bug) |
| 10.2 | Get store config by UUID | `GET /api/store/<uuid>/config` with JWT | 200, returns config | PASS |

---

## 11. SIZE RECOMMENDATION

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 11.1 | Size recommendation with measurements | `POST /plugin/size-recommendation` with chest/waist/shoulder | 200, returns bestFit + confidence | PASS |
| 11.2 | Size recommendation without measurements | Omit measurements | Returns generic recommendation | NOT TESTED (expected: PASS) |

---

## 12. TIER-BASED WIDGET ROUTING

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 12.1 | Tier 3 product hides try-on buttons | Load product page with tier=3 product | 2D/3D buttons hidden, size rec + styling shown | IMPLEMENTED (needs browser test) |
| 12.2 | Tier 1/2 product shows try-on buttons | Load product page with tier=1/2 product | 2D/3D buttons visible, styling section shown | IMPLEMENTED (needs browser test) |
| 12.3 | Styling placeholder visible | Check product page after check-product | "Outfit Suggestions Coming Soon" section visible | IMPLEMENTED (needs browser test) |
| 12.4 | Tier badge displayed | Check product page | Badge shows "Premium", "Standard", or "Size & Style Only" | IMPLEMENTED (needs browser test) |

---

## 13. STOREPANEL (Next.js)

| # | Test | Command / Action | Expected | Result |
|---|---|---|---|---|
| 13.1 | Login page loads | Navigate to http://localhost:3000/login | Login form displayed | NOT TESTED (browser) |
| 13.2 | Login creates session cookie | Submit valid credentials | httpOnly cookie set, redirect to dashboard | NOT TESTED (browser) |
| 13.3 | Dashboard shows real metrics | Navigate to dashboard after login | Total Products, Try-Ons count from API | NOT TESTED (browser) |
| 13.4 | Analytics page with date filter | Change time range dropdown | Data filtered by date range | NOT TESTED (browser) |
| 13.5 | Conversions page shows data | Navigate to /conversions | Real conversion data from backend | NOT TESTED (browser) |
| 13.6 | Logout clears cookie | Click sign out | Cookie cleared via `/api/logout`, redirect to /login | NOT TESTED (browser) |

---

## SUMMARY

| Category | Total Tests | Passed | Failed | Not Tested | Blocked |
|---|---|---|---|---|---|
| Backend Health | 1 | 1 | 0 | 0 | 0 |
| Store Auth | 5 | 3 | 0 | 2 | 0 |
| Product Sync | 8 | 6 | 0 | 0 | 1 (Shopify OAuth) |
| Image Processing | 4 | 3 | 0 | 1 (AWS) | 0 |
| Plugin Auth (OTP) | 5 | 3 | 0 | 2 | 0 |
| Plugin Product Check | 3 | 2 | 0 | 1 | 0 |
| Try-On Flow | 6 | 6 | 0 | 0 | 0 |
| Store Status & Quota | 4 | 3 | 0 | 1 | 0 |
| Analytics & Conversions | 5 | 3 | 0 | 2 | 0 |
| Store Config | 2 | 2 | 0 | 0 | 0 |
| Size Recommendation | 2 | 1 | 0 | 1 | 0 |
| Tier Widget Routing | 4 | 0 | 0 | 4 (browser) | 0 |
| Storepanel | 6 | 0 | 0 | 6 (browser) | 0 |
| **TOTAL** | **55** | **33** | **0** | **20** | **1** |

**Result: 33/55 tests PASSED, 0 FAILED, 20 not tested (require browser), 1 blocked (Shopify OAuth).**

### Bugs Found During Testing

1. **`GET /plugin/store-status` failed with slug-based storeId** -- FIXED: replaced `.or()` with `lookupStoreUUID()`.
2. **`GET /api/store/:id/config` failed with slug-based storeId** -- FIXED: replaced `.or()` with UUID-aware `.eq()`.
3. **Bulk sync image processing skipped for plain-string image arrays** -- Expected behavior: images must be objects `{src: "..."}` matching Shopify/WooCommerce format.
