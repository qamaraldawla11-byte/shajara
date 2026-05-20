import { requireSupabase } from './supabaseClient';
import { reportError } from './errorService';

/**
 * Log an activity
 */
export async function logActivity(familyId, userId, type, details = {}) {
  const client = requireSupabase();
  const { error } = await client
    .from('activity_logs')
    .insert({
      family_id: familyId,
      user_id: userId,
      type,
      details
    });

  if (error) {
    reportError(error, 'Log activity');
  }
}

/**
 * Get activity logs for a family
 */
export async function getActivityLogs(familyId, limit = 20) {
  if (!familyId) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('activity_logs')
    .select('*, user:user_id(display_name, photo_url)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Create a notification for a user
 */
export async function createNotification(userId, type, title, content, link = '') {
  const client = requireSupabase();
  const { error } = await client
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      content,
      link
    });

  if (error) {
    reportError(error, 'Create notification');
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(userId) {
  if (!userId) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId) {
  const client = requireSupabase();
  const { error } = await client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}
