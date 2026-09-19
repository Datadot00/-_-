    function getActiveProjectEditId() {
      return activeEditingProjectId
        || document.getElementById('view-create')?.dataset.editingProjectId
        || readStoredProjectEditId();
    }

    function setProjectEditContext(projectId, originalLoginRequired = null) {
      const normalizedId = projectId && projectId !== 'my-created-test' ? String(projectId) : null;
      activeEditingProjectId = normalizedId;
      isProjectEditMode = Boolean(normalizedId);
      editingOriginalLoginRequired = typeof originalLoginRequired === 'boolean'
        ? originalLoginRequired
        : null;

      const createView = document.getElementById('view-create');
      if (createView) {
        if (normalizedId) createView.dataset.editingProjectId = normalizedId;
        else delete createView.dataset.editingProjectId;
      }

      try {
        if (normalizedId) sessionStorage.setItem(PROJECT_EDIT_SESSION_KEY, normalizedId);
        else sessionStorage.removeItem(PROJECT_EDIT_SESSION_KEY);
      } catch (e) {}
    }

    function clearProjectEditContext() {
      setProjectEditContext(null);
    }

    async function openEditPostModal(targetProjId) {
      targetProjId = targetProjId || currentPostId;
      let test = targetProjId === 'my-created-test' ? myCreatedTest : null;
      if (targetProjId && window.donDwaeDataService && typeof window.donDwaeDataService.fetchProjectById === 'function') {
        try {
          const dbP = await window.donDwaeDataService.fetchProjectById(targetProjId);
          if (!dbP) {
            throw new Error('수정할 프로젝트를 불러오지 못했습니다.');
          }

          const { data: { session } } = await window.donDwaeDataService.supabase.auth.getSession();
          if (!session?.user || dbP.creator_id !== session.user.id) {
            throw new Error('본인이 등록한 프로젝트만 수정할 수 있습니다.');
          }

          test = {
              id: dbP.id,
              title: dbP.title,
              serviceName: dbP.service_name || dbP.title,
              serviceDesc: dbP.service_desc,
              thumbnailUrl: dbP.thumbnail_url,
              testType: dbP.category,
              mainCategory: dbP.category,
              platform: dbP.platform || 'web',
              isAbTest: dbP.is_ab_test || false,
              testNotice: dbP.test_notice || '',
              serviceUrl: dbP.service_url || '',
              abUrlA: dbP.ab_url_a || '',
              abUrlB: dbP.ab_url_b || '',
              playstoreUrl: dbP.app_playstore_url || '',
              appstoreUrl: dbP.app_appstore_url || '',
              externalSurveyUrl: dbP.external_survey_url || '',
              loginRequired: dbP.login_required || false,
              testAccountId: dbP.test_account_id || '',
              testAccountPassword: dbP.test_account_pw || '',
              privacyItems: dbP.privacy_items || '',
              testGuide: dbP.test_guide || '',
              reviewsPublic: dbP.is_reviews_public !== false,
              startDate: dbP.start_date,
              endDate: dbP.end_date,
              targetCount: dbP.target_count || 10,
              currentRecruits: dbP.current_count || 0,
              rewardCoin: dbP.reward_coin ?? 500,
              techTags: (dbP.tech_tags && Array.isArray(dbP.tech_tags)) ? dbP.tech_tags : [],
              personaTags: (dbP.target_persona_tags && Array.isArray(dbP.target_persona_tags)) ? dbP.target_persona_tags : [],
              questions: typeof dbP.questions === 'string' ? JSON.parse(dbP.questions) : (dbP.questions || []),
              quizzes: typeof dbP.quizzes === 'string' ? JSON.parse(dbP.quizzes) : (dbP.quizzes || []),
              verification_method: dbP.verification_method || (
                Array.isArray(dbP.quizzes) && dbP.quizzes.length > 0 ? 'quiz' : 'none'
              )
          };
          myCreatedTest = test;
        } catch (e) {
          clearProjectEditContext();
          console.warn('[openEditPostModal] DB fetch notice:', e);
          showGenericToast(e?.message || '수정할 프로젝트를 불러오지 못했습니다.', '⚠️');
          return false;
        }
      }

      if (!test || !test.id || test.id === 'my-created-test') {
        clearProjectEditContext();
        showGenericToast('수정할 프로젝트의 DB 식별자를 찾지 못했습니다.', '⚠️');
        return false;
      }
      setProjectEditContext(test.id, !!test.loginRequired);
      populateProjectEditor(test);

      navigateTo('create', { preserveProjectEdit: true });
      goToStep(1);
      return true;
    }
