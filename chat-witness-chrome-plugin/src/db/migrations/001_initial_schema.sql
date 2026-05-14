
-- ============================================
-- Migration 001: Initial Schema
-- Description: Create core tables for Sui-Seal
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_plan TEXT DEFAULT 'free',
  subscription_start_at TIMESTAMP WITH TIME ZONE,
  subscription_end_at TIMESTAMP WITH TIME ZONE,
  total_witnesses INTEGER DEFAULT 0,
  last_witness_at TIMESTAMP WITH TIME ZONE,
  preferred_platforms TEXT[],
  is_active BOOLEAN DEFAULT true
);

-- 存证摘要表（只存元数据，不存原始对话内容）
CREATE TABLE IF NOT EXISTS witness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  sui_transaction_digest TEXT NOT NULL,
  walrus_blob_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  conversation_title TEXT,
  conversation_url TEXT,
  message_count INTEGER,
  witness_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_version TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户活跃度统计表
CREATE TABLE IF NOT EXISTS user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  platform TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_date, activity_type)
);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- 开启行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE witness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Witness_records table policies
CREATE POLICY IF NOT EXISTS "Users can view their own witness records" ON witness_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own witness records" ON witness_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User_activity table policies
CREATE POLICY IF NOT EXISTS "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Auth Triggers
-- ============================================

-- 创建自动更新用户表的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

