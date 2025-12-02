const COOKIE_KEYS = {
  SCHOOL_NAME: "schoolName",
  SCHOOL_CODE: "schoolCode",
  USER_NAME: "userName",
  SCHOOL_SUBDOMAIN: "schoolSubdomain",
};

const DEFAULT_VALUES = {
  SCHOOL: LanguageManager.t("navigation.school_default"),
  USER: LanguageManager.t("navigation.user_default"),
  TIMER: "45:00",
};

async function updateHeaderInfo() {
  const schoolName = document.querySelector(".nav-school-name");
  const userName = document.querySelector(".nav-user-name");
  const logoutTimer = document.querySelector(".nav-logout-timer");

  const userData = {
    schoolName:
      await storageManager.get("schoolName", DEFAULT_VALUES.SCHOOL),
    schoolId: await storageManager.get("schoolCode", ""),
    name: await storageManager.get("userName", DEFAULT_VALUES.USER),
    time:
      document.querySelector(".usermenu_timer")?.textContent?.trim() ||
      DEFAULT_VALUES.TIMER,
  };

  if (schoolName) {
    schoolName.textContent = `${userData.schoolId} - ${userData.schoolName}`;
  }

  if (userName) {
    userName.textContent = userData.name;
  }

  if (logoutTimer) {
    startLogoutTimer(userData.time);
  }
}

function startLogoutTimer(timeString) {
  const startTime = parseInt(timeString?.match(/\d+/)?.[0] || "45");
  let timeLeft = startTime * 60;
  
  const updateTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const desktopTimer = document.querySelector("#logoutTimer");
    const mobileTimer = document.querySelector("#mobileLogoutTimer");
    
    if (desktopTimer) desktopTimer.textContent = timeText;
    if (mobileTimer) mobileTimer.textContent = timeText;

    if (timeLeft <= 0) {
      window.location.href = "/Home/Logout";
    }
    timeLeft--;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

function setupUserDropdown() {
  const userBtn = document.querySelector(".user-dropdown-btn");
  const userDropdown = document.querySelector(".user-dropdown");

  userBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown?.classList.toggle("show");
    userBtn?.classList.toggle("open");
  });

  const mobileUserBtn = document.querySelector("#mobileUserBtn");
  const mobileUserDropdown = document.querySelector("#mobileUserDropdown");

  mobileUserBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    mobileUserDropdown?.classList.toggle("show");
    mobileUserBtn?.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!userBtn?.contains(e.target) && !userDropdown?.contains(e.target)) {
      userDropdown?.classList.remove("show");
      userBtn?.classList.remove("open");
    }

    if (!mobileUserBtn?.contains(e.target) && !mobileUserDropdown?.contains(e.target)) {
      mobileUserDropdown?.classList.remove("show");
      mobileUserBtn?.classList.remove("active");
    }
  });

  const mobileDropdownItems = document.querySelectorAll(".mobile-dropdown-item");
  mobileDropdownItems.forEach(item => {
    item.addEventListener("click", () => {
      mobileUserDropdown?.classList.remove("show");
      mobileUserBtn?.classList.remove("active");
    });
  });
}

function setupSettingsButton() {
  document.getElementById("settingsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL("settings/index.html");
    window.open(url, "_blank", "width=400,height=600");
  });

  document.getElementById("mobileSettingsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL("settings/index.html");
    window.open(url, "_blank", "width=400,height=600");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await updateHeaderInfo();
  setupUserDropdown();
  setupSettingsButton();
});
