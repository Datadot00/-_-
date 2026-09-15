-- 온보딩 4단계에서 관심분야와 함께 받는 "다뤄본 툴 / 관심 기술" 태그를 저장한다.
-- 제작자 모집글의 projects.tech_tags 와 같은 규칙(최대 10개, 태그당 40자, '#' 제거)을 써야
-- "Cursor 를 써 본 테스터" 같은 조건으로 서로 맞춰 볼 수 있다.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tool_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_tool_tags_valid;

ALTER TABLE public.users
  ADD CONSTRAINT users_tool_tags_valid CHECK (
    CARDINALITY(tool_tags) <= 10
    AND NOT EXISTS (
      SELECT 1
      FROM UNNEST(tool_tags) AS tag(value)
      WHERE BTRIM(tag.value) = ''
        OR CHAR_LENGTH(tag.value) > 40
        OR tag.value LIKE '#%'
    )
  );

CREATE OR REPLACE FUNCTION public.get_my_account_state()
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_email_confirmed BOOLEAN;
  v_nickname TEXT;
  v_bio TEXT;
  v_job_group TEXT;
  v_gender TEXT;
  v_age_range TEXT;
  v_devices TEXT[];
  v_tool_tags TEXT[];
  v_interests TEXT[];
  v_sns_links JSONB;
  v_onboarding_completed_version SMALLINT;
  v_onboarding_completed_at TIMESTAMPTZ;
  v_active_required_terms_count BIGINT := 0;
  v_missing_required_terms_count BIGINT := 0;
  v_next_step TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE(auth_account.email, profile.email),
    auth_account.email_confirmed_at IS NOT NULL,
    profile.nickname,
    profile.bio,
    profile.job_group,
    profile.gender,
    profile.age_range,
    profile.devices,
    profile.tool_tags,
    profile.interests,
    profile.sns_links,
    profile.onboarding_completed_version,
    profile.onboarding_completed_at
  INTO
    v_email,
    v_email_confirmed,
    v_nickname,
    v_bio,
    v_job_group,
    v_gender,
    v_age_range,
    v_devices,
    v_tool_tags,
    v_interests,
    v_sns_links,
    v_onboarding_completed_version,
    v_onboarding_completed_at
  FROM public.users AS profile
  JOIN auth.users AS auth_account ON auth_account.id = profile.id
  WHERE profile.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account profile not found' USING ERRCODE = 'P0002';
  END IF;

  WITH current_required_documents AS (
    SELECT DISTINCT ON (document.document_type)
      document.id,
      document.document_type,
      document.effective_at,
      document.created_at
    FROM public.terms_documents AS document
    WHERE document.is_required
      AND document.published_at IS NOT NULL
      AND document.effective_at IS NOT NULL
      AND document.effective_at <= NOW()
      AND (document.retired_at IS NULL OR document.retired_at > NOW())
    ORDER BY
      document.document_type,
      document.effective_at DESC,
      document.created_at DESC,
      document.id DESC
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE COALESCE(latest.event_type, '') <> 'accepted'
    )
  INTO
    v_active_required_terms_count,
    v_missing_required_terms_count
  FROM current_required_documents AS document
  LEFT JOIN LATERAL (
    SELECT consent.event_type
    FROM public.user_term_consents AS consent
    WHERE consent.user_id = v_user_id
      AND consent.terms_document_id = document.id
    ORDER BY consent.recorded_at DESC, consent.id DESC
    LIMIT 1
  ) AS latest ON TRUE;

  v_next_step := CASE
    WHEN NOT v_email_confirmed THEN 'verify_email'
    WHEN v_missing_required_terms_count > 0 THEN 'terms_review'
    WHEN v_onboarding_completed_version < 1 THEN 'onboarding'
    ELSE 'ready'
  END;

  RETURN JSONB_BUILD_OBJECT(
    'user_id', v_user_id,
    'email', v_email,
    'email_confirmed', v_email_confirmed,
    'next_step', v_next_step,
    'onboarding', JSONB_BUILD_OBJECT(
      'required', v_onboarding_completed_version < 1,
      'completed_version', v_onboarding_completed_version,
      'completed_at', v_onboarding_completed_at
    ),
    'terms', JSONB_BUILD_OBJECT(
      'requires_consent', v_missing_required_terms_count > 0,
      'active_required_count', v_active_required_terms_count,
      'missing_required_count', v_missing_required_terms_count
    ),
    'profile', JSONB_BUILD_OBJECT(
      'nickname', v_nickname,
      'bio', v_bio,
      'job_group', v_job_group,
      'gender', v_gender,
      'age_range', v_age_range,
      'devices', COALESCE(v_devices, '{}'::TEXT[]),
      'tool_tags', COALESCE(v_tool_tags, '{}'::TEXT[]),
      'interests', COALESCE(v_interests, '{}'::TEXT[]),
      'sns_links', COALESCE(v_sns_links, '[]'::JSONB)
    )
  );
END;
$$;

