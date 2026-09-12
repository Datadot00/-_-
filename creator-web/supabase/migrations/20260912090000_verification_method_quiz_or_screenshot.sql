-- 검증 방식 정책 변경: 검증 퀴즈와 스크린샷 첨부 중 하나만 사용한다.
--
-- 이전에는 제작자가 퀴즈를 등록하면서 테스터에게 스크린샷도 함께 요구할 수 있었다.
-- 이제 프로젝트마다 검증 수단을 하나만 고르고, 리뷰 제출 시 그 수단만 검사·저장한다.
--
-- submit_project_review 는 기존 정의를 그대로 유지하고 검증 수단 분기만 추가한다.

BEGIN;

-- 1) 프로젝트에 검증 방식 컬럼을 추가한다.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS verification_method TEXT NOT NULL DEFAULT 'quiz';

-- 2) 기존 데이터 백필: 퀴즈가 실제로 등록된 프로젝트만 'quiz', 나머지는 'screenshot'.
UPDATE public.projects
SET verification_method = CASE
  WHEN JSONB_TYPEOF(quizzes) = 'array' AND JSONB_ARRAY_LENGTH(quizzes) > 0 THEN 'quiz'
  ELSE 'screenshot'
END;

-- 3) 스크린샷 방식인 프로젝트에는 퀴즈가 남아 있으면 안 된다.
UPDATE public.projects
SET quizzes = '[]'::JSONB
WHERE verification_method = 'screenshot'
  AND JSONB_TYPEOF(quizzes) = 'array'
  AND JSONB_ARRAY_LENGTH(quizzes) > 0;

-- 4) 제약 조건.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_verification_method_valid;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_verification_method_valid
  CHECK (verification_method IN ('quiz', 'screenshot'));

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_verification_method_payload_valid;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_verification_method_payload_valid
  CHECK (
    verification_method = 'quiz'
    OR JSONB_TYPEOF(quizzes) <> 'array'
    OR JSONB_ARRAY_LENGTH(quizzes) = 0
  );

-- 5) 제작자가 직접 쓰고 고칠 수 있는 컬럼 목록에 추가한다.
GRANT INSERT (verification_method) ON public.projects TO authenticated;
GRANT UPDATE (verification_method) ON public.projects TO authenticated;

-- 5-1) 스크린샷 증빙은 외부 링크뿐 아니라 첨부한 이미지(data URL)도 허용한다.
--      프로젝트 썸네일과 동일한 저장 방식이며, 과도한 용량은 길이로 제한한다.
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_screenshot_url_http_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_screenshot_url_http_check CHECK (
    screenshot_url IS NULL
    OR (CHAR_LENGTH(screenshot_url) <= 3000000 AND (
      screenshot_url ~* '^https?://[^[:space:]]+$'
      OR screenshot_url ~* '^data:image/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$'
    ))
  );

-- 6) 리뷰 제출 RPC: 프로젝트가 고른 검증 수단만 요구하고, 다른 수단의 값은 저장하지 않는다.
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
  v_verification_method TEXT;
  v_project_quizzes JSONB;
  v_stored_quiz_answers JSONB;
  v_stored_screenshot_url TEXT;
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
    CHAR_LENGTH(p_screenshot_url) > 3000000
    OR (
      p_screenshot_url !~* '^https?://[^[:space:]]+$'
      AND p_screenshot_url !~* '^data:image/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$'
    )
  ) THEN
    RAISE EXCEPTION 'screenshot URL is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT
    participation.id, participation.status, project.reward_coin, project.title,
    COALESCE(project.verification_method, 'quiz'), COALESCE(project.quizzes, '[]'::JSONB)
  INTO
    v_participation_id, v_participation_status, v_reward, v_project_title,
    v_verification_method, v_project_quizzes
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

  -- 검증 수단은 프로젝트가 고른 하나만 요구하고, 나머지 수단의 값은 버린다.
  IF v_verification_method = 'screenshot' THEN
    IF p_screenshot_url IS NULL OR BTRIM(p_screenshot_url) = '' THEN
      RAISE EXCEPTION 'screenshot is required for this project' USING ERRCODE = '22023';
    END IF;
    v_stored_quiz_answers := '{}'::JSONB;
    v_stored_screenshot_url := p_screenshot_url;
  ELSE
    IF JSONB_TYPEOF(v_project_quizzes) = 'array'
      AND JSONB_ARRAY_LENGTH(v_project_quizzes) > 0
      AND (
        JSONB_TYPEOF(p_quiz_answers) <> 'object'
        OR p_quiz_answers = '{}'::JSONB
      )
    THEN
      RAISE EXCEPTION 'quiz answers are required for this project' USING ERRCODE = '22023';
    END IF;
    v_stored_quiz_answers := p_quiz_answers;
    v_stored_screenshot_url := NULL;
  END IF;

  INSERT INTO public.reviews (
    project_id, participation_id, user_id, rating, reuse_intention,
    answers, quiz_answers, is_quiz_passed, screenshot_url, status
  ) VALUES (
    p_project_id, v_participation_id, v_user_id, p_rating,
    COALESCE(p_reuse_intention, TRUE), p_answers, v_stored_quiz_answers,
    COALESCE(p_is_quiz_passed, TRUE), v_stored_screenshot_url, 'submitted'
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
    'has_passed_gating', v_has_passed_gating,
    'verification_method', v_verification_method
  );
END;
$$;

COMMIT;
