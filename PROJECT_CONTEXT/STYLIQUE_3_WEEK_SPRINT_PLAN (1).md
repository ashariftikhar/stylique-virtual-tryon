# STYLIQUE PHASE 1 - 3 WEEK SPRINT PLAN
## Complete Technical Breakdown & Execution Guide

**Client:** Abdullah Jan | Stylique Technologies
**Project Start:** Upon 70,000 PKR payment received
**Deadline:** 3 weeks from start
**Budget:** USD $850 / PKR 236,099
**Status:** ACTIVE - Codebase received, ready to execute

---

## EXECUTIVE SUMMARY

You received:
- ✅ **WordPress Plugin** (WooCommerce integration) - 95% built
- ✅ **Store Panel** (React admin dashboard) - 80% built  
- ✅ **Shopify Liquid Template** - ready to use
- ✅ **Database Schema** - fully designed
- ✅ **Frontend Assets** (CSS/JS) - existing

**Your job:** Wire everything together + build auto-sync layer

---

## PART 1: WHAT IS THIS PROJECT?

### What Stylique Does

Stylique is a **Virtual Try-On Platform** for fashion ecommerce that:

1. **Shows customers try-on visualization**
   - AI-powered product visualization
   - Size recommendation based on body measurements
   - Real-time fitting feedback
   - Styling suggestions

2. **Reduces returns & boosts conversions**
   - Customers see how items fit before buying
   - Accurate size recommendations
   - Styling advice (complete the look)

3. **Works on Shopify + WooCommerce**
   - Merchants install app/plugin
   - Products auto-sync with photos
   - Smart image selection (which photo to use)
   - Real-time widget for customers

### Reference: uwear.ai
Check https://uwear.ai for inspiration:
- One-click try-on
- Size recommendation
- Styling/outfit suggestions
- Clean UI/UX patterns

---

## PART 2: WHAT YOU HAVE

### 1. WordPress Plugin (Already Built)
**Location:** `/wordpress-stylique-virtual-tryon/`
**Status:** 95% complete

**What it does:**
- Installs as a WooCommerce plugin
- Adds settings page in WordPress admin
- Injects try-on widget on product pages
- Loads 3D viewer (Three.js)
- Communicates with backend API

**Files:**
- `stylique-virtual-tryon.php` - Main plugin file (PHP)
- `assets/js/tryon-script.js` - Frontend logic
- `assets/css/tryon-style.css` - Styling
- `templates/tryon-container.php` - HTML structure

**What's missing:**
- ❓ Actual API calls to sync products
- ❓ Image processing integration
- ❓ Size recommendation logic
- ❓ Analytics tracking

### 2. Store Panel (Admin Dashboard)
**Location:** `/storepanel/`
**Status:** 80% complete

**What it does:**
- React-based admin interface
- Let merchants manage products
- Upload product images
- View analytics
- Track conversions
- Manage store settings

**Pages:**
- `page.tsx` - Dashboard home
- `upload/page.tsx` - Product upload
- `manage/page.tsx` - Product management
- `analytics/page.tsx` - Analytics/reporting
- `conversions/page.tsx` - Conversion tracking

**What's missing:**
- ❓ API integration for data
- ❓ Real product sync from Shopify/WooCommerce
- ❓ Image processing UI
- ❓ Size template management

### 3. Shopify Integration
**File:** `Shopify_new_tryon_upload_first.liquid`
**Status:** Ready to use

**What it does:**
- Liquid code for Shopify theme
- Injects widget on product pages
- Communicates with backend

**What's missing:**
- ❓ OAuth setup
- ❓ Product sync automation
- ❓ Webhook integration

### 4. Database Schema
**Status:** Complete (provided in SQL)

**Tables:**
- `stores` - Store information + quotas
- `inventory` - Products (sizes, measurements, images)
- `size_templates` - Store-specific size standards
- `conversions` - Track when users add to cart
- `tryon_analytics` - Track try-on usage
- `users` - Customer data

---

## PART 3: WHAT YOU NEED TO BUILD (3-WEEK PLAN)

