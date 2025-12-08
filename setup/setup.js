let currentStep = 1;
const totalSteps = 3;
let selectedTheme = 'light-green';
let selectedLanguage = 'hu';

document.addEventListener('DOMContentLoaded', async () => {
  selectedTheme = await storageManager.get('themePreference', 'light-green');
  selectedLanguage = await storageManager.get('languagePreference', 'hu');

  initializeThemeSelection();
  initializeLanguageSelection();

  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('backBtn').addEventListener('click', previousStep);
  document.getElementById('finishBtn').addEventListener('click', finishSetup);

  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => selectTheme(card.dataset.theme));
  });

  document.querySelectorAll('.language-card').forEach(card => {
    card.addEventListener('click', () => selectLanguage(card.dataset.language));
  });

  applyTheme(selectedTheme);
});

function initializeThemeSelection() {
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    if (card.dataset.theme === selectedTheme) {
      card.classList.add('selected');
    }
  });
}

function initializeLanguageSelection() {
  const languageCards = document.querySelectorAll('.language-card');
  languageCards.forEach(card => {
    if (card.dataset.language === selectedLanguage) {
      card.classList.add('selected');
    }
  });
}

function selectTheme(theme) {
  selectedTheme = theme;

  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.remove('selected');
  });

  document.querySelector(`[data-theme="${theme}"]`).classList.add('selected');

  applyTheme(theme);
}

function selectLanguage(language) {
  selectedLanguage = language;

  document.querySelectorAll('.language-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`[data-language="${language}"]`).classList.add('selected');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function nextStep() {
  if (currentStep < totalSteps) {
    saveCurrentStepSettings();

    currentStep++;
    updateStepDisplay();
  }
}

function previousStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

async function saveCurrentStepSettings() {
  if (currentStep === 1) {
    await storageManager.set('themePreference', selectedTheme);
  } else if (currentStep === 2) {
    await storageManager.set('language', selectedLanguage);
    await storageManager.set('languagePreference', selectedLanguage);
    if (window.LanguageManager) {
      await window.LanguageManager.changeLanguage(selectedLanguage);
    }
  }
}

function updateStepDisplay() {
  document.querySelectorAll('.progress-step').forEach(step => {
    const stepNumber = parseInt(step.dataset.step);
    if (stepNumber < currentStep) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (stepNumber === currentStep) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });

  document.querySelectorAll('.setup-step').forEach(step => {
    if (parseInt(step.dataset.step) === currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });

  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const finishBtn = document.getElementById('finishBtn');

  if (currentStep === 1) {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'flex';
  }

  if (currentStep === totalSteps) {
    nextBtn.style.display = 'none';
    finishBtn.style.display = 'flex';
  } else {
    nextBtn.style.display = 'flex';
    finishBtn.style.display = 'none';
  }
}

async function finishSetup() {
  await saveCurrentStepSettings();

  await storageManager.set('setupCompleted', true);

  window.location.href = 'https://intezmenykereso.e-kreta.hu/';
}
