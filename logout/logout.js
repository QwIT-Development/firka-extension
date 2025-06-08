(() => {
  function loadFonts() {
    // Create a new style element
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
      @import url('https://fonts.googleapis.com/icon?family=Material+Icons+Round');
    `;
    document.head.appendChild(style);
  }
  function transformLogoutPage() {
    // Get current theme and school ID from cookies
    const theme = cookieManager.get('themePreference') || localStorage.getItem('themePreference') || 'light-green';
    const instituteCode = cookieManager.get('schoolSubdomain');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Create new HTML structure
    const newHTML = `
      <div class="logout-container">
        <header class="logout-header">
          <p class="logo-text">
            <img src=${chrome.runtime.getURL('images/firka_logo.png')} alt="Firka" class="logo">
            Firka
          </p>
        </header>
    
        <div class="logout-card">
          <div class="logout-message">
            <strong>Sikeres kijelentkezés!</strong>
          </div>
          
          <div class="redirect-timer" id="automaticRedirectTimer">5</div>
          
          <a href="https://${instituteCode}.e-kreta.hu" class="btn-continue">Tovább</a>
        </div>
    
        <footer class="logout-footer">
          <a href="https://tudasbazis.ekreta.hu/pages/viewpage.action?pageId=4064926" 
             target="_blank" class="privacy-link">
            Adatkezelési tájékoztató
          </a>
        </footer>
      </div>
    `;
    
    // Replace body content
    document.body.innerHTML = newHTML;
    
    // Start countdown timer
    const timerElement = document.getElementById('automaticRedirectTimer');
    let remainingTime = 5;
    
    const countdownInterval = setInterval(() => {
      remainingTime--;
      if (timerElement) {
        timerElement.textContent = remainingTime;
      }
    
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        window.location.href = `https://${instituteCode}.e-kreta.hu`;
      }
    }, 1000);
    
    // Handle manual redirect click
    document.querySelector('.btn-continue')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearInterval(countdownInterval);
      window.location.href = `https://${instituteCode}.e-kreta.hu`;
    });
  }
  // Load fonts immediately
  loadFonts();
  // Run the transformation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', transformLogoutPage);
  } else {
    transformLogoutPage();
  }
})();