(() => {
  async function getCompletedHomework() {
    if (typeof storageManager !== 'undefined') {
      try {
        const value = await storageManager.get('completedHomework');
        if (value) {
          return JSON.parse(value);
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  async function saveCompletedHomework(completedList) {
    if (typeof storageManager !== 'undefined') {
      await storageManager.set('completedHomework', JSON.stringify(completedList));
    }
  }

  async function toggleHomeworkCompletion(lessonId) {
    const completed = await getCompletedHomework();
    const index = completed.indexOf(lessonId);
    
    if (index > -1) {
      completed.splice(index, 1);
    } else {
      completed.push(lessonId);
    }
    
    await saveCompletedHomework(completed);
    return index === -1;
  }

  async function isHomeworkCompleted(lessonId) {
    const completed = await getCompletedHomework();
    return completed.includes(lessonId);
  }

  
  async function getCustomHomework() {
    if (typeof storageManager !== 'undefined') {
      try {
        const value = await storageManager.get('customHomework');
        if (value) {
          return JSON.parse(value);
        }
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  async function saveCustomHomework(customHomework) {
    if (typeof storageManager !== 'undefined') {
      await storageManager.set('customHomework', JSON.stringify(customHomework));
    }
  }

  async function getCustomTests() {
    if (typeof storageManager !== 'undefined') {
      try {
        const value = await storageManager.get('customTests');
        if (value) {
          return JSON.parse(value);
        }
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  async function saveCustomTests(customTests) {
    if (typeof storageManager !== 'undefined') {
      await storageManager.set('customTests', JSON.stringify(customTests));
    }
  }

  async function addCustomHomework(lessonKey, homeworkText) {
    const customHomework = await getCustomHomework();
    if (!customHomework[lessonKey]) {
      customHomework[lessonKey] = [];
    }
    const homeworkId = Date.now().toString();
    customHomework[lessonKey].push({
      id: homeworkId,
      text: homeworkText,
      completed: false,
      createdAt: new Date().toISOString()
    });
    await saveCustomHomework(customHomework);
    return homeworkId;
  }

  async function removeCustomHomework(lessonKey, homeworkId) {
    const customHomework = await getCustomHomework();
    if (customHomework[lessonKey]) {
      customHomework[lessonKey] = customHomework[lessonKey].filter(hw => hw.id !== homeworkId);
      if (customHomework[lessonKey].length === 0) {
        delete customHomework[lessonKey];
      }
      await saveCustomHomework(customHomework);
    }
  }

  async function toggleCustomHomeworkCompletion(lessonKey, homeworkId) {
    const customHomework = await getCustomHomework();
    if (customHomework[lessonKey]) {
      const homework = customHomework[lessonKey].find(hw => hw.id === homeworkId);
      if (homework) {
        homework.completed = !homework.completed;
        await saveCustomHomework(customHomework);
        return homework.completed;
      }
    }
    return false;
  }

  async function addCustomTest(lessonKey, testText) {
    const customTests = await getCustomTests();
    if (!customTests[lessonKey]) {
      customTests[lessonKey] = [];
    }
    const testId = Date.now().toString();
    customTests[lessonKey].push({
      id: testId,
      text: testText,
      completed: false,
      createdAt: new Date().toISOString()
    });
    await saveCustomTests(customTests);
    return testId;
  }

  async function removeCustomTest(lessonKey, testId) {
    const customTests = await getCustomTests();
    if (customTests[lessonKey]) {
      customTests[lessonKey] = customTests[lessonKey].filter(test => test.id !== testId);
      if (customTests[lessonKey].length === 0) {
        delete customTests[lessonKey];
      }
      await saveCustomTests(customTests);
    }
  }

  async function toggleCustomTestCompletion(lessonKey, testId) {
    const customTests = await getCustomTests();
    if (customTests[lessonKey]) {
      const test = customTests[lessonKey].find(t => t.id === testId);
      if (test) {
        test.completed = !test.completed;
        await saveCustomTests(customTests);
        return test.completed;
      }
    }
    return false;
  }

  function getLessonKey(lesson) {
    return `${lesson.subject}_${lesson.startTime}_${lesson.date}`;
  }

  async function updateHomeworkIconsFromCookie() {
    const completedHomework = await getCompletedHomework();
    completedHomework.forEach(lessonId => {
      const lessonCards = document.querySelectorAll(`[data-lesson-id="${lessonId}"]`);
      lessonCards.forEach(card => {
        const homeworkImg = card.querySelector('.homework-indicator img');
        if (homeworkImg) {
          homeworkImg.src = chrome.runtime.getURL('icons/pipa.svg');
          homeworkImg.alt = 'Megoldott házi feladat';
        }
      });
    });
  }

  async function loadHomeworkDetailsFromAPI(lessonId) {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/Orarend/InformaciokOrarend/GetHaziFeladat_Tab?Id=${lessonId}&EventType=2&Date=${new Date().getFullYear()}.%20${String(new Date().getMonth() + 1).padStart(2, '0')}.%20${String(new Date().getDate()).padStart(2, '0')}.%200:00:00&_=${timestamp}`;

      const response = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          Accept: "text/html",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Házi feladat API hiba: ${response.status}`,
        );
      }

      const htmlText = await response.text();
      const template = document.createElement('template');
      template.innerHTML = htmlText;
      const doc = template.content;
      const panelBody = doc.querySelector('.panel-body');
      const panelFooter = doc.querySelector('.panel-footer');
      const teacherInfo = doc.querySelector('.panel-heading');

      const attachments = [];
      const attachmentButtons = doc.querySelectorAll('button[id^="csatolmany"]');
      attachmentButtons.forEach(button => {
        const attachmentId = button.id.replace('csatolmany', '');
        const fileName = button.textContent.trim();
        if (attachmentId && fileName) {
          attachments.push({
            id: attachmentId,
            fileName: fileName
          });
        }
      });
      
      if (panelBody) {
        const homeworkText = panelBody.textContent.trim();
        const deadline = panelFooter ? panelFooter.textContent.replace('Határidő: ', '').trim() : '';
        const teacher = teacherInfo ? teacherInfo.textContent.split(' ').slice(-2).join(' ').trim() : '';
        
        return {
          content: homeworkText,
          deadline: deadline,
          teacher: teacher,
          attachments: attachments
        };
      }
      
      return null;
    } catch (error) {
      console.error("Házi feladat részletek betöltési hiba:", error);
      return null;
    }
  }

  function downloadAttachment(attachmentId) {
    try {
      const downloadUrl = `https://${window.location.hostname}/api/HaziFeladatCsatolmanyokApi/DownloadCsatolmanyFile`;
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = downloadUrl;
      form.style.display = 'none';
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'id';
      input.value = attachmentId;
      
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (error) {
      console.error('Hiba a csatolmány letöltésekor:', error);
    }
  }

  async function loadTestDetailsFromAPI(testId) {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/api/TanuloBejelentettSzamonkeresekApi/GetBejelentettSzamonkeresekGrid?sort=SzamonkeresDatuma-asc~Oraszam-asc&page=1&pageSize=1000&group=&filter=&data=%7B%22RegiSzamonkeresekElrejtese%22%3Afalse%7D&_=${timestamp}`;

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
      const apiUrl = `https://${window.location.hostname}/api/TanuloBejelentettSzamonkeresekApi/GetBejelentettSzamonkeresekGrid?sort=SzamonkeresDatuma-asc~Oraszam-asc&page=1&pageSize=1000&group=&filter=&data=%7B%22RegiSzamonkeresekElrejtese%22%3Afalse%7D&_=${timestamp}`;

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
            date: weekDates[dayIndex]?.fullDate || eventDate.toISOString().split('T')[0],
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
          event.oraType === 4 ||
          event.oraType === 6
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
            const isCancelled = event.isElmaradt || event.Elmaradt || event.cancelled || event.isCancelled ||
                               event.oraType === 6 || (event.title && event.title.toLowerCase().includes('elmarad'));

            const lesson = {
              startTime: startTimeStr,
              endTime: endTimeStr,
              subject: subject,
              teacher: teacher,
              originalTeacher: event.helyettesitoId ? teacher : "",
              room: room,
              day: dayIndex,
              date: weekDates[dayIndex]?.fullDate || eventDate.toISOString().split('T')[0],
              isSubstituted: !!event.helyettesitoId,
              isCancelled: isCancelled,
              hasHomework: event.hasHaziFeladat || false,
              testInfo: event.hasBejelentettSzamonkeres
                ? event.Tema || LanguageManager.t("timetable.test_indicator")
                : "",
              testId: event.hasBejelentettSzamonkeres && event.BejelentettSzamonkeresIdList && event.BejelentettSzamonkeresIdList.length > 0
                ? event.BejelentettSzamonkeresIdList[0]
                : null,
              testDetails: "",
              homeworkDetails: "",
              lessonId: event.id || event.ID || null,
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

  async function generateTimeGrid(lessons, weekDates) {
    const specialDayLessons = lessons.filter((l) => l.isSpecialDay);
    const regularLessons = lessons.filter((l) => !l.isSpecialDay);
    const customHomework = await getCustomHomework();
    const customTests = await getCustomTests();

    const homeworkCompletionMap = {};
    for (const lesson of lessons) {
      if (lesson.lessonId) {
        homeworkCompletionMap[lesson.lessonId] = await isHomeworkCompleted(lesson.lessonId);
      }
    }

    const times = [...new Set(regularLessons.map((l) => l.startTime))].sort(
      (a, b) => {
        const timeA = helper.convertTimeToMinutes(a);
        const timeB = helper.convertTimeToMinutes(b);
        return timeA - timeB;
      },
    );

    const timeDurations = {};
    times.forEach(time => {
      const lessonsAtTime = regularLessons.filter(l => l.startTime === time);
      let maxDuration = 45;

      lessonsAtTime.forEach(lesson => {
        if (lesson.endTime) {
          const startMinutes = helper.convertTimeToMinutes(lesson.startTime);
          const endMinutes = helper.convertTimeToMinutes(lesson.endTime);
          const duration = endMinutes - startMinutes;
          if (duration > maxDuration) {
            maxDuration = duration;
          }
        }
      });

      timeDurations[time] = maxDuration;
    });

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
            
            const duration = timeDurations[time] || 45;
            const slotHeight = Math.max(84, (duration / 45) * 100);

            return `
        <div class="time-slot" style="min-height: ${slotHeight}px;">${time}</div>
        ${Array(5)
          .fill()
          .map((_, dayIndex) => {
            const dayLessons = regularLessons.filter(
              (l) => l.startTime === time && l.day === dayIndex,
            );

            const lastLessonTime = lastLessonTimes[dayIndex];
            const isAfterLastLesson = lastLessonTime && helper.convertTimeToMinutes(time) > helper.convertTimeToMinutes(lastLessonTime);

            if (dayLessons.length === 0 && isAfterLastLesson) {
              return `<div class="lesson-slot" style="min-height: ${slotHeight}px;"></div>`;
            }

              return `
            <div class="lesson-slot ${dayLessons.length === 0 ? 'empty-slot' : ''}" style="min-height: ${slotHeight}px;">
              ${dayLessons.length === 0 ? '<div class="empty-lesson-placeholder"></div>' : ''}
              ${dayLessons
                      .map(
                        (lesson) => `
                <div class="lesson-card ${lesson.isSubstituted ? "substituted" : ""} 
                                      ${lesson.isCancelled ? "cancelled" : ""}
                                      ${lesson.hasHomework ? "has-homework" : ""}"
                     data-lesson='${JSON.stringify(lesson)}'
                     data-lesson-id='${lesson.lessonId || ""}'>
                  <div class="lesson-subject">${lesson.subject}</div>
                  <div class="lesson-teacher">${lesson.teacher}</div>
                  <div class="lesson-bottom">
                    <div class="lesson-room">${lesson.room}</div>
                    <div class="lesson-time">${lesson.isCancelled ? LanguageManager.t("timetable.cancelled") : lesson.startTime}</div>
                  </div>
                  ${
                    (() => {
                      const lessonKey = `${lesson.subject}_${lesson.startTime}_${lesson.date}`;
                      const customHomeworkItems = customHomework[lessonKey] || [];
                      const customTestItems = customTests[lessonKey] || [];
                      const hasCustomHomework = customHomeworkItems.length > 0;
                      const hasCustomTests = customTestItems.length > 0;
                      const allCustomHomeworkCompleted = hasCustomHomework && customHomeworkItems.every(hw => hw.completed);
                      const allCustomTestsCompleted = hasCustomTests && customTestItems.every(test => test.completed);
                      const hasAnyIndicators = lesson.hasHomework || lesson.testInfo || hasCustomHomework || hasCustomTests;

                      return hasAnyIndicators ? `
                    <div class="lesson-indicators">
                      ${
                        lesson.hasHomework
                          ? `
                        <span class="lesson-indicator homework-indicator" title="${LanguageManager.t("timetable.homework_indicator")}">
                          <img src="${chrome.runtime.getURL(lesson.lessonId && homeworkCompletionMap[lesson.lessonId] ? "icons/pipa.svg" : "icons/homework.svg")}" alt="${lesson.lessonId && homeworkCompletionMap[lesson.lessonId] ? 'Megoldott házi feladat' : 'Házi feladat'}" style="width: 20px; height: 20px;">
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
                      ${
                        hasCustomHomework
                          ? `
                        <span class="lesson-indicator custom-homework-indicator" title="Saját házi feladat">
                          <img src="${chrome.runtime.getURL(allCustomHomeworkCompleted ? "icons/pipa.svg" : "icons/homework.svg")}" alt="${allCustomHomeworkCompleted ? 'Megoldott saját házi feladat' : 'Saját házi feladat'}" style="width: 20px; height: 20px; opacity: 0.7;">
                        </span>
                      `
                          : ""
                      }
                      ${
                        hasCustomTests
                          ? `
                        <span class="lesson-indicator custom-test-indicator" title="Saját számonkérés">
                          <img src="${chrome.runtime.getURL(allCustomTestsCompleted ? "icons/pipa.svg" : "icons/assigment.svg")}" alt="${allCustomTestsCompleted ? 'Megoldott saját számonkérés' : 'Saját számonkérés'}" style="width: 20px; height: 20px; opacity: 0.7;">
                        </span>
                      `
                          : ""
                      }
                    </div>
                  ` : "";
                    })()
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
    
    const headerButtons = document.createElement('div');
    headerButtons.className = 'modal-header-buttons';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'modal-add-btn';
    addBtn.title = 'Házi feladat vagy számonkérés hozzáadása';
    
    const addIcon = document.createElement('img');
    addIcon.src = chrome.runtime.getURL('icons/plus.svg');
    addIcon.alt = 'Hozzáadás';
    addIcon.style.width = '24px';
    addIcon.style.height = '24px';
    addBtn.appendChild(addIcon);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    
    const closeIcon = document.createElement('img');
    closeIcon.src = chrome.runtime.getURL('icons/CloseCircle.svg');
    closeIcon.alt = 'Bezárás';
    closeIcon.style.width = '24px';
    closeIcon.style.height = '24px';
    closeBtn.appendChild(closeIcon);
    
    addBtn.addEventListener('click', () => {
      showAddItemModal(lesson);
    });
    
    headerButtons.appendChild(addBtn);
    headerButtons.appendChild(closeBtn);
    
    header.appendChild(title);
    header.appendChild(headerButtons);
    
    const body = document.createElement('div');
    body.className = 'modal-body';

    const lessonDetails = document.createElement('div');
    lessonDetails.className = 'lesson-details';

    if (!lesson.isSubstituted) {
      const teacherItem = document.createElement('div');
      teacherItem.className = 'detail-item';
      const teacherLabel = document.createElement('span');
      teacherLabel.className = 'detail-label';
      teacherLabel.textContent = LanguageManager.t('timetable.teacher_label');
      const teacherValue = document.createElement('span');
      teacherValue.className = 'detail-value';
      teacherValue.textContent = lesson.teacher;
      teacherItem.appendChild(teacherLabel);
      teacherItem.appendChild(teacherValue);
      lessonDetails.appendChild(teacherItem);
    }
    
    if (lesson.isSubstituted) {
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
      
      const homeworkHeader = document.createElement('div');
      homeworkHeader.className = 'homework-header';
      
      const homeworkH4 = document.createElement('h4');
      const homeworkIcon = document.createElement('img');
      homeworkIcon.src = chrome.runtime.getURL('icons/homework.svg');
      homeworkIcon.alt = 'Házi feladat';
      homeworkIcon.style.width = '20px';
      homeworkIcon.style.height = '20px';
      homeworkH4.appendChild(homeworkIcon);
      homeworkH4.appendChild(document.createTextNode(LanguageManager.t('timetable.homework_indicator')));
      
      homeworkHeader.appendChild(homeworkH4);
      
      if (lesson.lessonId) {
        const completionBtn = document.createElement('button');
        completionBtn.className = 'homework-completion-header-btn';
        
        const isCompleted = await isHomeworkCompleted(lesson.lessonId);
        const checkIcon = document.createElement('img');
        checkIcon.src = chrome.runtime.getURL('icons/pipa.svg');
        checkIcon.alt = 'Megoldva';
        checkIcon.style.width = '16px';
        checkIcon.style.height = '16px';
        
        completionBtn.appendChild(checkIcon);
        completionBtn.classList.toggle('completed', isCompleted);
        completionBtn.title = isCompleted ? 'Megoldva - kattints a visszavonáshoz' : 'Megoldottként jelöl';
        
        completionBtn.addEventListener('click', async () => {
          const nowCompleted = await toggleHomeworkCompletion(lesson.lessonId);
          completionBtn.classList.toggle('completed', nowCompleted);
          completionBtn.title = nowCompleted ? 'Megoldva - kattints a visszavonáshoz' : 'Megoldottként jelöl';
          const lessonCards = document.querySelectorAll(`[data-lesson-id="${lesson.lessonId}"]`);
          lessonCards.forEach(card => {
            const homeworkImg = card.querySelector('.homework-indicator img');
            if (homeworkImg) {
              homeworkImg.src = chrome.runtime.getURL(nowCompleted ? 'icons/pipa.svg' : 'icons/homework.svg');
              homeworkImg.alt = nowCompleted ? 'Megoldott házi feladat' : 'Házi feladat';
            }
          });
        });
        
        homeworkHeader.appendChild(completionBtn);
      }
      
      const homeworkContent = document.createElement('div');
      homeworkContent.className = 'homework-content';

      if (lesson.lessonId) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'homework-details-loading';
        loadingDiv.textContent = 'Házi feladat részletek betöltése...';
        homeworkContent.appendChild(loadingDiv);

        loadHomeworkDetailsFromAPI(lesson.lessonId).then(homeworkDetails => {
          loadingDiv.remove();
          
          if (homeworkDetails && homeworkDetails.content) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'homework-details';
            
            const contentP = document.createElement('p');
            const contentStrong = document.createElement('strong');
            contentStrong.textContent = 'Feladat: ';
            contentP.appendChild(contentStrong);
            contentP.appendChild(document.createTextNode(homeworkDetails.content));
            detailsDiv.appendChild(contentP);
            
            if (homeworkDetails.deadline) {
              const deadlineP = document.createElement('p');
              const deadlineStrong = document.createElement('strong');
              deadlineStrong.textContent = 'Határidő: ';
              deadlineP.appendChild(deadlineStrong);
              deadlineP.appendChild(document.createTextNode(homeworkDetails.deadline));
              detailsDiv.appendChild(deadlineP);
            }
            
            if (homeworkDetails.teacher) {
              const teacherP = document.createElement('p');
              const teacherStrong = document.createElement('strong');
              teacherStrong.textContent = 'Tanár: ';
              teacherP.appendChild(teacherStrong);
              teacherP.appendChild(document.createTextNode(homeworkDetails.teacher));
              detailsDiv.appendChild(teacherP);
            }

            if (homeworkDetails.attachments && homeworkDetails.attachments.length > 0) {
              const attachmentsDiv = document.createElement('div');
              attachmentsDiv.className = 'homework-attachments';
              attachmentsDiv.style.marginTop = '1rem';
              
              const attachmentsTitle = document.createElement('p');
              const attachStrong = document.createElement('strong');
              attachStrong.textContent = 'Csatolmányok:';
              attachmentsTitle.appendChild(attachStrong);
              attachmentsTitle.style.marginBottom = '0.5rem';
              attachmentsDiv.appendChild(attachmentsTitle);
              
              const attachmentsList = document.createElement('div');
              attachmentsList.className = 'attachments-list';
              
              homeworkDetails.attachments.forEach(attachment => {
                const attachmentItem = document.createElement('div');
                attachmentItem.className = 'attachment-item';
                attachmentItem.style.display = 'flex';
                attachmentItem.style.alignItems = 'center';
                attachmentItem.style.justifyContent = 'center';
                attachmentItem.style.marginBottom = '0.5rem';
                attachmentItem.style.padding = '0.75rem';
                attachmentItem.style.backgroundColor = 'var(--accent-15)';
                attachmentItem.style.borderRadius = '6px';
                attachmentItem.style.border = '1px solid var(--background-0)';
                attachmentItem.style.cursor = 'pointer';
                attachmentItem.style.transition = 'all 0.2s ease';
                attachmentItem.title = 'Kattints a letöltéshez';
                
                const fileName = document.createElement('span');
                fileName.textContent = attachment.fileName;
                fileName.style.color = 'var(--text-primary)';
                fileName.style.fontSize = '14px';
                fileName.style.fontWeight = '500';
                
                attachmentItem.appendChild(fileName);
                
                attachmentItem.addEventListener('click', () => {
                  downloadAttachment(attachment.id);
                });
                
                attachmentItem.addEventListener('mouseenter', () => {
                  attachmentItem.style.backgroundColor = 'var(--background-0)';
                  attachmentItem.style.transform = 'translateY(-1px)';
                  attachmentItem.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                });
                
                attachmentItem.addEventListener('mouseleave', () => {
                  attachmentItem.style.backgroundColor = 'var(--accent-15)';
                  attachmentItem.style.transform = 'translateY(0)';
                  attachmentItem.style.boxShadow = 'none';
                });
                
                attachmentsList.appendChild(attachmentItem);
              });
              
              attachmentsDiv.appendChild(attachmentsList);
              detailsDiv.appendChild(attachmentsDiv);
            }
            
            homeworkContent.appendChild(detailsDiv);
          } else {
            const noDetailsP = document.createElement('p');
            noDetailsP.textContent = LanguageManager.t('timetable.has_homework');
            homeworkContent.appendChild(noDetailsP);
          }
          
          
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
        }).catch(error => {
          loadingDiv.remove();
          console.error('Hiba a házi feladat betöltésekor:', error);
          
          const errorP = document.createElement('p');
          errorP.textContent = 'Hiba történt a házi feladat részletek betöltésekor.';
          homeworkContent.appendChild(errorP);
          
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
        });
      } else {
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
      }
      
      
      const lessonKey = getLessonKey(lesson);
      const customHomework = await getCustomHomework();
      const customHomeworkItems = customHomework[lessonKey] || [];
      
      if (customHomeworkItems.length > 0) {
        const customHomeworkDiv = document.createElement('div');
        customHomeworkDiv.className = 'custom-homework-in-section';
        customHomeworkDiv.style.marginTop = '1rem';
        customHomeworkDiv.style.paddingTop = '1rem';
        customHomeworkDiv.style.borderTop = '1px solid var(--background-0)';
        
        const customHomeworkTitle = document.createElement('h5');
        customHomeworkTitle.textContent = 'Saját házi feladatok:';
        customHomeworkTitle.style.fontSize = '14px';
        customHomeworkTitle.style.fontWeight = '600';
        customHomeworkTitle.style.color = 'var(--accent-accent)';
        customHomeworkTitle.style.marginBottom = '0.5rem';
        customHomeworkDiv.appendChild(customHomeworkTitle);
        
        const customHomeworkList = document.createElement('div');
        customHomeworkList.className = 'custom-homework-list-integrated';
        
        customHomeworkItems.forEach(homework => {
          const homeworkItem = document.createElement('div');
          homeworkItem.className = `custom-homework-item-integrated ${homework.completed ? 'completed' : ''}`;
          homeworkItem.style.display = 'flex';
          homeworkItem.style.alignItems = 'center';
          homeworkItem.style.justifyContent = 'space-between';
          homeworkItem.style.padding = '0.5rem';
          homeworkItem.style.marginBottom = '0.5rem';
          homeworkItem.style.background = 'var(--background)';
          homeworkItem.style.borderRadius = '6px';
          homeworkItem.style.border = '1px solid var(--background-0)';
          
          const homeworkText = document.createElement('span');
          homeworkText.className = 'homework-text-integrated';
          homeworkText.textContent = homework.text;
          homeworkText.style.flex = '1';
          homeworkText.style.color = 'var(--text-primary)';
          if (homework.completed) {
            homeworkText.style.textDecoration = 'line-through';
            homeworkText.style.opacity = '0.6';
          }
          
          const homeworkActions = document.createElement('div');
          homeworkActions.className = 'homework-actions-integrated';
          homeworkActions.style.display = 'flex';
          homeworkActions.style.gap = '0.5rem';
          
          const completeBtn = document.createElement('button');
          completeBtn.className = 'homework-complete-btn-integrated';
          completeBtn.title = homework.completed ? 'Megoldva - kattints a visszavonáshoz' : 'Megoldottként jelöl';
          completeBtn.style.background = 'none';
          completeBtn.style.border = 'none';
          completeBtn.style.cursor = 'pointer';
          completeBtn.style.padding = '4px';
          completeBtn.style.borderRadius = '4px';
          completeBtn.style.display = 'flex';
          completeBtn.style.alignItems = 'center';
          completeBtn.style.justifyContent = 'center';
          
          const completeIcon = document.createElement('img');
          completeIcon.src = chrome.runtime.getURL('icons/pipa.svg');
          completeIcon.alt = 'Megoldva';
          completeIcon.style.width = '16px';
          completeIcon.style.height = '16px';
          if (homework.completed) {
            completeIcon.style.opacity = '1';
            completeBtn.style.background = 'var(--accent-accent)';
          } else {
            completeIcon.style.opacity = '0.5';
          }
          completeBtn.appendChild(completeIcon);
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'homework-delete-btn-integrated';
          deleteBtn.title = 'Törlés';
          deleteBtn.style.background = 'none';
          deleteBtn.style.border = 'none';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.style.padding = '4px';
          deleteBtn.style.borderRadius = '4px';
          deleteBtn.style.display = 'flex';
          deleteBtn.style.alignItems = 'center';
          deleteBtn.style.justifyContent = 'center';
          
          const deleteIcon = document.createElement('img');
          deleteIcon.src = chrome.runtime.getURL('icons/delete.svg');
          deleteIcon.alt = 'Törlés';
          deleteIcon.style.width = '16px';
          deleteIcon.style.height = '16px';
          deleteIcon.style.opacity = '0.5';
          deleteBtn.appendChild(deleteIcon);
          
          completeBtn.addEventListener('click', async () => {
            const newCompleted = await toggleCustomHomeworkCompletion(lessonKey, homework.id);
            if (newCompleted) {
              homeworkText.style.textDecoration = 'line-through';
              homeworkText.style.opacity = '0.6';
              completeIcon.style.opacity = '1';
              completeBtn.style.background = 'var(--accent-accent)';
              completeBtn.title = 'Megoldva - kattints a visszavonáshoz';
            } else {
              homeworkText.style.textDecoration = 'none';
              homeworkText.style.opacity = '1';
              completeIcon.style.opacity = '0.5';
              completeBtn.style.background = 'none';
              completeBtn.title = 'Megoldottként jelöl';
            }
          });
          
          deleteBtn.addEventListener('click', async () => {
            if (confirm('Biztosan törölni szeretnéd ezt a házi feladatot?')) {
              await removeCustomHomework(lessonKey, homework.id);
              homeworkItem.remove();
            }
          });
          
          homeworkActions.appendChild(completeBtn);
          homeworkActions.appendChild(deleteBtn);
          homeworkItem.appendChild(homeworkText);
          homeworkItem.appendChild(homeworkActions);
          customHomeworkList.appendChild(homeworkItem);
        });
        
        customHomeworkDiv.appendChild(customHomeworkList);
        homeworkContent.appendChild(customHomeworkDiv);
      }
      
      homeworkSection.appendChild(homeworkHeader);
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
            const nameStrong = document.createElement('strong');
            nameStrong.textContent = 'Megnevezés: ';
            nameP.appendChild(nameStrong);
            nameP.appendChild(document.createTextNode(testDetails.name));
            detailsDiv.appendChild(nameP);
            
            const typeP = document.createElement('p');
            const typeStrong = document.createElement('strong');
            typeStrong.textContent = 'Típus: ';
            typeP.appendChild(typeStrong);
            typeP.appendChild(document.createTextNode(testDetails.type));
            detailsDiv.appendChild(typeP);
            
            const dateP = document.createElement('p');
            const dateStrong = document.createElement('strong');
            dateStrong.textContent = 'Bejelentés dátuma: ';
            dateP.appendChild(dateStrong);
            dateP.appendChild(document.createTextNode(testDetails.announceDate));
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
      
      
      const lessonKey = getLessonKey(lesson);
      const customTests = await getCustomTests();
      const customTestItems = customTests[lessonKey] || [];
      
      if (customTestItems.length > 0) {
        const customTestsDiv = document.createElement('div');
        customTestsDiv.className = 'custom-tests-in-section';
        customTestsDiv.style.marginTop = '1rem';
        customTestsDiv.style.paddingTop = '1rem';
        customTestsDiv.style.borderTop = '1px solid var(--background-0)';
        
        const customTestsTitle = document.createElement('h5');
        customTestsTitle.textContent = 'Saját számonkérések:';
        customTestsTitle.style.fontSize = '14px';
        customTestsTitle.style.fontWeight = '600';
        customTestsTitle.style.color = 'var(--warning-accent)';
        customTestsTitle.style.marginBottom = '0.5rem';
        customTestsDiv.appendChild(customTestsTitle);
        
        const customTestsList = document.createElement('div');
        customTestsList.className = 'custom-tests-list-integrated';
        
        customTestItems.forEach(test => {
          const testItem = document.createElement('div');
          testItem.className = `custom-test-item-integrated ${test.completed ? 'completed' : ''}`;
          testItem.style.display = 'flex';
          testItem.style.alignItems = 'center';
          testItem.style.justifyContent = 'space-between';
          testItem.style.padding = '0.5rem';
          testItem.style.marginBottom = '0.5rem';
          testItem.style.background = 'var(--background)';
          testItem.style.borderRadius = '6px';
          testItem.style.border = '1px solid var(--background-0)';
          
          const testText = document.createElement('span');
          testText.className = 'test-text-integrated';
          testText.textContent = test.text;
          testText.style.flex = '1';
          testText.style.color = 'var(--text-primary)';
          if (test.completed) {
            testText.style.textDecoration = 'line-through';
            testText.style.opacity = '0.6';
          }
          
          const testActions = document.createElement('div');
          testActions.className = 'test-actions-integrated';
          testActions.style.display = 'flex';
          testActions.style.gap = '0.5rem';
          
          const completeBtn = document.createElement('button');
          completeBtn.className = 'test-complete-btn-integrated';
          completeBtn.title = test.completed ? 'Megoldva - kattints a visszavonáshoz' : 'Megoldottként jelöl';
          completeBtn.style.background = 'none';
          completeBtn.style.border = 'none';
          completeBtn.style.cursor = 'pointer';
          completeBtn.style.padding = '4px';
          completeBtn.style.borderRadius = '4px';
          completeBtn.style.display = 'flex';
          completeBtn.style.alignItems = 'center';
          completeBtn.style.justifyContent = 'center';
          
          const completeIcon = document.createElement('img');
          completeIcon.src = chrome.runtime.getURL('icons/pipa.svg');
          completeIcon.alt = 'Megoldva';
          completeIcon.style.width = '16px';
          completeIcon.style.height = '16px';
          if (test.completed) {
            completeIcon.style.opacity = '1';
            completeBtn.style.background = 'var(--warning-accent)';
          } else {
            completeIcon.style.opacity = '0.5';
          }
          completeBtn.appendChild(completeIcon);
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'test-delete-btn-integrated';
          deleteBtn.title = 'Törlés';
          deleteBtn.style.background = 'none';
          deleteBtn.style.border = 'none';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.style.padding = '4px';
          deleteBtn.style.borderRadius = '4px';
          deleteBtn.style.display = 'flex';
          deleteBtn.style.alignItems = 'center';
          deleteBtn.style.justifyContent = 'center';
          
          const deleteIcon = document.createElement('img');
          deleteIcon.src = chrome.runtime.getURL('icons/delete.svg');
          deleteIcon.alt = 'Törlés';
          deleteIcon.style.width = '16px';
          deleteIcon.style.height = '16px';
          deleteIcon.style.opacity = '0.5';
          deleteBtn.appendChild(deleteIcon);
          
          completeBtn.addEventListener('click', async () => {
            const newCompleted = await toggleCustomTestCompletion(lessonKey, test.id);
            if (newCompleted) {
              testText.style.textDecoration = 'line-through';
              testText.style.opacity = '0.6';
              completeIcon.style.opacity = '1';
              completeBtn.style.background = 'var(--warning-accent)';
              completeBtn.title = 'Megoldva - kattints a visszavonáshoz';
            } else {
              testText.style.textDecoration = 'none';
              testText.style.opacity = '1';
              completeIcon.style.opacity = '0.5';
              completeBtn.style.background = 'none';
              completeBtn.title = 'Megoldottként jelöl';
            }
          });
          
          deleteBtn.addEventListener('click', async () => {
            if (confirm('Biztosan törölni szeretnéd ezt a számonkérést?')) {
              await removeCustomTest(lessonKey, test.id);
              testItem.remove();
            }
          });
          
          testActions.appendChild(completeBtn);
          testActions.appendChild(deleteBtn);
          testItem.appendChild(testText);
          testItem.appendChild(testActions);
          customTestsList.appendChild(testItem);
        });
        
        customTestsDiv.appendChild(customTestsList);
        testContent.appendChild(customTestsDiv);
      }
      
      testSection.appendChild(testH4);
      testSection.appendChild(testContent);
      body.appendChild(testSection);
    }
    

    const lessonKey = getLessonKey(lesson);
    const customHomework = await getCustomHomework();
    const customHomeworkItems = customHomework[lessonKey] || [];
    
    if (!lesson.hasHomework && customHomeworkItems.length > 0) {
      const customHomeworkSection = document.createElement('div');
      customHomeworkSection.className = 'modal-section homework-section';
      
      const customHomeworkH4 = document.createElement('h4');
      const customHomeworkIcon = document.createElement('img');
      customHomeworkIcon.src = chrome.runtime.getURL('icons/homework.svg');
      customHomeworkIcon.alt = 'Saját házi feladat';
      customHomeworkIcon.style.width = '20px';
      customHomeworkIcon.style.height = '20px';
      customHomeworkH4.appendChild(customHomeworkIcon);
      customHomeworkH4.appendChild(document.createTextNode('Saját házi feladatok'));
      
      const customHomeworkContent = document.createElement('div');
      customHomeworkContent.className = 'homework-content';
      
      const customHomeworkList = document.createElement('div');
      customHomeworkList.className = 'custom-homework-list-integrated';
      
      customHomeworkItems.forEach(homework => {
        const homeworkItem = document.createElement('div');
        homeworkItem.className = `custom-homework-item-integrated ${homework.completed ? 'completed' : ''}`;
        homeworkItem.style.display = 'flex';
        homeworkItem.style.alignItems = 'center';
        homeworkItem.style.justifyContent = 'space-between';
        
        const homeworkText = document.createElement('span');
        homeworkText.className = 'homework-text-integrated';
        homeworkText.textContent = homework.text;
        homeworkText.style.flex = '1';
        homeworkText.style.color = 'var(--text-primary)';
        if (homework.completed) {
          homeworkText.style.textDecoration = 'line-through';
          homeworkText.style.opacity = '0.6';
        }
        
        const homeworkActions = document.createElement('div');
        homeworkActions.className = 'homework-actions-integrated';
        homeworkActions.style.display = 'flex';
        homeworkActions.style.gap = '0.5rem';
        
        const completeBtn = document.createElement('button');
        completeBtn.className = 'homework-complete-btn-integrated';
        completeBtn.title = homework.completed ? 'Megoldva - kattints a visszavonáshoz' : 'Megoldottként jelöl';
        completeBtn.style.background = 'none';
        completeBtn.style.border = 'none';
        completeBtn.style.cursor = 'pointer';
        completeBtn.style.padding = '4px';
        completeBtn.style.borderRadius = '4px';
        completeBtn.style.display = 'flex';
        completeBtn.style.alignItems = 'center';
        completeBtn.style.justifyContent = 'center';
        
        const completeIcon = document.createElement('img');
        completeIcon.src = chrome.runtime.getURL('icons/pipa.svg');
        completeIcon.alt = 'Megoldva';
        completeIcon.style.width = '16px';
        completeIcon.style.height = '16px';
        if (homework.completed) {
          completeIcon.style.opacity = '1';
          completeBtn.style.background = 'var(--accent-accent)';
        } else {
          completeIcon.style.opacity = '0.5';
        }
        completeBtn.appendChild(completeIcon);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'homework-delete-btn-integrated';
        deleteBtn.title = 'Törlés';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.padding = '4px';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        
        const deleteIcon = document.createElement('img');
        deleteIcon.src = chrome.runtime.getURL('icons/delete.svg');
        deleteIcon.alt = 'Törlés';
        deleteIcon.style.width = '16px';
        deleteIcon.style.height = '16px';
        deleteIcon.style.opacity = '0.5';
        deleteBtn.appendChild(deleteIcon);
        
        completeBtn.addEventListener('click', async () => {
          const newCompleted = await toggleCustomHomeworkCompletion(lessonKey, homework.id);
          if (newCompleted) {
            homeworkText.style.textDecoration = 'line-through';
            homeworkText.style.opacity = '0.6';
            completeIcon.style.opacity = '1';
            completeBtn.style.background = 'var(--accent-accent)';
            completeBtn.title = 'Megoldva - kattints a visszavonáshoz';
          } else {
            homeworkText.style.textDecoration = 'none';
            homeworkText.style.opacity = '1';
            completeIcon.style.opacity = '0.5';
            completeBtn.style.background = 'none';
            completeBtn.title = 'Megoldottként jelöl';
          }
        });
        
        deleteBtn.addEventListener('click', async () => {
          if (confirm('Biztosan törölni szeretnéd ezt a házi feladatot?')) {
            await removeCustomHomework(lessonKey, homework.id);
            homeworkItem.remove();
          }
        });
        
        homeworkActions.appendChild(completeBtn);
        homeworkActions.appendChild(deleteBtn);
        homeworkItem.appendChild(homeworkText);
        homeworkItem.appendChild(homeworkActions);
        customHomeworkList.appendChild(homeworkItem);
      });
      
      customHomeworkContent.appendChild(customHomeworkList);
      customHomeworkSection.appendChild(customHomeworkH4);
      customHomeworkSection.appendChild(customHomeworkContent);
      body.appendChild(customHomeworkSection);
    }
    
    const customTests = await getCustomTests();
    const customTestItems = customTests[lessonKey] || [];
    
    if (!lesson.testInfo && customTestItems.length > 0) {
      const customTestSection = document.createElement('div');
      customTestSection.className = 'modal-section test-section';
      
      const customTestH4 = document.createElement('h4');
      const customTestIcon = document.createElement('img');
      customTestIcon.src = chrome.runtime.getURL('icons/assigment.svg');
      customTestIcon.alt = 'Saját számonkérés';
      customTestIcon.style.width = '20px';
      customTestIcon.style.height = '20px';
      customTestH4.appendChild(customTestIcon);
      customTestH4.appendChild(document.createTextNode('Saját számonkérések'));
      
      const customTestContent = document.createElement('div');
      customTestContent.className = 'test-content';
      
      const customTestsList = document.createElement('div');
      customTestsList.className = 'custom-tests-list-integrated';
      
      customTestItems.forEach(test => {
        const testItem = document.createElement('div');
        testItem.className = `custom-test-item-integrated ${test.completed ? 'completed' : ''}`;
        testItem.style.display = 'flex';
        testItem.style.alignItems = 'center';
        testItem.style.justifyContent = 'space-between';
        
        const testText = document.createElement('span');
        testText.className = 'test-text-integrated';
        testText.textContent = test.text;
        testText.style.flex = '1';
        testText.style.color = 'var(--text-primary)';
        if (test.completed) {
          testText.style.textDecoration = 'line-through';
          testText.style.opacity = '0.6';
        }
        
        const testActions = document.createElement('div');
        testActions.className = 'test-actions-integrated';
        testActions.style.display = 'flex';
        testActions.style.gap = '0.5rem';
        
        const completeBtn = document.createElement('button');
        completeBtn.className = 'test-complete-btn-integrated';
        completeBtn.title = test.completed ? 'Megoldva - kattints a visszavonáshoz' : 'Megoldottként jelöl';
        completeBtn.style.background = 'none';
        completeBtn.style.border = 'none';
        completeBtn.style.cursor = 'pointer';
        completeBtn.style.padding = '4px';
        completeBtn.style.borderRadius = '4px';
        completeBtn.style.display = 'flex';
        completeBtn.style.alignItems = 'center';
        completeBtn.style.justifyContent = 'center';
        
        const completeIcon = document.createElement('img');
        completeIcon.src = chrome.runtime.getURL('icons/pipa.svg');
        completeIcon.alt = 'Megoldva';
        completeIcon.style.width = '16px';
        completeIcon.style.height = '16px';
        if (test.completed) {
          completeIcon.style.opacity = '1';
          completeBtn.style.background = 'var(--warning-accent)';
        } else {
          completeIcon.style.opacity = '0.5';
        }
        completeBtn.appendChild(completeIcon);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'test-delete-btn-integrated';
        deleteBtn.title = 'Törlés';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.padding = '4px';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        
        const deleteIcon = document.createElement('img');
        deleteIcon.src = chrome.runtime.getURL('icons/delete.svg');
        deleteIcon.alt = 'Törlés';
        deleteIcon.style.width = '16px';
        deleteIcon.style.height = '16px';
        deleteIcon.style.opacity = '0.5';
        deleteBtn.appendChild(deleteIcon);
        
        completeBtn.addEventListener('click', async () => {
          const newCompleted = await toggleCustomTestCompletion(lessonKey, test.id);
          if (newCompleted) {
            testText.style.textDecoration = 'line-through';
            testText.style.opacity = '0.6';
            completeIcon.style.opacity = '1';
            completeBtn.style.background = 'var(--warning-accent)';
            completeBtn.title = 'Megoldva - kattints a visszavonáshoz';
          } else {
            testText.style.textDecoration = 'none';
            testText.style.opacity = '1';
            completeIcon.style.opacity = '0.5';
            completeBtn.style.background = 'none';
            completeBtn.title = 'Megoldottként jelöl';
          }
        });
        
        deleteBtn.addEventListener('click', async () => {
          if (confirm('Biztosan törölni szeretnéd ezt a számonkérést?')) {
            await removeCustomTest(lessonKey, test.id);
            testItem.remove();
          }
        });
        
        testActions.appendChild(completeBtn);
        testActions.appendChild(deleteBtn);
        testItem.appendChild(testText);
        testItem.appendChild(testActions);
        customTestsList.appendChild(testItem);
      });
      
      customTestContent.appendChild(customTestsList);
      customTestSection.appendChild(customTestH4);
      customTestSection.appendChild(customTestContent);
      body.appendChild(customTestSection);
    }
    
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    
    helper.clearElement(modal);
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
    
        const newContent = await generateTimeGrid(allLessons, weekDates);
        helper.clearElement(timetableGrid);
    
        const template = document.createElement('template');
        template.innerHTML = `<div>${newContent}</div>`;
        const tempDiv = template.content.querySelector('div');
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

  function showAddItemModal(lesson) {
    const addModal = document.createElement('div');
    addModal.className = 'add-item-modal';
    
    const addModalContent = document.createElement('div');
    addModalContent.className = 'add-modal-content';
    
    const addModalHeader = document.createElement('div');
    addModalHeader.className = 'add-modal-header';
    
    const addModalTitle = document.createElement('h3');
    addModalTitle.textContent = 'Új elem hozzáadása';
    
    const addModalClose = document.createElement('button');
    addModalClose.className = 'add-modal-close';
    
    const addModalCloseIcon = document.createElement('img');
    addModalCloseIcon.src = chrome.runtime.getURL('icons/CloseCircle.svg');
    addModalCloseIcon.alt = 'Bezárás';
    addModalCloseIcon.style.width = '24px';
    addModalCloseIcon.style.height = '24px';
    addModalClose.appendChild(addModalCloseIcon);
    
    addModalHeader.appendChild(addModalTitle);
    addModalHeader.appendChild(addModalClose);
    
    const addModalBody = document.createElement('div');
    addModalBody.className = 'add-modal-body';
    
    const typeSelection = document.createElement('div');
    typeSelection.className = 'type-selection';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Típus:';
    
    const typeSelect = document.createElement('select');
    typeSelect.className = 'type-select';
    
    const homeworkOption = document.createElement('option');
    homeworkOption.value = 'homework';
    homeworkOption.textContent = 'Házi feladat';
    
    const testOption = document.createElement('option');
    testOption.value = 'test';
    testOption.textContent = 'Számonkérés';
    
    typeSelect.appendChild(homeworkOption);
    typeSelect.appendChild(testOption);
    
    typeSelection.appendChild(typeLabel);
    typeSelection.appendChild(typeSelect);
    
    const textInput = document.createElement('div');
    textInput.className = 'text-input';
    
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Leírás:';
    
    const textArea = document.createElement('textarea');
    textArea.className = 'item-text';
    textArea.placeholder = 'Írja be a leírást...';
    textArea.rows = 3;
    
    textInput.appendChild(textLabel);
    textInput.appendChild(textArea);
    
    const addModalActions = document.createElement('div');
    addModalActions.className = 'add-modal-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Mégse';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Mentés';
    
    addModalActions.appendChild(cancelBtn);
    addModalActions.appendChild(saveBtn);
    
    addModalBody.appendChild(typeSelection);
    addModalBody.appendChild(textInput);
    addModalBody.appendChild(addModalActions);
    
    addModalContent.appendChild(addModalHeader);
    addModalContent.appendChild(addModalBody);
    addModal.appendChild(addModalContent);
    
    document.body.appendChild(addModal);
    
    const closeAddModal = () => {
      addModal.classList.remove('show');
      setTimeout(() => addModal.remove(), 300);
    };
    
    addModalClose.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);
    
    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) closeAddModal();
    });
    
    saveBtn.addEventListener('click', async () => {
      const text = textArea.value.trim();
      const type = typeSelect.value;
      
      if (!text) {
        textArea.focus();
        return;
      }
      
      const lessonKey = getLessonKey(lesson);
      
      if (type === 'homework') {
        await addCustomHomework(lessonKey, text);
      } else {
        await addCustomTest(lessonKey, text);
      }
      
      closeAddModal();
    });
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeAddModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    requestAnimationFrame(() => {
      addModal.classList.add('show');
      textArea.focus();
    });
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
      if (dayNavigationState.currentDayIndex >= 0 && dayNavigationState.currentDayIndex < 5) {
      } else {
        dayNavigationState.currentDayIndex = 0;
      }
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


    helper.clearElement(modalGrid);
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
  
      helper.clearElement(weekGrid);
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
          name: await storageManager.get("schoolName", "OM azonosító - Iskola neve"),
          id: await storageManager.get("schoolCode", ""),
        },
        userData: {
          name: await storageManager.get("userName", "Felhasználónév"),
          time: "45:00",
        },
        weekInfo: {
          title: LanguageManager.t("timetable.week"),
          options: weekOptions,
        },
        weekDates: weekDates,
        lessons: lessons,
      };


      helper.clearElement(document.body);
      
  
      const kretaContainer = document.createElement('div');
      kretaContainer.className = 'kreta-container';
      
  
      const headerDiv = document.createElement('div');
  
      const template = document.createElement('template');
      template.innerHTML = await createTemplate.header();
      const headerContent = template.content;
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
      
  
      const gridContent = await generateTimeGrid(data.lessons, data.weekDates);
  
      const template3 = document.createElement('template');
      template3.innerHTML = `<div>${gridContent}</div>`;
      const tempDiv = template3.content.querySelector('div');
      while (tempDiv.firstChild) {
        timetableGrid.appendChild(tempDiv.firstChild);
      }
      
      timetableContainer.appendChild(timetableGrid);
      
      setTimeout(async () => {
        await updateHomeworkIconsFromCookie();
      }, 100);
  
      main.appendChild(weekControls);
      main.appendChild(weekModal);
      main.appendChild(dayNavigation);
      main.appendChild(timetableContainer);
      
      kretaContainer.appendChild(main);
      document.body.appendChild(kretaContainer);

      
      if (typeof setupUserDropdown === 'function') {
        setupUserDropdown();
      }
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


    helper.clearElement(weekDisplay);
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
      prevBtn.addEventListener("click", async () => {
        selectedWeekNumber--;
        if (selectedWeekNumber < 1) selectedWeekNumber = 52;
        updateWeekDisplay();
        await loadWeekData(selectedWeekNumber);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        selectedWeekNumber++;
        if (selectedWeekNumber > 52) selectedWeekNumber = 1;
        updateWeekDisplay();
        await loadWeekData(selectedWeekNumber);
      });
    }

    if (expandBtn) {
      expandBtn.addEventListener("click", () => {
        openWeekModal();
      });
    }

    const weekClickHandler = async (e) => {
      const weekCell = e.target.closest(".week-cell");
      if (weekCell) {
        const weekNumber = parseInt(weekCell.dataset.week);
        if (!isNaN(weekNumber)) {
          selectedWeekNumber = weekNumber;
          updateWeekDisplay();
          await loadWeekData(selectedWeekNumber);
        }
      }
    };

    document
      .getElementById("week-display")
      .addEventListener("click", weekClickHandler);

    setupWeekModal();
  }

  async function loadWeekData(weekNumber) {
    try {
      const today = new Date();
      let currentYear = today.getFullYear();


      if (today.getMonth() < 8) {
        currentYear--;
      }

      const startOfWeek = getDateOfWeek(currentYear, weekNumber, 1);
      const endOfWeek = getDateOfWeek(currentYear, weekNumber, 7);
      const startDate = startOfWeek.toISOString().split("T")[0];
      const endDate = endOfWeek.toISOString().split("T")[0];

    const apiData = await loadWeekDataFromAPI(startDate, endDate);
    const weekDates = generateWeekDates(startDate);
    const lessons = convertAPIDataToLessons(apiData, weekDates);

    const timetableContainer = document.querySelector(".timetable-grid");
    if (timetableContainer) {
  
      helper.clearElement(timetableContainer);
      const gridContent = await generateTimeGrid(lessons, weekDates);
      
      const template2 = document.createElement('template');
      template2.innerHTML = `<div>${gridContent}</div>`;
      const tempDiv = template2.content.querySelector('div');
      while (tempDiv.firstChild) {
        timetableContainer.appendChild(tempDiv.firstChild);
      }
      setupLessonCardListeners();
      setupDayNavigation(weekDates);
      
      setTimeout(async () => {
        await updateHomeworkIconsFromCookie();
      }, 100);
    }
  } catch (error) {
    console.error("Hét adatainak betöltése sikertelen:", error);
  }
  }

  function openWeekModal() {
    const modal = document.getElementById("weekModal");
    const modalGrid = document.getElementById("weekModalGrid");

    if (!modal || !modalGrid) return;

    const allWeeks = [];
    for (let week = 1; week <= 52; week++) {
      allWeeks.push(week);
    }

    
    helper.clearElement(modalGrid);
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

    const modalWeekClickHandler = async (e) => {
      const weekCell = e.target.closest(".modal-week-cell");
      if (weekCell) {
        const weekNumber = parseInt(weekCell.dataset.week);
        if (!isNaN(weekNumber)) {
          selectedWeekNumber = weekNumber;
          updateWeekDisplay();
          await loadWeekData(selectedWeekNumber);
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
