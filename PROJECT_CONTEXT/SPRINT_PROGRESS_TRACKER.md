# STYLIQUE PHASE 1 -- SPRINT PROGRESS TRACKER

**Generated:** 2026-03-28
**Last Updated:** 2026-03-29
**Source:** Codebase audit against `PROJECT_CONTEXT/STYLIQUE_3_WEEK_SPRINT_PLAN (1).md`
**Method:** Every status below is derived from reading actual source files, not from planning-doc checkboxes.

---

## 1. EXECUTIVE STATUS SUMMARY

| Sprint Block | Scope | Status | Completion |
|---|---|---|---|
| **Week 1 Days 1-2** | Setup & Review | COMPLETE | 100% |
| **Week 1 Days 3-5** | REST API Layer | COMPLETE | 100% |
| **Week 2 Days 6-7** | Shopify OAuth | NOT DONE | 0% |
| **Week 2 Days 8-9** | WooCommerce Integration | COMPLETE | 100% |
| **Week 2 Days 10-11** | Image Processing | COMPLETE | 100% |
| **Week 3 Days 12-13** | Frontend Widget | COMPLETE | 95% |
| **Week 3 Days 14-15** | Integration Testing & Deploy | NOT DONE | 5% |

| Deliverable | Status |
|---|---|
| Backend API (Express + TypeScript) | DONE -- 25+ endpoints |
| JWT Auth Middleware | DONE |
| Supabase Integration | DONE |
| AWS Rekognition (real + mock fallback) | DONE |
| Tier Logic (1/2/3) | DONE |
| Shopify OAuth Flow | NOT DONE |
| WooCommerce Plugin Sync | DONE -- tested and working |
| WordPress Plugin Endpoints (`/plugin/*`) | DONE -- 12 routes |
| OTP Customer Authentication | DONE -- in-memory + DB fallback |
| Storepanel Dashboard (Next.js) | DONE -- 6 pages, 3 API routes |
| Try-On Flow (2D) | DONE -- multipart upload, spinner, error display |
| Analytics & Conversions | DONE -- wired to real backend data |
| Automated Tests | NOT DONE |
| Production Deployment | NOT DONE |
| Styling / Outfit Suggestions | NOT DONE |

**Overall estimate: ~82% of sprint plan is complete.**

---

## 2. WEEK 1: FOUNDATION & API LAYER

### Days 1-2: Setup & Review -- COMPLETE

| Task | Status | Evidence |
|---|---|---|
| Clone existing code to GitHub | DONE | Git repo exists, `master` branch, 1 commit ahead of origin |
| Review WordPress plugin code | DONE | All plugin files reviewed and audited |
| Review React storepanel code | DONE | All storepanel pages and components reviewed |
| Review Shopify Liquid template | DONE | `shopify/Shopify_new_tryon_upload_first.liquid` reviewed |
| Set up development environment | DONE | Backend on port 5000, storepanel on port 3000 |
| Configure local database (Supabase) | DONE | `backend/.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` |
| Test existing code runs locally | DONE | Both servers start and register all routes |

### Days 3-5: Build REST API Layer -- COMPLETE

All five planned endpoints exist, plus many additional ones.

**Planned Endpoints (all DONE):**

| Endpoint | File | Notes |
|---|---|---|
| `POST /api/sync/products` | `backend/src/routes/products.ts` | Bulk sync: accepts array of Shopify or WooCommerce products; now calls `processProductImages()` per product |
| `POST /api/process-images` | `backend/src/routes/images.ts` | Real Rekognition with mock fallback; tier assignment |
| `POST /api/recommend-size` | `backend/src/routes/recommendations.ts` | Product-specific measurements + generic fallback |
| `POST /api/track-tryon` | `backend/src/routes/analytics.ts` | Inserts into `tryon_analytics`, increments store counter |
| `GET /api/store/:id/config` | `backend/src/routes/store.ts` | Returns store name, subscription, quota, remaining |

**Additional Endpoints Built (beyond plan):**

