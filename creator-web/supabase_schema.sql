-- ========================================================
-- DON-DWAE (돈돼) Supabase Complete Database Schema & RLS Migration
-- Reference: SCHEMA_DESIGN.md
-- ========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Users Table (Profile)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '신규크리에이터',
  bio TEXT DEFAULT '돈돼 신규 멤버입니다.',
  phone TEXT,
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  sns_links JSONB DEFAULT '{}'::jsonb,
  level INT NOT NULL DEFAULT 1,
  rank_badge TEXT NOT NULL DEFAULT '새싹 테스터',
  has_passed_gating BOOLEAN NOT NULL DEFAULT FALSE,
  completed_test_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_desc TEXT NOT NULL,
  test_notice TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'product', -- 'product', 'prototype', 'vote', 'survey'
  platform TEXT NOT NULL DEFAULT 'web', -- 'web', 'app'
  is_ab_test BOOLEAN NOT NULL DEFAULT FALSE,
  service_url TEXT,
  ab_url_a TEXT,
  ab_url_b TEXT,
  app_playstore_url TEXT,
  app_appstore_url TEXT,
  login_required BOOLEAN NOT NULL DEFAULT FALSE,
  test_account_id TEXT,
  test_account_pw TEXT,
  privacy_items TEXT,
  test_guide TEXT NOT NULL DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  quizzes JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration TEXT NOT NULL DEFAULT '3분 내외',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  target_count INT NOT NULL DEFAULT 10,
  current_count INT NOT NULL DEFAULT 0,
  reward_coin INT NOT NULL DEFAULT 500,
  total_funded_cost INT NOT NULL DEFAULT 5000,
  is_reviews_public BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'recruiting', -- 'reviewing', 'recruiting', 'completed', 'paused'
  tech_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Participations Table
CREATE TABLE IF NOT EXISTS public.participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_variant TEXT, -- 'A' or 'B' (for blind randomized assignment)
  status TEXT NOT NULL DEFAULT 'applied', -- 'applied', 'in_progress', 'submitted', 'approved', 'rejected'
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

-- 4. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  participation_id UUID REFERENCES public.participations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
  reuse_intention BOOLEAN NOT NULL DEFAULT TRUE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiz_answers JSONB DEFAULT '{}'::jsonb,
  is_quiz_passed BOOLEAN DEFAULT TRUE,
  screenshot_url TEXT,
  creator_reply TEXT,
  creator_replied_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Coin Wallets Table (이원화 화폐 지갑)
CREATE TABLE IF NOT EXISTS public.coin_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  earned_coins INT NOT NULL DEFAULT 1250, -- 적립 코인
  paid_coins INT NOT NULL DEFAULT 0,    -- 유료 충전 코인
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create Coin Transactions Table
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  coin_type TEXT NOT NULL DEFAULT 'earned', -- 'earned' | 'paid'
  type TEXT NOT NULL, -- 'reward_earned', 'project_funding', 'shop_purchase', 'refund'
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create Marketplace Items Table
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_coins INT NOT NULL,
  stock_count INT NOT NULL DEFAULT 100,
  icon TEXT DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. Create Marketplace Exchanges Table
CREATE TABLE IF NOT EXISTS public.marketplace_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.marketplace_items(id),
  spent_coins INT NOT NULL,
  voucher_code TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Create Scraps Table
CREATE TABLE IF NOT EXISTS public.scraps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- 10. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_review', 'app_update', 'reply', 'approval', 'recommendation', 'shop_new'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- Row Level Security (RLS) Enable & Policies
-- ========================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Projects Policies
DROP POLICY IF EXISTS "Projects viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users with gating pass can create projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can delete own projects" ON public.projects;
CREATE POLICY "Projects viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Authenticated users with gating pass can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = creator_id);

-- Reviews Policies (★ RLS Security: Non-public reviews hidden except creator & author)
DROP POLICY IF EXISTS "Reviews viewable based on public setting or ownership" ON public.reviews;
DROP POLICY IF EXISTS "Testers can insert own review" ON public.reviews;
CREATE POLICY "Reviews viewable based on public setting or ownership" ON public.reviews FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = reviews.project_id 
    AND (p.is_reviews_public = true OR p.creator_id = auth.uid())
  ) OR auth.uid() = user_id
);
CREATE POLICY "Testers can insert own review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Participations Policies
DROP POLICY IF EXISTS "Users view own participations or creators view project participations" ON public.participations;
DROP POLICY IF EXISTS "Users can apply for participation" ON public.participations;
CREATE POLICY "Users view own participations or creators view project participations" ON public.participations FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = participations.project_id AND p.creator_id = auth.uid()
  )
);
CREATE POLICY "Users can apply for participation" ON public.participations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coin Wallets & Transactions Policies
DROP POLICY IF EXISTS "Users view own wallet" ON public.coin_wallets;
DROP POLICY IF EXISTS "Users view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users view own wallet" ON public.coin_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own coin transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

-- Scraps & Notifications Policies
DROP POLICY IF EXISTS "Users view own scraps" ON public.scraps;
DROP POLICY IF EXISTS "Users insert own scraps" ON public.scraps;
DROP POLICY IF EXISTS "Users delete own scraps" ON public.scraps;
CREATE POLICY "Users view own scraps" ON public.scraps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scraps" ON public.scraps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own scraps" ON public.scraps FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Marketplace Items Policy
DROP POLICY IF EXISTS "Market items viewable by everyone" ON public.marketplace_items;
CREATE POLICY "Market items viewable by everyone" ON public.marketplace_items FOR SELECT USING (true);

-- ========================================================
-- Automatic Trigger: Create User Profile & Wallet on Sign Up
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, nickname, bio, has_passed_gating, completed_test_count)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), '신규크리에이터'),
    '돈돼 신규 멤버입니다.',
    FALSE,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default 1:1 wallet
  INSERT INTO public.coin_wallets (user_id, earned_coins, paid_coins)
  VALUES (NEW.id, 1250, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Default Marketplace Items
INSERT INTO public.marketplace_items (id, name, category, price_coins, stock_count, icon)
VALUES 
  ('p1', 'CU 모바일 기프티콘 5,000원권', '기프티콘', 5000, 50, '🏪'),
  ('p2', 'SaaS 랜딩페이지 검증 노션 템플릿', '노션 템플릿', 1200, 100, '📑'),
  ('p3', '스타벅스 아이스 아메리카노 T', '기프티콘', 4500, 30, '☕'),
  ('p4', '피그마 온보딩 UI 키트 프레임', '디자인 자산', 2500, 200, '🎨')
ON CONFLICT (id) DO NOTHING;
