document.addEventListener('DOMContentLoaded', async () => {
  
  function isThemeDisabled(theme) {
      const blueThemesUnlocked = localStorage.getItem('blueThemesUnlocked') === 'true';
      return (theme === 'default' || theme === 'light-blue' || theme === 'dark-blue') && !blueThemesUnlocked;
  }
  
  function updateThemeAvailability() {
       const blueThemesUnlocked = localStorage.getItem('blueThemesUnlocked') === 'true';
       document.querySelectorAll('.theme-option').forEach(button => {
           const theme = button.dataset.theme;
           if (theme === 'default' || theme === 'light-blue' || theme === 'dark-blue') {
               if (blueThemesUnlocked) {
                   button.style.display = 'block';
                   button.classList.remove('disabled');
                   button.removeAttribute('disabled');
               } else {
                   button.style.display = 'none';
               }
           }
       });
   }
  
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
  
  function getCurrentTheme() {
      return localStorage.getItem('themePreference') || 
             getCookie('themePreference') || 
             'light-green';
  }
  
  function updateThemeButtons(currentTheme) {
      document.querySelectorAll('.theme-option').forEach(button => {
          const theme = button.dataset.theme;
          button.classList.toggle('active', theme === currentTheme);
      });
      updateThemeAvailability();
  }
  
  async function applyTheme(theme) {
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
  
  
  let initialTheme = getCurrentTheme();
  
  
  if (isThemeDisabled(initialTheme)) {
      initialTheme = 'light-green';
  }
  
  
  updateThemeAvailability();
  await applyTheme(initialTheme);
  
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'themeChanged') {
          updateThemeButtons(message.theme);
          document.documentElement.setAttribute('data-theme', message.theme);
      }
  });
  
  
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('version');
  versionElement.textContent = `v${manifest.version}`;
  
  
  let clickCount = 0;
  versionElement.addEventListener('click', () => {
      clickCount++;
      if (clickCount >= 5) {
          localStorage.setItem('blueThemesUnlocked', 'true');
          updateThemeAvailability();
          
          
          const notification = document.createElement('div');
          notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: var(--accent-accent);
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              font-family: 'Montserrat', sans-serif;
              font-weight: 500;
              z-index: 10000;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              animation: slideIn 0.3s ease-out;
          `;
          notification.textContent = 'Kék témák feloldva! 🎉';
          
          
          const style = document.createElement('style');
          style.textContent = `
              @keyframes slideIn {
                  from { transform: translateX(100%); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
              }
          `;
          document.head.appendChild(style);
          
          document.body.appendChild(notification);
          
          
          setTimeout(() => {
              notification.remove();
              style.remove();
          }, 3000);
          
          clickCount = 0;
      }
  });
  
  
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