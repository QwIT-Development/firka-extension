(() => {
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
  }

  async function openMessageModal(messageId) {
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
    card.onclick = () => {
      openMessageModal(message.azonosito);
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

  async function transformMessagesPage() {
    try {
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', transformMessagesPage);
  } else {
    transformMessagesPage();
  }
})();