### THE MISSING PIECES

**Core Infrastructure:**
1. ✅ **API Layer** - Backend to handle requests
2. ✅ **Shopify OAuth** - Install app flow
3. ✅ **WooCommerce Auto-Sync** - Pull products automatically
4. ✅ **Image Processing** - Smart image selection
5. ✅ **Tier Logic** - Decide what UX to show
6. ✅ **Frontend Widget** - Interactive try-on popup
7. ✅ **Integration** - Wire everything together

---

## PART 4: 3-WEEK SPRINT BREAKDOWN

### WEEK 1: Foundation & API Layer

#### Days 1-2: Setup & Review
**Deliverable:** Project repo ready, code reviewed

- [ ] Clone existing code to GitHub
- [ ] Review WordPress plugin code
- [ ] Review React storepanel code
- [ ] Review Shopify Liquid template
- [ ] Set up development environment
- [ ] Configure local database (Supabase)
- [ ] Test existing code runs locally

**Tools/Approach:**
- Use Cursor AI for code review (ask: "review this WordPress plugin")
- ChatGPT for understanding existing architecture
- Time: 4-5 hours

---

#### Days 3-5: Build REST API Layer
**Deliverable:** Working API endpoints

**Endpoints to build:**

```javascript
// Product Sync API
POST /api/sync/products
  Input: { store_id, products: [...] }
  Output: { success, synced_count, errors }

// Image Processing
POST /api/process-images
  Input: { product_id, images: [...] }
  Output: { best_image, tier, quality_score }

// Size Recommendation
POST /api/recommend-size
  Input: { product_id, user_measurements }
  Output: { recommended_size, fit_details }

// Analytics
POST /api/track-tryon
  Input: { store_id, product_id, action }
  Output: { logged: true }

// Store Config
GET /api/store/:store_id/config
  Output: { store_name, colors, quota_used }
```

**Stack:**
- **Node.js + Express** (lightweight, fast)
- **TypeScript** (for safety)
- **Supabase SDK** (for database)
- **AWS SDK** (for image processing)

**AI Approach:**
- Use Cursor with prompt: "Generate Express API endpoints for product sync, matching this schema [paste schema]"
- Let Cursor generate 80%, you review/fix 20%
- Time: 8-10 hours

**Code Structure:**
```
/api
  /routes
    - products.ts
    - sync.ts
    - images.ts
    - recommendations.ts
  /middleware
    - auth.ts
    - validation.ts
  /services
    - supabase.ts
    - imageProcessor.ts
    - sizeCalc.ts
  /types
    - index.ts
```

---

### WEEK 2: Shopify/WooCommerce Integration + Image Processing

#### Days 6-7: Shopify OAuth Integration
**Deliverable:** Shopify app installs, gets products

**What to build:**

1. **OAuth Flow**
   ```
   Merchant clicks "Install Stylique"
   → OAuth permission screen
   → Get access token
   → Store in database
   → Begin syncing
   ```

2. **Product Fetch**
   - Pull from Shopify Admin API
   - Map fields to your schema
   - Store in Supabase

3. **Webhook Setup**
   - Listen for product updates
   - Auto-sync when changes happen

**API Reference:**
- Shopify Admin API docs (provided by Shopify)
- OAuth endpoints
- Webhook registration

**AI Approach:**
- Prompt Cursor: "Create Shopify OAuth flow for [app_credentials]"
- Cursor generates OAuth handler
- Time: 6-8 hours

**Testing:**
- Test with test Shopify store (provided by Abdullah)
- Install app → verify products appear
- Update product → verify webhook fires

---

#### Days 8-9: WooCommerce Integration
**Deliverable:** WooCommerce plugin syncs products

**What to build:**

1. **REST API Calls**
   - Fetch products from WooCommerce API
   - Map to your schema

2. **WordPress Hooks**
   - Listen for product saves
   - Auto-sync on update

3. **Plugin Settings**
   - Store ID input
   - API key setup
   - Status dashboard

