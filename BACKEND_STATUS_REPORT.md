# Backend Status Report

Generated: 2026-05-17

## Bottom Line

The backend is incomplete from a production product perspective and possibly incorrectly connected or partially migrated in the live Supabase project.

The repository contains a strong Supabase migration for core tables/RLS/RPCs, but visible runtime issues such as "Failed to load family", zero member counts, empty activity, and incomplete dashboard data usually mean one or more of these is true:

- the live Supabase database does not have the latest migrations applied;
- RLS policies are blocking reads;
- required RPC functions are missing or have mismatched signatures;
- the frontend is reading tables that exist in SQL files but not in the live database;
- records exist in old structures, such as `profiles.families`, but not in `family_roles`;
- member count trigger or backfill has not run;
- activity/chat/notification workflows are not yet fully wired.

## Backend Source Of Truth

### Current intended source of truth

Use migrations in this order:

1. `supabase/migrations/202605070001_production_hardening.sql`
2. `supabase/migrations/202605100001_member_photo_storage.sql`
3. `supabase/migrations/202605160001_query_performance_hardening.sql`

### Duplicate / legacy schema files

These files duplicate parts of the migration history:

- `supabase_schema.sql`
- `supabase_schema_v2.sql`

They are useful as historical schema snapshots, but dangerous as deployment instructions because they do not fully match the current hardened migration model.

## Tables Defined In Current Migration

Implemented in `202605070001_production_hardening.sql`:

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

Storage bucket defined in `202605100001_member_photo_storage.sql`:

- `member-photos`

Indexes added in `202605160001_query_performance_hardening.sql`:

- `idx_family_roles_user_joined`
- `idx_members_family_created`
- `idx_invites_family_created`
- `idx_messages_room_created`
- `idx_activity_logs_family_created`
- `idx_notifications_user_created`

## Completed Backend Features

### Authentication

Files:

- `src/services/authService.js`
- `src/contexts/AuthContext.jsx`
- `supabase/migrations/202605070001_production_hardening.sql`

Status: mostly implemented.

Features:

- Supabase Google OAuth.
- Supabase email/password auth.
- Supabase password reset.
- `profiles` table.
- `ensure_profile` RPC.

Risks:

- If `ensure_profile` is not deployed, user profile creation can fail unless fallback upsert works and RLS allows it.
- Redirect URLs must be configured in Supabase Auth settings.

### Family Creation

Files:

- `src/services/familyService.js`
- `src/components/family/CreateFamilyModal.jsx`
- `supabase/migrations/202605070001_production_hardening.sql`

Status: implemented if migrations are applied.

Flow:

- frontend calls `create_family_transaction`
- RPC inserts into `families`
- RPC inserts admin role into `family_roles`

Risks:

- If user profile does not exist, RPC raises `User profile is missing`.
- If migration is missing, RPC call fails.

### Family Listing

Files:

- `src/services/familyService.js`
- `src/pages/DashboardPage.jsx`
- `src/components/layout/AppLayout.jsx`

Status: implemented, but vulnerable to migration/RLS mismatch.

Flow:

- frontend calls `get_my_families`
- fallback reads `family_roles` joined to `families`

Risks:

- Existing data in legacy `profiles.families` may not be backfilled into `family_roles`.
- RLS policy issues can block fallback query.

### Member CRUD

Files:

- `src/services/memberService.js`
- `src/components/members/AddMemberModal.jsx`
- `src/components/members/EditMemberModal.jsx`
- `src/pages/FamilyPage.jsx`

Status: partially complete.

Implemented:

- add member via RPC
- list members from `members`
- update member directly
- delete member via RPC
- parent/spouse fields embedded in `members`

Missing:

- normalized relationship model
- activity log insert after add/update/delete
- notification generation

### Invite Codes

Files:

- `src/services/inviteService.js`
- `src/components/invite/InvitePanel.jsx`
- `src/components/family/JoinFamilyModal.jsx`

Status: mostly implemented.

Implemented:

- create invite via RPC
- redeem invite via RPC
- deactivate invite
- max use / expiry checks in SQL

