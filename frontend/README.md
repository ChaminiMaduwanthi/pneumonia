# LungVision AI Frontend

Next.js 14 (App Router) frontend for AI-powered lung disease classification with authentication, upload flow, dashboard, history, profile, and admin interface.

## Setup

1. Copy `.env.example` to `.env.local`
2. Update values:
   - `NEXTAUTH_URL=http://localhost:3000`
   - `NEXTAUTH_SECRET=<random-string>`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost/pneumonia/backend/api`

## Run

```bash
npm install
npm run dev
```

## Build Check

```bash
npm run lint
npm run build
```

## Key Routes

- `/` Landing page
- `/register` and `/login`
- `/dashboard`, `/analyse`, `/history`, `/history/[id]`, `/profile`
- `/about`
- `/admin` (admin-only via backend role)
