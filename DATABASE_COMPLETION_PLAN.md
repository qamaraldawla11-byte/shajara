# Database Completion Plan

Generated: 2026-05-17

## Goal

Complete Shajara's Supabase backend as a production-grade private family network supporting families, profiles, members, trees, relationships, memories, media, chat, notifications, invites, and activity logs.

## Source Of Truth Plan

Use migrations only. Keep root schema files as archived references or remove/rename them later to avoid confusion.

Current migration order:

1. `202605070001_production_hardening.sql`
2. `202605100001_member_photo_storage.sql`
3. `202605160001_query_performance_hardening.sql`

Future migrations should be added under:

```text
supabase/migrations/
```

## Required Tables

## 1. Users / Profiles

Current table: `profiles`

Required columns:

- `id uuid primary key references auth.users(id)`
- `email text not null`
- `display_name text`
- `photo_url text`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended additions:

- `locale text default 'en'`
- `timezone text`
- `onboarding_completed boolean default false`
- `last_seen_at timestamptz`

RLS:

- users can view own profile
- users can view profiles who share a family
- users can update own profile
- users can insert own profile

## 2. Families

Current table: `families`

Required columns:

- `id uuid primary key`
- `name text not null`
- `description text`
- `created_by uuid references profiles(id)`
- `member_count integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended additions:

- `slug text unique`
- `cover_photo_url text`
- `settings jsonb default '{}'`
- `archived_at timestamptz`

RLS:

- only family members can view
- admins can update/delete
- creation should happen through RPC

## 3. Family Access / Roles

Current table: `family_roles`

Required columns:

- `family_id uuid references families(id)`
- `user_id uuid references profiles(id)`
- `role text check in ('admin','editor','viewer')`
- `joined_at timestamptz`

Recommended additions:

- `invited_by uuid references profiles(id)`
- `status text default 'active'`

Indexes:

- `(user_id, joined_at desc)`
- `(family_id, user_id) unique`

## 4. Members

Current table: `members`

Current columns cover:

- member names
- gender
- birth/death dates
- alive status
- photo URL
- linked auth user
- father/mother/spouse IDs

Recommended additions:

- `middle_name text`
- `nickname text`
- `birth_place text`
- `death_place text`
- `notes text`
- `privacy_level text default 'family'`
- `source_confidence text`

## 5. Trees

Missing table: `trees`

Recommended columns:

- `id uuid primary key`
- `family_id uuid references families(id) on delete cascade`
- `name text not null`
- `description text`
- `root_member_id uuid references members(id)`
- `created_by uuid references profiles(id)`
- `is_default boolean default false`
- `created_at timestamptz`
- `updated_at timestamptz`

Purpose:

- Support multiple tree views per family.
- Avoid forcing all relationships into one global view.

## 6. Tree Nodes

Missing table: `tree_nodes`

Recommended columns:

- `id uuid primary key`
- `tree_id uuid references trees(id) on delete cascade`
- `member_id uuid references members(id) on delete cascade`
- `position jsonb default '{}'`
- `display_settings jsonb default '{}'`
- `created_at timestamptz`

Purpose:

- Store visual/layout metadata separately from genealogical facts.

## 7. Relationships

Current model:

- `members.father_id`
- `members.mother_id`
- `members.spouse_ids uuid[]`

Recommended normalized table: `relationships`

Columns:

- `id uuid primary key`
- `family_id uuid references families(id) on delete cascade`
- `from_member_id uuid references members(id) on delete cascade`
- `to_member_id uuid references members(id) on delete cascade`
- `relationship_type text`
- `start_date text`
- `end_date text`
- `metadata jsonb default '{}'`
- `created_by uuid references profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationship types:

- `parent_child`
- `spouse`
- `sibling`
- `guardian`
- `adoptive_parent`
- `unknown`

Indexes:

- `(family_id)`
- `(from_member_id)`
- `(to_member_id)`
- `(family_id, relationship_type)`

