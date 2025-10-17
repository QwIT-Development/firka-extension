(function() {
    'use strict';
    
    function hideLoadingScreen() {
        const loadingElement = document.getElementById('KretaProgressBar');
        if (loadingElement) {
            loadingElement.style.display = 'none !important';
            loadingElement.style.visibility = 'hidden';
            loadingElement.style.opacity = '0';
            loadingElement.remove();

        }
        

        const loadingElements = document.querySelectorAll('[class*="loading"], [id*="loading"], [class*="Loading"], [id*="Loading"]');
        loadingElements.forEach(el => {
            el.style.display = 'none !important';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
        });
    }
    

    function addBackButton() {

        if (document.getElementById('firka-back-button')) {
            return;
        }
        

        const backButton = document.createElement('button');
        backButton.id = 'firka-back-button';
        backButton.innerHTML = '← Vissza';
        backButton.style.cssText = `
            position: static;
            margin: 20px;
            z-index: 100;
            background-color: var(--card-background, #ffffff);
            color: var(--text-primary, #333333);
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 8px;
            padding: 10px 16px;
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            width: auto;
        `;
        

        backButton.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--card-hover, #f5f5f5)';
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        backButton.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'var(--card-background, #ffffff)';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        });
        

        backButton.addEventListener('click', function() {
            window.history.back();
        });
        

        document.body.insertBefore(backButton, document.body.firstChild);

    }
    

    function hideMainFooter2() {
        const footer2 = document.querySelector('.main-footer2');
        if (footer2) {
            footer2.style.display = 'none';
        }
    }
    

    function hideLakatImg() {
        const lakatImg = document.querySelector('.lakatimg');
        if (lakatImg) {
            lakatImg.style.display = 'none';
        }
    }
    

    function hideCustomUserSettingsTab() {

        const firstTab = document.querySelector('#ProfilTab .k-tabstrip-items li[aria-controls="ProfilTab-1"]');
        if (firstTab) {
            firstTab.classList.add('hidden-tab');
        }
        

        const tabLinks = document.querySelectorAll('#ProfilTab .k-tabstrip-items .k-link');
        tabLinks.forEach(link => {
            if (link.textContent && link.textContent.includes('Egyedi felhasználó beállítások')) {
                const parentTab = link.closest('li');
                if (parentTab) {
                    parentTab.classList.add('hidden-tab');
                }
            }
        });
        

        const contentPanel = document.querySelector('#ProfilTab-1');
        if (contentPanel) {
            contentPanel.classList.add('hidden-tab');
        }
    }
    

    function hideAdditionalContactInfo() {

        function hideElementsWithText(text) {
            const elements = document.querySelectorAll('h4');
            elements.forEach(h4 => {
                if (h4.textContent && h4.textContent.includes(text)) {
                    // Hide the parent row
                    let parent = h4.closest('.row');
                    if (parent) {
                        parent.classList.add('hidden-contact-info');
                    }
                }
            });
        }
        

        hideElementsWithText('TOVÁBBI E-MAIL ELÉRHETŐSÉGEK');
        hideElementsWithText('TOVÁBBI TELEFONSZÁMOK');
        

        const rows = document.querySelectorAll('.row');
        rows.forEach(row => {
            const h4Elements = row.querySelectorAll('h4');
            h4Elements.forEach(h4 => {
                if (h4.textContent && 
                    (h4.textContent.includes('TOVÁBBI E-MAIL ELÉRHETŐSÉGEK') || 
                     h4.textContent.includes('TOVÁBBI TELEFONSZÁMOK'))) {
                    row.classList.add('hidden-contact-info');
                }
            });
        });
    }
    

    function init() {
        hideLoadingScreen();
        addBackButton();
        hideAdditionalContactInfo();
        hideCustomUserSettingsTab();
        hideMainFooter2();
        hideLakatImg();
        

        const observer = new MutationObserver(() => {
            hideAdditionalContactInfo();
            hideCustomUserSettingsTab();
            hideMainFooter2();
            hideLakatImg();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    

    window.addEventListener('load', init);
    

    setTimeout(hideLoadingScreen, 1000);
    

    let attempts = 0;
    const maxAttempts = 20;
    const aggressiveHide = setInterval(() => {
        attempts++;
        hideLoadingScreen();
        
        if (attempts >= maxAttempts) {
            clearInterval(aggressiveHide);
        }
    }, 500);
    

    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.id === 'KretaProgressBar' || 
                            node.className && (node.className.includes('loading') || node.className.includes('Loading'))) {
                            node.style.display = 'none !important';
                            node.style.visibility = 'hidden';
                            node.style.opacity = '0';
                            if (node.parentNode) {
                                node.parentNode.removeChild(node);
                            }
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

})();