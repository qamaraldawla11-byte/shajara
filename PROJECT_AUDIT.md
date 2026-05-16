# Shajara Full System Audit

Audit date: 2026-05-16

## Overview

Shajara is a premium private family network built with Vite, React, React Router, i18next, React Flow, and Supabase. The product surface covers landing, authentication, dashboard, family workspaces, family tree views, invites, chat, notifications, and member photo storage.

## Critical Findings

- Family and tree pages could show generic failures or redirect too aggressively when a Supabase read failed.
- Optional Supabase reads used `.single()` in several places, which can turn empty results into hard errors.
- Some service calls assumed the Supabase client always existed, producing brittle behavior when env variables were missing.
- Profile creation depended primarily on the `ensure_profile` RPC being deployed; missing RPCs could block family creation.
- Chat realtime cleanup used the channel subscription object directly, which is less reliable than removing the channel from the client.
- Join invite loading used duplicated spinner markup and could feel like an infinite loading screen during auth redirects.

## Frontend Architecture

- Strengths: lazy route loading, protected routes, reusable auth/toast contexts, strong visual identity, route-level tree splitting.
- Weaknesses: large global CSS file, duplicated async UI states, some page components mix data fetching, layout, and product copy.
- Recommendation: continue extracting page shells, async states, cards, forms, and data hooks into reusable modules.

## Backend And Supabase

- Strengths: transactional RPCs for family creation, invites, member deletion, role updates, and chat room creation.
- Strengths: RLS policies exist for core family, member, invite, chat, notification, and activity data.
- Risks: production Supabase must be checked to confirm every migration is applied in order.
- Risks: frontend fallback queries still depend on RLS correctness.
- Recommendation: add CI checks that verify required RPC names exist before deploy.

## Security

- Production npm audit reports zero vulnerabilities.
- Supabase anon key usage is appropriate only with complete RLS coverage.
- Service role keys must never be exposed through Vite.
- Invite codes should remain short-lived, capped by use count, and deactivated when no longer needed.
- RPC functions should always validate `auth.uid()` and role permissions server-side.

## Performance

- Manual chunking isolates React, Supabase, i18n, and tree dependencies.
- Advanced tree rendering remains lazy loaded.
- Main application bundle is now small enough for fast startup.
- Added database indexes for frequent family/member/invite/message/activity/notification reads.

## UX Issues

- First-time dashboard needed stronger guidance.
- Landing page needed more emotional onboarding and trust-building context.
- Error states needed actionable recovery.
- Activity sidebar needed a real loading state.
- Medium-screen landing typography was too large and needed better balance.

## Fixes Applied

- Hardened Supabase client usage and missing-config errors.
- Added profile upsert fallback when `ensure_profile` RPC is unavailable.
- Added family list fallback query when `get_my_families` RPC is unavailable.
- Replaced optional `.single()` reads with `.maybeSingle()`.
- Added actionable family/tree error states.
- Added shared loading/empty/error components.
- Improved landing page onboarding and trust sections.
- Improved dashboard guidance, family cards, activity loading, and privacy trust card.
- Added query performance migration.

## Remaining Non-Critical Work

- Add Playwright or Cypress e2e coverage.
- Split large CSS into route or component scopes.
- Add telemetry around failed Supabase calls.
- Add image transformation pipeline for member photos.
- Resolve remaining lint warnings in older components.
