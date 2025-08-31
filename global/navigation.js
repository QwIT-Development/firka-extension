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

function updateHeaderInfo() {
  const schoolName = document.querySelector(".nav-school-name");
  const userName = document.querySelector(".nav-user-name");
  const logoutTimer = document.querySelector(".nav-logout-timer");

  const userData = {
    schoolName:
      cookieManager.get(COOKIE_KEYS.SCHOOL_NAME) || DEFAULT_VALUES.SCHOOL,
    schoolId: cookieManager.get(COOKIE_KEYS.SCHOOL_CODE) || "",
    name: cookieManager.get(COOKIE_KEYS.USER_NAME) || DEFAULT_VALUES.USER,
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
  const timerElement = document.querySelector(".nav-logout-timer");

  const updateTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    if (timeLeft <= 0) {
      window.location.href = "/Home/Logout";
    }
    timeLeft--;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  updateHeaderInfo();
});

function setupUserDropdown() {
  const userBtn = document.querySelector(".user-dropdown-btn");
  const userDropdown = document.querySelector(".user-dropdown");

  userBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown?.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    userDropdown?.classList.remove("show");
  });
}

function setupSettingsButton() {
  document.getElementById("settingsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL("settings/index.html");
    window.open(url, "_blank", "width=400,height=600");
  });
}

function setupMobileNavigation() {
  setTimeout(() => {
    const navToggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".kreta-nav");

    if (!navToggle || !nav) {
      return;
    }

    navToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      nav.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !navToggle.contains(e.target)) {
        nav.classList.remove("show");
      }
    });

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        nav.classList.remove("show");
      });
    });
  }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
  updateHeaderInfo();
  setupUserDropdown();
  setupSettingsButton();
  setupMobileNavigation();
});
