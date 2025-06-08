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

            });
        } catch (error) {
            console.error('Error setting theme:', error);
        }
    }
    
    function setPageTitleAndFavicon() {
        try {
            document.title = 'Firka - KRÉTA';

            const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
            existingFavicons.forEach(link => link.remove());

            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                const favicon = document.createElement('link');
                favicon.rel = 'icon';
                favicon.type = 'image/png';
                favicon.href = chrome.runtime.getURL('images/firka_logo_128.png');
                document.head.appendChild(favicon);

                const shortcutIcon = document.createElement('link');
                shortcutIcon.rel = 'shortcut icon';
                shortcutIcon.type = 'image/png';
                shortcutIcon.href = chrome.runtime.getURL('images/firka_logo_128.png');
                document.head.appendChild(shortcutIcon);
            }
        } catch (error) {
            console.error('Error setting page title and favicon:', error);
        }
    }
    
    function initializeTheme() {
        const cookieTheme = cookieManager.get('themePreference');
        const localStorageTheme = localStorage.getItem('themePreference');
        
        const theme = cookieTheme || localStorageTheme || 'light-blue';
        
        setTheme(theme);
        setPageTitleAndFavicon();
        
        if (cookieTheme !== localStorageTheme) {
            if (cookieTheme) {
                localStorage.setItem('themePreference', cookieTheme);
            } else if (localStorageTheme) {
                cookieManager.set('themePreference', localStorageTheme);
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTheme);
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

    let titleCheckTimeout;

    const observer = new MutationObserver((mutations) => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const savedTheme = cookieManager.get('themePreference') || localStorage.getItem('themePreference');
        
        if ((!currentTheme && savedTheme) || (currentTheme !== savedTheme && savedTheme)) {
            setTheme(savedTheme);
        }

        const titleChanged = mutations.some(mutation => 
            mutation.type === 'childList' && 
            mutation.target === document.head &&
            Array.from(mutation.addedNodes).some(node => node.tagName === 'TITLE')
        );

        if (titleChanged || document.title !== 'Firka - KRÉTA') {
            clearTimeout(titleCheckTimeout);
            titleCheckTimeout = setTimeout(() => {
                if (document.title !== 'Firka - KRÉTA') {
                    setPageTitleAndFavicon();
                }
            }, 100);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
            observer.observe(document.head, {
                childList: true,
                subtree: true
            });
        });
    } else {
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
        observer.observe(document.head, {
            childList: true,
            subtree: true
        });
    }
})();