# STYLIQUE PHASE 1 - COMPLETE IMPLEMENTATION GUIDE
## 3-Week Sprint with Database Schema & Exact Code Structures

**Client:** Abdullah Jan | Stylique Technologies
**Status:** ACTIVE - First payment received (70,000 PKR / $251)
**Timeline:** 3 weeks
**Deadline:** Production-ready deployment

---

## EXECUTIVE SUMMARY

### What You Have
- ✅ **WordPress Plugin** - 95% done (WooCommerce integration)
- ✅ **React Dashboard** - 80% done (Admin storepanel)
- ✅ **Shopify Template** - Ready to use (Liquid code)
- ✅ **Database Schema** - Complete (PostgreSQL/Supabase)
- ✅ **Frontend Assets** - CSS/JS templates exist

### What You Need to Build
1. **API Layer** - Express backend for all operations
2. **Product Sync** - Shopify OAuth + WooCommerce hooks
3. **Image Processing** - AWS Rekognition + rule-based filtering
4. **Widget Integration** - Frontend modal for try-on
5. **Analytics** - Track conversions and usage

### Time Required
- **API Layer:** 10 hours
- **Shopify/WooCommerce:** 13 hours  
- **Image Processing:** 7 hours
- **Frontend Widget:** 10 hours
- **Integration & Testing:** 8 hours
- **Buffer:** 2 hours
- **TOTAL:** 50 hours = ~17 hours/week = 3.4 hours/day ✅

---

## PART 1: DATABASE SCHEMA DEEP DIVE

### Understanding the Schema

Your database has 5 main tables:

```
stores (Many products)
  ↓
inventory (Many images, sizes, measurements)
  ↓
size_templates (Size definitions)

conversions (Track add-to-cart)
tryon_analytics (Track try-on usage)
```

### Table Details

#### 1. STORES TABLE
```sql
-- What it stores: Store information (Shopify or WooCommerce)
-- Key fields:
- id: Unique store identifier (UUID)
- store_id: Human-readable ID (e.g., "store_123")
- store_name: Display name
- subscription_name: Plan type (FREE, PRO, ENTERPRISE)
- tryons_quota: Monthly try-on limit
- tryons_used: Current month usage
```

**Usage in API:**
```javascript
// Get store info
SELECT * FROM stores WHERE store_id = 'store_123';

// Check quota before allowing try-on
if (store.tryons_used >= store.tryons_quota) {
  throw new Error('Quota exceeded');
}

// Increment usage
UPDATE stores 
SET tryons_used = tryons_used + 1 
WHERE id = store_id;
```

---

#### 2. INVENTORY TABLE
```sql
-- What it stores: Products and their details
-- Key fields:
- id: Product UUID
- store_id: Reference to parent store
- product_name: Product title
- product_link: URL on merchant's store
- price: Product cost
- image_url: Primary product image
- sizes: JSONB array of sizes (e.g., ["S", "M", "L", "XL"])
- measurements: JSONB measurements per size
- gender: Target gender (MALE, FEMALE, UNISEX, UNSPECIFIED)
- fabric_type: Material (MEDIUM_STRETCH, etc)
- season: When worn (ALL_SEASON, SUMMER, WINTER, etc)
- activity: Type of wear (CASUAL, FORMAL, ATHLETIC, etc)
- occasion: Best for (WEEKEND_CASUAL, WORK, PARTY, etc)
- 3d_front_image: Front 3D view image URL
- 3d_back_image: Back 3D view image URL
```

**Measurements JSONB Structure:**
```json
{
  "S": {
    "chest": 34,
    "waist": 28,
    "length": 24,
    "sleeve": 22
  },
  "M": {
    "chest": 36,
    "waist": 30,
    "length": 25,
    "sleeve": 23
  }
}
```

**Sizes JSONB Structure:**
```json
["XS", "S", "M", "L", "XL", "XXL"]
```

---

#### 3. SIZE_TEMPLATES TABLE
```sql
-- What it stores: Store-specific size standards
-- Key fields:
- id: Template UUID
- store_id: Reference to store
- template_name: Template name (e.g., "Women's Clothing")
- category: Clothing type
- size_name: Size label (S, M, L)
- measurements: JSONB with standard measurements
```

**Example Size Template:**
```json
{
  "size_name": "M",
  "measurements": {
    "chest": 36,
    "waist": 30,
    "hips": 38,
    "length": 25,
    "sleeve": 23
  }
}
```

---

#### 4. CONVERSIONS TABLE
```sql
-- What it stores: User add-to-cart events
-- Key fields:
- id: Event ID
- user_id: Customer UUID
- store_id: Which store
- product_id: Which product
- add_to_cart: Was item added to cart? (true/false)
- created_at: When event happened
```

