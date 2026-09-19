    function parseReviewAnswers(rawAnswers) {
      let answers = rawAnswers;
      if (typeof answers === 'string') {
        try { answers = JSON.parse(answers); } catch { return { text: String(rawAnswers).trim(), items: [] }; }
      }
      if (!answers || typeof answers !== 'object') return { text: '', items: [] };

      const text = String(answers.review_text || answers.text || '').trim();
      const items = [];

      const questionAnswers = answers.question_answers;
      if (questionAnswers && typeof questionAnswers === 'object') {
        for (const [question, answer] of Object.entries(questionAnswers)) {
          const values = Array.isArray(answer) ? answer.filter(Boolean) : [answer];
          const joined = values.map(value => String(value).trim()).filter(Boolean);
          if (joined.length > 0) items.push({ question, values: joined });
        }
      }
      if (answers.selected_option) {
        items.push({ question: '선택한 시안', values: [`${answers.selected_option}안`] });
      }
      if (answers.vote_reason) {
        items.push({ question: '선택 이유', values: [String(answers.vote_reason).trim()] });
      }
      return { text, items };
    }

    function buildReviewAnswerSummary(reviews) {
      const byQuestion = new Map();
      reviews.forEach(review => {
        parseReviewAnswers(review.answers).items.forEach(({ question, values }) => {
          if (!byQuestion.has(question)) byQuestion.set(question, { counts: new Map(), responses: 0 });
          const entry = byQuestion.get(question);
          entry.responses += 1;
          values.forEach(value => entry.counts.set(value, (entry.counts.get(value) || 0) + 1));
        });
      });

      // 값 종류가 응답 수만큼 제각각이면 서술형이므로 분포로 보여줄 의미가 없다.
      return [...byQuestion.entries()]
        .map(([question, entry]) => ({
          question,
          responses: entry.responses,
          options: [...entry.counts.entries()].sort((a, b) => b[1] - a[1])
        }))
        .filter(item => item.responses >= 2 && item.options.length > 0 && item.options.length < item.responses);
    }

    function closeFeedbackWriteModal() {
      const modal = document.getElementById('write-feedback-modal');
      if (modal) modal.classList.add('hidden');
    }

    window.closeFeedbackWriteModal = closeFeedbackWriteModal;

    function deferFeedbackReview() {
      closeFeedbackWriteModal();
      updatePendingReviewBadge();
      showGenericToast('내 프로젝트 > 참여 프로젝트 관리에서 리뷰를 이어서 작성할 수 있어요.', '✍️');
      if (currentViewKey === 'vote-progress') navigateTo('post');
    }

    function returnToInternalVoteFromFeedback() {
      const pId = currentParticipatingPostId || currentPostId || '';
      const project = currentFeedbackProject || getCurrentParticipationProject(pId);
      if (!project) {
        showGenericToast('시안 정보를 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', '⚠️');
        return;
      }
      closeFeedbackWriteModal();
      renderInternalMissionFlow(project, project.reward_coin ?? project.rewardCoin ?? 0);
      navigateTo('vote-progress');
    }

    function clearFeedbackScreenshot() {
      feedbackScreenshotDataUrl = null;
      const input = document.getElementById('fb-screenshot-input');
      const preview = document.getElementById('fb-screenshot-preview');
      const thumb = document.getElementById('fb-screenshot-thumb');
      const name = document.getElementById('fb-screenshot-name');
      if (input) input.value = '';
      if (preview) preview.classList.add('hidden');
      if (thumb) thumb.removeAttribute('src');
      if (name) name.textContent = '';
    }

    function handleFeedbackScreenshotSelected(input) {
      const file = input?.files?.[0];
      if (!file) {
        clearFeedbackScreenshot();
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
        clearFeedbackScreenshot();
        showGenericToast('PNG, JPG, GIF, WEBP 이미지만 첨부할 수 있습니다.', '⚠️');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        clearFeedbackScreenshot();
        showGenericToast('스크린샷은 2MB 이하로 첨부해 주세요.', '⚠️');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        feedbackScreenshotDataUrl = typeof reader.result === 'string' ? reader.result : null;
        const preview = document.getElementById('fb-screenshot-preview');
        const thumb = document.getElementById('fb-screenshot-thumb');
        const name = document.getElementById('fb-screenshot-name');
        if (thumb && feedbackScreenshotDataUrl) thumb.src = feedbackScreenshotDataUrl;
        if (name) name.textContent = file.name;
        if (preview) preview.classList.remove('hidden');
      };
      reader.onerror = () => {
        clearFeedbackScreenshot();
        showGenericToast('스크린샷을 불러오지 못했습니다.', '⚠️');
      };
      reader.readAsDataURL(file);
    }

    function setFeedbackStar(count) {
      selectedFeedbackStarCount = count;
      const box = document.getElementById('star-rating-box');
      const valText = document.getElementById('star-rating-val');
      if (!box) return;

      const stars = box.querySelectorAll('span');
      stars.forEach((star, idx) => {
        if (idx < 5) {
          star.className = idx < count ? 'text-amber-400' : 'text-neutral-300';
        }
      });
      if (valText) valText.textContent = `${count}.0 / 5.0`;
    }
