-- ========================================================
-- DON-DWAE (돈돼) Supabase Complete Database Schema & RLS Migration
-- Reference: SCHEMA_DESIGN.md
-- ========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- 1. Create Users Table (Profile)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '신규크리에이터',
  bio TEXT DEFAULT '돈돼 신규 멤버입니다.',
  phone TEXT,
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  sns_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  level INT NOT NULL DEFAULT 1,
  rank_badge TEXT NOT NULL DEFAULT '새싹 테스터',
  has_passed_gating BOOLEAN NOT NULL DEFAULT FALSE,
  completed_test_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_sns_links_array
    CHECK (JSONB_TYPEOF(sns_links) = 'array' AND JSONB_ARRAY_LENGTH(sns_links) <= 5),
  CONSTRAINT users_email_valid CHECK (
    BTRIM(email) <> '' AND CHAR_LENGTH(email) <= 320
    AND email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  CONSTRAINT users_profile_values_valid CHECK (
    BTRIM(nickname) <> '' AND CHAR_LENGTH(nickname) <= 50
    AND (bio IS NULL OR CHAR_LENGTH(bio) <= 1000)
    AND level >= 1 AND completed_test_count >= 0
    AND BTRIM(rank_badge) <> '' AND CHAR_LENGTH(rank_badge) <= 50
    AND (interests IS NULL OR CARDINALITY(interests) <= 20)
  ),
  CONSTRAINT users_gating_consistent
    CHECK (has_passed_gating = (completed_test_count >= 3)),
  CONSTRAINT users_avatar_url_http_check CHECK (
    avatar_url IS NULL
    OR (CHAR_LENGTH(avatar_url) <= 2048 AND avatar_url ~* '^https?://[^[:space:]]+$')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized_unique
  ON public.users (LOWER(BTRIM(email)));

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
  external_survey_url TEXT,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_text TEXT GENERATED ALWAYS AS (
    title || ' ' || service_name || ' ' || service_desc
  ) STORED,
  CONSTRAINT projects_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT projects_service_name_not_blank CHECK (btrim(service_name) <> ''),
  CONSTRAINT projects_service_desc_not_blank CHECK (btrim(service_desc) <> ''),
  CONSTRAINT projects_date_range_valid CHECK (start_date <= end_date),
  CONSTRAINT projects_participant_counts_valid CHECK (
    target_count > 0 AND current_count >= 0 AND current_count <= target_count
  ),
  CONSTRAINT projects_reward_values_valid CHECK (
    reward_coin >= 0 AND total_funded_cost >= 0
  ),
  CONSTRAINT projects_service_url_http_check CHECK (
    service_url IS NULL OR (length(service_url) <= 2048 AND service_url ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT projects_ab_url_a_http_check CHECK (
    ab_url_a IS NULL OR (length(ab_url_a) <= 2048 AND ab_url_a ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT projects_ab_url_b_http_check CHECK (
    ab_url_b IS NULL OR (length(ab_url_b) <= 2048 AND ab_url_b ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT projects_playstore_url_http_check CHECK (
    app_playstore_url IS NULL OR (length(app_playstore_url) <= 2048 AND app_playstore_url ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT projects_appstore_url_http_check CHECK (
    app_appstore_url IS NULL OR (length(app_appstore_url) <= 2048 AND app_appstore_url ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT projects_external_survey_url_http_check CHECK (
    external_survey_url IS NULL OR (length(external_survey_url) <= 2048 AND external_survey_url ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT projects_category_valid
    CHECK (category IN ('product', 'prototype', 'vote', 'survey', 'abtest')),
  CONSTRAINT projects_platform_valid CHECK (platform IN ('web', 'app')),
  CONSTRAINT projects_status_valid
    CHECK (status IN ('reviewing', 'recruiting', 'completed', 'paused')),
  CONSTRAINT projects_content_lengths_valid CHECK (
    CHAR_LENGTH(title) <= 120
    AND CHAR_LENGTH(service_name) <= 80
    AND CHAR_LENGTH(service_desc) <= 5000
    AND CHAR_LENGTH(test_notice) <= 5000
    AND CHAR_LENGTH(test_guide) <= 5000
    AND CHAR_LENGTH(duration) BETWEEN 1 AND 50
    AND (tech_tags IS NULL OR CARDINALITY(tech_tags) <= 20)
  ),
  CONSTRAINT projects_json_shapes_valid CHECK (
    JSONB_TYPEOF(questions) = 'array' AND JSONB_ARRAY_LENGTH(questions) <= 50
    AND JSONB_TYPEOF(quizzes) = 'array' AND JSONB_ARRAY_LENGTH(quizzes) <= 50
  ),
  CONSTRAINT projects_destination_valid CHECK (
    category NOT IN ('product', 'prototype')
    OR COALESCE(
      NULLIF(BTRIM(service_url), ''),
      NULLIF(BTRIM(app_playstore_url), ''),
      NULLIF(BTRIM(app_appstore_url), '')
    ) IS NOT NULL
  ),
  CONSTRAINT projects_login_configuration_valid CHECK (
    (
      NOT login_required
      AND test_account_id IS NULL AND test_account_pw IS NULL AND privacy_items IS NULL
    )
    OR (
      login_required
      AND NULLIF(BTRIM(test_account_id), '') IS NOT NULL AND CHAR_LENGTH(test_account_id) <= 200
      AND NULLIF(BTRIM(test_account_pw), '') IS NOT NULL AND CHAR_LENGTH(test_account_pw) <= 200
      AND NULLIF(BTRIM(privacy_items), '') IS NOT NULL AND CHAR_LENGTH(privacy_items) <= 1000
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_projects_creator_id_created_at
  ON public.projects (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_search_text_trgm
  ON public.projects USING GIN (search_text extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_feed_recent
  ON public.projects (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category_recent
  ON public.projects (category, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_projects_platform_recent
  ON public.projects (platform, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION private.keep_project_service_url_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.service_url IS DISTINCT FROM OLD.service_url THEN
    RAISE EXCEPTION 'project service_url cannot be changed after registration'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.keep_project_service_url_immutable() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS keep_project_service_url_immutable ON public.projects;
CREATE TRIGGER keep_project_service_url_immutable
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.keep_project_service_url_immutable();

-- 3. Create Participations Table
CREATE TABLE IF NOT EXISTS public.participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_variant TEXT, -- 'A' or 'B' (for blind randomized assignment)
  status TEXT NOT NULL DEFAULT 'applied', -- 'applied', 'in_progress', 'submitted', 'approved', 'rejected'
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id),
  CONSTRAINT participations_identity_unique UNIQUE (id, project_id, user_id),
  CONSTRAINT participations_variant_valid
    CHECK (assigned_variant IS NULL OR assigned_variant IN ('A', 'B')),
  CONSTRAINT participations_status_valid
    CHECK (status IN ('applied', 'in_progress', 'submitted', 'approved', 'rejected')),
  CONSTRAINT participations_completion_consistent CHECK (
    (status IN ('applied', 'in_progress') AND completed_at IS NULL)
    OR (
      status IN ('submitted', 'approved', 'rejected')
      AND completed_at IS NOT NULL AND completed_at >= applied_at
    )
  )
);

-- 4. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  participation_id UUID NOT NULL REFERENCES public.participations(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_participation_unique UNIQUE (participation_id),
  CONSTRAINT reviews_rating_valid CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reviews_status_valid CHECK (status IN ('submitted', 'approved', 'rejected')),
  CONSTRAINT reviews_participation_identity_fkey
    FOREIGN KEY (participation_id, project_id, user_id)
    REFERENCES public.participations (id, project_id, user_id) ON DELETE CASCADE,
  CONSTRAINT reviews_json_shapes_valid CHECK (
    JSONB_TYPEOF(answers) IN ('object', 'array')
    AND (quiz_answers IS NULL OR JSONB_TYPEOF(quiz_answers) IN ('object', 'array'))
  ),
  CONSTRAINT reviews_screenshot_url_http_check CHECK (
    screenshot_url IS NULL
    OR (CHAR_LENGTH(screenshot_url) <= 2048 AND screenshot_url ~* '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT reviews_reply_consistent CHECK (
    (creator_reply IS NULL AND creator_replied_at IS NULL)
    OR (
      NULLIF(BTRIM(creator_reply), '') IS NOT NULL
      AND CHAR_LENGTH(creator_reply) <= 5000
      AND creator_replied_at IS NOT NULL AND creator_replied_at >= created_at
    )
  )
);

-- 5. Create Coin Wallets Table (이원화 화폐 지갑)
CREATE TABLE IF NOT EXISTS public.coin_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  earned_coins INT NOT NULL DEFAULT 1250, -- 적립 코인
  paid_coins INT NOT NULL DEFAULT 0,    -- 유료 충전 코인
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coin_wallets_nonnegative CHECK (earned_coins >= 0 AND paid_coins >= 0)
);

-- 6. Create Coin Transactions Table
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  coin_type TEXT NOT NULL DEFAULT 'earned', -- 'earned' | 'paid'
  type TEXT NOT NULL, -- 'reward_earned', 'project_funding', 'shop_purchase', 'refund'
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coin_transactions_amount_nonzero CHECK (amount <> 0),
  CONSTRAINT coin_transactions_coin_type_valid CHECK (coin_type IN ('earned', 'paid')),
  CONSTRAINT coin_transactions_type_valid
    CHECK (type IN ('reward_earned', 'project_funding', 'shop_purchase', 'refund')),
  CONSTRAINT coin_transactions_reference_consistent
    CHECK ((reference_type IS NULL) = (reference_id IS NULL)),
  CONSTRAINT coin_transactions_description_valid
    CHECK (BTRIM(description) <> '' AND CHAR_LENGTH(description) <= 500),
  CONSTRAINT coin_transactions_direction_valid CHECK (
    (type IN ('reward_earned', 'refund') AND amount > 0)
    OR (type IN ('project_funding', 'shop_purchase') AND amount < 0)
  )
);

-- 7. Create Marketplace Items Table
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_coins INT NOT NULL,
  stock_count INT NOT NULL DEFAULT 100,
  icon TEXT DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT marketplace_items_price_positive CHECK (price_coins > 0),
  CONSTRAINT marketplace_items_stock_nonnegative CHECK (stock_count >= 0),
  CONSTRAINT marketplace_items_text_valid CHECK (
    BTRIM(id) <> '' AND CHAR_LENGTH(id) <= 100
    AND BTRIM(name) <> '' AND CHAR_LENGTH(name) <= 200
    AND BTRIM(category) <> '' AND CHAR_LENGTH(category) <= 100
  )
);

-- 8. Create Marketplace Exchanges Table
CREATE TABLE IF NOT EXISTS public.marketplace_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.marketplace_items(id),
  spent_coins INT NOT NULL,
  voucher_code TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_exchanges_spent_positive CHECK (spent_coins > 0),
  CONSTRAINT marketplace_exchanges_status_valid
    CHECK (status IN ('completed', 'cancelled', 'refunded')),
  CONSTRAINT marketplace_exchanges_voucher_valid CHECK (
    status <> 'completed'
    OR (NULLIF(BTRIM(voucher_code), '') IS NOT NULL AND CHAR_LENGTH(voucher_code) <= 100)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_transactions_reference_once
  ON public.coin_transactions (user_id, type, reference_id, coin_type)
  WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participations_user_applied_at
  ON public.participations (user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_project_created_at
  ON public.reviews (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created_at
  ON public.reviews (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_exchanges_item_id
  ON public.marketplace_exchanges (item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_exchanges_voucher_unique
  ON public.marketplace_exchanges (voucher_code)
  WHERE voucher_code IS NOT NULL;
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_type_valid CHECK (
    type IN ('new_review', 'app_update', 'reply', 'approval', 'recommendation', 'shop_new')
  ),
  CONSTRAINT notifications_content_valid CHECK (
    BTRIM(title) <> '' AND CHAR_LENGTH(title) <= 120
    AND BTRIM(message) <> '' AND CHAR_LENGTH(message) <= 1000
    AND (target_url IS NULL OR CHAR_LENGTH(target_url) <= 2048)
  )
);

-- 11. Create Customer Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT support_tickets_category_valid
    CHECK (category IN ('account', 'project', 'coin', 'bug', 'other')),
  CONSTRAINT support_tickets_status_valid
    CHECK (status IN ('open', 'in_progress', 'answered', 'closed')),
  CONSTRAINT support_tickets_subject_valid
    CHECK (BTRIM(subject) <> '' AND CHAR_LENGTH(subject) <= 100),
  CONSTRAINT support_tickets_message_valid
    CHECK (BTRIM(message) <> '' AND CHAR_LENGTH(message) <= 2000),
  CONSTRAINT support_tickets_timestamps_valid CHECK (
    updated_at >= created_at AND (resolved_at IS NULL OR resolved_at >= created_at)
  ),
  CONSTRAINT support_tickets_admin_reply_valid CHECK (
    admin_reply IS NULL
    OR (NULLIF(BTRIM(admin_reply), '') IS NOT NULL AND CHAR_LENGTH(admin_reply) <= 5000)
  )
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created_at
  ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_created_at
  ON public.coin_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_exchanges_user_created_at
  ON public.marketplace_exchanges (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraps_user_created_at
  ON public.scraps (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraps_project_id
  ON public.scraps (project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_participation_identity
  ON public.reviews (participation_id, project_id, user_id);

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
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Public profile rows expose only the columns granted below.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Public profile fields are viewable" ON public.users;
DROP POLICY IF EXISTS "Users update own editable profile" ON public.users;
CREATE POLICY "Public profile fields are viewable" ON public.users FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "Users update own editable profile" ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Public project rows exclude drafts. Creators retain access to their own rows.
DROP POLICY IF EXISTS "Projects viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users with gating pass can create projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Published projects are viewable" ON public.projects;
DROP POLICY IF EXISTS "Creators view own projects" ON public.projects;
DROP POLICY IF EXISTS "Visible projects are viewable" ON public.projects;
DROP POLICY IF EXISTS "Qualified users create own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators update own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators delete own projects" ON public.projects;
CREATE POLICY "Visible projects are viewable" ON public.projects FOR SELECT
  TO anon, authenticated USING (
    status IN ('recruiting', 'completed')
    OR creator_id = (SELECT auth.uid())
  );
CREATE POLICY "Qualified users create own projects" ON public.projects FOR INSERT
  TO authenticated WITH CHECK (
    (SELECT auth.uid()) = creator_id
    AND EXISTS (
      SELECT 1 FROM public.users profile
      WHERE profile.id = (SELECT auth.uid()) AND profile.has_passed_gating
    )
  );
CREATE POLICY "Creators update own projects" ON public.projects FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = creator_id)
  WITH CHECK ((SELECT auth.uid()) = creator_id);
CREATE POLICY "Creators delete own projects" ON public.projects FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = creator_id);

-- Participation and reviews.
DROP POLICY IF EXISTS "Users view own participations or creators view project participations" ON public.participations;
DROP POLICY IF EXISTS "Users can apply for participation" ON public.participations;
DROP POLICY IF EXISTS "Participants and creators view participations" ON public.participations;
DROP POLICY IF EXISTS "Users apply as themselves" ON public.participations;
CREATE POLICY "Participants and creators view participations" ON public.participations FOR SELECT
  TO authenticated USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects project
      WHERE project.id = participations.project_id
        AND project.creator_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Reviews viewable based on public setting or ownership" ON public.reviews;
DROP POLICY IF EXISTS "Testers can insert own review" ON public.reviews;
DROP POLICY IF EXISTS "Reviews follow project visibility or ownership" ON public.reviews;
DROP POLICY IF EXISTS "Testers insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Creators update reviews on own projects" ON public.reviews;
CREATE POLICY "Reviews follow project visibility or ownership" ON public.reviews FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects project
      WHERE project.id = reviews.project_id
        AND (project.is_reviews_public OR project.creator_id = (SELECT auth.uid()))
    )
    OR (SELECT auth.uid()) = user_id
  );
CREATE POLICY "Creators update reviews on own projects" ON public.reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects project
    WHERE project.id = reviews.project_id
      AND project.creator_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects project
    WHERE project.id = reviews.project_id
      AND project.creator_id = (SELECT auth.uid())
  ));

-- User-owned financial and activity rows.
DROP POLICY IF EXISTS "Users view own wallet" ON public.coin_wallets;
CREATE POLICY "Users view own wallet" ON public.coin_wallets FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users view own coin transactions" ON public.coin_transactions FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users view own exchanges" ON public.marketplace_exchanges;
CREATE POLICY "Users view own exchanges" ON public.marketplace_exchanges FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users view own scraps" ON public.scraps;
DROP POLICY IF EXISTS "Users insert own scraps" ON public.scraps;
DROP POLICY IF EXISTS "Users delete own scraps" ON public.scraps;
CREATE POLICY "Users view own scraps" ON public.scraps FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own scraps" ON public.scraps FOR INSERT
  TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own scraps" ON public.scraps FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users view own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users create own support tickets" ON public.support_tickets;
CREATE POLICY "Users view own support tickets" ON public.support_tickets FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own support tickets" ON public.support_tickets FOR INSERT
  TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Market items viewable by everyone" ON public.marketplace_items;
DROP POLICY IF EXISTS "Active market items are viewable" ON public.marketplace_items;
CREATE POLICY "Active market items are viewable" ON public.marketplace_items FOR SELECT
  TO anon, authenticated USING (is_active);

-- Explicit browser grants. Contact data and test credentials are intentionally
-- omitted from SELECT grants.
REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.projects FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.participations FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.reviews FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.coin_wallets FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.coin_transactions FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.marketplace_items FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.marketplace_exchanges FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.scraps FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.notifications FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.support_tickets FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, nickname, bio, avatar_url, interests, level, rank_badge,
  has_passed_gating, completed_test_count, created_at, updated_at
) ON TABLE public.users TO anon, authenticated;
GRANT UPDATE (nickname, bio, avatar_url, interests)
  ON TABLE public.users TO authenticated;

GRANT SELECT (
  id, creator_id, title, service_name, service_desc, test_notice,
  thumbnail_url, category, platform, is_ab_test, service_url, ab_url_a,
  ab_url_b, app_playstore_url, app_appstore_url, external_survey_url, login_required,
  privacy_items, test_guide, questions, quizzes, duration, start_date,
  end_date, target_count, current_count, reward_coin, total_funded_cost,
  is_reviews_public, status, tech_tags, created_at, search_text
) ON TABLE public.projects TO anon, authenticated;
GRANT INSERT (
  creator_id, title, service_name, service_desc, test_notice, thumbnail_url,
  category, platform, is_ab_test, service_url, ab_url_a, ab_url_b,
  app_playstore_url, app_appstore_url, external_survey_url, login_required, test_account_id,
  test_account_pw, privacy_items, test_guide, questions, quizzes, duration,
  start_date, end_date, target_count, reward_coin, total_funded_cost,
  is_reviews_public, status, tech_tags
) ON TABLE public.projects TO authenticated;
GRANT UPDATE (
  title, service_name, service_desc, test_notice, thumbnail_url, category,
  platform, is_ab_test, ab_url_a, ab_url_b, app_playstore_url,
  app_appstore_url, external_survey_url, login_required, test_account_id, test_account_pw,
  privacy_items, test_guide, questions, quizzes, duration, start_date,
  end_date, target_count, reward_coin, total_funded_cost, is_reviews_public,
  status, tech_tags
) ON TABLE public.projects TO authenticated;
GRANT DELETE ON TABLE public.projects TO authenticated;

GRANT SELECT ON TABLE public.participations TO authenticated;
GRANT SELECT (
  id, project_id, user_id, rating, reuse_intention, answers,
  creator_reply, creator_replied_at, status, created_at
) ON TABLE public.reviews TO anon, authenticated;
GRANT UPDATE (creator_reply, creator_replied_at, status)
  ON TABLE public.reviews TO authenticated;
GRANT SELECT ON TABLE public.coin_wallets TO authenticated;
GRANT SELECT ON TABLE public.coin_transactions TO authenticated;
GRANT SELECT ON TABLE public.marketplace_items TO anon, authenticated;
GRANT SELECT ON TABLE public.marketplace_exchanges TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.scraps TO authenticated;
GRANT SELECT, DELETE ON TABLE public.notifications TO authenticated;
GRANT INSERT (user_id, type, title, message, target_url, is_read)
  ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.support_tickets TO authenticated;
GRANT INSERT (user_id, category, subject, message)
  ON TABLE public.support_tickets TO authenticated;

-- Private profile fields are available only to the active account through RPC.
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  bio TEXT,
  interests TEXT[],
  sns_links JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    profile.id,
    profile.email,
    profile.phone,
    profile.nickname,
    profile.bio,
    profile.interests,
    profile.sns_links,
    profile.updated_at
  FROM public.users AS profile
  WHERE profile.id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.update_my_private_profile(
  p_nickname TEXT,
  p_bio TEXT DEFAULT '',
  p_interests TEXT[] DEFAULT '{}'::TEXT[],
  p_sns_links JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  bio TEXT,
  interests TEXT[],
  sns_links JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_nickname IS NULL
     OR CHAR_LENGTH(BTRIM(p_nickname)) < 1
     OR CHAR_LENGTH(BTRIM(p_nickname)) > 20 THEN
    RAISE EXCEPTION 'nickname must contain 1 to 20 characters' USING ERRCODE = '22023';
  END IF;

  IF CHAR_LENGTH(COALESCE(p_bio, '')) > 50 THEN
    RAISE EXCEPTION 'bio must contain at most 50 characters' USING ERRCODE = '22023';
  END IF;

  IF CARDINALITY(COALESCE(p_interests, '{}'::TEXT[])) > 10
     OR EXISTS (
       SELECT 1
       FROM UNNEST(COALESCE(p_interests, '{}'::TEXT[])) AS interest(value)
       WHERE BTRIM(interest.value) = '' OR CHAR_LENGTH(interest.value) > 50
     ) THEN
    RAISE EXCEPTION 'interests are invalid' USING ERRCODE = '22023';
  END IF;

  IF p_sns_links IS NULL OR JSONB_TYPEOF(p_sns_links) <> 'array'
     OR JSONB_ARRAY_LENGTH(p_sns_links) > 5
     OR EXISTS (
       SELECT 1
       FROM JSONB_ARRAY_ELEMENTS_TEXT(p_sns_links) AS link(value)
       WHERE link.value !~* '^https?://[^[:space:]]+$'
          OR CHAR_LENGTH(link.value) > 2048
     ) THEN
    RAISE EXCEPTION 'SNS links are invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users AS profile
  SET
    nickname = BTRIM(p_nickname),
    bio = BTRIM(COALESCE(p_bio, '')),
    interests = COALESCE(p_interests, '{}'::TEXT[]),
    sns_links = p_sns_links,
    updated_at = NOW()
  WHERE profile.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.email,
    profile.phone,
    profile.nickname,
    profile.bio,
    profile.interests,
    profile.sns_links,
    profile.updated_at
  FROM public.users AS profile
  WHERE profile.id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_my_private_profile(TEXT, TEXT, TEXT[], JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_private_profile(TEXT, TEXT, TEXT[], JSONB)
  TO authenticated;

-- Transactional participation, review reward, and marketplace operations.
CREATE OR REPLACE FUNCTION public.apply_to_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_project public.projects%ROWTYPE;
  v_participation public.participations%ROWTYPE;
  v_variant TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_project.creator_id = v_user_id THEN
    RAISE EXCEPTION 'creators cannot participate in their own project' USING ERRCODE = '22023';
  END IF;
  IF v_project.status <> 'recruiting' THEN
    RAISE EXCEPTION 'project is not recruiting' USING ERRCODE = '22023';
  END IF;
  IF v_project.start_date IS NOT NULL AND CURRENT_DATE < v_project.start_date THEN
    RAISE EXCEPTION 'project has not started' USING ERRCODE = '22023';
  END IF;
  IF v_project.end_date IS NOT NULL AND CURRENT_DATE > v_project.end_date THEN
    RAISE EXCEPTION 'project recruitment has ended' USING ERRCODE = '22023';
  END IF;
  IF v_project.current_count >= v_project.target_count THEN
    RAISE EXCEPTION 'project capacity reached' USING ERRCODE = '22023';
  END IF;

  v_variant := CASE
    WHEN v_project.is_ab_test THEN
      CASE WHEN SUBSTR(MD5(v_user_id::TEXT || p_project_id::TEXT), 1, 1) < '8' THEN 'A' ELSE 'B' END
    ELSE NULL
  END;

  INSERT INTO public.participations (project_id, user_id, assigned_variant, status)
  VALUES (p_project_id, v_user_id, v_variant, 'applied')
  RETURNING * INTO v_participation;

  UPDATE public.projects
  SET current_count = current_count + 1
  WHERE id = p_project_id;

  RETURN JSONB_BUILD_OBJECT(
    'id', v_participation.id,
    'project_id', v_participation.project_id,
    'user_id', v_participation.user_id,
    'assigned_variant', v_participation.assigned_variant,
    'status', v_participation.status,
    'applied_at', v_participation.applied_at,
    'project_current_count', v_project.current_count + 1
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'already participating in this project' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_project_review(
  p_project_id UUID,
  p_rating NUMERIC,
  p_reuse_intention BOOLEAN DEFAULT TRUE,
  p_answers JSONB DEFAULT '{}'::JSONB,
  p_quiz_answers JSONB DEFAULT '{}'::JSONB,
  p_is_quiz_passed BOOLEAN DEFAULT TRUE,
  p_screenshot_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_participation_id UUID;
  v_participation_status TEXT;
  v_reward INTEGER;
  v_project_title TEXT;
  v_review_id UUID;
  v_completed_count INTEGER;
  v_has_passed_gating BOOLEAN;
  v_earned_coins INTEGER;
  v_paid_coins INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5' USING ERRCODE = '22023';
  END IF;
  IF p_answers IS NULL OR JSONB_TYPEOF(p_answers) NOT IN ('object', 'array') THEN
    RAISE EXCEPTION 'answers must be a JSON object or array' USING ERRCODE = '22023';
  END IF;
  IF p_quiz_answers IS NULL OR JSONB_TYPEOF(p_quiz_answers) NOT IN ('object', 'array') THEN
    RAISE EXCEPTION 'quiz answers must be a JSON object or array' USING ERRCODE = '22023';
  END IF;
  IF p_screenshot_url IS NOT NULL AND (
    CHAR_LENGTH(p_screenshot_url) > 2048
    OR p_screenshot_url !~* '^https?://[^[:space:]]+$'
  ) THEN
    RAISE EXCEPTION 'screenshot URL is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT participation.id, participation.status, project.reward_coin, project.title
  INTO v_participation_id, v_participation_status, v_reward, v_project_title
  FROM public.participations AS participation
  JOIN public.projects AS project ON project.id = participation.project_id
  WHERE participation.project_id = p_project_id
    AND participation.user_id = v_user_id
  FOR UPDATE OF participation;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active participation not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_participation_status NOT IN ('applied', 'in_progress') THEN
    RAISE EXCEPTION 'review was already submitted for this participation' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.reviews (
    project_id, participation_id, user_id, rating, reuse_intention,
    answers, quiz_answers, is_quiz_passed, screenshot_url, status
  ) VALUES (
    p_project_id, v_participation_id, v_user_id, p_rating,
    COALESCE(p_reuse_intention, TRUE), p_answers, p_quiz_answers,
    COALESCE(p_is_quiz_passed, TRUE), p_screenshot_url, 'submitted'
  )
  RETURNING id INTO v_review_id;

  UPDATE public.participations
  SET status = 'submitted', completed_at = NOW()
  WHERE id = v_participation_id;

  INSERT INTO public.coin_wallets (user_id, earned_coins, paid_coins)
  VALUES (v_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT earned_coins, paid_coins
  INTO v_earned_coins, v_paid_coins
  FROM public.coin_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_reward > 0 THEN
    INSERT INTO public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) VALUES (
      v_user_id, v_reward, 'earned', 'reward_earned',
      '[리뷰 리워드] ' || v_project_title, 'review', v_review_id
    );

    UPDATE public.coin_wallets
    SET earned_coins = earned_coins + v_reward, updated_at = NOW()
    WHERE user_id = v_user_id
    RETURNING earned_coins, paid_coins INTO v_earned_coins, v_paid_coins;
  END IF;

  UPDATE public.users
  SET
    completed_test_count = completed_test_count + 1,
    has_passed_gating = has_passed_gating OR (completed_test_count + 1 >= 3),
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING completed_test_count, has_passed_gating
  INTO v_completed_count, v_has_passed_gating;

  RETURN JSONB_BUILD_OBJECT(
    'review_id', v_review_id,
    'participation_id', v_participation_id,
    'project_id', p_project_id,
    'reward_amount', v_reward,
    'wallet_earned_coins', v_earned_coins,
    'wallet_paid_coins', v_paid_coins,
    'wallet_total', v_earned_coins + v_paid_coins,
    'completed_test_count', v_completed_count,
    'has_passed_gating', v_has_passed_gating
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.exchange_marketplace_item(p_item_id TEXT)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item public.marketplace_items%ROWTYPE;
  v_earned_coins INTEGER;
  v_paid_coins INTEGER;
  v_spent_earned INTEGER;
  v_spent_paid INTEGER;
  v_exchange_id UUID;
  v_voucher_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item
  FROM public.marketplace_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_item.is_active THEN
    RAISE EXCEPTION 'marketplace item is unavailable' USING ERRCODE = 'P0002';
  END IF;
  IF v_item.stock_count <= 0 THEN
    RAISE EXCEPTION 'marketplace item is out of stock' USING ERRCODE = '22023';
  END IF;

  SELECT earned_coins, paid_coins
  INTO v_earned_coins, v_paid_coins
  FROM public.coin_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_earned_coins + v_paid_coins < v_item.price_coins THEN
    RAISE EXCEPTION 'insufficient coin balance' USING ERRCODE = '22023';
  END IF;

  v_spent_earned := LEAST(v_earned_coins, v_item.price_coins);
  v_spent_paid := v_item.price_coins - v_spent_earned;
  v_voucher_code := 'DON-' || UPPER(SUBSTR(REPLACE(GEN_RANDOM_UUID()::TEXT, '-', ''), 1, 12));

  INSERT INTO public.marketplace_exchanges (
    user_id, item_id, spent_coins, voucher_code, status
  ) VALUES (
    v_user_id, v_item.id, v_item.price_coins, v_voucher_code, 'completed'
  )
  RETURNING id INTO v_exchange_id;

  UPDATE public.marketplace_items SET stock_count = stock_count - 1 WHERE id = v_item.id;
  UPDATE public.coin_wallets
  SET
    earned_coins = earned_coins - v_spent_earned,
    paid_coins = paid_coins - v_spent_paid,
    updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING earned_coins, paid_coins INTO v_earned_coins, v_paid_coins;

  IF v_spent_earned > 0 THEN
    INSERT INTO public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) VALUES (
      v_user_id, -v_spent_earned, 'earned', 'shop_purchase',
      '[상점 교환] ' || v_item.name, 'marketplace_exchange', v_exchange_id
    );
  END IF;
  IF v_spent_paid > 0 THEN
    INSERT INTO public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) VALUES (
      v_user_id, -v_spent_paid, 'paid', 'shop_purchase',
      '[상점 교환] ' || v_item.name, 'marketplace_exchange', v_exchange_id
    );
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'exchange_id', v_exchange_id,
    'item_id', v_item.id,
    'item_name', v_item.name,
    'spent_coins', v_item.price_coins,
    'voucher_code', v_voucher_code,
    'wallet_earned_coins', v_earned_coins,
    'wallet_paid_coins', v_paid_coins,
    'wallet_total', v_earned_coins + v_paid_coins,
    'remaining_stock', v_item.stock_count - 1,
    'status', 'completed'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_to_project(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_project_review(UUID, NUMERIC, BOOLEAN, JSONB, JSONB, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exchange_marketplace_item(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_to_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_review(UUID, NUMERIC, BOOLEAN, JSONB, JSONB, BOOLEAN, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.exchange_marketplace_item(TEXT) TO authenticated;

-- ========================================================
-- Automatic Trigger: Create User Profile & Wallet on Sign Up
-- ========================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_nickname TEXT;
  profile_avatar_url TEXT;
BEGIN
  profile_nickname := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'nickname'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    '신규크리에이터'
  );

  profile_avatar_url := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'picture'), '')
  );

  INSERT INTO public.users AS existing (
    id, email, nickname, avatar_url, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    profile_nickname,
    profile_avatar_url,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      avatar_url = COALESCE(existing.avatar_url, EXCLUDED.avatar_url),
      updated_at = CASE
        WHEN existing.email IS DISTINCT FROM EXCLUDED.email
          OR (existing.avatar_url IS NULL AND EXCLUDED.avatar_url IS NOT NULL)
        THEN NOW()
        ELSE existing.updated_at
      END;

  INSERT INTO public.coin_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE OR REPLACE FUNCTION private.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET email = COALESCE(NEW.email, ''),
      updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION private.sync_user_email();

DROP FUNCTION IF EXISTS public.handle_new_user();
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_user_email() FROM PUBLIC, anon, authenticated;

-- Backfill accounts that existed before the trigger was installed. Existing
-- user-edited profile fields are preserved.
INSERT INTO public.users AS existing (
  id, email, nickname, avatar_url, created_at, updated_at
)
SELECT
  auth_user.id,
  COALESCE(auth_user.email, ''),
  COALESCE(
    NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'nickname'), ''),
    NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(auth_user.email, ''), '@', 1), ''),
    '신규크리에이터'
  ),
  COALESCE(
    NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'picture'), '')
  ),
  COALESCE(auth_user.created_at, NOW()),
  NOW()
FROM auth.users AS auth_user
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    avatar_url = COALESCE(existing.avatar_url, EXCLUDED.avatar_url),
    updated_at = CASE
      WHEN existing.email IS DISTINCT FROM EXCLUDED.email
        OR (existing.avatar_url IS NULL AND EXCLUDED.avatar_url IS NOT NULL)
      THEN NOW()
      ELSE existing.updated_at
    END;

INSERT INTO public.coin_wallets (user_id)
SELECT auth_user.id
FROM auth.users AS auth_user
ON CONFLICT (user_id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users AS auth_user
    LEFT JOIN public.users AS profile ON profile.id = auth_user.id
    WHERE profile.id IS NULL
  ) THEN
    RAISE EXCEPTION 'profile integrity setup failed: auth user without profile';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users AS profile
    LEFT JOIN public.coin_wallets AS wallet ON wallet.user_id = profile.id
    WHERE wallet.user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'profile integrity setup failed: profile without wallet';
  END IF;
END;
$$;

-- Seed Default Marketplace Items
INSERT INTO public.marketplace_items (id, name, category, price_coins, stock_count, icon)
VALUES 
  ('p1', 'CU 모바일 기프티콘 5,000원권', '기프티콘', 5000, 50, '🏪'),
  ('p2', 'SaaS 랜딩페이지 검증 노션 템플릿', '노션 템플릿', 1200, 100, '📑'),
  ('p3', '스타벅스 아이스 아메리카노 T', '기프티콘', 4500, 30, '☕'),
  ('p4', '피그마 온보딩 UI 키트 프레임', '디자인 자산', 2500, 200, '🎨')
ON CONFLICT (id) DO NOTHING;

-- Ensure sknye1004@gmail.com User Record
INSERT INTO public.users (id, email, nickname, bio, level, rank_badge, has_passed_gating, completed_test_count)
VALUES (
  'a1004100-4100-4100-4100-100410041004',
  'sknye1004@gmail.com',
  'sknye1004 (제작자)',
  '돈돼 대표 크리에이터 sknye1004입니다.',
  5,
  '마스터 크리에이터',
  TRUE,
  12
)
ON CONFLICT (id) DO UPDATE SET nickname = 'sknye1004 (제작자)';

