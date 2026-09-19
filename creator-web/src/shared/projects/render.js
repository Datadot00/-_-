    function renderProjectPersonalBadge(state, projectId = '') {
      if (state === 'owned') {
        return `
          <span class="inline-flex items-center gap-1.5 rounded-full border border-[#9BCB68] bg-[#DFF6C5]/95 px-3 py-1.5 text-[11px] font-black text-[#234D10] shadow-sm backdrop-blur-sm">
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-[#2F6517] text-[9px] text-white">나</span>
            내 프로젝트
          </span>`;
      }
      if (state === 'completed') {
        return `
          <span class="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-[#18181B]/90 px-3 py-1.5 text-[11px] font-black text-white shadow-sm backdrop-blur-sm">
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] text-[#18181B]">✓</span>
            참여완료
          </span>`;
      }
      if (state === 'review-needed') {
        return `
          <button type="button" onclick="event.stopPropagation(); resumeProjectReview('${escapeHtml(String(projectId || ''))}')"
            class="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#F0C75E] bg-[#FFF7D6]/95 px-3 py-1.5 text-[11px] font-black text-[#7A4B00] shadow-sm backdrop-blur-sm hover:bg-[#FFEEA8] transition-colors">
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-[#D97706] text-[9px] text-white">✍</span>
            리뷰 작성 필요
          </button>`;
      }
      return '';
    }
