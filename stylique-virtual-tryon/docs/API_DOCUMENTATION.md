# API Documentation

**Base URL:** `https://your-backend.com` (set via `PUBLIC_API_URL` env var)

All request/response bodies are JSON unless noted. Errors return `{ "error": "message" }` with appropriate HTTP status codes.

---

## Table of Contents

1. [Health & Diagnostics](#1-health--diagnostics)
2. [Authentication (Store Panel)](#2-authentication-store-panel)
3. [Shopify OAuth & Webhooks](#3-shopify-oauth--webhooks)
4. [Product Sync](#4-product-sync)
5. [Inventory Management (Protected)](#5-inventory-management-protected)
6. [Image Processing (Protected)](#6-image-processing-protected)
7. [Size Recommendations (Protected)](#7-size-recommendations-protected)
8. [Store Configuration (Protected)](#8-store-configuration-protected)
9. [Analytics (Protected)](#9-analytics-protected)
10. [Plugin / Widget Endpoints](#10-plugin--widget-endpoints)

> **Protected** endpoints require a JWT token via `Authorization: Bearer <token>` header or a `store_session` cookie.

---

## 1. Health & Diagnostics

### `GET /api/health`

Returns server status.

**Response:**
```json
{
  "status": "OK",
  "message": "Stylique API is running",
  "timestamp": "2026-03-31T12:00:00.000Z"
}
```

### `GET /api/ping`

Lightweight connectivity check.

**Response:**
```json
{
  "ping": true,
  "ts": 1711886400000
}
```

### `GET /api/cors-test`

Verify CORS headers are working.

**Response:**
```json
{
  "success": true,
  "cors": true,
  "message": "CORS probe"
}
```

---

## 2. Authentication (Store Panel)

### `POST /api/auth/register`

Register a new store account.

**Request:**
```json
{
  "store_name": "My Fashion Store",
  "store_id": "my-fashion-store",
  "email": "owner@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "store": {
    "id": "uuid-here",
    "store_name": "My Fashion Store",
    "store_id": "my-fashion-store",
    "email": "owner@example.com"
  },
  "token": "jwt-token-here"
}
```

**Errors:** `400` validation, `409` duplicate store_id.

### `POST /api/auth/login`

Log in to the store panel.

**Request:**
```json
{
  "store_id": "my-fashion-store",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "store": {
    "id": "uuid-here",
    "store_name": "My Fashion Store",
    "store_id": "my-fashion-store",
    "email": "owner@example.com",
    "subscription_name": "FREE",
    "tryons_quota": 100,
    "tryons_used": 5
  },
  "token": "jwt-token-here"
}
```

**Errors:** `401` invalid credentials.

---

## 3. Shopify OAuth & Webhooks

### `GET /api/shopify/oauth`

Initiates Shopify OAuth. Redirects the merchant to Shopify's authorization screen.

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `shop` | Yes | Shopify store domain (e.g. `my-store` or `my-store.myshopify.com`) |
| `token` | No | JWT to link OAuth to an existing store account |

**Response:** `302` redirect to Shopify authorize URL.

### `GET /api/shopify/callback`

OAuth callback. Exchanges the authorization code for an access token, stores it in Supabase, pulls all products, and registers webhooks.

**Query Parameters:** `code`, `shop`, `state` (all provided by Shopify).

**Response:** `302` redirect to:
- Success: `{FRONTEND_URL}/dashboard?shopify=connected`
- Error: `{FRONTEND_URL}/dashboard?shopify=error&reason=...`

### `POST /api/webhooks/shopify`

Receives Shopify product webhooks. Requires HMAC verification.

**Headers:**
| Header | Description |
|--------|-------------|
| `X-Shopify-Hmac-Sha256` | HMAC signature for verification |
| `X-Shopify-Shop-Domain` | Shopify store domain |
| `X-Shopify-Topic` | Event type (`products/create`, `products/update`, `products/delete`) |

**Body:** Raw JSON (Shopify product object).

**Response:** `200` OK (plain text).

**Behavior:**
- `products/create` / `products/update` — syncs product to Supabase inventory, processes images, assigns tier
- `products/delete` — removes product from inventory

---

### `POST /api/shopify/widget/heartbeat`

Public storefront signal sent by the Shopify Theme App Extension when the widget loads.

**Request Body:**
```json
{
  "storeId": "example.myshopify.com",
  "shopDomain": "example.myshopify.com",
  "productId": "1234567890",
  "productHandle": "test-shirt",
  "installMethod": "theme_app_block",
  "extensionVersion": "0.1.0",
  "currentUrl": "https://example.myshopify.com/products/test-shirt"
}
```

Allowed `installMethod` values are `theme_app_block`, `theme_app_embed`, and `manual_section`.

**Response:**
```json
{ "success": true }
```

## 4. Product Sync

### `POST /api/sync/shopify`

Sync a single Shopify product manually.

**Request (Option A):**
```json
{
  "shop": { "domain": "my-store.myshopify.com" },
  "product": {
    "id": 123456789,
    "title": "Classic T-Shirt",
    "handle": "classic-t-shirt",
    "body_html": "<p>A classic tee</p>",
    "variants": [{ "price": "29.99", "option1": "M" }],
    "images": [{ "src": "https://cdn.shopify.com/image.jpg" }]
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Product synced",
  "product": {
    "name": "Classic T-Shirt",
    "link": "https://my-store.myshopify.com/products/classic-t-shirt",
    "sizes": ["M"]
  }
}
```

### `POST /api/sync/woocommerce`

Sync a single WooCommerce product (called automatically by the WordPress plugin).

**Request:**
```json
{
  "store_domain": "my-store.com",
  "product": {
    "id": 42,
    "name": "Summer Dress",
    "description": "Light summer dress",
    "price": "49.99",
    "permalink": "https://my-store.com/product/summer-dress",
    "images": [{ "src": "https://my-store.com/image.jpg", "alt": "Summer Dress" }],
    "variants": [
      { "price": "49.99", "attributes": [{ "name": "Size", "option": "S" }] }
    ]
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "WooCommerce product synced",
  "product": {
    "name": "Summer Dress",
    "link": "https://my-store.com/product/summer-dress",
    "sizes": ["S"]
  }
}
```

### `POST /api/sync/products`

Batch sync multiple products.

**Request:**
```json
{
  "store_domain": "my-store.myshopify.com",
  "products": [ /* array of Shopify or WooCommerce product objects */ ],
  "format": "shopify"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Synced 5 products",
  "results": [
    { "name": "Product A", "status": "synced" },
    { "name": "Product B", "status": "synced" },
    { "name": "Product C", "status": "error", "error": "Missing title" }
  ]
}
```

---

## 5. Inventory Management (Protected)

### `GET /api/inventory`

List inventory products.

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `store_id` | — | Store UUID or store_id slug |
| `product_id` | — | Filter by specific product UUID |
| `limit` | 50 | Max 200 |
| `offset` | 0 | Pagination offset |

**Response (200):**
```json
{
  "status": "success",
  "inventory": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "product_name": "Classic T-Shirt",
      "description": "A classic tee",
      "price": 29.99,
      "image_url": "https://cdn.shopify.com/image.jpg",
      "tryon_image_url": "https://cdn.shopify.com/best-image.jpg",
      "sizes": ["S", "M", "L"],
      "tier": 2,
      "shopify_product_id": "123456789",
      "product_link": "https://store.myshopify.com/products/classic-t-shirt",
      "category": null,
      "brand": null,
      "created_at": "2026-03-20T10:00:00Z",
      "updated_at": "2026-03-25T14:30:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### `POST /api/inventory`

Create a new product manually.

**Request:**
```json
{
  "store_id": "uuid-or-slug",
  "product_name": "New Product",
  "description": "Description here",
  "price": 39.99,
  "image_url": "https://example.com/image.jpg",
  "sizes": ["S", "M", "L", "XL"],
  "category": "shirts",
  "gender": "UNISEX"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Product created",
  "product": { /* full product object */ }
}
```

### `PATCH /api/inventory/:id`

Update a product. Send `{ "deleted": true }` to hard-delete.

**Request:**
```json
{
  "tier": 1,
  "tryon_image_url": "https://example.com/better-image.jpg"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Product updated",
  "product": { /* updated product object */ }
}
```

---

## 6. Image Processing (Protected)

### `POST /api/process-images`

Run the two-stage image processing pipeline on a product's images. Stage 1 filters by rule-based quality checks. Stage 2 scores via AWS Rekognition (or mock scoring if AWS is not configured). Selects the best image and assigns a tier.

**Request:**
```json
{
  "product_id": "uuid",
  "images": [
    { "url": "https://cdn.example.com/img1.jpg", "alt": "Front view" },
    { "url": "https://cdn.example.com/img2.jpg", "alt": "Side view" }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Images processed, best image selected and tier assigned",
  "selectedImage": { "url": "https://cdn.example.com/img1.jpg", "score": 85 },
  "tier": 2,
  "scoredImages": [
    { "url": "https://cdn.example.com/img1.jpg", "score": 85, "labels": ["clothing", "person"] },
    { "url": "https://cdn.example.com/img2.jpg", "score": 42, "labels": ["clothing"] }
  ]
}
```

**Tier Assignment:**
- **Tier 1** (5+ images scoring ≥ 40): Full try-on experience
- **Tier 2** (2–4 images scoring ≥ 40): Limited angle try-on
- **Tier 3** (0–1 images scoring ≥ 40): Size recommendation only

---

## 7. Size Recommendations (Protected)

### `POST /api/recommend-size`

Get a size recommendation for a product based on body measurements.

**Request:**
```json
{
  "product_id": "uuid",
  "measurements": {
    "chest": 38,
    "waist": 32,
    "shoulder": 18,
    "height": 175,
    "inseam": 31
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "recommendation": {
    "recommended": "M",
    "alternatives": ["L"],
    "confidence": "high",
    "source": "measurements"
  },
  "userMeasurements": { "chest": 38, "waist": 32 }
}
```

---

## 8. Store Configuration (Protected)

### `GET /api/store/:id/config`

Get store configuration. `:id` can be a UUID or the `store_id` slug.

**Response (200):**
```json
{
  "status": "success",
  "config": {
    "id": "uuid",
    "store_name": "My Store",
    "store_id": "my-store",
    "email": "owner@example.com",
    "phone": "+1234567890",
    "subscription_plan": "FREE",
    "subscription_start_at": null,
    "subscription_end_at": null,
    "tryons_quota": 100,
    "tryons_used": 5,
    "tryons_remaining": 95
  },
  "subscriptionActive": true
}
```

---

## 9. Analytics (Protected)

### `GET /api/analytics`

Get try-on analytics data.

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `store_id` | Required | Store UUID |
| `limit` | 100 | Max rows |
| `from` | — | ISO date filter (inclusive) |
| `to` | — | ISO date filter (inclusive) |

**Response (200):**
```json
{
  "status": "success",
  "analytics": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "product_id": "uuid",
      "user_id": "uuid",
      "tryon_type": "2d",
      "created_at": "2026-03-30T15:00:00Z",
      "redirect_status": true
    }
  ],
  "total": 150
}
```

### `POST /api/track-tryon`

Record a try-on event.

**Request:**
```json
{
  "store_id": "uuid",
  "tryon_type": "2d",
  "product_id": "uuid",
  "user_id": "uuid",
  "redirect_status": false
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Try-on tracked",
  "analytics": { /* inserted row */ }
}
```

### `POST /api/analytics/conversion`

Record a conversion event.

**Request:**
```json
{
  "store_id": "uuid",
  "user_id": "uuid",
  "product_id": "uuid",
  "add_to_cart": true,
  "status": "Added to Cart"
}
```

### `GET /api/analytics/conversions`

Get conversion data for a store.

**Query:** `store_id` (required), `limit` (optional, max 500).

**Response (200):**
```json
{
  "status": "success",
  "conversions": [
    {
      "id": "1",
      "store_id": "uuid",
      "user_id": "uuid",
      "product_id": "uuid",
      "add_to_cart": true,
      "status": "Added to Cart",
      "created_at": "2026-03-30T15:00:00Z"
    }
  ],
  "total": 25
}
```

---

## 10. Plugin / Widget Endpoints

These endpoints are used by the Shopify Liquid widget and WooCommerce plugin. They are mounted at both `/plugin/...` and `/api/plugin/...`.

### Authentication

#### `POST /api/plugin/auth`

Send OTP or verify OTP for end-user (shopper) authentication.

**Send OTP:**
```json
{ "email": "shopper@example.com", "action": "send_otp" }
```
**Response:** `{ "success": true, "message": "OTP sent" }`

**Verify OTP:**
```json
{ "email": "shopper@example.com", "action": "verify_otp", "otp": "123456" }
```
**Response:**
```json
{
  "success": true,
  "user": { "id": "uuid", "email": "shopper@example.com", "name": "John" },
  "token": "jwt-token",
  "isNewUser": false
}
```

#### `POST /api/plugin/verify-token`

Validate a user JWT.

**Request:** `{ "token": "jwt-token" }`
**Response:** `{ "success": true, "user": { ... } }`

### Product Availability

#### `POST /api/plugin/check-product`

Check if a product is available for try-on.

**Request:**
```json
{
  "storeId": "store-slug-or-uuid",
  "currentUrl": "https://store.com/products/shirt",
  "shopifyProductId": 123456789
}
```

**Response (found):**
```json
{
  "success": true,
  "available": true,
  "product": {
    "id": "uuid",
    "name": "Classic Shirt",
    "tryon_image_url": "https://...",
    "tier": 2,
    "sizes": ["S", "M", "L"]
  }
}
```

**Response (not found):**
```json
{
  "success": true,
  "available": false,
  "message": "Product not found in inventory"
}
```

### Store Status

#### `GET /api/plugin/store-status?storeId=...`

Get store subscription and quota information.

**Response:**
```json
{
  "success": true,
  "store": {
    "id": "uuid",
    "store_id": "my-store",
    "store_name": "My Store",
    "subscription_name": "FREE",
    "subscription_active": true,
    "tryons_quota": 100,
    "tryons_used": 5,
    "tryons_remaining": 95
  }
}
```

### Try-On

#### `POST /api/plugin/embed-tryon-2d`

Perform a 2D virtual try-on. Accepts multipart form data.

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `userImage` | File | User's photo |
| `storeId` | String | Store identifier |
| `currentUrl` | String | Current product page URL |
| `product_id` | String | Product UUID (optional) |
| `image_url` | String | Garment image URL (optional) |
| `userId` | String | User UUID (optional) |

**Response:**
```json
{
  "success": true,
  "sessionId": "session-uuid",
  "resultImage": "https://result-image-url.jpg",
  "product": { "id": "uuid", "name": "Shirt" }
}
```

#### `POST /api/plugin/embed-tryon-3d`

Initiate a 3D try-on (async operation).

#### `GET /api/plugin/embed-tryon-3d?operationName=...`

Poll for 3D try-on result.

### Recommendations

#### `POST /api/plugin/size-recommendation`

Get size recommendation from the widget.

**Request:**
```json
{
  "productId": "uuid",
  "storeId": "store-id",
  "userId": "user-uuid",
  "measurements": { "chest": 38, "waist": 32 }
}
```

#### `POST /api/plugin/complete-look`

Get "complete the look" suggestions.

**Request:** `{ "storeId": "uuid", "productId": "uuid" }`
**Response:** `{ "success": true, "items": [ /* inventory items */ ] }`

### Analytics (Plugin-side)

#### `POST /api/plugin/consume-tryon`

Decrement the store's try-on quota.

**Request:** `{ "storeId": "uuid", "tryonType": "2d" }`

#### `POST /api/plugin/tryon-analytics`

Track a try-on event from the widget.

**Request:** `{ "storeId": "uuid", "tryonType": "2d", "userId": "uuid", "productId": "uuid" }`

#### `POST /api/plugin/track-conversion`

Track a conversion from the widget.

**Request:** `{ "store_id": "uuid", "user_id": "uuid", "product_id": "uuid", "add_to_cart": true }`

### Profile

#### `POST /api/plugin/update-profile`

Update a shopper's profile (measurements, body type, skin tone).

**Request:**
```json
{
  "userId": "uuid",
  "name": "John Doe",
  "chest": 38,
  "waist": 32,
  "body_type": "moderate",
  "skin_tone_hex": "#C68642"
}
```

#### `POST /api/plugin/detect-skin-tone`

Upload a face photo to detect skin tone. Multipart form with `image` field.

**Response:**
```json
{
  "success": true,
  "skinTone": "#C68642",
  "label": "Medium",
  "message": "Stub — connect real provider for production."
}
```

### Diagnostic Stubs

| Endpoint | Response |
|----------|----------|
| `GET /api/plugin/simple` | `{ "success": true, "message": "Plugin API reachable" }` |
| `GET /api/plugin/test` | `{ "success": true, "message": "Plugin test stub" }` |
| `GET /api/plugin/test-2d` | `{ "success": true, "mode": "2d" }` |
| `GET /api/plugin/debug` | `{ "success": true, "message": "Plugin debug stub" }` |