Risks:

- `InvitePanel` only allows admins to view invites because RLS policy is admin-only.
- Join page auto-clicks the submit button through `document.getElementById`, which is fragile.

### Member Photo Storage

Files:

- `src/services/storageService.js`
- `supabase/migrations/202605100001_member_photo_storage.sql`

Status: implemented if storage migration is applied.

Risks:

- Bucket is public; this is easy for image display but not ideal for private-family photos.
- Storage policies depend on folder name being a valid family UUID.

## Incomplete Backend Features

### Activity Logs

Files:

- `src/services/activityService.js`
- `src/components/dashboard/ActivityWidget.jsx`
- `activity_logs` table

Status: table exists, UI exists, but workflows are not fully connected.

Problem:

- `logActivity()` exists but core actions do not consistently call it.
- Dashboard activity will remain empty unless actions insert rows.
- `activityService.js` still imports nullable `supabase` directly.

### Notifications

Files:

- `src/services/activityService.js`
- `src/pages/NotificationsPage.jsx`
- `notifications` table

Status: table and UI exist, but generation is incomplete.

Problem:

- `createNotification()` exists but is not integrated into invite/member/family workflows.
- Notifications page can load real rows, but the app rarely creates them.

### Chat

Files:

- `src/services/chatService.js`
- `src/pages/ChatPage.jsx`
- `chat_rooms`
- `room_members`
- `messages`

Status: database and UI exist, but product flow is incomplete.

Problem:

- No visible UI flow creates chat rooms for each family.
- No automatic default family room is created when a family is created.
- Chat page lists only rooms from `room_members`, so it will be empty unless rooms are manually created or seeded.

### Memories / Media

Status: missing.

Missing tables:

- `memories`
- `memory_media`
- `media_assets`
- possibly `memory_tags`

Currently the only media feature is member photo upload.

### Separate Tree / Relationship Model

Status: incomplete by product requirements.

Current implementation:

- family tree is derived from `members.father_id`, `members.mother_id`, and `members.spouse_ids`.

Missing:

- `trees`
- `tree_nodes`
- normalized `relationships`
- relationship confidence/source metadata
- multiple trees per family

This may be acceptable for MVP, but it is not a complete production family-history backend.

## Broken Or Risky Backend Features

### Direct nullable Supabase imports

Files:

- `src/services/activityService.js`
- `src/services/linkService.js`
- `src/services/storageService.js`

Problem:

- These files use `supabase` directly instead of shared `requireSupabase()`.
- If env vars are missing or client is null, calls can fail with unclear errors.

### Family count can be wrong

Files:

- `src/services/familyService.js`
- `src/pages/DashboardPage.jsx`
- SQL trigger `sync_family_member_count`

Problem:

- Dashboard uses `families.member_count`.
- If trigger was added after existing members, old rows may not be backfilled.
- If migration is not applied, member count remains stale or zero.

Recommended fix:

- Add a one-time backfill:
  `UPDATE families SET member_count = (SELECT COUNT(*) FROM members WHERE members.family_id = families.id);`

### Activity can be empty forever

Files:

- `src/components/dashboard/ActivityWidget.jsx`
- `src/services/activityService.js`

Problem:

- Activity reads real data, but writes are not integrated into core flows.

### Chat UI can be empty forever

Files:

- `src/pages/ChatPage.jsx`
- `src/services/chatService.js`

Problem:

- No default room creation on family creation or join.

### Notifications UI can be empty forever

Files:

- `src/pages/NotificationsPage.jsx`
- `src/services/activityService.js`

Problem:

- Notification creation is not wired to events.

## Likely Causes Of Current Errors

### "Failed to load family"

Most likely causes:

- `families` table missing in live Supabase.
- `family_roles` row missing for current user.
- RLS blocks `families.select`.
- `current_user_role` RPC missing or not granted.
- `members` table missing or RLS blocks `members.select`.
- user exists in auth but not in `profiles`.

Responsible files:

