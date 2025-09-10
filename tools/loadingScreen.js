const loadingScreen = {
  show() {
    document.body.classList.remove("loaded");
    const existingLoadingScreen = document.querySelector(".loading-screen");
    if (existingLoadingScreen) return;

    const loadingScreen = document.createElement("div");
    loadingScreen.className = "loading-screen";
    
    const loadingContent = document.createElement('div');
    loadingContent.className = 'loading-content';
    
    const loadingLogo = document.createElement('img');
    loadingLogo.src = chrome.runtime.getURL("images/loading.gif");
    loadingLogo.alt = 'Firka';
    loadingLogo.className = 'loading-logo';
    
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.setAttribute('data-i18n', 'loading.text');
    loadingText.textContent = 'Betöltés alatt...';
    
    const loadingText2 = document.createElement('div');
    loadingText2.className = 'loading-text2';
    loadingText2.setAttribute('data-i18n', 'loading.subtext');
    loadingText2.textContent = 'Kis türelmet!';
    
    loadingContent.appendChild(loadingLogo);
    loadingContent.appendChild(loadingText);
    loadingContent.appendChild(loadingText2);
    loadingScreen.appendChild(loadingContent);
    document.body.appendChild(loadingScreen);
    document.body.classList.add("loaded");
  },

  hide() {
    document.body.classList.add("loaded");
    const loadingScreen = document.querySelector(".loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";

      const removeLoadingScreen = () => {
        if (loadingScreen && loadingScreen.parentNode) {
          loadingScreen.remove();
        }
      };

      loadingScreen.addEventListener("transitionend", removeLoadingScreen, {
        once: true,
      });
      setTimeout(removeLoadingScreen, 500);
    }
  },
};

window.addEventListener("DOMContentLoaded", () => {
  const manifest = chrome.runtime.getManifest();
  const urls = [];

  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script) => {
      if (script.matches) {
        urls.push(...script.matches);
      }
    });
  }

  const currentUrl = location.href;
  const shouldShowLoading = urls.some((urlPattern) => {
    const regex = new RegExp(urlPattern.replace(/\*/g, '.*'));
    return regex.test(currentUrl);
  });
  
  if (shouldShowLoading) {
    loadingScreen.show();
  }
});
