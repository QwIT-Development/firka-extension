const createTemplate = {
    header() {
        const data = {
            schoolInfo: {
              name: cookieManager.get('schoolName') || 'Iskola',
              id: cookieManager.get('schoolCode') || ''
            },
            userData: {
              name: cookieManager.get('userName') || 'Felhasználó',
              time: document.querySelector('.usermenu_timer')?.textContent?.trim() || '45:00',
              email: cookieManager.get('userEmail') || ''
            }
        };

        const schoolNameFull = `${data.schoolInfo.id} - ${data.schoolInfo.name}`;
        const shortenedSchoolName = helper.shortenSchoolName(schoolNameFull);

        

        const element =  `<header class="kreta-header">
            <div class="school-info">
                <p class="logo-text">
                    <img src="${chrome.runtime.getURL('images/firka_logo.png')}" alt="Firka" class="logo">
                    Firka
                </p>
                <div class="school-details" title="${schoolNameFull}">
                    ${shortenedSchoolName}
                </div>
            </div>
            
            <nav class="kreta-nav">
            <div class="nav-links">
                <a href="/Intezmeny/Faliujsag" data-page="dashboard" class="nav-item ${( location.pathname == '/Intezmeny/Faliujsag' ? 'active' : '')}">
                <img src="${chrome.runtime.getURL('icons/dashboard-' + ( location.pathname == '/Intezmeny/Faliujsag' ? 'active' : 'inactive') + '.svg')}" alt="Kezdőlap">
                Kezdőlap
                </a>
                <a href="/TanuloErtekeles/Osztalyzatok" data-page="grades" class="nav-item ${( location.pathname == '/TanuloErtekeles/Osztalyzatok' ? 'active' : '')}">
                <img src="${chrome.runtime.getURL('icons/grades-' + ( location.pathname == '/TanuloErtekeles/Osztalyzatok' ? 'active' : 'inactive') + '.svg')}" alt="Jegyek">
                Jegyek
                </a>
                <a href="/Orarend/InformaciokOrarend" data-page="timetable" class="nav-item ${( location.pathname == '/Orarend/InformaciokOrarend' ? 'active' : '')}">
                <img src="${chrome.runtime.getURL('icons/timetable-' + ( location.pathname == '/Orarend/InformaciokOrarend' ? 'active' : 'inactive') + '.svg')}" alt="Órarend">
                Órarend
                </a>
                <a href="/Hianyzas/Hianyzasok" data-page="absences" class="nav-item ${( location.pathname == '/Hianyzas/Hianyzasok' ? 'active' : '')}">
                <img src="${chrome.runtime.getURL('icons/absences-' + ( location.pathname == '/Hianyzas/Hianyzasok' ? 'active' : 'inactive') + '.svg')}" alt="Mulasztások">
                Mulasztások
                </a>
                <a href="/Tanulo/TanuloHaziFeladat" data-page="other" class="nav-item ${( location.pathname == '/Tanulo/TanuloHaziFeladat' ? 'active' : '')}">
                <img src="${chrome.runtime.getURL('icons/others.svg')}" alt="Egyéb">
                Egyéb
                </a>
            </div>
            </nav>

            <div class="user-profile">
            <button class="user-dropdown-btn">
                <div class="user-info">
                <span class="user-name">${data.userData.name}</span>
                <span class="nav-logout-timer" id="logoutTimer">${data.userData.time}</span>
                </div>
            </button>
            <div class="user-dropdown">
                <a href="/Adminisztracio/Profil" data-page="profile" class="dropdown-item">
                <img src="${chrome.runtime.getURL('icons/profile.svg')}" alt="Profil">
                Profil
                </a>
                <a href="#" class="dropdown-item" id="settingsBtn">
                <img src="${chrome.runtime.getURL('icons/settings.svg')}" alt="Beállítások">
                Beállítások
                </a>
                <a href="/Home/Logout" data-page="logout" class="dropdown-item">
                <img src="${chrome.runtime.getURL('icons/logout.svg')}" alt="Kijelentkezés">
                Kijelentkezés
                </a>
            </div>
            </div>
        </header>`

        // Kijelentkezés időzítő
        const startTime = parseInt(data.userData.time?.match(/\d+/)?.[0] || "45");
        let timeLeft = startTime * 60;
        
        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timerEl = document.getElementById('logoutTimer');
            if (timerEl) {
                timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (timeLeft <= 0) {
                window.location.href = '/Home/Logout';
            } else {
                timeLeft--;
            }
        };

        setInterval(updateTimer, 1000);

        return element;
    },

    importFonts() {
        const links = [
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
            { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap' },
            { rel: 'stylesheet', href: 'https://fonts.googleapis.com/icon?family=Material+Icons+Round' }
        ];
        
        links.forEach(link => {
            const linkElement = document.createElement('link');
            Object.entries(link).forEach(([key, value]) => {
            linkElement[key] = value;
            });
            document.head.appendChild(linkElement);
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await helper.waitForElement('#settingsBtn');
    document.querySelector('#settingsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = chrome.runtime.getURL('settings/index.html');
        window.open(url, '_blank', 'width=400,height=600');
    });
});