**Modify existing plugin:**
```php
// In stylique-virtual-tryon.php, add:

// On product save
add_action('woocommerce_product_updated', 'stylique_sync_product');

function stylique_sync_product($product_id) {
  $product = wc_get_product($product_id);
  // Send to your API
  wp_remote_post('your-api.com/api/sync/woocommerce', [
    'body' => json_encode([
      'store_id' => get_option('stylique_store_id'),
      'product' => [
        'id' => $product_id,
        'name' => $product->get_name(),
        'images' => // get product images,
        'sizes' => // extract variant info
      ]
    ])
  ]);
}
```

**AI Approach:**
- Prompt Cursor: "Add WooCommerce REST API calls to this PHP plugin"
- Time: 4-5 hours

**Testing:**
- Install plugin on test WooCommerce site
- Add test products
- Verify they appear in Stylique dashboard
- Update product → verify sync

---

#### Days 10-11: Image Processing
**Deliverable:** Smart image selection working

**Two Stages:**

**Stage 1: Backend Filtering (Rule-Based)**
```javascript
function filterImages(images) {
  return images.filter(img => {
    const score = 0;
    
    // Check resolution
    if (img.width < 300 || img.height < 300) return false;
    
    // Check aspect ratio (should be ~4:5 for fashion)
    const ratio = img.width / img.height;
    if (ratio < 0.5 || ratio > 2) return false;
    
    // Check file size (not too compressed, not lifestyle)
    if (img.size < 10KB || img.size > 5MB) return false;
    
    return true;
  }).slice(0, 4); // Keep max 4 candidates
}
```

**Stage 2: AWS Rekognition (AI)**
```javascript
const AWS = require('aws-sdk');

async function scoreImages(images) {
  const rekognition = new AWS.Rekognition();
  
  for (const image of images) {
    const result = await rekognition.detectLabels({
      Image: { Url: image.url },
      MaxLabels: 10
    }).promise();
    
    // Score based on detected labels
    let score = 0;
    
    // Bonus for product-related labels
    if (result.Labels.some(l => l.Name.includes('Clothing'))) {
      score += 3;
    }
    
    // Bonus for clean background
    if (result.Labels.some(l => l.Name.includes('Background'))) {
      score += 2;
    }
    
    // Penalty for people (lifestyle shot)
    if (result.Labels.some(l => l.Name.includes('Person'))) {
      score -= 3;
    }
    
    image.score = score;
  }
  
  // Return best image
  return images.sort((a, b) => b.score - a.score)[0];
}
```

**Implementation:**
- Create `/services/imageProcessor.ts`
- Install AWS SDK: `npm install aws-sdk`
- Client provides AWS credentials
- Call in your sync API

**AI Approach:**
- Prompt Cursor: "Create image processing service using AWS Rekognition"
- Time: 6-7 hours

**Testing:**
- Test with 10+ products
- Verify images filtered correctly
- Check tier assignment (Tier 1/2/3)
- Debug AWS scoring

---

### WEEK 3: Frontend Widget + Integration + Testing

#### Days 12-13: Frontend Widget Popup/Modal
**Deliverable:** Interactive try-on UI working

**What to build:**

**Modal Components:**

1. **Try-On Visual Layer**
   - Display primary product image
   - Show 3D viewer (Three.js)
   - Allow angle selection

2. **Size Recommendation**
   - Show recommended size
   - Display fit details
   - Allow adjustments

3. **Styling Section**
   - Show outfit suggestions
   - "Complete the look" items
   - Quick add-to-cart

**Modify existing plugin template:**
```php
// In templates/tryon-container.php

<div id="stylique-modal" class="stylique-modal">
  <!-- Try-On Tab -->
  <div class="stylique-tab-content" id="tryon-tab">
    <div id="stylique-3d-viewer"></div>
    <button class="stylique-btn-full">Add to Cart</button>
  </div>
  
  <!-- Size Tab -->
  <div class="stylique-tab-content" id="size-tab">
    <div class="size-recommendation">
      <h3>Your Size: <strong id="rec-size">L</strong></h3>
      <div class="fit-details">
        <p>Chest: Comfortable</p>
        <p>Waist: Comfortable</p>
      </div>
    </div>
  </div>
  
  <!-- Styling Tab -->
  <div class="stylique-tab-content" id="styling-tab">
    <!-- Related products -->
  </div>
</div>
```

