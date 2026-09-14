-- Store versioned terms documents and append-only user consent history.

BEGIN;

CREATE TABLE IF NOT EXISTS public.terms_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_required BOOLEAN NOT NULL,
  published_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT terms_documents_type_valid CHECK (
    document_type IN ('terms_of_service', 'privacy_policy', 'marketing_consent')
  ),
  CONSTRAINT terms_documents_version_valid CHECK (
    BTRIM(version) <> '' AND CHAR_LENGTH(version) <= 50
  ),
  CONSTRAINT terms_documents_title_valid CHECK (
    BTRIM(title) <> '' AND CHAR_LENGTH(title) <= 200
  ),
  CONSTRAINT terms_documents_content_valid CHECK (BTRIM(content) <> ''),
  CONSTRAINT terms_documents_required_consistent CHECK (
    (
      document_type IN ('terms_of_service', 'privacy_policy')
      AND is_required
    )
    OR (
      document_type = 'marketing_consent'
      AND NOT is_required
    )
  ),
  CONSTRAINT terms_documents_lifecycle_valid CHECK (
    (
      published_at IS NULL
      AND effective_at IS NULL
      AND retired_at IS NULL
    )
    OR (
      published_at IS NOT NULL
      AND effective_at IS NOT NULL
      AND (retired_at IS NULL OR retired_at > effective_at)
    )
  ),
  CONSTRAINT terms_documents_type_version_unique UNIQUE (document_type, version)
);

CREATE TABLE IF NOT EXISTS public.user_term_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  terms_document_id UUID NOT NULL
    REFERENCES public.terms_documents(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  collection_point TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_term_consents_event_type_valid CHECK (
    event_type IN ('accepted', 'withdrawn')
  ),
  CONSTRAINT user_term_consents_collection_point_valid CHECK (
    BTRIM(collection_point) <> ''
    AND CHAR_LENGTH(collection_point) <= 50
  )
);

CREATE INDEX IF NOT EXISTS idx_terms_documents_type_effective
  ON public.terms_documents (document_type, effective_at DESC)
  WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_term_consents_user_recorded
  ON public.user_term_consents (user_id, recorded_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_user_term_consents_user_document_recorded
  ON public.user_term_consents (
    user_id, terms_document_id, recorded_at DESC, id DESC
  );

CREATE OR REPLACE FUNCTION private.protect_consented_terms_document()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_term_consents AS consent
    WHERE consent.terms_document_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'terms documents with consent history are immutable'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_consented_terms_document
  ON public.terms_documents;
CREATE TRIGGER protect_consented_terms_document
  BEFORE UPDATE OF
    document_type, version, title, content, is_required, published_at, effective_at
  ON public.terms_documents
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_consented_terms_document();

ALTER TABLE public.terms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_term_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Available terms documents are viewable"
  ON public.terms_documents;
CREATE POLICY "Available terms documents are viewable"
  ON public.terms_documents
  FOR SELECT
  TO anon, authenticated
  USING (
    published_at IS NOT NULL
    AND effective_at IS NOT NULL
    AND effective_at <= NOW()
    AND (retired_at IS NULL OR retired_at > NOW())
  );

DROP POLICY IF EXISTS "Users view consented terms documents"
  ON public.terms_documents;
CREATE POLICY "Users view consented terms documents"
  ON public.terms_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_term_consents AS consent
      WHERE consent.terms_document_id = terms_documents.id
        AND consent.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users view own term consent history"
  ON public.user_term_consents;
CREATE POLICY "Users view own term consent history"
  ON public.user_term_consents
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL PRIVILEGES ON TABLE public.terms_documents
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_term_consents
  FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, document_type, version, title, content, is_required,
  published_at, effective_at, retired_at, created_at
) ON TABLE public.terms_documents TO anon, authenticated;
GRANT SELECT (
  id, user_id, terms_document_id, event_type, collection_point, recorded_at
) ON TABLE public.user_term_consents TO authenticated;

REVOKE ALL ON FUNCTION private.protect_consented_terms_document()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.terms_documents IS
  'Immutable versioned terms shown at signup, onboarding, and settings.';
COMMENT ON TABLE public.user_term_consents IS
  'Append-only accepted or withdrawn events for each user and terms version.';
COMMENT ON COLUMN public.user_term_consents.collection_point IS
  'Trusted application flow that collected the event, such as onboarding.';

COMMIT;
