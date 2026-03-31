# SERVICE AGREEMENT

**STYLIQUE PHASE 1: INTEGRATION & PRODUCT SYNC**

---

## 1. PARTIES TO THIS AGREEMENT

**SERVICE PROVIDER:**
Name: Ashar Iftikhar
Title: AI Systems Architect | Web Developer | Automation Specialist
Email: officialashii72@gmail.com
Website: ashflow.site
Phone/WhatsApp: Available upon request

**CLIENT:**
Name: Abdullah Jan
Position: Founder & CEO
Company: Stylique Technologies
Contact: [To be filled by client]
Email: [To be filled by client]

---

## 2. PROJECT OVERVIEW & CONTEXT

### 2.1 What is Stylique?
Stylique is a B2B SaaS platform for fashion ecommerce that helps online shoppers:
- Choose the right size for their body measurements
- Visualize products through try-on functionality
- Receive styling suggestions
- Reduce hesitation and product returns
- Improve conversion rates

### 2.2 Current State
Client has an existing system with:
- Backend infrastructure (Next.js + TypeScript + Supabase)
- Size recommendation logic
- Product widget
- Multi-tenant database structure

**Current Problem:** Product onboarding is manual, time-consuming, and not scalable.

### 2.3 Phase 1 Goal
Move from manual product uploads to fully automated product sync from Shopify and WooCommerce, with intelligent image processing, automatic tier-based widget routing, and integrated frontend popup/modal for try-on flow.

This project is NOT a complete rebuild. It is an integration and automation project that works with and extends the existing backend.

---

## 3. SCOPE OF WORK - PHASE 1

### 3.1 Shopify OAuth Custom App

**What Will Be Built:**
- Shopify OAuth custom application with secure installation flow
- Automatic product synchronization from Shopify store via Admin API
- Real-time product updates via webhook system
- Minimal merchant-side setup required

**Specific Functionality:**
- OAuth 2.0 authentication flow
- Product, variant, image, and size data pulling
- Automatic syncing to existing Supabase backend
- Webhook integration for real-time updates
- Error handling and retry logic

---

### 3.2 WooCommerce Plugin

**What Will Be Built:**
- WordPress plugin for WooCommerce platform
- One-click installation from WordPress dashboard
- Automatic product synchronization via WooCommerce REST API
- Real-time product updates via WordPress hooks
- Minimal merchant-side configuration required

**Specific Functionality:**
- Product, variant, image, and attribute data pulling
- Automatic syncing to existing Supabase backend
- WordPress hook-based real-time updates
- Error handling and logging

---

### 3.3 Integration Layer

**What Will Be Built:**
- Central integration system that receives sync requests from both Shopify and WooCommerce
- Data transformation and normalization
- Database operations and multi-tenant data management
- Image processing orchestration
- API endpoints for sync operations

**Specific Functionality:**
- Shopify → Stylique data mapping
- WooCommerce → Stylique data mapping
- Supabase insert/update/delete operations
- Multi-tenant data isolation
- Error logging and monitoring

---

### 3.4 Two-Stage Image Processing System

#### Stage 1: Backend Image Filtering (Rule-Based)

**Purpose:** Remove obvious low-quality/unusable images automatically

**What Gets Removed:**
- Zoomed or detail shots (close-ups of fabric/texture)
- Fabric swatches or material samples
- Weird crops or incomplete product views
- Lifestyle shots with people or models
- Low resolution images
- Images that don't show full product

**How It Works:**
- Analyzes image dimensions, aspect ratio, file size
- Applies rule-based scoring
- Keeps only quality candidates (2-4 from original 10+)
- Tags each image with quality score

**Result:** Automatically solves ~70-80% of image quality problem

#### Stage 2: AWS Rekognition AI Scoring

**Purpose:** Select the single best image for try-on display

**What Happens:**
- Takes only the 2-4 filtered images from Stage 1
- Sends to AWS Rekognition API for analysis
- Rekognition scores each for:
  - Product visibility and clarity
  - Background quality (clean vs cluttered)
  - Full product visibility (complete view)
  - Suitability for try-on
- System automatically selects best image
- Stores quality scores and marks `tryon_ready` status

**Result:** 
- One optimized image per product (primary_tryon_image)
- Done ONCE during product sync (not per user)
- Low API costs (only 2-4 images per product)

