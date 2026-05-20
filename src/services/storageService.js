import { supabase } from './supabaseClient';
import { withTimeout } from '../utils/asyncTimeout';

const MEMBER_PHOTOS_BUCKET = 'member-photos';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PHOTO_UPLOAD_TIMEOUT_MS = 15000;
const PHOTO_SIGNED_URL_TIMEOUT_MS = 8000;
const MEMBER_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export function getMemberPhotoStoragePath(value) {
  if (!value) return null;

  const photoValue = String(value).trim();
  if (!photoValue) return null;

  if (!/^https?:\/\//i.test(photoValue)) {
    return photoValue.replace(new RegExp(`^${MEMBER_PHOTOS_BUCKET}/`), '');
  }

  try {
    const url = new URL(photoValue);
    const marker = `/storage/v1/object/public/${MEMBER_PHOTOS_BUCKET}/`;
    const signedMarker = `/storage/v1/object/sign/${MEMBER_PHOTOS_BUCKET}/`;
    const encodedPath = url.pathname.includes(marker)
      ? url.pathname.split(marker)[1]
      : url.pathname.includes(signedMarker)
        ? url.pathname.split(signedMarker)[1]
        : '';

    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch (error) {
    console.error('[StorageService] Member photo URL could not be parsed', { value }, error);
    return null;
  }
}

export async function getDisplayableMemberPhotoUrl(value) {
  if (!value) return null;

  const path = getMemberPhotoStoragePath(value);
  if (!path) return value;

  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .createSignedUrl(path, MEMBER_PHOTO_SIGNED_URL_TTL_SECONDS),
    PHOTO_SIGNED_URL_TIMEOUT_MS,
    'Loading member photo URL'
  );

  if (error || !data?.signedUrl) {
    console.error('[StorageService] Member photo signed URL failed', {
      bucket: MEMBER_PHOTOS_BUCKET,
      path,
      message: error?.message,
      statusCode: error?.statusCode,
    }, error);
    return null;
  }

  return data.signedUrl;
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

  return path;
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
