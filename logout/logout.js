(() => {
  function transformLogoutPage() {
    const theme =
      cookieManager.get("themePreference") ||
      localStorage.getItem("themePreference") ||
      "light-green";
    const instituteCode = cookieManager.get("schoolSubdomain");
    document.documentElement.setAttribute("data-theme", theme);

    const newHTML = `
      <div class="logout-container">
        <header class="logout-header">
          <p class="logo-text">
            <img src=${chrome.runtime.getURL("images/firka_logo.png")} alt="Firka" class="logo">
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
    document.body.innerHTML = '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHTML, 'text/html');
    const tempDiv = doc.body;
    while (tempDiv.firstChild) {
      document.body.appendChild(tempDiv.firstChild);
    }

    const timerElement = document.getElementById("automaticRedirectTimer");
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

    document.querySelector(".btn-continue")?.addEventListener("click", (e) => {
      e.preventDefault();
      clearInterval(countdownInterval);
      window.location.href = `https://${instituteCode}.e-kreta.hu`;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        if (typeof loadingScreen !== 'undefined') {
          loadingScreen.hide();
        }
      }, 100);
      transformLogoutPage();
    });
  } else {
    if (typeof loadingScreen !== 'undefined') {
      loadingScreen.hide();
    }
    transformLogoutPage();
  }
})();