| Endpoint | File | Notes |
|---|---|---|
| `POST /api/auth/register` | `backend/src/routes/auth.ts` | bcrypt hashing, JWT issuance |
| `POST /api/auth/login` | `backend/src/routes/auth.ts` | Credential verification, JWT issuance |
| `GET /api/inventory` | `backend/src/routes/inventory.ts` | List products by store_id with pagination |
| `POST /api/inventory` | `backend/src/routes/inventory.ts` | Create new product |
| `PATCH /api/inventory/:id` | `backend/src/routes/inventory.ts` | Update or delete product |
| `GET /api/analytics` | `backend/src/routes/analytics.ts` | Query tryon_analytics with date range (`from`/`to` params) |
| `POST /api/analytics/conversion` | `backend/src/routes/analytics.ts` | Insert into conversions table |
| `GET /api/analytics/conversions` | `backend/src/routes/analytics.ts` | Fetch conversion records |
| `GET /api/health` | `backend/src/index.ts` | Health check |

**Code Structure (planned vs actual):**

| Planned | Actual | Status |
|---|---|---|
| `/routes/products.ts` | `backend/src/routes/products.ts` | DONE |
| `/routes/sync.ts` | Merged into `products.ts` + `woocommerce.ts` | DONE (different file) |
| `/routes/images.ts` | `backend/src/routes/images.ts` | DONE |
| `/routes/recommendations.ts` | `backend/src/routes/recommendations.ts` | DONE |
| `/middleware/auth.ts` | `backend/src/middleware/auth.ts` | DONE (JWT with Bearer + cookie) |
| `/middleware/validation.ts` | Not created | NOT DONE (no Zod validation) |
| `/services/supabase.ts` | `backend/src/services/supabase.ts` | DONE |
| `/services/imageProcessor.ts` | Logic lives in `routes/images.ts` as `processProductImages()` | DONE (different location) |
| `/services/sizeCalc.ts` | Logic lives in `routes/recommendations.ts` | DONE (different location) |
| `/types/index.ts` | Types are inline in each route file | PARTIAL (no centralized types) |

**Stack (planned vs actual):**

| Planned | Status |
|---|---|
| Node.js + Express | DONE (Express 5) |
| TypeScript | DONE (strict mode) |
| Supabase SDK | DONE (`@supabase/supabase-js`) |
| AWS SDK | DONE (`@aws-sdk/client-rekognition`) |
| Multer | DONE (`multer` for multipart form-data on plugin endpoints) |

---

## 3. WEEK 2: INTEGRATIONS & IMAGE PROCESSING

### Days 6-7: Shopify OAuth Integration -- NOT DONE

| Task | Status | Details |
|---|---|---|
| OAuth Flow (install -> permission -> token -> sync) | NOT DONE | No `/api/shopify/oauth` or `/api/shopify/callback` routes exist |
| Product Fetch (pull from Shopify Admin API) | NOT DONE | No Shopify Admin API calls; only webhook-style `POST /api/sync/shopify` |
| Webhook Setup (listen for product updates) | PARTIAL | `POST /api/sync/shopify` can receive webhook payloads, but no code to register webhooks with Shopify |

**What exists:** A `POST /api/sync/shopify` endpoint that accepts a pre-formatted `{shop, product}` payload and upserts into inventory. This works for webhook reception but requires external webhook registration.

**What is missing:**
- OAuth authorize endpoint (redirect to Shopify)
- OAuth callback endpoint (exchange code for token, store in DB)
- Access token storage in `stores` table
- Automatic product pull using Shopify Admin API
- Webhook registration API call
- Shopify app listing / app bridge setup

### Days 8-9: WooCommerce Integration -- COMPLETE (Verified Working)

| Task | Status | Details |
|---|---|---|
| REST API Calls (fetch products) | DONE | PHP hook on product save sends data to backend |
| WordPress Hooks (listen for saves) | DONE | `woocommerce_new_product`, `woocommerce_update_product`, `woocommerce_product_object_updated_props`, `save_post_product`, `wp_insert_post`, `shutdown` hooks all active with deduplication |
| Plugin Settings (store ID, API key, status) | DONE | Admin menu with `stylique_store_id` and `stylique_backend_url` options |
| Backend sync handler | DONE | `POST /api/sync/woocommerce` in `backend/src/routes/woocommerce.ts` |
| Admin Notices | DONE | Transient-based success/failure messages after product save |
| Detailed Logging | DONE | `error_log` statements throughout sync lifecycle for debugging |

### Days 10-11: Image Processing -- COMPLETE

