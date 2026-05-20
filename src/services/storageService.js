import { supabase } from './supabaseClient';
import { withTimeout } from '../utils/asyncTimeout';

const MEMBER_PHOTOS_BUCKET = 'member-photos';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PHOTO_UPLOAD_TIMEOUT_MS = 15000;

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

  const { error } = await withTimeout(
    client.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      }),
    PHOTO_UPLOAD_TIMEOUT_MS,
    'Uploading member photo'
  );

  if (error) {
    console.error('[StorageService] Member photo upload failed', {
      bucket: MEMBER_PHOTOS_BUCKET,
      path,
      message: error.message,
      statusCode: error.statusCode,
    }, error);
    throw error;
  }

  const { data } = client.storage.from(MEMBER_PHOTOS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    console.error('[StorageService] Member photo public URL was not returned', {
      bucket: MEMBER_PHOTOS_BUCKET,
      path,
    });
    throw new Error('Member photo uploaded, but its public URL could not be generated.');
  }
  return data.publicUrl;
}

export async function uploadProfilePhoto({ userId, file }) {
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
  const path = `profiles/${userId}/${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await withTimeout(
    client.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      }),
    PHOTO_UPLOAD_TIMEOUT_MS,
    'Uploading profile photo'
  );

  if (error) {
    console.error('[StorageService] Profile photo upload failed', {
      bucket: MEMBER_PHOTOS_BUCKET,
      path,
      message: error.message,
      statusCode: error.statusCode,
    }, error);
    throw error;
  }

  const { data } = client.storage.from(MEMBER_PHOTOS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    console.error('[StorageService] Profile photo public URL was not returned', {
      bucket: MEMBER_PHOTOS_BUCKET,
      path,
    });
    throw new Error('Profile photo uploaded, but its public URL could not be generated.');
  }
  return data.publicUrl;
}