**Fallback:** If no image is suitable, `tryon_ready` is set to false, and product shows size recommendations instead

---

### 3.5 Tier-Based Widget Routing

**Purpose:** Display appropriate user experience based on available product images

**Tier 1 (5+ usable images):**
- Show 2-3 best product images
- Allow user to select viewing angle
- Full try-on experience
- Plus size recommendation
- Plus styling suggestions

**Tier 2 (2-4 usable images):**
- Show image carousel
- User can swipe to view different angles
- Try-on works but with limited angle options
- Plus size recommendation
- Plus styling suggestions

**Tier 3 (0-1 usable images):**
- Skip visual try-on completely
- Show size recommendation directly
- Show styling suggestions
- No broken experiences - graceful degradation

**Integration:** 
- Existing size recommendation logic untouched
- Only the visual presentation layer changes based on tier
- All tiers equally functional

---

### 3.6 Frontend Widget Popup/Modal (NEW IN PHASE 1)

**What Will Be Built:**
Interactive popup/modal UI layer for the try-on flow with:

**Components:**
- Try-On Visual Layer
  - Display primary product image
  - Allow angle/view selection (for Tier 1/2)
  - Visual try-on interaction
  
- Size Recommendation Display
  - Show recommended size
  - Display fit details (chest, waist, shoulders, etc.)
  - Show fit confidence score
  - Allow size adjustment/alternatives
  
- Styling/Outfit Section
  - Display styling suggestions (if supported in current flow)
  - "Complete the Outfit" options (if applicable)
  - Related products or recommendations

- User Experience
  - Responsive design (desktop + mobile)
  - Smooth transitions and interactions
  - Add to cart integration
  - Close/exit functionality

**Integration:**
- Works with all three tiers (Tier 1/2/3 UX variations)
- Integrates existing size recommendation logic
- Uses primary_tryon_image from image processing
- Fallback to Tier 3 (size-only) display when images unavailable

**Not Included:**
- Advanced animations (keep it clean and performant)
- Custom styling logic beyond current system
- User tracking or analytics

---

### 3.7 Basic Admin Dashboard

**Features:**
- View all synced products
- See product sync status (success, pending, failed)
- View image quality scores
- See tier assignments for each product
- View primary_tryon_image selection
- Manual override capability if needed
- Product count and status summary

**Not Included:**
- Advanced analytics or conversion tracking
- User interaction reports
- Revenue dashboards
- Custom reporting

---

### 3.8 Comprehensive Testing & Quality Assurance

**Testing Scope:**
- Shopify OAuth installation flow (end-to-end)
- WooCommerce plugin installation (end-to-end)
- Product sync from both platforms (various product types)
- Image processing pipeline (various image scenarios)
- Tier assignment logic
- Fallback and error handling
- Multi-tenant data isolation
- Performance under typical load
- Real-time update/webhook functionality
- Frontend widget popup (all tiers, responsive design)
- Widget integration with size recommendation
- Styling/outfit display (if applicable)

**Deliverables:**
- Detailed test results document
- Quality assurance report
- Bug tracking and resolution log
- Production-ready code

---

### 3.9 Documentation & Deployment

**Documentation Provided:**
- Complete API documentation
- Database schema documentation
- Architecture overview
- Frontend widget implementation guide
- Deployment guide (step-by-step)
- Troubleshooting guide
- Code comments and inline documentation
- Webhook setup guide
- Admin dashboard user guide
- Widget modal/popup usage guide

**Deployment Support:**
- Detailed deployment instructions
- Guidance on production setup
- Environment variable configuration
- Database migration guide
- 2 weeks of bug fixes post-delivery

---

## 4. WHAT IS NOT INCLUDED IN PHASE 1

The following are explicitly excluded from Phase 1 and may be part of Phase 2:

- Advanced analytics and conversion tracking
- AI-based personalization or recommendations
- Custom styling recommendation logic beyond current system
- Enhanced decision engine improvements
- User behavior tracking and reporting
- A/B testing functionality
- Custom merchant workflows
- Mobile app development
- Additional integrations beyond Shopify/WooCommerce

---

## 5. PROJECT TIMELINE

**Project Duration:** 5-6 weeks from project start date

**Start Date:** Upon signed contract and receipt of initial payment (70,000 PKR / $251 USD)

