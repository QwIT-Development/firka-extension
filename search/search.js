// This script applies Firka styling to the KRÉTA institution search page
// It transforms the original page while preserving its functionality

// Wait for the page to be fully loaded before applying styling
function initializeTransformation() {
  // Check if the necessary elements exist before styling
  const form = document.querySelector('form');
  const autocomplete = document.querySelector('.autocomplete');
  
  if (form && autocomplete) {
    applyFirkaStyling();
  } else {
    // If elements aren't ready yet, wait a bit longer
    setTimeout(initializeTransformation, 500);
  }
}

// Add event listeners to ensure the script runs after the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait for the page to load, then initialize
  setTimeout(initializeTransformation, 1000);
});

// Also add a fallback in case the DOMContentLoaded event has already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initializeTransformation, 1000);
}

// Function to apply the Firka styling to the page
function applyFirkaStyling() {
  try {
    // Apply theme from user preferences
    const theme = cookieManager.get('themePreference') || localStorage.getItem('themePreference') || 'light-blue';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Hide the loading screen if it exists
    if (typeof loadingScreen !== 'undefined') {
      loadingScreen.hide();
    }
    
    // Get references to the original elements
    const originalForm = document.querySelector('form');
    const instituteInput = document.querySelector('.autocomplete');
    const redirectButton = document.getElementById('redirectToInstitute');
    const instituteCodeInput = document.querySelector('.autocomplete-value');
    const requestToken = document.querySelector('input[name="__RequestVerificationToken"]');
    
    // Create a wrapper for the Firka styling
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'firka-search-wrapper';
    
    // Create our Firka header
    const firkaHeader = document.createElement('div');
    firkaHeader.className = 'firka-header';
    firkaHeader.innerHTML = `
      <p class="logo-text">
        <img src="${chrome.runtime.getURL('images/firka_logo.png')}" alt="Firka" class="logo">
        Firka
      </p>
      <h1 class="search-title">Válassz iskolát</h1>
    `;
    
    // Create a container for the original form
    const formContainer = document.createElement('div');
    formContainer.className = 'firka-form-container';
    
    // Create a footer
    const firkaFooter = document.createElement('div');
    firkaFooter.className = 'firka-footer';
    firkaFooter.innerHTML = `
      <a href="https://tudasbazis.ekreta.hu/pages/viewpage.action?pageId=4064926" 
         target="_blank" class="privacy-link">Adatkezelési tájékoztató</a>
    `;
    
    // Check if the wrapper already exists to avoid duplicates
    const existingWrapper = document.querySelector('.firka-search-wrapper');
    if (existingWrapper) {
      existingWrapper.remove();
    }
    
    // Create the structure
    searchWrapper.appendChild(firkaHeader);
    
    // Move the original form into our container instead of replacing it
    if (originalForm) {
      formContainer.appendChild(originalForm);
      searchWrapper.appendChild(formContainer);
    }
    
    searchWrapper.appendChild(firkaFooter);
    
    // Add the wrapper to the page
    document.body.appendChild(searchWrapper);
    
    // Set up event listeners for the autocomplete dropdown
    setupAutocompleteListeners();
    
    // Add event listener to the redirect button
    if (redirectButton) {
      redirectButton.addEventListener('click', function(event) {
        // Only allow the redirect if an institute is selected
        if (!instituteCodeInput.value) {
          event.preventDefault();
          alert('Kérjük, válasszon egy intézményt a folytatáshoz!');
        }
      });
    }
    
    // Observe changes to the autocomplete value to enable/disable the button
    observeAutocompleteValue(instituteCodeInput, redirectButton);
    
  } catch (error) {
    console.error('Error applying Firka styling:', error);
  }
}

// Function to set up event listeners for the autocomplete dropdown
function setupAutocompleteListeners() {
  const autocompleteInput = document.querySelector('.autocomplete');
  const autocompleteValue = document.querySelector('.autocomplete-value');
  const redirectButton = document.getElementById('redirectToInstitute');
  
  if (autocompleteInput && autocompleteValue) {
    // Monitor for changes to the dropdown
    const observer = new MutationObserver((mutations) => {
      const dropdown = document.querySelector('.autocomplete-dropdown');
      if (dropdown) {
        // Ensure the dropdown has the right styling
        dropdown.classList.add('dropdown-menu');
        
        // Add event listeners to dropdown items
        const items = dropdown.querySelectorAll('li');
        items.forEach(item => {
          item.classList.add('dropdown-item');
          
          // When an item is clicked, update the input and enable the button
          item.addEventListener('click', () => {
            if (redirectButton) {
              redirectButton.disabled = false;
            }
          });
        });
      }
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Function to observe changes to the autocomplete value
function observeAutocompleteValue(valueInput, button) {
  if (!valueInput || !button) return;
  
  // Create an observer to watch for changes to the input value
  const observer = new MutationObserver((mutations) => {
    // Enable the button if a value is selected
    button.disabled = !valueInput.value;
  });
  
  // Observe changes to the input's attributes
  observer.observe(valueInput, {
    attributes: true,
    attributeFilter: ['value']
  });
  
  // Also check for changes using an interval as a fallback
  const checkInterval = setInterval(() => {
    if (valueInput.value) {
      button.disabled = false;
      clearInterval(checkInterval);
    }
  }, 500);
}