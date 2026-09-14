-- 검증 퀴즈 정답을 공개 프로젝트 조회에서 숨기고 서버가 직접 채점한다.

BEGIN;

CREATE OR REPLACE FUNCTION private.validate_project_quiz_configuration()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = ''
AS $$
BEGIN
  IF NEW.verification_method = 'quiz' THEN
    IF JSONB_TYPEOF(NEW.quizzes) <> 'array' OR JSONB_ARRAY_LENGTH(NEW.quizzes) = 0 THEN
      RAISE EXCEPTION 'quiz configuration is invalid' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM JSONB_ARRAY_ELEMENTS(NEW.quizzes) AS quiz(item)
      WHERE JSONB_TYPEOF(quiz.item) <> 'object'
        OR BTRIM(COALESCE(quiz.item ->> 'question', '')) = ''
        OR BTRIM(COALESCE(quiz.item ->> 'answer', '')) = ''
    ) THEN
      RAISE EXCEPTION 'quiz configuration is invalid' USING ERRCODE = '22023';
    END IF;
  ELSE
    NEW.quizzes := '[]'::JSONB;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_validate_quiz_configuration ON public.projects;
CREATE TRIGGER projects_validate_quiz_configuration
BEFORE INSERT OR UPDATE OF verification_method, quizzes
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION private.validate_project_quiz_configuration();

CREATE OR REPLACE FUNCTION public.get_project_quizzes(p_project_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
  v_verification_method TEXT;
  v_quizzes JSONB;
  v_visible_quizzes JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT project.creator_id, project.verification_method, project.quizzes
  INTO v_creator_id, v_verification_method, v_quizzes
  FROM public.projects AS project
  WHERE project.id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_verification_method <> 'quiz' THEN
    RETURN '[]'::JSONB;
  END IF;
  IF v_creator_id = v_user_id THEN
    RETURN COALESCE(v_quizzes, '[]'::JSONB);
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.participations AS participation
    WHERE participation.project_id = p_project_id
      AND participation.user_id = v_user_id
      AND participation.status IN ('applied', 'in_progress')
  ) THEN
    RETURN '[]'::JSONB;
  END IF;

  SELECT COALESCE(JSONB_AGG(quiz.item - 'answer' ORDER BY quiz.ordinality), '[]'::JSONB)
  INTO v_visible_quizzes
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_quizzes, '[]'::JSONB))
    WITH ORDINALITY AS quiz(item, ordinality);

  RETURN v_visible_quizzes;
END;
$$;

