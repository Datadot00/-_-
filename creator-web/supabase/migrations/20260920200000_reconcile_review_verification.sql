-- Restore missing review prerequisites without replaying historical payouts or
-- overwriting existing verification choices. Safe for already migrated schemas.
begin;

alter table public.projects add column if not exists verification_method text;
update public.projects set verification_method = case
  when jsonb_typeof(quizzes) = 'array' and jsonb_array_length(quizzes) > 0 then 'quiz'
  else 'none' end where verification_method is null;
alter table public.projects alter column verification_method set default 'none';
alter table public.projects alter column verification_method set not null;
alter table public.projects drop constraint if exists projects_verification_method_valid;
alter table public.projects add constraint projects_verification_method_valid
  check (verification_method in ('none', 'quiz', 'screenshot'));
alter table public.projects add column if not exists target_persona_tags text[] default '{}';
alter table public.projects drop constraint if exists projects_target_persona_tags_limit;
alter table public.projects add constraint projects_target_persona_tags_limit
  check (target_persona_tags is null or cardinality(target_persona_tags) <= 20);
grant select (verification_method, target_persona_tags) on public.projects to anon, authenticated;
grant insert (verification_method, target_persona_tags), update (verification_method, target_persona_tags)
  on public.projects to authenticated;

alter table public.reviews drop constraint if exists reviews_screenshot_url_http_check;
alter table public.reviews add constraint reviews_screenshot_url_http_check check (
  screenshot_url is null or (char_length(screenshot_url) <= 2800000 and (
    screenshot_url ~* '^https?://[^[:space:]]+$'
    or screenshot_url ~* '^data:image/(png|jpe?g|gif|webp);base64,[a-z0-9+/]+={0,2}$'
  ))
);

-- The remaining definitions are the existing server quiz rules from
-- 20260914090000, intentionally excluding its obsolete payout RPC.

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

DROP TRIGGER IF EXISTS reviews_sanitize_optional_verification ON public.reviews;
CREATE TRIGGER reviews_sanitize_optional_verification
BEFORE INSERT OR UPDATE OF project_id, quiz_answers, is_quiz_passed, screenshot_url
ON public.reviews FOR EACH ROW
EXECUTE FUNCTION private.sanitize_optional_review_verification();
COMMIT;