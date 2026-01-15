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
    return div.textContent;
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
      
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      const modalTitle = document.createElement('h2');
      modalTitle.textContent = 'Üzenet részletei';
      const modalClose = document.createElement('button');
      modalClose.className = 'modal-close';
      modalClose.textContent = '×';
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(modalClose);
      
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      const loadingContent = document.createElement('div');
      loadingContent.className = 'loading-content';
      const loadingSpinner = document.createElement('div');
      loadingSpinner.className = 'loading-spinner';
      const loadingText = document.createElement('p');
      loadingText.textContent = 'Üzenet betöltése...';
      loadingContent.appendChild(loadingSpinner);
      loadingContent.appendChild(loadingText);
      modalBody.appendChild(loadingContent);
      
      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      
      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);
      
      const closeBtn = modalContent.querySelector('.modal-close');
      closeBtn.addEventListener('click', closeMessageModal);

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
        const modalBody = modalContent.querySelector('.modal-body');
        helper.clearElement(modalBody);
        
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        const errorTitle = document.createElement('h3');
        errorTitle.textContent = 'Hiba történt';
        const errorText = document.createElement('p');
        errorText.textContent = 'Az üzenet betöltése sikertelen.';
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Újrapróbálás';
        retryBtn.onclick = () => openMessageModal(messageId);
        
        errorContent.appendChild(errorTitle);
        errorContent.appendChild(errorText);
        errorContent.appendChild(retryBtn);
        modalBody.appendChild(errorContent);
      }
    }
  }

  function displayMessageDetails(modalContent, messageData) {
    const message = messageData.uzenet;
    const sender = message.feladoNev + (message.feladoTitulus ? ` (${message.feladoTitulus})` : '');
    const date = formatDate(message.kuldesDatum);
    const subject = message.targy || 'Nincs tárgy';
    const content = message.szoveg || 'Nincs tartalom';

    const modalBody = modalContent.querySelector('.modal-body');
    helper.clearElement(modalBody);
    
    const messageDetails = document.createElement('div');
    messageDetails.className = 'message-details';
    
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
 
    const senderRow = document.createElement('div');
    senderRow.className = 'info-row';
    const senderLabel = document.createElement('span');
    senderLabel.className = 'info-label';
    senderLabel.textContent = 'Feladó:';
    const senderValue = document.createElement('span');
    senderValue.className = 'info-value';
    senderValue.textContent = sanitizeHTML(sender);
    senderRow.appendChild(senderLabel);
    senderRow.appendChild(senderValue);
    messageInfo.appendChild(senderRow);

    const dateRow = document.createElement('div');
    dateRow.className = 'info-row';
    const dateLabel = document.createElement('span');
    dateLabel.className = 'info-label';
    dateLabel.textContent = 'Dátum:';
    const dateValue = document.createElement('span');
    dateValue.className = 'info-value';
    dateValue.textContent = date;
    dateRow.appendChild(dateLabel);
    dateRow.appendChild(dateValue);
    messageInfo.appendChild(dateRow);

    const subjectRow = document.createElement('div');
    subjectRow.className = 'info-row';
    const subjectLabel = document.createElement('span');
    subjectLabel.className = 'info-label';
    subjectLabel.textContent = 'Tárgy:';
    const subjectValue = document.createElement('span');
    subjectValue.className = 'info-value';
    subjectValue.textContent = sanitizeHTML(subject);
    subjectRow.appendChild(subjectLabel);
    subjectRow.appendChild(subjectValue);
    messageInfo.appendChild(subjectRow);
    
    messageDetails.appendChild(messageInfo);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    const contentTitle = document.createElement('h4');
    contentTitle.textContent = 'Üzenet tartalma:';
    messageContent.appendChild(contentTitle);
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.innerHTML = content;

    messageContent.appendChild(messageText);
    messageDetails.appendChild(messageContent);

    if (message.csatolmanyok && message.csatolmanyok.length > 0) {
      const messageAttachments = document.createElement('div');
      messageAttachments.className = 'message-attachments';
      const attachTitle = document.createElement('h4');
      attachTitle.textContent = 'Mellékletek:';
      messageAttachments.appendChild(attachTitle);
      
      const attachList = document.createElement('ul');
      message.csatolmanyok.forEach(attachment => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = sanitizeHTML(attachment.nev);
        a.onclick = () => downloadAttachment(attachment.azonosito);
        li.appendChild(a);
        attachList.appendChild(li);
      });
      messageAttachments.appendChild(attachList);
      messageDetails.appendChild(messageAttachments);
    }
    
    modalBody.appendChild(messageDetails);
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
    
    const loadingContent = document.createElement('div');
    loadingContent.className = 'loading-content';
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    const text = document.createElement('p');
    text.textContent = LanguageManager.t('messages.loading', 'Üzenetek betöltése...');
    loadingContent.appendChild(spinner);
    loadingContent.appendChild(text);
    loadingDiv.appendChild(loadingContent);
    
    return loadingDiv;
  }

  function createErrorState(onRetry) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    
    const errorContent = document.createElement('div');
    errorContent.className = 'error-content';
    const title = document.createElement('h3');
    title.textContent = LanguageManager.t('messages.error.title', 'Hiba történt');
    const desc = document.createElement('p');
    desc.textContent = LanguageManager.t('messages.error.description', 'Az üzenetek betöltése sikertelen volt.');
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = LanguageManager.t('messages.error.retry', 'Újrapróbálás');
    retryBtn.addEventListener('click', onRetry);
    
    errorContent.appendChild(title);
    errorContent.appendChild(desc);
    errorContent.appendChild(retryBtn);
    errorDiv.appendChild(errorContent);
    
    return errorDiv;
  }

  function createEmptyState() {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    
    const emptyContent = document.createElement('div');
    emptyContent.className = 'empty-content';
    const title = document.createElement('h3');
    title.textContent = LanguageManager.t('messages.empty.title', 'Nincsenek üzenetek');
    const desc = document.createElement('p');
    desc.textContent = LanguageManager.t('messages.empty.description', 'Jelenleg nincsenek elérhető üzenetek.');
    
    emptyContent.appendChild(title);
    emptyContent.appendChild(desc);
    emptyDiv.appendChild(emptyContent);
    
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

    const cardHeader = document.createElement('div');
    cardHeader.className = 'message-card-header';
    
    const senderInfo = document.createElement('div');
    senderInfo.className = 'sender-info';
    const senderNameSpan = document.createElement('span');
    senderNameSpan.className = 'sender-name';
    senderNameSpan.textContent = sanitizeHTML(senderName);
    senderInfo.appendChild(senderNameSpan);
    
    if (!message.isElolvasva) {
      const unreadIndicator = document.createElement('span');
      unreadIndicator.className = 'unread-indicator';
      senderInfo.appendChild(unreadIndicator);
    }
    
    const messageDate = document.createElement('div');
    messageDate.className = 'message-date';
    messageDate.textContent = date;
    
    cardHeader.appendChild(senderInfo);
    cardHeader.appendChild(messageDate);
    card.appendChild(cardHeader);
    
    const messageSubject = document.createElement('div');
    messageSubject.className = 'message-subject';
    messageSubject.textContent = sanitizeHTML(subject);
    card.appendChild(messageSubject);
    
    if (hasAttachment) {
      const attachmentIndicator = document.createElement('div');
      attachmentIndicator.className = 'attachment-indicator';
      attachmentIndicator.textContent = '📎';
      card.appendChild(attachmentIndicator);
    }
    
    
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

    const bulkActionsLeft = document.createElement('div');
    bulkActionsLeft.className = 'bulk-actions-left';
    
    const viewToggle = document.createElement('div');
    viewToggle.className = 'view-toggle';
    
    const viewInboxBtn = document.createElement('button');
    viewInboxBtn.id = 'viewInboxBtn';
    viewInboxBtn.className = currentView === 'inbox' ? 'active' : '';
    viewInboxBtn.title = 'Beérkezett';
    const inboxImg = document.createElement('img');
    inboxImg.src = chrome.runtime.getURL('icons/messages-active.svg');
    inboxImg.alt = 'Beérkezett';
    viewInboxBtn.appendChild(inboxImg);
    
    const viewTrashBtn = document.createElement('button');
    viewTrashBtn.id = 'viewTrashBtn';
    viewTrashBtn.className = currentView === 'trash' ? 'active' : '';
    viewTrashBtn.title = 'Törölt';
    const trashImg = document.createElement('img');
    trashImg.src = chrome.runtime.getURL('icons/delete.svg');
    trashImg.alt = 'Törölt';
    viewTrashBtn.appendChild(trashImg);
    
    viewToggle.appendChild(viewInboxBtn);
    viewToggle.appendChild(viewTrashBtn);
    bulkActionsLeft.appendChild(viewToggle);
    
    const toggleSelBtn = document.createElement('button');
    toggleSelBtn.id = 'toggleSelectionModeBtn';
    toggleSelBtn.className = 'bulk-btn';
    toggleSelBtn.title = 'Kijelölés mód';
    const selectImg = document.createElement('img');
    selectImg.src = chrome.runtime.getURL('icons/select.svg');
    selectImg.alt = 'Kijelölés mód';
    toggleSelBtn.appendChild(selectImg);
    bulkActionsLeft.appendChild(toggleSelBtn);
    
    const selectAllBtn = document.createElement('button');
    selectAllBtn.id = 'selectAllBtn';
    selectAllBtn.className = 'bulk-btn';
    selectAllBtn.title = 'Mind kijelöl';
    const selectAllImg = document.createElement('img');
    selectAllImg.src = chrome.runtime.getURL('icons/select-all.svg');
    selectAllImg.alt = 'Mind kijelöl';
    selectAllBtn.appendChild(selectAllImg);
    bulkActionsLeft.appendChild(selectAllBtn);
    
    const clearSelBtn = document.createElement('button');
    clearSelBtn.id = 'clearSelectionBtn';
    clearSelBtn.className = 'bulk-btn';
    clearSelBtn.title = 'Kijelölés törlése';
    const clearSelImg = document.createElement('img');
    clearSelImg.src = chrome.runtime.getURL('icons/select-none.svg');
    clearSelImg.alt = 'Kijelölés törlése';
    clearSelBtn.appendChild(clearSelImg);
    bulkActionsLeft.appendChild(clearSelBtn);
    
    bulk.appendChild(bulkActionsLeft);
    
    const bulkActionsRight = document.createElement('div');
    bulkActionsRight.className = 'bulk-actions-right';
    
    const markReadBtn = document.createElement('button');
    markReadBtn.id = 'markReadBtn';
    markReadBtn.className = 'bulk-btn';
    markReadBtn.title = 'Olvasott';
    const markReadImg = document.createElement('img');
    markReadImg.src = chrome.runtime.getURL('icons/eye-on.svg');
    markReadImg.alt = 'Olvasott';
    markReadBtn.appendChild(markReadImg);
    bulkActionsRight.appendChild(markReadBtn);
    
    const markUnreadBtn = document.createElement('button');
    markUnreadBtn.id = 'markUnreadBtn';
    markUnreadBtn.className = 'bulk-btn';
    markUnreadBtn.title = 'Olvasatlan';
    const markUnreadImg = document.createElement('img');
    markUnreadImg.src = chrome.runtime.getURL('icons/eye-off.svg');
    markUnreadImg.alt = 'Olvasatlan';
    markUnreadBtn.appendChild(markUnreadImg);
    bulkActionsRight.appendChild(markUnreadBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'deleteBtn';
    deleteBtn.className = 'bulk-btn';
    deleteBtn.title = 'Törlés';
    const deleteImg = document.createElement('img');
    deleteImg.src = chrome.runtime.getURL('icons/trash.svg');
    deleteImg.alt = 'Törlés';
    deleteBtn.appendChild(deleteImg);
    bulkActionsRight.appendChild(deleteBtn);
    
    const restoreBtn = document.createElement('button');
    restoreBtn.id = 'restoreBtn';
    restoreBtn.className = 'bulk-btn';
    restoreBtn.title = 'Visszaállítás';
    const restoreImg = document.createElement('img');
    restoreImg.src = chrome.runtime.getURL('icons/undo.svg');
    restoreImg.alt = 'Visszaállítás';
    restoreBtn.appendChild(restoreImg);
    bulkActionsRight.appendChild(restoreBtn);
    
    bulk.appendChild(bulkActionsRight);
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
      helper.clearElement(document.body);
      const kretaContainer = document.createElement('div');
      kretaContainer.className = 'kreta-container';
      const headerDiv = document.createElement('div');
      const template = document.createElement('template');
      template.innerHTML = await createTemplate.header();
      const headerContent = template.content;
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
