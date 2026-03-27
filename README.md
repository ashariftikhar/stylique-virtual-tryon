# Stylique Virtual Try-On Platform

An AI-powered virtual try-on and size recommendation system for e-commerce platforms (WordPress, Shopify, and custom React dashboards).

## 📋 Project Overview

Stylique Virtual Try-On enables customers to virtually try on clothing items using AI technology. The platform includes:

- **WordPress Plugin** (95% complete) - WooCommerce integration for product pages
- **Shopify Integration** (95% complete) - Liquid template with OTP authentication
- **React Store Panel** (80% complete) - Merchant dashboard for inventory and analytics
- **Backend API** (To be created) - Node.js + Express
- **Database** (To be configured) - Supabase with SQL schema

## 🗂️ Project Structure

```
stylique-virtual-tryon/
├── backend/              Node.js + Express API
├── database/             Supabase schema and migrations
├── storepanel/           React Next.js dashboard for merchants
├── wordpress-stylique-virtual-tryon/  WooCommerce plugin
├── shopify/              Liquid template for Shopify themes
└── docs/                 Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for database)
- WordPress 5.0+ (for plugin)
- Shopify store (for Liquid integration)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ashariftikhar/stylique-virtual-tryon.git
   cd stylique-virtual-tryon
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm start
   ```

3. **Store Panel Setup**
   ```bash
   cd storepanel
   npm install
   npm run dev
   ```

4. **Database Setup**
   - Review `database/schema.sql`
   - Import schema to your Supabase instance

5. **WordPress Plugin**
   - Copy `wordpress-stylique-virtual-tryon/` to `wp-content/plugins/`
   - Activate in WordPress admin

6. **Shopify Integration**
   - Upload Liquid template to your Shopify theme

## 📚 Documentation

See [docs/README.md](./docs/README.md) for:
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Setup Guides](./docs/)

## 🔧 Technology Stack

- **Frontend**: React + Next.js, TypeScript
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (via Supabase)
- **Integrations**: WordPress (WooCommerce), Shopify (Liquid)
- **Authentication**: OTP-based

## 📝 Project Status

| Component | Status | Details |
|-----------|--------|---------|
| WordPress Plugin | 95% | Admin settings, WooCommerce hooks, frontend render |
| Shopify Liquid | 95% | OTP login, minimal design, full integration |
| React Dashboard | 80% | Core pages: upload, analytics, conversions, manage |
| Backend API | TODO | To be created |
| Database Schema | TODO | To be populated |
| Documentation | TODO | In progress |

## 🤝 Contributing

For team guidelines and development practices, see `docs/CONTRIBUTING.md` (to be created).

## 📄 License

GPL-2.0+

---

**Phase 1 Focus**: Finalize backend API, complete database schema, and integrate all components.
