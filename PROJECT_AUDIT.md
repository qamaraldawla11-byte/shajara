# Shajara Project Audit

Date: 2026-05-07

## What I Checked

- Repository structure, source files, public assets, SQL schema files, and Git state.
- `package.json`, `package-lock.json`, Vite config, `.env`, `.gitignore`, CSS, routing, context, services, hooks, pages, and components.
- Dependency install, dependency tree, production dependency audit, production build, and local dev server startup.

## Project Summary

Shajara is a client-only React application for creating family trees, inviting relatives, visualizing members, and experimenting with family chat/activity features. It uses Supabase directly from the browser for authentication, database access, row-level security, and realtime chat subscriptions.

The project is best classified as an MVP or advanced prototype. Core family/member flows are present, but production readiness is incomplete because there is no migration runner, test suite, CI, linting, typed contracts, server-side transactional layer, deployment config, or complete route coverage for every UI link.

## Stack And Architecture

- Framework: React 18 with Vite 6.
- Language: JavaScript/JSX, no TypeScript.
- Package manager: npm with `package-lock.json`.
- Routing: `react-router-dom` browser routing in `src/App.jsx`.
- Auth: Supabase Auth with Google OAuth.
- Database/API: Supabase Postgres accessed directly through `@supabase/supabase-js`.
- State management: React local state plus `AuthContext`; no external state library.
- Styling: global CSS in `src/index.css` and `src/App.css`.
- Tree visualization: classic recursive component and advanced `reactflow` graph.
- i18n: `i18next`, `react-i18next`, browser language detector, English and Arabic locale files.
- Deployment: no committed deployment config. Vite build output goes to `dist/`.

## Local Setup

Requirements:

- Node.js compatible with Vite 6.
- npm.
- Supabase project with the SQL schema applied.
- Google OAuth configured in Supabase Auth.

Commands:

```bash
npm install
npm run dev
npm run build
npm run preview
```

Local URL:

```text
http://127.0.0.1:5173
```

Environment variables:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Data Flow

1. `main.jsx` initializes React, i18n, and `App`.
2. `App.jsx` wraps protected routes with `AuthProvider`.
3. `AuthContext` reads the Supabase session, syncs the user's profile, and exposes `user`, `userDoc`, login, logout, and refresh helpers.
4. Pages call service modules directly.
5. Services query Supabase tables and map database snake_case fields to UI camelCase shapes.
6. Components render local state and refresh data after create/update/delete operations.

## Authentication Flow

1. `LoginPage` calls `login()`.
2. `authService.signInWithGoogle()` starts Supabase Google OAuth and redirects to `/dashboard`.
3. On load, `AuthContext` calls `supabase.auth.getSession()`.
4. If a session exists, `ensureUserProfile()` creates or updates the `profiles` row.
5. `ProtectedRoute` blocks protected pages until loading finishes and redirects unauthenticated users to `/login`.

## API And Database Structure

There is no custom backend. The browser calls Supabase directly through:

- `authService`: Google login, logout, profile sync.
- `familyService`: families and family roles.
- `memberService`: family members and relationships.
- `inviteService`: invite generation and redemption.
- `chatService`: rooms, room members, messages, realtime subscription.
- `activityService`: activity logs and notifications.
- `linkService`: family-to-family links.

Main database tables:

- `profiles`: user profile linked to Supabase Auth.
- `families`: family records.
- `family_roles`: user access and role per family.
- `members`: tree people and relationship fields.
- `invites`: invite codes.
- `family_links`: links between families.
- `chat_rooms`, `room_members`, `messages`: chat system.
- `activity_logs`, `notifications`, `invite_logs`: product activity and notifications.

## Component Hierarchy

- `App`
- `AuthProvider`
- `ProtectedRoute`
- `AppLayout`
- Pages:
  - `DashboardPage`
  - `FamilyPage`
  - `TreePage`
  - `ChatPage`
  - `LoginPage`
- Feature components:
  - family cards and modals
  - member cards and modals
  - invite panel
  - activity widget
  - classic and advanced tree views

## What Was Broken

