(() => {
    const transformForgotPasswordPage = () => {
      const isDarkMode = localStorage.getItem('darkMode') === 'true';
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
      
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'toggleTheme') {
          document.documentElement.setAttribute('data-theme', message.darkMode ? 'dark' : 'light');
          localStorage.setItem('darkMode', message.darkMode);
        }
      });
      
      document.body.innerHTML = `
        <div class="forgot-container">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
          <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
          
          <header class="forgot-header">
            <p class="logo-text">
              <img src="${chrome.runtime.getURL('images/firka_logo.png')}" alt="Firka" class="logo">
              Firka
            </p>
          </header>
  
          <div class="forgot-card">
            <h1 class="forgot-title">${LanguageManager.t('forgotpassword.title')}</h1>
            
            <form id="forgotForm" novalidate>
              <div class="form-group">
                <label class="form-label" for="username">${LanguageManager.t('forgotpassword.om_id_label')}</label>
                <input type="text" id="username" name="username" class="form-control" 
                       placeholder="${LanguageManager.t('forgotpassword.om_id_placeholder')}" required>
                <div class="error-message">${LanguageManager.t('forgotpassword.om_id_required')}</div>
              </div>
  
              <div class="form-group">
                <label class="form-label" for="email">${LanguageManager.t('forgotpassword.email_label')}</label>
                <input type="email" id="email" name="email" class="form-control" 
                       placeholder="${LanguageManager.t('forgotpassword.email_placeholder')}" required>
                <div class="error-message">${LanguageManager.t('forgotpassword.email_required')}</div>
              </div>
  
              <div class="g-recaptcha" data-sitekey="6LcmPB8dAAAAACJPQBj7WfpBoBsEfyibZeIG5Vbl"></div>
  
              <div class="form-actions">
                <a href="/Adminisztracio/Login" class="help-link">
                  ${LanguageManager.t('forgotpassword.back_to_login')}
                </a>
                <button type="submit" class="btn-submit">
                  ${LanguageManager.t('forgotpassword.reset_button')}
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
  
      setupFormValidation();
    };
  
    const setupFormValidation = () => {
      const form = document.getElementById('forgotForm');
      const inputs = form.querySelectorAll('.form-control');
  
      inputs.forEach(input => {
        
        input.addEventListener('input', () => {
          validateInput(input);
        });
  
        
        input.addEventListener('blur', () => {
          validateInput(input, true);
        });
      });
  
      form.addEventListener('submit', handleSubmit);
    };
  
    const validateInput = (input, showError = false) => {
      const isValid = input.value.trim().length > 0;
      const errorElement = input.nextElementSibling;
      
      if (!isValid && showError) {
        input.classList.add('error');
        errorElement?.classList.add('show');
      } else {
        input.classList.remove('error');
        errorElement?.classList.remove('show');
      }
      
      return isValid;
    };
  
    const handleSubmit = async (event) => {
      event.preventDefault();
      
      const form = event.target;
      const inputs = form.querySelectorAll('.form-control[required]');
      let isValid = true;
      
      inputs.forEach(input => {
        if (!validateInput(input, true)) {
          isValid = false;
        }
      });
  
      if (!isValid) {
        return;
      }
  
      const submitButton = form.querySelector('.btn-submit');
      submitButton.disabled = true;
  
      try {
        const formData = new FormData(form);
        const response = await fetch('/Adminisztracio/ElfelejtettJelszo/LinkKuldes', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
  
        const result = await response.json();
  
        if (result.Success) {
          window.location.href = '/Adminisztracio/Login';
        } else {
          
          alert(result.Message || LanguageManager.t('forgotpassword.error_message'));
          grecaptcha.reset();
        }
      } catch (error) {
        //alert('Hiba történt a jelszó visszaállítása során.');
        grecaptcha.reset();
      } finally {
        submitButton.disabled = false;
      }
    };
    
    if (window.location.href.includes('/Adminisztracio/ElfelejtettJelszo')) {
      transformForgotPasswordPage();
    }
  })();