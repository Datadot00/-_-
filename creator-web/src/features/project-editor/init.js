    function applyProjectStartDateLimit() {
      const startInput = document.getElementById('input-start-date');
      const endInput = document.getElementById('input-end-date');
      if (!startInput) return;

      const today = getTodayDateValue();
      const savedStart = startInput.value || '';
      startInput.min = savedStart && savedStart < today ? savedStart : today;
      if (endInput) endInput.min = startInput.value || startInput.min;
    }

    window.applyProjectStartDateLimit = applyProjectStartDateLimit;

    function initializeProjectDateDefaults({ force = false } = {}) {
      const startInput = document.getElementById('input-start-date');
      const endInput = document.getElementById('input-end-date');
      const formatLocalDate = date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const today = new Date();
      const defaultEnd = new Date(today);
      defaultEnd.setDate(defaultEnd.getDate() + 14);
      if (startInput && (force || !startInput.value)) startInput.value = formatLocalDate(today);
      if (endInput && (force || !endInput.value)) endInput.value = formatLocalDate(defaultEnd);
      applyProjectStartDateLimit();
    }

    function initializeProjectEditingState() {
      if (activeEditingProjectId) {
      const createView = document.getElementById('view-create');
      if (createView) createView.dataset.editingProjectId = activeEditingProjectId;
    }
    }
