-- 온보딩에서 받은 직업군·성별·연령대·주 사용기기·툴 태그를
-- 내 정보 화면에서도 조회하고 고칠 수 있게 한다.
--
-- 두 함수 모두 RETURNS TABLE 의 컬럼이 늘어나므로 CREATE OR REPLACE 로는
-- 바꿀 수 없다. 기존 시그니처를 지우고 다시 만든다.
BEGIN;

DROP FUNCTION IF EXISTS public.get_my_private_profile();
DROP FUNCTION IF EXISTS public.update_my_private_profile(TEXT, TEXT, TEXT[], JSONB);

CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  bio TEXT,
  job_group TEXT,
  gender TEXT,
  age_range TEXT,
  devices TEXT[],
  tool_tags TEXT[],
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
    profile.job_group,
    profile.gender,
    profile.age_range,
    profile.devices,
    profile.tool_tags,
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
  p_sns_links JSONB DEFAULT '[]'::JSONB,
  p_job_group TEXT DEFAULT '',
  p_gender TEXT DEFAULT '',
  p_age_range TEXT DEFAULT '',
  p_devices TEXT[] DEFAULT '{}'::TEXT[],
  p_tool_tags TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  bio TEXT,
  job_group TEXT,
  gender TEXT,
  age_range TEXT,
  devices TEXT[],
  tool_tags TEXT[],
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
  v_job_group TEXT := NULLIF(BTRIM(COALESCE(p_job_group, '')), '');
  v_gender TEXT := NULLIF(BTRIM(COALESCE(p_gender, '')), '');
  v_age_range TEXT := NULLIF(BTRIM(COALESCE(p_age_range, '')), '');
  v_devices TEXT[];
  v_tool_tags TEXT[];
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

  -- 온보딩 전에 가입한 계정은 이 값들이 비어 있으므로, 프로필 수정에서는
  -- 빈 값을 그대로 허용한다. 값이 들어오면 온보딩과 같은 기준으로 본다.
  IF v_job_group IS NOT NULL AND CHAR_LENGTH(v_job_group) > 50 THEN
    RAISE EXCEPTION 'job group must contain at most 50 characters' USING ERRCODE = '22023';
  END IF;

  IF v_gender IS NOT NULL AND v_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'gender must be male or female' USING ERRCODE = '22023';
  END IF;

  IF v_age_range IS NOT NULL
     AND v_age_range NOT IN ('10s', '20s', '30s', '40s', '50s', '60s_plus') THEN
    RAISE EXCEPTION 'age range must be one of the supported buckets' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(BTRIM(device.value) ORDER BY device.ordinality),
    '{}'::TEXT[]
  )
  INTO v_devices
  FROM UNNEST(COALESCE(p_devices, '{}'::TEXT[]))
    WITH ORDINALITY AS device(value, ordinality)
  WHERE BTRIM(device.value) <> '';

  IF CARDINALITY(v_devices) > 4
     OR EXISTS (
       SELECT 1
       FROM UNNEST(v_devices) AS device(value)
       WHERE device.value NOT IN ('ios', 'android', 'mac', 'windows')
     )
     OR (
       SELECT COUNT(*) FROM UNNEST(v_devices) AS device(value)
     ) <> (
       SELECT COUNT(DISTINCT device.value) FROM UNNEST(v_devices) AS device(value)
     ) THEN
    RAISE EXCEPTION 'devices are invalid' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(BTRIM(tag.value) ORDER BY tag.ordinality),
    '{}'::TEXT[]
  )
  INTO v_tool_tags
  FROM UNNEST(COALESCE(p_tool_tags, '{}'::TEXT[]))
    WITH ORDINALITY AS tag(value, ordinality)
  WHERE BTRIM(tag.value) <> '';

  IF CARDINALITY(v_tool_tags) > 10
     OR EXISTS (
       SELECT 1
       FROM UNNEST(v_tool_tags) AS tag(value)
       WHERE CHAR_LENGTH(tag.value) > 40 OR tag.value LIKE '#%'
     )
     OR (
       SELECT COUNT(*) FROM UNNEST(v_tool_tags) AS tag(value)
     ) <> (
       SELECT COUNT(DISTINCT LOWER(tag.value)) FROM UNNEST(v_tool_tags) AS tag(value)
     ) THEN
    RAISE EXCEPTION 'tool tags are invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users AS profile
  SET
    nickname = BTRIM(p_nickname),
    bio = BTRIM(COALESCE(p_bio, '')),
    interests = COALESCE(p_interests, '{}'::TEXT[]),
    job_group = v_job_group,
    gender = v_gender,
    age_range = v_age_range,
    devices = v_devices,
    tool_tags = v_tool_tags,
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
    profile.job_group,
    profile.gender,
    profile.age_range,
    profile.devices,
    profile.tool_tags,
    profile.interests,
    profile.sns_links,
    profile.updated_at
  FROM public.users AS profile
  WHERE profile.id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_my_private_profile(
  TEXT, TEXT, TEXT[], JSONB, TEXT, TEXT, TEXT, TEXT[], TEXT[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_private_profile(
  TEXT, TEXT, TEXT[], JSONB, TEXT, TEXT, TEXT, TEXT[], TEXT[]
) TO authenticated;

COMMIT;