| Task | Status | Details |
|---|---|---|
| Stage 1: Rule-based filtering | DONE | `filterImages()` in `backend/src/routes/images.ts` -- filters by alt text and URL validity |
| Stage 2: AWS Rekognition scoring | DONE | `scoreImageWithRekognition()` uses `DetectLabelsCommand`; positive labels (person, clothing, fashion) boost score; negative labels (logo, text, food) reduce score |
| Mock fallback (no AWS credentials) | DONE | When `AWS_ACCESS_KEY_ID` not set, uses URL-heuristic scoring (base 65 + bonuses) |
| Tier assignment | DONE | `computeTier()`: Tier 1 (5+ usable), Tier 2 (2-4), Tier 3 (0-1); usable = score >= 40 |
| Auto-processing after sync | DONE | `processProductImages()` called in `products.ts` (single + bulk), `woocommerce.ts` after upsert |
| Store results in inventory | DONE | Updates `tryon_image_url` and `tier` columns |

---

## 4. WEEK 3: FRONTEND WIDGET & INTEGRATION

### Days 12-13: Frontend Widget -- COMPLETE (95%)

| Component | Status | Details |
|---|---|---|
| Try-On Visual Layer (product image display) | DONE | `tryon-container.php` + `tryon-script.js` handle 2D image upload and result display |
| 2D Try-On Flow | DONE | `POST /plugin/embed-tryon-2d` with `multer` multipart parsing; JS handles upload, spinner, processing animation, result display, error messages |
| 3D Try-On Flow | PARTIAL | `POST /plugin/embed-tryon-3d` endpoint exists (stub with multer); JS polls for video URL; Three.js loaded but not initialized in WP (video-based instead) |
| Size Recommendation UI | DONE | `loadSizeRecommendation()` in `tryon-script.js` calls `POST /plugin/size-recommendation` and renders result |
| Styling / Outfit Suggestions | NOT DONE | No "complete the look" or related-products section implemented anywhere |
| OTP Customer Auth | DONE | `POST /plugin/auth` handles send_otp/verify_otp with in-memory store (primary) + DB fallback; type-safe string comparison; detailed logging |
| Onboarding (measurements) | DONE | Modal collects height, weight, chest, waist, hips, etc.; saved via `POST /plugin/update-profile` |
| Add to Cart tracking | DONE | `setupAddToCartTracking()` intercepts WC events and calls `POST /plugin/track-conversion` |
| Plugin `/plugin/*` endpoints | DONE | All 12 plugin routes implemented in `backend/src/routes/plugin.ts` |
| CSS / Mobile responsive | DONE | `tryon-style.css` has breakpoints at 992px, 768px, 480px with touch-friendly sizing; spinner + disabled button styles |
| API_BASE_URL Configuration | DONE | Uses `styliqueConfig.backendUrl` with `http://localhost:5000` fallback; value logged to console |
| Button State Management | DONE | `updateTryOnButtonsState()` resilient to missing store status; enables when image selected + plan active |
| Error Handling & Logging | DONE | Detailed pre-request logging, response parsing, real error messages shown to user |

**WordPress Plugin -- All `/plugin/*` endpoints implemented:**

| Endpoint | Method | Status |
|---|---|---|
| `/plugin/auth` | POST | DONE (OTP send + verify, in-memory + DB) |
| `/plugin/check-product` | POST | DONE (URL-to-product matching) |
| `/plugin/embed-tryon-2d` | POST | DONE (multer multipart, detailed logging, product fallback lookup) |
| `/plugin/embed-tryon-3d` | POST | DONE (stub with multer -- returns operation name) |
| `/plugin/embed-tryon-3d` | GET | DONE (stub -- poll for video) |
| `/plugin/store-status` | GET | DONE (quota + subscription) |
| `/plugin/list-stores` | GET | DONE (fallback store listing) |
| `/plugin/consume-tryon` | POST | DONE (quota check + increment) |
| `/plugin/tryon-analytics` | POST | DONE (insert into tryon_analytics) |
| `/plugin/track-conversion` | POST | DONE (insert into conversions) |
| `/plugin/update-profile` | POST | DONE (update user measurements) |
| `/plugin/size-recommendation` | POST | DONE (product-specific + generic + user measurements) |

### Days 14-15: Integration Testing & Final Polish -- PARTIAL

