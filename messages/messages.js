(() => {
  async function waitForTranslations() {
    let attempts = 0;
    const maxAttempts = 200;
    while (
      (typeof window.LanguageManager === 'undefined') ||
      (window.LanguageManager && window.LanguageManager.t('navigation.dashboard') === 'navigation.dashboard')
    ) {
      if (attempts++ > maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  function formatDate(dateString) {
    if (!dateString) {
      return 'Ismeretlen dátum';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Érvénytelen dátum';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Ma';
    } else if (diffDays === 1) {
      return 'Tegnap';
    } else if (diffDays <= 7) {
      return `${diffDays} napja`;
    } else {
      return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  class APIManager {
    static async fetchMessages() {
      try {
        const response = await fetch('https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/beerkezett', {
          method: 'GET',
          headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': '8023',
                'x-csrf': '1',
                'x-uzenet-json-formatum': 'CamelCase'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401 && window.location.href.startsWith('https://eugyintezes.e-kreta.hu/uzenetek')) {
            window.location.reload();
            throw new Error('401');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    }

    static async fetchDeletedMessages() {
      const response = await fetch('https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/torolt', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-csrf': '1',
          'x-uzenet-json-formatum': 'CamelCase'
        }
      });
      if (!response.ok) {
        if (response.status === 401 && window.location.href.startsWith('https://eugyintezes.e-kreta.hu/uzenetek')) {
          window.location.reload();
          throw new Error('401');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }

    static async markMessagesRead(isRead, ids) {
      const payload = {
        isOlvasott: !!isRead,
        postaladaElemAzonositoLista: ids.map(Number)
      };
      const response = await fetch('https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/olvasott', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-csrf': '1',
          'x-uzenet-json-formatum': 'CamelCase'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        if (response.status === 401 && window.location.href.startsWith('https://eugyintezes.e-kreta.hu/uzenetek')) {
          window.location.reload();
          throw new Error('401');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    static async moveToTrash(ids, toTrash = true) {
      const payload = {
        isKuka: !!toTrash,
        postaladaElemAzonositoLista: ids.map(Number)
      };
      const response = await fetch('https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/kuka', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-csrf': '1',
          'x-uzenet-json-formatum': 'CamelCase'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        if (response.status === 401 && window.location.href.startsWith('https://eugyintezes.e-kreta.hu/uzenetek')) {
          window.location.reload();
          throw new Error('401');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
  }

  async function openMessageModal(messageId, isRead = true) {
    document.body.classList.add('modal-open');
    try {
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
          closeMessageModal();
        }
      };

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.innerHTML = `
        <div class="modal-header">
          <h2>Üzenet részletei</h2>
          <button class="modal-close" onclick="closeMessageModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>Üzenet betöltése...</p>
          </div>
        </div>
      `;
      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);

      if (!isRead) {
        try {
          await markMessageAsRead(messageId);
          const cardEl = document.querySelector(`.message-card[data-id="${messageId}"]`);
          if (cardEl) {
            cardEl.classList.remove('unread');
            const indicator = cardEl.querySelector('.unread-indicator');
            if (indicator) indicator.remove();
          }
        } catch (e) {
        }
      }

      const response = await fetch(`https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/${messageId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': '8023',
          'x-csrf': '1',
          'x-uzenet-json-formatum': 'CamelCase'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const messageData = await response.json();
      displayMessageDetails(modalContent, messageData);

    } catch (error) {
      console.error('Error loading message details:', error);
      const modalContent = document.querySelector('.modal-content');
      if (modalContent) {
        modalContent.querySelector('.modal-body').innerHTML = `
          <div class="error-content">
            <h3>Hiba történt</h3>
            <p>Az üzenet betöltése sikertelen.</p>
            <button class="retry-btn" onclick="openMessageModal(${messageId})">Újrapróbálás</button>
          </div>
        `;
      }
    }
  }

  function displayMessageDetails(modalContent, messageData) {
    const message = messageData.uzenet;
    const sender = message.feladoNev + (message.feladoTitulus ? ` (${message.feladoTitulus})` : '');
    const date = formatDate(message.kuldesDatum);
    const subject = message.targy || 'Nincs tárgy';
    const content = message.szoveg || 'Nincs tartalom';

    modalContent.querySelector('.modal-body').innerHTML = `
      <div class="message-details">
        <div class="message-info">
          <div class="info-row">
            <span class="info-label">Feladó:</span>
            <span class="info-value">${sanitizeHTML(sender)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Dátum:</span>
            <span class="info-value">${date}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tárgy:</span>
            <span class="info-value">${sanitizeHTML(subject)}</span>
          </div>
        </div>
        <div class="message-content">
          <h4>Üzenet tartalma:</h4>
          <div class="message-text">${content}</div>
        </div>
        ${message.csatolmanyok && message.csatolmanyok.length > 0 ? `
          <div class="message-attachments">
            <h4>Mellékletek:</h4>
            <ul>
              ${message.csatolmanyok.map(attachment => `
                <li><a href="#" onclick="downloadAttachment('${attachment.azonosito}')">${sanitizeHTML(attachment.nev)}</a></li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  function closeMessageModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      modalOverlay.remove();
    }
    document.body.classList.remove('modal-open');
  }
  window.openMessageModal = openMessageModal;
  window.closeMessageModal = closeMessageModal;

  function createLoadingState() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-state';
    loadingDiv.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>${LanguageManager.t('messages.loading', 'Üzenetek betöltése...')}</p>
      </div>
    `;
    return loadingDiv;
  }

  function createErrorState(onRetry) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h3>${LanguageManager.t('messages.error.title', 'Hiba történt')}</h3>
        <p>${LanguageManager.t('messages.error.description', 'Az üzenetek betöltése sikertelen volt.')}</p>
        <button class="retry-btn">${LanguageManager.t('messages.error.retry', 'Újrapróbálás')}</button>
      </div>
    `;
    
    const retryBtn = errorDiv.querySelector('.retry-btn');
    retryBtn.addEventListener('click', onRetry);
    
    return errorDiv;
  }

  function createEmptyState() {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.innerHTML = `
      <div class="empty-content">
        <h3>${LanguageManager.t('messages.empty.title', 'Nincsenek üzenetek')}</h3>
        <p>${LanguageManager.t('messages.empty.description', 'Jelenleg nincsenek elérhető üzenetek.')}</p>
      </div>
    `;
    return emptyDiv;
  }

  function createMessageCard(message) {
    const card = document.createElement('div');
    card.className = `message-card ${message.isElolvasva ? '' : 'unread'}`;
    card.dataset.id = String(message.azonosito);
    card.onclick = () => {
      if (selectionMode) {
        toggleSelect(message.azonosito, card);
        return;
      }
      openMessageModal(message.azonosito, !!message.isElolvasva);
    };
    
    const senderName = message.uzenetFeladoNev || 'Ismeretlen feladó';
    const subject = message.uzenetTargy || 'Nincs tárgy';
    const date = formatDate(message.uzenetKuldesDatum);
    const hasAttachment = message.hasCsatolmany;
    
    card.innerHTML = `
      <div class="message-card-header">
        <div class="sender-info">
          <span class="sender-name">${sanitizeHTML(senderName)}</span>
          ${!message.isElolvasva ? '<span class="unread-indicator"></span>' : ''}
        </div>
        <div class="message-date">${date}</div>
      </div>
      <div class="message-subject">${sanitizeHTML(subject)}</div>
      ${hasAttachment ? '<div class="attachment-indicator">📎</div>' : ''}
    `;
    
    
    return card;
  }

  async function markMessageAsRead(messageId) {
    const payload = {
      isOlvasott: true,
      postaladaElemAzonositoLista: [Number(messageId)]
    };
    const response = await fetch('https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/olvasott', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-csrf': '1',
        'x-uzenet-json-formatum': 'CamelCase'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      if (response.status === 401 && window.location.href.startsWith('https://eugyintezes.e-kreta.hu/uzenetek')) {
        window.location.reload();
        throw new Error('401');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  function createMessagesGrid(messages) {
    const gridContainer = document.createElement('div');
    gridContainer.className = 'messages-grid';
    
    if (messages.length === 0) {
      return createEmptyState();
    }
    
    messages.forEach(message => {
      const messageCard = createMessageCard(message);
      gridContainer.appendChild(messageCard);
    });
    
    return gridContainer;
  }

  let currentView = 'inbox';
  let selectionMode = false;
  const selection = new Set();

  function renderBulkActions(container) {
    const bulk = document.createElement('div');
    bulk.className = 'bulk-actions-card';
    bulk.innerHTML = `
      <div class="bulk-actions-left">
        <div class="view-toggle">
          <button id="viewInboxBtn" class="${currentView==='inbox'?'active':''}" title="Beérkezett">
            <img src="${chrome.runtime.getURL('icons/messages-active.svg')}" alt="Beérkezett">
          </button>
          <button id="viewTrashBtn" class="${currentView==='trash'?'active':''}" title="Törölt">
            <img src="${chrome.runtime.getURL('icons/delete.svg')}" alt="Törölt">
          </button>
        </div>
        <button id="toggleSelectionModeBtn" class="bulk-btn" title="Kijelölés mód">
          <img src="${chrome.runtime.getURL('icons/select.svg')}" alt="Kijelölés mód">
        </button>
        <button id="selectAllBtn" class="bulk-btn" title="Mind kijelöl">
          <img src="${chrome.runtime.getURL('icons/select-all.svg')}" alt="Mind kijelöl">
        </button>
        <button id="clearSelectionBtn" class="bulk-btn" title="Kijelölés törlése">
          <img src="${chrome.runtime.getURL('icons/select-none.svg')}" alt="Kijelölés törlése">
        </button>
      </div>
      <div class="bulk-actions-right">
        <button id="markReadBtn" class="bulk-btn" title="Olvasott">
          <img src="${chrome.runtime.getURL('icons/eye-on.svg')}" alt="Olvasott">
        </button>
        <button id="markUnreadBtn" class="bulk-btn" title="Olvasatlan">
          <img src="${chrome.runtime.getURL('icons/eye-off.svg')}" alt="Olvasatlan">
        </button>
        <button id="deleteBtn" class="bulk-btn" title="Törlés">
          <img src="${chrome.runtime.getURL('icons/trash.svg')}" alt="Törlés">
        </button>
        <button id="restoreBtn" class="bulk-btn" title="Visszaállítás">
          <img src="${chrome.runtime.getURL('icons/undo.svg')}" alt="Visszaállítás">
        </button>
      </div>
    `;
    container.appendChild(bulk);

    bulk.querySelector('#viewInboxBtn').addEventListener('click', () => switchView('inbox'));
    bulk.querySelector('#viewTrashBtn').addEventListener('click', () => switchView('trash'));
    bulk.querySelector('#toggleSelectionModeBtn').addEventListener('click', toggleSelectionMode);
    bulk.querySelector('#selectAllBtn').addEventListener('click', selectAllVisible);
    bulk.querySelector('#clearSelectionBtn').addEventListener('click', clearSelection);
    bulk.querySelector('#markReadBtn').addEventListener('click', () => bulkMark(true));
    bulk.querySelector('#markUnreadBtn').addEventListener('click', () => bulkMark(false));
    bulk.querySelector('#deleteBtn').addEventListener('click', bulkDelete);
    bulk.querySelector('#restoreBtn').addEventListener('click', bulkRestore);
    updateBulkActionsState();
  }

  function updateBulkActionsState() {
    const ids = Array.from(selection);
    const bulk = document.querySelector('.bulk-actions-card');
    if (!bulk) return;
    const disableAll = ids.length === 0;
    bulk.querySelector('#markReadBtn').disabled = disableAll || currentView !== 'inbox';
    bulk.querySelector('#markUnreadBtn').disabled = disableAll || currentView !== 'inbox';
    bulk.querySelector('#deleteBtn').disabled = disableAll || currentView !== 'inbox';
    bulk.querySelector('#restoreBtn').disabled = disableAll || currentView !== 'trash';
  }

  function selectAllVisible() {
    const cards = document.querySelectorAll('.messages-grid .message-card');
    cards.forEach(card => {
      const id = parseInt(card.dataset.id);
      selection.add(id);
      card.classList.add('selected');
    });
    updateBulkActionsState();
  }

  function clearSelection() {
    selection.clear();
    document.querySelectorAll('.messages-grid .message-card.selected').forEach(card => card.classList.remove('selected'));
    updateBulkActionsState();
  }

  function toggleSelect(id, card) {
    if (selection.has(id)) {
      selection.delete(id);
      card.classList.remove('selected');
    } else {
      selection.add(id);
      card.classList.add('selected');
    }
    updateBulkActionsState();
  }

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    const btn = document.getElementById('toggleSelectionModeBtn');
    if (btn) {
      btn.classList.toggle('active', selectionMode);
      btn.title = selectionMode ? 'Kilépés kijelölésből' : 'Kijelölés mód';
    }
    if (!selectionMode) {
      clearSelection();
    }
  }

  async function bulkMark(isRead) {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    await APIManager.markMessagesRead(isRead, ids);
    ids.forEach(id => {
      const card = document.querySelector(`.message-card[data-id="${id}"]`);
      if (!card) return;
      if (isRead) {
        card.classList.remove('unread');
        const ind = card.querySelector('.unread-indicator');
        if (ind) ind.remove();
      } else {
        card.classList.add('unread');
        if (!card.querySelector('.unread-indicator')) {
          const senderInfo = card.querySelector('.sender-info');
          const span = document.createElement('span');
          span.className = 'unread-indicator';
          senderInfo.appendChild(span);
        }
      }
    });
    clearSelection();
  }

  async function bulkDelete() {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    await APIManager.moveToTrash(ids, true);
    ids.forEach(id => {
      const card = document.querySelector(`.message-card[data-id="${id}"]`);
      if (card) card.remove();
    });
    clearSelection();
  }

  async function bulkRestore() {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    await APIManager.moveToTrash(ids, false);
    ids.forEach(id => {
      const card = document.querySelector(`.message-card[data-id="${id}"]`);
      if (card) card.remove();
    });
    clearSelection();
  }

async function switchView(view) {
  if (currentView === view) return;
  currentView = view;
  if (selectionMode) toggleSelectionMode();
  clearSelection();
    const container = document.querySelector('.messages-container');
    const grid = container.querySelector('.messages-grid') || container.querySelector('.empty-state') || container.querySelector('.error-state');
    if (grid) grid.remove();
    const toggleInbox = document.getElementById('viewInboxBtn');
    const toggleTrash = document.getElementById('viewTrashBtn');
    if (toggleInbox && toggleTrash) {
      toggleInbox.classList.toggle('active', currentView==='inbox');
      toggleTrash.classList.toggle('active', currentView==='trash');
    }
    const loadingState = createLoadingState();
    container.appendChild(loadingState);
    if (view === 'inbox') {
      await loadMessages(container);
    } else {
      await loadDeleted(container);
    }
  }

  async function transformMessagesPage() {
    try {
      await waitForTranslations();
      document.body.innerHTML = '';
      const kretaContainer = document.createElement('div');
      kretaContainer.className = 'kreta-container';
      const headerDiv = document.createElement('div');
      const parser = new DOMParser();
      const headerDoc = parser.parseFromString(await createTemplate.header(), 'text/html');
      const headerContent = headerDoc.body;
      while (headerContent.firstChild) {
        headerDiv.appendChild(headerContent.firstChild);
      }
      kretaContainer.appendChild(headerDiv);

      const main = document.createElement('main');
      main.className = 'kreta-main';

      const messagesContainer = document.createElement('div');
      messagesContainer.className = 'messages-container';

      renderBulkActions(main);
      const loadingState = createLoadingState();
      messagesContainer.appendChild(loadingState);
      
      main.appendChild(messagesContainer);
      kretaContainer.appendChild(main);
      document.body.appendChild(kretaContainer);

      if (typeof setupUserDropdown === 'function') {
        setupUserDropdown();
      }
      if (typeof setupMobileNavigation === 'function') {
        setupMobileNavigation();
      }

      await loadMessages(messagesContainer);
      
      loadingScreen.hide();
      
    } catch (error) {
      console.error('Error transforming messages page:', error);
      loadingScreen.hide();
    }
  }

  async function loadMessages(container) {
    try {
      const messages = await APIManager.fetchMessages();

      messages.sort((a, b) => {
        const dateA = new Date(a.uzenetKuldesDatum);
        const dateB = new Date(b.uzenetKuldesDatum);
        return dateB - dateA;
      });

      const loadingState = container.querySelector('.loading-state');
      if (loadingState) {
        loadingState.remove();
      }

      const messagesGrid = createMessagesGrid(messages);
      container.appendChild(messagesGrid);
      
    } catch (error) {
      console.error('Error loading messages:', error);

      const loadingState = container.querySelector('.loading-state');
      if (loadingState) {
        loadingState.remove();
      }

      const errorState = createErrorState(() => loadMessages(container));
      container.appendChild(errorState);
    }
  }

  async function loadDeleted(container) {
    try {
      const messages = await APIManager.fetchDeletedMessages();
      messages.sort((a, b) => {
        const dateA = new Date(a.uzenetKuldesDatum);
        const dateB = new Date(b.uzenetKuldesDatum);
        return dateB - dateA;
      });
      const loadingState = container.querySelector('.loading-state');
      if (loadingState) {
        loadingState.remove();
      }
      const messagesGrid = createMessagesGrid(messages);
      container.appendChild(messagesGrid);
    } catch (error) {
      const loadingState = container.querySelector('.loading-state');
      if (loadingState) {
        loadingState.remove();
      }
      const errorState = createErrorState(() => loadDeleted(container));
      container.appendChild(errorState);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', transformMessagesPage);
  } else {
    transformMessagesPage();
  }
})();
