async function transformTwoFactorPage() {
  try {
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve);
      });
    }

    if (typeof loadingScreen !== 'undefined') {
      loadingScreen.show();
    }

    const existingForm = document.querySelector('form');
    const formData = {
      action: existingForm?.getAttribute('action') || '',
      clientId: document.querySelector('#ClientId')?.value || '',
      rememberLogin: document.querySelector('#RememberLogin')?.value || 'False',
      returnUrl: document.querySelector('#ReturnUrl')?.value || '',
      isRecoveryCode: document.querySelector('#IsRecoveryCode')?.value || 'False',
      requestToken: document.querySelector('input[name="__RequestVerificationToken"]')?.value || '',
      trustDeviceValue: document.querySelector('input[name="TrustDevice"][type="hidden"]')?.value || 'false'
    };
    
    const newHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="card-header">
            <p class="logo-text">
              <img src=${chrome.runtime.getURL('images/firka_logo.png')} alt="Firka" class="logo">
              Firka
            </p>
            <h1 class="twofactor-title">${LanguageManager.t('twofactor.title')}</h1>
          </div>

          <form class="twofactor-form" action="${formData.action}" method="post" id="twoFactorForm">
            <input type="hidden" id="ClientId" name="ClientId" value="${formData.clientId}">
            <input type="hidden" id="RememberLogin" name="RememberLogin" value="${formData.rememberLogin}">
            <input type="hidden" id="ReturnUrl" name="ReturnUrl" value="${formData.returnUrl}">
            <input type="hidden" id="IsRecoveryCode" name="IsRecoveryCode" value="${formData.isRecoveryCode}">
            <input name="__RequestVerificationToken" type="hidden" value="${formData.requestToken}">

            <div class="form-group password-group">
              <input class="form-control" type="password" id="VerificationCode" name="VerificationCode" 
                     placeholder="${LanguageManager.t('twofactor.code_placeholder')}" maxlength="256" autocomplete="off" required autofocus>
              <button type="button" class="show-password" aria-label="${LanguageManager.t('twofactor.show_code')}">
                <img src="${chrome.runtime.getURL('icons/eye-off.svg')}" alt="Show password" class="icon-eye">
              </button>
              <div class="error-message">${LanguageManager.t('twofactor.code_required')}</div>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="trustDevice" name="TrustDevice" value="true">
              <label class="form-check-label" for="trustDevice">
                ${LanguageManager.t('twofactor.trust_device')}
              </label>
              <input name="TrustDevice" type="hidden" value="false">
            </div>

            <div class="d-flex justify-content-center mb-3 mt-4">
              <button type="submit" class="btn-kreta">${LanguageManager.t('twofactor.verify_button')}</button>
            </div>

            <div class="d-flex justify-content-center mt-3">
              <span class="subtext">
                ${LanguageManager.t('twofactor.no_access')} 
                <button type="submit" class="btn-link" formaction="/account/loginwithrecoverycode">
                  ${LanguageManager.t('twofactor.recovery_code')}
                </button>
              </span>
            </div>
          </form>
        </div>

        <footer class="login-footer">
          <a href="https://tudasbazis.ekreta.hu/pages/viewpage.action?pageId=4064926" 
             target="_blank" class="privacy-link">${LanguageManager.t('login.privacy_policy')}</a>
        </footer>
      </div>
    `;
    
    document.body.innerHTML = newHTML;
    applyTheme();
    setupEventListeners();
    if (typeof loadingScreen !== 'undefined') {
      loadingScreen.hide();
    }

  } catch (error) {
    console.error('Error transforming two-factor page:', error);
    if (typeof loadingScreen !== 'undefined') {
      loadingScreen.hide();
    }
  }
}

function applyTheme() {
  try {
    if (typeof getCookie === 'function') {
      const theme = getCookie('theme') || 'light-blue';
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

function setupEventListeners() {
  const twoFactorForm = document.getElementById('twoFactorForm');
  const verificationInput = document.getElementById('VerificationCode');
  const togglePasswordBtn = document.querySelector('.show-password');
  const formInputs = document.querySelectorAll('.form-control');

  if (togglePasswordBtn && verificationInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = verificationInput.type === 'password';
      verificationInput.type = isPassword ? 'text' : 'password';
      const icon = togglePasswordBtn.querySelector('.icon-eye');
      icon.src = chrome.runtime.getURL(`icons/${isPassword ? 'eye-on' : 'eye-off'}.svg`);
    });
  }
  formInputs.forEach(input => {
    input.addEventListener('input', () => {
      validateInput(input);
    });

    input.addEventListener('blur', () => {
      validateInput(input, true);
    });
  });
  if (twoFactorForm) {
    twoFactorForm.addEventListener('submit', handleSubmit);
  }
}

function validateInput(input, showError = false) {
  const isValid = input.value.trim().length > 0;
  const errorElement = input.nextElementSibling?.nextElementSibling;
  
  if (!isValid && showError) {
    input.classList.add('error');
    errorElement?.classList.add('show');
  } else {
    input.classList.remove('error');
    errorElement?.classList.remove('show');
  }
  
  return isValid;
}

function handleSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const inputs = form.querySelectorAll('.form-control[required]');
  let isValid = true;
  inputs.forEach(input => {
    if (!validateInput(input, true)) {
      isValid = false;
    }
  });
  if (isValid) {
    const submitButton = form.querySelector('.btn-kreta');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = `<span class="spinner"></span><span class="btn-text">${LanguageManager.t('twofactor.verifying')}</span>`;
    }
    
    form.submit();
  }
}
transformTwoFactorPage();