async function transformLoginPage() {
  try {
    while (
      typeof window.LanguageManager === "undefined" ||
      !window.LanguageManager.t("login.username_placeholder") ||
      window.LanguageManager.t("login.username_placeholder") === "login.username_placeholder"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (document.readyState !== "complete") {
      await new Promise((resolve) => {
        window.addEventListener("load", resolve);
      });
    }

    const existingForm = document.querySelector("form");
    const formData = {
      action: existingForm?.getAttribute("action") || "",
      returnUrl: document.querySelector("#ReturnUrl")?.value || "",
      instituteCode: document.querySelector("#instituteCode")?.value || "",
      requestToken:
        document.querySelector('input[name="__RequestVerificationToken"]')
          ?.value || "",
      userName: document.querySelector("#UserName")?.value || "",
      password: document.querySelector("#Password")?.value || "",
    };

    const titleElement = document.querySelector(".page-title");
    const schoolInfo = {
      name: titleElement?.querySelector("b")?.textContent?.trim() || "",
      kretaId: "",
      omCode: "",
    };

    const spanElement = titleElement?.querySelector("span");
    if (spanElement) {
      const lines =
        spanElement.textContent?.split("\n").map((line) => line.trim()) || [];
      schoolInfo.kretaId = lines[0] || "";
      schoolInfo.omCode = (lines[1] || "").replace(
        `${LanguageManager.t("login.kreta_id")}: `,
        "",
      );
    }

    const rawSystemMessage =
      document.querySelector(".alert-primary")?.textContent?.trim() || "";
    const systemMessage = rawSystemMessage
      .replace("Rendszerértesítés", "")
      .trim();

    const newHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="card-header">
            <p class="logo-text">
              <img src=${chrome.runtime.getURL("images/firka_logo.png")} alt="Firka" class="logo">
              Firka
            </p>
            <h1 class="school-name">${schoolInfo.name}</h1>
            <div class="school-details">
              ${schoolInfo.kretaId ? `<div>${schoolInfo.kretaId}</div>` : ""}
              ${schoolInfo.omCode ? `<div>${LanguageManager.t("login.kreta_id")}: ${schoolInfo.omCode}</div>` : ""}
            </div>
          </div>

          <form class="login-form" method="post" action="${formData.action}" id="loginForm" novalidate>
            <input type="hidden" id="ReturnUrl" name="ReturnUrl" value="${formData.returnUrl}">
            <input type="hidden" id="instituteCode" name="InstituteCode" value="${formData.instituteCode}">
            <input type="hidden" id="IsTemporaryLogin" name="IsTemporaryLogin" value="False">
            <input type="hidden" id="loginType" name="loginType" value="InstituteLogin">
            <input name="__RequestVerificationToken" type="hidden" value="${formData.requestToken}">

            <div class="form-group">
              <input class="form-control" type="text" id="UserName" name="UserName" 
                     placeholder="${LanguageManager.t("login.username_placeholder")}" maxlength="256" autocomplete="username" required value="${formData.userName}">
              <div class="error-message">${LanguageManager.t("login.username_required")}</div>
            </div>

            <div class="form-group password-group">
              <input class="form-control" type="password" id="Password" name="Password" 
                     placeholder="${LanguageManager.t("login.password_placeholder")}" maxlength="256" autocomplete="current-password" required value="${formData.password}">
              <button type="button" class="show-password" aria-label="${LanguageManager.t("login.show_password")}">
                <img src="${chrome.runtime.getURL("icons/eye-off.svg")}" alt="Show password" class="icon-eye">
              </button>
              <div class="error-message">${LanguageManager.t("login.password_required")}</div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-login">
                <span class="spinner"></span>
                <span class="btn-text">${LanguageManager.t("login.login_button")}</span>
              </button>
              <div class="help-links">
                <a href="https://${schoolInfo.omCode ? `${schoolInfo.omCode}` : ""}.e-kreta.hu/Adminisztracio/ElfelejtettJelszo" class="help-link">${LanguageManager.t("login.forgot_password")}</a>
                <a href="https://tudasbazis.ekreta.hu/pages/viewpage.action?pageId=2425086" target="_blank" class="help-link">${LanguageManager.t("login.help_link")}</a>
              </div>
            </div>
          </form>
        </div>

        ${
          systemMessage
            ? `
          <div class="system-message">
            <h4>${LanguageManager.t("login.system_message")}</h4>
            <p>${systemMessage}</p>
          </div>
        `
            : ""
        }

        <footer class="login-footer">
          <a href="https://tudasbazis.ekreta.hu/pages/viewpage.action?pageId=4064926" 
             target="_blank" class="privacy-link">${LanguageManager.t("login.privacy_policy")}</a>
        </footer>
      </div>
    `;

    document.body.innerHTML = '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHTML, 'text/html');
    const tempDiv = doc.body;
    while (tempDiv.firstChild) {
      document.body.appendChild(tempDiv.firstChild);
    }

    setupEventListeners();
  } catch (error) {
    console.error("Error transforming page:", error);
  }
}

function setupEventListeners() {
  const loginForm = document.getElementById("loginForm");
  const passwordInput = document.getElementById("Password");
  const togglePasswordBtn = document.querySelector(".show-password");
  const formInputs = document.querySelectorAll(".form-control");

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      const icon = togglePasswordBtn.querySelector(".icon-eye");
      icon.src = chrome.runtime.getURL(
        `icons/${isPassword ? "eye-on" : "eye-off"}.svg`,
      );
    });
  }

  formInputs.forEach((input) => {
    input.addEventListener("input", () => {
      validateInput(input);
    });

    input.addEventListener("blur", () => {
      validateInput(input, true);
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", handleSubmit);
  }
}

function validateInput(input, showError = false) {
  const isValid = input.value.trim().length > 0;
  const errorElement = input.nextElementSibling;

  if (!isValid && showError) {
    input.classList.add("error");
    errorElement?.classList.add("show");
  } else {
    input.classList.remove("error");
    errorElement?.classList.remove("show");
  }

  return isValid;
}

function handleSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const inputs = form.querySelectorAll(".form-control[required]");
  let isValid = true;

  inputs.forEach((input) => {
    if (!validateInput(input, true)) {
      isValid = false;
    }
  });

  const submitButton = form.querySelector(".btn-login");
  const spinner = submitButton.querySelector(".spinner");
  const buttonText = submitButton.querySelector(".btn-text");

  submitButton.disabled = true;
  spinner.style.display = "inline-block";
  buttonText.style.opacity = "0";

  form.submit();
}

if (window.location.href.includes("idp.e-kreta.hu/Account/Login")) {
  (async () => {
    while (typeof window.LanguageManager === "undefined") {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    transformLoginPage().catch((error) => {
      console.error("Error transforming login page:", error);
    });
  })();
}