-- 파라미터가 늘어나면 새 오버로드가 생겨 PostgREST 호출이 모호해지므로
-- 이전 시그니처를 먼저 지운다.
DROP FUNCTION IF EXISTS public.complete_my_onboarding(
  TEXT, TEXT[], TEXT, JSONB, UUID[], TEXT, TEXT, TEXT, TEXT[]
);

CREATE OR REPLACE FUNCTION public.complete_my_onboarding(
  p_nickname TEXT,
  p_interests TEXT[],
  p_bio TEXT DEFAULT '',
  p_sns_links JSONB DEFAULT '[]'::JSONB,
  p_accepted_document_ids UUID[] DEFAULT '{}'::UUID[],
  p_job_group TEXT DEFAULT '',
  p_gender TEXT DEFAULT '',
  p_age_range TEXT DEFAULT '',
  p_devices TEXT[] DEFAULT '{}'::TEXT[],
  p_tool_tags TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email_confirmed BOOLEAN;
  v_current_onboarding_version SMALLINT;
  v_nickname TEXT := BTRIM(COALESCE(p_nickname, ''));
  v_bio TEXT := BTRIM(COALESCE(p_bio, ''));
  v_job_group TEXT := NULLIF(BTRIM(COALESCE(p_job_group, '')), '');
  v_gender TEXT := NULLIF(BTRIM(COALESCE(p_gender, '')), '');
  v_age_range TEXT := NULLIF(BTRIM(COALESCE(p_age_range, '')), '');
  v_devices TEXT[];
  v_tool_tags TEXT[];
  v_interests TEXT[];
  v_sns_links JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT auth_account.email_confirmed_at IS NOT NULL
  INTO v_email_confirmed
  FROM auth.users AS auth_account
  WHERE auth_account.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auth account not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT v_email_confirmed THEN
    RAISE EXCEPTION 'email confirmation required' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    WITH current_required_documents AS (
      SELECT DISTINCT ON (document.document_type)
        document.id,
        document.document_type,
        document.effective_at,
        document.created_at
      FROM public.terms_documents AS document
      WHERE document.is_required
        AND document.published_at IS NOT NULL
        AND document.effective_at IS NOT NULL
        AND document.effective_at <= NOW()
        AND (document.retired_at IS NULL OR document.retired_at > NOW())
      ORDER BY
        document.document_type,
        document.effective_at DESC,
        document.created_at DESC,
        document.id DESC
    )
    SELECT 1
    FROM current_required_documents AS document
    LEFT JOIN LATERAL (
      SELECT consent.event_type
      FROM public.user_term_consents AS consent
      WHERE consent.user_id = v_user_id
        AND consent.terms_document_id = document.id
      ORDER BY consent.recorded_at DESC, consent.id DESC
      LIMIT 1
    ) AS latest ON TRUE
    WHERE COALESCE(latest.event_type, '') <> 'accepted'
  ) THEN
    RAISE EXCEPTION 'required terms must be accepted before onboarding'
      USING ERRCODE = '42501';
  END IF;

  SELECT profile.onboarding_completed_version
  INTO v_current_onboarding_version
  FROM public.users AS profile
  WHERE profile.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF CHAR_LENGTH(v_nickname) < 1 OR CHAR_LENGTH(v_nickname) > 20 THEN
    RAISE EXCEPTION 'nickname must contain 1 to 20 characters'
      USING ERRCODE = '22023';
  END IF;

  IF CHAR_LENGTH(v_bio) > 50 THEN
    RAISE EXCEPTION 'bio must contain at most 50 characters'
      USING ERRCODE = '22023';
  END IF;

  IF v_job_group IS NOT NULL AND CHAR_LENGTH(v_job_group) > 50 THEN
    RAISE EXCEPTION 'job group must contain at most 50 characters'
      USING ERRCODE = '22023';
  END IF;

  IF v_gender IS NULL OR v_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'gender must be male or female'
      USING ERRCODE = '22023';
  END IF;

  IF v_age_range IS NULL
     OR v_age_range NOT IN ('10s', '20s', '30s', '40s', '50s', '60s_plus') THEN
    RAISE EXCEPTION 'age range must be one of the supported buckets'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(BTRIM(device.value) ORDER BY device.ordinality),
    '{}'::TEXT[]
  )
  INTO v_devices
  FROM UNNEST(COALESCE(p_devices, '{}'::TEXT[]))
    WITH ORDINALITY AS device(value, ordinality)
  WHERE BTRIM(device.value) <> '';

  -- 주 사용기기는 선택 항목이라 빈 배열을 허용하고, 값이 있으면 목록 안에 있어야 한다.
  IF CARDINALITY(v_devices) > 4 THEN
    RAISE EXCEPTION 'devices must contain at most 4 values'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_devices) AS device(value)
    WHERE device.value NOT IN ('ios', 'android', 'mac', 'windows')
  )
  OR (
    SELECT COUNT(*) FROM UNNEST(v_devices) AS device(value)
  ) <> (
    SELECT COUNT(DISTINCT device.value) FROM UNNEST(v_devices) AS device(value)
  ) THEN
    RAISE EXCEPTION 'devices contain unsupported or duplicate values'
      USING ERRCODE = '22023';
  END IF;

  -- 다뤄본 툴/관심 기술은 선택 항목이며, 제작자 모집글의 tech_tags 와 같은 규칙을 쓴다.
  SELECT COALESCE(
    ARRAY_AGG(BTRIM(tag.value) ORDER BY tag.ordinality),
    '{}'::TEXT[]
  )
  INTO v_tool_tags
  FROM UNNEST(COALESCE(p_tool_tags, '{}'::TEXT[]))
    WITH ORDINALITY AS tag(value, ordinality)
  WHERE BTRIM(tag.value) <> '';

  IF CARDINALITY(v_tool_tags) > 10 THEN
    RAISE EXCEPTION 'tool tags must contain at most 10 values'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_tool_tags) AS tag(value)
    WHERE CHAR_LENGTH(tag.value) > 40 OR tag.value LIKE '#%'
  )
  OR (
    SELECT COUNT(*) FROM UNNEST(v_tool_tags) AS tag(value)
  ) <> (
    SELECT COUNT(DISTINCT LOWER(tag.value)) FROM UNNEST(v_tool_tags) AS tag(value)
  ) THEN
    RAISE EXCEPTION 'tool tags contain oversized, prefixed, or duplicate values'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(BTRIM(interest.value) ORDER BY interest.ordinality),
    '{}'::TEXT[]
  )
  INTO v_interests
  FROM UNNEST(COALESCE(p_interests, '{}'::TEXT[]))
    WITH ORDINALITY AS interest(value, ordinality);

  IF CARDINALITY(v_interests) < 1 OR CARDINALITY(v_interests) > 5 THEN
    RAISE EXCEPTION 'interests must contain 1 to 5 values'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_interests) AS interest(value)
    WHERE interest.value = '' OR CHAR_LENGTH(interest.value) > 50
  )
  OR (
    SELECT COUNT(*) FROM UNNEST(v_interests) AS interest(value)
  ) <> (
    SELECT COUNT(DISTINCT LOWER(interest.value))
    FROM UNNEST(v_interests) AS interest(value)
  ) THEN
    RAISE EXCEPTION 'interests contain blank, duplicate, or oversized values'
      USING ERRCODE = '22023';
  END IF;

  IF p_sns_links IS NULL OR JSONB_TYPEOF(p_sns_links) <> 'array'
     OR JSONB_ARRAY_LENGTH(p_sns_links) > 5 THEN
    RAISE EXCEPTION 'SNS links must be an array with at most 5 values'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    JSONB_AGG(BTRIM(link.value) ORDER BY link.ordinality),
    '[]'::JSONB
  )
  INTO v_sns_links
  FROM JSONB_ARRAY_ELEMENTS_TEXT(p_sns_links)
    WITH ORDINALITY AS link(value, ordinality);

  IF EXISTS (
    SELECT 1
    FROM JSONB_ARRAY_ELEMENTS_TEXT(v_sns_links) AS link(value)
    WHERE link.value !~* '^https?://[^[:space:]]+$'
       OR CHAR_LENGTH(link.value) > 2048
  )
  OR (
    SELECT COUNT(*)
    FROM JSONB_ARRAY_ELEMENTS_TEXT(v_sns_links) AS link(value)
  ) <> (
    SELECT COUNT(DISTINCT LOWER(link.value))
    FROM JSONB_ARRAY_ELEMENTS_TEXT(v_sns_links) AS link(value)
  ) THEN
    RAISE EXCEPTION 'SNS links contain invalid or duplicate URLs'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.users AS profile
  SET
    nickname = v_nickname,
    bio = v_bio,
    job_group = v_job_group,
    gender = v_gender,
    age_range = v_age_range,
    devices = v_devices,
    tool_tags = v_tool_tags,
    interests = v_interests,
    sns_links = v_sns_links,
    onboarding_completed_version =
      GREATEST(v_current_onboarding_version, 1),
    onboarding_completed_at = CASE
      WHEN v_current_onboarding_version < 1 THEN NOW()
      ELSE profile.onboarding_completed_at
    END,
    updated_at = NOW()
  WHERE profile.id = v_user_id;

  RETURN public.get_my_account_state();
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_account_state()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_my_onboarding(
  TEXT, TEXT[], TEXT, JSONB, UUID[], TEXT, TEXT, TEXT, TEXT[], TEXT[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_account_state()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_onboarding(
  TEXT, TEXT[], TEXT, JSONB, UUID[], TEXT, TEXT, TEXT, TEXT[], TEXT[]
) TO authenticated;

COMMENT ON FUNCTION public.get_my_account_state() IS
  'Returns the required signup step in email, terms, onboarding, ready order.';
COMMENT ON FUNCTION public.complete_my_onboarding(
  TEXT, TEXT[], TEXT, JSONB, UUID[], TEXT, TEXT, TEXT, TEXT[], TEXT[]
) IS
  'Completes profile onboarding only after current required terms have been accepted.';

COMMIT;
