(() => {
  let customThemes = [];

  async function loadCustomThemes() {
    try {
      const saved = await storageManager.get("customThemes", []);
      customThemes = Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("Error loading custom themes:", error);
      customThemes = [];
    }
  }

  function applyCustomThemeColors(theme) {
    const root = document.documentElement;
    const isDark = theme.mode === "dark";
    
    root.style.setProperty("--background", theme.colors.background);
    root.style.setProperty("--background-0", theme.colors.background + "00");
    root.style.setProperty("--card-card", theme.colors.card);
    root.style.setProperty("--card-translucent", theme.colors.card + "80");
    root.style.setProperty("--accent-accent", theme.colors.accent);
    root.style.setProperty("--text-primary", theme.colors.text);
    
    // Származtatott színek
    root.style.setProperty("--text-secondary", theme.colors.text + "cc");
    root.style.setProperty("--text-teritary", theme.colors.text + "80");
    root.style.setProperty("--accent-15", theme.colors.accent + "26");
    root.style.setProperty("--button-secondaryFill", isDark ? lightenColor(theme.colors.card, 10) : darkenColor(theme.colors.card, 5));
    root.style.setProperty("--accent-secondary", isDark ? lightenColor(theme.colors.accent, 20) : darkenColor(theme.colors.accent, 20));
    root.style.setProperty("--shadow-blur", isDark ? "0" : "2px");
    root.style.setProperty("--accent-shadow", isDark ? "#0000" : theme.colors.accent + "26");
    
    // SVG ikon filter beállítása a kiemelő szín alapján
    root.style.setProperty("--icon-filter", hexToFilter(theme.colors.accent));
  }

  // Hex szín átalakítása CSS filterré
  function hexToFilter(hex) {
    // Hex -> RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // RGB -> HSL
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
    
    // Filter létrehozása
    // Ez egy egyszerűsített megközelítés - a pontos szín reprodukálásához
    // komplexebb számítás kellene, de ez megfelelő a legtöbb esetben
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

  function clearCustomThemeStyles() {
    const root = document.documentElement;
    const customProps = [
      "--background", "--background-0", "--card-card", "--card-translucent",
      "--accent-accent", "--text-primary", "--text-secondary", "--text-teritary",
      "--accent-15", "--button-secondaryFill", "--accent-secondary",
      "--shadow-blur", "--accent-shadow", "--icon-filter"
    ];
    customProps.forEach(prop => root.style.removeProperty(prop));
  }

  async function setTheme(theme) {
    try {
      // Töröljük az előző egyéni téma stílusait
      clearCustomThemeStyles();
      
      document.documentElement.setAttribute("data-theme", theme);
      await storageManager.set("themePreference", theme);
      
      // Ha egyéni téma, alkalmazzuk a színeket
      if (theme.startsWith("custom-")) {
        await loadCustomThemes();
        const themeId = theme.replace("custom-", "");
        const customTheme = customThemes.find(t => t.id === themeId);
        if (customTheme) {
          applyCustomThemeColors(customTheme);
        }
      }
      
      chrome.runtime
        .sendMessage({
          action: "themeChanged",
          theme: theme,
        })
        .catch(() => {});
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  }

  function importFonts() {
    try {
      const fontFaces = `
        @font-face {
          font-family: 'Montserrat';
          font-style: normal;
          font-weight: 400;
          src: url('${chrome.runtime.getURL('fonts/Montserrat-Regular.woff2')}') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'Montserrat';
          font-style: normal;
          font-weight: 500;
          src: url('${chrome.runtime.getURL('fonts/Montserrat-Medium.woff2')}') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'Montserrat';
          font-style: normal;
          font-weight: 600;
          src: url('${chrome.runtime.getURL('fonts/Montserrat-SemiBold.woff2')}') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'Figtree';
          font-style: normal;
          font-weight: 400;
          src: url('${chrome.runtime.getURL('fonts/Figtree-Regular.woff2')}') format('woff2');
          font-display: swap;
        }
      `;

      const styleElement = document.createElement('style');
      styleElement.textContent = fontFaces;
      document.head.appendChild(styleElement);

      const iconFontFace = `
        @font-face {
          font-family: 'Material Icons Round';
          font-style: normal;
          font-weight: 400;
          src: url('${chrome.runtime.getURL('fonts/Icons.woff2')}') format('woff2');
          font-display: swap;
        }
      `;
      
      const iconStyleElement = document.createElement('style');
      iconStyleElement.textContent = iconFontFace;
      document.head.appendChild(iconStyleElement);
    } catch (error) {
      console.error("Error importing fonts:", error);
    }
  }

  function setPageTitleAndFavicon() {
    try {
      document.title = "Firka - KRÉTA";

      const existingFavicons = document.querySelectorAll(
        'link[rel="icon"], link[rel="shortcut icon"]',
      );
      existingFavicons.forEach((link) => link.remove());

      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.getURL
      ) {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/png";
        favicon.href = chrome.runtime.getURL("images/firka_logo_128.png");
        document.head.appendChild(favicon);

        const shortcutIcon = document.createElement("link");
        shortcutIcon.rel = "shortcut icon";
        shortcutIcon.type = "image/png";
        shortcutIcon.href = chrome.runtime.getURL("images/firka_logo_128.png");
        document.head.appendChild(shortcutIcon);
      }
    } catch (error) {
      console.error("Error setting page title and favicon:", error);
    }
  }

  async function initializeTheme() {
    try {
      const theme = await storageManager.get("themePreference", "light-green");
      await loadCustomThemes();

      await setTheme(theme);
      setPageTitleAndFavicon();
      importFonts();
    } catch (error) {
      console.error("Error initializing theme:", error);
      await setTheme("light-green");
      setPageTitleAndFavicon();
      importFonts();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTheme);
  } else {
    initializeTheme();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "changeTheme") {
      // Ha egyéni témák is jöttek az üzenetben, frissítsük a lokális listát
      if (message.customThemes) {
        customThemes = message.customThemes;
      }
      setTheme(message.theme);
      sendResponse({ success: true });
    }

    if (message.action === "getTheme") {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "light-green";
      sendResponse({ theme: currentTheme });
    }

    return true;
  });

  let titleCheckTimeout;

  const observer = new MutationObserver(async (mutations) => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    
    try {
      const savedTheme = await storageManager.get("themePreference");

      if (
        (!currentTheme && savedTheme) ||
        (currentTheme !== savedTheme && savedTheme)
      ) {
        await setTheme(savedTheme);
      }
    } catch (error) {
      console.error("Error checking theme in observer:", error);
    }

    const titleChanged = mutations.some(
      (mutation) =>
        mutation.type === "childList" &&
        mutation.target === document.head &&
        Array.from(mutation.addedNodes).some(
          (node) => node.tagName === "TITLE",
        ),
    );

    if (titleChanged || document.title !== "Firka - KRÉTA") {
      clearTimeout(titleCheckTimeout);
      titleCheckTimeout = setTimeout(() => {
        if (document.title !== "Firka - KRÉTA") {
          setPageTitleAndFavicon();
        }
      }, 100);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      observer.observe(document.head, {
        childList: true,
        subtree: true,
      });
    });
  } else {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });
  }
})();
