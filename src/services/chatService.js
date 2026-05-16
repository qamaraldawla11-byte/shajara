import { requireSupabase } from './supabaseClient';

/**
 * Get chat rooms for a user
 */
export async function getChatRooms(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('room_members')
    .select('room_id, chat_rooms(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((d) => d.chat_rooms).filter(Boolean);
}

/**
 * Get messages for a room
 */
export async function getMessages(roomId, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('messages')
    .select('*, sender:sender_id(display_name, photo_url)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Send a message
 */
export async function sendMessage(roomId, senderId, content, type = 'text') {
  const client = requireSupabase();
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Message cannot be empty.');
  }

  const { data, error } = await client
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content: trimmedContent,
      type
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Subscribe to new messages in a room
 */
export function subscribeToMessages(roomId, onMessage) {
  const client = requireSupabase();
  return client
    .channel(`room:${roomId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      onMessage(payload.new);
    })
    .subscribe();
}

/**
 * Create a new chat room
 */
export async function createChatRoom(familyId, name, type, memberIds) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_chat_room_transaction', {
    p_family_id: familyId,
    p_name: name,
    p_type: type,
    p_member_ids: memberIds,
  });

  if (error) throw error;
  return data;
}
