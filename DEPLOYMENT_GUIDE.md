# Shajara Deployment Guide

## Requirements

- Node.js 20 or newer recommended.
- Supabase project with migrations applied.
- Vite-compatible static host such as Vercel, Netlify, Cloudflare Pages, or Supabase Hosting.

## Environment Variables

Set these in local `.env` and in the deployment platform:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not expose Supabase service role keys to the frontend.

## Local Validation

```bash
npm install
npm audit fix
npm run lint
npm run build
npm run audit:prod
```

Or run the combined check:

```bash
npm run validate
```

## Supabase Deployment Checklist

- Apply SQL schema and migrations in order.
- Apply `supabase/migrations/202605160001_query_performance_hardening.sql` after the production hardening migration.
- Confirm Row Level Security is enabled on user-owned family data.
- Confirm RPC functions validate the authenticated user server-side.
- Confirm storage bucket policies allow only authorized member photo access.
- Confirm Google OAuth redirect URLs include production and local callback URLs.
- Confirm email auth settings match the desired launch flow.

## Static Hosting

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

SPA fallback:

Configure all unknown routes to serve `index.html` so protected nested routes such as `/family/:familyId/tree` work on refresh.

## Final Pre-Launch Checks

- Sign up with email.
- Sign in with Google.
- Create a family.
- Add, edit, and delete a member.
- Upload a member photo.
- Generate and redeem an invite.
- Open classic and advanced tree views.
- Send and receive a chat message with two accounts.
- Verify mobile, tablet, and desktop layouts.
- Run `npm run build` immediately before deployment.
