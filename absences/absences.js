async function collectAbsencesData() {
  const basicData = {
    schoolInfo: {
      name: cookieManager.get("schoolName") || "Iskola",
      id: cookieManager.get("schoolCode") || "",
    },
    userData: {
      name: cookieManager.get("userName") || "Felhasználó",
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

    const groupedAbsences = {};
    absences.forEach((absence) => {
      if (!groupedAbsences[absence.date]) {
        groupedAbsences[absence.date] = [];
      }
      groupedAbsences[absence.date].push(absence);
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
  
  const dateGroup = createFilterGroup(
    'Calendar.svg',
    'Dátum',
    LanguageManager.t('absences.date'),
    'input',
    { type: 'date', id: 'dateFilter', className: 'filter-input' }
  );
  filterContent.appendChild(dateGroup);

  const subjectGroup = createSubjectFilterGroup(absences);
  filterContent.appendChild(subjectGroup);

  const justificationGroup = createJustificationFilterGroup();
  filterContent.appendChild(justificationGroup);
  
  filterCard.appendChild(filterHeader);
  filterCard.appendChild(filterContent);
  
  return filterCard;
}

function createFilterGroup(iconName, altText, labelText, elementType, attributes) {
  const group = document.createElement('div');
  group.className = 'filter-group';
  
  const label = document.createElement('label');
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL(`icons/${iconName}`);
  img.alt = altText;
  img.style.width = '24px';
  img.style.height = '24px';
  
  label.appendChild(img);
  label.appendChild(document.createTextNode(' ' + labelText));
  
  const element = document.createElement(elementType);
  Object.assign(element, attributes);
  
  group.appendChild(label);
  group.appendChild(element);
  
  return group;
}

function createSubjectFilterGroup(absences) {
  const group = document.createElement('div');
  group.className = 'filter-group';
  
  const label = document.createElement('label');
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/Subject.svg');
  img.alt = 'Tantárgy';
  img.style.width = '24px';
  img.style.height = '24px';
  
  label.appendChild(img);
  label.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.subject')));
  
  const select = document.createElement('select');
  select.id = 'subjectFilter';
  select.className = 'filter-input';
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = LanguageManager.t('absences.all_subjects');
  select.appendChild(defaultOption);
  
  const subjects = [...new Set(absences.map(a => a.subject))].sort();
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    select.appendChild(option);
  });
  
  group.appendChild(label);
  group.appendChild(select);
  
  return group;
}

function createJustificationFilterGroup() {
  const group = document.createElement('div');
  group.className = 'filter-group';
  
  const label = document.createElement('label');
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/BadgeCheck.svg');
  img.alt = 'Igazolás';
  img.style.width = '24px';
  img.style.height = '24px';
  
  label.appendChild(img);
  label.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.justification')));
  
  const select = document.createElement('select');
  select.id = 'justificationFilter';
  select.className = 'filter-input';
  
  const options = [
    { value: '', text: LanguageManager.t('absences.all_types') },
    { value: 'justified', text: LanguageManager.t('absences.justified') },
    { value: 'unjustified', text: LanguageManager.t('absences.unjustified') },
    { value: 'pending', text: LanguageManager.t('absences.pending') }
  ];
  
  options.forEach(optionData => {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.text;
    select.appendChild(option);
  });
  
  group.appendChild(label);
  group.appendChild(select);
  
  return group;
}

function createStatsOverview(absences) {
  const statsOverview = document.createElement('div');
  statsOverview.className = 'stats-overview';
  
  const stats = [
    { number: absences.length, label: LanguageManager.t('absences.total_absences') },
    { number: absences.filter(a => a.justificationStatus === 'justified').length, label: LanguageManager.t('absences.justified') },
    { number: absences.filter(a => a.justificationStatus === 'unjustified').length, label: LanguageManager.t('absences.unjustified') },
    { number: absences.filter(a => a.justificationStatus === 'pending').length, label: LanguageManager.t('absences.pending') }
  ];
  
  stats.forEach(stat => {
    const statCard = document.createElement('div');
    statCard.className = 'stat-card';
    
    const statNumber = document.createElement('div');
    statNumber.className = 'stat-number';
    statNumber.textContent = stat.number;
    
    const statLabel = document.createElement('div');
    statLabel.className = 'stat-label';
    statLabel.textContent = stat.label;
    
    statCard.appendChild(statNumber);
    statCard.appendChild(statLabel);
    statsOverview.appendChild(statCard);
  });
  
  return statsOverview;
}

function createAbsencesContainer(absences) {
  const container = document.createElement('div');
  container.className = 'absences-container';
  
  const table = document.createElement('table');
  table.className = 'absences-table';
  
  const thead = document.createElement('thead');
  thead.className = 'table-header';
  
  const headerRow = document.createElement('tr');
  const headers = [
    LanguageManager.t('absences.date'),
    LanguageManager.t('absences.lesson'),
    LanguageManager.t('absences.subject'),
    LanguageManager.t('absences.topic'),
    LanguageManager.t('absences.status')
  ];
  
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  
  const tbody = document.createElement('tbody');
  generateAbsencesRows(absences, tbody);
  
  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
  
  return container;
}

async function transformAbsencesPage() {
  const { basicData, absences, groupedAbsences } = await collectAbsencesData();
  document.body.textContent = '';
  const container = document.createElement('div');
  container.className = 'kreta-container';
  const headerDiv = document.createElement('div');
  const parser = new DOMParser();
  const doc = parser.parseFromString(createTemplate.header(), 'text/html');
  const tempDiv = doc.body;
  while (tempDiv.firstChild) {
    headerDiv.appendChild(tempDiv.firstChild);
  }
  container.appendChild(headerDiv);
  const main = document.createElement('main');
  main.className = 'kreta-main';
  const filterCard = createFilterCard(absences);
  main.appendChild(filterCard);
  const statsOverview = createStatsOverview(absences);
  main.appendChild(statsOverview);
  const absencesContainer = createAbsencesContainer(absences);
  main.appendChild(absencesContainer);
  
  container.appendChild(main);
  document.body.appendChild(container);

  
  setupUserDropdown();
  setupMobileNavigation();

  setupEventListeners();
  setupFilters();

  loadingScreen.hide();
}

function generateAbsencesRows(absences, tbody) {
  const groupedByDate = absences.reduce((groups, absence) => {
    const date = absence.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(absence);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  sortedDates.forEach((date) => {
    const dateAbsences = groupedByDate[date];
    const divider = document.createElement('tr');
    divider.className = 'date-group-divider';
    divider.style.display = 'none';
    tbody.appendChild(divider);

    dateAbsences.forEach((absence) => {
      const row = document.createElement('tr');
      row.className = 'table-row';
      row.dataset.subject = absence.subject;
      row.dataset.justified = absence.justified;
      row.dataset.date = absence.date;
      row.dataset.dateGroup = date;

      const dateCell = document.createElement('td');
      dateCell.className = 'table-cell date-cell';
      dateCell.dataset.label = LanguageManager.t('absences.date');
      dateCell.textContent = absence.date;
      row.appendChild(dateCell);

      const lessonCell = document.createElement('td');
      lessonCell.className = 'table-cell lesson-cell';
      lessonCell.dataset.label = LanguageManager.t('absences.lesson');
      lessonCell.textContent = absence.lesson + '.';
      row.appendChild(lessonCell);

      const subjectCell = document.createElement('td');
      subjectCell.className = 'table-cell subject-cell';
      subjectCell.dataset.label = LanguageManager.t('absences.subject');
      subjectCell.textContent = absence.subject;
      row.appendChild(subjectCell);

      const topicCell = document.createElement('td');
      topicCell.className = 'table-cell topic-cell';
      topicCell.dataset.label = LanguageManager.t('absences.topic');
      topicCell.title = absence.topic;
      topicCell.textContent = absence.topic;
      row.appendChild(topicCell);

      const statusCell = document.createElement('td');
      statusCell.className = 'table-cell status-cell';
      statusCell.dataset.label = LanguageManager.t('absences.status');
      
      const statusBadge = document.createElement('span');
      statusBadge.className = `status-badge ${absence.justificationStatus}`;
      
      if (absence.justificationStatus === 'justified') {
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('icons/BadgeCheck.svg');
        img.alt = 'Igazolt';
        img.style.width = '16px';
        img.style.height = '16px';
        statusBadge.appendChild(img);
        statusBadge.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.justified')));
      } else if (absence.justificationStatus === 'unjustified') {
        const span = document.createElement('span');
        span.className = 'material-icons-round';
        span.textContent = 'cancel';
        statusBadge.appendChild(span);
        statusBadge.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.unjustified')));
      } else {
        const span = document.createElement('span');
        span.className = 'material-icons-round';
        span.textContent = 'pending';
        statusBadge.appendChild(span);
        statusBadge.appendChild(document.createTextNode(' ' + LanguageManager.t('absences.pending')));
      }
      
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);
      
      tbody.appendChild(row);
    });
  });
}

function setupEventListeners() {
  function setupMobileGrouping() {
    if (window.innerWidth <= 480) {
      createMobileGroups();
    } else {
      removeMobileGroups();
    }
  }

  window.addEventListener("resize", setupMobileGrouping);

  setupMobileGrouping();
}

function createMobileGroups() {
  const tbody = document.querySelector(".absences-table tbody");
  if (!tbody) return;

  removeMobileGroups();

  const rows = Array.from(tbody.querySelectorAll(".table-row"));
  const groupedRows = {};

  rows.forEach((row) => {
    const date = row.dataset.date;
    if (!groupedRows[date]) {
      groupedRows[date] = [];
    }
    groupedRows[date].push(row);
  });

  const sortedDates = Object.keys(groupedRows).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  sortedDates.forEach((date) => {
    const dateRows = groupedRows[date];

    const dateGroup = document.createElement("div");
    dateGroup.className = "date-group";

    const dateHeader = document.createElement("div");
    dateHeader.className = "date-group-header";
    dateHeader.textContent = date;

    const dateContent = document.createElement("div");
    dateContent.className = "date-group-content";

    dateRows.forEach((row) => {
      dateContent.appendChild(row);
    });

    dateGroup.appendChild(dateHeader);
    dateGroup.appendChild(dateContent);
    tbody.appendChild(dateGroup);
  });
}

function removeMobileGroups() {
  const tbody = document.querySelector(".absences-table tbody");
  if (!tbody) return;

  const dateGroups = tbody.querySelectorAll(".date-group");
  if (dateGroups.length === 0) return;

  const allRows = [];
  dateGroups.forEach((group) => {
    const rows = group.querySelectorAll(".table-row");
    rows.forEach((row) => allRows.push(row));
  });

  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  allRows.forEach((row) => tbody.appendChild(row));
}

function updateDateGroupsVisibility() {
  if (window.innerWidth > 480) return;

  const dateGroups = document.querySelectorAll(".date-group");

  dateGroups.forEach((group) => {
    const visibleRows = group.querySelectorAll(
      '.table-row[style=""], .table-row:not([style])',
    );

    if (visibleRows.length > 0) {
      group.style.display = "";
    } else {
      group.style.display = "none";
    }
  });
}

function setupFilters() {
  try {
    const filters = {
      dateFilter: document.getElementById("dateFilter"),
      subject: document.getElementById("subjectFilter"),
      justified: document.getElementById("justificationFilter"),
    };

    if (!filters.dateFilter || !filters.subject || !filters.justified) {
      console.warn("Some filter elements were not found in the DOM");
      return;
    }

    const filterAbsences = () => {
      try {
        const dateFilterValue = filters.dateFilter.value;
        const subject = filters.subject.value;
        const justified = filters.justified.value;
        const selectedDate = dateFilterValue ? new Date(dateFilterValue) : null;

        document.querySelectorAll(".table-row").forEach((row) => {
          const dateStr = row.dataset.date;
          const dateParts = dateStr.split(".");

          if (dateParts.length < 3) {
            console.error(`Invalid date format: ${dateStr}`);
            return;
          }

          const parsedYear = parseInt(dateParts[0].trim(), 10);
          const parsedMonth = parseInt(dateParts[1].trim(), 10) - 1;
          const parsedDay = parseInt(dateParts[2].trim(), 10);

          if (isNaN(parsedDay) || isNaN(parsedMonth) || isNaN(parsedYear)) {
            console.error(`Invalid date components: ${dateStr}`);
            return;
          }

          const rowDate = new Date(parsedYear, parsedMonth, parsedDay);

          let showRow = true;

          if (selectedDate) {
            if (
              rowDate.getFullYear() !== selectedDate.getFullYear() ||
              rowDate.getMonth() !== selectedDate.getMonth() ||
              rowDate.getDate() !== selectedDate.getDate()
            ) {
              showRow = false;
            }
          }

          if (subject && row.dataset.subject !== subject) {
            showRow = false;
          }

          if (justified) {
            const statusElement = row.querySelector(".status-badge");
            const hasStatus = statusElement.classList.contains(justified);
            if (!hasStatus) showRow = false;
          }

          row.style.display = showRow ? "" : "none";
        });

        updateDateGroupsVisibility();
        updateStatistics();
      } catch (err) {
        console.error("Error during filtering absences:", err);
      }
    };

    Object.values(filters).forEach((filter) => {
      try {
        if (filter) {
          filter.addEventListener("change", filterAbsences);
        }
      } catch (err) {
        if (
          err.message &&
          err.message.includes("Extension context invalidated")
        ) {
          console.warn(
            "Extension context invalidated during event listener setup",
          );
        } else {
          console.error("Error setting up filter event listener:", err);
        }
      }
    });

    filterAbsences();
  } catch (err) {
    if (err.message && err.message.includes("Extension context invalidated")) {
      console.warn("Extension context invalidated during filter setup");
    } else {
      console.error("Error setting up filters:", err);
    }
  }
}

function updateStatistics() {
  try {
    const visibleRows = document.querySelectorAll(
      '.table-row:not([style*="display: none"])',
    );
    const totalVisible = visibleRows.length;
    const justifiedVisible = Array.from(visibleRows).filter((row) =>
      row.querySelector(".status-badge.justified"),
    ).length;
    const unjustifiedVisible = Array.from(visibleRows).filter((row) =>
      row.querySelector(".status-badge.unjustified"),
    ).length;
    const pendingVisible = Array.from(visibleRows).filter((row) =>
      row.querySelector(".status-badge.pending"),
    ).length;

    const statCards = document.querySelectorAll(".stat-card");
    if (statCards[0])
      statCards[0].querySelector(".stat-number").textContent = totalVisible;
    if (statCards[1])
      statCards[1].querySelector(".stat-number").textContent = justifiedVisible;
    if (statCards[2])
      statCards[2].querySelector(".stat-number").textContent =
        unjustifiedVisible;
    if (statCards[3])
      statCards[3].querySelector(".stat-number").textContent = pendingVisible;
  } catch (err) {
    console.error("Error updating statistics:", err);
  }
}

if (window.location.href.includes("/Hianyzas/Hianyzasok")) {
  transformAbsencesPage().catch((error) => {
    console.error(LanguageManager.t("absences.page_transform_error"), error);
  });
}