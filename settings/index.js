document.addEventListener('DOMContentLoaded', async () => {
  
  function getCookie(name) {
      const cookieName = `${name}=`;
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookieArray = decodedCookie.split(';');
      
      for(let i = 0; i < cookieArray.length; i++) {
          let cookie = cookieArray[i];
          while (cookie.charAt(0) === ' ') {
              cookie = cookie.substring(1);
          }
          if (cookie.indexOf(cookieName) === 0) {
              return cookie.substring(cookieName.length, cookie.length);
          }
      }
      return null;
  }

  
  function setCookie(name, value, days = 365) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = `expires=${date.toUTCString()}`;
      document.cookie = `${name}=${value}; ${expires}; path=/; domain=.e-kreta.hu`;
  }
  
  async function getCurrentTheme() {
      try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTheme' });
          return response.theme;
      } catch (error) {
          console.error('Error getting current theme:', error);
          return 'default';
      }
  }
  
  function updateThemeButtons(currentTheme) {
      document.querySelectorAll('.theme-option').forEach(button => {
          const theme = button.dataset.theme;
          button.classList.toggle('active', theme === currentTheme);
          
          
          /*if (theme === 'light-blue' || theme === 'dark-blue' || theme === 'default') {
              button.classList.add('disabled');
              button.setAttribute('disabled', 'true');
          }*/
      });
  }
  
  
  function isThemeDisabled(theme) {
      return theme === 'default' || theme === 'dark-blue';
  }
  
  async function applyTheme(theme) {
      
      if (isThemeDisabled(theme)) {
          alert('Ez a téma jelenleg nem elérhető.');
          return;
      }
      
      
      setCookie('themePreference', theme);
      localStorage.setItem('themePreference', theme);
      
      
      document.documentElement.setAttribute('data-theme', theme);
      
      
      updateThemeButtons(theme);
      
      
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
              action: 'changeTheme',
              theme: theme
          }).catch(() => {
              
              console.log('Tab not ready for theme change:', tab.id);
          });
      });
  }
  
  
  const themeButtons = document.querySelectorAll('.theme-option');
  themeButtons.forEach(button => {
      button.addEventListener('click', () => {
          const theme = button.dataset.theme;
          
          
          if (button.hasAttribute('disabled')) {
              alert('Ez a téma jelenleg nem elérhető.');
              return;
          }
          
          applyTheme(theme);
      });
  });
  
  
  let initialTheme = localStorage.getItem('themePreference') || 
                      getCookie('themePreference') || 
                      await getCurrentTheme() || 
                      'light-green';
  
  
  if (isThemeDisabled(initialTheme)) {
      initialTheme = 'light-green';
  }
  
  
  await applyTheme(initialTheme);
  
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'themeChanged') {
          updateThemeButtons(message.theme);
          document.documentElement.setAttribute('data-theme', message.theme);
      }
  });
  
  
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `v${manifest.version}`;
  
  
  themeButtons.forEach(button => {
      button.addEventListener('mouseover', () => {
          if (!button.hasAttribute('disabled')) {
              button.style.transform = 'translateY(-2px)';
          }
      });
      
      button.addEventListener('mouseout', () => {
          button.style.transform = 'translateY(0)';
      });
  });
});