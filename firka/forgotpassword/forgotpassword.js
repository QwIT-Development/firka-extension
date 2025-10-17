(() => {
  // reCAPTCHA functionality removed for security compliance

  const loadDependencies = async () => {
    // reCAPTCHA functionality removed for security compliance
    // Extension now works without external script dependencies
  };

  const createPageStructure = () => {
    // Biztonságos DOM létrehozás innerHTML helyett
    document.body.innerHTML = '';
    // Biztonságos HTML parsing DOMParser használatával
    const parser = new DOMParser();
    const doc = parser.parseFromString(`
      <div class="forgot-container">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
        <style>
          .g-recaptcha {
            margin-top: 5px;
            display: flex;
            justify-content: center;
          }
        </style>
        
        <div class="forgot-card">
          <header class="forgot-header">
            <p class="logo-text">
              <img src="${chrome.runtime.getURL("images/firka_logo.png")}" alt="Firka" class="logo">
              Firka
            </p>
          </header>

          <h1 class="forgot-title" data-i18n="forgotpassword.title">Elfelejtett jelszó</h1>
          
          <form id="forgotForm" novalidate>
            <div class="form-group">
              <label class="form-label" for="BejelentkezesiNev" data-i18n="forgotpassword.om_id_label">OM azonosító</label>
              <input type="text" id="BejelentkezesiNev" name="BejelentkezesiNev" class="form-control" 
                     data-i18n-attr="placeholder" data-i18n="forgotpassword.om_id_placeholder" 
                     placeholder="Adja meg az OM azonosítóját" required>
              <div class="error-message" data-i18n="forgotpassword.om_id_required">Az OM azonosító megadása kötelező</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="EmailCim" data-i18n="forgotpassword.email_label">E-mail cím</label>
              <input type="email" id="EmailCim" name="EmailCim" class="form-control" 
                     data-i18n-attr="placeholder" data-i18n="forgotpassword.email_placeholder" 
                     placeholder="Adja meg az e-mail címét" required>
              <div class="error-message" data-i18n="forgotpassword.email_required">Az e-mail cím megadása kötelező</div>
            </div>

            <!-- reCAPTCHA container removed for security compliance -->

            <div class="form-actions">
              <a href="/Adminisztracio/Login" class="help-link" data-i18n="forgotpassword.back_to_login">
                Vissza a bejelentkezéshez
              </a>
              <button type="submit" class="btn-submit" data-i18n="forgotpassword.reset_button">
                Jelszó visszaállítása
              </button>
            </div>
          </form>
        </div>
      </div>
    `, 'text/html');
    const tempDiv = doc.body;
    
    // Biztonságos DOM hozzáadás
    while (tempDiv.firstChild) {
      document.body.appendChild(tempDiv.firstChild);
    }
  };

  const transformForgotPasswordPage = async () => {
    await loadDependencies();

    const isDarkMode = localStorage.getItem("darkMode") === "true";
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light",
    );

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "toggleTheme") {
        document.documentElement.setAttribute(
          "data-theme",
          message.darkMode ? "dark" : "light",
        );
        localStorage.setItem("darkMode", message.darkMode);
      }
    });

    createPageStructure();

    let attempts = 0;
    const maxAttempts = 50;

    const waitForLanguageManager = () => {
      return new Promise((resolve) => {
        const checkLanguageManager = () => {
          attempts++;
          if (typeof LanguageManager !== "undefined" && LanguageManager.t) {
            setTimeout(resolve, 200);
          } else if (attempts < maxAttempts) {
            setTimeout(checkLanguageManager, 100);
          } else {
            console.warn("LanguageManager not available, using fallback texts");
            resolve();
          }
        };
        checkLanguageManager();
      });
    };

    await waitForLanguageManager();

    if (typeof LanguageManager !== "undefined" && LanguageManager.t) {
      const elements = document.querySelectorAll("[data-i18n]");
      elements.forEach((element) => {
        const key = element.getAttribute("data-i18n");
        const translation = LanguageManager.t(key);

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

    // reCAPTCHA rendering removed for security compliance

    setupFormValidation();
  };

  const setupFormValidation = () => {
    const form = document.getElementById("forgotForm");
    const inputs = form.querySelectorAll(".form-control");

    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        validateInput(input);
      });

      input.addEventListener("blur", () => {
        validateInput(input, true);
      });
    });

    form.addEventListener("submit", handleSubmit);
  };

  const validateInput = (input, showError = false) => {
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
  };

  const showMessage = (message, isError = false) => {
    const existingMessage = document.querySelector(".message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isError ? "error" : "success"}`;
    messageDiv.textContent = message;

    const form = document.getElementById("forgotForm");
    form.insertBefore(messageDiv, form.firstChild);

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const form = event.target;
    const inputs = form.querySelectorAll(".form-control[required]");
    let isValid = true;

    inputs.forEach((input) => {
      if (!validateInput(input, true)) {
        isValid = false;
      }
    });

    const emailInput = form.querySelector("#EmailCim");
    if (emailInput.value && !validateEmail(emailInput.value)) {
      emailInput.classList.add("error");
      const errorElement = emailInput.nextElementSibling;
      if (errorElement) {
        errorElement.textContent = LanguageManager.t(
          "forgotpassword.invalid_email",
        );
        errorElement.classList.add("show");
      }
      isValid = false;
    }

    // reCAPTCHA validation removed for security compliance

    if (!isValid) {
      return;
    }

    const submitButton = form.querySelector(".btn-submit");
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = LanguageManager.t("loading.text") || "Küldés...";

    try {
      const formData = new FormData(form);

      // reCAPTCHA data removed for security compliance

      const response = await fetch(
        "/Adminisztracio/ElfelejtettJelszo/LinkKuldes",
        {
          method: "POST",
          body: formData,
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.Success) {
        showMessage(LanguageManager.t("forgotpassword.success_message"));

        form.reset();

        // reCAPTCHA reset removed

        setTimeout(() => {
          window.location.href = "/Adminisztracio/Login";
        }, 3000);
      } else {
        showMessage(
          result.Message || LanguageManager.t("forgotpassword.error_message"),
          true,
        );

        // reCAPTCHA reset removed
      }
    } catch (error) {
      console.error("Password reset error:", error);
      showMessage(LanguageManager.t("forgotpassword.error_message"), true);

      // reCAPTCHA reset removed
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  };

  if (window.location.href.includes("/Adminisztracio/ElfelejtettJelszo")) {
    transformForgotPasswordPage().catch(console.error);
  }
})();