**Enhance existing JS:**
```javascript
// In assets/js/tryon-script.js

class StylequeTryOn {
  constructor(config) {
    this.config = config;
    this.init3DViewer();
    this.attachEventListeners();
  }
  
  init3DViewer() {
    // Use Three.js to load 3D model
    // Already imported in plugin
  }
  
  attachEventListeners() {
    // Tab switching
    // Size selection
    // Add to cart
  }
}
```

**Enhance existing CSS:**
```css
/* In assets/css/tryon-style.css */

.stylique-modal {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 400px;
  height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
}

.stylique-tab-content {
  display: none;
  padding: 20px;
}

.stylique-tab-content.active {
  display: block;
}
```

**AI Approach:**
- Prompt Cursor: "Create interactive modal UI matching this structure [paste template]"
- Cursor generates React components or vanilla JS
- Time: 8-10 hours

**Testing:**
- Test on WooCommerce site
- Test on Shopify site
- Test responsive design (mobile)
- Test all tiers (Tier 1/2/3)

---

#### Days 14-15: Integration Testing & Final Polish
**Deliverable:** Everything works end-to-end

**Full Integration Flow Test:**

1. **Shopify Flow:**
   ```
   Install app → OAuth success
   → Products pulled
   → Images processed
   → Tier assigned
   → Widget shows on product page
   → Customer tries on
   → Analytics logged
   ```

2. **WooCommerce Flow:**
   ```
   Activate plugin → API key configured
   → Products synced
   → Images processed
   → Tier assigned
   → Widget shows on product page
   → Customer tries on
   → Analytics logged
   ```

3. **Manual Testing Checklist:**
   - [ ] Shopify: 5+ products sync correctly
   - [ ] WooCommerce: 5+ products sync correctly
   - [ ] Images: Correct tier assigned (Tier 1/2/3)
   - [ ] Widget: Displays on product page
   - [ ] Try-on: 3D viewer loads (if Tier 1/2)
   - [ ] Size: Recommendation shows correctly
   - [ ] Styling: Related items appear
   - [ ] Analytics: Logged correctly
   - [ ] Mobile: Widget responsive
   - [ ] Performance: <2s load time

**Bug Fixes & Polish:**
- Fix any failing tests
- Optimize images
- Improve UX
- Add error handling
- Security review

**Documentation:**
- API docs
- Setup guide
- Troubleshooting

**Deployment:**
- Deploy API
- Deploy React dashboard
- Publish WordPress plugin
- Publish Shopify app

**AI Approach:**
- Let Cursor run test suite
- Use ChatGPT to debug issues
- Time: 6-8 hours

---

## PART 5: HOW TO CHECK TRIALS & TEST

### Testing Strategy

**Unit Tests (Automated)**
```javascript
// Example: Test image filtering
test('should filter low-quality images', () => {
  const images = [
    { width: 100, height: 100 }, // Too small
    { width: 1200, height: 1500 }, // Good
  ];
  const filtered = filterImages(images);
  expect(filtered.length).toBe(1);
  expect(filtered[0].width).toBe(1200);
});

// Run with: npm test
```

**Integration Tests (Manual)**
```
1. Create test Shopify store
2. Install Stylique app
3. Add 10 test products
4. Check products appear in dashboard
5. Check images filtered correctly
6. Check tier assigned
7. Check widget shows on product page
```

**E2E Tests (User flows)**
```
Flow 1: Shopify Customer
- Go to product page
- Click "Try On"
- See size recommendation
- Click "Add to Cart"
- Verify analytics logged

Flow 2: WooCommerce Admin
- Upload product
- Check image processing
- Verify tier assigned
- Test override if needed

Flow 3: Store Owner
- Log into dashboard
- View analytics
- Check sync status
- Manage quotas
```

### Testing Checklist (Provided to Abdullah)

