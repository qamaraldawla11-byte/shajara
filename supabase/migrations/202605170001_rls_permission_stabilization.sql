-- Phase 1 stabilization: restore authenticated table privileges while keeping
-- RLS policies as the row-level access boundary.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON TABLE
  public.families,
  public.family_roles,
  public.members,
  public.activity_logs,
  public.chat_rooms,
  public.room_members,
  public.messages,
  public.notifications
TO authenticated;

GRANT INSERT ON TABLE
  public.messages,
  public.notifications
TO authenticated;

GRANT UPDATE ON TABLE
  public.notifications
TO authenticated;

-- Keep role-aware RLS policies explicit and idempotent for the affected tables.
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view families" ON public.families;
CREATE POLICY "Members can view families" ON public.families
  FOR SELECT TO authenticated
  USING (public.is_family_member(id));

DROP POLICY IF EXISTS "Members can view family roles" ON public.family_roles;
CREATE POLICY "Members can view family roles" ON public.family_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_family_member(family_id));

DROP POLICY IF EXISTS "Members can view tree members" ON public.members;
CREATE POLICY "Members can view tree members" ON public.members
  FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "Users can view family activity" ON public.activity_logs;
CREATE POLICY "Users can view family activity" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "Users can view their rooms" ON public.chat_rooms;
CREATE POLICY "Users can view their rooms" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (
    public.is_room_member(id)
    OR (type = 'announcement' AND public.is_family_member(family_id))
  );

DROP POLICY IF EXISTS "Users can view room memberships" ON public.room_members;
CREATE POLICY "Users can view room memberships" ON public.room_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_member(room_id));

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.messages;
CREATE POLICY "Users can send messages to their rooms" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_room_member(room_id));

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