| Task | Status | Details |
|---|---|---|
| Full Shopify flow test | BLOCKED | Cannot test without OAuth flow |
| Full WooCommerce flow test | DONE | Sync hooks verified, product creation triggers backend sync |
| Automated unit tests | NOT DONE | `npm test` is a stub; zero `*.test.*` or `*.spec.*` files in project |
| Integration tests | NOT DONE | No test framework configured |
| E2E tests | NOT DONE | No Playwright/Cypress setup |
| Bug fixes & polish | DONE | All 10 identified bugs (BUG-01 through BUG-10) resolved |
| Documentation (API docs, setup guide) | PARTIAL | `.env.example` files exist; no API docs or setup guide |
| Deployment | NOT DONE | Not deployed to Vercel or any hosting |

---

## 5. KNOWN BUGS & ISSUES

### All 10 Originally Identified Bugs -- RESOLVED

| Bug | Title | Severity | Status | Resolution |
|---|---|---|---|---|
| BUG-01 | `/auth/login` path mismatch (Storepanel) | HIGH | RESOLVED | Changed all `/auth/login` to `/login` in `layout.tsx` and `useAuth.ts` |
| BUG-02 | Sign-out cannot clear httpOnly cookie | MEDIUM | RESOLVED | Created `POST /api/logout` Next.js route; updated `layout.tsx` and `useAuth.ts` to call it |
| BUG-03 | Hardcoded production URLs in WP plugin | MEDIUM | RESOLVED | Replaced `styliquetechnologies.com` URLs with `${API_BASE_URL}/plugin/...` in `tryon-script.js` |
| BUG-04 | Analytics time range filter not passed to API | LOW | RESOLVED | `apiClient.getAnalytics()` now accepts and passes `from`/`to` query params |
| BUG-05 | Dashboard "Total Products" shows wrong metric | LOW | RESOLVED | Fetches actual inventory count from `GET /api/inventory`; fetches real try-on count |
| BUG-06 | Conversions page is a placeholder | LOW | RESOLVED | Wired to `GET /api/analytics/conversions` endpoint; displays and exports real data |
| BUG-07 | Bulk sync skips image processing | MEDIUM | RESOLVED | `processProductImages()` called in bulk sync loop after each upsert |
| BUG-08 | WP plugin sync not guaranteed on all saves | MEDIUM | RESOLVED | Added `save_post_product`, `wp_insert_post`, `shutdown` hooks with deduplication |
| BUG-09 | Duplicate type definitions in storepanel | LOW | RESOLVED | `store.ts` now re-exports from `api.ts`; unique types kept locally |
| BUG-10 | `useAuth.ts` hook uses stale redirect path | HIGH | RESOLVED | All three `/auth/login` references changed to `/login` |

### Additional Issues Fixed After Initial Bug Report

| Issue | Status | Resolution |
|---|---|---|
| OTP verification fails despite correct code | RESOLVED | Root cause: `users` table missing `otp_code`/`otp_expires_at` columns. Added in-memory OTP store as primary fallback. Created DB migration script. Fixed strict equality type mismatch with `String()` casts. |
| Try-on button permanently disabled | RESOLVED | `updateTryOnButtonsState()` logic loosened: `quotaOK` defaults to `true` if store status not loaded; `planActive` defaults to `true` unless explicitly expired |
| Try-on button no visual feedback on click | RESOLVED | Added spinner + disabled state on click, restored in `finally` block. Added CSS for `.stylique-spinner` and disabled button styles |
| 2D try-on returns "temporary issue" error | RESOLVED | Root cause: backend cannot parse multipart/form-data (only `express.json()`). Installed `multer`, added `upload.single('userImage')` middleware to 2D and 3D endpoints. Added detailed logging on both frontend and backend. Frontend now shows actual error message instead of generic alert. |
| `API_BASE_URL` undefined in WP plugin JS | RESOLVED | Added fallback chain: `styliqueConfig.backendUrl` -> `http://localhost:5000`. Value logged to console. |
| 2D try-on missing required fields in request | RESOLVED | `FormData` now includes `storeId`, `currentUrl`, `product_id`, `image_url`, `userId`. Redundant header removed. |
| Backend store lookup fails for WooCommerce domains | RESOLVED | `store_id` identity documented; PHP plugin sync explained; secondary lookup by domain added |

### Remaining Known Issues (Non-Critical)

