document.addEventListener("DOMContentLoaded", async () => {
  while (typeof window.LanguageManager === "undefined") {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  function isThemeDisabled(theme) {
    const blueThemesUnlocked =
      localStorage.getItem("blueThemesUnlocked") === "true";
    return (
      (theme === "default" ||
        theme === "light-blue" ||
        theme === "dark-blue") &&
      !blueThemesUnlocked
    );
  }

  function updateThemeAvailability() {
    const blueThemesUnlocked =
      localStorage.getItem("blueThemesUnlocked") === "true";
    document.querySelectorAll(".theme-option").forEach((button) => {
      const theme = button.dataset.theme;
      if (
        theme === "default" ||
        theme === "light-blue" ||
        theme === "dark-blue"
      ) {
        if (blueThemesUnlocked) {
          button.style.display = "block";
          button.classList.remove("disabled");
          button.removeAttribute("disabled");
        } else {
          button.style.display = "none";
        }
      }
    });
  }

  function getCookie(name) {
    const cookieName = `${name}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i];
      while (cookie.charAt(0) === " ") {
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
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/; domain=.e-kreta.hu`;
  }

  function getCurrentTheme() {
    return (
      localStorage.getItem("themePreference") ||
      getCookie("themePreference") ||
      "light-green"
    );
  }

  function updateThemeButtons(currentTheme) {
    document.querySelectorAll(".theme-option").forEach((button) => {
      const theme = button.dataset.theme;
      button.classList.toggle("active", theme === currentTheme);
    });
    updateThemeAvailability();
  }

  function getCurrentLanguage() {
    return (
      localStorage.getItem("languagePreference") ||
      getCookie("languagePreference") ||
      "hu"
    );
  }

  function updateLanguageButtons(currentLanguage) {
    document.querySelectorAll(".language-option").forEach((button) => {
      const language = button.dataset.language;
      button.classList.toggle("active", language === currentLanguage);
    });
  }

  async function applyLanguage(language) {
    setCookie("languagePreference", language);
    localStorage.setItem("languagePreference", language);

    updateLanguageButtons(language);

    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "changeLanguage",
          language: language,
        })
        .catch(() => {});
    });
  }

  async function applyTheme(theme) {
    setCookie("themePreference", theme);
    localStorage.setItem("themePreference", theme);

    document.documentElement.setAttribute("data-theme", theme);

    updateThemeButtons(theme);

    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "changeTheme",
          theme: theme,
        })
        .catch(() => {});
    });
  }

  const themeButtons = document.querySelectorAll(".theme-option");
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.theme;

      if (button.hasAttribute("disabled")) {
        alert(
          window.LanguageManager.t("common.warning") +
            ": " +
            window.LanguageManager.t("settings.theme_not_available"),
        );
        return;
      }

      applyTheme(theme);
    });
  });

  const languageButtons = document.querySelectorAll(".language-option");
  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const language = button.dataset.language;
      applyLanguage(language);
    });
  });

  let initialTheme = getCurrentTheme();

  if (isThemeDisabled(initialTheme)) {
    initialTheme = "light-green";
  }

  updateThemeAvailability();
  await applyTheme(initialTheme);

  const initialLanguage = getCurrentLanguage();
  updateLanguageButtons(initialLanguage);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "themeChanged") {
      updateThemeButtons(message.theme);
      document.documentElement.setAttribute("data-theme", message.theme);
    }
  });

  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById("version");
  versionElement.textContent = `v${manifest.version}`;

  let clickCount = 0;
  versionElement.addEventListener("click", () => {
    clickCount++;
    if (clickCount >= 5) {
      localStorage.setItem("blueThemesUnlocked", "true");
      updateThemeAvailability();

      const notification = document.createElement("div");
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
      notification.textContent =
        window.LanguageManager.t("common.success") +
        ": " +
        window.LanguageManager.t("settings.blue_themes_unlocked");

      const style = document.createElement("style");
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

  themeButtons.forEach((button) => {
    button.addEventListener("mouseover", () => {
      if (!button.hasAttribute("disabled")) {
        button.style.transform = "translateY(-2px)";
      }
    });

    button.addEventListener("mouseout", () => {
      button.style.transform = "translateY(0)";
    });
  });

  languageButtons.forEach((button) => {
    button.addEventListener("mouseover", () => {
      button.style.transform = "translateY(-2px)";
    });

    button.addEventListener("mouseout", () => {
      button.style.transform = "translateY(0)";
    });
  });

  window.addEventListener("languageChanged", (event) => {
    updateLanguageButtons(event.detail.language);
  });
});
