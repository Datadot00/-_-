    function getInternalMissionDraftStorageKey(projectId) {
      const userId = String(window.currentAuthUserId || '').trim();
      const normalizedProjectId = String(projectId || '').trim();
      if (!userId || !isDatabaseProjectId(normalizedProjectId)) return '';
      return `${INTERNAL_MISSION_DRAFT_STORAGE_PREFIX}:${userId}:${normalizedProjectId}`;
    }

    function normalizeInternalMissionDraftData(rawData) {
      if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;

      const normalized = {};
      const selectedOption = String(rawData.selected_option || '').trim().toUpperCase();
      if (/^[A-D]$/.test(selectedOption)) normalized.selected_option = selectedOption;

      const voteReason = String(rawData.vote_reason || '').trim().slice(0, 2000);
      if (voteReason) normalized.vote_reason = voteReason;

      if (rawData.question_answers && typeof rawData.question_answers === 'object' && !Array.isArray(rawData.question_answers)) {
        const questionAnswers = {};
        Object.entries(rawData.question_answers).slice(0, 20).forEach(([question, answer]) => {
          const normalizedQuestion = String(question || '').trim().slice(0, 300);
          if (!normalizedQuestion) return;
          if (Array.isArray(answer)) {
            const answers = answer.map(value => String(value || '').trim().slice(0, 1000)).filter(Boolean).slice(0, 20);
            if (answers.length > 0) questionAnswers[normalizedQuestion] = answers;
          } else {
            const normalizedAnswer = String(answer || '').trim().slice(0, 2000);
            if (normalizedAnswer) questionAnswers[normalizedQuestion] = normalizedAnswer;
          }
        });
        if (Object.keys(questionAnswers).length > 0) normalized.question_answers = questionAnswers;
      }

      return Object.keys(normalized).length > 0 ? normalized : null;
    }

    function saveInternalMissionDraft(projectId, rawData) {
      const storageKey = getInternalMissionDraftStorageKey(projectId);
      const data = normalizeInternalMissionDraftData(rawData);
      if (!storageKey || !data) return false;

      try {
        sessionStorage.setItem(storageKey, JSON.stringify({
          version: 1,
          projectId: String(projectId),
          userId: String(window.currentAuthUserId),
          savedAt: Date.now(),
          data
        }));
        return true;
      } catch (error) {
        console.warn('[Internal mission draft] Save failed:', error?.message || error);
        return false;
      }
    }

    function readInternalMissionDraft(projectId) {
      const storageKey = getInternalMissionDraftStorageKey(projectId);
      if (!storageKey) return null;

      try {
        const storedValue = sessionStorage.getItem(storageKey);
        if (!storedValue) return null;
        const draft = JSON.parse(storedValue);
        const isExpired = !Number.isFinite(Number(draft?.savedAt))
          || Number(draft.savedAt) > Date.now()
          || Date.now() - Number(draft.savedAt) > INTERNAL_MISSION_DRAFT_MAX_AGE_MS;
        const isMismatched = String(draft?.projectId || '') !== String(projectId)
          || String(draft?.userId || '') !== String(window.currentAuthUserId || '');
        if (isExpired || isMismatched) {
          sessionStorage.removeItem(storageKey);
          return null;
        }
        return normalizeInternalMissionDraftData(draft.data);
      } catch (error) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch (storageError) {}
        console.warn('[Internal mission draft] Restore failed:', error?.message || error);
        return null;
      }
    }

    function clearInternalMissionDraft(projectId) {
      const storageKey = getInternalMissionDraftStorageKey(projectId);
      if (!storageKey) return;
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('[Internal mission draft] Clear failed:', error?.message || error);
      }
    }
