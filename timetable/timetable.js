(() => {
  async function loadTestDetailsFromAPI(testId) {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/api/TanuloBejelentettSzamonkeresekApi/GetBejelentettSzamonkeresekGrid?sort=SzamonkeresDatuma-asc~Oraszam-asc&page=1&pageSize=100&group=&filter=&data=%7B%22RegiSzamonkeresekElrejtese%22%3Atrue%7D&_=${timestamp}`;

      const response = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(
          `${LanguageManager.t("common.api_error")}: ${response.status}`,
        );
      }

      const data = await response.json();
      const testItem = data.Data?.find(item => item.Uid === testId);
      return testItem ? testItem.SzamonkeresMegnevezese : null;
    } catch (error) {
      console.error("Számonkérés részletek betöltési hiba:", error);
      return null;
    }
  }

  async function loadWeekDataFromAPI(startDate, endDate) {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/api/CalendarApi/GetTanuloOrarend?tanarId=-1&osztalyCsoportId=-1&tanuloId=-1&teremId=-1&kellCsengetesiRendMegjelenites=false&csakOrarendiOra=false&kellTanoranKivuliFoglalkozasok=false&kellTevekenysegek=false&kellTanevRendje=true&szuresTanevRendjeAlapjan=false&kellOraTemaTooltip=True&start=${startDate}&end=${endDate}&_=${timestamp}`;

      const response = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(
          `${LanguageManager.t("common.api_error")}: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(LanguageManager.t("common.api_load_error"), error);
      return [];
    }
  }

  async function loadTestDetailsFromAPI(testId) {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/api/TanuloBejelentettSzamonkeresekApi/GetBejelentettSzamonkeresekGrid?sort=SzamonkeresDatuma-asc~Oraszam-asc&page=1&pageSize=100&group=&filter=&data=%7B%22RegiSzamonkeresekElrejtese%22%3Atrue%7D&_=${timestamp}`;

      const response = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Számonkérés API hiba: ${response.status}`,
        );
      }

      const data = await response.json();
      const testData = data.Data || [];
      const testDetail = testData.find(test => test.ID === testId.toString());
      
      if (testDetail) {
        return {
          name: testDetail.SzamonkeresMegnevezes || 'Nincs megnevezés',
          type: testDetail.ErtekelesModNev || 'Nincs típus megadva',
          announceDate: testDetail.BejelentesDatuma ? new Date(testDetail.BejelentesDatuma).toLocaleDateString('hu-HU') : 'Nincs dátum'
        };
      }
      
      return null;
    } catch (error) {
      console.error("Számonkérés adatok betöltési hiba:", error);
      return null;
    }
  }

  function generateWeekDates(startDate) {
    const start = new Date(startDate);
    const dates = [];
    const dayNames = [
      LanguageManager.t("common.monday"),
      LanguageManager.t("common.tuesday"),
      LanguageManager.t("common.wednesday"),
      LanguageManager.t("common.thursday"),
      LanguageManager.t("common.friday"),
    ];

    const startDay = start.getDay();
    let dayOffset = 0;

    if (startDay !== 1) {
      dayOffset = startDay === 0 ? 1 : 1 - startDay;
      start.setDate(start.getDate() + dayOffset);
    }

    for (let i = 0; i < 5; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const month = date.toLocaleDateString("hu-HU", { month: "short" });
      const day = date.getDate();

      dates.push({
        date: `${dayNames[i]} ${month} ${day}.`,
        formattedDate: `${month} ${day}.`,
        fullDate: date.toISOString().split("T")[0],
      });
    }

    return dates;
  }

  function convertAPIDataToLessons(apiData, weekDates) {
    const lessons = [];
    apiData.forEach((event, index) => {
      try {
        const eventDate = new Date(event.start);
        const dayIndex = weekDates.findIndex(
          (date) =>
            new Date(date.fullDate).toDateString() === eventDate.toDateString(),
        );

        if (dayIndex === -1) {
          return;
        }

        if (event.oraType === 5) {
          const lesson = {
            startTime: LanguageManager.t("timetable.all_day"),
            endTime: "",
            subject: event.title || "Különleges nap",
            teacher: "",
            originalTeacher: "",
            room: "",
            day: dayIndex,
            isSubstituted: false,
            isCancelled: false,
            hasHomework: false,
            testInfo: event.Tema || "",
            homeworkDetails: "",
            isSpecialDay: true,
            color: event.color,
          };
          lessons.push(lesson);
        } else if (
          event.oraType === 2 ||
          event.oraType === 1 ||
          event.oraType === 3 ||
          event.oraType === 4
        ) {
          const startTime = new Date(event.start);
          const endTime = new Date(event.end);
          const startTimeStr = startTime.toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const endTimeStr = endTime.toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const titleParts = event.title ? event.title.split("\n") : [];
          const teacher = titleParts[1] || "";
          const room = titleParts[2] ? titleParts[2].replace(/[()]/g, "") : "";
          const subject =
            event.Tantargy ||
            event.TantargyKategoria ||
            titleParts[0] ||
            "Ismeretlen tantárgy";

          if (startTimeStr && subject) {
            const lesson = {
              startTime: startTimeStr,
              endTime: endTimeStr,
              subject: subject,
              teacher: teacher,
              originalTeacher: event.helyettesitoId ? teacher : "",
              room: room,
              day: dayIndex,
              isSubstituted: !!event.helyettesitoId,
              isCancelled: event.isElmaradt || false,
              hasHomework: event.hasHaziFeladat || false,
              testInfo: event.hasBejelentettSzamonkeres
                ? event.Tema || LanguageManager.t("timetable.test_indicator")
                : "",
              testId: event.hasBejelentettSzamonkeres && event.BejelentettSzamonkeresIdList && event.BejelentettSzamonkeresIdList.length > 0 
                ? event.BejelentettSzamonkeresIdList[0] 
                : null,
              testDetails: "",
              homeworkDetails: "",
              tema: event.Tema || "",
              isSpecialDay: false,
              color: event.color,
            };
            lessons.push(lesson);
          } else {
          }
        } else {
        }
      } catch (error) {
      }
    });
    return lessons;
  }

  function generateTimeGrid(lessons, weekDates) {
    const specialDayLessons = lessons.filter((l) => l.isSpecialDay);
    const regularLessons = lessons.filter((l) => !l.isSpecialDay);

    const times = [...new Set(regularLessons.map((l) => l.startTime))].sort(
      (a, b) => {
        const timeA = helper.convertTimeToMinutes(a);
        const timeB = helper.convertTimeToMinutes(b);
        return timeA - timeB;
      },
    );
    const days = [
      LanguageManager.t("timetable.monday"),
      LanguageManager.t("timetable.tuesday"),
      LanguageManager.t("timetable.wednesday"),
      LanguageManager.t("timetable.thursday"),
      LanguageManager.t("timetable.friday"),
    ];

    
    const hasSpecialDays = specialDayLessons.length > 0;

    return `
      <div class="grid-header"></div>
      ${days
        .map((day, index) => {
          return `
          <div class="grid-header">
            <span class="day-name">${day}</span>
            <span class="day-date">${weekDates[index]?.formattedDate || ""}</span>
          </div>
        `;
        })
        .join("")}
      ${hasSpecialDays ? `
        <div class="notice-header"></div>
        ${Array(5)
          .fill()
          .map((_, dayIndex) => {
            const specialDay = specialDayLessons.find(
              (l) => l.day === dayIndex,
            );
            return `
            <div class="notice-slot">
              ${specialDay ? `
                <div class="special-day-notice" style="background-color: ${specialDay.color || "#F99F50"}" data-lesson='${JSON.stringify(specialDay)}'>
                  <div class="special-day-title">${specialDay.subject}</div>
                  ${specialDay.testInfo ? `<div class="special-day-subtitle">${specialDay.testInfo}</div>` : ""}
                </div>
              ` : ""}
            </div>
          `;
          })
          .join("")}
      ` : ""}
      ${times
        .map(
          (time, timeIndex) => {

            const lastLessonTimes = Array(5).fill().map((_, dayIndex) => {
              const dayLessonsForDay = regularLessons.filter(l => l.day === dayIndex);
              if (dayLessonsForDay.length === 0) return null;
              const lastTime = dayLessonsForDay
                .map(l => l.startTime)
                .sort((a, b) => helper.convertTimeToMinutes(b) - helper.convertTimeToMinutes(a))[0];
              return lastTime;
            });
            
            return `
        <div class="time-slot">${time}</div>
        ${Array(5)
          .fill()
          .map((_, dayIndex) => {
            const dayLessons = regularLessons.filter(
              (l) => l.startTime === time && l.day === dayIndex,
            );
            

            const lastLessonTime = lastLessonTimes[dayIndex];
            const isAfterLastLesson = lastLessonTime && helper.convertTimeToMinutes(time) > helper.convertTimeToMinutes(lastLessonTime);
            

            if (dayLessons.length === 0 && isAfterLastLesson) {
              return `<div class="lesson-slot"></div>`;
            }
            
              return `
            <div class="lesson-slot ${dayLessons.length === 0 ? 'empty-slot' : ''}">
              ${dayLessons.length === 0 ? '<div class="empty-lesson-placeholder"></div>' : ''}
              ${dayLessons
                      .map(
                        (lesson) => `
                <div class="lesson-card ${lesson.isSubstituted ? "substituted" : ""} 
                                      ${lesson.isCancelled ? "cancelled" : ""}
                                      ${lesson.hasHomework ? "has-homework" : ""}"
                     data-lesson='${JSON.stringify(lesson)}'>
                  <div class="lesson-subject">${lesson.subject}</div>
                  <div class="lesson-teacher">${lesson.teacher}</div>
                  <div class="lesson-bottom">
                    <div class="lesson-room">${lesson.room}</div>
                    <div class="lesson-time">${lesson.isCancelled ? LanguageManager.t("timetable.cancelled") : lesson.startTime}</div>
                  </div>
                  ${
                    lesson.hasHomework || lesson.testInfo
                      ? `
                    <div class="lesson-indicators">
                      ${
                        lesson.hasHomework
                          ? `
                        <span class="lesson-indicator homework-indicator" title="${LanguageManager.t("timetable.homework_indicator")}">
                          <img src="${chrome.runtime.getURL("icons/homework.svg")}" alt="Házi feladat" style="width: 20px; height: 20px;">
                        </span>
                      `
                          : ""
                      }
                      ${
                        lesson.testInfo
                          ? `
                        <span class="lesson-indicator test-indicator" title="${LanguageManager.t("timetable.test_indicator")}">
                          <img src="${chrome.runtime.getURL("icons/assigment.svg")}" alt="Teszt" style="width: 20px; height: 20px;">
                        </span>
                      `
                          : ""
                      }
                    </div>
                  `
                      : ""
                  }
                </div>
              `,
                      )
                      .join("")
              }
            </div>
          `;
          })
          .join("")}
      `;
          }
        )
        .join("")}
    `;
  }
  async function showLessonModal(lesson) {
    const modal = document.createElement("div");
    modal.className = "lesson-modal";

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.textContent = lesson.subject;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    
    const closeIcon = document.createElement('img');
    closeIcon.src = chrome.runtime.getURL('icons/CloseCircle.svg');
    closeIcon.alt = 'Bezárás';
    closeIcon.style.width = '24px';
    closeIcon.style.height = '24px';
    closeBtn.appendChild(closeIcon);
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.className = 'modal-body';

    const lessonDetails = document.createElement('div');
    lessonDetails.className = 'lesson-details';

    const teacherItem = document.createElement('div');
    teacherItem.className = 'detail-item';
    const teacherLabel = document.createElement('span');
    teacherLabel.className = 'detail-label';
    teacherLabel.textContent = LanguageManager.t('timetable.teacher_label');
    const teacherValue = document.createElement('span');
    teacherValue.className = `detail-value ${lesson.originalTeacher != '' ? 'line-through' : ''}`;
    teacherValue.textContent = lesson.originalTeacher != '' ? lesson.originalTeacher : lesson.teacher;
    teacherItem.appendChild(teacherLabel);
    teacherItem.appendChild(teacherValue);
    lessonDetails.appendChild(teacherItem);
    
    if (lesson.originalTeacher != '') {
      const substituteItem = document.createElement('div');
      substituteItem.className = 'detail-item';
      const substituteLabel = document.createElement('span');
      substituteLabel.className = 'detail-label';
      substituteLabel.textContent = LanguageManager.t('timetable.substitute_teacher_label');
      const substituteValue = document.createElement('span');
      substituteValue.className = 'detail-value';
      substituteValue.textContent = lesson.teacher.replace('Helyettesítő:', '');
      substituteItem.appendChild(substituteLabel);
      substituteItem.appendChild(substituteValue);
      lessonDetails.appendChild(substituteItem);
    }
    
    const roomItem = document.createElement('div');
    roomItem.className = 'detail-item';
    const roomLabel = document.createElement('span');
    roomLabel.className = 'detail-label';
    roomLabel.textContent = LanguageManager.t('timetable.classroom_label');
    const roomValue = document.createElement('span');
    roomValue.className = 'detail-value';
    roomValue.textContent = lesson.room;
    roomItem.appendChild(roomLabel);
    roomItem.appendChild(roomValue);
    lessonDetails.appendChild(roomItem);
    
    const timeItem = document.createElement('div');
    timeItem.className = 'detail-item';
    const timeLabel = document.createElement('span');
    timeLabel.className = 'detail-label';
    timeLabel.textContent = LanguageManager.t('timetable.time_label');
    const timeValue = document.createElement('span');
    timeValue.className = 'detail-value';
    timeValue.textContent = `${lesson.startTime} - ${lesson.endTime}`;
    timeItem.appendChild(timeLabel);
    timeItem.appendChild(timeValue);
    lessonDetails.appendChild(timeItem);
    
    if (lesson.isSubstituted) {
      const statusItem = document.createElement('div');
      statusItem.className = 'detail-item';
      const statusLabel = document.createElement('span');
      statusLabel.className = 'detail-label';
      statusLabel.textContent = LanguageManager.t('timetable.status_label');
      const statusValue = document.createElement('span');
      statusValue.className = 'detail-value';
      const statusIcon = document.createElement('span');
      statusIcon.className = 'material-icons-round';
      statusIcon.textContent = 'sync_alt';
      statusValue.appendChild(statusIcon);
      statusValue.appendChild(document.createTextNode(' ' + LanguageManager.t('timetable.substitution')));
      statusItem.appendChild(statusLabel);
      statusItem.appendChild(statusValue);
      lessonDetails.appendChild(statusItem);
    }
    
    if (lesson.isCancelled) {
      const statusItem = document.createElement('div');
      statusItem.className = 'detail-item';
      const statusLabel = document.createElement('span');
      statusLabel.className = 'detail-label';
      statusLabel.textContent = LanguageManager.t('timetable.status_label');
      const statusValue = document.createElement('span');
      statusValue.className = 'detail-value';
      const statusIcon = document.createElement('span');
      statusIcon.className = 'material-icons-round';
      statusIcon.textContent = 'cancel';
      statusValue.appendChild(statusIcon);
      statusValue.appendChild(document.createTextNode(' ' + LanguageManager.t('timetable.cancelled')));
      statusItem.appendChild(statusLabel);
      statusItem.appendChild(statusValue);
      lessonDetails.appendChild(statusItem);
    }
    
    body.appendChild(lessonDetails);

    if (lesson.tema) {
      const temaSection = document.createElement('div');
      temaSection.className = 'modal-section tema-section';
      
      const temaH4 = document.createElement('h4');
      const temaIcon = document.createElement('img');
      temaIcon.src = chrome.runtime.getURL('icons/Subject.svg');
      temaIcon.alt = 'Óra témája';
      temaIcon.style.width = '20px';
      temaIcon.style.height = '20px';
      temaH4.appendChild(temaIcon);
      temaH4.appendChild(document.createTextNode('Óra témája'));
      
      const temaContent = document.createElement('div');
      temaContent.className = 'tema-content';
      
      const temaP = document.createElement('p');
      temaP.textContent = lesson.tema;
      temaContent.appendChild(temaP);
      
      temaSection.appendChild(temaH4);
      temaSection.appendChild(temaContent);
      body.appendChild(temaSection);
    }
    
    if (lesson.hasHomework) {
      const homeworkSection = document.createElement('div');
      homeworkSection.className = 'modal-section homework-section';
      
      const homeworkH4 = document.createElement('h4');
      const homeworkIcon = document.createElement('img');
      homeworkIcon.src = chrome.runtime.getURL('icons/homework.svg');
      homeworkIcon.alt = 'Házi feladat';
      homeworkIcon.style.width = '20px';
      homeworkIcon.style.height = '20px';
      homeworkH4.appendChild(homeworkIcon);
      homeworkH4.appendChild(document.createTextNode(LanguageManager.t('timetable.homework_indicator')));
      
      const homeworkContent = document.createElement('div');
      homeworkContent.className = 'homework-content';
      
      const homeworkP = document.createElement('p');
      homeworkP.textContent = lesson.homeworkDetails ? lesson.homeworkDetails : LanguageManager.t('timetable.has_homework');
      homeworkContent.appendChild(homeworkP);
      
      const moreLink = document.createElement('a');
      moreLink.href = `https://${window.location.hostname}/Tanulo/TanuloHaziFeladat`;
      moreLink.className = 'more-link';
      moreLink.textContent = LanguageManager.t('timetable.open_homework');
      
      const linkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      linkSvg.setAttribute('width', '16');
      linkSvg.setAttribute('height', '17');
      linkSvg.setAttribute('viewBox', '0 0 16 17');
      linkSvg.setAttribute('fill', 'none');
      
      const linkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      linkPath.setAttribute('d', 'M11.2997 5.19947L5.64282 5.19947M11.2997 5.19947L11.2997 10.8563M11.2997 5.19947L4.70001 11.7991');
      linkPath.setAttribute('stroke', 'var(--accent-accent)');
      linkPath.setAttribute('stroke-width', '2');
      linkPath.setAttribute('stroke-linecap', 'round');
      linkPath.setAttribute('stroke-linejoin', 'round');
      
      linkSvg.appendChild(linkPath);
      moreLink.appendChild(linkSvg);
      homeworkContent.appendChild(moreLink);
      
      homeworkSection.appendChild(homeworkH4);
      homeworkSection.appendChild(homeworkContent);
      body.appendChild(homeworkSection);
    }
    
    if (lesson.testInfo) {
      const testSection = document.createElement('div');
      testSection.className = 'modal-section test-section';
      
      const testH4 = document.createElement('h4');
      const testIcon = document.createElement('img');
      testIcon.src = chrome.runtime.getURL('icons/assigment.svg');
      testIcon.alt = 'Teszt';
      testIcon.style.width = '20px';
      testIcon.style.height = '20px';
      testH4.appendChild(testIcon);
      testH4.appendChild(document.createTextNode(LanguageManager.t('timetable.test_indicator')));
      
      const testContent = document.createElement('div');
      testContent.className = 'test-content';

      if (lesson.testId) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'test-details-loading';
        loadingDiv.textContent = 'Részletek betöltése...';
        testContent.appendChild(loadingDiv);

        loadTestDetailsFromAPI(lesson.testId).then(testDetails => {
          loadingDiv.remove();
          
          if (testDetails) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'test-details';
            
            const nameP = document.createElement('p');
            nameP.innerHTML = `<strong>Megnevezés:</strong> ${testDetails.name}`;
            detailsDiv.appendChild(nameP);
            
            const typeP = document.createElement('p');
            typeP.innerHTML = `<strong>Típus:</strong> ${testDetails.type}`;
            detailsDiv.appendChild(typeP);
            
            const dateP = document.createElement('p');
            dateP.innerHTML = `<strong>Bejelentés dátuma:</strong> ${testDetails.announceDate}`;
            detailsDiv.appendChild(dateP);
            
            testContent.appendChild(detailsDiv);
          } else {
            const errorP = document.createElement('p');
            errorP.className = 'test-details-error';
            errorP.textContent = 'Nem sikerült betölteni a számonkérés részleteit.';
            testContent.appendChild(errorP);
          }
        }).catch(error => {
          loadingDiv.remove();
          const errorP = document.createElement('p');
          errorP.className = 'test-details-error';
          errorP.textContent = 'Hiba történt a számonkérés részletek betöltése során.';
          testContent.appendChild(errorP);
        });
      }
      
      testSection.appendChild(testH4);
      testSection.appendChild(testContent);
      body.appendChild(testSection);
    }
    
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    
    modal.innerHTML = '';
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector(".modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    requestAnimationFrame(() => {
      modal.classList.add("show");
    });
  }

  async function loadAndDisplayWeek(weekOption) {
    try {
      loadingScreen.show();
      let startDate, endDate;
      if (weekOption.startDate && weekOption.endDate) {
        startDate = weekOption.startDate;
        endDate = weekOption.endDate;
      } else {
        const weekText = weekOption.text;
        const dateMatch = weekText.match(/(\d{4})\.(\d{2})\.(\d{2})/);

        if (!dateMatch) {
          console.error(
            LanguageManager.t("timetable.date_extract_error"),
            weekText,
          );
          return;
        }
        const [, year, month, day] = dateMatch;
        startDate = `${year}-${month}-${day}`;
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        endDate = end.toISOString().split("T")[0];
      }
      const apiData = await loadWeekDataFromAPI(startDate, endDate);
      const weekDates = generateWeekDates(startDate);
      const kendoCombo = document.querySelector(
        "#Calendar_tanevHetek",
      )?.__kendoWidget;
      if (kendoCombo) {
        kendoCombo.value(weekOption.value);
        kendoCombo.trigger("change");

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const apiLessons = convertAPIDataToLessons(apiData, weekDates);
      const allLessons = apiLessons;
      const timetableGrid = document.querySelector(".timetable-grid");
      if (timetableGrid) {
    
        const newContent = generateTimeGrid(lessons, weekDates);
        timetableGrid.innerHTML = '';
    
        const parser1 = new DOMParser();
        const doc = parser1.parseFromString(`<div>${newContent}</div>`, 'text/html');
        const tempDiv = doc.querySelector('div');
        while (tempDiv.firstChild) {
          timetableGrid.appendChild(tempDiv.firstChild);
        }
        setupLessonCardListeners();
      }

      const weekSelect = document.querySelector(".week-select");
      if (weekSelect) {
        weekSelect.value = weekOption.value;
      }

      setupDayNavigation(weekDates);
    } catch (error) {
      console.error(LanguageManager.t("timetable.week_load_error"), error);
    } finally {
      loadingScreen.hide();
    }
  }

  function setupLessonCardListeners() {
    document.querySelectorAll(".lesson-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const lessonData = JSON.parse(card.dataset.lesson);
        await showLessonModal(lessonData);
      });
    });
  }

  function setupEventListeners(data) {
    setupLessonCardListeners();
    setupDayNavigation(data.weekDates);

    const weekGrid = document.getElementById("week-grid");
    const weekTooltip = document.getElementById("week-tooltip");

    if (weekGrid && weekTooltip) {
      weekGrid.addEventListener("click", async (e) => {
        if (e.target.classList.contains("week-cell")) {
          const weekValue = e.target.dataset.week;
          const weekOption = data.weekInfo.options.find(
            (opt) => opt.value === weekValue,
          );

          if (weekOption) {
            document.querySelectorAll(".week-cell.selected").forEach((cell) => {
              cell.classList.remove("selected");
            });

            e.target.classList.add("selected");

            await loadAndDisplayWeek(weekOption);
          }
        }
      });

      weekGrid.addEventListener("mouseover", (e) => {
        if (e.target.classList.contains("week-cell")) {
          const startDate = e.target.dataset.start;
          const endDate = e.target.dataset.end;
          const weekNum = e.target.dataset.week;

          if (startDate && endDate) {
            const startFormatted = formatDateHU(new Date(startDate));
            const endFormatted = formatDateHU(new Date(endDate));
            weekTooltip.textContent = `${weekNum}. hét: ${startFormatted} - ${endFormatted}`;
            const rect = e.target.getBoundingClientRect();
            const containerRect = weekGrid.getBoundingClientRect();

            weekTooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
            weekTooltip.style.top = `${rect.top - containerRect.top - 40}px`;
            weekTooltip.style.transform = "translateX(-50%)";
            weekTooltip.classList.add("show");
          }
        }
      });

      weekGrid.addEventListener("mouseout", (e) => {
        if (e.target.classList.contains("week-cell")) {
          weekTooltip.classList.remove("show");
        }
      });
    }

    const expandBtn = document.getElementById("expandWeekView");
    const modal = document.getElementById("weekModal");
    const closeBtn = document.getElementById("closeWeekModal");
    const modalGrid = document.getElementById("weekModalGrid");

    if (expandBtn && modal && closeBtn && modalGrid) {
      expandBtn.addEventListener("click", () => {
        generateFullYearWeeks(modalGrid, data);
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
      });

      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
          document.body.style.overflow = "auto";
        }
      });
    }
  }

  let dayNavigationState = {
    currentDayIndex: 0,
    isInitialized: false,
  };

  function setupDayNavigation(weekDates) {
    const days = [
      LanguageManager.t("timetable.monday"),
      LanguageManager.t("timetable.tuesday"),
      LanguageManager.t("timetable.wednesday"),
      LanguageManager.t("timetable.thursday"),
      LanguageManager.t("timetable.friday"),
    ];

    const prevBtn = document.getElementById("prevDay");
    const nextBtn = document.getElementById("nextDay");
    const currentDayName = document.getElementById("currentDayName");
    const currentDayDate = document.getElementById("currentDayDate");

    if (!dayNavigationState.isInitialized) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      let currentDayIndex = 0;
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        currentDayIndex = dayOfWeek - 1;
      } else {
        currentDayIndex = 0;
      }

      dayNavigationState.currentDayIndex = currentDayIndex;
    } else {
      const preservedDayIndex = dayNavigationState.currentDayIndex;
      dayNavigationState.currentDayIndex = preservedDayIndex;
    }

    function updateDayDisplay() {
      if (currentDayName && currentDayDate) {
        currentDayName.textContent = days[dayNavigationState.currentDayIndex];
        currentDayDate.textContent =
          weekDates[dayNavigationState.currentDayIndex]?.formattedDate || "";
      }

      const gridHeaders = document.querySelectorAll(
        ".grid-header:not(:first-child)",
      );
      const noticeSlots = document.querySelectorAll(".notice-slot");
      const lessonSlots = document.querySelectorAll(".lesson-slot");

      gridHeaders.forEach((header, index) => {
        header.classList.toggle(
          "active",
          index === dayNavigationState.currentDayIndex,
        );
      });

      noticeSlots.forEach((slot, index) => {
        slot.classList.toggle(
          "active",
          index === dayNavigationState.currentDayIndex,
        );
      });

      const timeSlots = document.querySelectorAll(".time-slot");
      timeSlots.forEach((timeSlot, timeIndex) => {
        const startIndex = timeIndex * 5;
        lessonSlots.forEach((slot, slotIndex) => {
          const dayIndex = (slotIndex - startIndex) % 5;
          if (slotIndex >= startIndex && slotIndex < startIndex + 5) {
            slot.classList.toggle(
              "active",
              dayIndex === dayNavigationState.currentDayIndex,
            );
          }
        });
      });
    }

    if (prevBtn && nextBtn && !dayNavigationState.isInitialized) {
      prevBtn.addEventListener("click", () => {
        if (dayNavigationState.currentDayIndex > 0) {
          dayNavigationState.currentDayIndex--;
          updateDayDisplay();
        }
      });

      nextBtn.addEventListener("click", () => {
        if (dayNavigationState.currentDayIndex < days.length - 1) {
          dayNavigationState.currentDayIndex++;
          updateDayDisplay();
        }
      });

      dayNavigationState.isInitialized = true;
    }

    updateDayDisplay();
  }

  function getWeekNumber(date) {
    const currentDate = new Date(date);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    let schoolYear;
    if (currentMonth >= 8) {
      schoolYear = currentYear;
    } else {
      schoolYear = currentYear - 1;
    }

    const schoolYearStart = new Date(schoolYear, 8, 1);
    const startDayOfWeek = schoolYearStart.getDay();
    const daysToFirstMonday =
      startDayOfWeek === 1 ? 0 : (8 - startDayOfWeek) % 7;

    const firstMonday = new Date(schoolYearStart);
    firstMonday.setDate(schoolYearStart.getDate() + daysToFirstMonday);

    const timeDiff = currentDate.getTime() - firstMonday.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysDiff / 7) + 1;

    return Math.max(1, Math.min(52, weekNumber));
  }

  function getDateOfWeek(year, week, dayOfWeek) {

    const schoolYearStart = new Date(year, 8, 1);
    const startDayOfWeek = schoolYearStart.getDay();
    const daysToFirstMonday =
      startDayOfWeek === 1 ? 0 : (8 - startDayOfWeek) % 7;

    const firstMonday = new Date(schoolYearStart);
    firstMonday.setDate(schoolYearStart.getDate() + daysToFirstMonday);

    const targetDate = new Date(firstMonday);
    targetDate.setDate(
      firstMonday.getDate() + (week - 1) * 7 + (dayOfWeek - 1),
    );

    return targetDate;
  }

  function formatDateHU(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}.`;
  }

  function generateWeekOptions() {
    const options = [];
    const today = new Date();

    for (let offset = -2; offset <= 2; offset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + offset * 7);
      const dayOfWeek = targetDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(targetDate);
      weekStart.setDate(targetDate.getDate() + daysToMonday);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekNumber = getWeekNumber(weekStart);

      const startDateFormatted = formatDateHU(weekStart);
      const endDateFormatted = formatDateHU(weekEnd);

      const startDate = weekStart.toISOString().split("T")[0];
      const endDate = weekEnd.toISOString().split("T")[0];

      options.push({
        text: `${weekNumber}. hét (${startDateFormatted} - ${endDateFormatted})`,
        value: weekNumber.toString(),
        selected: offset === 0,
        startDate: startDate,
        endDate: endDate,
      });
    }

    return options;
  }

  function generateFullYearWeeks(modalGrid, data) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let schoolYearStart;
    if (currentMonth >= 8) {
      schoolYearStart = new Date(currentYear, 8, 1);
    } else {
      schoolYearStart = new Date(currentYear - 1, 8, 1);
    }

    const currentWeekNumber = getWeekNumber(today);
    const allWeeks = [];

    for (let weekNum = 1; weekNum <= 52; weekNum++) {
      const weekStart = new Date(schoolYearStart);
      const sept1DayOfWeek = schoolYearStart.getDay();
      const daysToMonday = sept1DayOfWeek === 0 ? 1 : (8 - sept1DayOfWeek) % 7;
      if (weekNum === 1) {
        weekStart.setDate(schoolYearStart.getDate() - daysToMonday);
      } else {
        weekStart.setDate(
          schoolYearStart.getDate() - daysToMonday + (weekNum - 1) * 7,
        );
      }

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startDateFormatted = formatDateHU(weekStart);
      const endDateFormatted = formatDateHU(weekEnd);

      const startDate = weekStart.toISOString().split("T")[0];
      const endDate = weekEnd.toISOString().split("T")[0];

      allWeeks.push({
        text: `${weekNum}. hét (${startDateFormatted} - ${endDateFormatted})`,
        value: weekNum.toString(),
        selected: weekNum === currentWeekNumber,
        startDate: startDate,
        endDate: endDate,
      });
    }


    modalGrid.innerHTML = '';
    allWeeks.forEach((week) => {
      const weekCell = document.createElement('div');
      weekCell.className = `week-cell ${week.selected ? 'selected' : ''} ${week.selected ? 'current-week' : ''}`;
      weekCell.setAttribute('data-week', week.value);
      weekCell.setAttribute('data-start', week.startDate);
      weekCell.setAttribute('data-end', week.endDate);
      weekCell.title = week.text;
      weekCell.textContent = week.value;
      
      modalGrid.appendChild(weekCell);
    });
    modalGrid.addEventListener("click", async (e) => {
      if (e.target.classList.contains("week-cell")) {
        const weekValue = e.target.dataset.week;
        const weekOption = allWeeks.find((opt) => opt.value === weekValue);

        if (weekOption) {
          document.getElementById("weekModal").style.display = "none";
          document.body.style.overflow = "auto";

          document
            .querySelectorAll("#week-grid .week-cell.selected")
            .forEach((cell) => {
              cell.classList.remove("selected");
            });

          await loadAndDisplayWeek(weekOption);

          const newWeekOptions = generateWeekOptionsAroundWeek(
            parseInt(weekValue),
          );
          updateMainWeekGrid(newWeekOptions);
        }
      }
    });
  }

  function generateWeekOptionsAroundWeek(targetWeekNumber) {
    const options = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let schoolYearStart;
    if (currentMonth >= 8) {
      schoolYearStart = new Date(currentYear, 8, 1);
    } else {
      schoolYearStart = new Date(currentYear - 1, 8, 1);
    }
    for (let offset = -2; offset <= 2; offset++) {
      const weekNum = Math.max(1, Math.min(52, targetWeekNumber + offset));
      const weekStart = new Date(schoolYearStart);
      const sept1DayOfWeek = schoolYearStart.getDay();
      const daysToMonday = sept1DayOfWeek === 0 ? 1 : (8 - sept1DayOfWeek) % 7;
      if (weekNum === 1) {
        weekStart.setDate(schoolYearStart.getDate() - daysToMonday);
      } else {
        weekStart.setDate(
          schoolYearStart.getDate() - daysToMonday + (weekNum - 1) * 7,
        );
      }

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startDateFormatted = formatDateHU(weekStart);
      const endDateFormatted = formatDateHU(weekEnd);

      const startDate = weekStart.toISOString().split("T")[0];
      const endDate = weekEnd.toISOString().split("T")[0];

      options.push({
        text: `${weekNum}. hét (${startDateFormatted} - ${endDateFormatted})`,
        value: weekNum.toString(),
        selected: weekNum === targetWeekNumber,
        startDate: startDate,
        endDate: endDate,
      });
    }

    return options;
  }

  function updateMainWeekGrid(newWeekOptions) {
    const weekGrid = document.getElementById("week-grid");
    if (weekGrid) {
  
      weekGrid.innerHTML = '';
      newWeekOptions.forEach((opt) => {
        const weekCell = document.createElement('div');
        weekCell.className = `week-cell ${opt.selected ? 'selected' : ''}`;
        weekCell.setAttribute('data-week', opt.value);
        weekCell.setAttribute('data-start', opt.startDate);
        weekCell.setAttribute('data-end', opt.endDate);
        weekCell.title = opt.text;
        weekCell.textContent = opt.value;
        
        weekGrid.appendChild(weekCell);
      });
    }
  }

  async function transformTimetablePage() {
    try {
      const weekOptions = generateWeekOptions();
      const currentWeekOption = weekOptions.find((opt) => opt.selected);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startDate = startOfWeek.toISOString().split("T")[0];
      const endDate = endOfWeek.toISOString().split("T")[0];
      const apiData = await loadWeekDataFromAPI(startDate, endDate);
      const weekDates = generateWeekDates(startDate);
      const lessons = convertAPIDataToLessons(apiData, weekDates);
      const data = {
        schoolInfo: {
          name: cookieManager.get("schoolName") || "Iskola",
          id: cookieManager.get("schoolCode") || "",
        },
        userData: {
          name: cookieManager.get("userName") || "Felhasználó",
          time: "45:00",
        },
        weekInfo: {
          title: LanguageManager.t("timetable.week"),
          options: weekOptions,
        },
        weekDates: weekDates,
        lessons: lessons,
      };


      document.body.innerHTML = '';
      
  
      const kretaContainer = document.createElement('div');
      kretaContainer.className = 'kreta-container';
      
  
      const headerDiv = document.createElement('div');
  
      const parser2 = new DOMParser();
      const headerDoc = parser2.parseFromString(createTemplate.header(), 'text/html');
      const headerContent = headerDoc.body;
      while (headerContent.firstChild) {
        headerDiv.appendChild(headerContent.firstChild);
      }
      kretaContainer.appendChild(headerDiv);
      
  
      const main = document.createElement('main');
      main.className = 'kreta-main';
      
  
      const weekControls = document.createElement('div');
      weekControls.className = 'week-controls';
      
      const weekSelectorContainer = document.createElement('div');
      weekSelectorContainer.className = 'week-selector-container';
      
      const weekSelector = document.createElement('div');
      weekSelector.className = 'week-selector';
      weekSelector.id = 'week-selector';
      
  
      const prevWeekBtn = document.createElement('button');
      prevWeekBtn.className = 'week-nav-btn';
      prevWeekBtn.id = 'prevWeekBtn';
      prevWeekBtn.title = 'Előző hét';
      const prevIcon = document.createElement('img');
      prevIcon.src = chrome.runtime.getURL('icons/ChevronLeftCircle.svg');
      prevIcon.alt = 'Előző';
      prevIcon.style.width = '24px';
      prevIcon.style.height = '24px';
      prevWeekBtn.appendChild(prevIcon);
      
  
      const weekDisplay = document.createElement('div');
      weekDisplay.className = 'week-display';
      weekDisplay.id = 'week-display';
      
  
      const nextWeekBtn = document.createElement('button');
      nextWeekBtn.className = 'week-nav-btn';
      nextWeekBtn.id = 'nextWeekBtn';
      nextWeekBtn.title = 'Következő hét';
      const nextIcon = document.createElement('img');
      nextIcon.src = chrome.runtime.getURL('icons/ChevronRightCircle.svg');
      nextIcon.alt = 'Következő';
      nextIcon.style.width = '24px';
      nextIcon.style.height = '24px';
      nextWeekBtn.appendChild(nextIcon);
      
  
      const expandBtn = document.createElement('button');
      expandBtn.className = 'expand-week-view-btn';
      expandBtn.id = 'expandWeekView';
      expandBtn.title = 'Teljes nézet';
      const expandIcon = document.createElement('img');
      expandIcon.src = chrome.runtime.getURL('icons/ArrowsExpandFull.svg');
      expandIcon.alt = 'Teljes nézet';
      expandIcon.style.width = '18px';
      expandIcon.style.height = '18px';
      expandBtn.appendChild(expandIcon);
      
      weekSelector.appendChild(prevWeekBtn);
      weekSelector.appendChild(weekDisplay);
      weekSelector.appendChild(nextWeekBtn);
      weekSelector.appendChild(expandBtn);
      
      const weekTooltip = document.createElement('div');
      weekTooltip.className = 'week-tooltip';
      weekTooltip.id = 'week-tooltip';
      
      weekSelectorContainer.appendChild(weekSelector);
      weekSelectorContainer.appendChild(weekTooltip);
      weekControls.appendChild(weekSelectorContainer);
      
  
      const weekModal = document.createElement('div');
      weekModal.className = 'week-modal';
      weekModal.id = 'weekModal';
      weekModal.style.display = 'none';
      
      const weekModalContent = document.createElement('div');
      weekModalContent.className = 'week-modal-content';
      
      const weekModalHeader = document.createElement('div');
      weekModalHeader.className = 'week-modal-header';
      
      const modalH3 = document.createElement('h3');
      weekModalHeader.appendChild(modalH3);
      
      const closeWeekModalBtn = document.createElement('button');
      closeWeekModalBtn.className = 'week-modal-close';
      closeWeekModalBtn.id = 'closeWeekModal';
      const closeModalIcon = document.createElement('img');
      closeModalIcon.src = chrome.runtime.getURL('icons/CloseCircle.svg');
      closeModalIcon.alt = 'Bezárás';
      closeModalIcon.style.width = '24px';
      closeModalIcon.style.height = '24px';
      closeWeekModalBtn.appendChild(closeModalIcon);
      weekModalHeader.appendChild(closeWeekModalBtn);
      
      const weekModalGrid = document.createElement('div');
      weekModalGrid.className = 'week-modal-grid';
      weekModalGrid.id = 'weekModalGrid';
      
      weekModalContent.appendChild(weekModalHeader);
      weekModalContent.appendChild(weekModalGrid);
      weekModal.appendChild(weekModalContent);
      
  
      const dayNavigation = document.createElement('div');
      dayNavigation.className = 'day-navigation';
      
      const prevDayBtn = document.createElement('button');
      prevDayBtn.className = 'day-nav-btn';
      prevDayBtn.id = 'prevDay';
      const prevDayIcon = document.createElement('img');
      prevDayIcon.src = chrome.runtime.getURL('icons/ChevronLeftCircle.svg');
      prevDayIcon.alt = 'Előző';
      prevDayIcon.style.width = '24px';
      prevDayIcon.style.height = '24px';
      prevDayBtn.appendChild(prevDayIcon);
      prevDayBtn.appendChild(document.createTextNode('Előző'));
      
      const nextDayBtn = document.createElement('button');
      nextDayBtn.className = 'day-nav-btn';
      nextDayBtn.id = 'nextDay';
      nextDayBtn.appendChild(document.createTextNode('Következő'));
      const nextDayIcon = document.createElement('img');
      nextDayIcon.src = chrome.runtime.getURL('icons/ChevronRightCircle.svg');
      nextDayIcon.alt = 'Következő';
      nextDayIcon.style.width = '24px';
      nextDayIcon.style.height = '24px';
      nextDayBtn.appendChild(nextDayIcon);
      
      dayNavigation.appendChild(prevDayBtn);
      dayNavigation.appendChild(nextDayBtn);
      
  
      const timetableContainer = document.createElement('div');
      timetableContainer.className = 'timetable-container';
      
      const timetableGrid = document.createElement('div');
      timetableGrid.className = 'timetable-grid';
      
  
      const gridContent = generateTimeGrid(data.lessons, data.weekDates);
  
      const parser3 = new DOMParser();
      const doc = parser3.parseFromString(`<div>${gridContent}</div>`, 'text/html');
      const tempDiv = doc.querySelector('div');
      while (tempDiv.firstChild) {
        timetableGrid.appendChild(tempDiv.firstChild);
      }
      
      timetableContainer.appendChild(timetableGrid);
      
  
      main.appendChild(weekControls);
      main.appendChild(weekModal);
      main.appendChild(dayNavigation);
      main.appendChild(timetableContainer);
      
      kretaContainer.appendChild(main);
      document.body.appendChild(kretaContainer);

      
      setupUserDropdown();
      setupMobileNavigation();
      setupEventListeners(data);
      initializeWeekSelector();

      loadingScreen.hide();
    } catch (error) {
      console.error(LanguageManager.t("timetable.page_transform_error"), error);
      loadingScreen.hide();
    }
  }

  let selectedWeekNumber = 1;
  let currentWeekNumber = 1;

  function initializeWeekSelector() {
    const today = new Date();
    currentWeekNumber = getWeekNumber(today);
    selectedWeekNumber = currentWeekNumber;

    updateWeekDisplay();
    setupWeekNavigation();
  }

  function updateWeekDisplay() {
    const weekDisplay = document.getElementById("week-display");
    if (!weekDisplay) return;


    const visibleWeeks = [];
    for (let i = -2; i <= 2; i++) {
      let weekNum = selectedWeekNumber + i;
      if (weekNum < 1) weekNum = 52 + weekNum;
      if (weekNum > 52) weekNum = weekNum - 52;
      visibleWeeks.push(weekNum);
    }


    weekDisplay.innerHTML = '';
    visibleWeeks.forEach((weekNum, index) => {
      const isSelected = index === 2;
      const isCurrent = weekNum === currentWeekNumber;
      
      const weekCell = document.createElement('div');
      weekCell.className = `week-cell ${isSelected ? 'selected' : ''} ${isCurrent ? 'current-week' : ''}`;
      weekCell.setAttribute('data-week', weekNum);
      weekCell.title = `${weekNum}. hét${isCurrent ? ' (Jelenlegi hét)' : ''}`;
      
      const weekNumber = document.createElement('span');
      weekNumber.className = 'week-number';
      weekNumber.textContent = weekNum;
      weekCell.appendChild(weekNumber);
      
      if (isCurrent) {
        const currentIndicator = document.createElement('span');
        currentIndicator.className = 'current-indicator';
        currentIndicator.textContent = '●';
        weekCell.appendChild(currentIndicator);
      }
      
      weekDisplay.appendChild(weekCell);
    });
  }

  function setupWeekNavigation() {
    const prevBtn = document.getElementById("prevWeekBtn");
    const nextBtn = document.getElementById("nextWeekBtn");
    const expandBtn = document.getElementById("expandWeekView");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        selectedWeekNumber--;
        if (selectedWeekNumber < 1) selectedWeekNumber = 52;
        updateWeekDisplay();
        loadWeekData(selectedWeekNumber);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        selectedWeekNumber++;
        if (selectedWeekNumber > 52) selectedWeekNumber = 1;
        updateWeekDisplay();
        loadWeekData(selectedWeekNumber);
      });
    }

    if (expandBtn) {
      expandBtn.addEventListener("click", () => {
        openWeekModal();
      });
    }

    const weekClickHandler = (e) => {
      const weekCell = e.target.closest(".week-cell");
      if (weekCell) {
        const weekNumber = parseInt(weekCell.dataset.week);
        if (!isNaN(weekNumber)) {
          selectedWeekNumber = weekNumber;
          updateWeekDisplay();
          loadWeekData(selectedWeekNumber);
        }
      }
    };

    document
      .getElementById("week-display")
      .addEventListener("click", weekClickHandler);

    setupWeekModal();
  }

  function loadWeekData(weekNumber) {

    const today = new Date();
    let currentYear = today.getFullYear();


    if (today.getMonth() < 8) {
      currentYear--;
    }

    const startOfWeek = getDateOfWeek(currentYear, weekNumber, 1);
    const endOfWeek = getDateOfWeek(currentYear, weekNumber, 7);
    const startDate = startOfWeek.toISOString().split("T")[0];
    const endDate = endOfWeek.toISOString().split("T")[0];

    loadWeekDataFromAPI(startDate, endDate)
      .then((apiData) => {
        const weekDates = generateWeekDates(startDate);
        const lessons = convertAPIDataToLessons(apiData, weekDates);

        const timetableContainer = document.querySelector(".timetable-grid");
        if (timetableContainer) {
      
          timetableContainer.innerHTML = '';
          const gridContent = generateTimeGrid(lessons, weekDates);
      
          const parser2 = new DOMParser();
          const doc = parser2.parseFromString(`<div>${gridContent}</div>`, 'text/html');
          const tempDiv = doc.querySelector('div');
          while (tempDiv.firstChild) {
            timetableContainer.appendChild(tempDiv.firstChild);
          }
          setupLessonCardListeners();
        }
      })
      .catch((error) => {
        console.error("Hét adatainak betöltése sikertelen:", error);
      });
  }

  function openWeekModal() {
    const modal = document.getElementById("weekModal");
    const modalGrid = document.getElementById("weekModalGrid");

    if (!modal || !modalGrid) return;

    const allWeeks = [];
    for (let week = 1; week <= 52; week++) {
      allWeeks.push(week);
    }

    
    modalGrid.innerHTML = '';
    allWeeks.forEach((weekNumber) => {
      const isSelected = weekNumber === selectedWeekNumber;
      const isCurrent = weekNumber === currentWeekNumber;
      
      const weekCell = document.createElement('div');
      weekCell.className = `week-cell modal-week-cell ${isSelected ? 'selected' : ''} ${isCurrent ? 'current-week' : ''}`;
      weekCell.setAttribute('data-week', weekNumber);
      weekCell.title = `${weekNumber}. hét${isCurrent ? ' (Jelenlegi hét)' : ''}`;
      
      const weekNumberSpan = document.createElement('span');
      weekNumberSpan.className = 'week-number';
      weekNumberSpan.textContent = weekNumber;
      weekCell.appendChild(weekNumberSpan);
      
      if (isCurrent) {
        const currentIndicator = document.createElement('span');
        currentIndicator.className = 'current-indicator';
        currentIndicator.textContent = '●';
        weekCell.appendChild(currentIndicator);
      }
      
      modalGrid.appendChild(weekCell);
    });

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeWeekModal() {
    const modal = document.getElementById("weekModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  function setupWeekModal() {
    const modal = document.getElementById("weekModal");
    const closeBtn = document.querySelector(".close-modal");

    if (closeBtn) {
      closeBtn.addEventListener("click", closeWeekModal);
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeWeekModal();
        }
      });
    }

    const modalWeekClickHandler = (e) => {
      const weekCell = e.target.closest(".modal-week-cell");
      if (weekCell) {
        const weekNumber = parseInt(weekCell.dataset.week);
        if (!isNaN(weekNumber)) {
          selectedWeekNumber = weekNumber;
          updateWeekDisplay();
          loadWeekData(selectedWeekNumber);
          closeWeekModal();
        }
      }
    };

    document
      .getElementById("weekModalGrid")
      .addEventListener("click", modalWeekClickHandler);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && modal.style.display === "flex") {
        closeWeekModal();
      }
    });
  }

  if (window.location.href.includes("/Orarend/")) {
    transformTimetablePage();
  }
})();
