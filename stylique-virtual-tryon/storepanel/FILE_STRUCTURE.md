# Complete File Structure

## Directory Tree

```
storepanel/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx                    # 🔐 Login page
│   │   ├── (dashboard)/
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx                    # 📊 Analytics dashboard
│   │   │   ├── conversions/
│   │   │   │   └── page.tsx                    # 📈 Conversion tracking
│   │   │   ├── manage/
│   │   │   │   └── page.tsx                    # 📦 Inventory management
│   │   │   ├── upload/
│   │   │   │   └── page.tsx                    # ⬆️  Product upload
│   │   │   ├── layout.tsx                      # 🎨 Dashboard layout
│   │   │   └── page.tsx                        # 🏠 Dashboard home
│   │   ├── globals.css                         # 🎨 Global styles
│   │   ├── layout.tsx                          # 📄 Root layout
│   │   └── page.tsx                            # ↩️  Home redirect
│   ├── components/
│   │   ├── (storepanel)/
│   │   │   └── .placeholder                    # 📝 Component templates
│   │   └── ui/
│   │       ├── index.tsx                       # 🧩 Basic UI components
│   │       └── toast.tsx                       # 🔔 Toast notifications
│   ├── contexts/
│   │   └── StorePanelContext.tsx               # 🎯 Store context provider
│   ├── hooks/
│   │   └── useAuth.ts                          # 🔐 Auth hook
│   ├── lib/
│   │   ├── api.ts                              # 🌐 API client
│   │   ├── supabaseClient.ts                   # 📊 Supabase client
│   │   └── utils.ts                            # 🔧 Utilities
│   ├── types/
│   │   ├── api.ts                              # 📋 API types
│   │   └── store.ts                            # 📋 Domain types
│   └── middleware.ts                           # 🔒 Route protection
├── .env.example                                 # ⚙️  Environment template
├── .eslintrc.json                               # ✅ ESLint config
├── .gitignore                                   # 📝 Git ignore
├── .prettierrc.json                             # 🎨 Prettier config
├── next.config.js                               # ⚙️  Next.js config
├── package.json                                 # 📦 Dependencies
├── postcss.config.js                            # 🎨 PostCSS config
├── tailwind.config.ts                           # 🎨 Tailwind config
├── tsconfig.json                                # ⚙️  TypeScript config
├── README.md                                    # 📖 Quick start
├── SETUP.md                                     # 📖 Setup guide
├── TRANSFORMATION_SUMMARY.md                    # ✨ What was done
├── FILE_STRUCTURE.md                            # 📑 This file
├── setup.sh                                     # 🚀 Unix setup script
└── setup.bat                                    # 🚀 Windows setup script
```

---

## Key Files by Function

### Authentication & Security
- `src/app/(auth)/login/page.tsx` - Login form
- `src/middleware.ts` - Route protection
- `src/hooks/useAuth.ts` - Auth hook

### API Integration
- `src/lib/api.ts` - API client with typed methods
- `src/types/api.ts` - API response types
- `src/lib/supabaseClient.ts` - Supabase client

### Pages
- `src/app/(dashboard)/page.tsx` - Dashboard home
- `src/app/(dashboard)/upload/page.tsx` - Product upload
- `src/app/(dashboard)/manage/page.tsx` - Inventory list
- `src/app/(dashboard)/analytics/page.tsx` - Analytics
- `src/app/(dashboard)/conversions/page.tsx` - Conversions

### Components & UI
- `src/components/ui/index.tsx` - Button, Input, Card, Badge components
- `src/components/ui/toast.tsx` - Toast notification system
- `src/contexts/StorePanelContext.tsx` - Global store state

### Configuration
- `next.config.js` - Image optimization, env vars
- `tsconfig.json` - TypeScript paths and strict mode
- `tailwind.config.ts` - Theme customization
- `package.json` - Dependencies and build scripts

### Documentation
- `README.md` - Project overview
- `SETUP.md` - Installation and development guide
- `TRANSFORMATION_SUMMARY.md` - What was created
- `FILE_STRUCTURE.md` - This file

---

## Development Flow

### User Authentication
1. User navigates to `/auth/login`
2. Enters store ID and password
3. `handleLogin` calls `/api/test-auth`
4. Session cookie is set
5. Redirects to `/dashboard`

### Dashboard Experience
1. Middleware checks session cookie
2. `(dashboard)/layout.tsx` loads store info
3. Pages render with store data
4. API calls use `apiClient` for backend integration

### Product Upload
1. User navigates to `/dashboard/upload`
2. Fills form with product details
3. Submits to backend API
4. Success notification shown
5. Form resets for next product

