# Stylique Store Panel

A Next.js dashboard for managing virtual try-on products and analytics.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your backend URL
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Project Structure

```
src/
├── app/
│   ├── (auth)/login          # Login page
│   ├── (dashboard)/          # Dashboard group
│   │   ├── page.tsx          # Home dashboard
│   │   ├── analytics/        # Analytics view
│   │   ├── upload/           # Product upload
│   │   ├── manage/           # Inventory management
│   │   └── conversions/      # Conversion analytics
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home redirect
│   └── globals.css           # Global styles
├── lib/
│   └── api.ts               # Backend API client
├── types/
│   ├── api.ts               # API type definitions
│   └── store.ts             # Domain types
└── components/              # Reusable components
```

## Features

- **Authentication**: Store login with session management
- **Dashboard**: Overview of products and try-ons
- **Inventory Management**: Upload and manage products
- **Analytics**: Track try-on events and conversions
- **Size Recommendations**: AI-powered size suggestions (coming soon)
- **Image Processing**: Automatic best image selection (coming soon)

## Backend Integration

The app connects to the backend API at `http://localhost:5000` (configurable).

### Available Endpoints:

- `POST /api/sync/woocommerce` - WooCommerce product sync
- `POST /api/process-images` - Image filtering and selection
- `POST /api/recommend-size` - Size recommendation
- `GET /api/store/:id/config` - Store configuration
- `POST /api/track-tryon` - Track try-on events

## Development

### Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Format Code
```bash
npm run format
```

## Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (default: http://localhost:5000)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (optional)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (optional)

## Next Steps

1. Implement missing backend endpoints for inventory, analytics, and recommendations
2. Add image upload functionality with AWS S3 integration
3. Implement Rekognition image scoring
4. Add real-time analytics updates
5. Create custom components library for UI consistency
