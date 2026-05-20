# RLS Audit And Fix Report

Generated: 2026-05-17

## Summary

Observed runtime errors:

- `403 permission denied for table families`
- `403` failures from `activity_logs`
- family page cannot load
- dashboard fallback partially works
- repeated failed requests can make parts of the UI appear stuck in loading

The existing RLS policy logic is mostly correct in intent: authenticated users should only see families, members, activity, rooms, messages, and notifications they are allowed to see. The likely missing layer is table/schema privileges for the Postgres `authenticated` role. In Postgres/Supabase, RLS policies do not grant table privileges by themselves. A user must have both:

1. table privileges such as `SELECT`, `INSERT`, or `UPDATE`;
2. a matching RLS policy that allows the specific row.

The migration added here grants the minimal table privileges needed to the `authenticated` role while preserving RLS as the row-level security boundary.

## Files Changed

- `supabase/migrations/202605170001_rls_permission_stabilization.sql`
- `src/services/activityService.js`

## Tables Audited

### `families`

Expected access:

- authenticated users can `SELECT` families where they have a row in `family_roles`.
- admins can update/delete through existing admin policies/RPCs.

Issue found:

- runtime showed `403 permission denied for table families`, indicating missing table privileges or missing applied grants.

Fix applied:

```sql
GRANT SELECT ON TABLE public.families TO authenticated;

DROP POLICY IF EXISTS "Members can view families" ON public.families;
CREATE POLICY "Members can view families" ON public.families
  FOR SELECT TO authenticated
  USING (public.is_family_member(id));
```

Security implication:

- does not expose all families; RLS still limits rows to family members.

### `family_roles`

Expected access:

- users can see their own role rows.
- family members can see role rows in shared families.

Fix applied:

```sql
GRANT SELECT ON TABLE public.family_roles TO authenticated;

DROP POLICY IF EXISTS "Members can view family roles" ON public.family_roles;
CREATE POLICY "Members can view family roles" ON public.family_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_family_member(family_id));
```

Security implication:

- users cannot see roles for unrelated families.

### `members`

Expected access:

- family members can select members in their family.

Fix applied:

```sql
GRANT SELECT ON TABLE public.members TO authenticated;

DROP POLICY IF EXISTS "Members can view tree members" ON public.members;
CREATE POLICY "Members can view tree members" ON public.members
  FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));
```

Security implication:

- member records remain family-scoped.

### `activity_logs`

Expected access:

- family members can select activity logs for their family.

Issue found:

- activity requests also failed with `403`.

Fix applied:

```sql
GRANT SELECT ON TABLE public.activity_logs TO authenticated;

DROP POLICY IF EXISTS "Users can view family activity" ON public.activity_logs;
CREATE POLICY "Users can view family activity" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));
```

Security implication:

- users cannot see activity for unrelated families.

### `chat_rooms`

Expected access:

- room members can view rooms.
- family members can view announcement rooms for their family.

Fix applied:

```sql
GRANT SELECT ON TABLE public.chat_rooms TO authenticated;

DROP POLICY IF EXISTS "Users can view their rooms" ON public.chat_rooms;
CREATE POLICY "Users can view their rooms" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (
    public.is_room_member(id)
    OR (type = 'announcement' AND public.is_family_member(family_id))
  );
```

Security implication:

- private rooms remain limited to room members.

### `room_members`

Expected access:

- users can see their own room memberships.
- room members can see members of the same room.

Fix applied:

```sql
GRANT SELECT ON TABLE public.room_members TO authenticated;

DROP POLICY IF EXISTS "Users can view room memberships" ON public.room_members;
CREATE POLICY "Users can view room memberships" ON public.room_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_member(room_id));
```

Security implication:

- unrelated room membership is not exposed.

### `messages`

Expected access:

- room members can read room messages.
- room members can insert their own messages.

Fix applied:

```sql
GRANT SELECT ON TABLE public.messages TO authenticated;
GRANT INSERT ON TABLE public.messages TO authenticated;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.messages;
CREATE POLICY "Users can send messages to their rooms" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_room_member(room_id));
```

Security implication:

- messages remain room-scoped.

### `notifications`

Expected access:

- users can view/update their own notifications.
- users can create only notifications addressed to themselves with current policy.

Fix applied:

```sql
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT INSERT ON TABLE public.notifications TO authenticated;
GRANT UPDATE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Security implication:

- notifications remain user-scoped.

## Frontend Stabilization

Changed `src/services/activityService.js` to use `requireSupabase()`.

Why:

- keeps Supabase configuration errors consistent;
- avoids direct nullable `supabase` access;
- allows empty inputs to resolve to empty arrays instead of noisy requests.

No UI design changes were made.

## Exact SQL Fixes Applied

The exact SQL is in:

```text
supabase/migrations/202605170001_rls_permission_stabilization.sql
```

Apply this migration after:

```text
202605160001_query_performance_hardening.sql
```

## Remaining Restricted Tables

These remain restricted by role-aware RLS:

- `families`
- `family_roles`
- `members`
- `activity_logs`
- `chat_rooms`
- `room_members`
- `messages`
- `notifications`

These are still admin/editor controlled via prior migration policies/RPCs:

- family updates/deletes
- member inserts/updates/deletes
- invite creation/deactivation
- family role changes

## Verification Status

Local code build can be verified immediately.

Live data access cannot be fully verified until the new migration is applied to the Supabase project. Before applying the migration, the frontend may continue to receive `403 permission denied for table families`.

After applying the migration, verify:

1. login as an authenticated user;
2. dashboard loads families;
3. click a family card;
4. family page loads;
5. empty members state appears when `members` is intentionally empty;
6. recent activity resolves to empty state instead of loader or 403;
7. browser console no longer shows `permission denied for table families`.

## Security Notes

This fix does not grant public/anonymous table access.

The migration grants table privileges only to `authenticated`, and every audited table remains protected by RLS policies that check:

- `auth.uid()`
- `public.is_family_member(...)`
- `public.is_room_member(...)`

That means authenticated users get the ability to ask for rows, but RLS still decides which rows they are allowed to receive.

