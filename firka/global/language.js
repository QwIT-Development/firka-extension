(function () {
  let currentLanguage = "hu";
  let translations = {};

  async function setLanguage(language) {
    try {
      currentLanguage = language;

      await storageManager.set("languagePreference", language);

      localStorage.setItem("languagePreference", language);

      await loadTranslations(language);
      applyTranslations();

      window.dispatchEvent(
        new CustomEvent("languageChanged", {
          detail: { language: language },
        }),
      );

      chrome.runtime
        .sendMessage({
          action: "languageChanged",
          language: language,
        })
        .catch(() => {});
    } catch (error) {}
  }

  async function loadTranslations(language) {
    try {
      const url = chrome.runtime.getURL(`i18n/${language}.json`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to load ${language}.json - Status: ${response.status}`,
        );
      }
      translations = await response.json();
    } catch (error) {
      if (language !== "hu") {
        try {
          const fallbackUrl = chrome.runtime.getURL("i18n/hu.json");
          const response = await fetch(fallbackUrl);
          translations = await response.json();
        } catch (fallbackError) {}
      }
    }
  }

  function applyTranslations() {
    const elements = document.querySelectorAll("[data-i18n]");

    elements.forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const translation = getTranslation(key);

      if (translation && translation !== key) {
        const attr = element.getAttribute("data-i18n-attr");
        if (attr) {
          element.setAttribute(attr, translation);
        } else {
          element.textContent = translation;
        }
      }
    });
  }

  function getTranslation(keyPath, fallback = "") {
    const keys = keyPath.split(".");
    let value = translations;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return fallback || keyPath;
      }
    }

    return typeof value === "string" ? value : fallback || keyPath;
  }

  async function initializeLanguage() {
    try {
      const storageLanguage = await storageManager.get("languagePreference");
      const localStorageLanguage = localStorage.getItem("languagePreference");
      const language = storageLanguage || localStorageLanguage || "hu";

      await setLanguage(language);
      loadTranslationsForPage();

      if (storageLanguage !== localStorageLanguage) {
        if (storageLanguage) {
          localStorage.setItem("languagePreference", storageLanguage);
        } else if (localStorageLanguage) {
          await storageManager.set("languagePreference", localStorageLanguage);
        }
      }
    } catch (error) {
      console.error("Error initializing language:", error);
      await setLanguage("hu");
      loadTranslationsForPage();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLanguage);
  } else {
    initializeLanguage();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "changeLanguage") {
      setLanguage(message.language);
      sendResponse({ success: true });
    }

    if (message.action === "getLanguage") {
      sendResponse({ language: currentLanguage });
    }

    return true;
  });

  function loadTranslationsForPage() {
    try {
      applyTranslations();

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const elementsWithI18n = node.querySelectorAll ? node.querySelectorAll('[data-i18n]') : [];
                elementsWithI18n.forEach((element) => {
                  const key = element.getAttribute('data-i18n');
                  const translation = getTranslation(key);
                  
                  if (translation && translation !== key) {
                    const attr = element.getAttribute('data-i18n-attr');
                    if (attr) {
                      element.setAttribute(attr, translation);
                    } else {
                      element.textContent = translation;
                    }
                  }
                });

                if (node.hasAttribute && node.hasAttribute('data-i18n')) {
                  const key = node.getAttribute('data-i18n');
                  const translation = getTranslation(key);
                  
                  if (translation && translation !== key) {
                    const attr = node.getAttribute('data-i18n-attr');
                    if (attr) {
                      node.setAttribute(attr, translation);
                    } else {
                      node.textContent = translation;
                    }
                  }
                }
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (error) {
      console.error('Error loading translations for page:', error);
    }
  }

  window.LanguageManager = {
    getCurrentLanguage: () => currentLanguage,
    changeLanguage: setLanguage,
    t: getTranslation,
    loadTranslationsForPage: loadTranslationsForPage,
    getAvailableLanguages: () => [
      { code: "hu", name: "Magyar" },
      { code: "en", name: "English" },
    ],
  };
})();