**Usage:** Track conversion rate (added to cart / viewed product)

---

#### 5. TRYON_ANALYTICS TABLE
```sql
-- What it stores: Try-on usage statistics
-- Key fields:
- id: Event UUID
- store_id: Which store
- product_id: Which product
- user_id: Customer UUID
- tryon_type: Type of try-on (3D, SIZE_ONLY, STYLING)
- redirect_status: Did user add to cart after try-on?
- created_at: When try-on happened
```

**Usage:** Understand which try-ons lead to conversions

---

## PART 2: API ENDPOINT SPECIFICATIONS

### Complete API Routes Map

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

POST   /api/shopify/oauth
POST   /api/shopify/callback
GET    /api/shopify/auth-status

POST   /api/woocommerce/webhook
POST   /api/woocommerce/sync

POST   /api/sync/products
GET    /api/sync/status/:store_id
POST   /api/sync/verify

POST   /api/products/process-images
GET    /api/products/:product_id
GET    /api/products/store/:store_id

POST   /api/images/upload
POST   /api/images/process
GET    /api/images/:product_id

POST   /api/recommendations/size
GET    /api/recommendations/product/:product_id

POST   /api/analytics/tryon
POST   /api/analytics/conversion
GET    /api/analytics/store/:store_id

GET    /api/store/:store_id/config
PUT    /api/store/:store_id/config
GET    /api/store/:store_id/quota
```

---

### Detailed Endpoint Specifications

#### 1. SHOPIFY OAUTH ENDPOINT
```javascript
// POST /api/shopify/oauth
// Purpose: Initiate Shopify OAuth flow

REQUEST:
{
  "shop": "myshop.myshopify.com",
  "scopes": ["read_products", "write_products", "read_inventory"]
}

RESPONSE:
{
  "auth_url": "https://myshop.myshopify.com/admin/oauth/authorize?...",
  "request_id": "request_123"
}

// User clicks link, Shopify redirects to:
// https://your-api.com/api/shopify/callback?code=XXX&state=XXX&hmac=XXX

CALLBACK HANDLER:
1. Validate HMAC (security)
2. Exchange code for access token
3. Create store entry in database
4. Store access token (encrypted)
5. Return { success: true, store_id: "..." }

DATABASE INSERTION:
INSERT INTO stores (
  store_name, 
  store_id, 
  password_hash,
  email,
  subscription_name,
  tryons_quota
) VALUES (
  'My Shop',
  'myshop.myshopify.com',
  'hashed_token',
  'owner@myshop.com',
  'FREE',
  100
);
```

---

#### 2. PRODUCT SYNC ENDPOINT
```javascript
// POST /api/sync/products
// Purpose: Receive products from Shopify/WooCommerce

REQUEST:
{
  "store_id": "uuid-of-store",
  "source": "shopify" | "woocommerce",
  "products": [
    {
      "id": "product_123",
      "name": "Blue T-Shirt",
      "description": "...",
      "price": 29.99,
      "images": [
        { "url": "https://...", "alt": "Front view" },
        { "url": "https://...", "alt": "Back view" }
      ],
      "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
      "measurements": {
        "S": { "chest": 34, "waist": 28, "length": 24 },
        "M": { "chest": 36, "waist": 30, "length": 25 }
      },
      "gender": "UNISEX",
      "category": "Tops",
      "color": "Blue",
      "fabric_type": "MEDIUM_STRETCH",
      "season": "ALL_SEASON",
      "activity": "CASUAL",
      "occasion": "WEEKEND_CASUAL",
      "product_link": "https://myshop.com/products/blue-tshirt"
    }
  ]
}

RESPONSE:
{
  "success": true,
  "synced": 5,
  "failed": 0,
  "errors": []
}

BACKEND LOGIC:
1. Verify store exists and is active
2. Check quota not exceeded
3. For each product:
   a. Insert/update in inventory table
   b. Process images (Stage 1 & 2)
   c. Assign tier
   d. Store primary_tryon_image
4. Return result summary

DATABASE CODE:
const { data, error } = await supabase
  .from('inventory')
  .upsert({
    store_id: store.id,
    product_name: product.name,
    description: product.description,
    price: product.price,
    image_url: product.images[0].url,
    sizes: product.sizes,
    measurements: product.measurements,
    product_link: product.product_link,
    gender: product.gender,
    category: product.category,
    colour: product.color,
    fabric_type: product.fabric_type,
    season: product.season,
    activity: product.activity,
    occasion: product.occasion,
    created_at: new Date(),
    updated_at: new Date()
  })
  .select();
```

---

#### 3. IMAGE PROCESSING ENDPOINT
```javascript
// POST /api/products/process-images
// Purpose: Filter and score product images

