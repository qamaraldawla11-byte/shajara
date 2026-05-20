# Backend / Frontend Structure Report

Generated: 2026-05-17

## High-Level Architecture

Shajara is currently a Vite React single-page application connected directly to Supabase. There is no separate Express/Node/Rails/Django backend in this repository. The "backend" is Supabase: Postgres tables, RLS policies, storage policies, and SQL RPC functions stored in SQL files and migrations.

## Project Tree

```text
/
  .env
  .gitignore
  eslint.config.js
  index.html
  package.json
  package-lock.json
  vite.config.js
  supabase_schema.sql
  supabase_schema_v2.sql
  PROJECT_AUDIT.md
  PROJECT_AUDIT_FINAL.md
  PERFORMANCE_REPORT.md
  DEPLOYMENT_GUIDE.md
  UI_UX_IMPROVEMENTS.md

public/
  favicon.svg

src/
  main.jsx
  App.jsx
  index.css
  App.css

  components/
    auth/
      ProtectedRoute.jsx
    dashboard/
      ActivityWidget.jsx
    family/
      CreateFamilyModal.jsx
      FamilyCard.jsx
      JoinFamilyModal.jsx
    invite/
      InvitePanel.jsx
    layout/
      AppLayout.jsx
    members/
      AddMemberModal.jsx
      EditMemberModal.jsx
      MemberCard.jsx
    tree/
      AdvancedTree.jsx
      FamilyTree.jsx
      MemberDetailSidebar.jsx
      TreeNode.jsx
      nodes/
        PersonNode.jsx
    ui/
      AsyncState.jsx

  contexts/
    AuthContext.jsx
    ToastContext.jsx

  hooks/
    usePermissions.js

  locales/
    ar.json
    en.json

  pages/
    ChatPage.jsx
    DashboardPage.jsx
    FamilyPage.jsx
    JoinPage.jsx
    LandingPage.jsx
    LoginPage.jsx
    NotificationsPage.jsx
    TreePage.jsx

  services/
    activityService.js
    authService.js
    chatService.js
    errorService.js
    familyService.js
    inviteService.js
    linkService.js
    memberService.js
    storageService.js
    supabaseClient.js

  utils/
    constants.js
    i18n.js
    treeBuilder.js

supabase/
  README.md
  migrations/
    202605070001_production_hardening.sql
    202605100001_member_photo_storage.sql
    202605160001_query_performance_hardening.sql
```

## Important Frontend Files

### `src/main.jsx`

React entrypoint. Mounts the app into `#root`.

### `src/App.jsx`

Main router. Defines public routes and protected routes:

- `/`
- `/login`
- `/join`
- `/dashboard`
- `/family/:familyId`
- `/family/:familyId/tree`
- `/chat`
- `/notifications`

Uses lazy imports for route-level code splitting.

### `src/components/auth/ProtectedRoute.jsx`

Guards private routes based on `AuthContext`. Shows a loading screen while auth initializes. Redirects unauthenticated users to `/login`.

### `src/contexts/AuthContext.jsx`

Global auth state. Responsibilities:

- Load Supabase session.
- Listen for auth state changes.
- Ensure user profile exists.
- Expose login/signup/reset/logout helpers.
- Expose `user`, `userDoc`, `loading`, and `isAuthenticated`.

### `src/contexts/ToastContext.jsx`

Global toast notifications.

### `src/services/supabaseClient.js`

Supabase browser client configuration. Reads:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Also exports `requireSupabase()` for safer service calls.

### `src/services/authService.js`

Supabase Auth integration:

- Google OAuth
- email login
- email signup
- password reset
- logout
- profile creation/read

### `src/services/familyService.js`

Family workspace API:

- create family through RPC
- get family by id
- get current user's families
- get family role
- role updates
- family deletion

### `src/services/memberService.js`

Family member API:

- add member through RPC
- list members
- get member
- update member
- delete member through RPC

### `src/services/inviteService.js`

Invite code API:

- create invite through RPC
- join family through RPC
- list family invites
- deactivate invite

### `src/services/chatService.js`

Chat API:

- list chat rooms
- list messages
- send message
- subscribe to realtime messages
- create chat room through RPC

### `src/services/activityService.js`

Activity and notification API:

- log activity
- get activity logs
- create notifications
- list notifications
- mark notification read

Important note: this file still imports `supabase` directly instead of `requireSupabase()`, unlike most newer services.

### `src/services/linkService.js`

Family-link API:

- link two families
- get links for family
- remove link

Important note: this file also imports `supabase` directly.

### `src/services/storageService.js`

Member photo upload service. Uses the Supabase Storage bucket:

- `member-photos`

### `src/utils/treeBuilder.js`

Builds tree structures and stats from member records. This is frontend-only tree logic; there is no separate database tree model yet.

## Important Backend / Supabase Files

### `supabase_schema.sql`

Older base schema file. Defines:

- `profiles`
- `families`
- `family_roles`
- `members`
- `invites`
- older RLS policies
- basic indexes

This should be treated as a legacy/bootstrap snapshot, not the current source of truth.

### `supabase_schema_v2.sql`

Older extension schema file. Defines:

- `family_links`
- `chat_rooms`
- `room_members`
- `messages`
- `activity_logs`
- `notifications`
- `invite_logs`

This should also be treated as a legacy/supplemental snapshot, not the current source of truth.

### `supabase/migrations/202605070001_production_hardening.sql`

Most important backend file. This appears to be the current intended source of truth for database structure, RLS policies, triggers, and RPC functions.

Defines tables:

- `profiles`
- `families`
- `family_roles`
- `members`
- `invites`
- `family_links`
- `chat_rooms`
- `room_members`
- `messages`
- `activity_logs`
- `notifications`
- `invite_logs`

Defines RPC/helper functions:

- `sync_family_member_count`
- `current_user_role`
- `is_family_member`
- `is_family_editor`
- `is_family_admin`
- `is_room_member`
- `ensure_profile`
- `get_my_families`
- `create_family_transaction`
- `create_invite_transaction`
- `join_family_with_invite`
- `deactivate_invite_transaction`
- `add_member_transaction`
- `delete_member_transaction`
- `remove_user_from_family_transaction`
- `update_user_role_transaction`
- `delete_family_transaction`
- `create_chat_room_transaction`

### `supabase/migrations/202605100001_member_photo_storage.sql`

Creates and secures the `member-photos` storage bucket.

### `supabase/migrations/202605160001_query_performance_hardening.sql`

Adds performance indexes for frequent frontend query patterns.

## Environment And Config Files

### `.env`

Contains Supabase project URL and public anon key:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

This file points to a real Supabase project. The anon key is frontend-safe only if RLS policies are correctly deployed.

### `vite.config.js`

Vite build and dev-server config. Includes manual chunks for React, Supabase, i18n, and tree dependencies.

### `eslint.config.js`

ESLint config for code quality checks.

## State Management

There is no Redux/Zustand/global server cache. State is handled through:

- `AuthContext`
- `ToastContext`
- local `useState` / `useEffect` in pages and components

This is sufficient for the current size, but server-state caching would become useful for dashboard/family/chat data.

## Backend Completeness Summary

The backend is partially complete. Core family/member/invite/auth structures exist in SQL, but there are unresolved questions:

- Whether all migrations have actually been applied to the live Supabase project.
- Whether legacy root schema files conflict with or confuse deployment.
- Whether chat and notifications are seeded/created by real workflows.
- Whether activity logging is integrated into member/family/invite actions.
- Whether tree data should remain embedded in `members` or be normalized into tree/relationship tables.

