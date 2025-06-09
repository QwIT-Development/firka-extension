(() => {
  async function loadWeekDataFromAPI(startDate, endDate) {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/api/CalendarApi/GetTanuloOrarend?tanarId=-1&osztalyCsoportId=-1&tanuloId=-1&teremId=-1&kellCsengetesiRendMegjelenites=false&csakOrarendiOra=false&kellTanoranKivuliFoglalkozasok=false&kellTevekenysegek=false&kellTanevRendje=true&szuresTanevRendjeAlapjan=false&kellOraTemaTooltip=True&start=${startDate}&end=${endDate}&_=${timestamp}`;
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API hiba: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Hiba az API adatok betöltése során:', error);
      return [];
    }
  }

  function generateWeekDates(startDate) {
    const start = new Date(startDate);
    const dates = [];
    const dayNames = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      const month = date.toLocaleDateString('hu-HU', { month: 'short' });
      const day = date.getDate();
      
      dates.push({
        date: `${dayNames[i]} ${month} ${day}.`,
        formattedDate: `${month} ${day}.`,
        fullDate: date.toISOString().split('T')[0]
      });
    }
    
    return dates;
  }

  function convertAPIDataToLessons(apiData, weekDates) {
    const lessons = [];

    apiData.forEach(event => {
      const eventDate = new Date(event.start);
      const dayIndex = weekDates.findIndex(date => 
        new Date(date.fullDate).toDateString() === eventDate.toDateString()
      );
      
      if (dayIndex === -1) {
        console.log('Nem található nap az eseményhez:', event.start);
        return;
      }
      
      if (event.oraType === 5) {
        lessons.push({
          startTime: 'Egész nap',
          endTime: '',
          subject: event.title,
          teacher: '',
          originalTeacher: '',
          room: '',
          day: dayIndex,
          isSubstituted: false,
          isCancelled: false,
          hasHomework: false,
          testInfo: event.Tema || '',
          homeworkDetails: '',
          isSpecialDay: true,
          color: event.color
        });
      } else if (event.oraType === 2) {
        const startTime = new Date(event.start);
        const endTime = new Date(event.end);
        const startTimeStr = startTime.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = endTime.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        const titleParts = event.title.split('\n');
        const teacher = titleParts[1] || '';
        const room = titleParts[2] ? titleParts[2].replace(/[()]/g, '') : '';
        
        lessons.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          subject: event.Tantargy || event.TantargyKategoria,
          teacher: teacher,
          originalTeacher: event.helyettesitoId ? teacher : '',
          room: room,
          day: dayIndex,
          isSubstituted: !!event.helyettesitoId,
          isCancelled: event.isElmaradt || false,
          hasHomework: event.hasHaziFeladat || false,
          testInfo: event.hasBejelentettSzamonkeres ? (event.Tema || 'Számonkérés') : '',
          homeworkDetails: '',
          isSpecialDay: false,
          color: event.color
        });
      }
    });

    return lessons;
  }

  async function collectTimetableData() {
    await helper.waitForElement('#Calendar');
    await helper.waitForElement('.modalBckgroundMain:not(.isOverlayActiv)');

    const dates = Array.from(document.querySelectorAll('.fc-day-header')).map(header => {
      const fullText = header.textContent.trim();
      const dateText = fullText.replace(/^(hétfő|kedd|szerda|csütörtök|péntek)/, '').trim();
      return {
        date: fullText,
        formattedDate: dateText
      };
    });
    if (dates.length === 4) {
      const wedDate = dates[2].formattedDate;
      const [month, day] = wedDate.split(' ');
      const dayNum = parseInt(day.replace('.', ''));
      const thursdayDate = `${month} ${dayNum + 1}.`;
      
      dates.splice(3, 0, {
        date: `csütörtök${thursdayDate}`,
        formattedDate: thursdayDate
      });
    }
    const weekOptions = Array.from(document.querySelectorAll('#Calendar_tanevHetek_listbox li'));
    
    const kendoCombo = document.querySelector('#Calendar_tanevHetek')?.__kendoWidget;
    let currentWeekIndex = 0;
    
    if (kendoCombo) {
      const currentValue = kendoCombo.value();
      const selectedIndex = kendoCombo.selectedIndex;
      
      console.log('Kendo widget értékek:', { currentValue, selectedIndex, weekOptionsLength: weekOptions.length });
      
      if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
        currentWeekIndex = parseInt(currentValue);
      } else if (selectedIndex !== -1) {
        currentWeekIndex = selectedIndex;
      } else {
        const today = new Date();
        let foundWeekIndex = -1;

        for (let i = 0; i < weekOptions.length; i++) {
          const weekText = weekOptions[i].textContent.trim();
          console.log(`Vizsgált hét ${i}: ${weekText}`);
          
          let dateMatch = null;
          let year, startMonth, startDay, endMonth, endDay;

          dateMatch = weekText.match(/(\d{4})\. (\w+) (\d{1,2})\. - (\w+) (\d{1,2})\. \((\d+)\. hét\)/);
          if (dateMatch) {
            [, year, startMonth, startDay, endMonth, endDay] = dateMatch;
          } else {
            dateMatch = weekText.match(/(\d{4})\.(\d{2})\.(\d{2})\. - (\d{4})\.(\d{2})\.(\d{2})\. \((\d+)\. hét\)/);
            if (dateMatch) {
              const [, startYear, startMonthNum, startDayNum, endYear, endMonthNum, endDayNum] = dateMatch;
              year = startYear;
              startMonth = parseInt(startMonthNum) - 1;
              startDay = startDayNum;
              endMonth = parseInt(endMonthNum) - 1;
              endDay = endDayNum;
            } else {
              dateMatch = weekText.match(/(\d+)\. hét \((\d{4})\.(\d{2})\.(\d{2})\. - (\d{4})\.(\d{2})\.(\d{2})\.\)/);
              if (dateMatch) {
                const [, weekNum, startYear, startMonthNum, startDayNum, endYear, endMonthNum, endDayNum] = dateMatch;
                year = startYear;
                startMonth = parseInt(startMonthNum) - 1;
                startDay = startDayNum;
                endMonth = parseInt(endMonthNum) - 1;
                endDay = endDayNum;
              }
            }
          }
          
          if (dateMatch) {
            if (typeof startMonth === 'string') {
              const monthNames = {
                'január': 0, 'február': 1, 'március': 2, 'április': 3, 'május': 4, 'június': 5,
                'július': 6, 'augusztus': 7, 'szeptember': 8, 'október': 9, 'november': 10, 'december': 11
              };
              
              const startMonthNum = monthNames[startMonth.toLowerCase()];
              const endMonthNum = monthNames[endMonth.toLowerCase()];
              
              if (startMonthNum !== undefined && endMonthNum !== undefined) {
                startMonth = startMonthNum;
                endMonth = endMonthNum;
              } else {
                continue;
              }
            }
            
            const weekStart = new Date(parseInt(year), startMonth, parseInt(startDay));
            const weekEnd = new Date(parseInt(year), endMonth, parseInt(endDay));
            
            if (today >= weekStart && today <= weekEnd) {
              foundWeekIndex = i;
              console.log(`Megtalált jelenlegi hét: ${i}`);
              break;
            }
          }
        }
        
        if (foundWeekIndex !== -1) {
          currentWeekIndex = foundWeekIndex;
        } else {
          currentWeekIndex = Math.min(41, weekOptions.length - 1);
          console.log(`Nem találtuk a jelenlegi hetet, fallback: ${currentWeekIndex}`);
        }
        
        kendoCombo.value(currentWeekIndex.toString());
        kendoCombo.trigger('change');
      }
      
      console.log('Beállított currentWeekIndex:', currentWeekIndex);
    }
    const timetableData = {
      schoolInfo: {
        name: cookieManager.get('schoolName') || 'Iskola',
        id: cookieManager.get('schoolCode') || ''
      },
      userData: {
        name: cookieManager.get('userName') || 'Felhasználó',
        time: document.querySelector('.usermenu_timer')?.textContent?.trim() || '45:00'
      },
      weekInfo: {
        title: document.querySelector('.fc-center h2')?.textContent?.trim() || 'Hét',
        options: Array.from(document.querySelectorAll('#Calendar_tanevHetek_listbox li'))
          .map((li, i) => ({
            text: li.textContent.trim(),
            value: i.toString(),
            selected: i === currentWeekIndex
          }))
      },
      weekDates: dates,
      lessons: []
    };

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
          originalTeacher = await helper.waitForElement("#OraAdatokDetailTabStrip-1 > div > div:nth-child(3) > div:nth-child(2)");
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

  function generateTimeGrid(lessons, weekDates) {
    const specialDayLessons = lessons.filter(l => l.isSpecialDay);
    const regularLessons = lessons.filter(l => !l.isSpecialDay);
    
    const times = [...new Set(regularLessons.map(l => l.startTime))].sort((a, b) => {
      const timeA = helper.convertTimeToMinutes(a);
      const timeB = helper.convertTimeToMinutes(b);
      return timeA - timeB;
    });
    const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    
    return `
      <div class="grid-header"></div>
      ${days.map((day, index) => {
        return `
          <div class="grid-header">
            <span class="day-name">${day}</span>
            <span class="day-date">${weekDates[index]?.formattedDate || ''}</span>
          </div>
        `;
      }).join('')}
      ${times.map((time, timeIndex) => `
        <div class="time-slot">${time}</div>
        ${Array(5).fill().map((_, dayIndex) => {
          const dayLessons = regularLessons.filter(l => l.startTime === time && l.day === dayIndex);
          const specialDay = specialDayLessons.find(l => l.day === dayIndex);
          
          return `
            <div class="lesson-slot ${specialDay ? 'special-day-slot' : ''}">
              ${specialDay && timeIndex === 0 ? `
                <div class="special-day-card" style="background-color: ${specialDay.color || '#F99F50'}" data-lesson='${JSON.stringify(specialDay)}'>
                  <div class="special-day-title">${specialDay.subject}</div>
                  ${specialDay.testInfo ? `<div class="special-day-subtitle">${specialDay.testInfo}</div>` : ''}
                </div>
              ` : dayLessons.map(lesson => `
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
                <a href='https://${window.location.hostname}/Tanulo/TanuloHaziFeladat' class="more-link">
                  Házi feladat megnyitása
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                    <path d="M11.2997 5.19947L5.64282 5.19947M11.2997 5.19947L11.2997 10.8563M11.2997 5.19947L4.70001 11.7991" stroke="var(--accent-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </a>
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
    
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  async function loadAndDisplayWeek(weekOption) {
    try {
      loadingScreen.show();
      const weekText = weekOption.text;
      const dateMatch = weekText.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      
      if (!dateMatch) {
        console.error('Nem sikerült kinyerni a dátumot:', weekText);
        return;
      }
      const [, year, month, day] = dateMatch;
      const startDate = `${year}-${month}-${day}`;
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const endDate = end.toISOString().split('T')[0];
      const apiData = await loadWeekDataFromAPI(startDate, endDate);
      const weekDates = generateWeekDates(startDate);
      const kendoCombo = document.querySelector('#Calendar_tanevHetek')?.__kendoWidget;
      if (kendoCombo) {
        kendoCombo.value(weekOption.value);
        kendoCombo.trigger('change');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await helper.waitForElement('.fc-event', 2000).catch(() => {
          console.log('Nincsenek órák ezen a héten vagy időtúllépés történt');
        });
      }

      const apiLessons = convertAPIDataToLessons(apiData, weekDates);
      const allLessons = apiLessons;
      const timetableGrid = document.querySelector('.timetable-grid');
      if (timetableGrid) {
        timetableGrid.innerHTML = generateTimeGrid(allLessons, weekDates);
        setupLessonCardListeners();
      }
      
      const weekSelect = document.querySelector('.week-select');
      if (weekSelect) {
        weekSelect.value = weekOption.value;
      }
      
      setupDayNavigation(weekDates);
      
    } catch (error) {
      console.error('Hiba a hét betöltése során:', error);
    } finally {
      loadingScreen.hide();
    }
  }

  async function collectDOMLessons() {
    const lessons = [];
    const events = document.querySelectorAll('.fc-event');
    console.log(`Talált órák száma: ${events.length}`);
    
    for (const event of events) {
      const timeEl = event.querySelector('.fc-time');
      const titleEl = event.querySelector('.fc-title');
      
      if (timeEl && titleEl) {
        const timeText = timeEl.getAttribute('data-full') || timeEl.textContent || '';
        const [startTime, endTime] = timeText.split(' - ');
        const titleHTML = titleEl.innerHTML;
        const titleParts = titleHTML.split('<br>').map(str => str.trim());
        const fullSubject = titleParts[0] || '';
        const teacher = titleParts[1] || '';
        const room = titleParts[2] || '';
        
        const subject = fullSubject.split('-')[0].trim();
        
        let originalTeacher = '';
        if (teacher && teacher.startsWith('Helyettesítő:')) {
          try {
            event.click();
            const originalTeacherEl = await helper.waitForElement("#OraAdatokDetailTabStrip-1 > div > div:nth-child(3) > div:nth-child(2)", 3000);
            originalTeacher = originalTeacherEl.innerText;
            const closeBtn = document.querySelector("body > div.k-widget.k-window > div.k-window-titlebar.k-header > div > a:nth-child(2)");
            if (closeBtn) closeBtn.click();
          } catch (error) {
            console.log('Nem sikerült lekérni az eredeti tanár adatait:', error);
          }
        }

        const dayCell = event.closest('td');
        const dayIndex = dayCell ? dayCell.cellIndex - 1 : 0;

        lessons.push({
          startTime: startTime || '',
          endTime: endTime || '',
          subject: subject || '',
          teacher: teacher || '',
          originalTeacher: originalTeacher || '',
          room: (room || '').replace(/[()]/g, ''),
          day: Math.max(0, dayIndex),
          isSubstituted: event.querySelector('.fc-bg2') !== null,
          isCancelled: event.classList.contains('fc-textline-through'),
          hasHomework: titleEl.querySelector('.hasCalendarIcon') !== null,
          testInfo: event.getAttribute('data-tooltiptext') || '',
          homeworkDetails: event.getAttribute('data-homework') || ''
        });
      }
    }
    
    console.log(`Feldolgozott órák száma: ${lessons.length}`);
    return lessons;
  }

  function setupLessonCardListeners() {
    document.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => {
        const lessonData = JSON.parse(card.dataset.lesson);
        showLessonModal(lessonData);
      });
    });
  }

  function setupEventListeners(data) {
    setupLessonCardListeners();

    const prevBtn = document.querySelector('.prev-week');
    const nextBtn = document.querySelector('.next-week');
    const weekSelect = document.querySelector('.week-select');

    prevBtn?.addEventListener('click', async () => {
      const currentIndex = parseInt(weekSelect.value);
      const prevIndex = Math.max(0, currentIndex - 1);
      const prevOption = data.weekInfo.options[prevIndex];
      
      if (prevOption) {
        await loadAndDisplayWeek(prevOption);
      }
    });

    nextBtn?.addEventListener('click', async () => {
      const currentIndex = parseInt(weekSelect.value);
      const nextIndex = Math.min(data.weekInfo.options.length - 1, currentIndex + 1);
      const nextOption = data.weekInfo.options[nextIndex];
      
      if (nextOption) {
        await loadAndDisplayWeek(nextOption);
      }
    });

    weekSelect?.addEventListener('change', async function() {
      const selectedOption = data.weekInfo.options[parseInt(this.value)];
      if (selectedOption) {
        await loadAndDisplayWeek(selectedOption);
      }
    });

    setupDayNavigation(data.weekDates);
  }

  let dayNavigationState = {
    currentDayIndex: 0,
    isInitialized: false
  };

  function setupDayNavigation(weekDates) {
    const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    
    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    const currentDayName = document.getElementById('currentDayName');
    const currentDayDate = document.getElementById('currentDayDate');
    const preservedDayIndex = dayNavigationState.isInitialized ? dayNavigationState.currentDayIndex : 0;

    if (dayNavigationState.isInitialized) {
      dayNavigationState.currentDayIndex = preservedDayIndex;
      updateDayDisplay();
      return;
    }

    function updateDayDisplay() {
      if (currentDayName && currentDayDate) {
        currentDayName.textContent = days[dayNavigationState.currentDayIndex];
        currentDayDate.textContent = weekDates[dayNavigationState.currentDayIndex]?.formattedDate || '';
      }

      if (prevBtn && nextBtn) {
        prevBtn.disabled = dayNavigationState.currentDayIndex === 0;
        nextBtn.disabled = dayNavigationState.currentDayIndex === days.length - 1;
      }

      const gridHeaders = document.querySelectorAll('.grid-header:not(:first-child)');
      const lessonSlots = document.querySelectorAll('.lesson-slot');

      gridHeaders.forEach((header, index) => {
        header.classList.toggle('active', index === dayNavigationState.currentDayIndex);
      });

      const timeSlots = document.querySelectorAll('.time-slot');
      timeSlots.forEach((timeSlot, timeIndex) => {
        const startIndex = timeIndex * 5;
        lessonSlots.forEach((slot, slotIndex) => {
          const dayIndex = (slotIndex - startIndex) % 5;
          if (slotIndex >= startIndex && slotIndex < startIndex + 5) {
            slot.classList.toggle('active', dayIndex === dayNavigationState.currentDayIndex);
          }
        });
      });
    }

    if (prevBtn && nextBtn && !dayNavigationState.isInitialized) {
      prevBtn.addEventListener('click', () => {
        if (dayNavigationState.currentDayIndex > 0) {
          dayNavigationState.currentDayIndex--;
          updateDayDisplay();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (dayNavigationState.currentDayIndex < days.length - 1) {
          dayNavigationState.currentDayIndex++;
          updateDayDisplay();
        }
      });

      dayNavigationState.isInitialized = true;
    }

    updateDayDisplay();
  }

  async function transformTimetablePage() {
    try {
      const data = await collectTimetableData();
      if (!data) {
        loadingScreen.hide();
        return;
      }

      document.body.innerHTML = `
        <div class="kreta-container">
          ${createTemplate.header()}

          <main class="kreta-main">
            <div class="week-controls">
              <button class="week-nav-btn prev-week">
                <span class="material-icons-round">chevron_left</span>
              </button>
              <select class="week-select" id="week-selector">
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

            <div class="day-navigation">
              <button class="day-nav-btn" id="prevDay">
                <span class="material-icons-round">chevron_left</span>
                Előző
              </button>
              <button class="day-nav-btn" id="nextDay">
                Következő
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

      createTemplate.importFonts();
      setupUserDropdown();
      setupMobileNavigation();
      setupEventListeners(data);
      setCurrentWeekInSelector(data.weekInfo.options);
      
      loadingScreen.hide();

    } catch (error) {
      console.error('Hiba az oldal átalakítása során:', error);
      loadingScreen.hide();
    }
  }

  function setCurrentWeekInSelector(weekOptions) {
    const today = new Date();
    let foundWeekIndex = -1;

    for (let i = 0; i < weekOptions.length; i++) {
      const weekText = weekOptions[i].text;
      
      let dateMatch = null;
      let year, startMonth, startDay, endMonth, endDay;

      dateMatch = weekText.match(/(\d{4})\. (\w+) (\d{1,2})\. - (\w+) (\d{1,2})\. \((\d+)\. hét\)/);
      if (dateMatch) {
        [, year, startMonth, startDay, endMonth, endDay] = dateMatch;
      } else {
        dateMatch = weekText.match(/(\d{4})\.(\d{2})\.(\d{2})\. - (\d{4})\.(\d{2})\.(\d{2})\. \((\d+)\. hét\)/);
        if (dateMatch) {
          const [, startYear, startMonthNum, startDayNum, endYear, endMonthNum, endDayNum] = dateMatch;
          year = startYear;
          startMonth = parseInt(startMonthNum) - 1;
          startDay = startDayNum;
          endMonth = parseInt(endMonthNum) - 1;
          endDay = endDayNum;
        } else {
          dateMatch = weekText.match(/(\d+)\. hét \((\d{4})\.(\d{2})\.(\d{2})\. - (\d{4})\.(\d{2})\.(\d{2})\.\)/);
          if (dateMatch) {
            const [, weekNum, startYear, startMonthNum, startDayNum, endYear, endMonthNum, endDayNum] = dateMatch;
            year = startYear;
            startMonth = parseInt(startMonthNum) - 1;
            startDay = startDayNum;
            endMonth = parseInt(endMonthNum) - 1;
            endDay = endDayNum;
          }
        }
      }
      
      if (dateMatch) {
        if (typeof startMonth === 'string') {
          const monthNames = {
            'január': 0, 'február': 1, 'március': 2, 'április': 3, 'május': 4, 'június': 5,
            'július': 6, 'augusztus': 7, 'szeptember': 8, 'október': 9, 'november': 10, 'december': 11
          };
          
          const startMonthNum = monthNames[startMonth.toLowerCase()];
          const endMonthNum = monthNames[endMonth.toLowerCase()];
          
          if (startMonthNum !== undefined && endMonthNum !== undefined) {
            startMonth = startMonthNum;
            endMonth = endMonthNum;
          } else {
            continue;
          }
        }
        
        const weekStart = new Date(parseInt(year), startMonth, parseInt(startDay));
        const weekEnd = new Date(parseInt(year), endMonth, parseInt(endDay));

        if (today >= weekStart && today <= weekEnd) {
          foundWeekIndex = i;
          break;
        }
      }
    }

    const weekSelector = document.getElementById('week-selector');
    if (weekSelector) {
      if (foundWeekIndex !== -1) {
        weekSelector.value = foundWeekIndex.toString();
      } else {
        const fallbackIndex = Math.min(41, weekOptions.length - 1);
        weekSelector.value = fallbackIndex.toString();
        console.log(`Nem találtuk a jelenlegi hetet, fallback: ${fallbackIndex}`);
      }

      weekSelector.dispatchEvent(new Event('change'));
    }
  }

  if (window.location.href.includes('/Orarend/')) {
    transformTimetablePage();
  }
})();