**Delivery Date:** 5-6 weeks after project start date

**Status:** Fully tested, production-ready, documented

**Weekly Breakdown:**
- **Week 1-2:** Foundation, Shopify/WooCommerce setup, integration layer foundation
- **Week 2-3:** Product sync implementation and verification
- **Week 3-4:** Image processing, tier logic, admin dashboard
- **Week 4-5:** Frontend widget popup/modal development and integration
- **Week 5-6:** Comprehensive testing, documentation, final delivery

---

## 6. INVESTMENT & PAYMENT TERMS

### 6.1 Total Investment
**USD $850** (Eight Hundred Fifty Dollars)
**or**
**PKR 236,099** (Two Hundred Thirty-Six Thousand Ninety-Nine Pakistani Rupees)

*Exchange Rate: 1 USD = 278.94 PKR*

This is a fixed price for the complete Phase 1 project as described in this agreement.

### 6.2 Payment Structure

**Three-Part Payment Schedule:**

| Payment | Amount (USD) | Amount (PKR) | Timing | Description |
|---------|--------------|-------------|--------|-------------|
| **Payment 1** | $251 | 70,000 | Upfront (Now) | Project initiation, Week 1 begins |
| **Payment 2** | $299 | 83,465 | After 1 week | Remaining 50% of upfront |
| **Payment 3** | $425 | 118,599 | Upon delivery | Final 50% upon completion and testing |
| **TOTAL** | **$850** | **236,099** | | |

**Why This Structure:**
- Payment 1 (70,000 PKR): Covers Week 1 setup costs
- Payment 2 (83,465 PKR): Completes 50% upfront, covers Weeks 2-3
- Payment 3 (118,599 PKR): Final 50% upon delivery

### 6.3 Payment Method
Payment method to be mutually agreed between Service Provider and Client.
Options may include: Bank transfer, Cryptocurrency, or other mutually acceptable method.

### 6.4 Currency
All amounts provided in both USD and PKR.
Exchange rate: 1 USD = 278.94 PKR (fixed for this agreement)

### 6.5 Late Payment
If payment is overdue by more than 5 business days, a late fee of 1.5% per week may be applied.

### 6.6 Refund Policy
- If Client terminates before project start: Full refund of any payments
- If Client terminates during development: Payment due for completed work only
- If Service Provider fails to deliver: Full refund of completion payment

---

## 7. CLIENT RESPONSIBILITIES & REQUIRED ACCESS

For this project to proceed smoothly, Client agrees to provide the following:

### 7.1 Codebase Access
- [ ] GitHub read/write access to backend repository
- [ ] Complete backend code and documentation
- [ ] Access to existing widget code
- [ ] API endpoint documentation
- [ ] Development branch access

### 7.2 Database Access
- [ ] Supabase project access (admin or developer role)
- [ ] Database schema documentation or review
- [ ] Credentials for staging/test database
- [ ] Sample/test data if available

### 7.3 Test Environment & Stores
- [ ] Test Shopify store URL with admin API access
- [ ] Shopify API key and secret
- [ ] Test WooCommerce site URL with admin access
- [ ] WordPress admin credentials for testing
- [ ] Sample products for sync testing (minimum 10-20)
- [ ] Various image scenarios for testing

### 7.4 AWS/API Credentials
- [ ] AWS Rekognition API credentials (or AWS account access)
- [ ] AWS API keys or IAM credentials
- [ ] Note: Client manages AWS costs via provided credits

### 7.5 Communication & Availability
- [ ] Primary contact person designated
- [ ] Preferred communication method (WhatsApp, Slack, Email)
- [ ] Availability for quick clarifications
- [ ] Timely feedback on deliverables

### 7.6 Review & Approval
- [ ] Review deliverables within agreed timeframe
- [ ] Provide feedback for improvements
- [ ] Final sign-off upon completion

---

## 8. COMMUNICATION & PROJECT MANAGEMENT

### 8.1 Communication Channels
- **Daily Updates:** Optional (can be weekly instead)
- **Quick Questions:** WhatsApp, Slack, or email as preferred by Client
- **Status Updates:** Weekly summary of progress
- **Check-In Calls:** Weekly if needed, or on-demand

### 8.2 Communication Expectations
- Service Provider will respond to messages within 24 hours during business days
- Weekly status report minimum
- Client will provide timely feedback on deliverables
- Both parties agree to respectful and professional communication