REQUEST:
{
  "product_id": "uuid-of-product",
  "images": [
    { "url": "https://...", "alt": "Front" },
    { "url": "https://...", "alt": "Detail" },
    { "url": "https://...", "alt": "Back" }
  ]
}

RESPONSE:
{
  "success": true,
  "best_image": "https://...",
  "quality_score": 8.5,
  "tier": 2,
  "stage1_candidates": 3,
  "stage2_scores": [
    { "url": "https://...", "score": 8.5 },
    { "url": "https://...", "score": 7.2 },
    { "url": "https://...", "score": 6.8 }
  ]
}

IMPLEMENTATION - STAGE 1:

function filterImages(images) {
  return images.filter(img => {
    // Fetch image metadata
    const img_data = getImageMetadata(img.url);
    
    // Filter by dimensions
    if (img_data.width < 300 || img_data.height < 300) {
      return false; // Too small
    }
    
    // Filter by aspect ratio (should be 4:5 for fashion)
    const ratio = img_data.width / img_data.height;
    if (ratio < 0.6 || ratio > 1.8) {
      return false; // Wrong aspect ratio
    }
    
    // Filter by file size (indicate compression)
    if (img_data.size < 10000 || img_data.size > 5000000) {
      return false; // Too compressed or too large
    }
    
    // Filter by color histogram (detect lifestyle shots)
    // Lifestyle = lots of background colors
    // Product = focused colors
    const colors = analyzeColors(img.url);
    if (colors.diversity > 0.8) {
      return false; // Probably lifestyle shot
    }
    
    return true;
  }).slice(0, 4); // Keep max 4 candidates
}

IMPLEMENTATION - STAGE 2:

async function scoreImagesAWS(candidates) {
  const AWS = require('aws-sdk');
  const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: 'us-east-1'
  });
  
  const scores = [];
  
  for (const image of candidates) {
    const result = await rekognition.detectLabels({
      Image: { Url: image.url },
      MaxLabels: 20,
      MinConfidence: 60
    }).promise();
    
    let score = 0;
    
    // Score based on detected labels
    const labels = result.Labels.map(l => l.Name.toLowerCase());
    
    // Bonus for clothing-related labels
    const clothingKeywords = ['clothing', 'apparel', 'outfit', 'shirt', 'dress', 'pants', 'jacket'];
    const clothingMatches = labels.filter(l => 
      clothingKeywords.some(k => l.includes(k))
    ).length;
    score += clothingMatches * 2;
    
    // Bonus for clean/clear product visibility
    const clearKeywords = ['product', 'garment', 'item', 'clothing'];
    if (labels.some(l => clearKeywords.some(k => l.includes(k)))) {
      score += 3;
    }
    
    // Bonus for minimal background
    if (!labels.some(l => 
      ['person', 'people', 'human', 'face', 'outdoor', 'landscape'].some(k => l.includes(k))
    )) {
      score += 2;
    }
    
    // Heavy penalty for people (lifestyle shots)
    if (labels.some(l => ['person', 'people', 'human', 'face'].some(k => l.includes(k)))) {
      score -= 10;
    }
    
    // Penalty for outdoor/lifestyle background
    if (labels.some(l => ['outdoor', 'landscape', 'nature', 'building'].some(k => l.includes(k)))) {
      score -= 5;
    }
    
    scores.push({
      url: image.url,
      score: Math.max(0, score),
      labels: labels
    });
  }
  
  // Sort by score and return best
  scores.sort((a, b) => b.score - a.score);
  
  const bestImage = scores[0];
  const tier = assignTier(candidates.length);
  
  // Update product with best image
  await supabase
    .from('inventory')
    .update({
      image_url: bestImage.url,
      '3d_front_image': bestImage.url,
      updated_at: new Date()
    })
    .eq('id', productId);
  
  return {
    best_image: bestImage.url,
    quality_score: bestImage.score,
    tier: tier,
    scores: scores
  };
}

TIER ASSIGNMENT LOGIC:

function assignTier(imageCount) {
  if (imageCount >= 5) return 1; // Full try-on with angles
  if (imageCount >= 2) return 2; // Carousel try-on
  return 3; // Size-only (no visual)
}
```

---

#### 4. SIZE RECOMMENDATION ENDPOINT
```javascript
// POST /api/recommendations/size
// Purpose: Recommend size based on user measurements

REQUEST:
{
  "product_id": "uuid-of-product",
  "user_measurements": {
    "chest": 36,
    "waist": 30,
    "hips": 38,
    "height": 170
  }
}

RESPONSE:
{
  "recommended_size": "M",
  "confidence": 0.95,
  "fit_details": {
    "chest": "Perfect fit",
    "waist": "Comfortable",
    "hips": "Slightly loose",
    "length": "Good"
  },
  "alternatives": [
    { "size": "S", "fit": "Tight" },
    { "size": "L", "fit": "Loose" }
  ]
}

