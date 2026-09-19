    function renderProfileSnsLinks(links = []) {
      const container = document.getElementById('sns-links-container');
      if (!container) return;
      container.innerHTML = '';
      const safeLinks = links.filter(link => typeof link === 'string').slice(0, 5);
      (safeLinks.length ? safeLinks : ['']).forEach(link => container.appendChild(createSnsLinkRow(link)));
    }