### 8.3 Project Management
- Weekly milestone tracking
- Status updates on scope, timeline, and budget
- Issue and bug logging system
- Documentation of all decisions made

---

## 9. DELIVERABLES & ACCEPTANCE

### 9.1 What Client Receives

**Code & Systems:**
1. Shopify OAuth custom app (source code + production build)
2. WooCommerce plugin (source code + production build)
3. Integration layer backend (source code)
4. Image processing pipeline (code + configuration)
5. Frontend widget popup/modal (React/TypeScript component)
6. Complete database schema and migrations
7. Admin dashboard implementation

**Documentation:**
1. Complete API documentation
2. Database schema documentation
3. Architecture and design documentation
4. Frontend widget implementation guide
5. Deployment guide and instructions
6. Troubleshooting guide
7. Code comments and inline documentation
8. Webhook setup and testing guide
9. Admin dashboard user guide
10. Widget modal/popup usage guide

**Testing & Quality:**
1. Test results document
2. Quality assurance report
3. Bug log and resolutions

### 9.2 Acceptance Criteria

Project is considered complete and acceptable when:
- ✅ Shopify app installs cleanly and products sync automatically
- ✅ WooCommerce plugin installs and products sync automatically
- ✅ All product data synced correctly (sizes, images, attributes)
- ✅ Image processing filters and scores images appropriately
- ✅ Tier logic correctly assigns Tier 1/2/3
- ✅ Widget displays appropriate UX for each tier
- ✅ Size recommendations working across all tiers
- ✅ Frontend popup/modal displays and functions correctly (all tiers)
- ✅ Styling/outfit section integrated (if supported in current flow)
- ✅ No broken experiences (graceful fallbacks)
- ✅ Admin dashboard functional
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Code is production-ready

---

## 10. INTELLECTUAL PROPERTY RIGHTS

### 10.1 Code Ownership

**Stylique owns:**
- All project-specific code developed for Stylique under this agreement
- All deliverables created specifically for Stylique Phase 1
- Full ownership of the codebase upon full payment ($850 / 236,099 PKR)

**Service Provider retains:**
- General development knowledge, patterns, and methodologies
- Reusable code libraries and frameworks (not Stylique-specific)
- Know-how from the development process

### 10.2 Existing Systems
- Client retains all ownership and rights to existing Stylique codebase
- Service Provider acknowledges and respects Client's ownership

### 10.3 Third-Party Services
- Both parties agree to comply with terms of third-party services (Shopify, WooCommerce, AWS, Supabase, etc.)
- API credentials and keys remain Client's responsibility

### 10.4 Case Study & References
- Service Provider may reference this project as a case study, testimonial, or portfolio use
- **Only with Client's prior written approval for each use**
- Client controls the narrative and public disclosure
- Service Provider cannot use brand name, specific metrics, or proprietary details without explicit permission

---

## 11. CONFIDENTIALITY & NON-DISCLOSURE

### 11.1 Confidential Information
Both parties agree to maintain strict confidentiality regarding:
- Business strategies and plans
- Technical architecture and implementation details
- Financial information
- Customer data and metrics
- Proprietary algorithms and logic
- Any information marked as confidential

### 11.2 Permitted Disclosures
- Service Provider may disclose information required for project implementation
- Service Provider may use this project as a case study (with prior written Client approval)
- Disclosures required by law or court order

### 11.3 Term
This confidentiality obligation survives termination of this agreement and continues indefinitely.

---

## 12. WARRANTY & SUPPORT

### 12.1 Warranty
Service Provider warrants that:
- All code will be original and not infringe on third-party rights
- The system will function as specified in this agreement
- Code will be tested and production-ready
- Documentation will be complete and accurate

### 12.2 Post-Delivery Support
**Included (2 weeks after delivery):**
- Bug fixes for issues in newly delivered code
- Email/Slack support for technical issues
- Deployment guidance and troubleshooting
- Documentation clarification

**Not Included:**
- Issues in Client's existing code
- Extended support beyond 2 weeks
- New feature requests (Phase 2)
- Unlimited revisions after delivery

### 12.3 Extended Support
Support beyond 2 weeks is available at additional rates (hourly basis).

---

## 13. LIABILITY & INDEMNIFICATION