IMPLEMENTATION:

async function recommendSize(productId, userMeasurements) {
  // Get product with measurements
  const { data: product } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (!product || !product.measurements) {
    throw new Error('Product has no size data');
  }
  
  // Get store's size templates for reference
  const { data: templates } = await supabase
    .from('size_templates')
    .select('*')
    .eq('store_id', product.store_id);
  
  // Calculate fit for each size
  const fitScores = {};
  
  for (const [sizeLabel, measurements] of Object.entries(product.measurements)) {
    let score = 100; // Perfect fit = 100
    let fitDetails = {};
    
    // Compare each measurement
    for (const [measure, userValue] of Object.entries(userMeasurements)) {
      if (!measurements[measure]) continue;
      
      const diff = Math.abs(measurements[measure] - userValue);
      
      // Scale: <2cm = perfect, 2-5cm = good, 5-10cm = acceptable, >10cm = poor
      let fitScore = 0;
      let fitText = '';
      
      if (diff < 2) {
        fitScore = 100;
        fitText = 'Perfect fit';
      } else if (diff < 5) {
        fitScore = 90;
        fitText = 'Comfortable';
      } else if (diff < 10) {
        fitScore = 70;
        fitText = 'Slightly loose';
      } else {
        fitScore = 40;
        fitText = 'Loose';
      }
      
      score -= (100 - fitScore) * 0.2; // Each measure worth 20%
      fitDetails[measure] = fitText;
    }
    
    fitScores[sizeLabel] = {
      score: Math.max(0, score),
      fitDetails: fitDetails
    };
  }
  
  // Find best fit
  let bestSize = null;
  let bestScore = -1;
  
  for (const [size, data] of Object.entries(fitScores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestSize = size;
    }
  }
  
  // Log analytics
  await supabase
    .from('tryon_analytics')
    .insert({
      store_id: product.store_id,
      product_id: productId,
      user_id: userId,
      tryon_type: 'SIZE_ONLY',
      created_at: new Date()
    });
  
  return {
    recommended_size: bestSize,
    confidence: bestScore / 100,
    fit_details: fitScores[bestSize].fitDetails,
    alternatives: Object.entries(fitScores)
      .map(([size, data]) => ({
        size,
        fit: Object.values(data.fitDetails)[0] || 'Unknown'
      }))
      .sort((a, b) => fitScores[b.size].score - fitScores[a.size].score)
  };
}
```

---

#### 5. ANALYTICS ENDPOINTS
```javascript
// POST /api/analytics/tryon
// Log try-on event

REQUEST:
{
  "store_id": "uuid-of-store",
  "product_id": "uuid-of-product",
  "user_id": "uuid-of-user",
  "tryon_type": "3D" | "SIZE_ONLY" | "STYLING"
}

RESPONSE: { logged: true }

IMPLEMENTATION:
await supabase
  .from('tryon_analytics')
  .insert({
    store_id,
    product_id,
    user_id,
    tryon_type,
    redirect_status: false,
    created_at: new Date()
  });

---

// POST /api/analytics/conversion
// Log add-to-cart event

REQUEST:
{
  "store_id": "uuid-of-store",
  "product_id": "uuid-of-product",
  "user_id": "uuid-of-user",
  "tryon_used": true | false
}

RESPONSE: { logged: true }

IMPLEMENTATION:
// 1. Log conversion
await supabase
  .from('conversions')
  .insert({
    store_id,
    product_id,
    user_id,
    add_to_cart: true,
    status: 'Logged In',
    created_at: new Date()
  });

// 2. Update try-on analytics if try-on was used
if (tryon_used) {
  await supabase
    .from('tryon_analytics')
    .update({ redirect_status: true })
    .eq('product_id', product_id)
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1);
}

// 3. Increment quota usage
await supabase
  .from('stores')
  .update({ tryons_used: increment(1) })
  .eq('id', store_id);

---

// GET /api/analytics/store/:store_id
// Get analytics dashboard

RESPONSE:
{
  "period": "2026-03-01 to 2026-03-31",
  "stats": {
    "total_tryons": 1250,
    "total_conversions": 342,
    "conversion_rate": 0.274,
    "tryon_to_conversion_rate": 0.42,
    "avg_tryon_per_product": 3.2
  },
  "by_product": [
    {
      "product_id": "...",
      "product_name": "Blue T-Shirt",
      "tryons": 145,
      "conversions": 62,
      "conversion_rate": 0.428
    }
  ],
  "by_tier": {
    "tier_1": { "tryons": 600, "conversions": 280, "rate": 0.467 },
    "tier_2": { "tryons": 500, "conversions": 55, "rate": 0.11 },
    "tier_3": { "tryons": 150, "conversions": 7, "rate": 0.047 }
  }
}

