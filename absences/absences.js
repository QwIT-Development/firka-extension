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
      `https://${currentDomain}/api/HianyzasokApi/GetHianyzasGrid?sort=MulasztasDatum-desc&page=1&pageSize=100&group=&filter=&data=%7B%7D&_=${Date.now()}`,
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

        absences.push({
          date: formattedDate,
          rawDate: date,
          lesson: item.Oraszam?.toString() || "",
          subject: item.Targy || "",
          topic: item.Tema || "",
          type: item.MulasztasTipus_DNAME || "",
          justified: item.Igazolt_BOOL === true,
          justificationStatus: justificationStatus,
          purposeful: item.TanoraiCeluMulasztas_BNAME || "",
          justificationType: item.IgazolasTipus_DNAME || "",
        });
      });
    }

    
    const groupedAbsences = absences.reduce((groups, absence) => {
      const date = absence.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(absence);
      return groups;
    }, {});

    
    Object.keys(groupedAbsences).forEach(date => {
      groupedAbsences[date].sort((a, b) => parseInt(a.lesson) - parseInt(b.lesson));
    });

    return { basicData, absences, groupedAbsences };
  } catch (error) {
    console.error("Hiba az API hívás során:", error);
    return { basicData, absences: [], groupedAbsences: {} };
  }
}

function createFilterCard(absences) {
  const filterCard = document.createElement('div');
  filterCard.className = 'filter-card';
  
  const filterHeader = document.createElement('div');
  filterHeader.className = 'filter-header';
  const h2 = document.createElement('h2');
  h2.textContent = LanguageManager.t('absences.filter_title');
  filterHeader.appendChild(h2);
  
  const filterContent = document.createElement('div');
  filterContent.className = 'filter-content';

  const dateGroup = document.createElement('div');
  dateGroup.className = 'filter-group';
  
  const dateLabel = document.createElement('label');
  const dateImg = document.createElement('img');
  dateImg.src = chrome.runtime.getURL('icons/Calendar.svg');
  dateImg.alt = 'Dátum';
  dateLabel.appendChild(dateImg);
  dateLabel.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.date')));
  
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'dateFilter';
  dateInput.className = 'filter-input';
  
  dateGroup.appendChild(dateLabel);
  dateGroup.appendChild(dateInput);
  filterContent.appendChild(dateGroup);

  const subjectGroup = document.createElement('div');
  subjectGroup.className = 'filter-group';
  
  const subjectLabel = document.createElement('label');
  const subjectImg = document.createElement('img');
  subjectImg.src = chrome.runtime.getURL('icons/Subject.svg');
  subjectImg.alt = 'Tantárgy';
  subjectLabel.appendChild(subjectImg);
  subjectLabel.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.subject')));
  
  const subjectSelect = document.createElement('select');
  subjectSelect.id = 'subjectFilter';
  subjectSelect.className = 'filter-input';
  
  const defaultSubjectOption = document.createElement('option');
  defaultSubjectOption.value = '';
  defaultSubjectOption.textContent = LanguageManager.t('absences.all_subjects');
  subjectSelect.appendChild(defaultSubjectOption);
  
  const subjects = [...new Set(absences.map(a => a.subject))].sort();
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
  
  subjectGroup.appendChild(subjectLabel);
  subjectGroup.appendChild(subjectSelect);
  filterContent.appendChild(subjectGroup);

  const justificationGroup = document.createElement('div');
  justificationGroup.className = 'filter-group';
  
  const justificationLabel = document.createElement('label');
  const justificationImg = document.createElement('img');
  justificationImg.src = chrome.runtime.getURL('icons/BadgeCheck.svg');
  justificationImg.alt = 'Igazolás';
  justificationLabel.appendChild(justificationImg);
  justificationLabel.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.justification')));
  
  const justificationSelect = document.createElement('select');
  justificationSelect.id = 'justificationFilter';
  justificationSelect.className = 'filter-input';
  
  const justificationOptions = [
    { value: '', text: LanguageManager.t('absences.all_types') },
    { value: 'justified', text: LanguageManager.t('absences.justified') },
    { value: 'unjustified', text: LanguageManager.t('absences.unjustified') },
    { value: 'pending', text: LanguageManager.t('absences.pending') }
  ];
  
  justificationOptions.forEach(optionData => {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.text;
    justificationSelect.appendChild(option);
  });
  
  justificationGroup.appendChild(justificationLabel);
  justificationGroup.appendChild(justificationSelect);
  filterContent.appendChild(justificationGroup);
  
  filterCard.appendChild(filterHeader);
  filterCard.appendChild(filterContent);
  
  return filterCard;
}