- `ChatPage.jsx` used `MessageSquare` in the empty chat placeholder without importing it. Production build did not catch this because JSX globals are resolved at runtime in this setup, but opening `/chat` with no active room could crash.
- `InvitePanel` generates links to `/join?code=...`, but there is no `/join` route.
- `AppLayout` links to `/notifications`, but there is no notifications route.
- Chat and activity features depend on v2 tables, but the project does not enforce schema versioning or migration order.
- Some features exist as services but are not wired into product flows, such as `createChatRoom`, notifications, `logActivity`, and family links.

## What Was Fixed

- Added the missing `MessageSquare` import in `src/pages/ChatPage.jsx`.
- Installed dependencies safely with `npm install`; dependencies were already up to date.
- Verified `npm audit --omit=dev`; zero production vulnerabilities.
- Verified `npm run build`; build succeeds.
- Started the local dev server; `http://127.0.0.1:5173` responds with HTTP 200.

## Dependency Notes

- No missing installed dependencies were detected by `npm ls --depth=0`.
- No production vulnerabilities were reported by `npm audit --omit=dev`.
- Vite reports a large JS bundle: about 685 kB minified and 205 kB gzip. This is expected because all routes and heavy UI libraries are bundled together.
- Current versions are modern enough for MVP use. Before production, pin and review upgrade cadence for React, Vite, Supabase, React Router, and React Flow.

## Quality Audit

Critical:

- Database writes that should be atomic are split across multiple browser-side calls. Creating families, joining invites, deleting families, and member count updates can leave partial data if one step fails.
- Invite redemption increments `used_count` client-side and is race-prone.
- RLS policies allow broad authenticated invite reads. Invite validation is convenient, but invite exposure should be reconsidered for production.
- There is no test suite for auth, RLS assumptions, data mapping, permissions, or tree relationship logic.

High:

- Missing `/join` and `/notifications` routes break expected navigation.
- No migration tooling; SQL files must be manually applied in the right order.
- Role/profile membership is duplicated between `profiles.families` and `family_roles`, which can drift.
- `member_count` is denormalized and updated by the client, so it can become inaccurate.
- Family deletion runs many client-side deletes and profile updates instead of a single privileged transaction.

Medium:

- Console logging is noisy in auth and page flows.
- UI error handling often logs errors but does not show actionable messages.
- Forms have minimal validation and no relationship cycle checks.
- Advanced tree layout is basic and may overlap or produce confusing generations for complex families.
- Chat has no room creation UI, no empty-state recovery, no unread tracking UI, and no message pagination strategy.
- Large bundle should be split by route, especially chat/tree visualizations.

UX, accessibility, and mobile:

- Mobile CSS exists, but modals/forms and graph/tree surfaces need real-device testing.
- Icon buttons often rely on `title`; accessible labels would be better.
- The login page uses decorative orb elements and marketing copy; the authenticated app itself is more useful, but login could be simplified later.
- There are mixed translated and hard-coded strings, so Arabic localization is incomplete.

## Technical Debt

- No TypeScript or schema-generated types.
- No ESLint/Prettier config.
- No automated tests.
- No CI pipeline.
- No database migration system.
- No environment example file.
- No deployment documentation.
- No centralized error/toast system.
- No backend functions for transactional and privileged workflows.
- No observability or analytics.

## Recommended Roadmap

1. Fix broken navigation: implement `/join` invite landing and `/notifications`, or remove links until ready.
2. Move critical multi-step writes to Supabase RPC functions or Edge Functions.
3. Add migration tooling and split schema into ordered migrations.
4. Add basic tests for services, permissions, tree building, and invite validation.
5. Add ESLint/Prettier and clean noisy console logs.
6. Replace duplicated membership source with `family_roles` as source of truth, or add database triggers to keep `profiles.families` synced.
7. Add route-level code splitting for tree/chat pages.
8. Improve validation for member relationships, invite inputs, and role changes.
9. Complete chat, notification, activity, and family-link product flows.
10. Add deployment documentation and CI build checks.

## Quick Wins

- Add `.env.example`.
- Add `/join` route that reads `?code=...` and opens the join flow after login.
- Add a simple notifications page backed by `activityService`.
- Add `aria-label` to icon-only buttons.
- Lazy-load `TreePage` and `ChatPage`.
- Add a toast/error banner pattern.
- Add a Supabase migration folder and document exact schema apply order.