### Analytics View
1. User navigates to `/dashboard/analytics`
2. Page fetches analytics from backend
3. Displays summary stats and table
4. Can filter by time range
5. Can export as CSV

---

## Component Hierarchy

```
Root Layout (src/app/layout.tsx)
├── (Auth Route)
│   └── Login Page
│       ├── Login Form
│       ├── Error Alert
│       └── Loading State
│
└── (Dashboard Route)
    └── Dashboard Layout
        ├── Top Bar
        ├── Main Content
        │   ├── Dashboard Home
        │   │   ├── Welcome Hero
        │   │   ├── Stats Grid
        │   │   └── Store Info
        │   ├── Upload Page
        │   │   └── Product Form
        │   ├── Manage Page
        │   │   ├── Search Bar
        │   │   └── Product List
        │   ├── Analytics Page
        │   │   ├── Filters
        │   │   ├── Summary Stats
        │   │   └── Events Table
        │   └── Conversions Page
        │       └── Placeholder
        └── Toast Provider
            └── Toast Notifications
```

---

## Data Flow

### API Integration
```
Component
    ↓
useAuth() / apiClient
    ↓
src/lib/api.ts (ApiClient)
    ↓
Backend API (http://localhost:5000)
    ↓
Database
    ↓
Response
    ↓
Component State Update
    ↓
Re-render with Data
```

### Type Safety
```
API Response
    ↓
src/types/api.ts (Type Definition)
    ↓
Component Props
    ↓
TypeScript Compiler (Type Checking)
    ↓
No Runtime Errors
```

---

## Key Integration Points

### 1. Backend API Client
**Location**: `src/lib/api.ts`
**Usage**: 
```typescript
import { apiClient } from '@/lib/api';
const config = await apiClient.getStoreConfig(storeId);
```

### 2. Type Definitions
**Location**: `src/types/api.ts`
**Exports**: StoreConfig, InventoryItem, TryonAnalytics, etc.

### 3. Authentication
**Location**: `src/middleware.ts`
**Protection**: Routes under `(dashboard)` require valid session

### 4. Context
**Location**: `src/contexts/StorePanelContext.tsx`
**Usage**: `useStorePanel()` for store data in components

### 5. Utils
**Location**: `src/lib/utils.ts`
**Functions**: Format currency, dates, truncate strings, etc.

---

## Styling Approach

### Tailwind CSS
- Utility-first CSS framework
- Configured in `tailwind.config.ts`
- Custom colors: purple (#642FD7), pink (#F4536F)

### Global Styles
- `src/app/globals.css` - Base styles and animations
- Custom animations: twinkle, pulse-slow
- Dark theme foundation

### Component Styles
- Inline Tailwind classes in JSX
- No CSS modules unless needed
- Consistent spacing and sizing

---

## Build & Deployment

### Development
```bash
npm run dev       # Start dev server (port 3000)
```

### Production
```bash
npm run build     # Build for production
npm start         # Start production server
```

### Code Quality
```bash
npm run lint      # Check code style
npm run format    # Format code with Prettier
```

---

## Environment Variables

### Required for Frontend
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (default: http://localhost:5000)

### Optional
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase API key

All `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets in these!

---

## Performance Considerations

### Image Optimization
- Configured in `next.config.js`
- Remote image patterns for Shopify, WooCommerce, Supabase

### Code Splitting
- Next.js automatically splits by route
- Components lazy-loaded automatically
- Minimal JS bundle for each page

### Caching
- Static pages cached at build time
- API responses cached in component state
- Browser cache headers configured

---

## Security Features

### Authentication
- Session-based with secure cookies
- Middleware route protection
- Automatic redirect on session expiry

### Data
- TypeScript for type safety
- Input validation on forms
- XSS protection from React escaping

### API
- CORS configured for backend
- Secure environment variables
- No credentials in code

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Common Customizations

### Add New Page
1. Create `src/app/(dashboard)/[feature]/page.tsx`
2. Add 'use client' for interactivity
3. Use layout automatically

### Change Colors
1. Edit `tailwind.config.ts`
2. Update primary/secondary colors
3. Rebuild Next.js cache

### Add API Endpoint
1. Add method to ApiClient in `src/lib/api.ts`
2. Define types in `src/types/api.ts`
3. Call via `apiClient.methodName()`

### Create Component
1. Create in `src/components/[category]/`
2. Use TypeScript props interface
3. Import and use in pages

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `npm run dev -- -p 3001` |
| TypeScript errors | Update imports with `@/` alias |
| API connection fails | Check `NEXT_PUBLIC_BACKEND_URL` in `.env.local` |
| Styling not applied | Clear `.next` folder and rebuild |
| Authentication fails | Check session cookie and `/api/get-store-session` |

---

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [React 18 Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

Generated: 2026-03-27
