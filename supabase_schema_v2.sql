-- ============================================
-- Shajara — Extended Database Schema (v2)
-- ============================================
-- Features: Chat, Family Links, Activity Feed, Notifications
-- ============================================

-- 1. FAMILY LINKS
-- Connects two families together (e.g. for marriages between clans)
CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id_1 UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  family_id_2 UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'alliance', -- 'marriage', 'blood', 'alliance'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id_1, family_id_2)
);

-- 2. CHAT SYSTEM
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT, -- Optional for direct messages
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

-- 3. ACTIVITY FEED
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'member_added', 'marriage_added', 'family_linked', 'invite_used'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTIFICATIONS
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

-- 5. INVITE LOGS
CREATE TABLE IF NOT EXISTS invite_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code TEXT NOT NULL REFERENCES invites(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES FOR V2 TABLES
-- ============================================

-- Enable RLS
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_logs ENABLE ROW LEVEL SECURITY;

-- CHAT ROOMS: Users can view rooms they are members of
CREATE POLICY "Users can view their rooms" ON chat_rooms
  FOR SELECT USING (
    id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
    OR (family_id IN (SELECT family_id FROM family_roles WHERE user_id = auth.uid()) AND type = 'announcement')
  );

-- MESSAGES: Users can view messages in their rooms
CREATE POLICY "Users can view messages in their rooms" ON messages
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages to their rooms" ON messages
  FOR INSERT WITH CHECK (
    room_id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
  );

-- NOTIFICATIONS: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ACTIVITY LOGS: Users can view logs for their families
CREATE POLICY "Users can view family activity" ON activity_logs
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_roles WHERE user_id = auth.uid())
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_activity_logs_family_id ON activity_logs(family_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id) WHERE is_read = FALSE;
