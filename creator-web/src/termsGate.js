import {
  fetchMyTermsRequirement,
  recordMyCurrentTermConsents
} from './termsService.js';

const DOCUMENT_TYPE_LABELS = {
  terms_of_service: '서비스 이용약관',
  privacy_policy: '개인정보 처리방침',
  marketing_consent: '마케팅 정보 수신 동의'
};

let activeClient = null;
let pendingContinuation = null;
let currentDocuments = [];
let isSubmitting = false;
let eventsBound = false;

function getElements() {
  return {
    modal: document.getElementById('terms-consent-modal'),
    allAgreement: document.getElementById('terms-consent-all'),
    allAgreementWrapper: document.getElementById('terms-consent-all-wrapper'),
    documentList: document.getElementById('terms-consent-document-list'),
    error: document.getElementById('terms-consent-error'),
    retry: document.getElementById('btn-terms-consent-retry'),
    confirm: document.getElementById('btn-terms-consent-confirm'),
    decline: document.getElementById('btn-terms-consent-decline'),
    detail: document.getElementById('terms-document-detail'),
    detailTitle: document.getElementById('terms-document-detail-title'),
    detailContent: document.getElementById('terms-document-detail-content'),
    detailClose: document.getElementById('btn-terms-document-detail-close')
  };
}

function setError(message = '') {
  const { error } = getElements();
  if (!error) return;
  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

function getCheckboxes() {
  return [...document.querySelectorAll('[data-terms-document-checkbox]')];
}

function updateAgreementState() {
  const { allAgreement, confirm } = getElements();
  const checkboxes = getCheckboxes();
  const requiredCheckboxes = checkboxes.filter(checkbox => checkbox.dataset.required === 'true');
  const checkedCount = checkboxes.filter(checkbox => checkbox.checked).length;

  if (allAgreement) {
    allAgreement.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
    allAgreement.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  }
  if (confirm) {
    confirm.disabled = isSubmitting
      || requiredCheckboxes.some(checkbox => !checkbox.checked);
  }
}

function createDocumentRow(documentRecord) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rounded-xl border border-neutral-200 bg-white px-4 py-3';

  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-3';

  const label = document.createElement('label');
  label.className = 'flex min-w-0 flex-1 cursor-pointer items-start gap-3';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = documentRecord.isAccepted;
  checkbox.dataset.termsDocumentCheckbox = documentRecord.id;
  checkbox.dataset.required = String(documentRecord.isRequired);
  checkbox.className = 'mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#2F6517]';

  const textWrapper = document.createElement('span');
  textWrapper.className = 'min-w-0';

  const title = document.createElement('span');
  title.className = 'block text-xs font-extrabold text-neutral-800';
  title.textContent = DOCUMENT_TYPE_LABELS[documentRecord.documentType]
    || documentRecord.title
    || '약관';

  const metadata = document.createElement('span');
  metadata.className = 'mt-0.5 block text-[11px] font-medium text-neutral-400';
  metadata.textContent = `${documentRecord.isRequired ? '필수' : '선택'} · ${documentRecord.version}`;

  textWrapper.append(title, metadata);
  label.append(checkbox, textWrapper);

  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.dataset.termsDocumentDetail = documentRecord.id;
  detailButton.className = 'shrink-0 text-[11px] font-bold text-[#568A32] underline underline-offset-2';
  detailButton.textContent = '내용 보기';

  row.append(label, detailButton);
  wrapper.append(row);
  return wrapper;
}

function renderDocuments(documents) {
  const {
    allAgreementWrapper,
    documentList,
    detail,
    retry,
    confirm
  } = getElements();

  currentDocuments = documents;
  documentList?.replaceChildren(...documents.map(createDocumentRow));
  allAgreementWrapper?.classList.remove('hidden');
  documentList?.classList.remove('hidden');
  detail?.classList.add('hidden');
  retry?.classList.add('hidden');
  confirm?.classList.remove('hidden');
  setError('');
  updateAgreementState();
}