-- 브라우저는 RPC를 통해 질문만 받고 정답 컬럼 자체는 읽을 수 없다.
REVOKE SELECT (quizzes) ON TABLE public.projects FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_project_quizzes(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_quizzes(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION private.sanitize_optional_review_verification()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_verification_method TEXT;
  v_project_quizzes JSONB;
  v_quiz JSONB;
  v_quiz_index BIGINT;
  v_expected_answer TEXT;
  v_submitted_answer TEXT;
BEGIN
  SELECT COALESCE(project.verification_method, 'none'), COALESCE(project.quizzes, '[]'::JSONB)
  INTO v_verification_method, v_project_quizzes
  FROM public.projects AS project
  WHERE project.id = NEW.project_id;

  IF v_verification_method = 'none' THEN
    NEW.quiz_answers := '{}'::JSONB;
    NEW.is_quiz_passed := TRUE;
    NEW.screenshot_url := NULL;
  ELSIF v_verification_method = 'screenshot' THEN
    IF NEW.screenshot_url IS NULL OR BTRIM(NEW.screenshot_url) = '' THEN
      RAISE EXCEPTION 'screenshot is required for this project' USING ERRCODE = '22023';
    END IF;
    NEW.quiz_answers := '{}'::JSONB;
    NEW.is_quiz_passed := TRUE;
  ELSE
    IF JSONB_TYPEOF(v_project_quizzes) <> 'array'
      OR JSONB_ARRAY_LENGTH(v_project_quizzes) = 0
      OR JSONB_TYPEOF(NEW.quiz_answers) <> 'object'
    THEN
      RAISE EXCEPTION 'quiz configuration is invalid' USING ERRCODE = '22023';
    END IF;

    FOR v_quiz, v_quiz_index IN
      SELECT quiz.item, quiz.ordinality
      FROM JSONB_ARRAY_ELEMENTS(v_project_quizzes)
        WITH ORDINALITY AS quiz(item, ordinality)
    LOOP
      v_expected_answer := BTRIM(COALESCE(v_quiz ->> 'answer', ''));
      v_submitted_answer := BTRIM(COALESCE(NEW.quiz_answers ->> ('quiz_' || v_quiz_index), ''));
      IF v_expected_answer = '' THEN
        RAISE EXCEPTION 'quiz configuration is invalid' USING ERRCODE = '22023';
      END IF;
      IF v_submitted_answer = '' THEN
        RAISE EXCEPTION 'quiz answers are required for this project' USING ERRCODE = '22023';
      END IF;
      IF REGEXP_REPLACE(LOWER(v_submitted_answer), '[[:space:]]+', '', 'g')
        <> REGEXP_REPLACE(LOWER(v_expected_answer), '[[:space:]]+', '', 'g')
      THEN
        RAISE EXCEPTION 'quiz answer is incorrect' USING ERRCODE = '22023';
      END IF;
    END LOOP;

    NEW.is_quiz_passed := TRUE;
    NEW.screenshot_url := NULL;
  END IF;

  RETURN NEW;
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
  v_verification_method TEXT;
  v_project_quizzes JSONB;
  v_quiz JSONB;
  v_quiz_index BIGINT;
  v_expected_answer TEXT;
  v_submitted_answer TEXT;
  v_stored_quiz_answers JSONB := '{}'::JSONB;
  v_stored_screenshot_url TEXT;
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
    CHAR_LENGTH(p_screenshot_url) > 3000000
    OR (
      p_screenshot_url !~* '^https?://[^[:space:]]+$'
      AND p_screenshot_url !~* '^data:image/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$'
    )
  ) THEN
    RAISE EXCEPTION 'screenshot URL is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT
    participation.id,
    participation.status,
    project.reward_coin,
    project.title,
    COALESCE(project.verification_method, 'none'),
    COALESCE(project.quizzes, '[]'::JSONB)
  INTO
    v_participation_id,
    v_participation_status,
    v_reward,
    v_project_title,
    v_verification_method,
    v_project_quizzes
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

  IF v_verification_method = 'screenshot' THEN
    IF p_screenshot_url IS NULL OR BTRIM(p_screenshot_url) = '' THEN
      RAISE EXCEPTION 'screenshot is required for this project' USING ERRCODE = '22023';
    END IF;
    v_stored_screenshot_url := p_screenshot_url;
  ELSIF v_verification_method = 'quiz' THEN
    IF JSONB_TYPEOF(v_project_quizzes) <> 'array'
      OR JSONB_ARRAY_LENGTH(v_project_quizzes) = 0
      OR JSONB_TYPEOF(p_quiz_answers) <> 'object'
    THEN
      RAISE EXCEPTION 'quiz configuration is invalid' USING ERRCODE = '22023';
    END IF;

    FOR v_quiz, v_quiz_index IN
      SELECT quiz.item, quiz.ordinality
      FROM JSONB_ARRAY_ELEMENTS(v_project_quizzes)
        WITH ORDINALITY AS quiz(item, ordinality)
    LOOP
      v_expected_answer := BTRIM(COALESCE(v_quiz ->> 'answer', ''));
      v_submitted_answer := BTRIM(COALESCE(p_quiz_answers ->> ('quiz_' || v_quiz_index), ''));
      IF v_expected_answer = '' THEN
        RAISE EXCEPTION 'quiz configuration is invalid' USING ERRCODE = '22023';
      END IF;
      IF v_submitted_answer = '' THEN
        RAISE EXCEPTION 'quiz answers are required for this project' USING ERRCODE = '22023';
      END IF;
      IF REGEXP_REPLACE(LOWER(v_submitted_answer), '[[:space:]]+', '', 'g')
        <> REGEXP_REPLACE(LOWER(v_expected_answer), '[[:space:]]+', '', 'g')
      THEN
        RAISE EXCEPTION 'quiz answer is incorrect' USING ERRCODE = '22023';
      END IF;
    END LOOP;
    v_stored_quiz_answers := p_quiz_answers;
  END IF;

  INSERT INTO public.reviews (
    project_id, participation_id, user_id, rating, reuse_intention,
    answers, quiz_answers, is_quiz_passed, screenshot_url, status
  ) VALUES (
    p_project_id, v_participation_id, v_user_id, p_rating,
    COALESCE(p_reuse_intention, TRUE), p_answers, v_stored_quiz_answers,
    TRUE, v_stored_screenshot_url, 'submitted'
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

REVOKE ALL ON FUNCTION public.submit_project_review(UUID, NUMERIC, BOOLEAN, JSONB, JSONB, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_review(UUID, NUMERIC, BOOLEAN, JSONB, JSONB, BOOLEAN, TEXT)
  TO authenticated;

COMMIT;
