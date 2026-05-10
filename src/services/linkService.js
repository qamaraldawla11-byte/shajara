import { supabase } from './supabaseClient';

/**
 * Link two families
 */
export async function linkFamilies(familyId1, familyId2, linkType = 'alliance', description = '') {
  const { data, error } = await supabase
    .from('family_links')
    .insert({
      family_id_1: familyId1,
      family_id_2: familyId2,
      link_type: linkType,
      description
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all links for a family
 */
export async function getFamilyLinks(familyId) {
  const { data, error } = await supabase
    .from('family_links')
    .select('*, family1:family_id_1(name), family2:family_id_2(name)')
    .or(`family_id_1.eq.${familyId},family_id_2.eq.${familyId}`);

  if (error) throw error;
  return data;
}

/**
 * Remove a link
 */
export async function removeFamilyLink(linkId) {
  const { error } = await supabase
    .from('family_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}
