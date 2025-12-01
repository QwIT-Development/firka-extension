document.addEventListener("DOMContentLoaded", async () => {
  while (typeof window.LanguageManager === "undefined") {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  let customThemes = [];
  let editingThemeId = null;

  async function loadCustomThemes() {
    try {
      const saved = await storageManager.get("customThemes", []);
      customThemes = Array.isArray(saved) ? saved : [];
      renderCustomThemes();
    } catch (error) {
      console.error("Error loading custom themes:", error);
      customThemes = [];
    }
  }

  async function saveCustomThemes() {
    try {
      await storageManager.set("customThemes", customThemes);
    } catch (error) {
      console.error("Error saving custom themes:", error);
    }
  }

  function renderCustomThemes() {
    const grid = document.getElementById("customThemesGrid");
    if (!grid) return;

    if (customThemes.length === 0) {
      grid.innerHTML = `<div class="no-custom-themes" data-i18n="settings.custom_themes.no_themes">Még nincsenek egyéni témák</div>`;
      if (window.LanguageManager) {
        window.LanguageManager.updatePageTranslations();
      }
      return;
    }

    grid.innerHTML = customThemes.map(theme => `
      <button class="theme-option custom-theme-option" data-theme="custom-${theme.id}">
        <div class="theme-preview" style="background: ${theme.colors.background};">
          <div class="preview-header" style="background: ${theme.colors.card};"></div>
          <div class="preview-content">
            <div class="preview-card" style="background: ${theme.colors.accent}20; border: 1px solid ${theme.colors.accent};"></div>
          </div>
        </div>
        <div class="theme-info">
          <span class="theme-name">${theme.name}</span>
          <div class="theme-actions">
            <span class="theme-action-btn edit-theme" data-id="${theme.id}" title="Szerkesztés">
              <span class="material-icons-round">edit</span>
            </span>
            <span class="theme-action-btn share-theme" data-id="${theme.id}" title="Megosztás">
              <span class="material-icons-round">share</span>
            </span>
            <span class="theme-action-btn delete-theme" data-id="${theme.id}" title="Törlés">
              <span class="material-icons-round">delete</span>
            </span>
          </div>
        </div>
      </button>
    `).join("");

    grid.querySelectorAll(".custom-theme-option").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (e.target.closest(".theme-action-btn")) return;
        const themeId = btn.dataset.theme;
        applyTheme(themeId);
      });
    });

    grid.querySelectorAll(".edit-theme").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        editTheme(id);
      });
    });

    grid.querySelectorAll(".share-theme").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        shareTheme(id);
      });
    });

    grid.querySelectorAll(".delete-theme").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        deleteTheme(id);
      });
    });

    updateThemeButtons(getCurrentTheme());
  }

  function openThemeEditor(theme = null) {
    const modal = document.getElementById("themeEditorModal");
    const titleEl = document.getElementById("themeEditorTitle");
    
    if (theme) {
      editingThemeId = theme.id;
      titleEl.setAttribute("data-i18n", "settings.custom_themes.edit");
      titleEl.textContent = window.LanguageManager ? window.LanguageManager.t("settings.custom_themes.edit") : "Téma szerkesztése";
      
      document.getElementById("themeName").value = theme.name;
      document.getElementById("accentColor").value = theme.colors.accent;
      document.getElementById("accentColorHex").value = theme.colors.accent;
      document.getElementById("backgroundColor").value = theme.colors.background;
      document.getElementById("backgroundColorHex").value = theme.colors.background;
      document.getElementById("cardColor").value = theme.colors.card;
      document.getElementById("cardColorHex").value = theme.colors.card;
      document.getElementById("textColor").value = theme.colors.text;
      document.getElementById("textColorHex").value = theme.colors.text;
      
      document.querySelectorAll(".mode-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === theme.mode);
      });
    } else {
      editingThemeId = null;
      titleEl.setAttribute("data-i18n", "settings.custom_themes.create");
      titleEl.textContent = window.LanguageManager ? window.LanguageManager.t("settings.custom_themes.create") : "Új téma létrehozása";
      
      document.getElementById("themeName").value = "";
      document.getElementById("accentColor").value = "#A7DC22";
      document.getElementById("accentColorHex").value = "#A7DC22";
      document.getElementById("backgroundColor").value = "#0D1202";
      document.getElementById("backgroundColorHex").value = "#0D1202";
      document.getElementById("cardColor").value = "#141905";
      document.getElementById("cardColorHex").value = "#141905";
      document.getElementById("textColor").value = "#EAF7CC";
      document.getElementById("textColorHex").value = "#EAF7CC";
      
      document.querySelectorAll(".mode-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === "dark");
      });
    }
    
    updateLivePreview();
    modal.classList.add("active");
  }

  function closeThemeEditor() {
    const modal = document.getElementById("themeEditorModal");
    modal.classList.remove("active");
    editingThemeId = null;
  }

  function updateLivePreview() {
    const preview = document.getElementById("livePreview");
    if (!preview) return;

    const backgroundColor = document.getElementById("backgroundColor").value;
    const cardColor = document.getElementById("cardColor").value;
    const accentColor = document.getElementById("accentColor").value;
    const textColor = document.getElementById("textColor").value;

    preview.style.background = backgroundColor;
    preview.querySelector(".preview-header").style.background = cardColor;
    preview.querySelector(".preview-card").style.background = `${accentColor}20`;
    preview.querySelector(".preview-card").style.border = `1px solid ${accentColor}`;
    preview.querySelector(".preview-text").style.color = textColor;
  }

  function saveThemeFromEditor() {
    const name = document.getElementById("themeName").value.trim();
    if (!name) {
      document.getElementById("themeName").focus();
      return;
    }

    const mode = document.querySelector(".mode-option.active")?.dataset.mode || "dark";
    const colors = {
      accent: document.getElementById("accentColor").value,
      background: document.getElementById("backgroundColor").value,
      card: document.getElementById("cardColor").value,
      text: document.getElementById("textColor").value
    };

    if (editingThemeId) {
      const index = customThemes.findIndex(t => t.id === editingThemeId);
      if (index !== -1) {
        customThemes[index] = {
          ...customThemes[index],
          name,
          mode,
          colors
        };
      }
    } else {
      const newTheme = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name,
        mode,
        colors
      };
      customThemes.push(newTheme);
    }

    saveCustomThemes();
    renderCustomThemes();
    closeThemeEditor();
  }

  function editTheme(id) {
    const theme = customThemes.find(t => t.id === id);
    if (theme) {
      openThemeEditor(theme);
    }
  }

  function shareTheme(id) {
    const theme = customThemes.find(t => t.id === id);
    if (!theme) return;

    const shareData = {
      v: 1,
      n: theme.name,
      m: theme.mode,
      c: theme.colors
    };

    const code = btoa(JSON.stringify(shareData));
    document.getElementById("shareCode").value = code;
    document.getElementById("shareThemeModal").classList.add("active");
  }

  function deleteTheme(id) {
    const confirmMsg = window.LanguageManager ? 
      window.LanguageManager.t("settings.custom_themes.delete_confirm") : 
      "Biztosan törölni szeretnéd ezt a témát?";
    
    if (confirm(confirmMsg)) {
      customThemes = customThemes.filter(t => t.id !== id);
      saveCustomThemes();
      renderCustomThemes();
      
      const currentTheme = getCurrentTheme();
      if (currentTheme === `custom-${id}`) {
        applyTheme("light-green");
      }
    }
  }

  function importTheme() {
    const code = document.getElementById("importCode").value.trim();
    const errorEl = document.getElementById("importError");
    errorEl.textContent = "";

    if (!code) {
      errorEl.textContent = window.LanguageManager ? 
        window.LanguageManager.t("settings.custom_themes.import_error_empty") : 
        "Kérlek illeszd be a téma kódot!";
      return;
    }

    try {
      const data = JSON.parse(atob(code));
      
      if (!data.n || !data.m || !data.c) {
        throw new Error("Invalid theme data");
      }

      const newTheme = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: data.n,
        mode: data.m,
        colors: data.c
      };

      customThemes.push(newTheme);
      saveCustomThemes();
      renderCustomThemes();
      closeImportModal();
      
    } catch (error) {
      errorEl.textContent = window.LanguageManager ? 
        window.LanguageManager.t("settings.custom_themes.import_error_invalid") : 
        "Érvénytelen téma kód!";
    }
  }

  function closeImportModal() {
    document.getElementById("importThemeModal").classList.remove("active");
    document.getElementById("importCode").value = "";
    document.getElementById("importError").textContent = "";
  }

  function closeShareModal() {
    document.getElementById("shareThemeModal").classList.remove("active");
  }

  function copyShareCode() {
    const textarea = document.getElementById("shareCode");
    textarea.select();
    document.execCommand("copy");
    
    const btn = document.getElementById("copyShareCode");
    btn.classList.add("copied");
    btn.querySelector(".material-icons-round").textContent = "check";
    
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.querySelector(".material-icons-round").textContent = "content_copy";
    }, 2000);
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

    if (theme.startsWith("custom-")) {
      const themeId = theme.replace("custom-", "");
      const customTheme = customThemes.find(t => t.id === themeId);
      if (customTheme) {
        applyCustomThemeColors(customTheme);
      }
    } else {
      clearCustomThemeColors();
    }

    updateThemeButtons(theme);

    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "changeTheme",
          theme: theme,
          customThemes: customThemes,
        })
        .catch(() => {});
    });
  }

  function applyCustomThemeColors(theme) {
    const root = document.documentElement;
    const isDark = theme.mode === "dark";
    
    root.style.setProperty("--background", theme.colors.background);
    root.style.setProperty("--card-card", theme.colors.card);
    root.style.setProperty("--accent-accent", theme.colors.accent);
    root.style.setProperty("--text-primary", theme.colors.text);
    root.style.setProperty("--text-secondary", theme.colors.text + "cc");
    root.style.setProperty("--text-teritary", theme.colors.text + "80");
    root.style.setProperty("--accent-15", theme.colors.accent + "26");
    root.style.setProperty("--button-secondaryFill", isDark ? lightenColor(theme.colors.card, 10) : darkenColor(theme.colors.card, 5));
    root.style.setProperty("--accent-secondary", isDark ? lightenColor(theme.colors.accent, 20) : darkenColor(theme.colors.accent, 20));
    root.style.setProperty("--shadow-blur", isDark ? "0" : "2px");
    root.style.setProperty("--accent-shadow", isDark ? "#0000" : theme.colors.accent + "26");
    root.style.setProperty("--icon-filter", hexToFilter(theme.colors.accent));
  }

  function clearCustomThemeColors() {
    const root = document.documentElement;
    const properties = [
      "--background",
      "--card-card", 
      "--accent-accent",
      "--text-primary",
      "--text-secondary",
      "--text-teritary",
      "--accent-15",
      "--button-secondaryFill",
      "--accent-secondary",
      "--shadow-blur",
      "--accent-shadow",
      "--icon-filter"
    ];
    
    properties.forEach(prop => root.style.removeProperty(prop));
  }

  function hexToFilter(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
        case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
        case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
      }
    }
    
    const hue = Math.round(h * 360);
    const saturation = Math.round(s * 100);
    const lightness = Math.round(l * 100);

    const brightnessVal = lightness > 50 ? 1 + (lightness - 50) / 100 : 0.5 + lightness / 100;
    const saturateVal = saturation > 0 ? 1 + saturation / 100 : 0;
    
    return `brightness(0) saturate(100%) invert(${lightness}%) sepia(${saturation}%) saturate(${Math.min(500, saturation * 5)}%) hue-rotate(${hue}deg) brightness(${brightnessVal}) contrast(${90 + saturation / 10}%)`;
  }

  function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  const themeButtons = document.querySelectorAll(".theme-option:not(.custom-theme-option)");
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

  document.getElementById("addCustomTheme")?.addEventListener("click", () => openThemeEditor());
  document.getElementById("closeThemeEditor")?.addEventListener("click", closeThemeEditor);
  document.getElementById("cancelThemeEditor")?.addEventListener("click", closeThemeEditor);
  document.getElementById("saveTheme")?.addEventListener("click", saveThemeFromEditor);
  
  document.querySelectorAll(".mode-option").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const isDark = btn.dataset.mode === "dark";
      if (isDark) {
        document.getElementById("backgroundColor").value = "#0D1202";
        document.getElementById("backgroundColorHex").value = "#0D1202";
        document.getElementById("cardColor").value = "#141905";
        document.getElementById("cardColorHex").value = "#141905";
        document.getElementById("textColor").value = "#EAF7CC";
        document.getElementById("textColorHex").value = "#EAF7CC";
      } else {
        document.getElementById("backgroundColor").value = "#FAFFF0";
        document.getElementById("backgroundColorHex").value = "#FAFFF0";
        document.getElementById("cardColor").value = "#F3FBDE";
        document.getElementById("cardColorHex").value = "#F3FBDE";
        document.getElementById("textColor").value = "#394C0A";
        document.getElementById("textColorHex").value = "#394C0A";
      }
      updateLivePreview();
    });
  });

  ["accent", "background", "card", "text"].forEach(colorType => {
    const colorInput = document.getElementById(`${colorType}Color`);
    const hexInput = document.getElementById(`${colorType}ColorHex`);
    
    colorInput?.addEventListener("input", () => {
      hexInput.value = colorInput.value.toUpperCase();
      updateLivePreview();
    });
    
    hexInput?.addEventListener("input", () => {
      const hex = hexInput.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        colorInput.value = hex;
        updateLivePreview();
      }
    });
  });

  document.getElementById("closeShareModal")?.addEventListener("click", closeShareModal);
  document.getElementById("closeShareModalBtn")?.addEventListener("click", closeShareModal);
  document.getElementById("copyShareCode")?.addEventListener("click", copyShareCode);

  let pressTimer;
  const addBtn = document.getElementById("addCustomTheme");
  addBtn?.addEventListener("mousedown", () => {
    pressTimer = setTimeout(() => {
      document.getElementById("importThemeModal").classList.add("active");
    }, 500);
  });
  addBtn?.addEventListener("mouseup", () => clearTimeout(pressTimer));
  addBtn?.addEventListener("mouseleave", () => clearTimeout(pressTimer));

  document.getElementById("closeImportModal")?.addEventListener("click", closeImportModal);
  document.getElementById("cancelImport")?.addEventListener("click", closeImportModal);
  document.getElementById("confirmImport")?.addEventListener("click", importTheme);

  await loadCustomThemes();

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