IMPLEMENTATION:
// Query aggregates
const { data: tryons } = await supabase
  .from('tryon_analytics')
  .select('*')
  .eq('store_id', storeId)
  .gte('created_at', startDate)
  .lte('created_at', endDate);

const { data: conversions } = await supabase
  .from('conversions')
  .select('*')
  .eq('store_id', storeId)
  .gte('created_at', startDate)
  .lte('created_at', endDate);

// Calculate metrics
const stats = {
  total_tryons: tryons.length,
  total_conversions: conversions.length,
  conversion_rate: conversions.length / tryons.length,
  tryon_to_conversion_rate: tryons.filter(t => t.redirect_status).length / tryons.length
};

return stats;
```

---

## PART 3: WEEK-BY-WEEK EXECUTION

### WEEK 1: API & DATABASE (10 hours)

#### Day 1-2: Setup (4 hours)
```bash
# 1. Create Express project
mkdir stylique-api
cd stylique-api
npm init -y
npm install express typescript ts-node @types/node @types/express
npm install @supabase/supabase-js aws-sdk dotenv cors

# 2. Setup TypeScript
npx tsc --init

# 3. Create directory structure
mkdir -p src/{routes,middleware,services,types}

# 4. Create .env file
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
JWT_SECRET=your_secret
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
NODE_ENV=development
PORT=3000
```

**Cursor Prompt:**
```
Create a complete Express.js TypeScript project with:
1. Supabase database client initialization
2. AWS SDK setup for Rekognition
3. Error handling middleware
4. CORS configured
5. Request logging middleware
6. Authentication middleware skeleton
7. Environment variable loading

Use this configuration:
- Node.js 18+
- TypeScript strict mode
- Port 3000

Provide all necessary npm scripts (dev, build, start, test)
```

---

#### Day 3-5: API Endpoints (6 hours)

**Cursor Prompt #1: Auth Endpoints**
```
Create authentication endpoints in Express:

POST /api/auth/register
- Input: { store_name, store_id, email, password }
- Hash password with bcrypt
- Create entry in stores table
- Return { store_id, token }

POST /api/auth/login
- Input: { store_id, password }
- Verify password
- Generate JWT token
- Return { token, store_info }

POST /api/auth/logout
- Invalidate token
- Return { success: true }

Add middleware to verify JWT on protected routes.
Use Supabase for database operations.
```

**Cursor Prompt #2: Product Endpoints**
```
Create product management endpoints:

POST /api/sync/products
- Accept array of products
- Validate store_id and quota
- Insert/update in inventory table
- Call image processing for each
- Return sync summary

GET /api/products/store/:store_id
- Return all products for store
- Include image URLs and sizes
- Paginate results (50 per page)

GET /api/products/:product_id
- Return single product details
- Include all measurements and metadata

Database: Supabase PostgreSQL
Schema provided in context
```

**Cursor Prompt #3: Image Processing Endpoints**
```
Create image processing endpoints:

POST /api/images/process
- Input: { product_id, images: [{url, alt}] }
- Stage 1: Rule-based filtering
  - Check dimensions >= 300x300
  - Check aspect ratio 0.6-1.8
  - Check file size 10KB-5MB
  - Analyze color diversity (< 0.8)
  - Keep best 4 images
- Stage 2: AWS Rekognition scoring
  - Detect labels in each candidate
  - Score based on clothing/product labels
  - Penalize for people/lifestyle
  - Select best image
- Tier assignment: tier = 1 if 5+, 2 if 2-4, 3 if <2
- Save to inventory table: image_url, 3d_front_image
- Return { best_image, tier, quality_score }

Use AWS Rekognition API
Save results to Supabase
```

---

### WEEK 2: INTEGRATIONS (13 hours)

#### Day 6-7: Shopify OAuth (8 hours)

**Cursor Prompt #4: Shopify OAuth Flow**
```
Create complete Shopify OAuth integration:

1. Initiate OAuth
   POST /api/shopify/oauth
   Input: { shop: "myshop.myshopify.com" }
   Return: auth_url to redirect to

2. OAuth Callback Handler
   GET /api/shopify/callback?code=CODE&state=STATE&hmac=HMAC
   
   Steps:
   a) Validate HMAC signature
   b) Exchange code for access token (POST to Shopify)
   c) Get store info from Shopify API
   d) Create store entry in database
   e) Store encrypted access token
   f) Trigger initial product sync
   g) Setup webhooks for product updates
   
3. Product Sync from Shopify
   GET /api/shopify/products
   - Fetch all products from Shopify Admin API
   - Map Shopify fields to our schema
   - Call image processing for each
   - Save to inventory
   - Return sync result