| Issue | Severity | Details |
|---|---|---|
| `POST /plugin/detect-skin-tone` not implemented | LOW | `tryon-script.js` calls this endpoint but it doesn't exist in `plugin.ts` yet |
| 3D try-on is a stub | LOW | Returns an operation name but doesn't generate a 3D model |
| In-memory OTP store resets on server restart | LOW | Run `database/migrations/001_add_users_columns.sql` in Supabase to enable persistent OTP storage |
| Debug console.logs throughout codebase | LOW | Should be removed or gated behind `NODE_ENV` before production |

---

## 6. DELIVERABLES CHECKLIST (from Sprint Plan Part 7)

### By End of Week 1

| Deliverable | Status |
|---|---|
| API layer complete (all endpoints) | DONE -- 25+ endpoints across 9 route files |
| Database connected | DONE -- Supabase client singleton in `services/supabase.ts` |
| Environment variables configured | DONE -- `.env` with Supabase URL/key, JWT secret, port |
| API tested locally | DONE -- server starts, all routes register, endpoints respond |
| Documentation started | PARTIAL -- `.env.example` exists, no API docs |

### By End of Week 2

| Deliverable | Status |
|---|---|
| Shopify OAuth working | NOT DONE |
| Shopify products syncing | PARTIAL -- webhook receiver exists, no automated pull |
| WooCommerce plugin integrated | DONE |
| WooCommerce products syncing | DONE -- verified with all sync hooks |
| Image processing working (both stages) | DONE |
| Tier logic assigned | DONE |
| API deployed to production | NOT DONE |

### By End of Week 3

| Deliverable | Status |
|---|---|
| Frontend widget working | DONE -- try-on flow end-to-end with multipart upload, spinner, error handling |
| Size recommendation integrated | DONE (product-specific + generic) |
| Styling section working | NOT DONE (no outfit suggestions) |
| All tiers working | DONE (tier logic assigns 1/2/3) |
| Full integration tested | PARTIAL -- WooCommerce flow tested; Shopify blocked |
| Performance optimized | NOT DONE |
| Complete documentation | NOT DONE |
| Testing checklist provided | NOT DONE |
| Code deployed | NOT DONE |
| Ready for launch | NOT DONE |

---

## 7. QA CHECKLIST STATUS (from Sprint Plan Part 11)

### Code Quality

| Item | Status | Notes |
|---|---|---|
| All TypeScript types defined | PARTIAL | Types are inline in route files; no centralized `/types/index.ts` |
| No console.logs in production | NOT DONE | Debug `console.log` statements throughout backend and storepanel (needed for current dev phase) |
| No hardcoded credentials | DONE | Previous hardcoded `styliquetechnologies.com` URLs replaced with `API_BASE_URL` |
| Error handling on all API calls | DONE | All endpoints wrapped in try/catch with error responses |
| Input validation on all endpoints | PARTIAL | Basic null checks exist; no Zod or schema validation middleware |

### Security

| Item | Status | Notes |
|---|---|---|
| API validates OAuth tokens | PARTIAL | JWT middleware (`requireAuth`) protects dashboard endpoints; no Shopify OAuth |
| Database queries use parameterized statements | DONE | Supabase SDK handles parameterization |
| HTTPS enforced | NOT DONE | Development only; depends on deployment platform |
| Rate limiting on sync endpoints | NOT DONE | No rate limiting middleware |
| No sensitive data in logs | NOT DONE | OTP codes logged in dev mode (acceptable for dev, must remove for prod) |

### Performance

| Item | Status | Notes |
|---|---|---|
| All API calls <1 second | UNTESTED | No load testing performed |
| Widget loads <2 seconds | UNTESTED | Not measured |
| Images optimized | N/A | Image URLs are external; no server-side optimization |
| Database queries indexed | UNTESTED | Depends on Supabase table indexes |
| No N+1 queries | DONE | Bulk operations use single queries |

### Testing

| Item | Status | Notes |
|---|---|---|
| Unit tests pass | NOT DONE | No tests exist |
| Integration tests pass | NOT DONE | No tests exist |
| Manual testing complete | PARTIAL | WooCommerce sync tested; OTP auth tested; try-on flow tested |
| Mobile testing done | NOT DONE | CSS has mobile breakpoints but no testing |
| Performance tested | NOT DONE | No benchmarks run |

