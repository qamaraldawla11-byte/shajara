-- Restore member write privileges while keeping RLS as the access boundary.
-- Viewers can only select. Admins and editors can add, edit, and delete members
-- in families where public.is_family_editor(family_id) is true.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO authenticated;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their families" ON public.members;
DROP POLICY IF EXISTS "Members can view tree members" ON public.members;
DROP POLICY IF EXISTS "Editors and admins can add members" ON public.members;
DROP POLICY IF EXISTS "Editors can add tree members" ON public.members;
DROP POLICY IF EXISTS "Editors and admins can update members" ON public.members;
DROP POLICY IF EXISTS "Editors can update tree members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete tree members" ON public.members;
DROP POLICY IF EXISTS "Editors can delete tree members" ON public.members;

CREATE POLICY "Members can view tree members" ON public.members
  FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));

CREATE POLICY "Editors can add tree members" ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_editor(family_id));

CREATE POLICY "Editors can update tree members" ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_family_editor(family_id))
  WITH CHECK (public.is_family_editor(family_id));

CREATE POLICY "Editors can delete tree members" ON public.members
  FOR DELETE TO authenticated
  USING (public.is_family_editor(family_id));

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

  IF NOT public.is_family_editor(p_family_id) THEN
    RAISE EXCEPTION 'Only family admins and editors can delete members';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id AND family_id = p_family_id) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  UPDATE public.members
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

  DELETE FROM public.members
  WHERE id = p_member_id
    AND family_id = p_family_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_member_transaction(UUID, UUID) TO authenticated;
