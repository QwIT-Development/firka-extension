(() => {
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
    const currentDate = dates[0]?.formattedDate;
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
            selected: li.classList.contains('k-state-selected')
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
    const times = [...new Set(lessons.map(l => l.startTime))].sort((a, b) => {
      const timeA = helper.convertTimeToMinutes(a);
      const timeB = helper.convertTimeToMinutes(b);
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

  function setupEventListeners(data) {
    document.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => {
        const lessonData = JSON.parse(card.dataset.lesson);
        showLessonModal(lessonData);
      });
    });

    const prevBtn = document.querySelector('.prev-week');
    const nextBtn = document.querySelector('.next-week');
    const weekSelect = document.querySelector('.week-select');

    prevBtn?.addEventListener('click', async () => {
      loadingScreen.show();
      const kendoCalendar = document.querySelector('#Calendar')?.__kendoWidget;
      if (kendoCalendar) {
        kendoCalendar.prev();
        await new Promise(resolve => setTimeout(resolve, 500));
        await transformTimetablePage();
      }
    });

    nextBtn?.addEventListener('click', async () => {
      loadingScreen.show();
      const kendoCalendar = document.querySelector('#Calendar')?.__kendoWidget;
      if (kendoCalendar) {
        kendoCalendar.next();
        await new Promise(resolve => setTimeout(resolve, 500));
        await transformTimetablePage();
      }
    });

    weekSelect?.addEventListener('change', async function() {
      const kendoCombo = document.querySelector('#Calendar_tanevHetek')?.__kendoWidget;
      if (kendoCombo) {
        kendoCombo.value(this.value);
        kendoCombo.trigger('change');
        await new Promise(resolve => setTimeout(resolve, 500));
        await transformTimetablePage();
      }
    });
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

      createTemplate.importFonts();
      setupUserDropdown();
      setupMobileNavigation();

      setupEventListeners(data);
      loadingScreen.hide();

    } catch (error) {
      console.error('Hiba az oldal átalakítása során:', error);
      loadingScreen.hide();
    }
  }

  if (window.location.href.includes('/Orarend/')) {
    transformTimetablePage();
  }
})();