-- 프로젝트 제작 기술과 권장 참여 대상 태그를 별도 필드로 관리한다.

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS target_persona_tags TEXT[] DEFAULT '{}';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_target_persona_tags_limit;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_target_persona_tags_limit
  CHECK (target_persona_tags IS NULL OR CARDINALITY(target_persona_tags) <= 20);

GRANT SELECT (target_persona_tags)
  ON TABLE public.projects TO anon, authenticated;
GRANT INSERT (target_persona_tags)
  ON TABLE public.projects TO authenticated;
GRANT UPDATE (target_persona_tags)
  ON TABLE public.projects TO authenticated;

COMMIT;