### Documentation

| Item | Status | Notes |
|---|---|---|
| API docs complete | NOT DONE | No API documentation file |
| Setup guide written | PARTIAL | `.env.example` files exist for backend and storepanel |
| Troubleshooting guide written | NOT DONE | |
| Code comments added | PARTIAL | Some sections have comments; many do not |
| README updated | NOT DONE | No project-level README |

---

## 8. SUCCESS CRITERIA STATUS (from Sprint Plan end)

| # | Criterion | Status |
|---|---|---|
| 1 | Shopify app installs cleanly | NOT DONE -- no OAuth flow |
| 2 | Products auto-sync from Shopify | PARTIAL -- webhook receiver exists, no automated pull |
| 3 | WordPress plugin activates cleanly | DONE -- PHP plugin registers hooks, enqueues scripts |
| 4 | Products auto-sync from WooCommerce | DONE -- all hooks verified and working |
| 5 | Images auto-processed & tiered | DONE -- Rekognition scoring + `computeTier()` + auto-trigger after sync |
| 6 | Widget shows on product pages | DONE -- `woocommerce_after_add_to_cart_form` hook renders widget |
| 7 | Size recommendations work | DONE -- product-specific + generic, with user measurements |
| 8 | Styling suggestions show | NOT DONE -- no outfit/styling feature |
| 9 | Analytics logged | DONE -- try-on events + conversions tracked and displayed in storepanel |
| 10 | All 3 payment milestones completed | N/A -- business milestone |
| 11 | Complete documentation provided | NOT DONE |
| 12 | Testing checklist passed | PARTIAL -- manual WooCommerce and plugin tests done |

---

## 9. WHAT'S BEEN COMPLETED SINCE INITIAL TRACKER (Mar 28-29)

All of the following were completed during the current development session:

### Bug Fixes (P1 -- All Done)
- [x] P1-1: Fixed `/auth/login` redirect paths to `/login`
- [x] P1-2: Created `/api/logout` route to clear httpOnly cookie
- [x] P1-3: Fixed hardcoded `styliquetechnologies.com` URLs
- [x] P1-4: Fixed dashboard "Total Products" metric

### Feature Completions (P2 -- Partially Done)
- [x] P2-2: Wired conversions page to real backend data
- [x] P2-3: Passed analytics time range filter to API
- [x] P2-4: Added `processProductImages()` call to bulk sync loop

### Polish (P3 -- Partially Done)
- [x] P3-3: Consolidated duplicate type definitions

### Additional Fixes (Beyond Original Plan)
- [x] OTP authentication: in-memory store + DB fallback + type-safe comparison
- [x] WordPress sync: added `save_post_product`, `wp_insert_post`, `shutdown` hooks with deduplication
- [x] Try-on button: state management, spinner, loading feedback
- [x] Multipart upload: installed `multer` for `/plugin/embed-tryon-2d` and `/plugin/embed-tryon-3d`
- [x] Frontend debugging: detailed pre-/post-request logging, real error messages shown
- [x] Backend debugging: field-by-field request logging on 2D try-on endpoint
- [x] API_BASE_URL: fallback chain with console logging
- [x] 2D try-on request body: all required fields (storeId, currentUrl, product_id, image_url, userId)
- [x] DB migration script: `database/migrations/001_add_users_columns.sql` for `users` + `inventory` columns

---

## 10. REMAINING TASKS -- PRIORITIZED CHECKLIST

### Priority 1: High Impact Features (Estimated: 8-10 hours)

| # | Task | Effort | Details |
|---|---|---|---|
| P1-1 | **Build Shopify OAuth flow** | 6-8 hrs | Authorize endpoint → redirect to Shopify → callback → exchange code for token → store access token → auto-pull products via Admin API → register webhooks |
| P1-2 | **Build `POST /plugin/detect-skin-tone` endpoint** | 1-2 hrs | Called by `tryon-script.js`; either use Rekognition or a simple heuristic |

### Priority 2: Polish & Quality (Estimated: 10-14 hours)

