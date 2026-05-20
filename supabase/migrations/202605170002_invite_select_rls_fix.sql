-- Fix invite listing permissions while preserving RLS as the row-level boundary.

GRANT SELECT ON TABLE public.invites TO authenticated;
GRANT INSERT ON TABLE public.invites TO authenticated;
GRANT UPDATE ON TABLE public.invites TO authenticated;
GRANT DELETE ON TABLE public.invites TO authenticated;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view family invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can create family invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can update family invites" ON public.invites;
DROP POLICY IF EXISTS "Members can view family invites" ON public.invites;
DROP POLICY IF EXISTS "Editors can create family invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can revoke family invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can delete family invites" ON public.invites;

CREATE POLICY "Members can view family invites" ON public.invites
  FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));

CREATE POLICY "Editors can create family invites" ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_editor(family_id));

CREATE POLICY "Admins can revoke family invites" ON public.invites
  FOR UPDATE TO authenticated
  USING (public.is_family_admin(family_id))
  WITH CHECK (public.is_family_admin(family_id));

CREATE POLICY "Admins can delete family invites" ON public.invites
  FOR DELETE TO authenticated
  USING (public.is_family_admin(family_id));

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

  IF NOT public.is_family_editor(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins and editors can create invites';
  END IF;

  IF p_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid invite role';
  END IF;

  IF v_code !~ '^[A-HJ-NP-Z2-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid invite code format';
  END IF;

  SELECT name INTO v_family_name FROM public.families WHERE id = p_family_id;
  IF v_family_name IS NULL THEN
    RAISE EXCEPTION 'Family not found';
  END IF;

  INSERT INTO public.invites (code, family_id, family_name, created_by, role, max_uses, expires_at, is_active)
  VALUES (v_code, p_family_id, v_family_name, v_user_id, p_role, COALESCE(p_max_uses, 10), p_expires_at, TRUE);

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invite_transaction(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;