**Tier 1 Products (5+ images)**
- [ ] Try-on button visible
- [ ] 3D viewer loads
- [ ] Image carousel works
- [ ] Size recommendation shows
- [ ] Add to cart works

**Tier 2 Products (2-4 images)**
- [ ] Try-on button visible
- [ ] Limited image options
- [ ] Size recommendation shows
- [ ] Add to cart works

**Tier 3 Products (0-1 images)**
- [ ] Try-on button hidden
- [ ] Size recommendation shows
- [ ] Styling suggestions show
- [ ] Add to cart works

**Mobile Testing**
- [ ] Widget responsive
- [ ] Touch interactions work
- [ ] Performance OK
- [ ] No layout breaks

**Performance Metrics**
- [ ] Widget loads <2 seconds
- [ ] 3D viewer <3 seconds
- [ ] Analytics logged <500ms
- [ ] API response <1 second

---

## PART 6: AI OPTIMIZATION FOR SPEED

### Where to Use AI (Cursor + ChatGPT)

**Level 1: Code Generation (80% of your code)**
```
Prompt 1: "Generate Express API endpoints matching this schema [schema]"
→ Cursor generates 80% of code
→ You review/customize 20%
→ Saves: 3-4 hours per task

Prompt 2: "Create React component for product upload UI matching this design"
→ Cursor generates component
→ You connect to API
→ Saves: 2-3 hours

Prompt 3: "Generate WordPress plugin hooks for auto-sync"
→ Cursor generates hooks
→ You customize
→ Saves: 2 hours
```

**Level 2: Code Review & Debugging**
```
Prompt: "Review this PHP code for security issues"
→ ChatGPT identifies problems
→ Saves: 1-2 hours

Prompt: "Debug why this API call returns 404"
→ ChatGPT suggests fixes
→ Saves: 1 hour
```

**Level 3: Testing & Documentation**
```
Prompt: "Generate Jest tests for this function"
→ ChatGPT creates test suite
→ Saves: 1-2 hours

Prompt: "Write API documentation for these endpoints"
→ ChatGPT generates docs
→ Saves: 2 hours
```

### AI Workflow (Recommended)

**For each task:**

1. **Breakdown Task (5 min)**
   - Define inputs/outputs
   - Identify patterns
   - List requirements

2. **Prompt Cursor (10 min)**
   - Paste requirements
   - Ask for code
   - Get 80% working code

3. **Review & Customize (20 min)**
   - Review generated code
   - Fix API keys/URLs
   - Add custom logic
   - Test locally

4. **Deploy (5 min)**
   - Commit to git
   - Push to server
   - Test in production

**Result:** 40 minutes vs 2 hours per feature (5x faster)

---

## PART 7: DELIVERABLES CHECKLIST

### By End of Week 1
- ✅ API layer complete (all endpoints)
- ✅ Database connected
- ✅ Environment variables configured
- ✅ API tested locally
- ✅ Documentation started

### By End of Week 2
- ✅ Shopify OAuth working
- ✅ Shopify products syncing
- ✅ WooCommerce plugin integrated
- ✅ WooCommerce products syncing
- ✅ Image processing working (both stages)
- ✅ Tier logic assigned
- ✅ API deployed to production

### By End of Week 3
- ✅ Frontend widget working
- ✅ Size recommendation integrated
- ✅ Styling section working
- ✅ All tiers working
- ✅ Full integration tested
- ✅ Performance optimized
- ✅ Complete documentation
- ✅ Testing checklist provided
- ✅ Code deployed
- ✅ Ready for launch

---

## PART 8: TECH STACK & TOOLS

**Backend**
- Node.js + Express (API)
- TypeScript (type safety)
- Supabase (database)
- AWS (image processing)

**Frontend**
- React (admin dashboard)
- Vanilla JS + Three.js (widget)
- WordPress Plugin API (WooCommerce)
- Liquid (Shopify)

**Development Tools**
- Cursor AI (code generation)
- ChatGPT (debugging)
- VS Code (editor)
- Git (version control)
- Postman (API testing)
- Jest (unit tests)

