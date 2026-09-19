    let userParticipatedTests = {};

    let currentParticipatingPostId = null;

    let internalMissionAnswers = null;

    let selectedInternalVoteOption = null;

    const INTERNAL_MISSION_DRAFT_STORAGE_PREFIX = 'dondwae_internal_mission_draft';

    const INTERNAL_MISSION_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

    const INTERNAL_VOTE_CARD_SELECTED_CLASS = 'border-2 border-[#2F6517] bg-[#FAFBF7] rounded-2xl p-4 flex flex-col gap-3 cursor-pointer shadow-subtle hover:shadow-md transition-all relative';

    const INTERNAL_VOTE_CARD_IDLE_CLASS = 'border border-neutral-200 bg-white rounded-2xl p-4 flex flex-col gap-3 cursor-pointer shadow-2xs hover:border-neutral-300 transition-all relative';
