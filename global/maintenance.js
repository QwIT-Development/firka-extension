function loadMaintenanceCSS() {
    const maintenanceCSS = document.createElement('link');
    maintenanceCSS.rel = 'stylesheet';
    maintenanceCSS.href = chrome.runtime.getURL('global/maintenance.css');
    document.head.appendChild(maintenanceCSS);
}

function checkMaintenancePage() {
    const maintenanceContent = document.querySelector('.login_content');
    const bodyText = document.body ? document.body.textContent : '';

    const specificMaintenanceMessage = 'Kedves Felhasználók! A KRÉTA rendszer jelenleg frissítés alatt van, hamarosan újra elérhetővé válik. Köszönjük türelmüket és megértésüket! KRÉTA Csapat';
    const hasSpecificMessage = bodyText.includes('Kedves Felhasználók!') && 
                              bodyText.includes('A KRÉTA rendszer jelenleg frissítés alatt van') && 
                              bodyText.includes('KRÉTA Csapat');

    const hasGeneralMaintenance = maintenanceContent && 
                                 (maintenanceContent.textContent.includes('frissítés alatt') || 
                                  maintenanceContent.textContent.includes('under maintenance'));
    
    if (hasSpecificMessage || hasGeneralMaintenance) {
        const body = document.body;
        const mainLogo = chrome.runtime.getURL('images/firka_logo_128.png');
        const cactusImage = chrome.runtime.getURL('images/cactus.png');

        const removeLoadingElements = () => {
            const loadingScreen = document.querySelector('.loading-screen');
            if (loadingScreen) loadingScreen.remove();
            
            const kretaProgressBar = document.querySelector('#KretaProgressBar');
            if (kretaProgressBar) kretaProgressBar.remove();
            
            const modalBackground = document.querySelector('.modalBckgroundMain');
            if (modalBackground) modalBackground.remove();

            const overlays = document.querySelectorAll('.modalBckgroundMain, .loading-screen, #KretaProgressBar');
            overlays.forEach(overlay => overlay.remove());
        };
        
        removeLoadingElements();
        setTimeout(removeLoadingElements, 100);

        const existingStyles = document.querySelectorAll('link[rel="stylesheet"], style');
        existingStyles.forEach(style => style.remove());

        body.innerHTML = '';
        body.classList.add('maintenance-mode');
        body.classList.add('theme-enabled');
        body.classList.add('loaded');
        
        
        loadMaintenanceCSS();
        
        
        const container = document.createElement('div');
        container.className = 'maintenance-container';
        
        const logo = document.createElement('img');
        logo.src = mainLogo;
        logo.alt = 'Firka Logo';
        logo.className = 'maintenance-logo';
        
        const title = document.createElement('h1');
        title.className = 'maintenance-title';
        title.textContent = window.LanguageManager ? window.LanguageManager.t('maintenance.title') : 'Karbantartás';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'maintenance-message';
        
        const paragraph1 = document.createElement('p');
        paragraph1.textContent = window.LanguageManager ? window.LanguageManager.t('maintenance.message1') : 'A KRÉTA rendszer jelenleg frissítés alatt van, hamarosan újra elérhetővé válik.';
        
        const paragraph2 = document.createElement('p');
        paragraph2.textContent = window.LanguageManager ? window.LanguageManager.t('maintenance.message2') : 'Köszönjük türelmüket és megértésüket!';
        
        const footer = document.createElement('div');
        footer.className = 'maintenance-footer';
        footer.textContent = window.LanguageManager ? window.LanguageManager.t('maintenance.team') : 'KRÉTA Csapat';

        const cactus = document.createElement('img');
        cactus.src = cactusImage;
        cactus.alt = 'Cactus';
        cactus.className = 'maintenance-cactus';
        
        
        messageDiv.appendChild(paragraph1);
        messageDiv.appendChild(paragraph2);
        
        container.appendChild(logo);
        container.appendChild(title);
        container.appendChild(messageDiv);
        container.appendChild(footer);
        
        body.appendChild(container);
        body.appendChild(cactus);
    }
}

document.addEventListener('DOMContentLoaded', checkMaintenancePage);