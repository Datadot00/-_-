    function resumeProjectReview(projectId) {
      if (!projectId) return;
      currentPostId = projectId;
      openFeedbackWriteModal(projectId);
    }

    window.resumeProjectReview = resumeProjectReview;

    function closeTestParticipateModal() {
      const modal = document.getElementById('test-participate-modal');
      if (modal) modal.classList.add('hidden');
    }

    function deferParticipationReview() {
      closeTestParticipateModal();
      updatePendingReviewBadge();
      showGenericToast('내 프로젝트 > 참여 프로젝트 관리에서 리뷰를 이어서 작성할 수 있어요.', '✍️');
    }

    async function ensureDatabaseParticipation(projectId) {
      if (!isDatabaseProjectId(projectId)) return null;
      const ds = window.donDwaeDataService;
      if (!ds?.supabase) throw new Error('Supabase 데이터 연결을 확인해 주세요.');
      const { data: { session }, error } = await ds.supabase.auth.getSession();
      if (error || !session?.user) throw new Error('로그인 후 테스트에 참여할 수 있습니다.');
      const existing = await ds.checkUserParticipation(projectId, session.user.id);
      return existing || ds.applyParticipation(projectId);
    }

    function cancelInternalTestFlow() {
      const pId = currentParticipatingPostId || currentPostId || '';
      const collected = collectInternalMissionAnswers();
      internalMissionAnswers = collected ? { projectId: String(pId), data: collected } : null;
      if (collected) saveInternalMissionDraft(pId, collected);
      else clearInternalMissionDraft(pId);
      navigateTo('post');
    }

    function parseProjectQuestions(project) {
      let parsed = project?.questions;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) return [];

      return parsed.map(question => {
        if (typeof question === 'string') {
          return { title: question.trim(), type: 'essay', choices: [] };
        }
        const title = String(question?.title || question?.question || '').trim();
        const choices = Array.isArray(question?.choices)
          ? question.choices.map(choice => String(choice).trim()).filter(Boolean)
          : [];
        const type = question?.type || (choices.length > 0 ? 'single' : 'essay');
        return { title, type, choices };
      }).filter(question => question.title);
    }

    function getInternalVoteOptions(project) {
      const transientOptions = Array.isArray(project?.typeSpecificData?.content)
        ? project.typeSpecificData.content.map(value => String(value || '').trim()).filter(Boolean).slice(0, 4)
        : [];
      const persistedOptions = [
        project?.ab_url_a || project?.abUrlA,
        project?.ab_url_b || project?.abUrlB
      ].map(value => String(value || '').trim());
      const rawOptions = transientOptions.length >= 2 ? transientOptions : persistedOptions;
      const optionValues = rawOptions.some(Boolean)
        ? rawOptions.map((value, index) => value || `${String.fromCharCode(65 + index)}안`)
        : ['A안', 'B안'];

      return optionValues.map((value, index) => {
        const key = String.fromCharCode(65 + index);
        const rawValue = String(value || '').trim();
        return {
          key,
          label: rawValue || `${key}안`,
          isUrl: /^https?:\/\//i.test(rawValue),
          isImage: /^data:image\//i.test(rawValue)
            || /^https?:\/\/[^?#]+\.(?:avif|gif|jpe?g|png|webp|svg)(?:[?#].*)?$/i.test(rawValue)
        };
      });
    }

    function restoreInternalMissionDraftToForm(rawData) {
      const data = normalizeInternalMissionDraftData(rawData);
      const dynamicContent = document.getElementById('part-internal-dynamic-content');
      if (!data || !dynamicContent) return;

      if (data.selected_option) selectInternalVoteOption(data.selected_option);
      const reasonInput = dynamicContent.querySelector('[data-internal-vote-reason]');
      if (reasonInput && data.vote_reason) reasonInput.value = data.vote_reason;

      const questionAnswers = data.question_answers || {};
      dynamicContent.querySelectorAll('[data-internal-question]').forEach((questionEl) => {
        const answer = questionAnswers[questionEl.dataset.questionTitle || ''];
        if (answer === undefined) return;
        const answerValues = (Array.isArray(answer) ? answer : [answer]).map(value => String(value));
        const textarea = questionEl.querySelector('textarea[data-internal-answer]');
        if (textarea) textarea.value = answerValues[0] || '';
        questionEl.querySelectorAll('input[data-internal-answer]').forEach((input) => {
          input.checked = answerValues.includes(input.value);
        });
      });
    }

    function collectInternalMissionAnswers() {
      const dynamicContent = document.getElementById('part-internal-dynamic-content');
      if (!dynamicContent) return null;

      const questionAnswers = {};
      dynamicContent.querySelectorAll('[data-internal-question]').forEach((questionEl, index) => {
        const questionTitle = questionEl.dataset.questionTitle || `Q${index + 1}`;
        const checkedValues = [...questionEl.querySelectorAll('input[data-internal-answer]:checked')]
          .map(input => input.value);
        const essayValue = questionEl.querySelector('textarea[data-internal-answer]')?.value.trim() || '';

        if (checkedValues.length === 1) {
          questionAnswers[questionTitle] = checkedValues[0];
        } else if (checkedValues.length > 1) {
          questionAnswers[questionTitle] = checkedValues;
        } else if (essayValue) {
          questionAnswers[questionTitle] = essayValue;
        }
      });

      const voteReason = dynamicContent.querySelector('[data-internal-vote-reason]')?.value.trim() || '';
      const collected = {};
      if (selectedInternalVoteOption) collected.selected_option = selectedInternalVoteOption;
      if (voteReason) collected.vote_reason = voteReason;
      if (Object.keys(questionAnswers).length > 0) collected.question_answers = questionAnswers;
      return Object.keys(collected).length > 0 ? collected : null;
    }

    function startMissionParticipation() {
      openTestParticipateModal(currentPostId || 'moneylog');
    }

    async function openTestParticipateModal(postId) {
      if (window.donDwaeDataService && window.donDwaeDataService.supabase) {
        window.donDwaeDataService.supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (!session?.user) {
            alert('테스트에 참여하시려면 먼저 로그인해 주세요!');
            navigateTo('login');
            return;
          }
          let project = null;
          if (isDatabaseProjectId(postId)) {
            try {
              project = await window.donDwaeDataService.fetchProjectById(postId);
            } catch (error) {
              console.warn('[openTestParticipateModal] Project fetch warning:', error.message);
            }
          }
          proceedTestParticipateModal(postId, project);
        });
      } else {
        if (!window.isUserLoggedIn) {
          alert('테스트에 참여하시려면 먼저 로그인해 주세요!');
          navigateTo('login');
          return;
        }
        proceedTestParticipateModal(postId);
      }
    }

    async function confirmParticipationAndProceed() {
      const pId = currentParticipatingPostId || currentPostId || 'moneylog';
      const project = getCurrentParticipationProject(pId);
      const isInternalMission = isInternalMissionProject(pId);
      const missionUrl = getProjectMissionUrl(pId);
      const confirmButton = document.getElementById('btn-confirm-participation');
      let pendingMissionWindow = null;
      let participationRecord = null;

      // Reserve the destination tab synchronously so the browser does not block
      // it after the participation request finishes.
      if (!isInternalMission && missionUrl) {
        pendingMissionWindow = window.open('about:blank', '_blank');
        if (pendingMissionWindow) pendingMissionWindow.opener = null;
      }

      if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.textContent = '참여 등록 중...';
      }
      try {
        participationRecord = await ensureDatabaseParticipation(pId);
      } catch (err) {
        if (pendingMissionWindow && !pendingMissionWindow.closed) pendingMissionWindow.close();
        console.error('[Don Dwae DB] Transactional participation failed:', err);
        showGenericToast(err?.message || '참여 등록에 실패했습니다.', '⚠️');
        return;
      } finally {
        if (confirmButton) {
          confirmButton.disabled = false;
          confirmButton.innerHTML = getParticipationConfirmMarkup();
        }
      }

      // 1. 참여 Record 생성 및 돼지코인 처리 준비
      userParticipatedTests[pId] = true;
      const rewardVal = Number(
        project?.reward_coin
        || project?.rewardCoin
        || (pId === 'prototype' ? 350 : 600)
      );

      const participatedProjects = window.myProjectCollections?.participated || [];
      const savedParticipation = participatedProjects
        .find(item => String(item.id || '') === String(pId));
      const participationWasCompleted = isParticipationCompleted({
        participation_status: participationRecord?.status,
        participation_completed_at: participationRecord?.completed_at
      });
      if (savedParticipation && !participationWasCompleted) {
        savedParticipation.participation_status = savedParticipation.participation_status || 'applied';
        savedParticipation.participation_completed_at = null;
      } else if (project) {
        if (!savedParticipation) {
          participatedProjects.unshift({
            ...project,
            participation_status: participationRecord?.status || 'applied',
            participation_completed_at: participationRecord?.completed_at || null
          });
          window.myProjectCollections.participated = participatedProjects;
        }
      }
      updatePendingReviewBadge();
      refreshFeedPersonalState(pId);

      // Update CTA button in post detail view if open
      setDetailParticipationCta(participationWasCompleted ? 'completed' : 'review-needed', pId, rewardVal);

      // 2. 분기 처리 (외부형 vs 내부형)
      const viewInitial = document.getElementById('participate-view-initial');
      const viewExternal = document.getElementById('participate-view-external-done');

      viewInitial.classList.add('hidden');

      if (isInternalMission) {
        // 내부 투표와 직접 설문은 좁은 모달 대신 전용 진행 화면에서 수행합니다.
        closeTestParticipateModal();
        renderInternalMissionFlow(project, rewardVal);
        navigateTo('vote-progress');
      } else {
        // 참여 등록을 마친 뒤에만 실제 미션 URL을 새 탭으로 엽니다.
        if (!missionUrl) {
          if (pendingMissionWindow && !pendingMissionWindow.closed) pendingMissionWindow.close();
          showGenericToast('미션을 수행할 외부 URL이 등록되지 않았습니다.', '⚠️');
          return;
        }
        if (pendingMissionWindow && !pendingMissionWindow.closed) {
          pendingMissionWindow.location.replace(missionUrl);
        } else {
          window.open(missionUrl, '_blank', 'noopener,noreferrer');
        }

        // 모달을 외부 완료 안내 뷰로 전환
        const externalRewardText = document.getElementById('part-external-reward-text');
        if (externalRewardText) externalRewardText.textContent = `${rewardVal} 돼지코인`;
        viewExternal.classList.remove('hidden');
      }
    }

    async function completeInternalTestFlow() {
      if (document.getElementById('btn-complete-internal-test')?.disabled) return;
      const moderationNotice = document.getElementById('vote-moderation-result');
      if (moderationNotice) { moderationNotice.textContent = ''; moderationNotice.classList.add('hidden'); }
      const pId = currentParticipatingPostId || currentPostId || 'prototype';
      const dynamicContent = document.getElementById('part-internal-dynamic-content');

      // 시안 선택 값 동기화 보장: 라디오나 카드가 선택되어 있으면 즉시 동기화
      if (!selectedInternalVoteOption && dynamicContent) {
        const checkedRadio = dynamicContent.querySelector('input[name="internal-ab-vote"]:checked');
        const checkedCard = dynamicContent.querySelector('[data-internal-vote-option][aria-checked="true"]');
        const detected = checkedRadio?.value || checkedCard?.dataset?.internalVoteOption || null;
        if (detected && typeof selectInternalVoteOption === 'function') {
          selectInternalVoteOption(detected);
        } else if (detected) {
          selectedInternalVoteOption = String(detected).trim().toUpperCase();
        }
      }

      if (dynamicContent?.querySelector('[data-internal-vote-option]') && !selectedInternalVoteOption) {
        showGenericToast('먼저 마음에 드는 시안을 선택해 주세요.', '🗳️');
        return;
      }
      const collected = collectInternalMissionAnswers();
      internalMissionAnswers = collected ? { projectId: String(pId), data: collected } : null;
      saveInternalMissionDraft(pId, collected);

      const isVote = Boolean(dynamicContent?.querySelector('[data-internal-vote-option]'));
      if (!isVote) {
        showGenericToast('검증을 완료했습니다. 피드백 저장이 완료되면 리워드가 지급됩니다.', '✍️');
        openFeedbackWriteModal(pId);
        return;
      }

      // 투표 화면에서는 투표 자체가 피드백이므로, 별도의 피드백 모달을 띄우지 않고 즉시 투표 완료 및 리워드 지급
      const completeBtn = document.getElementById('btn-complete-internal-test');
      if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.innerHTML = getVoteSubmitMarkupPending();
      }

      try {
        if (!isDatabaseProjectId(pId)) {
          // 데모/프로토타입 프로젝트인 경우
          const rewardVal = 350;
          userCoinBalance += rewardVal;
          userParticipatedTests[pId] = { completedAt: new Date().toISOString() };
          clearInternalMissionDraft(pId);
          internalMissionAnswers = null;
          selectedInternalVoteOption = null;

          const localCount = Object.keys(userParticipatedTests).length;
          let countNotice = localCount >= 3
            ? ` 등록 자격을 충족했습니다. (총 ${localCount}회)`
            : ` (등록 조건 ${localCount}/3회)`;
          if (localCount === 3 && !window.demoWelcomeBonusGranted) {
            window.demoWelcomeBonusGranted = true;
            userCoinBalance += 500;
            setTimeout(() => {
              showGenericToast('🎊 환영 이벤트! 초반 가입 보너스(3회 게이팅 완료)로 +500 돼지코인을 추가로 받았습니다.', '🎁');
              openWelcomeBonusModal(500);
            }, 800);
          }
          setUserCoinBalance(userCoinBalance);
          showGenericToast(`🎉 투표 완료! +${rewardVal.toLocaleString()} 돼지코인이 지급되었습니다.${countNotice}`, '🪙');
          navigateTo('explore');
          return;
        }

        // 1. 참여 상태 선제 확인 (이미 참여 레코드가 있는지 먼저 확인하여 중복 apply 호출 방지)
        let existingParticipation = null;
        try {
          const ds = window.donDwaeDataService;
          const { data: { session } } = await ds.supabase.auth.getSession();
          if (session?.user) {
            existingParticipation = await ds.checkUserParticipation(pId, session.user.id);
          }
        } catch (checkErr) {
          console.warn('[Don Dwae DB] checkUserParticipation warning:', checkErr);
        }

        // 1-1. 이미 리뷰까지 제출 완료되어 리워드를 받은 상태인 경우
        if (existingParticipation && isParticipationCompleted({
          participation_status: existingParticipation.status,
          participation_completed_at: existingParticipation.completed_at
        })) {
          showGenericToast('이미 참여 및 리워드 지급이 완료된 투표입니다.', '✓');
          clearInternalMissionDraft(pId);
          internalMissionAnswers = null;
          selectedInternalVoteOption = null;
          navigateTo('explore');
          return;
        }

        // 1-2. 아직 참여 레코드가 없는 경우에만 신규 참여 등록
        if (!existingParticipation) {
          try {
            await ensureDatabaseParticipation(pId);
          } catch (partErr) {
            const errMsg = String(partErr?.message || '');
            if (/creator[_\s]*cannot[_\s]*(?:participate|apply)|creator_cannot_apply/i.test(errMsg)) {
              showGenericToast('본인이 등록한 프로젝트는 테스트 참여 및 리워드 지급 대상이 아닙니다.', 'ℹ️');
              clearInternalMissionDraft(pId);
              internalMissionAnswers = null;
              selectedInternalVoteOption = null;
              navigateTo('explore');
              return;
            }
            if (!/already[_\s]*participat/i.test(errMsg)) {
              console.warn('[Don Dwae DB] ensureDatabaseParticipation pre-check:', partErr);
            }
          }
        }

        const voteOptionChoice = selectedInternalVoteOption || 'A';
        const submittedAnswers = {
          selected_option: voteOptionChoice,
          review_text: '내부 시안 투표 참여 완료',
          ...(collected?.question_answers ? { question_answers: collected.question_answers } : {})
        };

        let result;
        try {
          result = await window.donDwaeDataService.submitProjectReview({
            projectId: pId,
            rating: 5,
            reuseIntention: true,
            answers: submittedAnswers,
            quizAnswers: {},
            isQuizPassed: true,
            screenshotUrl: null
          });
        } catch (subErr) {
          console.error('[Don Dwae DB] submitProjectReview error:', subErr);
          const subMsg = String(subErr?.message || '');

          // 이미 리뷰가 제출 완료된 건인 경우
          if (/already[_\s]*submitted/i.test(subMsg) || (subErr?.code === '23505' && !/participation/i.test(subMsg))) {
            showGenericToast('이미 참여 및 리워드 지급이 완료된 투표입니다.', '✓');
            clearInternalMissionDraft(pId);
            internalMissionAnswers = null;
            selectedInternalVoteOption = null;
            navigateTo('explore');
            return;
          }

          if (/active participation not found/i.test(subMsg)) {
            // participation 레코드 누락 시 1회 즉시 생성 후 재시도
            await ensureDatabaseParticipation(pId);
            result = await window.donDwaeDataService.submitProjectReview({
              projectId: pId,
              rating: 5,
              reuseIntention: true,
              answers: submittedAnswers,
              quizAnswers: {},
              isQuizPassed: true,
              screenshotUrl: null
            });
          } else {
            throw subErr;
          }
        }

        const reward = Number(result?.reward_amount || 0);
        const walletTotal = Number(result?.wallet_total || 0);

        const completedAt = new Date().toISOString();
        userParticipatedTests[pId] = {
          completedAt,
          reviewId: result?.review_id
        };
        const participatedProjects = window.myProjectCollections?.participated || [];
        const savedParticipation = participatedProjects
          .find(project => String(project.id || '') === String(pId));
        if (savedParticipation) {
          savedParticipation.participation_status = 'submitted';
          savedParticipation.participation_completed_at = completedAt;
        } else {
          const completedProject = window.currentDetailProject
            || (window.liveExploreProjects || [])
              .find(project => String(project.id || '') === String(pId));
          if (completedProject) {
            participatedProjects.push({
              ...completedProject,
              participation_status: 'submitted',
              participation_completed_at: completedAt
            });
            window.myProjectCollections.participated = participatedProjects;
          }
        }
        refreshFeedPersonalState(pId);
        updatePendingReviewBadge();
        if (String(currentPostId || '') === String(pId)) {
          setDetailParticipationCta('completed', pId, reward);
        }
        window.userHasPassedGating = !!result?.has_passed_gating;
        window.completedTestCountFromDB = Number(result?.completed_test_count || 0);
        window.setUserCoinBalance(walletTotal);
        updatePledgeModalUI();

        renderSubmittedVote(result, voteOptionChoice, reward);

      window.inMemoryReviews = window.inMemoryReviews || {};
        window.inMemoryReviews[pId] = window.inMemoryReviews[pId] || [];
        const authorNick = document.getElementById('mypage-user-nickname')?.textContent || '나';
        window.inMemoryReviews[pId].unshift({
          id: result?.review_id || ('local-' + Date.now()),
          project_id: pId,
          rating: 5,
          answers: submittedAnswers,
          content: `${voteOptionChoice}안 투표 완료`,
          feedback_text: `${voteOptionChoice}안 투표 완료`,
          created_at: new Date().toISOString(),
          users: { nickname: authorNick }
        });

        const countNotice = result.completed_test_count >= 3
          ? ` 등록 자격을 충족했습니다. (총 ${result.completed_test_count}회)`
          : ` (등록 조건 ${result.completed_test_count}/3회)`;
        showGenericToast(`🎉 투표 완료! +${reward.toLocaleString()} 돼지코인이 지급되었습니다.${countNotice}`, '🪙');

        const welcomeBonus = Number(result.welcome_bonus_amount || 0);
        if (welcomeBonus > 0) {
          setTimeout(() => {
            showGenericToast(`🎊 환영 이벤트! 초반 가입 보너스(3회 게이팅 완료)로 +${welcomeBonus.toLocaleString()} 돼지코인을 추가로 받았습니다.`, '🎁');
            openWelcomeBonusModal(welcomeBonus);
          }, 800);
        }

        // 모든 상태 갱신 및 UI 반영 완료 후 초기화
        internalMissionAnswers = null;
        selectedInternalVoteOption = null;
        clearInternalMissionDraft(pId);

        navigateTo('explore');
      } catch (err) {
        const friendly = resolveFriendlyError(err, 'PART_SUBMISSION_FAILED');
        const message = err?.isReviewModerationError ? err.message : friendly.formatted;
        if (moderationNotice) {
          moderationNotice.textContent = message;
          moderationNotice.classList.remove('hidden');
          moderationNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        showGenericToast(message, '⚠️');
      } finally {
        if (completeBtn) {
          completeBtn.disabled = false;
          completeBtn.innerHTML = getVoteSubmitMarkupReady();
        }
      }
    }
