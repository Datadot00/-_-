    function normalizeMyProjectStatus(status) {
      return status === 'completed' ? 'completed' : 'active';
    }

    function isParticipationCompleted(project) {
      return Boolean(project?.participation_completed_at)
        || ['submitted', 'approved', 'rejected'].includes(project?.participation_status);
    }

    function getProjectPersonalState(project) {
      if (!project) return '';
      const projectId = String(project.id || '');
      const activeUserId = String(window.currentFeedUserId || '');
      const isOwned = Boolean(projectId) && (
        (activeUserId && String(project.creator_id || '') === activeUserId)
        || (window.myProjectCollections?.registered || [])
          .some(item => String(item.id || '') === projectId)
      );
      if (isOwned) return 'owned';

      const participation = (window.myProjectCollections?.participated || [])
        .find(item => String(item.id || '') === projectId);
      if (!participation) return '';
      return isParticipationCompleted(participation) ? 'completed' : 'review-needed';
    }

    function isDatabaseProjectId(projectId) {
      return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId || '');
    }

    function normalizePublicServiceUrl(value) {
      const rawValue = typeof value === 'string' ? value.trim() : '';
      if (!rawValue) return '';
      const normalizedValue = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;
      try {
        const parsedUrl = new URL(normalizedValue);
        return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.toString() : '';
      } catch {
        return '';
      }
    }

    function getCurrentParticipationProject(projectId = currentPostId) {
      const normalizedId = String(projectId || '');
      const detailProject = window.currentDetailProject;
      if (detailProject && String(detailProject.id || '') === normalizedId) return detailProject;

      const postData = window.currentPostData;
      if (postData && String(postData.id || '') === normalizedId) return postData;

      if (['my-created-test', 'my-test'].includes(normalizedId)) return myCreatedTest;
      if (myCreatedTest && String(myCreatedTest.id || '') === normalizedId) return myCreatedTest;

      if (Array.isArray(window.liveExploreProjects)) {
        const found = window.liveExploreProjects.find(p => String(p?.id || '') === normalizedId);
        if (found) return found;
      }

      if (window.myProjectCollections) {
        for (const list of Object.values(window.myProjectCollections)) {
          if (Array.isArray(list)) {
            const found = list.find(p => String(p?.id || '') === normalizedId);
            if (found) return found;
          }
        }
      }

      return null;
    }

    function getProjectPublicUrl(projectId = currentPostId) {
      const normalizedId = String(projectId || '');
      const project = getCurrentParticipationProject(normalizedId);
      if (project) {
        // 투표 시안은 앱 내부 A/B 화면에서 함께 비교해야 하므로 A안 이미지를
        // 외부 서비스 URL처럼 단독 노출하지 않는다.
        if (project.category === 'vote') return '';
        const isApp = project.platform === 'app';
        const rawUrl = isApp
          ? (project.app_playstore_url || project.app_appstore_url || project.service_url || project.serviceUrl)
          : (project.service_url || project.serviceUrl);
        const typeSpecificUrl = project.typeSpecificData?.url || '';
        return normalizePublicServiceUrl(rawUrl || typeSpecificUrl);
      }

      const fallbackUrls = {
        moneylog: 'https://try-money-pig.io',
        diary: 'https://ai-diary-app.vercel.app',
        '00000000-0000-0000-0000-000000000001': 'https://bangcheck.example.com'
      };
      return normalizePublicServiceUrl(fallbackUrls[normalizedId] || '');
    }

    function getProjectMissionUrl(projectId = currentPostId) {
      const normalizedId = String(projectId || '');
      const project = getCurrentParticipationProject(normalizedId);
      if (project) {
        const rawUrl = project.platform === 'app'
          ? (project.app_playstore_url || project.app_appstore_url || project.service_url || project.serviceUrl)
          : project.category === 'survey' || project.external_survey_url || project.externalSurveyUrl
            ? (project.external_survey_url || project.externalSurveyUrl || project.service_url || project.serviceUrl)
            : project.category === 'abtest' || project.is_ab_test
              ? (project.ab_url_a || project.abUrlA || project.service_url || project.serviceUrl)
              : (project.service_url || project.serviceUrl);
        return normalizePublicServiceUrl(rawUrl);
      }

      const fallbackMissionUrls = {
        moneylog: 'https://try-money-pig.io',
        survey: 'https://forms.google.com',
        '00000000-0000-0000-0000-000000000001': 'https://bangcheck.example.com',
        '00000000-0000-0000-0000-000000000003': 'https://forms.google.com'
      };
      return normalizePublicServiceUrl(fallbackMissionUrls[normalizedId] || '');
    }

    function isInternalMissionProject(projectId = currentPostId) {
      const normalizedId = String(projectId || '');
      const project = getCurrentParticipationProject(normalizedId);
      if (project) {
        return project.category === 'vote'
          || project.category === 'abtest'
          || project.is_ab_test === true
          || project.isAbTest === true
          || project.testMethod === 'internal'
          || !getProjectMissionUrl(normalizedId);
      }
      return ['prototype', 'diary', 'saas'].includes(normalizedId);
    }

    function resolveMissionServiceName(projectId = currentPostId, explicitName = '') {
      const trimmedName = String(explicitName || '').trim();
      if (trimmedName) return trimmedName;

      const project = getCurrentParticipationProject(projectId);
      const fromProject = String(
        project?.service_name || project?.serviceName || project?.title || ''
      ).trim();
      if (fromProject) return fromProject;

      // 데모 게시글은 개요 탭에 이미 채워진 "서비스명: OOO" 값을 그대로 쓴다.
      const overviewName = document.getElementById('post-service-name-text')?.textContent || '';
      return overviewName.replace(/^\s*서비스명\s*:\s*/, '').trim();
    }

    function openPublicServiceUrl(projectId) {
      const targetId = typeof projectId === 'string' && projectId ? projectId : currentPostId;
      const publicUrl = getProjectPublicUrl(targetId);
      if (!publicUrl) {
        showGenericToast('등록된 서비스 공개 URL이 없습니다.', 'ℹ️');
        return;
      }
      window.open(publicUrl, '_blank', 'noopener,noreferrer');
    }
