const ACCOUNT_STATE_RPC = 'get_my_account_state';

export const ACCOUNT_NEXT_STEPS = Object.freeze([
  'verify_email',
  'terms_review',
  'onboarding',
  'ready'
]);

const ACCOUNT_NEXT_STEP_SET = new Set(ACCOUNT_NEXT_STEPS);

function requireRpcClient(client) {
  if (typeof client?.rpc !== 'function') {
    throw new Error('Supabase RPC client is not configured.');
  }
}

function createAccountRoutingError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

export function isAccountStateMigrationMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return ['PGRST202', '42883'].includes(code)
    || (
      /schema cache|function .* does not exist|could not find the function/i.test(message)
      && message.includes(ACCOUNT_STATE_RPC)
    );
}

export function normalizeAccountState(payload, { configured = true } = {}) {
  if (!configured) {
    return {
      configured: false,
      nextStep: 'legacy',
      userId: '',
      email: '',
      emailConfirmed: false,
      onboarding: {
        required: false,
        completedVersion: 0,
        completedAt: null
      },
      terms: {
        requiresConsent: false,
        activeRequiredCount: 0,
        missingRequiredCount: 0
      },
      profile: {
        nickname: '',
        bio: '',
      jobGroup: '',
      gender: '',
      ageRange: '',
      devices: [],
      toolTags: [],
        interests: [],
        snsLinks: []
      }
    };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createAccountRoutingError(
      'account_state_invalid',
      'The account state response is invalid.'
    );
  }

  const nextStep = String(payload.next_step || '');
  if (!ACCOUNT_NEXT_STEP_SET.has(nextStep)) {
    throw createAccountRoutingError(
      'account_state_invalid',
      `Unsupported account next step: ${nextStep || '(empty)'}`
    );
  }

  const onboarding = payload.onboarding || {};
  const terms = payload.terms || {};
  const profile = payload.profile || {};

  return {
    configured: true,
    nextStep,
    userId: String(payload.user_id || ''),
    email: String(payload.email || ''),
    emailConfirmed: Boolean(payload.email_confirmed),
    onboarding: {
      required: Boolean(onboarding.required),
      completedVersion: toNonNegativeInteger(onboarding.completed_version),
      completedAt: onboarding.completed_at || null
    },
    terms: {
      requiresConsent: Boolean(terms.requires_consent),
      activeRequiredCount: toNonNegativeInteger(terms.active_required_count),
      missingRequiredCount: toNonNegativeInteger(terms.missing_required_count)
    },
    profile: {
      nickname: String(profile.nickname || ''),
      bio: String(profile.bio || ''),
    jobGroup: String(profile.job_group || ''),
    gender: String(profile.gender || ''),
    ageRange: String(profile.age_range || ''),
    devices: Array.isArray(profile.devices)
      ? profile.devices.map(value => String(value))
      : [],
    toolTags: Array.isArray(profile.tool_tags)
      ? profile.tool_tags.map(value => String(value))
      : [],
      interests: Array.isArray(profile.interests)
        ? profile.interests.map(value => String(value))
        : [],
      snsLinks: Array.isArray(profile.sns_links)
        ? profile.sns_links.map(value => String(value))
        : []
    }
  };
}

export async function fetchMyAccountState(
  client,
  { allowMissingMigration = Boolean(import.meta.env?.DEV) } = {}
) {
  requireRpcClient(client);

  const { data, error } = await client.rpc(ACCOUNT_STATE_RPC);
  if (error) {
    if (allowMissingMigration && isAccountStateMigrationMissing(error)) {
      return normalizeAccountState(null, { configured: false });
    }
    throw error;
  }

  return normalizeAccountState(data);
}

export async function routeAuthenticatedAccount(
  client,
  handlers,
  options = {}
) {
  const state = await fetchMyAccountState(client, options);
  const routeKey = state.configured ? state.nextStep : 'legacy';
  const handler = handlers?.[routeKey];

  if (typeof handler !== 'function') {
    throw createAccountRoutingError(
      'account_route_handler_missing',
      `Account route handler is missing: ${routeKey}`
    );
  }

  await handler(state);
  return state;
}
