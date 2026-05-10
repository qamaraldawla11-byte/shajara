-- ============================================
-- Shajara — Supabase Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New Query
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- Stores user profile data (linked to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  families UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. FAMILIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. FAMILY ROLES TABLE
-- Maps users to families with a role
-- ============================================
CREATE TABLE IF NOT EXISTS family_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- ============================================
-- 4. MEMBERS TABLE
-- Family tree members (people in the tree)
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female')),
  birth_date TEXT,
  death_date TEXT,
  is_alive BOOLEAN DEFAULT TRUE,
  photo_url TEXT,
  linked_user_id UUID REFERENCES profiles(id),
  father_id UUID REFERENCES members(id) ON DELETE SET NULL,
  mother_id UUID REFERENCES members(id) ON DELETE SET NULL,
  spouse_ids UUID[] DEFAULT '{}',
  added_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. INVITES TABLE
-- Invite codes for joining families
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  max_uses INTEGER DEFAULT 10,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- FAMILIES: Users can read families they belong to
CREATE POLICY "Users can view their families"
  ON families FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM family_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create families"
  ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Family admins can update families"
  ON families FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Family admins can delete families"
  ON families FOR DELETE
  USING (
    id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- FAMILY ROLES: Users can view roles for their families
CREATE POLICY "Users can view roles in their families"
  ON family_roles FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert roles"
  ON family_roles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Family admins can update roles"
  ON family_roles FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Family admins can delete roles"
  ON family_roles FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- MEMBERS: Users can view members of their families
CREATE POLICY "Users can view members of their families"
  ON members FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors and admins can add members"
  ON members FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Editors and admins can update members"
  ON members FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- INVITES: Anyone authenticated can read invites (to validate codes)
CREATE POLICY "Authenticated users can view invites"
  ON invites FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Family admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Family admins can update invites"
  ON invites FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 7. INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_family_roles_family_id ON family_roles(family_id);
CREATE INDEX IF NOT EXISTS idx_family_roles_user_id ON family_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_members_family_id ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_invites_family_id ON invites(family_id);
