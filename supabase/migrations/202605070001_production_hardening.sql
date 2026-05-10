-- Shajara production hardening migration
-- Creates transactional RPCs, hardens RLS, and makes family_roles the
-- membership source of truth. Safe to run after the legacy root SQL files.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Keep existing tables compatible while ensuring all expected columns exist.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  families UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female')),
  birth_date TEXT,
  death_date TEXT,
  is_alive BOOLEAN DEFAULT TRUE,
  photo_url TEXT,
  linked_user_id UUID REFERENCES profiles(id),
  father_id UUID REFERENCES members(id) ON DELETE SET NULL,
  mother_id UUID REFERENCES members(id) ON DELETE SET NULL,
  spouse_ids UUID[] DEFAULT '{}',
  added_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  max_uses INTEGER DEFAULT 10 CHECK (max_uses > 0),
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id_1 UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  family_id_2 UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'alliance',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id_1, family_id_2),
  CHECK (family_id_1 <> family_id_2)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('group', 'direct', 'announcement')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code TEXT NOT NULL REFERENCES invites(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_roles_family_id ON family_roles(family_id);
CREATE INDEX IF NOT EXISTS idx_family_roles_user_id ON family_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_members_family_id ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_members_father_id ON members(father_id);
CREATE INDEX IF NOT EXISTS idx_members_mother_id ON members(mother_id);
CREATE INDEX IF NOT EXISTS idx_invites_family_id ON invites(family_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_family_id ON activity_logs(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Backfill roles from the legacy profiles.families array before the app stops using it.
INSERT INTO family_roles (family_id, user_id, role)
SELECT family_id, p.id, 'viewer'
FROM profiles p
CROSS JOIN LATERAL unnest(COALESCE(p.families, '{}')) AS family_id
WHERE family_id IS NOT NULL
ON CONFLICT (family_id, user_id) DO NOTHING;

-- Keep member_count accurate without browser-side read/modify/write.
CREATE OR REPLACE FUNCTION public.sync_family_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE families
    SET member_count = (SELECT COUNT(*) FROM members WHERE family_id = NEW.family_id),
        updated_at = NOW()
    WHERE id = NEW.family_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE families
    SET member_count = (SELECT COUNT(*) FROM members WHERE family_id = OLD.family_id),
        updated_at = NOW()
    WHERE id = OLD.family_id;
    RETURN OLD;
  END IF;

  IF NEW.family_id IS DISTINCT FROM OLD.family_id THEN
    UPDATE families
    SET member_count = (SELECT COUNT(*) FROM members WHERE family_id = OLD.family_id),
        updated_at = NOW()
    WHERE id = OLD.family_id;

    UPDATE families
    SET member_count = (SELECT COUNT(*) FROM members WHERE family_id = NEW.family_id),
        updated_at = NOW()
    WHERE id = NEW.family_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_family_member_count ON members;
CREATE TRIGGER trg_sync_family_member_count
AFTER INSERT OR UPDATE OF family_id OR DELETE ON members
FOR EACH ROW EXECUTE FUNCTION public.sync_family_member_count();

CREATE OR REPLACE FUNCTION public.current_user_role(p_family_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fr.role
  FROM family_roles fr
  WHERE fr.family_id = p_family_id
    AND fr.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_family_member(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role(p_family_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_family_editor(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role(p_family_id) IN ('admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.is_family_admin(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role(p_family_id) = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_members rm
    WHERE rm.room_id = p_room_id
      AND rm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_profile(
  p_email TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile profiles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO profiles (id, email, display_name, photo_url, updated_at)
  VALUES (
    v_user_id,
    p_email,
    COALESCE(NULLIF(BTRIM(p_display_name), ''), p_email),
    p_photo_url,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      photo_url = EXCLUDED.photo_url,
      updated_at = NOW()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_families()
RETURNS SETOF families
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.*
  FROM families f
  JOIN family_roles fr ON fr.family_id = f.id
  WHERE fr.user_id = auth.uid()
  ORDER BY f.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.create_family_transaction(
  p_name TEXT,
  p_description TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_family_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(BTRIM(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Family name is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User profile is missing';
  END IF;

  INSERT INTO families (name, description, created_by, member_count)
  VALUES (BTRIM(p_name), COALESCE(BTRIM(p_description), ''), v_user_id, 0)
  RETURNING id INTO v_family_id;

  INSERT INTO family_roles (family_id, user_id, role)
  VALUES (v_family_id, v_user_id, 'admin');

  RETURN v_family_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invite_transaction(
  p_family_id UUID,
  p_code TEXT,
  p_role TEXT DEFAULT 'viewer',
  p_max_uses INTEGER DEFAULT 10,
  p_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_family_name TEXT;
  v_code TEXT := UPPER(BTRIM(p_code));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_family_admin(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins can create invites';
  END IF;

  IF p_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid invite role';
  END IF;

  IF v_code !~ '^[A-HJ-NP-Z2-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid invite code format';
  END IF;

  SELECT name INTO v_family_name FROM families WHERE id = p_family_id;
  IF v_family_name IS NULL THEN
    RAISE EXCEPTION 'Family not found';
  END IF;

  INSERT INTO invites (code, family_id, family_name, created_by, role, max_uses, expires_at, is_active)
  VALUES (v_code, p_family_id, v_family_name, v_user_id, p_role, COALESCE(p_max_uses, 10), p_expires_at, TRUE);

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_family_with_invite(p_code TEXT)
RETURNS TABLE(family_id UUID, family_name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite invites;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_invite
  FROM invites
  WHERE code = UPPER(BTRIM(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code.';
  END IF;

  IF NOT v_invite.is_active THEN
    RAISE EXCEPTION 'This invite code has been deactivated.';
  END IF;

  IF v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'This invite code has reached its maximum uses.';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'This invite code has expired.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM family_roles
    WHERE family_roles.family_id = v_invite.family_id
      AND family_roles.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You are already a member of this family.';
  END IF;

  INSERT INTO family_roles (family_id, user_id, role)
  VALUES (v_invite.family_id, v_user_id, v_invite.role);

  UPDATE invites
  SET used_count = used_count + 1
  WHERE code = v_invite.code;

  INSERT INTO invite_logs (invite_code, user_id)
  VALUES (v_invite.code, v_user_id);

  RETURN QUERY SELECT v_invite.family_id, v_invite.family_name, v_invite.role;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_invite_transaction(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM invites
  WHERE code = UPPER(BTRIM(p_code));

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF NOT public.is_family_admin(v_family_id) THEN
    RAISE EXCEPTION 'Only family admins can deactivate invites';
  END IF;

  UPDATE invites
  SET is_active = FALSE
  WHERE code = UPPER(BTRIM(p_code));
END;
$$;

CREATE OR REPLACE FUNCTION public.add_member_transaction(
  p_family_id UUID,
  p_first_name TEXT,
  p_last_name TEXT DEFAULT '',
  p_gender TEXT DEFAULT NULL,
  p_birth_date TEXT DEFAULT NULL,
  p_death_date TEXT DEFAULT NULL,
  p_is_alive BOOLEAN DEFAULT TRUE,
  p_photo_url TEXT DEFAULT NULL,
  p_linked_user_id UUID DEFAULT NULL,
  p_father_id UUID DEFAULT NULL,
  p_mother_id UUID DEFAULT NULL,
  p_spouse_ids UUID[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_member_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_family_editor(p_family_id) THEN
    RAISE EXCEPTION 'You do not have permission to add members';
  END IF;

  IF NULLIF(BTRIM(p_first_name), '') IS NULL THEN
    RAISE EXCEPTION 'First name is required';
  END IF;

  IF p_gender IS NOT NULL AND p_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'Invalid gender';
  END IF;

  IF p_father_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM members WHERE id = p_father_id AND family_id = p_family_id) THEN
    RAISE EXCEPTION 'Father must belong to this family';
  END IF;

  IF p_mother_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM members WHERE id = p_mother_id AND family_id = p_family_id) THEN
    RAISE EXCEPTION 'Mother must belong to this family';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_spouse_ids, '{}')) spouse_id
    WHERE NOT EXISTS (SELECT 1 FROM members WHERE id = spouse_id AND family_id = p_family_id)
  ) THEN
    RAISE EXCEPTION 'Spouses must belong to this family';
  END IF;

  INSERT INTO members (
    family_id, first_name, last_name, gender, birth_date, death_date, is_alive,
    photo_url, linked_user_id, father_id, mother_id, spouse_ids, added_by, created_by
  )
  VALUES (
    p_family_id, BTRIM(p_first_name), COALESCE(BTRIM(p_last_name), ''), p_gender,
    p_birth_date, CASE WHEN p_is_alive THEN NULL ELSE p_death_date END,
    COALESCE(p_is_alive, TRUE), p_photo_url, p_linked_user_id, p_father_id,
    p_mother_id, COALESCE(p_spouse_ids, '{}'), v_user_id, v_user_id
  )
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_member_transaction(p_family_id UUID, p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_family_admin(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins can delete members';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM members WHERE id = p_member_id AND family_id = p_family_id) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  UPDATE members
  SET father_id = CASE WHEN father_id = p_member_id THEN NULL ELSE father_id END,
      mother_id = CASE WHEN mother_id = p_member_id THEN NULL ELSE mother_id END,
      spouse_ids = array_remove(COALESCE(spouse_ids, '{}'), p_member_id),
      updated_at = NOW()
  WHERE family_id = p_family_id
    AND (
      father_id = p_member_id
      OR mother_id = p_member_id
      OR p_member_id = ANY(COALESCE(spouse_ids, '{}'))
    );

  DELETE FROM members
  WHERE id = p_member_id
    AND family_id = p_family_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_from_family_transaction(p_family_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_user_id AND NOT public.is_family_admin(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins can remove other users';
  END IF;

  IF public.current_user_role(p_family_id) = 'admin'
     AND p_user_id = auth.uid()
     AND (SELECT COUNT(*) FROM family_roles WHERE family_id = p_family_id AND role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'A family must have at least one admin';
  END IF;

  DELETE FROM family_roles
  WHERE family_id = p_family_id
    AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_role_transaction(
  p_family_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_family_admin(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins can update roles';
  END IF;

  IF p_new_role NOT IN ('admin', 'editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM family_roles
    WHERE family_id = p_family_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this family';
  END IF;

  IF p_new_role <> 'admin'
     AND (SELECT role FROM family_roles WHERE family_id = p_family_id AND user_id = p_user_id) = 'admin'
     AND (SELECT COUNT(*) FROM family_roles WHERE family_id = p_family_id AND role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'A family must have at least one admin';
  END IF;

  UPDATE family_roles
  SET role = p_new_role
  WHERE family_id = p_family_id
    AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_family_transaction(p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_family_admin(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins can delete families';
  END IF;

  DELETE FROM families WHERE id = p_family_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_chat_room_transaction(
  p_family_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_member_ids UUID[]
)
RETURNS chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room chat_rooms;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_family_admin(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins can create chat rooms';
  END IF;

  IF p_type NOT IN ('group', 'direct', 'announcement') THEN
    RAISE EXCEPTION 'Invalid room type';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_member_ids, '{}')) user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM family_roles
      WHERE family_id = p_family_id
        AND family_roles.user_id = user_id
    )
  ) THEN
    RAISE EXCEPTION 'Room members must belong to the family';
  END IF;

  INSERT INTO chat_rooms (family_id, name, type)
  VALUES (p_family_id, p_name, p_type)
  RETURNING * INTO v_room;

  INSERT INTO room_members (room_id, user_id)
  SELECT v_room.id, distinct_user.user_id
  FROM (
    SELECT DISTINCT user_id
    FROM unnest(COALESCE(p_member_ids, ARRAY[auth.uid()])) AS distinct_user(user_id)
  ) AS distinct_user;

  RETURN v_room;
END;
$$;

-- RLS hardening.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view shared profiles" ON profiles;
CREATE POLICY "Users can view shared profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM family_roles self_role
      JOIN family_roles other_role ON other_role.family_id = self_role.family_id
      WHERE self_role.user_id = auth.uid()
        AND other_role.user_id = profiles.id
    )
  );
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view their families" ON families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
DROP POLICY IF EXISTS "Family admins can update families" ON families;
DROP POLICY IF EXISTS "Family admins can delete families" ON families;
CREATE POLICY "Members can view families" ON families
  FOR SELECT USING (public.is_family_member(id));
CREATE POLICY "Admins can update families" ON families
  FOR UPDATE USING (public.is_family_admin(id)) WITH CHECK (public.is_family_admin(id));
CREATE POLICY "Admins can delete families" ON families
  FOR DELETE USING (public.is_family_admin(id));

DROP POLICY IF EXISTS "Users can view roles in their families" ON family_roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON family_roles;
DROP POLICY IF EXISTS "Family admins can update roles" ON family_roles;
DROP POLICY IF EXISTS "Family admins can delete roles" ON family_roles;
CREATE POLICY "Members can view family roles" ON family_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_family_member(family_id));
CREATE POLICY "Admins can insert family roles" ON family_roles
  FOR INSERT WITH CHECK (public.is_family_admin(family_id));
CREATE POLICY "Admins can update family roles" ON family_roles
  FOR UPDATE USING (public.is_family_admin(family_id)) WITH CHECK (public.is_family_admin(family_id));
CREATE POLICY "Admins can delete family roles" ON family_roles
  FOR DELETE USING (public.is_family_admin(family_id));

DROP POLICY IF EXISTS "Users can view members of their families" ON members;
DROP POLICY IF EXISTS "Editors and admins can add members" ON members;
DROP POLICY IF EXISTS "Editors and admins can update members" ON members;
DROP POLICY IF EXISTS "Admins can delete members" ON members;
CREATE POLICY "Members can view tree members" ON members
  FOR SELECT USING (public.is_family_member(family_id));
CREATE POLICY "Editors can add tree members" ON members
  FOR INSERT WITH CHECK (public.is_family_editor(family_id));
CREATE POLICY "Editors can update tree members" ON members
  FOR UPDATE USING (public.is_family_editor(family_id)) WITH CHECK (public.is_family_editor(family_id));
CREATE POLICY "Admins can delete tree members" ON members
  FOR DELETE USING (public.is_family_admin(family_id));

DROP POLICY IF EXISTS "Authenticated users can view invites" ON invites;
DROP POLICY IF EXISTS "Family admins can create invites" ON invites;
DROP POLICY IF EXISTS "Family admins can update invites" ON invites;
CREATE POLICY "Admins can view family invites" ON invites
  FOR SELECT USING (public.is_family_admin(family_id));
CREATE POLICY "Admins can create family invites" ON invites
  FOR INSERT WITH CHECK (public.is_family_admin(family_id));
CREATE POLICY "Admins can update family invites" ON invites
  FOR UPDATE USING (public.is_family_admin(family_id)) WITH CHECK (public.is_family_admin(family_id));

DROP POLICY IF EXISTS "Users can view their rooms" ON chat_rooms;
CREATE POLICY "Users can view their rooms" ON chat_rooms
  FOR SELECT USING (
    public.is_room_member(id)
    OR (type = 'announcement' AND public.is_family_member(family_id))
  );

DROP POLICY IF EXISTS "Users can view room memberships" ON room_members;
CREATE POLICY "Users can view room memberships" ON room_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_room_member(room_id)
  );

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON messages;
CREATE POLICY "Users can view messages in their rooms" ON messages
  FOR SELECT USING (public.is_room_member(room_id));
CREATE POLICY "Users can send messages to their rooms" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.is_room_member(room_id)
  );

DROP POLICY IF EXISTS "Users can view family links" ON family_links;
CREATE POLICY "Users can view family links" ON family_links
  FOR SELECT USING (public.is_family_member(family_id_1) OR public.is_family_member(family_id_2));
DROP POLICY IF EXISTS "Admins can manage family links" ON family_links;
CREATE POLICY "Admins can manage family links" ON family_links
  FOR ALL USING (public.is_family_admin(family_id_1) OR public.is_family_admin(family_id_2))
  WITH CHECK (public.is_family_admin(family_id_1) OR public.is_family_admin(family_id_2));

DROP POLICY IF EXISTS "Users can view family activity" ON activity_logs;
CREATE POLICY "Users can view family activity" ON activity_logs
  FOR SELECT USING (public.is_family_member(family_id));
DROP POLICY IF EXISTS "Editors can create family activity" ON activity_logs;
CREATE POLICY "Editors can create family activity" ON activity_logs
  FOR INSERT WITH CHECK (public.is_family_editor(family_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own notifications" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own invite logs" ON invite_logs;
CREATE POLICY "Users can view own invite logs" ON invite_logs
  FOR SELECT USING (user_id = auth.uid());

GRANT EXECUTE ON FUNCTION public.ensure_profile(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_families() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_family_transaction(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invite_transaction(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family_with_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_invite_transaction(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_member_transaction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_from_family_transaction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role_transaction(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_family_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chat_room_transaction(UUID, TEXT, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_editor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(UUID) TO authenticated;