function renderLoadError() {
  const {
    allAgreementWrapper,
    documentList,
    detail,
    retry,
    confirm
  } = getElements();

  currentDocuments = [];
  allAgreementWrapper?.classList.add('hidden');
  documentList?.classList.add('hidden');
  detail?.classList.add('hidden');
  retry?.classList.remove('hidden');
  confirm?.classList.add('hidden');
  setError('약관 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
}

function openModal() {
  const { modal } = getElements();
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
  window.setTimeout(() => {
    getCheckboxes().find(checkbox => checkbox.dataset.required === 'true' && !checkbox.checked)
      ?.focus();
  }, 0);
}

export function closeTermsConsentGate() {
  const { modal, detail } = getElements();
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
  detail?.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  activeClient = null;
  currentDocuments = [];
  pendingContinuation = null;
  isSubmitting = false;
  setError('');
}

function showDocumentDetail(documentId) {
  const { detail, detailTitle, detailContent } = getElements();
  const documentRecord = currentDocuments.find(item => item.id === documentId);
  if (!documentRecord || !detail) return;

  if (detailTitle) detailTitle.textContent = documentRecord.title;
  if (detailContent) detailContent.textContent = documentRecord.content;
  detail.classList.remove('hidden');
  detailContent?.scrollTo?.({ top: 0 });
  getElements().detailClose?.focus();
}

async function handleSubmit() {
  if (!activeClient || isSubmitting) return;

  const { confirm } = getElements();
  const requiredMissing = getCheckboxes()
    .some(checkbox => checkbox.dataset.required === 'true' && !checkbox.checked);
  if (requiredMissing) {
    setError('필수 약관에 모두 동의해 주세요.');
    updateAgreementState();
    return;
  }

  const acceptedDocumentIds = getCheckboxes()
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.dataset.termsDocumentCheckbox);

  isSubmitting = true;
  if (confirm) confirm.textContent = '동의 저장 중...';
  updateAgreementState();
  setError('');

  try {
    await recordMyCurrentTermConsents(activeClient, acceptedDocumentIds);
    const continuation = pendingContinuation;
    closeTermsConsentGate();
    await continuation?.();
  } catch (error) {
    console.warn('[Terms] Could not record consent:', error);
    setError('약관 동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    isSubmitting = false;
    if (confirm) confirm.textContent = '동의하고 계속하기';
    updateAgreementState();
  }
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  const {
    allAgreement,
    documentList,
    retry,
    confirm,
    decline,
    detailClose
  } = getElements();

  allAgreement?.addEventListener('change', () => {
    getCheckboxes().forEach(checkbox => {
      checkbox.checked = allAgreement.checked;
    });
    setError('');
    updateAgreementState();
  });

  documentList?.addEventListener('change', event => {
    if (!event.target.closest('[data-terms-document-checkbox]')) return;
    setError('');
    updateAgreementState();
  });

  documentList?.addEventListener('click', event => {
    const detailButton = event.target.closest('[data-terms-document-detail]');
    if (!detailButton) return;
    showDocumentDetail(detailButton.dataset.termsDocumentDetail);
  });

  detailClose?.addEventListener('click', () => {
    getElements().detail?.classList.add('hidden');
  });
  confirm?.addEventListener('click', handleSubmit);
  retry?.addEventListener('click', async () => {
    const client = activeClient;
    const continuation = pendingContinuation;
    const stillBlocked = await showTermsConsentGateIfRequired(client, {
      onAccepted: continuation,
      forceOpenOnError: true
    });
    if (!stillBlocked) {
      closeTermsConsentGate();
      await continuation?.();
    }
  });
  decline?.addEventListener('click', () => {
    closeTermsConsentGate();
    window.dispatchEvent(new CustomEvent('dondwae:terms-declined'));
  });
}

export async function showTermsConsentGateIfRequired(
  client,
  { onAccepted, forceOpenOnError = true } = {}
) {
  bindEvents();
  activeClient = client;
  pendingContinuation = typeof onAccepted === 'function' ? onAccepted : null;

  try {
    const status = await fetchMyTermsRequirement(client);
    if (!status.configured) {
      console.warn('[Terms] Terms gate migration is not applied; continuing without enforcement.');
      pendingContinuation = null;
      return false;
    }
    if (!status.requiresConsent) {
      pendingContinuation = null;
      return false;
    }

    renderDocuments(status.documents);
    openModal();
    return true;
  } catch (error) {
    console.warn('[Terms] Could not load consent requirement:', error);
    if (!forceOpenOnError) throw error;
    renderLoadError();
    openModal();
    return true;
  }
}
