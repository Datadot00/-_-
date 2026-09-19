    window.initSupabaseLiveDB = async function() {
      if (!window.donDwaeDataService || !window.donDwaeDataService.supabase) {
        renderExploreFeedState('error');
        return;
      }
      const ds = window.donDwaeDataService;
      if (!Array.isArray(window.liveExploreProjects)) {
        renderExploreFeedState('loading');
      }

      try {
        const { data: { session } } = await ds.supabase.auth.getSession();
        const isLoggedIn = !!session?.user;
        if (typeof window.updateHeaderAuthUI === 'function') {
          window.updateHeaderAuthUI(isLoggedIn);
        }
        const userId = session?.user?.id || null;
        window.currentFeedUserId = userId;
        const liveProjectsPromise = ds.fetchExploreProjects().then(projects => {
          if (Array.isArray(projects)) {
            window.renderLiveProjectsToFeed(projects);
          } else if (!Array.isArray(window.liveExploreProjects)) {
            renderExploreFeedState('error');
          }
          return projects;
        });
        const marketItemsPromise = ds.fetchMarketplaceItems();

        if (isLoggedIn && userId) {
          const [profile, stats, registeredProjects, participatedProjects, scrapRows, wallet, coinTransactions, exchanges, notifications] = await Promise.all([
            ds.fetchUserProfile(userId),
            ds.fetchUserAggregateStats(userId),
            ds.fetchMyProjects(userId, 'registered'),
            ds.fetchMyProjects(userId, 'participated'),
            ds.fetchUserScraps(userId),
            ds.fetchUserWallet(userId),
            ds.fetchCoinTransactions(userId),
            ds.fetchUserExchanges(userId),
            ds.fetchUserNotifications(userId)
          ]);
          const emailPrefix = session.user.email?.split('@')[0] || '로그인 사용자';
          const activeNick = profile?.nickname || session.user.user_metadata?.nickname || emailPrefix;
          const activeBio = profile?.bio || '프로필 소개를 입력해 주세요.';
          window.userHasPassedGating = profile?.has_passed_gating || false;
          window.completedTestCountFromDB = Number(profile?.completed_test_count || 0);
          window.saveProfileChangesLocal(activeNick, activeBio);
          updatePledgeModalUI();

          const scrapedProjects = scrapRows.map(row => row.projects).filter(Boolean);
          window.myProjectCollections = {
            registered: registeredProjects,
            participated: participatedProjects,
            scraped: scrapedProjects
          };

          renderMyDashboardStats(stats, registeredProjects, participatedProjects, scrapedProjects);

          renderMyProjectCollection(currentMyProjectTab);
          window.renderMyCoinData(wallet, coinTransactions, exchanges);

          if (notifications) {
            window.notificationsData = notifications.map(n => ({
              id: n.id,
              user_id: n.user_id,
              type: n.type || 'app_update',
              title: n.title,
              content: n.message || n.content || '',
              related_id: n.target_url || 'explore',
              is_read: n.is_read,
              created_at: n.created_at
            }));
            if (typeof window.renderNotificationsUI === 'function') window.renderNotificationsUI();
          }

          // Subscribe to Realtime reviews on creator's registered projects
          if (ds.supabase && registeredProjects.length > 0) {
            try {
              ds.supabase
                .channel('realtime-creator-reviews-' + userId)
                .on(
                  'postgres_changes',
                  { event: 'INSERT', schema: 'public', table: 'reviews' },
                  async (payload) => {
                    const newRev = payload.new;
                    if (!newRev || !newRev.project_id) return;
                    const matchedProj = registeredProjects.find(p => String(p.id) === String(newRev.project_id));
                    if (matchedProj) {
                      showGoalAchievedModal(matchedProj);
                      showGenericToast(`🔔 '${matchedProj.service_name || matchedProj.title}' 프로젝트에 새로운 테스터 리뷰가 등록되었습니다!`, '⭐');
                      if (currentPostId === matchedProj.id) {
                        renderDetailReviews(matchedProj.id, matchedProj);
                      }
                    }
                  }
                )
                .subscribe();
            } catch (rtErr) {
              console.warn('[Realtime] Review subscription notice:', rtErr);
            }
          }
        }

        const [liveProjects, marketItems] = await Promise.all([
          liveProjectsPromise,
          marketItemsPromise
        ]);
        if (Array.isArray(liveProjects)) {
          window.renderLiveProjectsToFeed(liveProjects);
        }

        renderMarketProducts(marketItems);

      } catch (err) {
        console.warn('[Don Dwae DB] Live sync init warning:', err.message);
        if (!Array.isArray(window.liveExploreProjects)) {
          renderExploreFeedState('error');
        }
      }
    };