- `src/pages/FamilyPage.jsx`
- `src/services/familyService.js`
- `src/services/memberService.js`
- `supabase/migrations/202605070001_production_hardening.sql`

### Infinite loading screen

Most likely causes:

- `AuthContext` never resolves because `ensureUserProfile()` fails and auth recovery is incomplete.
- protected route waits on auth loading.
- Join flow waits on `showJoin`.
- a page data loader catches an error but navigation/loading state does not settle.

Responsible files:

- `src/contexts/AuthContext.jsx`
- `src/components/auth/ProtectedRoute.jsx`
- `src/pages/JoinPage.jsx`
- `src/pages/FamilyPage.jsx`
- `src/pages/TreePage.jsx`

### Dashboard data incomplete

Most likely causes:

- `get_my_families` RPC missing.
- fallback join blocked by RLS.
- family membership rows missing from `family_roles`.
- `member_count` trigger not applied/backfilled.

Responsible files:

- `src/pages/DashboardPage.jsx`
- `src/services/familyService.js`
- `supabase/migrations/202605070001_production_hardening.sql`

### Recent activity empty

Most likely causes:

- `activity_logs` table exists but no writes happen.
- `logActivity()` is not called from create/update/delete flows.
- RLS blocks `activity_logs.select`.

Responsible files:

- `src/components/dashboard/ActivityWidget.jsx`
- `src/services/activityService.js`

## Backend Completion Assessment

Backend is not complete.

Core workspace, members, invites, and auth are partially implemented. Chat, notifications, memories, media beyond profile photos, normalized tree relationships, and activity automation are incomplete.

## Error Investigation Matrix

### Issue: "Failed to load family"

Likely cause:

- latest Supabase migrations not applied;
- current user has no `family_roles` row for the target family;
- RLS blocks `families`, `family_roles`, or `members`;
- `current_user_role` RPC missing/not granted;
- `members` table missing from live database.

Exact file:

- `src/pages/FamilyPage.jsx`
- `src/services/familyService.js`
- `src/services/memberService.js`

Exact function:

- `FamilyPage.loadFamily`
- `getFamilyById`
- `getUserRole`
- `getMembers`

Database table involved:

- `families`
- `family_roles`
- `members`

Recommended fix:

- verify migrations are applied to live Supabase;
- verify user has `family_roles` membership;
- add a migration/backfill to populate `family_roles` from any legacy `profiles.families`;
- verify RLS with a real authenticated user;
- add more specific error messages for missing family vs missing role vs member query failure.

Priority: P0

### Issue: Infinite loading screen

Likely cause:

- auth session/profile sync is failing before `loading` settles;
- protected route waits for auth forever if Supabase call hangs;
- join flow waits on auth and `showJoin`;
- page data loader does not settle after an exception.

Exact file:

- `src/contexts/AuthContext.jsx`
- `src/components/auth/ProtectedRoute.jsx`
- `src/pages/JoinPage.jsx`
- `src/pages/FamilyPage.jsx`
- `src/pages/TreePage.jsx`

Exact function:

- `AuthProvider.initializeAuth`
- `AuthProvider.syncSessionUser`
- `ProtectedRoute`
- `JoinPage.useEffect`
- `FamilyPage.loadFamily`
- `TreePage.loadData`

Database table involved:

- `profiles`

Recommended fix:

- verify `ensure_profile` RPC exists;
- add timeout/error-state handling for profile sync;
- make join flow state deterministic without DOM auto-click;
- make every page loader set `loading=false` in all branches.

Priority: P0

### Issue: Dashboard data not fully loading

Likely cause:

- `get_my_families` RPC missing or failing;
- fallback family role join blocked by RLS;
- no `family_roles` rows exist for current user;
- legacy data still stored only in `profiles.families`.

Exact file:

- `src/pages/DashboardPage.jsx`
- `src/services/familyService.js`
- `src/components/layout/AppLayout.jsx`

Exact function:

- `DashboardPage.loadFamilies`
- `AppLayout.loadFamilies`
- `getUserFamilies`

Database table involved:

- `families`
- `family_roles`
- `profiles`

Recommended fix:

