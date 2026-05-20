# Backend Implementation Roadmap

Generated: 2026-05-17

## Phase 1: Fix Current Errors

Goal: stop "Failed to load family", infinite loading, stale dashboard data, and zero member counts.

Files to inspect/edit:

- `src/contexts/AuthContext.jsx`
- `src/services/authService.js`
- `src/services/familyService.js`
- `src/services/memberService.js`
- `src/services/activityService.js`
- `src/services/linkService.js`
- `src/pages/FamilyPage.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/TreePage.jsx`
- `supabase/migrations/`

Database changes:

- confirm all migrations are applied
- add member count backfill
- verify `family_roles` rows exist for every user's families
- verify `ensure_profile`, `get_my_families`, and `current_user_role` exist

Functions to verify:

- `ensure_profile`
- `get_my_families`
- `create_family_transaction`
- `current_user_role`
- `add_member_transaction`

Tests to run:

- login
- create family
- reload dashboard
- open family page
- add member
- reload family page
- open tree page

Expected result:

- dashboard lists families
- family page loads without error
- member count updates
- no infinite loading screen

## Phase 2: Complete Core Family Backend

Goal: make family workspaces reliable and self-contained.

Files to edit:

- `src/services/familyService.js`
- `src/components/family/CreateFamilyModal.jsx`
- `src/components/layout/AppLayout.jsx`
- SQL migration file

Database changes:

- add `families.settings`
- add `families.cover_photo_url`
- add `families.slug`
- create a default chat room on family creation
- log `family_created`

Functions to create/fix:

- `bootstrap_family_workspace`
- update `create_family_transaction`

Tests:

- create family as new user
- verify profile exists
- verify family role exists
- verify default room exists
- verify activity log exists

Expected result:

- every family has an admin, default room, and first activity record.

## Phase 3: Complete Tree Backend

Goal: move from embedded relationship fields toward a scalable tree model.

Files to edit:

- `src/services/memberService.js`
- `src/utils/treeBuilder.js`
- `src/pages/TreePage.jsx`
- SQL migration file

Database changes:

- add `trees`
- add `tree_nodes`
- add `relationships`
- keep existing member fields during migration

Functions to create/fix:

- `create_default_tree_for_family`
- `upsert_relationship`
- `get_family_tree`

Tests:

- add parent/child
- add spouse
- render classic tree
- render advanced tree
- reload and verify relationships persist

Expected result:

- tree rendering is backed by normalized relationships.

## Phase 4: Complete Members / Invitations

Goal: reliable member and invite lifecycle.

Files to edit:

- `src/services/memberService.js`
- `src/services/inviteService.js`
- `src/components/members/AddMemberModal.jsx`
- `src/components/members/EditMemberModal.jsx`
- `src/components/invite/InvitePanel.jsx`
- SQL migration file

Database changes:

- add member metadata fields
- add invite labels/revocation metadata
- activity rows for add/update/delete/invite events
- notification rows for accepted invites

Functions to create/fix:

- `update_member_transaction`
- `create_invite_transaction`
- `join_family_with_invite`

Tests:

- generate invite
- join from second account
- verify role row
- verify notification/activity rows

Expected result:

- invite lifecycle is auditable and visible in dashboard.

## Phase 5: Complete Memories / Media

Goal: support the product promise of preserving stories and memories.

Files to create/edit:

- `src/services/memoryService.js`
- `src/services/mediaService.js`
- new memory UI pages/components
- SQL migration file

Database changes:

- add `memories`
- add `media_assets`
- add `memory_media`
- add `family-media` storage bucket

Functions to create:

- `create_memory_transaction`
- `update_memory_transaction`
- `delete_memory_transaction`

Tests:

- create memory
- attach image
- link memory to member
- verify RLS blocks outsiders

Expected result:

- families can store stories and media privately.

## Phase 6: Complete Chat / Notifications

Goal: make chat and notifications real product systems, not just UI shells.

Files to edit:

- `src/services/chatService.js`
- `src/services/activityService.js`
- `src/pages/ChatPage.jsx`
- `src/pages/NotificationsPage.jsx`
- SQL migration file

Database changes:

- default room creation
- add joined users to rooms
- add notification metadata
- add `read_at`
- add message soft-delete/edit fields

Functions to create/fix:

- `create_default_family_chat_room`
- `add_user_to_family_default_rooms`
- `create_notification_for_family_admins`
- `mark_all_notifications_read`

Tests:

- create family
- verify chat room
- join family
- verify second user in room
- send message
- receive realtime message
- verify notification read state

Expected result:

- chat and notifications work with real data.

## Phase 7: Security / RLS Hardening

Goal: ensure anon frontend key is safe.

Files to edit:

- SQL migrations
- `DEPLOYMENT_GUIDE.md`

Database changes:

- review every policy
- add missing `WITH CHECK` clauses
- make media private if required
- remove overly permissive legacy policies

Tests:

- user A cannot read user B private family
- viewer cannot edit members
- editor cannot delete family
- admin can manage roles/invites
- non-room member cannot read messages

Expected result:

- all family data access is enforced server-side.

## Phase 8: Testing / Build / Deployment

Goal: prove production readiness.

Files to create/edit:

- e2e test files
- test fixtures
- deployment docs
- Supabase migration verification script

Tests to run:

- `npm install`
- `npm audit fix`
- `npm run lint`
- `npm run build`
- e2e auth/dashboard/family/member/invite/tree/chat tests

Expected result:

- production build succeeds
- Supabase schema is verified
- core flows pass with real test users

## Safest Implementation Prompt

Recommended next prompt:

```text
Implement Phase 1 only. Do not change UI design. Verify live Supabase schema/RPC assumptions, fix current family/dashboard loading errors, normalize service error handling, add required SQL backfill migration, and run npm run build.
```