function createStatsSection(absences) {
  const statsSection = document.createElement('div');
  statsSection.className = 'stats-section';
  
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';
  
  const stats = [
    { 
      type: 'total',
      number: absences.length, 
      label: LanguageManager.t('absences.total_absences')
    },
    { 
      type: 'justified',
      number: absences.filter(a => a.justificationStatus === 'justified').length, 
      label: LanguageManager.t('absences.justified')
    },
    { 
      type: 'unjustified',
      number: absences.filter(a => a.justificationStatus === 'unjustified').length, 
      label: LanguageManager.t('absences.unjustified')
    },
    { 
      type: 'pending',
      number: absences.filter(a => a.justificationStatus === 'pending').length, 
      label: LanguageManager.t('absences.pending')
    }
  ];
  
  stats.forEach(stat => {
    const statCard = document.createElement('div');
    statCard.className = `stat-card ${stat.type}`;
    statCard.dataset.type = stat.type;
    
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

function createDayGroup(date, dayAbsences) {
  const dayGroup = document.createElement('div');
  dayGroup.className = 'day-group';
  dayGroup.dataset.date = date;
  
  
  const dayHeader = document.createElement('div');
  dayHeader.className = 'day-header';
  
  const dayDate = document.createElement('div');
  dayDate.className = 'day-date';
  
  const calendarIcon = document.createElement('img');
  calendarIcon.src = chrome.runtime.getURL('icons/Calendar.svg');
  calendarIcon.alt = 'Dátum';
  
  const dateText = document.createElement('span');
  dateText.textContent = formatDateWithDay(date);
  
  dayDate.appendChild(calendarIcon);
  dayDate.appendChild(dateText);
  
  const dayCount = document.createElement('div');
  dayCount.className = 'day-count';
  dayCount.textContent = `${dayAbsences.length} ${LanguageManager.t('absences.hours')}`;
  
  dayHeader.appendChild(dayDate);
  dayHeader.appendChild(dayCount);
  
  const dayAbsencesContainer = document.createElement('div');
  dayAbsencesContainer.className = 'day-absences';
  
  dayAbsences.forEach(absence => {
    const absenceCard = createAbsenceCard(absence);
    dayAbsencesContainer.appendChild(absenceCard);
  });
  
  dayGroup.appendChild(dayHeader);
  dayGroup.appendChild(dayAbsencesContainer);
  
  return dayGroup;
}

function formatDateWithDay(dateStr) {
  const parts = dateStr.split('.');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const date = new Date(year, month, day);
  const days = [
    LanguageManager.t('common.sunday'),
    LanguageManager.t('common.monday'),
    LanguageManager.t('common.tuesday'),
    LanguageManager.t('common.wednesday'),
    LanguageManager.t('common.thursday'),
    LanguageManager.t('common.friday'),
    LanguageManager.t('common.saturday')
  ];
  
  const dayName = days[date.getDay()];
  return `${dateStr} - ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;
}

function createAbsenceCard(absence) {
  const card = document.createElement('div');
  card.className = 'absence-card';
  card.dataset.subject = absence.subject;
  card.dataset.status = absence.justificationStatus;
  card.dataset.date = absence.date;

  const lessonDiv = document.createElement('div');
  lessonDiv.className = 'absence-lesson';
  lessonDiv.textContent = absence.lesson + '.';

  const subjectDiv = document.createElement('div');
  subjectDiv.className = 'absence-subject';
  subjectDiv.textContent = absence.subject;

  const topicDiv = document.createElement('div');
  topicDiv.className = 'absence-topic';
  topicDiv.textContent = absence.topic || '-';
  topicDiv.title = absence.topic;

  const statusDiv = document.createElement('div');
  statusDiv.className = 'absence-status';
  
  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge ${absence.justificationStatus}`;
  
  if (absence.justificationStatus === 'justified') {
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/BadgeCheck.svg');
    img.alt = 'Igazolt';
    statusBadge.appendChild(img);
    statusBadge.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.justified')));
  } else if (absence.justificationStatus === 'unjustified') {
    const span = document.createElement('span');
    span.className = 'material-icons-round';
    span.textContent = 'cancel';
    statusBadge.appendChild(span);
    statusBadge.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.unjustified')));
  } else {
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/pending.svg');
    img.alt = 'Függőben';
    statusBadge.appendChild(img);
    statusBadge.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.pending')));
  }
  
  statusDiv.appendChild(statusBadge);
  
  card.appendChild(lessonDiv);
  card.appendChild(subjectDiv);
  card.appendChild(topicDiv);
  card.appendChild(statusDiv);
  
  return card;
}

function createAbsencesContent(groupedAbsences) {
  const content = document.createElement('div');
  content.className = 'absences-content';

  const sortedDates = Object.keys(groupedAbsences).sort((a, b) => {
    const dateA = new Date(a.replace(/\./g, '-').slice(0, -1));
    const dateB = new Date(b.replace(/\./g, '-').slice(0, -1));
    return dateB - dateA;
  });
  
  if (sortedDates.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    const emptyIcon = document.createElement('img');
    emptyIcon.src = chrome.runtime.getURL('icons/BadgeCheck.svg');
    emptyIcon.alt = 'Nincs hiányzás';
    
    const emptyTitle = document.createElement('h3');
    emptyTitle.textContent = LanguageManager.t('absences.title');
    
    const emptyText = document.createElement('p');
    emptyText.textContent = LanguageManager.t('dashboard.not_supported');
    
    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyTitle);
    emptyState.appendChild(emptyText);
    content.appendChild(emptyState);
  } else {
    sortedDates.forEach(date => {
      const dayGroup = createDayGroup(date, groupedAbsences[date]);
      content.appendChild(dayGroup);
    });
  }
  
  return content;
}

async function transformAbsencesPage() {
  const { basicData, absences, groupedAbsences } = await collectAbsencesData();
  
  document.body.textContent = '';
  
  const container = document.createElement('div');
  container.className = 'kreta-container';

  const headerDiv = document.createElement('div');
  const parser = new DOMParser();
  const doc = parser.parseFromString(await createTemplate.header(), 'text/html');
  const tempDiv = doc.body;
  while (tempDiv.firstChild) {
    headerDiv.appendChild(tempDiv.firstChild);
  }
  container.appendChild(headerDiv);
  
  const main = document.createElement('main');
  main.className = 'kreta-main';
  
  const pageGrid = document.createElement('div');
  pageGrid.className = 'absences-page';
  
  const sidebar = document.createElement('div');
  sidebar.className = 'absences-sidebar';
  const filterCard = createFilterCard(absences);
  sidebar.appendChild(filterCard);
  
  const statsSection = createStatsSection(absences);
  sidebar.appendChild(statsSection);
  
  const absencesContent = createAbsencesContent(groupedAbsences);
  
  pageGrid.appendChild(sidebar);
  pageGrid.appendChild(absencesContent);
  
  main.appendChild(pageGrid);
  container.appendChild(main);
  document.body.appendChild(container);

  setupUserDropdown();
  setupMobileNavigation();
  setupFilters(groupedAbsences);

  loadingScreen.hide();
}

function setupFilters(originalGroupedAbsences) {
  try {
    const dateFilter = document.getElementById("dateFilter");
    const subjectFilter = document.getElementById("subjectFilter");
    const justificationFilter = document.getElementById("justificationFilter");

    if (!dateFilter || !subjectFilter || !justificationFilter) {
      console.warn("Some filter elements were not found in the DOM");
      return;
    }

    const filterAbsences = () => {
      try {
        const dateFilterValue = dateFilter.value;
        const subject = subjectFilter.value;
        const justified = justificationFilter.value;
        const selectedDate = dateFilterValue ? new Date(dateFilterValue) : null;

        document.querySelectorAll(".absence-card").forEach((card) => {
          const dateStr = card.dataset.date;
          const dateParts = dateStr.split(".");

          if (dateParts.length < 3) {
            return;
          }

          const parsedYear = parseInt(dateParts[0].trim(), 10);
          const parsedMonth = parseInt(dateParts[1].trim(), 10) - 1;
          const parsedDay = parseInt(dateParts[2].trim(), 10);

          const cardDate = new Date(parsedYear, parsedMonth, parsedDay);

          let showCard = true;

          if (selectedDate) {
            if (
              cardDate.getFullYear() !== selectedDate.getFullYear() ||
              cardDate.getMonth() !== selectedDate.getMonth() ||
              cardDate.getDate() !== selectedDate.getDate()
            ) {
              showCard = false;
            }
          }

          if (subject && card.dataset.subject !== subject) {
            showCard = false;
          }

          if (justified && card.dataset.status !== justified) {
            showCard = false;
          }

          card.style.display = showCard ? "" : "none";
        });

        updateDayGroupsVisibility();

        updateStatistics();
      } catch (err) {
        console.error("Error during filtering absences:", err);
      }
    };

    [dateFilter, subjectFilter, justificationFilter].forEach((filter) => {
      if (filter) {
        filter.addEventListener("change", filterAbsences);
      }
    });

  } catch (err) {
    console.error("Error setting up filters:", err);
  }
}

function updateDayGroupsVisibility() {
  document.querySelectorAll(".day-group").forEach((group) => {
    const visibleCards = group.querySelectorAll('.absence-card:not([style*="display: none"])');
    const dayCount = group.querySelector('.day-count');
    
    if (visibleCards.length > 0) {
      group.style.display = "";
      if (dayCount) {
        dayCount.textContent = `${visibleCards.length} ${LanguageManager.t('absences.hours')}`;
      }
    } else {
      group.style.display = "none";
    }
  });
}

function updateStatistics() {
  try {
    const visibleCards = document.querySelectorAll('.absence-card:not([style*="display: none"])');
    const totalVisible = visibleCards.length;
    const justifiedVisible = Array.from(visibleCards).filter(
      card => card.dataset.status === 'justified'
    ).length;
    const unjustifiedVisible = Array.from(visibleCards).filter(
      card => card.dataset.status === 'unjustified'
    ).length;
    const pendingVisible = Array.from(visibleCards).filter(
      card => card.dataset.status === 'pending'
    ).length;

    const statCards = document.querySelectorAll(".stat-card");
    statCards.forEach(card => {
      const type = card.dataset.type;
      const numberEl = card.querySelector('.stat-number');
      if (numberEl) {
        switch(type) {
          case 'total':
            numberEl.textContent = totalVisible;
            break;
          case 'justified':
            numberEl.textContent = justifiedVisible;
            break;
          case 'unjustified':
            numberEl.textContent = unjustifiedVisible;
            break;
          case 'pending':
            numberEl.textContent = pendingVisible;
            break;
        }
      }
    });
  } catch (err) {
    console.error("Error updating statistics:", err);
  }
}

if (window.location.href.includes("/Hianyzas/Hianyzasok")) {
  transformAbsencesPage().catch((error) => {
    console.error(LanguageManager.t("absences.page_transform_error"), error);
  });
}