Use Shopify Admin API REST
Securely store access token
Implement rate limiting (Shopify limit: 2 calls/second)
```

#### Day 8-9: WooCommerce (5 hours)

**Cursor Prompt #5: WooCommerce Plugin Modification**
```
Modify the WordPress plugin (stylique-virtual-tryon.php) to add:

1. API Key Configuration in Settings Page
   - Add field for Store ID
   - Add field for API Endpoint
   - Test connection button

2. Auto-Sync on Product Update
   add_action('woocommerce_product_updated', 'stylique_sync_product', 10, 2);
   
   function stylique_sync_product($product_id, $product) {
     // Get product data
     $product_data = [
       'id' => $product_id,
       'name' => $product->get_name(),
       'description' => $product->get_description(),
       'price' => $product->get_price(),
       'images' => get_product_images($product),
       'sizes' => get_product_sizes($product),
       'measurements' => get_product_measurements($product),
       'category' => get_product_category($product),
       'product_link' => $product->get_permalink()
     ];
     
     // Send to our API
     $response = wp_remote_post(get_option('stylique_api_endpoint'), [
       'method' => 'POST',
       'headers' => ['Content-Type' => 'application/json'],
       'body' => json_encode([
         'store_id' => get_option('stylique_store_id'),
         'source' => 'woocommerce',
         'products' => [$product_data]
       ]),
       'sslverify' => true,
       'timeout' => 30
     ]);
     
     // Log result
     if (is_wp_error($response)) {
       error_log('Stylique sync failed: ' . $response->get_error_message());
     }
   }

3. Webhook Handler for Product Events
   - Listen for product_created, product_updated, product_deleted
   - Auto-trigger sync when events happen

4. Status Dashboard in Plugin
   - Show last sync time
   - Show sync status (success/failed)
   - Manual sync button
   - Product count
```

---

### WEEK 3: FRONTEND & INTEGRATION (18 hours)

#### Day 12-13: Frontend Widget (10 hours)

**Cursor Prompt #6: React Modal Component**
```
Create React modal component for try-on that:

Structure:
- Modal wrapper with close button
- 3 tabs: TRY-ON | SIZE | STYLING
- Tab content switches on click

Try-On Tab:
- Display image from inventory.image_url
- 3D viewer container (id="three-js-viewer")
- Image carousel if Tier 2 (show all images from inventory)
- Three.js controls for 3D rotation
- "Add to Cart" button
- "Size Guide" link

Size Tab:
- Heading: "Your Recommended Size: [SIZE]"
- Fit details table (Chest: Comfortable, Waist: Perfect, etc)
- Size selector dropdown
- "View Size Guide" link
- Alternative sizes with fit info

Styling Tab:
- "Complete the Look" section
- Show related products
- "Add to Outfit" button for each
- "View Outfit" link
- Shopping links

Features:
- Responsive design (mobile-first)
- Touch gestures for 3D rotation
- Smooth tab transitions
- Loading states
- Error handling
- Analytics tracking on interactions

Props:
{
  product: { id, name, price, images, sizes },
  tier: 1|2|3,
  recommendation: { size, confidence, fitDetails },
  onAddToCart: (size) => void,
  onClose: () => void
}

Use Tailwind CSS for styling (match uwear.ai aesthetics)
Use Framer Motion for smooth animations
Three.js already loaded by plugin
```

**Cursor Prompt #7: Widget Injection to WordPress Plugin**
```
Modify WordPress plugin to inject React modal:

1. Create React mount point in PHP template
   <div id="stylique-widget-root"></div>

2. Load React bundle
   Add to enqueue_scripts():
   - React 18
   - React DOM 18
   - Our widget component bundle
   - Three.js (already loaded)

3. Initialize component with props
   window.styliqueConfig = {
     product: {
       id: $product->get_id(),
       name: $product->get_name(),
       price: $product->get_price(),
       images: [get_product_images],
       sizes: [get_product_sizes]
     },
     tier: getTier(imageCount),
     storeId: get_option('stylique_store_id'),
     apiEndpoint: get_option('stylique_api_endpoint'),
     userId: get_current_user_id()
   };
   
   // Mount React component
   const root = ReactDOM.createRoot(document.getElementById('stylique-widget-root'));
   root.render(<StyliqueTryOnWidget {...window.styliqueConfig} />);

4. Add CSS
   - Style modal overlay
   - Style tabs
   - Make responsive
   - Match WooCommerce theme

5. Add JavaScript for interactions
   - Log analytics on tab switch
   - Log on add-to-cart
   - Handle 3D viewer controls
   - Size recommendation API call
