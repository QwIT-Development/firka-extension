document.addEventListener("DOMContentLoaded", async () => {
  while (typeof window.LanguageManager === "undefined") {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  function getCurrentTheme() {
    return (
      localStorage.getItem("themePreference") ||
      "light-green"
    );
  }

  function updateThemeButtons(currentTheme) {
    document.querySelectorAll(".theme-option").forEach((button) => {
      const theme = button.dataset.theme;
      button.classList.toggle("active", theme === currentTheme);
    });

  }

  function getCurrentLanguage() {
    return (
      localStorage.getItem("languagePreference") ||
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
