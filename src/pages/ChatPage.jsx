import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getChatRooms, getMessages, sendMessage, subscribeToMessages } from '../services/chatService';
import { Send, Hash, User, Volume2, Image as ImageIcon, MoreVertical, Search, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { reportError, getErrorMessage } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { withTimeout } from '../utils/asyncTimeout';

export default function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user?.id) loadRooms();
  }, [user?.id]);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      const subscription = subscribeToMessages(activeRoom.id, (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadRooms() {
    try {
      setLoading(true);
      setLoadError('');
      const data = await withTimeout(getChatRooms(user.id), 10000, 'Loading chat rooms');
      setRooms(data);
      if (data.length > 0) setActiveRoom(data[0]);
    } catch (err) {
      reportError(err, 'Load chat rooms');
      setLoadError(getErrorMessage(err, 'Failed to load chat rooms.'));
      toast.error(getErrorMessage(err, 'Failed to load chat rooms.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(roomId) {
    try {
      const data = await withTimeout(getMessages(roomId), 10000, 'Loading messages');
      setMessages(data);
    } catch (err) {
      reportError(err, 'Load messages');
      toast.error('Failed to load messages.');
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    const content = newMessage;
    setNewMessage('');

    try {
      await sendMessage(activeRoom.id, user.id, content);
      // Optimistic update handled by subscription if not careful, 
      // but here we wait for real-time insert event
    } catch (err) {
      reportError(err, 'Send message');
      toast.error(getErrorMessage(err, 'Failed to send message.'));
    }
  }

  if (loading) return <LoadingState label="Loading family chat rooms..." />;

  if (loadError) {
    return (
      <ErrorState
        title="Chat is not available"
        message={`${loadError} Chat uses the existing chat_rooms, room_members, and messages tables; no new database objects were created.`}
        action={<button className="btn btn-primary" onClick={loadRooms}>Try again</button>}
      />
    );
  }

  return (
    <div className="chat-page animate-fade-in">
      <div className="chat-container">
        {/* Sidebar */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>{t('chat.title')}</h3>
          </div>
          <div className="chat-search">
            <Search size={16} />
            <input type="text" placeholder="Search chats..." aria-label="Search chats" />
          </div>
          <div className="chat-rooms-list">
            {rooms.length === 0 ? (
              <div className="chat-room-empty">No family chat rooms yet.</div>
            ) : rooms.map(room => (
              <button 
                key={room.id} 
                className={`chat-room-item ${activeRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => setActiveRoom(room)}
                aria-pressed={activeRoom?.id === room.id}
              >
                <div className="room-icon">
                  {room.type === 'direct' ? <User size={18} /> : <Hash size={18} />}
                </div>
                <div className="room-info">
                  <span className="room-name">{room.name || 'Direct Message'}</span>
                  <span className="room-preview">Last message snippet...</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Chat */}
        <main className="chat-main">
          {activeRoom ? (
            <>
              <header className="chat-header">
                <div className="chat-header-info">
                  <h4>{activeRoom.name || 'Chat'}</h4>
                  <span className="status-online">{t('chat.online')}</span>
                </div>
                <div className="chat-header-actions">
                  <button className="btn btn-ghost btn-icon" aria-label="More chat actions"><MoreVertical size={20} /></button>
                </div>
              </header>

              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-empty">
                    <p>{t('chat.no_messages')}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`message-item ${msg.sender_id === user.id ? 'own' : ''}`}>
                      {msg.sender_id !== user.id && (
                        <div className="message-avatar">
                          {msg.sender?.photo_url ? (
                            <img src={msg.sender.photo_url} alt="" />
                          ) : (
                            <div className="avatar-placeholder">{msg.sender?.display_name?.[0] || '?'}</div>
                          )}
                        </div>
                      )}
                      <div className="message-bubble">
                        {msg.sender_id !== user.id && (
                          <span className="message-sender">{msg.sender?.display_name}</span>
                        )}
                        <p className="message-content">{msg.content}</p>
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <div className="input-actions">
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Attach image"><ImageIcon size={20} /></button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Record voice message"><Volume2 size={20} /></button>
                </div>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('chat.type_message')} 
                  aria-label={t('chat.type_message')}
                />
                <button type="submit" className="btn btn-primary btn-icon" disabled={!newMessage.trim()} aria-label="Send message">
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No chat rooms yet"
              message="Chat is backend-ready when your family has rows in chat_rooms and room_members. No schema changes were made."
            />
          )}
        </main>
      </div>
    </div>
  );
}