```

---

#### Day 14-15: Integration Testing (8 hours)

**Full Testing Checklist:**

**Shopify Flow Test:**
```
1. [ ] Install app on test Shopify store
2. [ ] OAuth flow completes successfully
3. [ ] Store created in database
4. [ ] Fetch 10 test products from Shopify
5. [ ] Products appear in dashboard
6. [ ] Images processed correctly
7. [ ] Tiers assigned (check 5+, 2-4, <2 images)
8. [ ] Visit product page on Shopify
9. [ ] Widget loads
10. [ ] Try-on functionality works
11. [ ] Size recommendation shows
12. [ ] Add to cart logs analytics
13. [ ] Update product on Shopify
14. [ ] Webhook triggers sync
15. [ ] Updated product appears in 5 seconds
```

**WooCommerce Flow Test:**
```
1. [ ] Install plugin on test WooCommerce site
2. [ ] Configure Store ID and API endpoint
3. [ ] Click "Test Connection" button
4. [ ] Connection successful message
5. [ ] Add 10 test products to WooCommerce
6. [ ] Products auto-sync
7. [ ] Products appear in dashboard within 1 minute
8. [ ] Images processed correctly
9. [ ] Tiers assigned correctly
10. [ ] Visit product page on WooCommerce
11. [ ] Widget loads
12. [ ] Widget styling matches
13. [ ] Try-on works (if Tier 1/2)
14. [ ] Size recommendation works
15. [ ] Add to cart logs correctly
16. [ ] Edit product on WooCommerce
17. [ ] Changes sync automatically
18. [ ] Analytics dashboard shows stats
```

**Widget Testing (All Tiers):**
```
Tier 1 (5+ images):
  [ ] Try-On tab shows
  [ ] 3D viewer loads
  [ ] Image carousel shows 3+ images
  [ ] Swipe/scroll between images works
  [ ] Rotation controls work
  [ ] Size recommendation shows
  [ ] Add to cart works
  [ ] Analytics logged

Tier 2 (2-4 images):
  [ ] Try-On tab shows
  [ ] Image carousel shows all images
  [ ] Size recommendation shows
  [ ] Add to cart works
  [ ] Analytics logged

Tier 3 (0-1 images):
  [ ] Try-On tab NOT shown (graceful fallback)
  [ ] Size recommendation shows
  [ ] Styling section shows (if applicable)
  [ ] Add to cart works
  [ ] No broken UI