### 13.1 Limitation of Liability
Service Provider's total liability under this agreement shall not exceed the total project cost ($850 / 236,099 PKR).

Service Provider will not be liable for:
- Indirect, incidental, consequential, or punitive damages
- Lost profits, lost revenue, lost business opportunity
- Loss of data (unless caused by Service Provider's negligence)

### 13.2 Indemnification
Client shall indemnify and hold harmless Service Provider from:
- Claims arising from Client's use of the system
- Claims related to third-party services (Shopify, AWS, etc.)
- Claims related to data provided by Client

---

## 14. CHANGES & SCOPE MANAGEMENT

### 14.1 Scope Changes
Any changes or additions to the agreed scope must be:
- Documented in writing
- Approved by both parties
- May result in timeline and/or budget adjustments

### 14.2 Change Request Process
1. Client submits change request in writing
2. Service Provider estimates impact on timeline and budget
3. Both parties agree on adjusted terms
4. Change is documented and signed by both parties
5. Work resumes with new timeline

### 14.3 Scope Creep Prevention
Changes requested after initial payment (70,000 PKR) will be quoted separately and may delay the project.

---

## 15. TERMINATION & DISPUTE RESOLUTION

### 15.1 Termination for Cause
Either party may terminate this agreement if the other party:
- Materially breaches a term of this agreement
- Fails to remedy the breach within 5 business days of written notice
- Becomes insolvent or bankrupt

### 15.2 Termination for Convenience
Either party may terminate with 5 business days written notice.

### 15.3 Effects of Termination
- All outstanding payments become immediately due
- Client receives all work completed to date
- Service Provider retains ownership of incomplete work
- Both parties comply with confidentiality obligations

### 15.4 Dispute Resolution
If a dispute arises:
1. Both parties attempt to resolve through discussion
2. If unresolved, either party may seek mediation
3. If mediation fails, either party may pursue legal action
4. Governing law: Laws of Pakistan or as mutually agreed

---

## 16. GENERAL PROVISIONS

### 16.1 Entire Agreement
This agreement, together with all attached documents, constitutes the entire agreement between the parties regarding this project. All prior discussions and agreements are superseded.

### 16.2 Amendments
Any amendments must be in writing and signed by both parties.

### 16.3 Severability
If any provision is found invalid, the remaining provisions continue in full effect.

### 16.4 Governing Law
This agreement is governed by the laws of Pakistan, or as mutually agreed by both parties.

### 16.5 Assignment
Neither party may assign this agreement without written consent of the other party.

### 16.6 Notices
All notices must be sent to the email addresses listed above.

---

## 17. SIGNATURES

By signing below, both parties acknowledge that they have read, understood, and agree to all terms and conditions of this Service Agreement.

### SERVICE PROVIDER

Name: Ashar Iftikhar

Email: officialashii72@gmail.com

Website: ashflow.site

Signature: ___________________________

Date: ___________________________

---

### CLIENT

Name: Abdullah Jan

Company: Stylique Technologies

Email: _______________________________

Signature: ___________________________

Date: ___________________________

---

## 18. APPENDICES

### Appendix A: Project Deliverables List
- Shopify OAuth custom app (code + build)
- WooCommerce plugin (code + build)
- Integration layer backend
- Image processing system
- Frontend widget popup/modal
- Admin dashboard
- Complete source code
- API documentation
- Database schema
- Deployment guide
- Test results
- Widget usage guide

### Appendix B: Timeline (5-6 weeks)
- Week 1-2: Foundation & setup
- Week 2-3: Core sync implementation  
- Week 3-4: Image processing & tier logic
- Week 4-5: Frontend widget development
- Week 5-6: Testing, documentation, delivery

### Appendix C: Payment Schedule
- Payment 1: 70,000 PKR ($251 USD) - Upfront
- Payment 2: 83,465 PKR ($299 USD) - After 1 week
- Payment 3: 118,599 PKR ($425 USD) - Upon delivery

---

**END OF SERVICE AGREEMENT**

This document is legally binding upon both parties. Please read carefully before signing.

For questions about this agreement, contact:
Service Provider: Ashar Iftikhar
Email: officialashii72@gmail.com
Website: ashflow.site

---

**Document Version:** 2.0 (Updated)
**Date Created:** March 25, 2026
**Status:** Ready for Signature