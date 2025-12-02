const createTemplate = {
  async header() {
    const data = {
      schoolInfo: {
        name: await storageManager.get("schoolName", "OM azonosító - Iskola neve"),
        id: await storageManager.get("schoolCode", ""),
      },
      userData: {
        name: await storageManager.get("userName", "Felhasználónév"),
        time:
          document.querySelector(".usermenu_timer")?.textContent?.trim() ||
          "45:00",
      },
    };

    const schoolSubdomain = await storageManager.get("schoolSubdomain", "");
    const baseUrl = schoolSubdomain ? `https://${schoolSubdomain}.e-kreta.hu` : "";
    const schoolNameFull = `${data.schoolInfo.id} - ${data.schoolInfo.name}`;
    const shortenedSchoolName = helper.shortenSchoolName(schoolNameFull);
    const navItems = [
      { href: `${baseUrl}/Intezmeny/Faliujsag`, page: "dashboard", path: "/Intezmeny/Faliujsag", icon: "dashboard", label: LanguageManager.t("navigation.dashboard") },
      { href: `${baseUrl}/TanuloErtekeles/Osztalyzatok`, page: "grades", path: "/TanuloErtekeles/Osztalyzatok", icon: "grades", label: LanguageManager.t("navigation.grades") },
      { href: `${baseUrl}/Orarend/InformaciokOrarend`, page: "timetable", path: "/Orarend/InformaciokOrarend", icon: "timetable", label: LanguageManager.t("navigation.timetable") },
      { href: `${baseUrl}/Hianyzas/Hianyzasok`, page: "absences", path: "/Hianyzas/Hianyzasok", icon: "absences", label: LanguageManager.t("navigation.absences") },
      { href: "https://eugyintezes.e-kreta.hu/api/bff/login", page: "messages", path: "/" || "/uzenetek", icon: "messages", label: LanguageManager.t("navigation.messages") }
    ];
    const desktopNavItems = navItems.map(item => {
      const isActive = location.pathname === item.path;
      return `<a href="${item.href}" data-page="${item.page}" class="nav-item ${isActive ? "active" : ""}">
        <img src="${chrome.runtime.getURL("icons/" + item.icon + "-" + (isActive ? "active" : "inactive") + ".svg")}" alt="${item.label}">
        ${item.label}
      </a>`;
    }).join("");
    const mobileNavItems = navItems.map(item => {
      const isActive = location.pathname === item.path;
      return `<a href="${item.href}" data-page="${item.page}" class="mobile-nav-item ${isActive ? "active" : ""}">
        <img src="${chrome.runtime.getURL("icons/" + item.icon + "-" + (isActive ? "active" : "inactive") + ".svg")}" alt="${item.label}">
        <span>${item.label}</span>
      </a>`;
    }).join("");
    const userAvatarSvg = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

    const element = `
      <header class="kreta-header">
        <div class="school-info">
          <p class="logo-text">
            <img src="${chrome.runtime.getURL("images/firka_logo.png")}" alt="Firka" class="logo">
            Firka
          </p>
          <div class="school-details" title="${schoolNameFull}">
            ${shortenedSchoolName}
          </div>
        </div>
        
        <nav class="kreta-nav">
          <div class="nav-links">
            ${desktopNavItems}
          </div>
        </nav>

        <div class="user-profile">
          <button class="user-dropdown-btn">
            <div class="user-info">
              <span class="user-name">${data.userData.name}</span>
              <span class="nav-logout-timer" id="logoutTimer">${data.userData.time}</span>
            </div>
            <div class="user-avatar-icon">
              ${userAvatarSvg}
            </div>
          </button>
          <div class="user-dropdown">
            <a href="${baseUrl}/Adminisztracio/Profil" data-page="profile" class="dropdown-item">
              <img src="${chrome.runtime.getURL("icons/profile.svg")}" alt="${LanguageManager.t("navigation.profile")}">
              ${LanguageManager.t("navigation.profile")}
            </a>
            <a href="#" class="dropdown-item" id="settingsBtn">
              <img src="${chrome.runtime.getURL("icons/settings.svg")}" alt="${LanguageManager.t("navigation.settings")}">
              ${LanguageManager.t("navigation.settings")}
            </a>
            <a href="${baseUrl}/Home/Logout" data-page="logout" class="dropdown-item">
              <img src="${chrome.runtime.getURL("icons/logout.svg")}" alt="${LanguageManager.t("navigation.logout")}">
              ${LanguageManager.t("navigation.logout")}
            </a>
          </div>
        </div>
      </header>

      <header class="mobile-header">
        <div class="school-info">
          <p class="logo-text">
            <img src="${chrome.runtime.getURL("images/firka_logo.png")}" alt="Firka" class="logo">
            Firka
          </p>
          <div class="school-details" title="${schoolNameFull}">
            ${shortenedSchoolName}
          </div>
        </div>
      </header>

      <nav class="mobile-bottom-nav">
        ${mobileNavItems}
        <button class="mobile-user-btn" id="mobileUserBtn">
          <div class="user-avatar-icon">
            ${userAvatarSvg}
          </div>
          <span>${LanguageManager.t("navigation.profile")}</span>
        </button>
      </nav>

      <div class="mobile-user-dropdown" id="mobileUserDropdown">
        <div class="mobile-dropdown-header">
          <span class="user-name">${data.userData.name}</span>
          <span class="nav-logout-timer" id="mobileLogoutTimer">${data.userData.time}</span>
        </div>
        <a href="${baseUrl}/Adminisztracio/Profil" data-page="profile" class="mobile-dropdown-item">
          <img src="${chrome.runtime.getURL("icons/profile.svg")}" alt="${LanguageManager.t("navigation.profile")}">
          ${LanguageManager.t("navigation.profile")}
        </a>
        <a href="#" class="mobile-dropdown-item" id="mobileSettingsBtn">
          <img src="${chrome.runtime.getURL("icons/settings.svg")}" alt="${LanguageManager.t("navigation.settings")}">
          ${LanguageManager.t("navigation.settings")}
        </a>
        <a href="${baseUrl}/Home/Logout" data-page="logout" class="mobile-dropdown-item">
          <img src="${chrome.runtime.getURL("icons/logout.svg")}" alt="${LanguageManager.t("navigation.logout")}">
          ${LanguageManager.t("navigation.logout")}
        </a>
      </div>
    `;

    const startTime = parseInt(data.userData.time?.match(/\d+/)?.[0] || "45");
    let timeLeft = startTime * 60;

    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      const desktopTimer = document.getElementById("logoutTimer");
      const mobileTimer = document.getElementById("mobileLogoutTimer");
      
      if (desktopTimer) desktopTimer.textContent = timeText;
      if (mobileTimer) mobileTimer.textContent = timeText;
      if (timeLeft <= 0) {
        window.location.href = "/Home/Logout";
      } else {
        timeLeft--;
      }
    };

    setInterval(updateTimer, 1000);

    return element;
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  await helper.waitForElement("#settingsBtn");

  document.querySelector("#settingsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL("settings/index.html");
    window.open(url, "_blank", "width=400,height=600");
  });

  document.querySelector("#mobileSettingsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL("settings/index.html");
    window.open(url, "_blank", "width=400,height=600");
  });
});