- apply production hardening migration;
- run membership backfill;
- validate `get_my_families()` in Supabase SQL editor as an authenticated user;
- add a backend health check script or admin SQL checklist.

Priority: P0

### Issue: Family card showing wrong or incomplete info

Likely cause:

- `families.member_count` is stale;
- family description is empty;
- `member_count` trigger not installed or not backfilled;
- `get_my_families` returns only `families.*`, not computed stats beyond member count.

Exact file:

- `src/components/family/FamilyCard.jsx`
- `src/services/familyService.js`

Exact function:

- `FamilyCard`
- `mapFamilyFromDb`
- SQL trigger `sync_family_member_count`

Database table involved:

- `families`
- `members`

Recommended fix:

- run member-count backfill;
- verify trigger exists;
- decide whether dashboard cards should use computed RPC stats instead of stored `member_count`.

Priority: P1

### Issue: Members count showing 0

Likely cause:

- `families.member_count` not synced;
- trigger `trg_sync_family_member_count` not applied;
- existing members inserted before trigger;
- members are in a different family id than the family card;
- RLS blocks member read, making the UI think there are no members.

Exact file:

- `src/pages/DashboardPage.jsx`
- `src/services/familyService.js`
- SQL migration `202605070001_production_hardening.sql`

Exact function:

- `DashboardPage.totalMembers`
- `mapFamilyFromDb`
- `sync_family_member_count`

Database table involved:

- `families`
- `members`

Recommended fix:

- run:
  `UPDATE families SET member_count = (SELECT COUNT(*) FROM members WHERE members.family_id = families.id);`
- verify insert/delete trigger exists;
- consider replacing stored count with RPC-computed dashboard stats.

Priority: P1

### Issue: Recent activity empty

Likely cause:

- `activity_logs` table exists but no app flows create rows;
- `logActivity()` is not called from create/update/delete/invite flows;
- SQL RPCs do not insert activity logs;
- RLS blocks activity reads.

Exact file:

- `src/components/dashboard/ActivityWidget.jsx`
- `src/services/activityService.js`
- `src/services/memberService.js`
- `src/services/familyService.js`
- `src/services/inviteService.js`

Exact function:

- `ActivityWidget.loadLogs`
- `getActivityLogs`
- `logActivity`

Database table involved:

- `activity_logs`

Recommended fix:

- move activity logging into SQL RPCs for authoritative writes;
- add activity insert to family/member/invite actions;
- seed sample activity for testing.

Priority: P1

### Issue: Backend requests failing

Likely cause:

- Supabase env points to a project that does not match repository migrations;
- missing RPC functions;
- missing grants;
- RLS policy mismatch;
- direct nullable `supabase` imports in older services;
- storage bucket missing.

Exact file:

- `.env`
- `src/services/supabaseClient.js`
- `src/services/activityService.js`
- `src/services/linkService.js`
- `src/services/storageService.js`

Exact function:

- `requireSupabase`
- `getActivityLogs`
- `linkFamilies`
- `uploadMemberPhoto`

Database table involved:

- varies by request;
- common tables: `profiles`, `families`, `family_roles`, `members`, `activity_logs`, `storage.objects`.

Recommended fix:

- compare live Supabase schema to migrations;
- convert all service files to use `requireSupabase()`;
- verify storage bucket migration;
- add backend health checklist.

Priority: P0/P1 depending on request.

### Issue: Supabase errors

Likely cause:

- unknown without live console/network output, but code points to likely errors:
  - function not found;
  - permission denied for table;
  - row violates RLS;
  - relation does not exist;
  - invalid UUID in storage folder policy;
  - user profile missing.

Exact file:

- `src/services/*.js`
- `supabase/migrations/*.sql`

Exact function:

- any RPC/table service call.

Database table involved:

- depends on Supabase error code.

Recommended fix:

- capture browser console and network response;
- log `error.code`, `error.message`, `error.details`, and `error.hint`;
- validate exact RPC/table in Supabase SQL editor.

Priority: P0 for auth/family/dashboard; P2 for optional chat/notifications.