## 8. Memories

Missing table: `memories`

Columns:

- `id uuid primary key`
- `family_id uuid references families(id) on delete cascade`
- `member_id uuid references members(id)`
- `created_by uuid references profiles(id)`
- `title text not null`
- `body text`
- `memory_date text`
- `location text`
- `privacy_level text default 'family'`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- `(family_id, created_at desc)`
- `(member_id, created_at desc)`

## 9. Media / Photos

Current storage bucket:

- `member-photos`

Recommended additional bucket:

- `family-media`

Recommended table: `media_assets`

Columns:

- `id uuid primary key`
- `family_id uuid references families(id) on delete cascade`
- `uploaded_by uuid references profiles(id)`
- `bucket text not null`
- `path text not null`
- `mime_type text`
- `file_size integer`
- `width integer`
- `height integer`
- `alt_text text`
- `created_at timestamptz`

Recommended join table: `memory_media`

- `memory_id uuid references memories(id) on delete cascade`
- `media_id uuid references media_assets(id) on delete cascade`
- primary key `(memory_id, media_id)`

## 10. Chat / Messages

Current tables:

- `chat_rooms`
- `room_members`
- `messages`

Recommended additions:

`chat_rooms`:

- `created_by uuid references profiles(id)`
- `last_message_at timestamptz`

`messages`:

- `edited_at timestamptz`
- `deleted_at timestamptz`
- `reply_to_id uuid references messages(id)`

Required workflow:

- create default family room when family is created
- add joining users to default family room
- optionally create direct/group rooms from UI

## 11. Notifications

Current table: `notifications`

Recommended additions:

- `family_id uuid references families(id)`
- `actor_id uuid references profiles(id)`
- `metadata jsonb default '{}'`
- `read_at timestamptz`

Required workflow:

- member added
- invite accepted
- role changed
- memory added
- chat mention

## 12. Invitations / Join Codes

Current tables:

- `invites`
- `invite_logs`

Recommended additions:

`invites`:

- `label text`
- `revoked_at timestamptz`

`invite_logs`:

- `family_id uuid`
- `role text`

## 13. Activity Logs

Current table: `activity_logs`

Recommended event types:

- `family_created`
- `member_added`
- `member_updated`
- `member_deleted`
- `invite_created`
- `invite_accepted`
- `memory_added`
- `photo_uploaded`
- `chat_room_created`

Required change:

- activity should be written by RPCs or database triggers, not only frontend helper calls.

## Required RPC Functions

Already present or planned:

- `ensure_profile`
- `get_my_families`
- `create_family_transaction`
- `create_invite_transaction`
- `join_family_with_invite`
- `deactivate_invite_transaction`
- `add_member_transaction`
- `delete_member_transaction`
- `create_chat_room_transaction`

Recommended new RPCs:

- `bootstrap_family_workspace`
- `create_member_with_activity`
- `update_member_with_activity`
- `create_memory_transaction`
- `upload_media_record`
- `create_default_family_chat_room`
- `add_user_to_family_default_rooms`
- `mark_all_notifications_read`

## Required Seed / Test Data

Create seed data for local/staging:

- 2 auth users
- 2 profiles
- 1 family
- 2 family roles
- 6 members across 3 generations
- parent/child relationships
- spouse relationships
- 1 invite
- 1 chat room
- 3 messages
- 3 activity logs
- 2 notifications

## RLS Policy Requirements

Every family-scoped table should use one of:

- `is_family_member(family_id)`
- `is_family_editor(family_id)`
- `is_family_admin(family_id)`

Every room-scoped table should use:

- `is_room_member(room_id)`

Every user-scoped table should use:

- `user_id = auth.uid()`

## Storage Policy Requirements

For private production family media, prefer private buckets with signed URLs.

For current MVP member photos:

- public bucket is acceptable only if users understand photos are public by URL.
- stronger plan: make `member-photos` private and serve signed URLs.

