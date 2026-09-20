    function isValidCreateStepUrl(value) {
      const rawValue = String(value || '').trim();
      if (!rawValue) return false;
      try {
        const parsedUrl = new URL(/^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`);
        return ['http:', 'https:'].includes(parsedUrl.protocol) && Boolean(parsedUrl.hostname);
      } catch (error) {
        return false;
      }
    }

    function showCreateStepValidationError(stepNum, element, message) {
      if (currentCreateStep !== stepNum) goToStep(stepNum);
      showGenericToast(message, '⚠️');
      if (!element) return false;

      element.setAttribute('aria-invalid', 'true');
      element.classList.add('border-red-400', 'ring-2', 'ring-red-200');
      const clearError = () => {
        element.removeAttribute('aria-invalid');
        element.classList.remove('border-red-400', 'ring-2', 'ring-red-200');
      };
      element.addEventListener('input', clearError, { once: true });
      element.addEventListener('change', clearError, { once: true });
      window.setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof element.focus === 'function') element.focus({ preventScroll: true });
      }, 0);
      return false;
    }

    function validateCreateStep(stepNum) {
      if (stepNum === 1) {
        if (['product', 'prototype'].includes(currentMainCategory)) {
          const platform = document.querySelector('input[name="productSubPlatform"]:checked')?.value || 'web';
          if (platform === 'web') {
            if (isProductAbMode) {
              const abUrlAInput = document.getElementById('input-product-ab-web-a');
              const abUrlBInput = document.getElementById('input-product-ab-web-b');
              if (!isValidCreateStepUrl(abUrlAInput?.value)) {
                return showCreateStepValidationError(1, abUrlAInput, 'A안 사이트 URL을 올바르게 입력해 주세요.');
              }
              if (!isValidCreateStepUrl(abUrlBInput?.value)) {
                return showCreateStepValidationError(1, abUrlBInput, 'B안 사이트 URL을 올바르게 입력해 주세요.');
              }
            } else {
              const serviceUrlInput = document.getElementById('input-product-web-url');
              if (!isValidCreateStepUrl(serviceUrlInput?.value)) {
                return showCreateStepValidationError(1, serviceUrlInput, '웹사이트 접속 URL을 올바르게 입력해 주세요.');
              }
            }
          } else if (isProductAbMode) {
            const appUrlAInput = document.getElementById('input-product-ab-app-link-a');
            const appUrlBInput = document.getElementById('input-product-ab-app-link-b');
            if (!isValidCreateStepUrl(appUrlAInput?.value)) {
              return showCreateStepValidationError(1, appUrlAInput, 'A안 앱 참여 링크를 올바르게 입력해 주세요.');
            }
            if (!isValidCreateStepUrl(appUrlBInput?.value)) {
              return showCreateStepValidationError(1, appUrlBInput, 'B안 앱 참여 링크를 올바르게 입력해 주세요.');
            }
          } else {
            const playstoreInput = document.getElementById('input-app-playstore-url');
            const appstoreInput = document.getElementById('input-app-appstore-url');
            if (!isValidCreateStepUrl(playstoreInput?.value) && !isValidCreateStepUrl(appstoreInput?.value)) {
              return showCreateStepValidationError(1, playstoreInput, '플레이스토어 또는 앱스토어 URL을 하나 이상 입력해 주세요.');
            }
          }
        }

        if (currentMainCategory === 'vote') {
          if (currentVoteInputMode === 'image') {
            const dataService = window.donDwaeDataService;
            for (const optionKey of ['A', 'B']) {
              const key = optionKey.toLowerCase();
              const input = document.getElementById(`input-vote-image-${key}`);
              const file = input?.files?.[0];
              const existingStorageUrl = dataService?.isVoteImageStorageUrl(existingVoteImageUrls[optionKey])
                ? existingVoteImageUrls[optionKey]
                : '';
              if (!file && !existingStorageUrl) {
                return showCreateStepValidationError(1, input, `${optionKey}안 이미지를 선택해 주세요.`);
              }
              if (file) {
                try {
                  dataService?.validateVoteImageFile(file);
                } catch (error) {
                  return showCreateStepValidationError(1, input, error?.message || `${optionKey}안 이미지 파일을 확인해 주세요.`);
                }
              }
            }
          } else {
            const voteUrlInputs = Array.from(document.querySelectorAll('#vote-url-list input[type="url"]'));
            const validVoteUrls = voteUrlInputs.filter(input => isValidCreateStepUrl(input.value));
            if (validVoteUrls.length < 2) {
              return showCreateStepValidationError(1, voteUrlInputs.find(input => !input.value.trim()) || voteUrlInputs[0], 'A안과 B안 URL을 모두 올바르게 입력해 주세요.');
            }
          }
          const voteQuestionInputs = Array.from(document.querySelectorAll('#vote-questions-list input[type="text"]'));
          if (!voteQuestionInputs.some(input => input.value.trim())) {
            return showCreateStepValidationError(1, voteQuestionInputs[0], '투표 질문을 하나 이상 입력해 주세요.');
          }
        }

        const loginRequired = document.querySelector('input[name="loginRequirementMode"]:checked')?.value === 'required';
        if (loginRequired) {
          const loginIdInput = document.getElementById('input-test-login-id');
          const loginPasswordInput = document.getElementById('input-test-login-pw');
          const privacyInput = document.getElementById('input-privacy-items');
          const hasLoginId = Boolean(loginIdInput?.value.trim());
          const hasLoginPassword = Boolean(loginPasswordInput?.value.trim());
          if (hasLoginId !== hasLoginPassword) {
            return showCreateStepValidationError(1, hasLoginId ? loginPasswordInput : loginIdInput, '테스트 계정 ID와 비밀번호를 모두 입력하거나 모두 비워 주세요.');
          }
          if (!privacyInput?.value.trim()) {
            return showCreateStepValidationError(1, privacyInput, '취급·수집되는 개인정보 항목을 입력해 주세요.');
          }
        }

        const guideInput = document.getElementById('input-test-guide');
        if (!guideInput?.value.trim()) {
          return showCreateStepValidationError(1, guideInput, '테스트 진행 방법을 입력해 주세요.');
        }

        const missionFormat = document.querySelector('input[name="missionFormatMode"]:checked')?.value || 'direct';
        if (missionFormat === 'link') {
          const surveyUrlInput = document.getElementById('input-external-survey-url');
          if (!isValidCreateStepUrl(surveyUrlInput?.value)) {
            return showCreateStepValidationError(1, surveyUrlInput, '외부 설문 URL을 올바르게 입력해 주세요.');
          }
        } else {
          // 검증 항목은 선택 사항이다. 아무것도 추가하지 않으면 그대로 통과한다.
          // 다만 쓰다 만 문항은 그대로 저장되면 테스터에게 빈 질문으로 보이므로 막는다.
          const questionItems = Array.from(document.querySelectorAll('#questions-list .question-item'))
            .filter(questionItem => {
              const title = questionItem.querySelector('.question-title-input')?.value.trim();
              const filledChoices = Array.from(questionItem.querySelectorAll('.option-title-input'))
                .filter(input => input.value.trim());
              return Boolean(title) || filledChoices.length > 0;
            });
          for (const questionItem of questionItems) {
            const titleInput = questionItem.querySelector('.question-title-input');
            if (!titleInput?.value.trim()) {
              return showCreateStepValidationError(1, titleInput || questionItem, '검증 문항의 질문 내용을 입력해 주세요.');
            }
            const questionType = questionItem.querySelector('.question-type-select')?.value || 'single';
            if (questionType !== 'essay') {
              const optionInputs = Array.from(questionItem.querySelectorAll('.option-title-input'));
              if (optionInputs.filter(input => input.value.trim()).length < 2) {
                return showCreateStepValidationError(1, optionInputs.find(input => !input.value.trim()) || questionItem, '객관식 문항의 선택지를 2개 이상 입력해 주세요.');
              }
            }
          }
        }

        if (currentVerificationMethod === 'quiz') {
          const quizItems = Array.from(document.querySelectorAll('#quiz-questions-list .quiz-item'));
          if (quizItems.length === 0) {
            return showCreateStepValidationError(1, document.getElementById('quiz-questions-list'), '검증 퀴즈를 하나 이상 추가해 주세요.');
          }
          for (const quizItem of quizItems) {
            const questionInput = quizItem.querySelector('.quiz-question-input');
            const answerInput = quizItem.querySelector('.quiz-answer-input');
            if (!questionInput?.value.trim()) {
              return showCreateStepValidationError(1, questionInput || quizItem, '검증 퀴즈 질문을 입력해 주세요.');
            }
            if (!answerInput?.value.trim()) {
              return showCreateStepValidationError(1, answerInput || quizItem, '검증 퀴즈 정답을 입력해 주세요.');
            }
          }
        }
        return true;
      }

      if (stepNum === 2) {
        const requiredFields = [
          ['input-test-title', '테스트 제목을 입력해 주세요.'],
          ['input-service-name', '서비스명을 입력해 주세요.'],
          ['input-service-desc', '서비스 소개를 입력해 주세요.'],
          ['input-test-notice', '안내 내용과 테스트 목적을 입력해 주세요.']
        ];
        for (const [fieldId, message] of requiredFields) {
          const field = document.getElementById(fieldId);
          if (!field?.value.trim()) return showCreateStepValidationError(2, field, message);
        }
        return true;
      }

      if (stepNum === 3) {
        const startDateInput = document.getElementById('input-start-date');
        const endDateInput = document.getElementById('input-end-date');
        const durationSelect = document.getElementById('select-test-duration');
        const targetCountInput = document.getElementById('input-target-count');
        const rewardInput = document.getElementById('input-reward-coin');
        if (!startDateInput?.value) return showCreateStepValidationError(3, startDateInput, '모집 시작일을 선택해 주세요.');
        const startDateLimit = startDateInput.min || getTodayDateValue();
        if (startDateInput.value < startDateLimit) {
          return showCreateStepValidationError(3, startDateInput, '모집 시작일은 오늘 이전 날짜로 지정할 수 없습니다.');
        }
        if (!endDateInput?.value) return showCreateStepValidationError(3, endDateInput, '모집 종료일을 선택해 주세요.');
        if (endDateInput.value < startDateInput.value) {
          return showCreateStepValidationError(3, endDateInput, '모집 종료일은 시작일보다 빠를 수 없습니다.');
        }
        if (!durationSelect?.value) return showCreateStepValidationError(3, durationSelect, '예상 소요 시간을 선택해 주세요.');
        const minimumTarget = Number(targetCountInput?.min || 1);
        const targetCount = Number(targetCountInput?.value);
        if (!targetCountInput?.value || !Number.isInteger(targetCount) || targetCount < minimumTarget) {
          return showCreateStepValidationError(3, targetCountInput, `모집인원은 ${minimumTarget}명 이상 입력해 주세요.`);
        }
        const minimumReward = Number(rewardInput?.min || 0);
        const rewardCoin = Number(rewardInput?.value);
        if (!rewardInput?.value || !Number.isInteger(rewardCoin) || rewardCoin < minimumReward) {
          return showCreateStepValidationError(3, rewardInput, `1인당 보상은 ${minimumReward}돼지코인 이상 입력해 주세요.`);
        }
        return true;
      }

      return true;
    }