```

**Performance Testing:**
```
[ ] Widget loads in < 2 seconds
[ ] API responses < 1 second
[ ] Images load < 2 seconds
[ ] 3D viewer renders < 3 seconds
[ ] Mobile: < 3 seconds overall
[ ] Analytics logged < 500ms
[ ] No console errors
```

**Analytics Testing:**
```
[ ] Try-on event logged on modal open
[ ] Size recommendation tracked
[ ] Add-to-cart tracked
[ ] Conversion rate calculable
[ ] Try-on to conversion rate shows
[ ] Dashboard displays real data
```

---

## PART 4: EXACT CODE EXAMPLES

### Express API Boilerplate (src/index.ts)

```typescript
import express, { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Express
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Types
interface Store {
  id: string;
  store_id: string;
  store_name: string;
  subscription_name: string;
  tryons_quota: number;
  tryons_used: number;
}

interface Product {
  id: string;
  store_id: string;
  product_name: string;
  price: number;
  sizes: string[];
  measurements: Record<string, Record<string, number>>;
  image_url: string;
}

// Routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { store_name, store_id, email, password } = req.body;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create store
    const { data, error } = await supabase
      .from('stores')
      .insert({
        store_name,
        store_id,
        email,
        password_hash,
        subscription_name: 'FREE',
        tryons_quota: 100,
        tryons_used: 0
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, store: data });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/sync/products', async (req: Request, res: Response) => {
  try {
    const { store_id, products } = req.body;
    
    // Get store
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', store_id)
      .single();
    
    if (!store) throw new Error('Store not found');
    
    // Check quota
    if (store.tryons_used >= store.tryons_quota) {
      throw new Error('Quota exceeded');
    }
    
    let synced = 0;
    
    for (const product of products) {
      // Insert product
      const { data: insertedProduct } = await supabase
        .from('inventory')
        .upsert({
          store_id: store.id,
          product_name: product.name,
          description: product.description,
          price: product.price,
          image_url: product.images[0]?.url,
          sizes: product.sizes,
          measurements: product.measurements,
          product_link: product.product_link,
          category: product.category
        })
        .select()
        .single();
      
      // Process images
      if (product.images && product.images.length > 0) {
        // Call image processing
        const imageUrls = product.images.map(img => img.url);
        // TODO: Implement image processing
      }
      
      synced++;
    }
    
    res.json({ success: true, synced, total: products.length });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/recommendations/size', async (req: Request, res: Response) => {
  try {
    const { product_id, user_measurements } = req.body;
    
    const { data: product } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', product_id)
      .single();
    
    if (!product || !product.measurements) {
      throw new Error('Product not found or has no measurements');
    }
    
    // Calculate fit for each size
    const fitScores: Record<string, any> = {};
    
    for (const [sizeLabel, measurements] of Object.entries(product.measurements)) {
      let score = 100;
      const fitDetails: Record<string, string> = {};
      
      for (const [measure, userValue] of Object.entries(user_measurements)) {
        if (!(measure in measurements)) continue;
        
        const diff = Math.abs((measurements as any)[measure] - userValue);
        let fitText = '';
        
        if (diff < 2) fitText = 'Perfect fit';
        else if (diff < 5) fitText = 'Comfortable';
        else if (diff < 10) fitText = 'Slightly loose';
        else fitText = 'Loose';
        
        score -= (Math.max(0, 100 - (100 - diff))) * 0.2;
        fitDetails[measure] = fitText;
      }
      
      fitScores[sizeLabel] = { score: Math.max(0, score), fitDetails };
    }
    
    // Find best fit
    let bestSize = Object.keys(fitScores)[0];
    for (const [size, data] of Object.entries(fitScores)) {
      if ((data as any).score > (fitScores[bestSize] as any).score) {
        bestSize = size;
      }
    }
    
    res.json({
      recommended_size: bestSize,
      confidence: (fitScores[bestSize] as any).score / 100,
      fit_details: (fitScores[bestSize] as any).fitDetails
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

### Image Processing Service (src/services/imageProcessor.ts)

```typescript
import AWS from 'aws-sdk';

const rekognition = new AWS.Rekognition({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});

export async function processImages(imageUrls: string[]) {
  // Stage 1: Rule-based filtering
  const candidates = filterImages(imageUrls);
  
  if (candidates.length === 0) {
    return {
      best_image: null,
      tier: 3,
      quality_score: 0
    };
  }
  
  // Stage 2: AWS Rekognition scoring
  const scoredImages = await scoreImagesWithAWS(candidates);
  
  const bestImage = scoredImages[0];
  const tier = assignTier(candidates.length);
  
  return {
    best_image: bestImage.url,
    quality_score: bestImage.score,
    tier: tier,
    candidates_count: candidates.length
  };
}

function filterImages(urls: string[]) {
  // In production, fetch actual image metadata
  // For now, simple filtering
  return urls.filter((url, idx) => idx < 4); // Keep max 4
}

async function scoreImagesWithAWS(urls: string[]) {
  const scores = [];
  
  for (const url of urls) {
    try {
      const response = await rekognition.detectLabels({
        Image: { Url: url },
        MaxLabels: 20,
        MinConfidence: 60
      }).promise();
      
      let score = 0;
      const labels = response.Labels!.map(l => l.Name!.toLowerCase());
      
      // Scoring logic
      const clothingCount = labels.filter(l => 
        ['clothing', 'apparel', 'garment'].some(k => l.includes(k))
      ).length;
      score += clothingCount * 2;
      
      const hasNegative = labels.some(l => 
        ['person', 'people', 'face'].some(k => l.includes(k))
      );
      if (hasNegative) score -= 10;
      
      scores.push({ url, score: Math.max(0, score) });
    } catch (error) {
      console.error(`Error scoring image ${url}:`, error);
    }
  }
  
  return scores.sort((a, b) => b.score - a.score);
}

function assignTier(imageCount: number): 1 | 2 | 3 {
  if (imageCount >= 5) return 1;
  if (imageCount >= 2) return 2;
  return 3;
}
```

---

## PART 5: DEPLOYMENT

### Deploy API to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - JWT_SECRET
```

### Deploy React Dashboard to Vercel

```bash
cd storepanel

# Build
npm run build

# Deploy
vercel
```

### Publish WordPress Plugin

```bash
# Prepare plugin
zip -r stylique-virtual-tryon.zip wordpress-stylique-virtual-tryon/

# Upload to WordPress.org
# Via https://developer.wordpress.org/plugins/wordpress-org/
```

---

## PART 6: SUCCESS METRICS

### End of Week 1
✅ API fully functional
✅ All endpoints tested locally  
✅ Database schema verified
✅ Deployed to Vercel

### End of Week 2
✅ Shopify OAuth working (test with test store)
✅ WooCommerce plugin syncing (test with test site)
✅ 50+ products synced successfully
✅ Image processing (all stages) working
✅ Tiers assigned correctly (Tier 1/2/3)

### End of Week 3
✅ Frontend widget deployed
✅ All tiers displaying correctly
✅ Size recommendation working
✅ Analytics logging
✅ Full E2E testing passed
✅ Performance < 2s load time
✅ Ready for production launch

---

**You have all the code structures, database details, and implementation guides you need. Execute with confidence using Cursor AI for code generation. You'll complete this in 3 weeks!** 🚀
