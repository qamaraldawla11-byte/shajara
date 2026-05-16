-- Query performance hardening for Shajara production screens.
-- These indexes match the frontend's most frequent filters and sort orders.

CREATE INDEX IF NOT EXISTS idx_family_roles_user_joined
  ON family_roles(user_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_members_family_created
  ON members(family_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_invites_family_created
  ON invites(family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON messages(room_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_family_created
  ON activity_logs(family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
