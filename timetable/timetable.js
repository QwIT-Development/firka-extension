(() => {
  // Segédfüggvények
  function convertTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  function getCookie(name) {
    const cookieName = `${name}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for(let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(cookieName) === 0) {
        return cookie.substring(cookieName.length, cookie.length);
      }
    }
    return null;
  }

  function shortenSchoolName(name, maxLength = 50) {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    
    const parts = name.split(' - ');
    if (parts.length === 2) {
      const [code, fullName] = parts;
      if (fullName.length > maxLength - code.length - 3) {
        return `${code} - ${fullName.substring(0, maxLength - code.length - 6)}...`;
      }
    }
    return name.substring(0, maxLength - 3) + '...';
  }

  function showLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.innerHTML = `
      <img src="https://i.imgur.com/JE3LzRc.gif" alt="Firka" class="loading-logo">
      <div class="loading-text">Betöltés alatt...</div>
      <p class="loading-text2">Kis türelmet!</p>
    `;
    document.body.appendChild(loadingScreen);
  }

  function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(() => loadingScreen.remove(), 300);
    }
  }

  // DOM elemek várása
  function waitForElement(selector) {
    return new Promise(resolve => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(mutations => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  // Órarendi adatok gyűjtése
  async function collectTimetableData() {
    await waitForElement('#Calendar');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const calendar = document.querySelector('#Calendar');
    const dates = Array.from(document.querySelectorAll('.fc-day-header')).map(header => {
      const fullText = header.textContent.trim();
      // Remove the day name from the beginning and clean up the format
      const dateText = fullText.replace(/^(hétfő|kedd|szerda|csütörtök|péntek)/, '').trim();
      return {
        date: fullText,
        formattedDate: dateText
      };
    });
    // Fix the Thursday issue by ensuring we have all 5 days
    if (dates.length === 4) {
      // Get Wednesday's date parts
      const wedDate = dates[2].formattedDate;
      const [month, day] = wedDate.split(' ');
      const dayNum = parseInt(day.replace('.', ''));
      
      // Create Thursday's date
      const thursdayDate = `${month} ${dayNum + 1}.`;
      
      dates.splice(3, 0, {
        date: `csütörtök${thursdayDate}`,
        formattedDate: thursdayDate
      });
    }
    // Set week selector based on the current date
    const weekOptions = Array.from(document.querySelectorAll('#Calendar_tanevHetek_listbox li'));
    const currentDate = dates[0]?.formattedDate; // Using Monday's date
    const matchingWeek = weekOptions.find(opt => opt.textContent.includes(currentDate));
    
    if (matchingWeek) {
      const kendoCombo = document.querySelector('#Calendar_tanevHetek')?.__kendoWidget;
      if (kendoCombo) {
        const weekIndex = weekOptions.indexOf(matchingWeek);
        kendoCombo.value(weekIndex.toString());
        kendoCombo.trigger('change');
      }
    }
    const timetableData = {
      schoolInfo: {
        name: getCookie('schoolName') || 'Iskola',
        id: getCookie('schoolCode') || ''
      },
      userData: {
        name: getCookie('userName') || 'Felhasználó',
        time: document.querySelector('.usermenu_timer')?.textContent?.trim() || '45:00'
      },
      weekInfo: {
        title: document.querySelector('.fc-center h2')?.textContent?.trim() || 'Hét',
        options: Array.from(document.querySelectorAll('#Calendar_tanevHetek_listbox li'))
          .map((li, i) => ({
            text: li.textContent.trim(),
            value: i.toString(),
            selected: li.classList.contains('k-state-selected')
          }))
      },
      weekDates: dates,  // Add the dates to the data object
      lessons: []
    };
    
    // Órák adatainak gyűjtése
    for (const event of document.querySelectorAll('.fc-event')) {
      const timeEl = event.querySelector('.fc-time');
      const titleEl = event.querySelector('.fc-title');
      
      if (timeEl && titleEl) {
        const [startTime, endTime] = (timeEl.getAttribute('data-full') || timeEl.textContent || '').split(' - ');
        const [fullSubject, teacher, room] = titleEl.innerHTML.split('<br>').map(str => str.trim());
        const subject = fullSubject.split('-')[0].trim();
        
        let originalTeacher = '';
        if (teacher.startsWith('Helyettesítő:')) {
          event.click();
          originalTeacher = await waitForElement("#OraAdatokDetailTabStrip-1 > div > div:nth-child(3) > div:nth-child(2)");
          originalTeacher = originalTeacher.innerText;
          document.querySelector("body > div.k-widget.k-window > div.k-window-titlebar.k-header > div > a:nth-child(2)").click();
        }

        timetableData.lessons.push({
          startTime,
          endTime,
          subject: subject || '',
          teacher: teacher || '',
          originalTeacher: originalTeacher || '',
          room: (room || '').replace(/[()]/g, ''),
          day: event.closest('td').cellIndex - 1,
          isSubstituted: event.querySelector('.fc-bg2') !== null,
          isCancelled: event.classList.contains('fc-textline-through'),
          hasHomework: titleEl.querySelector('.hasCalendarIcon') !== null,
          testInfo: event.getAttribute('data-tooltiptext') || '',
          homeworkDetails: event.getAttribute('data-homework') || ''
        });
      }
    }
    return timetableData;
  }

  // Grid generálása
  function generateTimeGrid(lessons, weekDates) {
    const times = [...new Set(lessons.map(l => l.startTime))].sort((a, b) => {
      const timeA = convertTimeToMinutes(a);
      const timeB = convertTimeToMinutes(b);
      return timeA - timeB;
    });
    const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    
    return `
      <div class="grid-header"></div>
      ${days.map((day, index) => `
        <div class="grid-header">
          <span class="day-name">${day}</span>
          <span class="day-date">${weekDates[index]?.formattedDate || ''}</span>
        </div>
      `).join('')}
      ${times.map(time => `
        <div class="time-slot">${time}</div>
        ${Array(5).fill().map((_, dayIndex) => {
          const dayLessons = lessons.filter(l => l.startTime === time && l.day === dayIndex);
          return `
            <div class="lesson-slot">
              ${dayLessons.map(lesson => `
                <div class="lesson-card ${lesson.isSubstituted ? 'substituted' : ''} 
                                      ${lesson.isCancelled ? 'cancelled' : ''}
                                      ${lesson.hasHomework ? 'has-homework' : ''}"
                     data-lesson='${JSON.stringify(lesson)}'>
                  <div class="lesson-subject">${lesson.subject}</div>
                  <div class="lesson-teacher">${lesson.teacher}</div>
                  <div class="lesson-bottom">
                    <div class="lesson-room">${lesson.room}</div>
                    <div class="lesson-time">${lesson.isCancelled ? 'Elmarad' : lesson.startTime}</div>
                  </div>
                  ${lesson.hasHomework || lesson.testInfo ? `
                    <div class="lesson-indicators">
                      ${lesson.hasHomework ? `
                        <span class="lesson-indicator homework-indicator" title="Házi feladat">
                          <span class="material-icons-round">assignment</span>
                        </span>
                      ` : ''}
                      ${lesson.testInfo ? `
                        <span class="lesson-indicator test-indicator" title="Számonkérés">
                          <span class="material-icons-round">quiz</span>
                        </span>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      `).join('')}
    `;
  }
  // Óra részletek modal
  function showLessonModal(lesson) {
    const modal = document.createElement('div');
    modal.className = 'lesson-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${lesson.subject}</h3>
          <button class="modal-close">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="lesson-details">
            <div class="detail-item">
              <span class="detail-label">Tanár:</span>
              <span class="detail-value ${(lesson.originalTeacher != '' ? 'line-through' : '')}">${lesson.originalTeacher != '' ? lesson.originalTeacher : lesson.teacher}</span>
            </div>
            <div class="detail-item ${(lesson.originalTeacher != '' ? '' : 'hidden')}">
              <span class="detail-label">Helyettesítő tanár:</span>
              <span class="detail-value">${lesson.teacher.replace('Helyettesítő:', '')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Terem:</span>
              <span class="detail-value">${lesson.room}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Időpont:</span>
              <span class="detail-value">${lesson.startTime} - ${lesson.endTime}</span>
            </div>
            ${lesson.isSubstituted ? `
            <div class="detail-item">
              <span class="detail-label">Állapot:</span>
              <span class="detail-value"><span class="material-icons-round">sync_alt</span> Helyettesítés</span>
            </div>
            ` : ''}
            ${lesson.isCancelled ? `
            <div class="detail-item">
              <span class="detail-label">Állapot:</span>
              <span class="detail-value"><span class="material-icons-round">cancel</span> Elmarad</span>
            </div>
            ` : ''}
          </div>
          
          ${lesson.hasHomework ? `
            <div class="modal-section homework-section">
              <h4>
                <span class="material-icons-round">assignment</span>
                Házi feladat
              </h4>
              <div class="homework-content">
                ${lesson.homeworkDetails ? `<p>${lesson.homeworkDetails}</p>` : '<p>Van házi feladat</p>'}
              </div>
            </div>
          ` : ''}
          ${lesson.testInfo ? `
            <div class="modal-section test-section">
              <h4>
                <span class="material-icons-round">quiz</span>
                Számonkérés
              </h4>
              <div class="test-content">
                <p>${lesson.testInfo}</p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Modal bezárás
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // ESC gomb kezelése
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Animáció
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  // Eseménykezelők beállítása
  function setupEventListeners(data) {
    // Órakártyák
    document.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => {
        const lessonData = JSON.parse(card.dataset.lesson);
        showLessonModal(lessonData);
      });
    });

    // Felhasználói menü
    const userBtn = document.querySelector('.user-dropdown-btn');
    const userDropdown = document.querySelector('.user-dropdown');
    
    userBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown?.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      userDropdown?.classList.remove('show');
    });

    // Hét navigáció
    const prevBtn = document.querySelector('.prev-week');
    const nextBtn = document.querySelector('.next-week');
    const weekSelect = document.querySelector('.week-select');

    prevBtn?.addEventListener('click', async () => {
      showLoadingScreen();
      const kendoCalendar = document.querySelector('#Calendar')?.__kendoWidget;
      if (kendoCalendar) {
        kendoCalendar.prev();
        await new Promise(resolve => setTimeout(resolve, 500));
        await transformTimetablePage();
      }
    });

    nextBtn?.addEventListener('click', async () => {
      showLoadingScreen();
      const kendoCalendar = document.querySelector('#Calendar')?.__kendoWidget;
      if (kendoCalendar) {
        kendoCalendar.next();
        await new Promise(resolve => setTimeout(resolve, 500));
        await transformTimetablePage();
      }
    });

    weekSelect?.addEventListener('change', async function() {
      showLoadingScreen();
      const kendoCombo = document.querySelector('#Calendar_tanevHetek')?.__kendoWidget;
      if (kendoCombo) {
        kendoCombo.value(this.value);
        kendoCombo.trigger('change');
        await new Promise(resolve => setTimeout(resolve, 500));
        await transformTimetablePage();
      }
    });

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

    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // Oldal transzformáció
  async function transformTimetablePage() {
    try {
      showLoadingScreen();

      const data = await collectTimetableData();
      if (!data) {
        hideLoadingScreen();
        return;
      }

      const schoolNameFull = `${data.schoolInfo.id} - ${data.schoolInfo.name}`;
      const shortenedSchoolName = shortenSchoolName(schoolNameFull);

      document.body.innerHTML = `
        <div class="kreta-container">
          <header class="kreta-header">
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
                <a href="/Intezmeny/Faliujsag" data-page="dashboard" class="nav-item">
                  <img src="${chrome.runtime.getURL('icons/dashboard-inactive.svg')}" alt="Kezdőlap">
                  Kezdőlap
                </a>
                <a href="/TanuloErtekeles/Osztalyzatok" data-page="grades" class="nav-item">
                  <img src="${chrome.runtime.getURL('icons/grades-inactive.svg')}" alt="Jegyek">
                  Jegyek
                </a>
                <a href="/Orarend/InformaciokOrarend" data-page="timetable" class="nav-item active">
                  <img src="${chrome.runtime.getURL('icons/timetable-active.svg')}" alt="Órarend">
                  Órarend
                </a>
                <a href="/Hianyzas/Hianyzasok" data-page="absences" class="nav-item">
                  <img src="${chrome.runtime.getURL('icons/absences-inactive.svg')}" alt="Mulasztások">
                  Mulasztások
                </a>
                <a href="/Tanulo/TanuloHaziFeladat" data-page="other" class="nav-item">
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
          </header>

          <main class="kreta-main">
            <div class="week-controls">
              <button class="week-nav-btn prev-week">
                <span class="material-icons-round">chevron_left</span>
              </button>
              <select class="week-select">
                ${data.weekInfo.options.map(opt => `
                  <option value="${opt.value}" ${opt.selected ? 'selected' : ''}>
                    ${opt.text}
                  </option>
                `).join('')}
              </select>
              <button class="week-nav-btn next-week">
                <span class="material-icons-round">chevron_right</span>
              </button>
            </div>

            <div class="timetable-container">
              <div class="timetable-grid">
                ${generateTimeGrid(data.lessons, data.weekDates)}
              </div>
            </div>
          </main>
        </div>
      `;

      // Szükséges fontok hozzáadása
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

      setupEventListeners(data);
      hideLoadingScreen();

    } catch (error) {
      console.error('Hiba az oldal átalakítása során:', error);
      hideLoadingScreen();
    }
  }

  // Beállítások gomb kezelése
  document.getElementById('settingsBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = chrome.runtime.getURL('settings/index.html');
    window.open(url, '_blank', 'width=400,height=600');
  });

  if (window.location.href.includes('/Orarend/')) {
    transformTimetablePage();
  }
})();