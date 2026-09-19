    function setDetailParticipationNotice(state) {
      const sidebarBadge = document.getElementById('post-sidebar-badge');
      if (!sidebarBadge) return;

      sidebarBadge.innerHTML = state === 'completed'
        ? '<span>✅</span> <span>리뷰까지 모두 제출한 테스트입니다. 서비스는 언제든 다시 둘러볼 수 있어요.</span>'
        : state === 'review-needed'
          ? '<span>✍️</span> <span>테스트 참여는 저장됐어요. 리뷰를 작성하면 리워드가 지급됩니다.</span>'
          : '<span>📢</span> <span>테스트 참여 완료 시 리워드 돼지코인이 수령됩니다.</span>';
    }

    function renderDetailLoginInfo(test) {
      if (!test) return;

      const loginInfoBox = document.getElementById('post-login-info-box');
      const loginStatusBadge = document.getElementById('post-login-status-badge');
      const loginNoneDesc = document.getElementById('post-login-none-desc');
      const loginReqContainer = document.getElementById('post-login-required-container');
      const testAccountRow = document.getElementById('post-test-account-row');
      const testAccountNoneRow = document.getElementById('post-test-account-none-row');
      const testAccountIdText = document.getElementById('post-test-account-id-text');
      const testAccountPwText = document.getElementById('post-test-account-pw-text');
      const privacyBox = document.getElementById('post-privacy-items-box');
      const privacyText = document.getElementById('post-privacy-items-text');

      if (!loginInfoBox) return;

      const isRequired = test.login_required === true || test.loginRequired === true || test.loginRequired === 'required';
      const accId = (test.test_account_id || test.testAccountId || test.loginId || '').trim();
      const accPw = (test.test_account_pw || test.testAccountPassword || test.loginPw || '').trim();
      const priv = (test.privacy_items || test.privacyItems || '').trim();

      if (isRequired) {
        if (loginStatusBadge) {
          loginStatusBadge.textContent = '🔒 로그인 필수';
          loginStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300';
        }
        if (loginNoneDesc) loginNoneDesc.classList.add('hidden');
        if (loginReqContainer) loginReqContainer.classList.remove('hidden');

        if (accId || accPw) {
          if (testAccountRow) testAccountRow.classList.remove('hidden');
          if (testAccountNoneRow) testAccountNoneRow.classList.add('hidden');
          if (testAccountIdText) testAccountIdText.textContent = accId || '(미입력)';
          if (testAccountPwText) testAccountPwText.textContent = accPw || '(미입력)';
        } else {
          if (testAccountRow) testAccountRow.classList.add('hidden');
          if (testAccountNoneRow) testAccountNoneRow.classList.remove('hidden');
        }

        if (priv) {
          if (privacyBox) privacyBox.classList.remove('hidden');
          if (privacyText) privacyText.textContent = priv;
        } else {
          if (privacyBox) privacyBox.classList.add('hidden');
        }
      } else {
        if (loginStatusBadge) {
          loginStatusBadge.textContent = '🔑 로그인 불필요 (자유 접근)';
          loginStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-extrabold bg-primary/20 text-[#2F6517] border border-primary/30';
        }
        if (loginNoneDesc) loginNoneDesc.classList.remove('hidden');
        if (loginReqContainer) loginReqContainer.classList.add('hidden');
      }
    }

    window.renderDBProjectToDetail = function(test) {
      window.currentDetailProject = test;
      const titleEl = document.getElementById('post-main-title');
      const typeTag = document.getElementById('post-type-tag');
      const timeTag = document.getElementById('post-time-tag');
      const rewardTag = document.getElementById('post-reward-tag');
      const creatorName = document.getElementById('post-creator-name');
      const creatorTools = document.getElementById('post-creator-tools');
      const creatorMeta = document.getElementById('post-creator-meta');
      const descText = document.getElementById('post-service-desc-text');
      const extraText = document.getElementById('post-service-extra-text');
      const mockupUrl = document.getElementById('post-mockup-url');
      const mockupAuthor = document.getElementById('post-mockup-author');
      const mockupBody = document.getElementById('post-mockup-body');
      const missionsContainer = document.getElementById('post-missions-container');
      const recruitsText = document.getElementById('post-recruits-text');
      const recruitsBar = document.getElementById('post-recruits-bar');
      const regDate = document.getElementById('post-meta-regdate');
      const endDate = document.getElementById('post-meta-enddate');
      const rewardMeta = document.getElementById('post-meta-reward');

      const categoryNameMap = {
        abtest: 'A/B테스트',
        product: '프로덕트 테스트',
        vote: '투표 테스트',
        prototype: '프로토타입 검증',
        survey: '설문조사'
      };

      const catName = categoryNameMap[test.category] || test.category || '테스트';
      const creatorNick = test.users?.nickname || '크리에이터';

      // 플랫폼 및 카테고리별 실제 첨부 링크 결정
      const isApp = test.platform === 'app';
      const isVote = test.category === 'vote';
      const isAb = test.category === 'abtest' || !!test.is_ab_test;
      const isSurvey = test.category === 'survey';

      // 목업 주소 표시줄에만 쓰이는 대표 URL
      const rawUrl = (isApp
        ? (test.app_playstore_url || test.app_appstore_url || test.service_url)
        : test.service_url) || '';
      const hasUrl = Boolean(rawUrl.trim());
      const missionUrl = getProjectMissionUrl(test.id);
      // 내부 테스트 여부는 공개 URL이 아니라 실제 미션 URL을 기준으로 판단합니다.
      const isInternalTest = isVote || !missionUrl;
      const formattedUrl = hasUrl ? (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`) : '';

      if (titleEl) titleEl.textContent = test.title;
      if (typeTag) {
        typeTag.textContent = `[${catName}]`;
        typeTag.className = 'px-3 py-1 rounded-md bg-[#EDF8E5] text-[#2F6517] text-xs font-bold border border-[#2F6517]/20';
      }
      if (timeTag) timeTag.innerHTML = `⏱️ 소요시간: 약 ${test.duration || '3분'}`;
      if (rewardTag) rewardTag.innerHTML = `🪙 ${test.reward_coin ?? 500} 돼지코인`;
      if (creatorName) creatorName.textContent = `제작자: ${creatorNick}`;
      if (creatorTools) creatorTools.innerHTML = isApp ? `📱 플랫폼: 모바일 앱 (iOS/Android)` : `🛠️ 플랫폼: ${test.platform || 'web'}`;
      if (creatorMeta) creatorMeta.innerHTML = `👥 모집 현황: ${test.current_count || 0}/${test.target_count || 10}명`;
      if (descText) descText.textContent = test.service_desc;
      if (extraText) extraText.textContent = '테스터 분들의 생생한 피드백을 바탕으로 서비스 개선과 UI 최적화를 진행할 예정입니다.';
      if (mockupUrl) {
        if (isInternalTest) {
          mockupUrl.textContent = '돈돼 서비스 내부 진행';
        } else if (formattedUrl) {
          mockupUrl.innerHTML = `<a href="${formattedUrl}" target="_blank" rel="noopener noreferrer" class="hover:underline text-primary-dark">${rawUrl} ↗</a>`;
        } else {
          mockupUrl.textContent = 'URL 정보 없음';
        }
      }
      if (mockupAuthor) mockupAuthor.textContent = `${creatorNick} ▾`;

      const serviceNameEl = document.getElementById('post-service-name-text');
      const serviceShortIntroEl = document.getElementById('post-service-short-intro');
      const noticeTextEl = document.getElementById('post-notice-text');
      const noticeBoxParent = noticeTextEl?.closest('.flex.flex-col.gap-5');

      if (serviceNameEl) serviceNameEl.textContent = `서비스명: ${test.service_name || test.title}`;
      if (serviceShortIntroEl) serviceShortIntroEl.innerHTML = `<strong class="text-neutral-800">서비스 소개:</strong> ${test.service_desc}`;

      // 테스트 목적/안내 항목 노출 처리
      if (noticeTextEl) {
        if (test.test_notice && test.test_notice.trim()) {
          noticeTextEl.textContent = test.test_notice;
          if (noticeTextEl.parentElement) noticeTextEl.parentElement.style.display = '';
        } else {
          if (noticeTextEl.parentElement) noticeTextEl.parentElement.style.display = 'none';
        }
      }

      // 로그인 필요 여부 및 테스트 계정 정보 바인딩
      renderDetailLoginInfo(test);

      // 테스트 진행 가이드 노출 처리
      const guideBoxEl = document.getElementById('post-test-guide-box');
      if (guideBoxEl) {
        const guideParent = guideBoxEl.closest('.bg-white');
        if (test.test_guide && test.test_guide.trim()) {
          guideBoxEl.textContent = test.test_guide;
          if (guideParent) guideParent.style.display = '';
        } else {
          if (guideParent) guideParent.style.display = 'none';
        }
      }

      // TAB 2 (테스트 미션) 상단 카드: URL은 노출하지 않고 버튼으로만 외부로 내보냅니다.
      setMissionPreviewCard(getProjectPublicUrl(test.id), {
        projectId: test.id,
        serviceName: test.service_name || test.title
      });

      if (mockupBody) {
        if (test.thumbnail_url) {
          mockupBody.innerHTML = `
            <div class="w-full rounded-2xl overflow-hidden shadow-subtle border border-neutral-200 bg-white p-2">
              <img src="${test.thumbnail_url}" onerror="handleBrokenProjectThumbnail(this)" data-thumbnail-variant="detail" class="w-full h-auto max-h-[480px] object-contain rounded-xl" alt="서비스 첨부 이미지 미리보기" />
            </div>
          `;
        } else {
          mockupBody.innerHTML = `
            <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">✨</span>
                <span class="font-extrabold text-sm text-neutral-800">${test.service_name || test.title} 서비스 대시보드</span>
              </div>
              <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full animate-pulse">실시간 모집 중</span>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center my-3">
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">목표 테스터</span>
                <span class="text-lg font-extrabold text-neutral-800">${test.target_count || 10} 명</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">현재 참여 테스터</span>
                <span class="text-lg font-extrabold text-primary-dark">${test.current_count || 0} 명</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">1인당 지급 돼지코인</span>
                <span class="text-lg font-extrabold text-[#7E22CE]">${test.reward_coin ?? 500} 돼지코인</span>
              </div>
            </div>
            <div class="w-full h-36 bg-[#F9FBEC] rounded-xl border border-[#DCE4B8] p-3 flex flex-col items-center justify-center text-center overflow-hidden">
              <span class="text-3xl filter drop-shadow-xs">🎉</span>
              <span class="text-xs font-extrabold text-[#2F6517] block mt-1">${test.service_name || test.title} 서비스 미리보기</span>
              <span class="text-[11px] text-neutral-600">${formattedUrl ? `<a href="${formattedUrl}" target="_blank" rel="noopener noreferrer" class="font-bold underline text-[#2F6517]">${rawUrl}</a>` : '등록된 URL'} 에서 테스터를 맞이할 준비가 완료되었습니다.</span>
            </div>
          `;
        }
      }

      if (missionsContainer) {
        let missionsHtml = '';
        let mIdx = 1;

        if (isInternalTest) {
          missionsHtml += `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">${mIdx++}</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">${isVote ? '서비스 내부 시안 비교 및 투표 참여' : '돈돼 내부 검증 문항 작성'}</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  ${isVote ? '돈돼 내부 투표 화면에서 시안을 확인하고 마음에 드는 항목에 투표를 완료해 주세요.' : '준비된 검증 질문들에 대해 솔직하고 구체적인 피드백을 작성해 주세요.'}
                </p>
              </div>
            </div>
          `;
        } else if (isApp) {
          missionsHtml += `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">${mIdx++}</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">모바일 앱 설치 및 핵심 기능 검증</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  앱 스토어 링크에 접속하여 앱을 다운로드 및 설치한 후 핵심 기능을 테스트해 주세요.
                </p>
              </div>
            </div>
          `;
        } else if (formattedUrl) {
          missionsHtml += `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">${mIdx++}</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">웹 서비스 직접 체험 및 핵심 기능 검증</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  위 [서비스 구경하기] 버튼으로 서비스에 접속해 주요 기능을 검증해 주세요.
                </p>
              </div>
            </div>
          `;
        }

        const questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : (test.questions || []);
        questions.forEach(q => {
          const qTitle = typeof q === 'string' ? q : (q.title || '');
          if (qTitle && qTitle.trim()) {
            missionsHtml += `
              <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
                <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">${mIdx++}</span>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-neutral-800">${qTitle}</span>
                </div>
              </div>
            `;
          }
        });

        const quizzes = typeof test.quizzes === 'string' ? JSON.parse(test.quizzes) : (test.quizzes || []);
        quizzes.forEach(qz => {
          const qzQuestion = qz.question || '';
          if (qzQuestion && qzQuestion.trim()) {
            missionsHtml += `
              <div class="flex items-start gap-4 bg-[#FFFDF0] border border-[#F5EDBA] p-4.5 rounded-2xl">
                <span class="w-7 h-7 rounded-xl bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">❓</span>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-amber-900">검증 퀴즈 (성실도 확인)</span>
                  <p class="text-xs text-neutral-700 leading-relaxed font-semibold">Q. ${qzQuestion}</p>
                </div>
              </div>
            `;
          }
        });

        missionsContainer.innerHTML = missionsHtml;

        // 탭 미션 카운트 갱신 및 검증 항목 부모 컨테이너 숨김/노출
        const missionCountBadge = document.getElementById('tab-count-mission');
        if (missionCountBadge) missionCountBadge.textContent = Math.max(0, mIdx - 1);

        const checklistParent = missionsContainer.closest('.bg-white');
        if (checklistParent) {
          if (!missionsHtml || missionsHtml.trim() === '') {
            checklistParent.style.display = 'none';
          } else {
            checklistParent.style.display = '';
          }
        }
      }

      const percent = Math.round(((test.current_count || 0) / (test.target_count || 10)) * 100);
      if (recruitsText) recruitsText.textContent = `${test.current_count || 0} / ${test.target_count || 10}명`;
      if (recruitsBar) recruitsBar.style.width = `${Math.max(percent, 4)}%`;
      if (regDate) regDate.textContent = test.created_at ? test.created_at.split('T')[0] : '2026-09-08';
      if (endDate) endDate.textContent = test.end_date || '2026-09-22';
      if (rewardMeta) rewardMeta.innerHTML = `${test.reward_coin ?? 500} <img src="/images/brand/logo-coin.png" class="w-3.5 h-3.5 inline" alt="돼지코인">`;

      // 1. 참여 권장 대상 / 키워드 태그 바인딩 (기존 DB 필드 그대로 호환)
      const projectTargetTags = (test.target_persona_tags && Array.isArray(test.target_persona_tags) && test.target_persona_tags.length > 0)
        ? test.target_persona_tags
        : ((test.tech_tags && Array.isArray(test.tech_tags) && test.tech_tags.length > 0)
          ? test.tech_tags
          : (test.techTags && Array.isArray(test.techTags) && test.techTags.length > 0 ? test.techTags : []));

      // 2. 상단 기술 / 키워드 태그 바인딩
      const techTagsList = document.getElementById('post-tech-tags-list');
      if (techTagsList) {
        if (projectTargetTags.length > 0) {
          techTagsList.style.display = '';
          techTagsList.innerHTML = projectTargetTags.map(t => {
            const normalizedTag = String(t);
            const cleanTag = normalizedTag.startsWith('#') ? normalizedTag : `#${normalizedTag}`;
            return `<span class="px-2.5 py-1 rounded-lg bg-[#FAFBF5] border border-[#E2E8D3] text-[#2F6517] text-[11px] font-bold">${cleanTag}</span>`;
          }).join('');
        } else {
          techTagsList.innerHTML = '';
          techTagsList.style.display = 'none';
        }
      }

      // 3. 개요 탭 '이런 분이면 딱이에요!' 바인딩
      const personaTagsList = document.getElementById('post-persona-tags-list');
      const personaBoxParent = personaTagsList?.closest('.p-5.rounded-2xl');
      if (personaTagsList) {
        if (projectTargetTags.length > 0) {
          personaTagsList.innerHTML = projectTargetTags.map(t => {
            const cleanTag = String(t).replace(/^#/, '');
            return `<span class="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 shadow-2xs">🎯 ${cleanTag}</span>`;
          }).join('');
          if (personaBoxParent) personaBoxParent.style.display = '';
        } else {
          if (personaBoxParent) personaBoxParent.style.display = 'none';
        }
      }

      // 4. 사이드바 상세 메타 정보 바인딩
      const sideType = document.getElementById('post-side-type');
      if (sideType) sideType.textContent = catName;

      const sideHow = document.getElementById('post-side-how');
      if (sideHow) {
        sideHow.textContent = isInternalTest ? '내부형' : '외부형';
        sideHow.className = isInternalTest
          ? 'inline-block text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200'
          : 'inline-block text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200';
      }

      setDetailParticipationCta('fresh', test.id, test.reward_coin);

      const sideDuration = document.getElementById('post-side-duration');
      if (sideDuration) sideDuration.textContent = test.duration ? `약 ${test.duration}` : '약 3~5분';

      const sideRewardCoin = document.getElementById('post-reward-coin-num');
      if (sideRewardCoin) sideRewardCoin.textContent = `${test.reward_coin ?? 500} C`;

      // 5. 사이드바 '이런 분이면 딱이에요' 태그 바인딩 (기존 '사용 도구' 위치)
      const toolsRow = document.getElementById('post-side-tools-row');
      const toolsIcons = document.getElementById('post-tools-icons');
      if (toolsIcons) {
        if (projectTargetTags.length > 0) {
          toolsIcons.innerHTML = projectTargetTags.map(t => `
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold">
              <span>🏷️</span> ${String(t).replace(/^#/, '')}
            </span>
          `).join('');
          if (toolsRow) toolsRow.style.display = '';
        } else {
          if (toolsRow) toolsRow.style.display = 'none';
        }
      }

      // Update Sidebar Creator Card from DB
      const creatorSidebarName = document.getElementById('post-creator-name-sidebar');
      const creatorSidebarBio = document.getElementById('post-creator-bio-sidebar');
      const creatorSidebarBadge = document.getElementById('post-creator-badge-sidebar');
      const creatorSidebarTags = document.getElementById('post-creator-tags-sidebar');

      if (creatorSidebarName) creatorSidebarName.textContent = creatorNick;
      if (creatorSidebarBio && test.users?.bio) creatorSidebarBio.textContent = test.users.bio;
      if (creatorSidebarBadge && test.users?.rank_badge) creatorSidebarBadge.textContent = test.users.rank_badge;

      if (creatorSidebarTags && test.users?.interests && Array.isArray(test.users.interests)) {
        creatorSidebarTags.innerHTML = test.users.interests.map(t => `<span class="px-2.5 py-1 rounded-full bg-[#FAFBF5] border border-[#E2E8D3] text-[#2F6517] text-[11px] font-bold">#${t}</span>`).join('');
      }

      // Check Creator Ownership to show creator-only management actions
      if (window.donDwaeDataService && window.donDwaeDataService.supabase) {
        window.donDwaeDataService.supabase.auth.getSession().then(async ({ data: { session } }) => {
          const activeUserId = session?.user?.id;
          const isCreatorOwner = window.isUserLoggedIn && !!activeUserId && (activeUserId === test.creator_id);

          const ctaBtn = document.getElementById('btn-participate-test');
          const creatorActions = document.getElementById('creator-only-actions');
          const sidebarBadge = document.getElementById('post-sidebar-badge');

          if (isCreatorOwner) {
            if (ctaBtn) ctaBtn.classList.add('hidden');
            if (creatorActions) {
              creatorActions.classList.remove('hidden');
              creatorActions.classList.add('flex');
            }
            if (sidebarBadge) {
              sidebarBadge.innerHTML = '<span>📢</span> <span>내가 등록한 테스트입니다 (제작자 전용 관리 뷰).</span>';
            }
          } else {
            let participation = null;
            if (activeUserId) {
              participation = await window.donDwaeDataService.checkUserParticipation(test.id, activeUserId);
            }
            if (String(window.currentDetailProject?.id || '') !== String(test.id || '')) return;

            const participationState = participation
              ? (isParticipationCompleted({
                  participation_status: participation.status,
                  participation_completed_at: participation.completed_at
                }) ? 'completed' : 'review-needed')
              : 'fresh';
            setDetailParticipationCta(participationState, test.id, test.reward_coin);
            if (creatorActions) {
              creatorActions.classList.add('hidden');
              creatorActions.classList.remove('flex');
            }
          }
        }).catch(error => {
          console.warn('[renderDBProjectToDetail] Participation status warning:', error?.message || error);
        });
      } else {
        const ctaBtn = document.getElementById('btn-participate-test');
        const creatorActions = document.getElementById('creator-only-actions');
        const sidebarBadge = document.getElementById('post-sidebar-badge');
        if (ctaBtn) ctaBtn.classList.remove('hidden');
        if (creatorActions) {
          creatorActions.classList.add('hidden');
          creatorActions.classList.remove('flex');
        }
        if (sidebarBadge) {
          sidebarBadge.innerHTML = '<span>📢</span> <span>테스트 참여 완료 시 리워드 돼지코인이 수령됩니다.</span>';
        }
      }

      // Fetch and render project reviews in TAB 3
      renderDetailReviews(test.id, test);
      updateDetailBookmarkUI(test.id);
    };

    function renderPreviewProjectDetail(postId) {
      if (postId === 'my-created-test' || postId === 'my-test') {
        const test = myCreatedTest;
        renderDetailLoginInfo(test);

        if (titleEl) titleEl.textContent = test.title ? test.title : `${test.serviceName} 베타테스터 모집`;
        if (typeTag) {
          typeTag.textContent = `[${test.testType}]`;
          typeTag.className = 'px-3 py-1 rounded-md bg-[#EDF8E5] text-[#2F6517] text-xs font-bold border border-[#2F6517]/20';
        }
        if (timeTag) timeTag.innerHTML = `⏱️ 소요시간: 약 ${test.duration || 5}분`;
        if (rewardTag) rewardTag.innerHTML = `🪙 ${test.rewardCoin} 돼지코인`;
        if (creatorName) creatorName.textContent = '제작자: 바이브코더123 (나)';
        if (creatorTools) creatorTools.innerHTML = `🛠️ 사용 툴: ${(test.techTags || []).join(' ') || '미입력'}`;
        if (creatorMeta) creatorMeta.innerHTML = '👥 참여 인원 및 기간: 총 1인, 3일';
        if (descText) descText.textContent = test.serviceDesc;
        if (extraText) extraText.textContent = '테스터 분들의 피드백을 바탕으로 빠른 기능 개선과 UI 최적화를 진행할 예정입니다.';
        if (mockupUrl) mockupUrl.textContent = test.serviceUrl;
        if (mockupAuthor) mockupAuthor.textContent = '바이브코더123 (나) ▾';

        // Update Overview Tab elements dynamically
        const serviceNameEl = document.getElementById('post-service-name-text');
        const serviceShortIntroEl = document.getElementById('post-service-short-intro');
        const noticeTextEl = document.getElementById('post-notice-text');

        if (serviceNameEl) {
          serviceNameEl.textContent = `서비스명: ${test.serviceName || test.title}`;
        }
        if (serviceShortIntroEl) {
          serviceShortIntroEl.innerHTML = `<strong class="text-neutral-800">서비스 소개:</strong> ${test.serviceDesc}`;
        }
        if (noticeTextEl) {
          noticeTextEl.textContent = test.testNotice || '실제 웹/앱 서비스를 직접 사용해보고 유익한 피드백을 남겨주세요.';
        }
        const localTechTagsList = document.getElementById('post-tech-tags-list');
        if (localTechTagsList) {
          const localTechTags = Array.isArray(test.techTags) ? test.techTags.filter(Boolean) : [];
          localTechTagsList.innerHTML = localTechTags.map(tag => {
            const cleanTag = String(tag).replace(/^#/, '');
            return `<span class="px-2.5 py-1 rounded-lg bg-[#FAFBF5] border border-[#E2E8D3] text-[#2F6517] text-[11px] font-bold">#${cleanTag}</span>`;
          }).join('');
          localTechTagsList.style.display = localTechTags.length > 0 ? '' : 'none';
        }
        const localPersonaTagsList = document.getElementById('post-persona-tags-list');
        const localPersonaBox = localPersonaTagsList?.closest('.p-5.rounded-2xl');
        if (localPersonaTagsList) {
          const localPersonaTags = Array.isArray(test.personaTags) ? test.personaTags.filter(Boolean) : [];
          localPersonaTagsList.innerHTML = localPersonaTags.map(tag => `<span class="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 shadow-2xs">🎯 ${String(tag).replace(/^#/, '')}</span>`).join('');
          if (localPersonaBox) localPersonaBox.style.display = localPersonaTags.length > 0 ? '' : 'none';
        }

        // Update mockup preview with thumbnail if available
        if (mockupBody) {
          if (test.thumbnailUrl) {
            mockupBody.innerHTML = `
              <div class="w-full rounded-2xl overflow-hidden shadow-subtle border border-neutral-200 bg-white p-2">
                <img src="${test.thumbnailUrl}" onerror="handleBrokenProjectThumbnail(this)" data-thumbnail-variant="detail" class="w-full h-auto max-h-[480px] object-contain rounded-xl" alt="서비스 첨부 이미지 미리보기" />
              </div>
            `;
          } else {
            mockupBody.innerHTML = `
              <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div class="flex items-center gap-2">
                  <span class="text-lg">✨</span>
                  <span class="font-extrabold text-sm text-neutral-800">${test.serviceName} 서비스 대시보드</span>
                </div>
                <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full animate-pulse">실시간 모집 중</span>
              </div>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                  <span class="text-[10px] text-neutral-400 block mb-1">목표 테스터</span>
                  <span class="text-lg font-extrabold text-neutral-800">${test.targetCount} 명</span>
                </div>
                <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                  <span class="text-[10px] text-neutral-400 block mb-1">현재 참여 테스터</span>
                  <span class="text-lg font-extrabold text-primary-dark">${test.currentRecruits} 명</span>
                </div>
                <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                  <span class="text-[10px] text-neutral-400 block mb-1">1인당 지급 돼지코인</span>
                  <span class="text-lg font-extrabold text-[#7E22CE]">${test.rewardCoin} 돼지코인</span>
                </div>
              </div>
              <div class="w-full h-36 bg-[#F9FBEC] rounded-xl border border-[#DCE4B8] p-3 flex flex-col items-center justify-center text-center overflow-hidden">
                <span class="text-3xl filter drop-shadow-xs">🎉</span>
                <span class="text-xs font-extrabold text-[#2F6517] block mt-1">${test.serviceName} 서비스 미리보기</span>
                <span class="text-[11px] text-neutral-600">${test.serviceUrl} 에서 테스터를 맞이할 준비가 완료되었습니다.</span>
              </div>
            `;
          }
        }

        // Generate missions list based on user's questions & quizzes
        if (missionsContainer) {
          let missionsHtml = '';

          missionsHtml += `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">웹사이트 접속 및 메인 기능 작동 검증</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  위 [서비스 구경하기] 버튼으로 웹사이트에 접속해 핵심 기능을 체험해 주세요.
                </p>
              </div>
            </div>
          `;

          let mIdx = 2;
          if (test.questions && test.questions.length > 0) {
            test.questions.forEach((q) => {
              const qTitle = typeof q === 'string' ? q : q.title;
              missionsHtml += `
                <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
                  <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">${mIdx++}</span>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-neutral-800">${qTitle}</span>
                  </div>
                </div>
              `;
            });
          }

          if (test.quizzes && test.quizzes.length > 0) {
            test.quizzes.forEach((qz) => {
              missionsHtml += `
                <div class="flex items-start gap-4 bg-[#FFFDF0] border border-[#F5EDBA] p-4.5 rounded-2xl">
                  <span class="w-7 h-7 rounded-xl bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">❓</span>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-amber-900 flex items-center gap-1">
                      <span>검증 퀴즈 (성실도 확인)</span>
                    </span>
                    <p class="text-xs text-neutral-700 leading-relaxed font-semibold">
                      Q. ${qz.question}
                    </p>
                  </div>
                </div>
              `;
            });
          }

          missionsContainer.innerHTML = missionsHtml;
        }

        const percent = Math.round((test.currentRecruits / test.targetCount) * 100);
        if (recruitsText) recruitsText.textContent = `${test.currentRecruits} / ${test.targetCount}명`;
        if (recruitsBar) recruitsBar.style.width = `${Math.max(percent, 4)}%`;
        if (regDate) regDate.textContent = test.regDate;
        if (endDate) endDate.textContent = test.endDate;
        const totalBudget = test.rewardCoin * test.targetCount;
        if (rewardMeta) rewardMeta.innerHTML = `${test.rewardCoin} <img src="/images/brand/logo-coin.png" class="w-3.5 h-3.5 inline" alt="돼지코인"> (총 ${totalBudget.toLocaleString()} 돼지코인)`;

        // SIDEBAR: 로그인된 경우만 [관리자 뷰] 노출
        if (window.isUserLoggedIn) {
          if (sidebarBadge) {
            sidebarBadge.innerHTML = '<span>📢</span> <span>내가 등록한 테스트입니다.</span>';
          }
          if (ctaBtn) {
            ctaBtn.classList.add('hidden'); // 내 테스트이므로 내가 테스터로 참여하지 않음
          }
          if (creatorOnlyActions) {
            creatorOnlyActions.classList.remove('hidden');
            creatorOnlyActions.classList.add('flex');
          }
        } else {
          if (sidebarBadge) {
            sidebarBadge.innerHTML = '<span>📢</span> <span>테스트 참여 완료 시 리워드 돼지코인이 수령됩니다.</span>';
          }
          if (ctaBtn) {
            ctaBtn.classList.remove('hidden');
          }
          if (creatorOnlyActions) {
            creatorOnlyActions.classList.add('hidden');
            creatorOnlyActions.classList.remove('flex');
          }
        }

      } else if (postId === 'prototype') {
        // 2. Prototype Test: 온보딩 UI 시안 A/B 투표 검증
        if (titleEl) titleEl.textContent = '온보딩 UI 시안 A/B 선호도 투표 및 사용성 검증';
        if (typeTag) {
          typeTag.textContent = '[투표 테스트]';
          typeTag.className = 'px-3 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-bold';
        }
        if (timeTag) timeTag.innerHTML = '⏱️ 소요시간: 약 3분';
        if (rewardTag) rewardTag.innerHTML = '🪙 350 돼지코인';
        if (creatorName) creatorName.textContent = '제작자: 프로토타이퍼';
        if (creatorTools) creatorTools.innerHTML = '🛠️ 사용 툴: Figma, Webflow, Relume';
        if (creatorMeta) creatorMeta.innerHTML = '👥 참여 인원 및 기간: 총 1인, 5일';
        if (descText) descText.textContent = '안녕하세요! 노코드로 구현한 대화형 온보딩 플로우의 A안과 B안 시안 비교 검증입니다. 신규 가입자가 복잡한 설정 없이 3분 만에 서비스의 핵심 가치를 이해할 수 있도록 설계된 두 가지 디자인 구조 중 더 직관적인 시안을 선택해 주세요.';
        if (extraText) extraText.textContent = '모바일 화면 및 데스크톱 환경에서 프로토타입 온보딩 플로우가 얼마나 매끄럽게 작동하는지 테스터 분들의 생생한 투표 소감을 기다립니다.';
        if (mockupUrl) mockupUrl.textContent = 'figma.com/@prototyper/onboarding-flow';
        if (mockupAuthor) mockupAuthor.textContent = '프로토타이퍼 ▾';

        // Sidebar 2-Column Meta Fields
        const sideType = document.getElementById('post-side-type');
        const sideMethod = document.getElementById('post-side-[#2F6517]');
        const sideDuration = document.getElementById('post-side-duration');
        const rewardCoinNum = document.getElementById('post-reward-coin-num');
        const toolsIcons = document.getElementById('post-tools-icons');

        if (sideType) sideType.textContent = '투표 테스트';
        if (sideMethod) {
          sideMethod.textContent = '내부형';
          sideMethod.className = 'inline-block text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200';
        }
        if (sideDuration) sideDuration.textContent = '약 3분';
        if (rewardCoinNum) rewardCoinNum.textContent = '350 C';
        if (toolsIcons) {
          toolsIcons.innerHTML = `
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>🎨</span> Figma</span>
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>🌐</span> Webflow</span>
          `;
        }

        if (mockupBody) {
          mockupBody.innerHTML = `
            <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">🎨</span>
                <span class="font-extrabold text-sm text-purple-950">대화형 온보딩 프로토타입 시안 비교</span>
              </div>
              <span class="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">내부 투표 진행</span>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">비교 시안</span>
                <span class="text-lg font-extrabold text-neutral-800">A안 vs B안</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">A안 득표율</span>
                <span class="text-lg font-extrabold text-primary-dark">68%</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">평균 완료 시간</span>
                <span class="text-lg font-extrabold text-[#7E22CE]">1분 30초</span>
              </div>
            </div>
            <div class="w-full h-32 bg-purple-50/70 rounded-xl border border-purple-200 p-4 flex flex-col items-center justify-center text-center">
              <span class="text-xs font-bold text-purple-900 block mb-1">Figma 대화형 프로토타입 프레임</span>
              <span class="text-[11px] text-purple-600">단계별 질문 선택지 클릭 및 A/B 시안 비교 화면 내장</span>
            </div>
          `;
        }

        if (missionsContainer) {
          missionsContainer.innerHTML = `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">A안(3-Step 카드)과 B안(통상 리스트) 시안 확인</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  제시된 두 가지 온보딩 화면 구성을 꼼꼼하게 둘러보고 가독성과 직관성을 비교해 주세요.
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">선호하는 시안 투표 선택</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  더 이해하기 쉽고 직관적인 시안(A안 또는 B안)에 표를 던져주세요.
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">선택 이유 및 개선 아이디어 서술</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">
                  해당 시안을 고르신 이유와 추가 개선 피드백을 서술형으로 솔직하게 입력해 주세요.
                </p>
              </div>
            </div>
          `;
        }

        if (recruitsText) recruitsText.textContent = '12 / 25명';
        if (recruitsBar) recruitsBar.style.width = '48%';
        if (regDate) regDate.textContent = '2024. 11. 18.';
        if (endDate) endDate.textContent = '2024. 12. 02.';
        if (rewardMeta) rewardMeta.innerHTML = '350 <img src="/images/brand/logo-coin.png" class="w-3.5 h-3.5 inline" alt="돼지코인">';

        if (sidebarBadge) sidebarBadge.innerHTML = '<span>📢</span> <span>다른 제작자가 등록한 테스트입니다</span>';
        if (ctaBtn) ctaBtn.classList.remove('hidden');
        if (creatorOnlyActions) {
          creatorOnlyActions.classList.add('hidden');
          creatorOnlyActions.classList.remove('flex');
        }

        if (userParticipatedTests['prototype']) {
          if (ctaBtn) {
            ctaBtn.disabled = true;
            ctaBtn.className = 'w-full py-4 px-4 rounded-xl bg-neutral-200 text-neutral-500 font-extrabold text-sm cursor-not-allowed flex items-center justify-center gap-2';
          }
          if (ctaBtnText) ctaBtnText.textContent = '✓ 테스터 참여 완료됨 (+350 돼지코인 수령)';
        } else {
          if (ctaBtn) {
            ctaBtn.disabled = false;
            ctaBtn.className = 'w-full py-4 px-4 rounded-xl bg-[#2F6517] hover:bg-[#25500F] active:scale-[0.98] text-white font-extrabold text-sm shadow-card transition-all flex items-center justify-center gap-2';
          }
          if (ctaBtnText) ctaBtnText.textContent = '미션 참여하기';
        }

      } else if (postId === 'diary') {
        // 4. Diary Test: AI 기반 하루 일기 웹앱 A/B 투표
        if (titleEl) titleEl.textContent = 'AI 기반 하루 일기 웹앱 UX/UI 사용성 및 A/B 선호도 검증';
        if (typeTag) {
          typeTag.textContent = '[A/B 투표]';
          typeTag.className = 'px-3 py-1 rounded-md bg-pink-100 text-[#BE185D] text-xs font-bold';
        }
        if (timeTag) timeTag.innerHTML = '⏱️ 소요시간: 약 3분';
        if (rewardTag) rewardTag.innerHTML = '🪙 200 돼지코인';
        if (creatorName) creatorName.textContent = '제작자: 인디해커_K';
        if (creatorTools) creatorTools.innerHTML = '🛠️ 사용 툴: Cursor, Next.js, v0';
        if (creatorMeta) creatorMeta.innerHTML = '👥 참여 인원 및 기간: 총 1인, 7일';
        if (descText) descText.textContent = '안녕하세요! 텍스트 일기 입력을 바탕으로 하루 감정 상태를 분석해 주는 AI 일기 웹앱입니다. 일기 작성 완료 후 감정 분석 리포트 레이아웃(A안 vs B안)의 시각적 직관성과 폰트 가독성을 평가해 주세요.';
        if (extraText) extraText.textContent = '실제 작성 과정에서 느껴지는 UX 이탈 요소 및 긍정적 사용감에 대해 솔직하고 구체적인 의견을 남겨주시면 큰 도움이 됩니다.';
        if (mockupUrl) mockupUrl.textContent = 'ai-diary-app.vercel.app';
        if (mockupAuthor) mockupAuthor.textContent = '인디해커_K ▾';

        // Sidebar Meta
        const sideType = document.getElementById('post-side-type');
        const sideMethod = document.getElementById('post-side-[#2F6517]');
        const sideDuration = document.getElementById('post-side-duration');
        const rewardCoinNum = document.getElementById('post-reward-coin-num');
        const toolsIcons = document.getElementById('post-tools-icons');

        if (sideType) sideType.textContent = 'A/B 투표';
        if (sideMethod) {
          sideMethod.textContent = '내부형';
          sideMethod.className = 'inline-block text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200';
        }
        if (sideDuration) sideDuration.textContent = '약 3분';
        if (rewardCoinNum) rewardCoinNum.textContent = '200 C';
        if (toolsIcons) {
          toolsIcons.innerHTML = `
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>🖤</span> Cursor</span>
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>▲</span> Next.js</span>
          `;
        }

        if (mockupBody) {
          mockupBody.innerHTML = `
            <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">📘</span>
                <span class="font-extrabold text-sm text-neutral-800">오늘의 일기 AI 감정 분석 대시보드</span>
              </div>
              <span class="text-xs bg-pink-100 text-pink-800 font-bold px-2 py-0.5 rounded-full">A/B 선호도 검증</span>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">감정 분석 정확도</span>
                <span class="text-lg font-extrabold text-neutral-800">85%</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">A안 득표율</span>
                <span class="text-lg font-extrabold text-primary-dark">65%</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">보상 돼지코인</span>
                <span class="text-lg font-extrabold text-[#7E22CE]">200 C</span>
              </div>
            </div>
          `;
        }

        if (missionsContainer) {
          missionsContainer.innerHTML = `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">A안 / B안 감정 리포트 레이아웃 가독성 비교</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">제시된 2가지 일기 분석 결과 화면 레이아웃을 확인해 주세요.</p>
              </div>
            </div>
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">더 직관적인 시안 선택 투표</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">실제 일기를 썼을 때 더 보고 싶은 디자인 카드에 투표해 주세요.</p>
              </div>
            </div>
          `;
        }

        if (recruitsText) recruitsText.textContent = '18 / 30명';
        if (recruitsBar) recruitsBar.style.width = '60%';
        if (regDate) regDate.textContent = '2024. 11. 17.';
        if (endDate) endDate.textContent = '2024. 11. 24.';
        if (rewardMeta) rewardMeta.innerHTML = '200 <img src="/images/brand/logo-coin.png" class="w-3.5 h-3.5 inline" alt="돼지코인">';

        if (sidebarBadge) sidebarBadge.innerHTML = '<span>📢</span> <span>다른 제작자가 등록한 테스트입니다</span>';
        if (ctaBtn) ctaBtn.classList.remove('hidden');

      } else if (postId === 'saas') {
        // 5. SaaS Test: SaaS 서비스 랜딩페이지 카피라이팅 선호도 투표
        if (titleEl) titleEl.textContent = 'SaaS 서비스 랜딩페이지 카피라이팅 A/B 선호도 투표';
        if (typeTag) {
          typeTag.textContent = '[A/B 투표]';
          typeTag.className = 'px-3 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-bold';
        }
        if (timeTag) timeTag.innerHTML = '⏱️ 소요시간: 약 1분';
        if (rewardTag) rewardTag.innerHTML = '🪙 100 돼지코인';
        if (creatorName) creatorName.textContent = '제작자: SaaS_Maker';
        if (creatorTools) creatorTools.innerHTML = '🛠️ 사용 툴: Next.js, Tailwind, Vercel';
        if (creatorMeta) creatorMeta.innerHTML = '👥 참여 인원 및 기간: 총 1인, 14일';
        if (descText) descText.textContent = '안녕하세요! B2B SaaS 대시보드 랜딩페이지의 메인 히어로 헤드카피 투표입니다. 수익 중심 직접적 카피 vs 업무 효율 중심 설득형 카피 중 타겟 유저의 관심과 가입 클릭을 끌어낼 카피를 골라주세요.';
        if (extraText) extraText.textContent = '어떤 카피가 더 가치제안을 전달하기 명확한지 짧고 솔직한 선택 이유도 함께 남겨주시면 큰 도움이 됩니다.';
        if (mockupUrl) mockupUrl.textContent = 'saas-dashboard-preview.io';
        if (mockupAuthor) mockupAuthor.textContent = 'SaaS_Maker ▾';

        // Sidebar Meta
        const sideType = document.getElementById('post-side-type');
        const sideMethod = document.getElementById('post-side-[#2F6517]');
        const sideDuration = document.getElementById('post-side-duration');
        const rewardCoinNum = document.getElementById('post-reward-coin-num');
        const toolsIcons = document.getElementById('post-tools-icons');

        if (sideType) sideType.textContent = 'A/B 투표';
        if (sideMethod) {
          sideMethod.textContent = '내부형';
          sideMethod.className = 'inline-block text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200';
        }
        if (sideDuration) sideDuration.textContent = '약 1분';
        if (rewardCoinNum) rewardCoinNum.textContent = '100 C';
        if (toolsIcons) {
          toolsIcons.innerHTML = `
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>▲</span> Next.js</span>
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>▲</span> Vercel</span>
          `;
        }

        if (mockupBody) {
          mockupBody.innerHTML = `
            <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">⚡</span>
                <span class="font-extrabold text-sm text-neutral-800">SaaS 랜딩페이지 히어로 카피라이팅 비교</span>
              </div>
              <span class="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">투표 진행 중</span>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">비교 카피</span>
                <span class="text-lg font-extrabold text-neutral-800">수익 vs 효율</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">현재 참여</span>
                <span class="text-lg font-extrabold text-primary-dark">5 명</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">지급 돼지코인</span>
                <span class="text-lg font-extrabold text-[#7E22CE]">100 C</span>
              </div>
            </div>
          `;
        }

        if (missionsContainer) {
          missionsContainer.innerHTML = `
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">Option A(수익 중심)와 Option B(효율 중심) 헤드라인 비교</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">제시된 2가지 헤드라인 문구를 확인해 주세요.</p>
              </div>
            </div>
            <div class="flex items-start gap-4 bg-[#FAFBF8] border border-[#EAEFE0] p-4.5 rounded-2xl">
              <span class="w-7 h-7 rounded-xl bg-[#2F6517] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-neutral-800">더 끌리는 시안 투표 선택 및 간단 이유 작성</span>
                <p class="text-xs text-neutral-600 leading-relaxed font-medium">더 클릭하고 싶은 문구에 투표해 주시면 투표 즉시 적립됩니다.</p>
              </div>
            </div>
          `;
        }

        if (recruitsText) recruitsText.textContent = '5 / 100명';
        if (recruitsBar) recruitsBar.style.width = '5%';
        if (regDate) regDate.textContent = '2024. 11. 19.';
        if (endDate) endDate.textContent = '2024. 12. 03.';
        if (rewardMeta) rewardMeta.innerHTML = '100 <img src="/images/brand/logo-coin.png" class="w-3.5 h-3.5 inline" alt="돼지코인">';

        if (sidebarBadge) sidebarBadge.innerHTML = '<span>📢</span> <span>다른 제작자가 등록한 테스트입니다</span>';
        if (ctaBtn) ctaBtn.classList.remove('hidden');

      } else {
        // 3. MoneyLog Test: 가계부 앱 베타테스터 모집
        if (titleEl) titleEl.textContent = 'AI 영수증 인식 스마트 가계부 \'머니로그\' 베타테스터 모집';
        if (typeTag) {
          typeTag.textContent = '[프로덕트 테스트]';
          typeTag.className = 'px-3 py-1 rounded-md bg-[#EDF8E5] text-[#2F6517] text-xs font-bold border border-[#2F6517]/20';
        }
        if (timeTag) timeTag.innerHTML = '⏱️ 소요시간: 약 5분';
        if (rewardTag) rewardTag.innerHTML = '🪙 600 돼지코인';
        if (creatorName) creatorName.textContent = '제작자: 핀테크러버';
        if (creatorTools) creatorTools.innerHTML = '🛠️ 사용 툴: Next.js, Supabase, v0';
        if (creatorMeta) creatorMeta.innerHTML = '👥 참여 인원 및 기간: 총 3인, 10일';
        if (descText) descText.textContent = '안녕하세요! 영수증 사진 한 장만 찍으면 AI가 자동으로 지출 품목과 카테고리를 분류해 주는 스마트 가계부 \'머니로그\'를 만들었습니다. 기존 뱅킹앱이나 복잡한 가계부의 번거로움을 줄이고, 이번 달 예산 초과 알림과 지출 패턴 분석 기능을 중점적으로 검증하고자 합니다.';
        if (extraText) extraText.textContent = '카메라 영수증 OCR 인식과 대시보드 지출 분석 플로우가 실제 사용 환경에서 얼마나 직관적이고 편리한지 솔직한 피드백을 부탁드립니다.';
        if (mockupUrl) mockupUrl.textContent = 'moneylog-preview.io';
        if (mockupAuthor) mockupAuthor.textContent = '핀테크러버 ▾';

        // Sidebar 2-Column Meta Fields
        const sideType = document.getElementById('post-side-type');
        const sideMethod = document.getElementById('post-side-[#2F6517]');
        const sideDuration = document.getElementById('post-side-duration');
        const rewardCoinNum = document.getElementById('post-reward-coin-num');
        const toolsIcons = document.getElementById('post-tools-icons');

        if (sideType) sideType.textContent = '프로덕트 테스트';
        if (sideMethod) {
          sideMethod.textContent = '외부형';
          sideMethod.className = 'inline-block text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200';
        }
        if (sideDuration) sideDuration.textContent = '약 5분';
        if (rewardCoinNum) rewardCoinNum.textContent = '600 C';
        if (toolsIcons) {
          toolsIcons.innerHTML = `
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>🖤</span> Cursor</span>
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>▲</span> Next.js</span>
            <span class="inline-flex items-center gap-1 bg-[#F4F4F5] px-2.5 py-1 rounded-full text-neutral-700 text-[11px] font-bold"><span>⚡</span> v0</span>
          `;
        }

        if (mockupBody) {
          mockupBody.innerHTML = `
            <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">🐷</span>
                <span class="font-extrabold text-sm text-neutral-800">종목 알림 봇 대시보드 & 머니로그 AI</span>
              </div>
              <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">실시간 가동중</span>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">오늘 인식 영수증</span>
                <span class="text-lg font-extrabold text-neutral-800">5 건</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">카테고리 분류 정확도</span>
                <span class="text-lg font-extrabold text-primary-dark">98.4%</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                <span class="text-[10px] text-neutral-400 block mb-1">이번 달 예산 절감</span>
                <span class="text-lg font-extrabold text-[#BE185D]">185,000원</span>
              </div>
            </div>
            <div class="w-full h-32 bg-[#EFF6FF] rounded-xl border border-blue-100 p-4 flex items-center justify-center text-center">
              <div>
                <span class="text-xs font-bold text-blue-900 block mb-1">머니로그 AI 가계부 앱 UI 프리뷰</span>
                <span class="text-[11px] text-blue-600">지출 분석 차트, 예산 알림, 영수증 OCR 인식 모듈 탑재</span>
              </div>
            </div>
          `;
        }

        if (missionsContainer) {
          missionsContainer.innerHTML = `
            <div class="flex items-start gap-3.5 bg-[#FAFBF8] border border-[#EAEFE0] p-4 rounded-xl">
              <span class="w-6 h-6 rounded-full bg-primary-dark text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p class="text-xs sm:text-sm font-semibold text-neutral-800 leading-relaxed">
                이메일 간편가입 후 영수증 사진 1장 업로드 또는 간편 지출 입력해보기
              </p>
            </div>
            <div class="flex items-start gap-3.5 bg-[#FAFBF8] border border-[#EAEFE0] p-4 rounded-xl">
              <span class="w-6 h-6 rounded-full bg-primary-dark text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p class="text-xs sm:text-sm font-semibold text-neutral-800 leading-relaxed">
                '이번 달 지출 리포트' 탭에서 카테고리별 차트 및 예산 알림 확인하기
              </p>
            </div>
            <div class="flex items-start gap-3.5 bg-[#FAFBF8] border border-[#EAEFE0] p-4 rounded-xl">
              <span class="w-6 h-6 rounded-full bg-primary-dark text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p class="text-xs sm:text-sm font-semibold text-neutral-800 leading-relaxed">
                UI 가독성 및 영수증 인식 정확도/속도에 대한 솔직한 피드백 남기기
              </p>
            </div>
          `;
        }

        if (recruitsText) recruitsText.textContent = '28 / 50명';
        if (recruitsBar) recruitsBar.style.width = '56%';
        if (regDate) regDate.textContent = '2024. 11. 15.';
        if (endDate) endDate.textContent = '2024. 11. 30.';
        if (rewardMeta) rewardMeta.innerHTML = '600 <img src="/images/brand/logo-coin.png" class="w-3.5 h-3.5 inline" alt="돼지코인">';

        if (sidebarBadge) sidebarBadge.innerHTML = '<span>📢</span> <span>다른 제작자가 등록한 테스트입니다</span>';
        if (ctaBtn) ctaBtn.classList.remove('hidden');
        if (creatorOnlyActions) {
          creatorOnlyActions.classList.add('hidden');
          creatorOnlyActions.classList.remove('flex');
        }

        if (userParticipatedTests['moneylog']) {
          if (ctaBtn) {
            ctaBtn.disabled = true;
            ctaBtn.className = 'w-full py-4 px-4 rounded-xl bg-neutral-200 text-neutral-500 font-extrabold text-sm cursor-not-allowed flex items-center justify-center gap-2';
          }
          if (ctaBtnText) ctaBtnText.textContent = '✓ 테스터 참여 완료됨 (+600 돼지코인 수령)';
        } else {
          if (ctaBtn) {
            ctaBtn.disabled = false;
            ctaBtn.className = 'w-full py-4 px-4 rounded-xl bg-[#2F6517] hover:bg-[#25500F] active:scale-[0.98] text-white font-extrabold text-sm shadow-card transition-all flex items-center justify-center gap-2';
          }
          if (ctaBtnText) ctaBtnText.textContent = '미션 참여하기';
        }
      }

      // 테스트 미션 카드는 URL 대신 구경하기 버튼만 노출한다.
    }