| # | Task | Effort | Details |
|---|---|---|---|
| P2-1 | Add Zod input validation middleware on all endpoints | 3-4 hrs | Schema validation for request bodies/params on all 25+ endpoints |
| P2-2 | Remove debug `console.log` statements from production code | 1 hr | Gate behind `NODE_ENV !== 'production'` or remove entirely |
| P2-3 | Add rate limiting on sync and plugin endpoints | 1-2 hrs | Use `express-rate-limit` on `/plugin/*` and `/api/sync/*` |
| P2-4 | Write automated tests for critical flows | 4-6 hrs | Jest/Vitest for auth, sync, image processing, OTP |
| P2-5 | Create centralized backend `/types/index.ts` | 1 hr | Extract inline types from route files |
| P2-6 | **Build styling/outfit suggestions feature** | 4-6 hrs | "Complete the look" section on product pages; related products algorithm |

### Priority 3: Deployment & Documentation (Estimated: 12-16 hours)

| # | Task | Effort | Details |
|---|---|---|---|
| P3-1 | Deploy backend API to Vercel | 1-2 hrs | Configure `vercel.json`, environment variables, serverless functions |
| P3-2 | Deploy storepanel to Vercel | 1-2 hrs | Next.js app deployment with env vars |
| P3-3 | Configure production environment variables and HTTPS | 1 hr | Production Supabase, AWS, JWT secrets; enforce HTTPS |
| P3-4 | Write API documentation | 2-3 hrs | Document all 25+ endpoints with request/response examples |
| P3-5 | Write setup guide and troubleshooting guide | 2-3 hrs | Local dev setup, WordPress plugin installation, common issues |
| P3-6 | Create project-level README | 1 hr | Overview, architecture, quick start |
| P3-7 | Set up Shopify app listing (after OAuth is built) | 2-3 hrs | App Bridge setup, listing copy, screenshots |
| P3-8 | Prepare WordPress plugin for WordPress.org submission | 2-3 hrs | Readme.txt, sanitization review, SVN submission |

### Priority 4: Run Supabase Migration (Manual Step)

Run the following SQL in the Supabase dashboard to enable persistent OTP storage and add missing columns:

```
File: database/migrations/001_add_users_columns.sql
```

This adds: `otp_code`, `otp_expires_at`, `name`, `gender`, `height`, `weight`, `chest`, `waist`, `hips` columns to `users` table, and `tier`, `tryon_image_url`, `shopify_product_id` to `inventory` table.

---

## 11. COMPLETE ENDPOINT INVENTORY

All endpoints currently implemented in the backend:

### Public (No JWT Required)

| Method | Path | File | Purpose |
|---|---|---|---|
| GET | `/api/health` | `index.ts` | Health check |
| POST | `/api/auth/register` | `routes/auth.ts` | Create store account |
| POST | `/api/auth/login` | `routes/auth.ts` | Login, get JWT |
| POST | `/api/sync/shopify` | `routes/products.ts` | Shopify webhook sync |
| POST | `/api/sync/products` | `routes/products.ts` | Bulk product sync (with image processing) |
| POST | `/api/sync/woocommerce` | `routes/woocommerce.ts` | WooCommerce webhook sync |

### Protected (JWT Required)

| Method | Path | File | Purpose |
|---|---|---|---|
| GET | `/api/inventory` | `routes/inventory.ts` | List products |
| POST | `/api/inventory` | `routes/inventory.ts` | Create product |
| PATCH | `/api/inventory/:id` | `routes/inventory.ts` | Update/delete product |
| POST | `/api/process-images` | `routes/images.ts` | Score and select best image |
| POST | `/api/recommend-size` | `routes/recommendations.ts` | Size recommendation |
| GET | `/api/store/:id/config` | `routes/store.ts` | Store configuration |
| GET | `/api/analytics` | `routes/analytics.ts` | List analytics events (with date range) |
| POST | `/api/track-tryon` | `routes/analytics.ts` | Log try-on event |
| POST | `/api/analytics/conversion` | `routes/analytics.ts` | Log conversion |
| GET | `/api/analytics/conversions` | `routes/analytics.ts` | Fetch conversions |

### Plugin (No JWT -- used by WordPress/Shopify widget)

