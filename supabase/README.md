# Supabase Migrations

Apply migrations in filename order from `supabase/migrations`.

The current hardening migration:

- keeps `family_roles` as the membership source of truth
- backfills memberships from the legacy `profiles.families` array
- adds transactional RPCs for family, invite, member, role, deletion, and chat-room workflows
- adds a trigger-managed `families.member_count`
- replaces permissive/recursive RLS policies with role-aware policies

After applying the migration, the frontend should not read or write `profiles.families`.
