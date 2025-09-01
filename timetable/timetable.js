(() => {
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
              homeworkDetails: "",
              isSpecialDay: false,
              color: event.color,
            };
            lessons.push(lesson);
          } else {
          }
        } else {
        }
      } catch (error) {
        console.error(
          `Hiba az API feldolgozása során (${index}):`,
          error,
          event,
        );
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

    // Check if there are any special days to show notice row
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
          (time, timeIndex) => `
        <div class="time-slot">${time}</div>
        ${Array(5)
          .fill()
          .map((_, dayIndex) => {
            const dayLessons = regularLessons.filter(
              (l) => l.startTime === time && l.day === dayIndex,
            );

            return `
            <div class="lesson-slot">
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
                          <span class="material-icons-round">assignment</span>
                        </span>
                      `
                          : ""
                      }
                      ${
                        lesson.testInfo
                          ? `
                        <span class="lesson-indicator test-indicator" title="${LanguageManager.t("timetable.test_indicator")}">
                          <span class="material-icons-round">quiz</span>
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
      `,
        )
        .join("")}
    `;
  }
  function showLessonModal(lesson) {
    const modal = document.createElement("div");
    modal.className = "lesson-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${lesson.subject}</h3>
          <button class="modal-close">
            <img src="${chrome.runtime.getURL("icons/CloseCircle.svg")}" alt="Bezárás" style="width: 24px; height: 24px;">
          </button>
        </div>
        <div class="modal-body">
          <div class="lesson-details">
            <div class="detail-item">
              <span class="detail-label">${LanguageManager.t("timetable.teacher_label")}</span>
              <span class="detail-value ${lesson.originalTeacher != "" ? "line-through" : ""}">${lesson.originalTeacher != "" ? lesson.originalTeacher : lesson.teacher}</span>
            </div>
            <div class="detail-item ${lesson.originalTeacher != "" ? "" : "hidden"}">
              <span class="detail-label">${LanguageManager.t("timetable.substitute_teacher_label")}</span>
              <span class="detail-value">${lesson.teacher.replace("Helyettesítő:", "")}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">${LanguageManager.t("timetable.classroom_label")}</span>
              <span class="detail-value">${lesson.room}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">${LanguageManager.t("timetable.time_label")}</span>
              <span class="detail-value">${lesson.startTime} - ${lesson.endTime}</span>
            </div>
            ${
              lesson.isSubstituted
                ? `
            <div class="detail-item">
              <span class="detail-label">${LanguageManager.t("timetable.status_label")}</span>
              <span class="detail-value"><span class="material-icons-round">sync_alt</span> ${LanguageManager.t("timetable.substitution")}</span>
            </div>
            `
                : ""
            }
            ${
              lesson.isCancelled
                ? `
            <div class="detail-item">
              <span class="detail-label">${LanguageManager.t("timetable.status_label")}</span>
              <span class="detail-value"><span class="material-icons-round">cancel</span> ${LanguageManager.t("timetable.cancelled")}</span>
            </div>
            `
                : ""
            }
          </div>
          
          ${
            lesson.hasHomework
              ? `
            <div class="modal-section homework-section">
              <h4>
                <span class="material-icons-round">assignment</span>
                ${LanguageManager.t("timetable.homework_indicator")}
              </h4>
              <div class="homework-content">
                ${lesson.homeworkDetails ? `<p>${lesson.homeworkDetails}</p>` : `<p>${LanguageManager.t("timetable.has_homework")}</p>`}
                <a href='https://${window.location.hostname}/Tanulo/TanuloHaziFeladat' class="more-link">
                  ${LanguageManager.t("timetable.open_homework")}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                    <path d="M11.2997 5.19947L5.64282 5.19947M11.2997 5.19947L11.2997 10.8563M11.2997 5.19947L4.70001 11.7991" stroke="var(--accent-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </a>
              </div>
            </div>
          `
              : ""
          }
          ${
            lesson.testInfo
              ? `
            <div class="modal-section test-section">
              <h4>
                <span class="material-icons-round">quiz</span>
                ${LanguageManager.t("timetable.test_indicator")}
              </h4>
              <div class="test-content">
                <p>${lesson.testInfo}</p>
              </div>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;

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
        timetableGrid.innerHTML = generateTimeGrid(allLessons, weekDates);
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
      card.addEventListener("click", () => {
        const lessonData = JSON.parse(card.dataset.lesson);
        showLessonModal(lessonData);
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

    const schoolYearStart = new Date(schoolYear, 8, 1); // szeptember 1
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
    // Tanév alapú hét számítás: szeptember 1-től kezdődik
    const schoolYearStart = new Date(year, 8, 1); // szeptember 1
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

    modalGrid.innerHTML = allWeeks
      .map(
        (week) => `
      <div class="week-cell ${week.selected ? "selected" : ""}" 
           data-week="${week.value}" 
           data-start="${week.startDate}" 
           data-end="${week.endDate}"
           title="${week.text}">
        ${week.value}
      </div>
    `,
      )
      .join("");
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
      weekGrid.innerHTML = newWeekOptions
        .map(
          (opt) => `
        <div class="week-cell ${opt.selected ? "selected" : ""}" 
             data-week="${opt.value}" 
             data-start="${opt.startDate}" 
             data-end="${opt.endDate}"
             title="${opt.text}">
          ${opt.value}
        </div>
      `,
        )
        .join("");
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

      document.body.innerHTML = `
        <div class="kreta-container">
          ${createTemplate.header()}

          <main class="kreta-main">
            <div class="week-controls">
              <div class="week-selector-container">
                <div class="week-selector" id="week-selector">
                  <button class="week-nav-btn" id="prevWeekBtn" title="Előző hét">
                    <img src="${chrome.runtime.getURL("icons/ChevronLeftCircle.svg")}" alt="Előző" style="width: 24px; height: 24px;">
                  </button>
                  <div class="week-display" id="week-display">
                  </div>
                  <button class="week-nav-btn" id="nextWeekBtn" title="Következő hét">
                    <img src="${chrome.runtime.getURL("icons/ChevronRightCircle.svg")}" alt="Következő" style="width: 24px; height: 24px;">
                  </button>
                  <button class="expand-week-view-btn" id="expandWeekView" title="Teljes nézet">
                    <img src="${chrome.runtime.getURL("icons/ArrowsExpandFull.svg")}" alt="Teljes nézet" style="width: 18px; height: 18px;">
                  </button>
                </div>
                <div class="week-tooltip" id="week-tooltip"></div>
              </div>
            </div>

            <!-- Modal for expanded week view -->
            <div class="week-modal" id="weekModal" style="display: none;">
              <div class="week-modal-content">
                <div class="week-modal-header">
                  <h3></h3>
                  <button class="week-modal-close" id="closeWeekModal">
                    <img src="${chrome.runtime.getURL("icons/CloseCircle.svg")}" alt="Bezárás" style="width: 24px; height: 24px;">
                  </button>
                </div>
                <div class="week-modal-grid" id="weekModalGrid">
                </div>
              </div>
            </div>

            <div class="day-navigation">
              <button class="day-nav-btn" id="prevDay">
                <img src="${chrome.runtime.getURL("icons/ChevronLeftCircle.svg")}" alt="Előző" style="width: 24px; height: 24px;">
                Előző
              </button>
              <button class="day-nav-btn" id="nextDay">
                Következő
                <img src="${chrome.runtime.getURL("icons/ChevronRightCircle.svg")}" alt="Következő" style="width: 24px; height: 24px;">
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

    // Mindig 5 hetet mutatunk, a kiválasztott hét középen
    const visibleWeeks = [];
    for (let i = -2; i <= 2; i++) {
      let weekNum = selectedWeekNumber + i;
      if (weekNum < 1) weekNum = 52 + weekNum;
      if (weekNum > 52) weekNum = weekNum - 52;
      visibleWeeks.push(weekNum);
    }

    weekDisplay.innerHTML = visibleWeeks
      .map((weekNum, index) => {
        const isSelected = index === 2; // A középső elem mindig a kiválasztott
        const isCurrent = weekNum === currentWeekNumber;

        return `
        <div class="week-cell ${isSelected ? "selected" : ""} ${isCurrent ? "current-week" : ""}" 
             data-week="${weekNum}"
             title="${weekNum}. hét${isCurrent ? " (Jelenlegi hét)" : ""}">
          <span class="week-number">${weekNum}</span>
          ${isCurrent ? '<span class="current-indicator">●</span>' : ""}
        </div>
      `;
      })
      .join("");
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
    // Hét adatainak betöltése
    const today = new Date();
    let currentYear = today.getFullYear();

    // Ha szeptember előtt vagyunk, akkor az előző tanévet használjuk
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
          timetableContainer.innerHTML = generateTimeGrid(lessons, weekDates);
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

    modalGrid.innerHTML = allWeeks
      .map((weekNumber) => {
        const isSelected = weekNumber === selectedWeekNumber;
        const isCurrent = weekNumber === currentWeekNumber;

        return `
        <div class="week-cell modal-week-cell ${isSelected ? "selected" : ""} ${isCurrent ? "current-week" : ""}" 
             data-week="${weekNumber}"
             title="${weekNumber}. hét${isCurrent ? " (Jelenlegi hét)" : ""}">
          <span class="week-number">${weekNumber}</span>
          ${isCurrent ? '<span class="current-indicator">●</span>' : ""}
        </div>
      `;
      })
      .join("");

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
