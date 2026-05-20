import { supabase } from './supabaseClient';

const MEMBER_PHOTOS_BUCKET = 'member-photos';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export async function uploadMemberPhoto({ familyId, file }) {
  if (!file) return null;

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 5 MB.');
  }

  const client = requireSupabase();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${familyId}/${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await client.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data } = client.storage.from(MEMBER_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
