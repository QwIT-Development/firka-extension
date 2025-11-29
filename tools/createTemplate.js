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

    const element = `<header class="kreta-header">
            <div class="school-info">
                <p class="logo-text">
                    <img src="${chrome.runtime.getURL("images/firka_logo.png")}" alt="Firka" class="logo">
                    Firka
                </p>
                <div class="school-details" title="${schoolNameFull}">
                    ${shortenedSchoolName}
                </div>
            </div>
            
            <button class="nav-toggle" aria-label="${LanguageManager.t("navigation.nav_toggle")}">
                <svg viewBox="0 0 24 24">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
            </button>
            
            <nav class="kreta-nav">
            <div class="nav-links">
                <a href="${baseUrl}/Intezmeny/Faliujsag" data-page="dashboard" class="nav-item ${location.pathname == "/Intezmeny/Faliujsag" ? "active" : ""}">
                <img src="${chrome.runtime.getURL("icons/dashboard-" + (location.pathname == "/Intezmeny/Faliujsag" ? "active" : "inactive") + ".svg")}" alt="${LanguageManager.t("navigation.dashboard")}">
                ${LanguageManager.t("navigation.dashboard")}
                </a>
                <a href="${baseUrl}/TanuloErtekeles/Osztalyzatok" data-page="grades" class="nav-item ${location.pathname == "/TanuloErtekeles/Osztalyzatok" ? "active" : ""}">
                <img src="${chrome.runtime.getURL("icons/grades-" + (location.pathname == "/TanuloErtekeles/Osztalyzatok" ? "active" : "inactive") + ".svg")}" alt="${LanguageManager.t("navigation.grades")}">
                ${LanguageManager.t("navigation.grades")}
                </a>
                <a href="${baseUrl}/Orarend/InformaciokOrarend" data-page="timetable" class="nav-item ${location.pathname == "/Orarend/InformaciokOrarend" ? "active" : ""}">
                <img src="${chrome.runtime.getURL("icons/timetable-" + (location.pathname == "/Orarend/InformaciokOrarend" ? "active" : "inactive") + ".svg")}" alt="${LanguageManager.t("navigation.timetable")}">
                ${LanguageManager.t("navigation.timetable")}
                </a>
                <a href="${baseUrl}/Hianyzas/Hianyzasok" data-page="absences" class="nav-item ${location.pathname == "/Hianyzas/Hianyzasok" ? "active" : ""}">
                <img src="${chrome.runtime.getURL("icons/absences-" + (location.pathname == "/Hianyzas/Hianyzasok" ? "active" : "inactive") + ".svg")}" alt="${LanguageManager.t("navigation.absences")}">
                ${LanguageManager.t("navigation.absences")}
                </a>
                <a href="https://eugyintezes.e-kreta.hu/api/bff/login" data-page="messages" class="nav-item ${location.pathname == "/uzenetek" ? "active" : ""}">
                <img src="${chrome.runtime.getURL("icons/messages-" + (location.pathname == "/uzenetek" ? "active" : "inactive") + ".svg")}" alt="${LanguageManager.t("navigation.messages")}">
                ${LanguageManager.t("navigation.messages")}
                </a>
            </div>
            </nav>

            <div class="user-profile">
            <button class="user-dropdown-btn">
                <div class="user-info">
                <span class="user-name">${data.userData.name}</span>
                <span class="nav-logout-timer" id="logoutTimer">${data.userData.time}</span>
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
        </header>`;

    const startTime = parseInt(data.userData.time?.match(/\d+/)?.[0] || "45");
    let timeLeft = startTime * 60;

    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const timerEl = document.getElementById("logoutTimer");
      if (timerEl) {
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }

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
  document.querySelector("#settingsBtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL("settings/index.html");
    window.open(url, "_blank", "width=400,height=600");
  });
});
