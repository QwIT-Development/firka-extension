function initializeTransformation() {
  const form = document.querySelector('form');
  const autocomplete = document.querySelector('.autocomplete');
  
  if (form && autocomplete) {
    applyFirkaStyling();
  } else {
    setTimeout(initializeTransformation, 500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeTransformation, 1000);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initializeTransformation, 1000);
}

function applyFirkaStyling() {
  try {
    const theme = cookieManager.get('themePreference') || localStorage.getItem('themePreference') || 'light-green';
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof loadingScreen !== 'undefined') {
      loadingScreen.hide();
    }
    const originalForm = document.querySelector('form');
    const instituteInput = document.querySelector('.autocomplete');
    const redirectButton = document.getElementById('redirectToInstitute');
    const instituteCodeInput = document.querySelector('.autocomplete-value');
    const requestToken = document.querySelector('input[name="__RequestVerificationToken"]');
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'firka-search-wrapper';
    const firkaHeader = document.createElement('div');
    firkaHeader.className = 'firka-header';
    firkaHeader.innerHTML = `
      <p class="logo-text">
        <img src="${chrome.runtime.getURL('images/firka_logo.png')}" alt="Firka" class="logo">
        Firka
      </p>
      <h1 class="search-title">Válassz iskolát</h1>
    `;
    const formContainer = document.createElement('div');
    formContainer.className = 'firka-form-container';
    const firkaFooter = document.createElement('div');
    firkaFooter.className = 'firka-footer';
    firkaFooter.innerHTML = `
      <a href="https://tudasbazis.ekreta.hu/pages/viewpage.action?pageId=4064926" 
         target="_blank" class="privacy-link">Adatkezelési tájékoztató</a>
    `;
    const existingWrapper = document.querySelector('.firka-search-wrapper');
    if (existingWrapper) {
      existingWrapper.remove();
    }
    searchWrapper.appendChild(firkaHeader);
    if (originalForm) {
      formContainer.appendChild(originalForm);
      searchWrapper.appendChild(formContainer);
    }
    searchWrapper.appendChild(firkaFooter);
    document.body.appendChild(searchWrapper);
    setupAutocompleteListeners();
    if (redirectButton) {
      redirectButton.addEventListener('click', function(event) {
        if (!instituteCodeInput.value) {
          event.preventDefault();
          alert(LanguageManager.t('search.select_institution'));
        }
      });
    }
    observeAutocompleteValue(instituteCodeInput, redirectButton);
  } catch (error) {
    console.error('Error applying Firka styling:', error);
  }
}

function setupAutocompleteListeners() {
  const autocompleteInput = document.querySelector('.autocomplete');
  const autocompleteValue = document.querySelector('.autocomplete-value');
  const redirectButton = document.getElementById('redirectToInstitute');
  
  if (autocompleteInput && autocompleteValue) {
    const observer = new MutationObserver((mutations) => {
      const dropdown = document.querySelector('.autocomplete-dropdown');
      if (dropdown) {
        dropdown.classList.add('dropdown-menu');
        const items = dropdown.querySelectorAll('li');
        items.forEach(item => {
          item.classList.add('dropdown-item');
          item.addEventListener('click', () => {
            if (redirectButton) {
              redirectButton.disabled = false;
            }
          });
        });
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

function observeAutocompleteValue(valueInput, button) {
  if (!valueInput || !button) return;

  const observer = new MutationObserver((mutations) => {
    button.disabled = !valueInput.value;
  });

  observer.observe(valueInput, {
    attributes: true,
    attributeFilter: ['value']
  });

  const checkInterval = setInterval(() => {
    if (valueInput.value) {
      button.disabled = false;
      clearInterval(checkInterval);
    }
  }, 500);
}