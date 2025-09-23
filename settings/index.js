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

  class CustomThemeManager {
    constructor() {
      this.customThemes = this.loadCustomThemes();
      this.currentEditingTheme = null;
      this.initializeEventListeners();
      this.renderCustomThemes();
    }

    loadCustomThemes() {
      const stored = localStorage.getItem('customThemes');
      return stored ? JSON.parse(stored) : [];
    }

    saveCustomThemes() {
      localStorage.setItem('customThemes', JSON.stringify(this.customThemes));
    }

    generateThemeId() {
      return 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    createTheme(name, colors) {
      const theme = {
        id: this.generateThemeId(),
        name: name,
        colors: colors,
        created: new Date().toISOString()
      };
      this.customThemes.push(theme);
      this.saveCustomThemes();
      return theme;
    }

    updateTheme(id, name, colors) {
      const index = this.customThemes.findIndex(t => t.id === id);
      if (index !== -1) {
        this.customThemes[index] = {
          ...this.customThemes[index],
          name: name,
          colors: colors,
          updated: new Date().toISOString()
        };
        this.saveCustomThemes();
        return this.customThemes[index];
      }
      return null;
    }

    deleteTheme(id) {
      this.customThemes = this.customThemes.filter(t => t.id !== id);
      this.saveCustomThemes();

      const currentTheme = getCurrentTheme();
      if (currentTheme === id) {
        this.applyTheme('light-green');
      }
    }

    applyTheme(themeId) {
      if (themeId.startsWith('custom-')) {
        const theme = this.customThemes.find(t => t.id === themeId);
        if (theme) {
          this.applyCustomThemeColors(theme.colors);
          localStorage.setItem("themePreference", themeId);
        }
      } else {
        document.documentElement.setAttribute('data-theme', themeId);
        localStorage.setItem("themePreference", themeId);
      }
      updateThemeButtons(themeId);
    }

    applyCustomThemeColors(colors) {
      const root = document.documentElement;
      root.removeAttribute('data-theme');
      Object.entries(colors).forEach(([key, value]) => {
        const cssVar = this.convertToCSSVariable(key);
        root.style.setProperty(cssVar, value);
      });
    }

    convertToCSSVariable(key) {
      return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    exportTheme(themeId) {
      const theme = this.customThemes.find(t => t.id === themeId);
      if (!theme) return null;

      const exportData = {
        name: theme.name,
        colors: theme.colors,
        version: '1.0'
      };
      const jsonString = JSON.stringify(exportData);
      const encoded = btoa(unescape(encodeURIComponent(jsonString)));
      
      return encoded;
    }

    importTheme(encodedString) {
      try {
        const jsonString = decodeURIComponent(escape(atob(encodedString)));
        const themeData = JSON.parse(jsonString);

        if (!themeData.name || !themeData.colors) {
          throw new Error('Invalid theme format');
        }
        const importedTheme = this.createTheme(
          themeData.name + ' (Importált)',
          themeData.colors
        );

        this.renderCustomThemes();
        return importedTheme;
      } catch (error) {
        console.error('Theme import failed:', error);
        return null;
      }
    }

    renderCustomThemes() {
      const container = document.getElementById('customThemesList');
      container.innerHTML = '';

      if (this.customThemes.length === 0) {
        const emptyMessage = window.translations?.settings?.custom_theme?.no_themes || 'Még nincsenek egyéni témák';
        container.innerHTML = `<p style="color: var(--text-secondary); font-size: 12px; text-align: center; padding: 20px;">${emptyMessage}</p>`;
        return;
      }

      this.customThemes.forEach(theme => {
        const themeElement = this.createThemeElement(theme);
        container.appendChild(themeElement);
      });
    }

    createThemeElement(theme) {
      const element = document.createElement('div');
      element.className = 'custom-theme-item';
      
      const colors = theme.colors;
      const previewColors = [
        colors.background || '#DAE4F7',
        colors.cardCard || '#EDF3FF',
        colors.accentAccent || '#3673EE',
        colors.textPrimary || '#050B15'
      ];

      const translations = window.translations?.settings?.custom_theme || {};
      
      element.innerHTML = `
        <div class="custom-theme-info">
          <div class="custom-theme-preview-mini">
            ${previewColors.map(color => `<div class="color-strip" style="background: ${color}"></div>`).join('')}
          </div>
          <span class="custom-theme-name">${theme.name}</span>
        </div>
        <div class="custom-theme-actions">
          <button class="action-btn apply" data-theme-id="${theme.id}" title="${translations.apply || 'Alkalmaz'}">
            <span class="material-icons-round">check</span>
          </button>
          <button class="action-btn edit" data-theme-id="${theme.id}" title="${translations.edit || 'Szerkeszt'}">
            <span class="material-icons-round">edit</span>
          </button>
          <button class="action-btn export" data-theme-id="${theme.id}" title="${translations.export || 'Export'}">
            <span class="material-icons-round">file_upload</span>
          </button>
          <button class="action-btn delete" data-theme-id="${theme.id}" title="${translations.delete || 'Töröl'}">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      `;

      element.querySelector('.apply').addEventListener('click', () => {
        this.applyTheme(theme.id);
      });

      element.querySelector('.edit').addEventListener('click', () => {
        this.editTheme(theme.id);
      });

      element.querySelector('.export').addEventListener('click', () => {
        this.showExportModal(theme.id);
      });

      element.querySelector('.delete').addEventListener('click', () => {
        const confirmMessage = window.translations?.settings?.custom_theme?.delete_confirm || `Biztosan törölni szeretnéd a "${theme.name}" témát?`;
        if (confirm(confirmMessage.replace('{name}', theme.name))) {
          this.deleteTheme(theme.id);
          this.renderCustomThemes();
        }
      });

      return element;
    }

    editTheme(themeId) {
      const theme = this.customThemes.find(t => t.id === themeId);
      if (!theme) return;

      this.currentEditingTheme = theme;
      this.openThemeEditor(theme);
    }

    openThemeEditor(theme = null) {
      const modal = document.getElementById('themeEditorModal');
      const nameInput = document.getElementById('themeName');
      
      if (theme) {
        nameInput.value = theme.name;
        this.loadThemeColorsToEditor(theme.colors);
      } else {
        nameInput.value = '';
        this.loadDefaultColorsToEditor();
      }

      this.updatePreview();
      modal.style.display = 'flex';
    }

    loadThemeColorsToEditor(colors) {
      Object.entries(colors).forEach(([key, value]) => {
        const input = document.getElementById(key);
        if (input) {
          input.value = value;
        }
      });
    }

    loadDefaultColorsToEditor() {
      const defaults = {
        background: '#DAE4F7',
        cardCard: '#EDF3FF',
        textPrimary: '#050B15',
        textSecondary: '#050B15',
        accentAccent: '#3673EE',
        accentSecondary: '#1C469A'
      };
      this.loadThemeColorsToEditor(defaults);
    }

    updatePreview() {
      const preview = document.getElementById('customThemePreview');
      const colors = this.getColorsFromEditor();
      
      preview.style.setProperty('--preview-background', colors.background);
      preview.style.setProperty('--preview-card', colors.cardCard);
      preview.style.setProperty('--preview-text-primary', colors.textPrimary);
      preview.style.setProperty('--preview-text-secondary', colors.textSecondary);
      preview.style.setProperty('--preview-accent', colors.accentAccent);
    }

    getColorsFromEditor() {
      return {
        background: document.getElementById('background').value,
        cardCard: document.getElementById('cardCard').value,
        textPrimary: document.getElementById('textPrimary').value,
        textSecondary: document.getElementById('textSecondary').value,
        accentAccent: document.getElementById('accentAccent').value,
        accentSecondary: document.getElementById('accentSecondary').value
      };
    }

    saveThemeFromEditor() {
      const name = document.getElementById('themeName').value.trim();
      if (!name) {
        alert('Add meg a téma nevét!');
        return;
      }

      const colors = this.getColorsFromEditor();

      if (this.currentEditingTheme) {
        this.updateTheme(this.currentEditingTheme.id, name, colors);
      } else {
        this.createTheme(name, colors);
      }

      this.closeThemeEditor();
      this.renderCustomThemes();
    }

    closeThemeEditor() {
      document.getElementById('themeEditorModal').style.display = 'none';
      this.currentEditingTheme = null;
    }

    showExportModal(themeId) {
      const exportString = this.exportTheme(themeId);
      if (exportString) {
        const theme = this.customThemes.find(t => t.id === themeId);
        prompt(`${theme.name} téma export azonosítója (másold ki):`, exportString);
      }
    }

    showImportModal() {
      document.getElementById('importModal').style.display = 'flex';
    }

    closeImportModal() {
      document.getElementById('importModal').style.display = 'none';
      document.getElementById('themeImportString').value = '';
    }

    importThemeFromModal() {
      const importString = document.getElementById('themeImportString').value.trim();
      if (!importString) {
        alert('Add meg az azonosítót!');
        return;
      }

      const importedTheme = this.importTheme(importString);
      if (importedTheme) {
        alert(`"${importedTheme.name}" téma sikeresen importálva!`);
        this.closeImportModal();
      } else {
        alert('Hiba történt az importálás során. Ellenőrizd az azonosítót!');
      }
    }

    initializeEventListeners() {
      document.getElementById('createCustomTheme').addEventListener('click', () => {
        this.openThemeEditor();
      });

      document.getElementById('importTheme').addEventListener('click', () => {
        this.showImportModal();
      });

      document.getElementById('closeThemeEditor').addEventListener('click', () => {
        this.closeThemeEditor();
      });

      document.getElementById('cancelThemeEdit').addEventListener('click', () => {
        this.closeThemeEditor();
      });

      document.getElementById('saveTheme').addEventListener('click', () => {
        this.saveThemeFromEditor();
      });

      document.getElementById('closeImportModal').addEventListener('click', () => {
        this.closeImportModal();
      });

      document.getElementById('cancelImport').addEventListener('click', () => {
        this.closeImportModal();
      });

      document.getElementById('confirmImport').addEventListener('click', () => {
        this.importThemeFromModal();
      });

      const colorInputs = ['background', 'cardCard', 'textPrimary', 'textSecondary', 'accentAccent', 'accentSecondary'];
      colorInputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener('input', () => {
          this.updatePreview();
        });
      });

      document.getElementById('themeEditorModal').addEventListener('click', (e) => {
        if (e.target.id === 'themeEditorModal') {
          this.closeThemeEditor();
        }
      });

      document.getElementById('importModal').addEventListener('click', (e) => {
        if (e.target.id === 'importModal') {
          this.closeImportModal();
        }
      });
    }
  }

  const customThemeManager = new CustomThemeManager();
  const originalGetCurrentTheme = getCurrentTheme;
  getCurrentTheme = function() {
    const theme = originalGetCurrentTheme();
    if (theme && theme.startsWith('custom-')) {
      return theme;
    }
    return theme;
  };
  const originalUpdateThemeButtons = updateThemeButtons;
  updateThemeButtons = function(currentTheme) {
    originalUpdateThemeButtons(currentTheme);
    document.querySelectorAll('.custom-theme-item').forEach(item => {
      const applyBtn = item.querySelector('.apply');
      const themeId = applyBtn.dataset.themeId;
      item.classList.toggle('active', themeId === currentTheme);
    });
  };
  const currentTheme = getCurrentTheme();
  if (currentTheme && currentTheme.startsWith('custom-')) {
    customThemeManager.applyTheme(currentTheme);
  }
});