**Deployment**
- Vercel (Node.js API)
- Vercel (React dashboard)
- WordPress.org (plugin)
- Shopify App Store (Shopify app)

---

## PART 9: COMMUNICATION WITH ABDULLAH

### What You Report Weekly

**Week 1 Report:**
- API layer 100% complete
- 5+ endpoints working
- Database synced
- No blockers

**Week 2 Report:**
- Shopify integration 100%
- WooCommerce integration 100%
- Image processing 100%
- 50+ products synced successfully

**Week 3 Report:**
- Widget 100% complete
- All tiers working
- Analytics logging
- Testing complete
- Ready for launch

### Success Metrics

**Abdullah will test:**
1. Install Shopify app → 5 products sync
2. Activate WordPress plugin → 5 products sync
3. Visit product page → Widget shows
4. Click try-on → 3D viewer loads (if Tier 1/2)
5. Get size recommendation → Works
6. See styling suggestions → Works
7. Add to cart → Analytics logged

---

## PART 10: RISK MITIGATION

### Potential Issues & Solutions

**Issue 1: API Takes Too Long**
- Risk: Low if you use Cursor
- Solution: Use code generation, don't write from scratch
- Timeline Impact: +0 days (AI handles it)

**Issue 2: Image Processing Slow**
- Risk: Medium (AWS API calls)
- Solution: Batch processing, cache results
- Timeline Impact: +1 day if needed

**Issue 3: Shopify OAuth Confusing**
- Risk: Medium
- Solution: Use Shopify SDK, follow docs
- Timeline Impact: +1 day if needed

**Issue 4: Database Schema Issues**
- Risk: Low (schema already provided)
- Solution: Test before syncing large data
- Timeline Impact: +0 days

**Issue 5: Missing Code Sections**
- Risk: Medium
- Solution: Use Cursor to fill gaps
- Timeline Impact: +2 days max

---

## PART 11: QUALITY ASSURANCE BEFORE DELIVERY

### Final QA Checklist

**Code Quality**
- [ ] All TypeScript types defined
- [ ] No console.logs in production
- [ ] No hardcoded credentials
- [ ] Error handling on all API calls
- [ ] Input validation on all endpoints

**Security**
- [ ] API validates OAuth tokens
- [ ] Database queries use parameterized statements
- [ ] HTTPS enforced
- [ ] Rate limiting on sync endpoints
- [ ] No sensitive data in logs

**Performance**
- [ ] All API calls <1 second
- [ ] Widget loads <2 seconds
- [ ] Images optimized
- [ ] Database queries indexed
- [ ] No N+1 queries

**Testing**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Mobile testing done
- [ ] Performance tested

**Documentation**
- [ ] API docs complete
- [ ] Setup guide written
- [ ] Troubleshooting guide written
- [ ] Code comments added
- [ ] README updated

---

## FINAL EXECUTION TIMELINE

```
Day 1-2:   Setup & Code Review (4 hours)
Day 3-5:   API Layer (10 hours)
Day 6-7:   Shopify Integration (8 hours)
Day 8-9:   WooCommerce Integration (5 hours)
Day 10-11: Image Processing (7 hours)
Day 12-13: Frontend Widget (10 hours)
Day 14-15: Integration & Testing (8 hours)

TOTAL: ~52 hours over 3 weeks
= ~18 hours/week
= ~3.6 hours/day (very achievable!)
```

---

## SUCCESS DEFINITION

Project is complete when:

1. ✅ Shopify app installs cleanly
2. ✅ Products auto-sync from Shopify
3. ✅ WordPress plugin activates cleanly
4. ✅ Products auto-sync from WooCommerce
5. ✅ Images auto-processed & tiered
6. ✅ Widget shows on product pages
7. ✅ Size recommendations work
8. ✅ Styling suggestions show
9. ✅ Analytics logged
10. ✅ All 3 payment milestones completed
11. ✅ Complete documentation provided
12. ✅ Testing checklist passed

---

**You've got this! 3 weeks, fully achievable with AI acceleration.** 🚀

Let's build something great!
