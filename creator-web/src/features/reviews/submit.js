    async function submitFeedbackForm() {
      const projectId = currentParticipatingPostId || currentPostId || '';
      const submitButton = document.getElementById('btn-submit-feedback');
      if (!isDatabaseProjectId(projectId)) {
        showGenericToast('실제 DB 프로젝트에서 참여한 뒤 피드백을 제출해 주세요.', '⚠️');
        return;
      }

      const modalBody = document.getElementById('fb-modal-dynamic-body');
      // 문항별 답변은 "질문 → 답변" 형태로 구조화해 담고,
      // 문항에 속하지 않은 총평 textarea 만 review_text 로 남긴다.
      const questionAnswers = {};
      modalBody?.querySelectorAll('[data-feedback-question]').forEach(field => {
        const question = (field.dataset.feedbackQuestion || '').trim();
        if (!question) return;

        if (field.tagName === 'TEXTAREA') {
          const essay = field.value.trim();
          if (essay) questionAnswers[question] = essay;
          return;
        }
        if (!field.checked) return;

        const previous = questionAnswers[question];
        if (previous === undefined) questionAnswers[question] = field.value;
        else if (Array.isArray(previous)) previous.push(field.value);
        else questionAnswers[question] = [previous, field.value];
      });

      const textareas = [...(modalBody?.querySelectorAll('textarea') || [])]
        .filter(field => !field.hasAttribute('data-feedback-question'));
      const reviewText = textareas.map(input => input.value.trim()).filter(Boolean).join('\n\n');

      // ----------------------------------------------------
      // 참여 검증 수단 유효성 검사 (퀴즈 / 스크린샷)
      // ----------------------------------------------------
      const quizInputs = [...(modalBody?.querySelectorAll('.fb-quiz-answer-input') || [])];
      const isQuizVerificationActive = currentFeedbackVerificationMethod === 'quiz'
        || (Array.isArray(currentFeedbackProjectQuizzes) && currentFeedbackProjectQuizzes.length > 0)
        || quizInputs.length > 0;

      const quizAnswers = {};

      if (isQuizVerificationActive) {
        if (quizInputs.length === 0 && Array.isArray(currentFeedbackProjectQuizzes) && currentFeedbackProjectQuizzes.length > 0) {
          showGenericToast('[PART-004] 참여 검증 퀴즈를 불러오지 못했습니다. 페이지 새로고침 후 다시 시도해 주세요.', '⚠️');
          return;
        }

        for (let i = 0; i < quizInputs.length; i++) {
          const input = quizInputs[i];
          const val = input.value.trim();
          const qName = input.dataset.quizQuestion || `검증 퀴즈 ${i + 1}번`;

          // 1. 필수 답변 미입력 시 제출 및 코인 지급 차단
          if (!val) {
            showGenericToast(`[PART-004] ${qName} 답변을 입력해 주세요. (필수)`, '⚠️');
            input.classList.add('border-red-500', 'ring-2', 'ring-red-200');
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }

          input.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
          const quizIndex = Number(input.dataset.quizIndex);
          const quizKey = Number.isInteger(quizIndex) ? `quiz_${quizIndex + 1}` : `quiz_${i + 1}`;
          quizAnswers[quizKey] = val;
        }

        // 객관식 퀴즈 문항이 포함된 경우 선택 및 정답 검증
        const quizRadioNames = [...new Set([...(modalBody?.querySelectorAll('input[type="radio"][name^="fb-product-quiz-"]') || [])].map(r => r.name))];
        for (const radioName of quizRadioNames) {
          const checkedRadio = modalBody?.querySelector(`input[name="${radioName}"]:checked`);
          if (!checkedRadio) {
            showGenericToast('[PART-004] 객관식 검증 퀴즈 항목을 선택해 주세요.', '⚠️');
            return;
          }
          const quizIndex = Number(checkedRadio.dataset.quizIndex);
          const quizKey = Number.isInteger(quizIndex) ? `quiz_${quizIndex + 1}` : radioName;
          quizAnswers[quizKey] = checkedRadio.value;
        }
      } else {
        quizInputs.forEach((input, index) => {
          if (input.value.trim()) quizAnswers[`quiz_${index + 1}`] = input.value.trim();
        });
      }

      if (currentFeedbackVerificationMethod === 'screenshot' && !feedbackScreenshotDataUrl) {
        showGenericToast('[PART-008] 참여 확인용 스크린샷을 첨부해 주세요.', '⚠️');
        document.querySelector('label[for="fb-screenshot-input"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '피드백 저장 및 리워드 지급 중...';
      }

      const submittedAnswers = {
        review_text: reviewText,
        ...(Object.keys(questionAnswers).length > 0 ? { question_answers: questionAnswers } : {}),
        ...(internalMissionAnswers?.projectId === String(projectId) ? internalMissionAnswers.data : {})
      };

      try {
        const result = await window.donDwaeDataService.submitProjectReview({
          projectId,
          rating: selectedFeedbackStarCount || 5,
          reuseIntention: true,
          answers: submittedAnswers,
          quizAnswers,
          isQuizPassed: true,
          screenshotUrl: currentFeedbackVerificationMethod === 'screenshot' ? feedbackScreenshotDataUrl : null
        });
        const reward = Number(result?.reward_amount || 0);
        const walletTotal = Number(result?.wallet_total || 0);

        internalMissionAnswers = null;
        selectedInternalVoteOption = null;
        clearInternalMissionDraft(projectId);

        const completedAt = new Date().toISOString();
        userParticipatedTests[projectId] = {
          completedAt,
          reviewId: result?.review_id
        };
        const participatedProjects = window.myProjectCollections?.participated || [];
        const savedParticipation = participatedProjects
          .find(project => String(project.id || '') === String(projectId));
        if (savedParticipation) {
          savedParticipation.participation_status = 'submitted';
          savedParticipation.participation_completed_at = completedAt;
        } else {
          const completedProject = window.currentDetailProject
            || (window.liveExploreProjects || [])
              .find(project => String(project.id || '') === String(projectId));
          if (completedProject) {
            participatedProjects.push({
              ...completedProject,
              participation_status: 'submitted',
              participation_completed_at: completedAt
            });
            window.myProjectCollections.participated = participatedProjects;
          }
        }
        refreshFeedPersonalState(projectId);
        updatePendingReviewBadge();
        if (String(currentPostId || '') === String(projectId)) {
          setDetailParticipationCta('completed', projectId, reward);
        }
        window.userHasPassedGating = !!result?.has_passed_gating;
        window.completedTestCountFromDB = Number(result?.completed_test_count || 0);
        window.setUserCoinBalance(walletTotal);
        updatePledgeModalUI();

        renderSubmittedFeedback(result, reward, reviewText);

      closeFeedbackWriteModal();
        if (typeof closeTestParticipateModal === 'function') {
          closeTestParticipateModal();
        }

        // Add to inMemoryReviews so detail view reflects it immediately
        window.inMemoryReviews = window.inMemoryReviews || {};
        window.inMemoryReviews[projectId] = window.inMemoryReviews[projectId] || [];
        const authorNick = document.getElementById('mypage-user-nickname')?.textContent || '나';
        window.inMemoryReviews[projectId].unshift({
          id: result?.review_id || ('local-' + Date.now()),
          project_id: projectId,
          rating: selectedFeedbackStarCount || 5,
          answers: submittedAnswers,
          content: reviewText,
          feedback_text: reviewText,
          created_at: new Date().toISOString(),
          users: { nickname: authorNick }
        });

        // Determine if this project belongs to current logged-in user
        let isMyProject = false;
        try {
          const { data: { session } } = await window.donDwaeDataService.supabase.auth.getSession();
          const activeUserId = session?.user?.id;
          const currentProj = window.currentDetailProject;
          isMyProject = (window.myProjectCollections?.registered || []).some(p => String(p.id) === String(projectId))
            || (currentProj && String(currentProj.creator_id) === String(activeUserId))
            || projectId === 'my-created-test';
        } catch (e) {
          isMyProject = false;
        }

        if (isMyProject) {
          // 내 프로젝트에 누군가가 리뷰를 남긴 경우 -> 바로 그 유저에게 '테스트가 성공적으로 종료되었습니다!' 모달창 띄움
          showGoalAchievedModal(window.currentDetailProject || myCreatedTest);
        } else {
          // 다른 사람의 프로젝트에 피드백을 남긴 경우 -> 포인트 받고 홈화면(explore)으로 이동, 모달창 띄우지 않음!
          const countNotice = result.completed_test_count >= 3
            ? ` 등록 자격을 충족했습니다. (총 ${result.completed_test_count}회)`
            : ` (등록 조건 ${result.completed_test_count}/3회)`;
          showGenericToast(`🎉 피드백 저장 완료! +${reward.toLocaleString()} 돼지코인이 지급되었습니다.${countNotice}`, '🪙');

          // 3회를 처음 채운 사람에게만 서버가 환영 보너스를 지급한다.
          const welcomeBonus = Number(result.welcome_bonus_amount || 0);
          if (welcomeBonus > 0) {
            setTimeout(() => {
              showGenericToast(`🎊 환영 이벤트! 초반 가입 보너스(3회 게이팅 완료)로 +${welcomeBonus.toLocaleString()} 돼지코인을 추가로 받았습니다.`, '🎁');
              openWelcomeBonusModal(welcomeBonus);
            }, 800);
          }
          navigateTo('explore');
        }
      } catch (err) {
        console.error('[Don Dwae DB] Transactional review failed:', err);
        showGenericToast(resolveFriendlyError(err, 'PART_SUBMISSION_FAILED').formatted, '⚠️');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = getFeedbackSubmitMarkup();
        }
      }
    }
