const TERMS_STATUS_RPC = 'get_my_terms_requirement_status';
const RECORD_TERMS_RPC = 'record_my_current_term_consents';

function requireRpcClient(client) {
  if (typeof client?.rpc !== 'function') {
    throw new Error('Supabase RPC client is not configured.');
  }
}

export function isTermsGateMigrationMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return ['PGRST202', '42883'].includes(code)
    || (
      /schema cache|function .* does not exist|could not find the function/i.test(message)
      && message.includes(TERMS_STATUS_RPC)
    );
}

export function normalizeTermsRequirement(payload, { configured = true } = {}) {
  const documents = Array.isArray(payload?.documents)
    ? payload.documents
      .filter(document => document && typeof document.id === 'string')
      .map(document => ({
        id: document.id,
        documentType: String(document.document_type || ''),
        version: String(document.version || ''),
        title: String(document.title || ''),
        content: String(document.content || ''),
        isRequired: Boolean(document.is_required),
        isAccepted: Boolean(document.is_accepted)
      }))
    : [];

  return {
    configured,
    requiresConsent: Boolean(payload?.requires_consent),
    documents
  };
}

export async function fetchMyTermsRequirement(
  client,
  { allowMissingMigration = Boolean(import.meta.env?.DEV) } = {}
) {
  requireRpcClient(client);

  const { data, error } = await client.rpc(TERMS_STATUS_RPC);
  if (error) {
    if (allowMissingMigration && isTermsGateMigrationMissing(error)) {
      return normalizeTermsRequirement(null, { configured: false });
    }
    throw error;
  }

  return normalizeTermsRequirement(data);
}

export async function recordMyCurrentTermConsents(client, acceptedDocumentIds = []) {
  requireRpcClient(client);

  const uniqueDocumentIds = [...new Set(
    (Array.isArray(acceptedDocumentIds) ? acceptedDocumentIds : [])
      .filter(documentId => typeof documentId === 'string' && documentId.trim())
      .map(documentId => documentId.trim())
  )];

  const { data, error } = await client.rpc(RECORD_TERMS_RPC, {
    p_accepted_document_ids: uniqueDocumentIds
  });
  if (error) throw error;

  const status = normalizeTermsRequirement(data);
  if (status.requiresConsent) {
    const incompleteError = new Error('Required terms remain unaccepted.');
    incompleteError.code = 'required_terms_missing';
    throw incompleteError;
  }

  return status;
}
