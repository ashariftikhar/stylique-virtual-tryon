# Stylique Store Panel - Complete Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Project Structure

```
stylique-phase1/
├── storepanel/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (auth)/login/       # Login page
│   │   │   ├── (dashboard)/        # Dashboard routes
│   │   │   │   ├── page.tsx        # Dashboard home
│   │   │   │   ├── analytics/      # Analytics view
│   │   │   │   ├── upload/         # Product upload
│   │   │   │   ├── manage/         # Inventory management
│   │   │   │   ├── conversions/    # Conversion tracking
│   │   │   │   └── layout.tsx      # Dashboard layout
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── page.tsx            # Home redirect
│   │   │   └── globals.css         # Global styles
│   │   ├── components/             # Reusable components
│   │   │   ├── ui/                 # UI components
│   │   │   │   ├── index.tsx       # Button, Input, Card, Badge
│   │   │   │   └── toast.tsx       # Toast notifications
│   │   │   └── (storepanel)/       # Store panel specific components
│   │   ├── lib/
│   │   │   ├── api.ts              # Backend API client
│   │   │   ├── supabaseClient.ts   # Supabase client
│   │   │   └── utils.ts            # Utility functions
│   │   ├── hooks/
│   │   │   └── useAuth.ts          # Auth hook
│   │   ├── types/
│   │   │   ├── api.ts              # API type definitions
│   │   │   └── store.ts            # Domain types
│   │   ├── contexts/
│   │   │   └── StorePanelContext.tsx
│   │   └── middleware.ts           # Auth middleware
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── .prettierrc.json
│   └── README.md
```

---

## Available Routes

### Authentication
- `GET/POST /auth/login` - Store login

### Dashboard (Protected)
- `GET /dashboard` - Dashboard home
- `GET /dashboard/upload` - Upload products
- `GET /dashboard/manage` - Manage inventory
- `GET /dashboard/analytics` - View analytics
- `GET /dashboard/conversions` - Conversion tracking

---

## Backend API Endpoints

The app expects these backend endpoints at `NEXT_PUBLIC_BACKEND_URL`:

### Store Configuration
```
GET /api/store/:id/config
Response: { config: StoreConfig, subscriptionActive: boolean }
```

### Inventory
```
GET /api/inventory?store_id=<id>&limit=50&offset=0
POST /api/inventory - Create product
PATCH /api/inventory/:id - Update product
DELETE /api/inventory/:id - Delete product
```

### Product Images
```
POST /api/process-images
{
  product_id: string
  images: Array<{ url: string, alt?: string }>
}
Response: { selectedImage, scoredImages }
```

### Size Recommendations
```
POST /api/recommend-size
{
  product_id: string
  measurements: { chest?, waist?, hips?, ... }
}
Response: { recommendation: { recommended, alternatives, confidence } }
```

### Analytics
```
GET /api/analytics?store_id=<id>&limit=100
POST /api/track-tryon
{
  store_id: string
  product_id?: string
  tryon_type: string
  user_id?: string
}
```

### Sync Endpoints
```
POST /api/sync/shopify - Shopify webhook
POST /api/sync/woocommerce - WooCommerce webhook
```

---

## Development Tips

### Hot Reload
The dev server automatically reloads when you change files. Just save and refresh the browser.

### Type Safety
All components and API calls are fully typed with TypeScript. Use `@/types/*` for type imports.

### Components
Simple UI components are in `src/components/ui/`. Create domain-specific components in `src/components/`.

### Styling
- Tailwind CSS for utility styles
- Global styles in `src/app/globals.css`
- Component scoped styles as needed

### API Calls
Use the `apiClient` from `src/lib/api.ts`:
```typescript
import { apiClient } from '@/lib/api';

const config = await apiClient.getStoreConfig(storeId);
const analytics = await apiClient.getAnalytics(storeId);
```

---

## Common Tasks

### Add a New Page
1. Create file in `src/app/(dashboard)/[feature]/page.tsx`
2. Mark as `'use client'` if it needs interactivity
3. Use the layout automatically

### Add a New API Endpoint Call
1. Add method to `ApiClient` in `src/lib/api.ts`
2. Add types to `src/types/api.ts`
3. Call via `apiClient.methodName()`

### Add Styles
- Use Tailwind classes directly in JSX
- Or create CSS modules in `src/app/`

### Handle Authentication
Use the `useAuth()` hook:
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { store, isLoading, isAuthenticated } = useAuth();
  // ...
}
```

---

## Building for Production

### Build
```bash
npm run build
```

### Start Server
```bash
npm start
```

### Environment Variables
Set `NEXT_PUBLIC_BACKEND_URL` in production environment.

---

## Troubleshooting

### Port 3000 Already in Use
```bash
npm run dev -- -p 3001
```

### Clear Cache and Reinstall
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### TypeScript Errors
Ensure all types are properly imported:
```typescript
import type { Store } from '@/types/api';
```

### API Connection Issues
1. Check `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
2. Ensure backend is running at that URL
3. Check browser console for CORS errors

---

## Next Steps

1. **Implement Backend Endpoints**
   - Create `/api/inventory` endpoints
   - Create `/api/analytics` endpoints
   - Add image upload with AWS S3

2. **Add Real Data**
   - Connect to actual Supabase tables
   - Implement proper authentication
   - Add error handling

3. **Enhance UI**
   - Create custom sidebar component
   - Add dashboard charts and graphs
   - Implement real-time updates

4. **Testing**
   - Add unit tests with Jest
   - Add E2E tests with Cypress
   - Test all user flows

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [React Documentation](https://react.dev)

---

## Support

For issues or questions, refer to the backend documentation or check the API response types in `src/types/api.ts`.
