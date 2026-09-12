-- 검증 퀴즈와 스크린샷 첨부는 선택 사항이다.
-- 선택하는 경우 두 방식 중 하나만 사용하고, 미선택 프로젝트의 증빙값은 저장하지 않는다.

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS verification_method TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.projects
  ALTER COLUMN verification_method SET DEFAULT 'none';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_verification_method_valid;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_verification_method_valid
  CHECK (verification_method IN ('none', 'quiz', 'screenshot'));

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_verification_method_payload_valid;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_verification_method_payload_valid
  CHECK (
    verification_method = 'quiz'
    OR JSONB_TYPEOF(quizzes) <> 'array'
    OR JSONB_ARRAY_LENGTH(quizzes) = 0
  );

CREATE OR REPLACE FUNCTION private.sanitize_optional_review_verification()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_verification_method TEXT;
  v_project_quizzes JSONB;
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
    IF JSONB_TYPEOF(v_project_quizzes) = 'array'
      AND JSONB_ARRAY_LENGTH(v_project_quizzes) > 0
      AND (
        NEW.quiz_answers IS NULL
        OR JSONB_TYPEOF(NEW.quiz_answers) <> 'object'
        OR NEW.quiz_answers = '{}'::JSONB
      )
    THEN
      RAISE EXCEPTION 'quiz answers are required for this project' USING ERRCODE = '22023';
    END IF;
    NEW.screenshot_url := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_sanitize_optional_verification
  ON public.reviews;
CREATE TRIGGER reviews_sanitize_optional_verification
BEFORE INSERT OR UPDATE OF project_id, quiz_answers, is_quiz_passed, screenshot_url
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION private.sanitize_optional_review_verification();

COMMIT;
