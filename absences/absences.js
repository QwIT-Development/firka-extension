async function collectAbsencesData() {
  const basicData = {
    schoolInfo: {
      name: await storageManager.get("schoolName", "OM azonosító - Iskola neve"),
      id: await storageManager.get("schoolCode", ""),
    },
    userData: {
      name: await storageManager.get("userName", "Felhasználónév"),
      time:
        document.querySelector(".usermenu_timer")?.textContent?.trim() ||
        "45:00",
    },
  };

  try {
    const currentDomain = window.location.hostname;
    const response = await fetch(
      `https://${currentDomain}/api/HianyzasokApi/GetHianyzasGrid?sort=MulasztasDatum-desc&page=1&pageSize=500&group=&filter=&data=%7B%7D&_=${Date.now()}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiData = await response.json();
    const absences = [];

    if (apiData.Data && Array.isArray(apiData.Data)) {
      apiData.Data.forEach((item) => {
        const date = new Date(item.MulasztasDatum);
        const formattedDate = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getDate().toString().padStart(2, "0")}.`;

        let justificationStatus = "pending";
        if (item.Igazolt_BOOL === true) {
          justificationStatus = "justified";
        } else if (item.Igazolt_BOOL === false && item.IgazolasTipus !== null) {
          justificationStatus = "unjustified";
        }

        const absenceType = item.MulasztasTipus === 1500 ? 'absence' : item.MulasztasTipus === 1499 ? 'late' : 'other';

        absences.push({
          date: formattedDate,
          rawDate: date,
          dateKey: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`,
          lesson: item.Oraszam?.toString() || "",
          subject: item.Targy || "",
          topic: item.Tema || "",
          type: item.MulasztasTipus_DNAME || "",
          absenceType: absenceType,
          absenceTypeId: item.MulasztasTipus,
          justified: item.Igazolt_BOOL === true,
          justificationStatus: justificationStatus,
          purposeful: item.TanoraiCeluMulasztas_BNAME || "",
          justificationType: item.IgazolasTipus_DNAME || "",
          minutes: item.KesesPercben || 0,
        });
      });
    }

    const groupedByDate = absences.reduce((groups, absence) => {
      const key = absence.dateKey;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(absence);
      return groups;
    }, {});

    Object.keys(groupedByDate).forEach(date => {
      groupedByDate[date].sort((a, b) => parseInt(a.lesson) - parseInt(b.lesson));
    });

    return { basicData, absences, groupedByDate };
  } catch (error) {
    console.error("Hiba az API hívás során:", error);
    return { basicData, absences: [], groupedByDate: {} };
  }
}

function createStatsSection(absences) {
  const statsSection = document.createElement('div');
  statsSection.className = 'stats-section';

  const statsTitle = document.createElement('h2');
  statsTitle.className = 'stats-title';
  statsTitle.textContent = LanguageManager.t('absences.title');
  statsSection.appendChild(statsTitle);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const totalAbsences = absences.filter(a => a.absenceType === 'absence').length;
  const totalLates = absences.filter(a => a.absenceType === 'late').length;
  const justified = absences.filter(a => a.justificationStatus === 'justified').length;
  const unjustified = absences.filter(a => a.justificationStatus === 'unjustified').length;
  const pending = absences.filter(a => a.justificationStatus === 'pending').length;

  const stats = [
    { type: 'total', number: absences.length, label: LanguageManager.t('absences.total_absences') },
    { type: 'absence', number: totalAbsences, label: LanguageManager.t('absences.absence_type') },
    { type: 'late', number: totalLates, label: LanguageManager.t('absences.late_type') },
    { type: 'justified', number: justified, label: LanguageManager.t('absences.justified') },
    { type: 'unjustified', number: unjustified, label: LanguageManager.t('absences.unjustified') },
    { type: 'pending', number: pending, label: LanguageManager.t('absences.pending') },
  ];

  stats.forEach(stat => {
    const statCard = document.createElement('div');
    statCard.className = `stat-card ${stat.type}`;

    const statNumber = document.createElement('div');
    statNumber.className = 'stat-number';
    statNumber.textContent = stat.number;

    const statLabel = document.createElement('div');
    statLabel.className = 'stat-label';
    statLabel.textContent = stat.label;

    statCard.appendChild(statNumber);
    statCard.appendChild(statLabel);
    statsGrid.appendChild(statCard);
  });

  statsSection.appendChild(statsGrid);
  return statsSection;
}

function getSchoolYearStart() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 8, 1);
}

function createCalendarSection(groupedByDate, absences) {
  const calendarSection = document.createElement('div');
  calendarSection.className = 'calendar-section';

  const schoolYearStart = getSchoolYearStart();
  const now = new Date();

  const months = [];
  let currentDate = new Date(schoolYearStart);

  while (currentDate <= now) {
    months.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth()
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  months.forEach(({ year, month }) => {
    const monthCalendar = createMonthCalendar(year, month, groupedByDate, absences);
    calendarSection.appendChild(monthCalendar);
  });

  return calendarSection;
}

function createMonthCalendar(year, month, groupedByDate, absences) {
  const monthContainer = document.createElement('div');
  monthContainer.className = 'month-container';

  const monthHeader = document.createElement('div');
  monthHeader.className = 'month-header';

  const monthNames = [
    LanguageManager.t('common.january') || 'Január',
    LanguageManager.t('common.february') || 'Február',
    LanguageManager.t('common.march') || 'Március',
    LanguageManager.t('common.april') || 'Április',
    LanguageManager.t('common.may') || 'Május',
    LanguageManager.t('common.june') || 'Június',
    LanguageManager.t('common.july') || 'Július',
    LanguageManager.t('common.august') || 'Augusztus',
    LanguageManager.t('common.september') || 'Szeptember',
    LanguageManager.t('common.october') || 'Október',
    LanguageManager.t('common.november') || 'November',
    LanguageManager.t('common.december') || 'December'
  ];

  monthHeader.textContent = `${monthNames[month]} ${year}`;
  monthContainer.appendChild(monthHeader);

  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'calendar-grid';

  const dayNames = [
    LanguageManager.t('common.mon') || 'H',
    LanguageManager.t('common.tue') || 'K',
    LanguageManager.t('common.wed') || 'Sze',
    LanguageManager.t('common.thu') || 'Cs',
    LanguageManager.t('common.fri') || 'P',
    LanguageManager.t('common.sat') || 'Szo',
    LanguageManager.t('common.sun') || 'V'
  ];

  dayNames.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyCell);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const dayAbsences = groupedByDate[dateKey] || [];
    const currentDayDate = new Date(year, month, day);
    currentDayDate.setHours(0, 0, 0, 0);

    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';

    if (currentDayDate > today) {
      dayCell.classList.add('future');
    }

    if (currentDayDate.getTime() === today.getTime()) {
      dayCell.classList.add('today');
    }

    if (dayAbsences.length > 0) {
      dayCell.classList.add('has-absence');

      const hasUnjustified = dayAbsences.some(a => a.justificationStatus === 'unjustified');
      const hasPending = dayAbsences.some(a => a.justificationStatus === 'pending');
      const hasJustified = dayAbsences.some(a => a.justificationStatus === 'justified');
      const hasAbsence = dayAbsences.some(a => a.absenceType === 'absence');
      const hasLate = dayAbsences.some(a => a.absenceType === 'late');

      if (hasUnjustified) {
        dayCell.classList.add('status-unjustified');
      } else if (hasPending) {
        dayCell.classList.add('status-pending');
      } else if (hasJustified) {
        dayCell.classList.add('status-justified');
      }

      if (hasAbsence && hasLate) {
        dayCell.classList.add('type-mixed');
      } else if (hasLate) {
        dayCell.classList.add('type-late');
      }

      dayCell.addEventListener('click', () => {
        openAbsenceModal(dateKey, dayAbsences);
      });

      const countBadge = document.createElement('span');
      countBadge.className = 'absence-count';
      countBadge.textContent = dayAbsences.length;
      dayCell.appendChild(countBadge);
    }

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    calendarGrid.appendChild(dayCell);
  }

  monthContainer.appendChild(calendarGrid);
  return monthContainer;
}

function openAbsenceModal(dateKey, dayAbsences) {
  const existingModal = document.querySelector('.absence-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'absence-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'absence-modal';

  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';

  const dateParts = dateKey.split('-');
  const displayDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  const dayNames = [
    LanguageManager.t('common.sunday') || 'Vasárnap',
    LanguageManager.t('common.monday') || 'Hétfő',
    LanguageManager.t('common.tuesday') || 'Kedd',
    LanguageManager.t('common.wednesday') || 'Szerda',
    LanguageManager.t('common.thursday') || 'Csütörtök',
    LanguageManager.t('common.friday') || 'Péntek',
    LanguageManager.t('common.saturday') || 'Szombat'
  ];

  const modalTitle = document.createElement('h2');
  modalTitle.textContent = `${dateParts[0]}.${dateParts[1]}.${dateParts[2]}. - ${dayNames[displayDate.getDay()]}`;

  modalHeader.appendChild(modalTitle);

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  dayAbsences.forEach(absence => {
    const absenceCard = document.createElement('div');
    absenceCard.className = `modal-absence-card ${absence.justificationStatus}`;

    const headerRow = document.createElement('div');
    headerRow.className = 'modal-card-header';

    const lessonSpan = document.createElement('span');
    lessonSpan.className = 'modal-lesson';
    lessonSpan.textContent = `${absence.lesson}.`;

    const typeIndicator = document.createElement('span');
    typeIndicator.className = `type-indicator ${absence.absenceType}`;
    typeIndicator.textContent = absence.absenceType === 'late' 
      ? (LanguageManager.t('absences.late_type') || 'Késés') 
      : (LanguageManager.t('absences.absence_type') || 'Hiányzás');

    const statusBadge = document.createElement('span');
    statusBadge.className = `modal-status-badge ${absence.justificationStatus}`;
    let statusText = '';
    if (absence.justificationStatus === 'justified') {
      statusText = LanguageManager.t('absences.justified') || 'Igazolt';
    } else if (absence.justificationStatus === 'unjustified') {
      statusText = LanguageManager.t('absences.unjustified') || 'Igazolatlan';
    } else {
      statusText = LanguageManager.t('absences.pending') || 'Igazolásra vár';
    }
    statusBadge.textContent = statusText;

    headerRow.appendChild(lessonSpan);
    headerRow.appendChild(typeIndicator);
    headerRow.appendChild(statusBadge);

    const subjectDiv = document.createElement('div');
    subjectDiv.className = 'modal-subject';
    subjectDiv.textContent = absence.subject;

    const infoRow = document.createElement('div');
    infoRow.className = 'modal-info-row';

    if (absence.topic) {
      const topicSpan = document.createElement('span');
      topicSpan.className = 'modal-info-item';
      topicSpan.textContent = absence.topic;
      infoRow.appendChild(topicSpan);
    }

    if (absence.justificationType) {
      const justificationSpan = document.createElement('span');
      justificationSpan.className = 'modal-info-item';
      justificationSpan.textContent = absence.justificationType;
      infoRow.appendChild(justificationSpan);
    }

    if (absence.absenceType === 'late' && absence.minutes > 0) {
      const minutesSpan = document.createElement('span');
      minutesSpan.className = 'modal-info-item modal-minutes';
      minutesSpan.textContent = `${absence.minutes} ${LanguageManager.t('absences.minutes') || 'perc'}`;
      infoRow.appendChild(minutesSpan);
    }

    absenceCard.appendChild(headerRow);
    absenceCard.appendChild(subjectDiv);
    if (infoRow.children.length > 0) {
      absenceCard.appendChild(infoRow);
    }

    modalContent.appendChild(absenceCard);
  });

  modal.appendChild(modalHeader);
  modal.appendChild(modalContent);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });
}

function createLegend() {
  const legend = document.createElement('div');
  legend.className = 'calendar-legend';

  const legendItems = [
    { class: 'status-justified', label: LanguageManager.t('absences.justified') || 'Igazolt' },
    { class: 'status-pending', label: LanguageManager.t('absences.pending') || 'Igazolásra vár' },
    { class: 'status-unjustified', label: LanguageManager.t('absences.unjustified') || 'Igazolatlan' },
    { class: 'type-late-legend', label: LanguageManager.t('absences.late_type') || 'Késés', isType: true },
  ];

  legendItems.forEach(item => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';

    const legendColor = document.createElement('div');
    legendColor.className = `legend-color ${item.class}`;

    const legendLabel = document.createElement('span');
    legendLabel.textContent = item.label;

    legendItem.appendChild(legendColor);
    legendItem.appendChild(legendLabel);
    legend.appendChild(legendItem);
  });

  return legend;
}

async function transformAbsencesPage() {
  const { basicData, absences, groupedByDate } = await collectAbsencesData();

  document.body.textContent = '';

  const container = document.createElement('div');
  container.className = 'kreta-container';

  const headerDiv = document.createElement('div');
  const template = document.createElement('template');
  template.innerHTML = await createTemplate.header();
  const tempDiv = template.content;
  while (tempDiv.firstChild) {
    headerDiv.appendChild(tempDiv.firstChild);
  }
  container.appendChild(headerDiv);

  const main = document.createElement('main');
  main.className = 'kreta-main';

  const pageContent = document.createElement('div');
  pageContent.className = 'absences-page';

  const statsSection = createStatsSection(absences);
  pageContent.appendChild(statsSection);

  const legend = createLegend();
  pageContent.appendChild(legend);

  const calendarSection = createCalendarSection(groupedByDate, absences);
  pageContent.appendChild(calendarSection);

  main.appendChild(pageContent);
  container.appendChild(main);
  document.body.appendChild(container);

  setupUserDropdown();
  loadingScreen.hide();
}

if (window.location.href.includes("/Hianyzas/Hianyzasok")) {
  transformAbsencesPage().catch((error) => {
    console.error(LanguageManager.t("absences.page_transform_error"), error);
  });
}