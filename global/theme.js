(() => {
    function setTheme(theme) {
        try {
            const actualTheme = theme === 'default' ? 'light-blue' : theme;
            
            document.documentElement.setAttribute('data-theme', actualTheme);
            cookieManager.set('themePreference', actualTheme);
            localStorage.setItem('themePreference', actualTheme);
            
            chrome.runtime.sendMessage({
                action: 'themeChanged',
                theme: actualTheme
            }).catch(() => {
                
                console.log('Extension context not available for theme sync');
            });
            
            console.log('Theme set to:', actualTheme);
        } catch (error) {
            console.error('Error setting theme:', error);
        }
    }
    
    function initializeTheme() {
        const cookieTheme = cookieManager.get('themePreference');
        const localStorageTheme = localStorage.getItem('themePreference');
        
        const theme = cookieTheme || localStorageTheme || 'light-blue';
        
        setTheme(theme);
        
        if (cookieTheme !== localStorageTheme) {
            if (cookieTheme) {
                localStorage.setItem('themePreference', cookieTheme);
            } else if (localStorageTheme) {
                cookieManager.set('themePreference', localStorageTheme);
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeTheme();
        });
        
        initializeTheme();
    } else {
        initializeTheme();
    }

    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'changeTheme') {
            setTheme(message.theme);
            sendResponse({ success: true });
        }
        
        if (message.action === 'getTheme') {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light-blue';
            sendResponse({ theme: currentTheme });
        }

        return true;
    });

    
    const observer = new MutationObserver((mutations) => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const savedTheme = cookieManager.get('themePreference') || localStorage.getItem('themePreference');
        
        if ((!currentTheme && savedTheme) || (currentTheme !== savedTheme && savedTheme)) {
            setTheme(savedTheme);
        }
    });

    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        });
    } else {
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }
})();