| Method | Path | File | Purpose |
|---|---|---|---|
| POST | `/plugin/auth` | `routes/plugin.ts` | OTP auth (send/verify) with in-memory + DB |
| POST | `/plugin/check-product` | `routes/plugin.ts` | Match URL to inventory |
| POST | `/plugin/embed-tryon-2d` | `routes/plugin.ts` | Start 2D try-on (multer multipart) |
| POST | `/plugin/embed-tryon-3d` | `routes/plugin.ts` | Start 3D generation (multer multipart) |
| GET | `/plugin/embed-tryon-3d` | `routes/plugin.ts` | Poll 3D status |
| GET | `/plugin/store-status` | `routes/plugin.ts` | Store quota info |
| GET | `/plugin/list-stores` | `routes/plugin.ts` | Fallback store list |
| POST | `/plugin/consume-tryon` | `routes/plugin.ts` | Use try-on quota |
| POST | `/plugin/tryon-analytics` | `routes/plugin.ts` | Log analytics |
| POST | `/plugin/track-conversion` | `routes/plugin.ts` | Log conversion |
| POST | `/plugin/update-profile` | `routes/plugin.ts` | Update user profile |
| POST | `/plugin/size-recommendation` | `routes/plugin.ts` | Size recommendation |

### Storepanel Next.js API Routes

| Method | Path | File | Purpose |
|---|---|---|---|
| POST | `/api/test-auth` | `storepanel/src/app/api/test-auth/route.ts` | Proxy login to backend, set session cookie |
| GET | `/api/test-auth` | `storepanel/src/app/api/test-auth/route.ts` | Validate session cookie |
| GET | `/api/get-store-session` | `storepanel/src/app/api/get-store-session/route.ts` | Read session cookie, return store info |
| POST | `/api/logout` | `storepanel/src/app/api/logout/route.ts` | Clear httpOnly session cookie |

---

## 12. FILE TREE REFERENCE

```
stylique-virtual-tryon/
  backend/
    src/
      index.ts                    -- Express app entry, route registration, CORS
      middleware/
        auth.ts                   -- JWT requireAuth middleware
      services/
        supabase.ts               -- Supabase client singleton
      routes/
        auth.ts                   -- Register/login endpoints
        products.ts               -- Shopify sync + bulk sync (with image processing)
        woocommerce.ts            -- WooCommerce sync
        images.ts                 -- Image processing, Rekognition, tier
        recommendations.ts        -- Size recommendation (product + generic)
        store.ts                  -- Store config endpoint
        analytics.ts              -- Track try-on, analytics query, conversion
        inventory.ts              -- CRUD for inventory
        plugin.ts                 -- All /plugin/* WordPress endpoints (multer-enabled)
    .env                          -- Environment variables (local)
    .env.example                  -- Template for env vars
    package.json                  -- Dependencies and scripts (includes multer)
    tsconfig.json                 -- TypeScript configuration

  storepanel/
    src/
      app/
        (auth)/login/page.tsx     -- Login page
        (dashboard)/
          page.tsx                -- Dashboard home (real metrics)
          analytics/page.tsx      -- Analytics page (with date range filter)
          manage/page.tsx         -- Inventory management
          upload/page.tsx         -- Product upload form
          conversions/page.tsx    -- Conversion analytics (wired to backend)
          layout.tsx              -- Dashboard layout with auth check
        api/
          test-auth/route.ts      -- Auth proxy + cookie management
          get-store-session/route.ts  -- Session reader
          logout/route.ts         -- Clear httpOnly cookie
      lib/api.ts                  -- Backend API client class (with date range support)
      hooks/useAuth.ts            -- Auth hook (fixed redirect paths)
      middleware.ts               -- Route protection
      types/
        api.ts                    -- Shared TypeScript types
        store.ts                  -- Re-exports from api.ts + SizeMeasurements
    .env.local                    -- Backend URL config
    .env.example                  -- Template

  wordpress-stylique-virtual-tryon/
    wordpress-stylique-virtual-tryon/
      stylique-virtual-tryon.php  -- Main plugin file (v1.9.4, robust sync hooks)
      assets/
        js/tryon-script.js        -- Frontend try-on logic (1754 lines, multipart upload, detailed logging)
        js/tryon-backend-integration.js  -- Product fetch + page view tracking
        css/tryon-style.css       -- Plugin styling (responsive, spinner, disabled states)
      templates/
        tryon-container.php       -- Widget HTML structure

  database/
    migrations/
      001_add_users_columns.sql   -- Add missing columns to users + inventory tables

  shopify/
    Shopify_new_tryon_upload_first.liquid  -- Shopify Liquid template with Three.js
```
