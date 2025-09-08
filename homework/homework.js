async function fetchHomeworkData() {
  try {
    const currentDomain = window.location.hostname;
    const apiUrl = `https://${currentDomain}/api/TanuloHaziFeladatApi/GetTanulotHaziFeladatGrid?sort=HaziFeladatHatarido-asc&page=1&pageSize=100&group=&filter=&data=%7B%22RegiHaziFeladatokElrejtese%22%3Afalse%7D&_=${Date.now()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching homework data:", error);
    return { Data: [], Total: 0 };
  }
}

async function collectHomeworkData() {
  const apiData = await fetchHomeworkData();

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

  const homeworkItems = [];

  if (apiData.Data && Array.isArray(apiData.Data)) {
    apiData.Data.forEach((item) => {
      homeworkItems.push({
        id: item.ID,
        subject: item.TantargyNev || "",
        teacher: item.TanarNeve || "",
        description: item.HaziFeladatSzoveg || "",
        createdDate: formatApiDate(item.HaziFeladatRogzitesDatuma),
        deadline: formatApiDate(item.HaziFeladatHatarido),
        completed: item.MegoldottHF_BOOL || false,
        classGroup: item.OsztalyCsoport || "",
      });
    });
  }

  const groupedHomework = {};
  homeworkItems.forEach((homework) => {
    const deadlineDate = homework.deadline.split(" ")[0];
    if (!groupedHomework[deadlineDate]) {
      groupedHomework[deadlineDate] = [];
    }
    groupedHomework[deadlineDate].push(homework);
  });

  return { basicData, homeworkItems, groupedHomework };
}

function formatApiDate(dateString) {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const dayNames = [
      LanguageManager.t("common.sunday"),
      LanguageManager.t("common.monday"),
      LanguageManager.t("common.tuesday"),
      LanguageManager.t("common.wednesday"),
      LanguageManager.t("common.thursday"),
      LanguageManager.t("common.friday"),
      LanguageManager.t("common.saturday"),
    ];
    const dayName = dayNames[date.getDay()];

    return `${month}.${day}. (${dayName})`;
  } catch (error) {
    return dateString;
  }
}

function isTomorrow(dateStr) {
  if (!dateStr) return false;

  const parts = dateStr.split(".");
  if (parts.length < 3) return false;

  const year = parseInt(parts[0].trim());
  const month = parseInt(parts[1].trim()) - 1;
  const day = parseInt(parts[2].trim());

  const homeworkDate = new Date(year, month, day);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  return homeworkDate >= tomorrow && homeworkDate < dayAfterTomorrow;
}

async function transformHomeworkPage() {
  const { basicData, homeworkItems, groupedHomework } =
    await collectHomeworkData();

  // Biztonságos DOM létrehozás innerHTML helyett
  document.body.innerHTML = '';
  
  // Fő konténer létrehozása
  const kretaContainer = document.createElement('div');
  kretaContainer.className = 'kreta-container';
  
  // Header hozzáadása
  const headerDiv = document.createElement('div');
  // Biztonságos HTML parsing DOMParser használatával
  const parser = new DOMParser();
  const headerDoc = parser.parseFromString(createTemplate.header(), 'text/html');
  const headerContent = headerDoc.body;
  while (headerContent.firstChild) {
    headerDiv.appendChild(headerContent.firstChild);
  }
  kretaContainer.appendChild(headerDiv);
  
  // Main elem létrehozása
  const main = document.createElement('main');
  main.className = 'kreta-main';
  
  // Filter card létrehozása
  const filterCard = document.createElement('div');
  filterCard.className = 'filter-card';
  
  const filterHeader = document.createElement('div');
  filterHeader.className = 'filter-header';
  const filterTitle = document.createElement('h2');
  filterTitle.textContent = LanguageManager.t('homework.filter_title');
  filterHeader.appendChild(filterTitle);
  
  const filterContent = document.createElement('div');
  filterContent.className = 'filter-content';
  
  // Subject filter
  const subjectGroup = document.createElement('div');
  subjectGroup.className = 'filter-group';
  const subjectLabel = document.createElement('label');
  subjectLabel.textContent = LanguageManager.t('homework.subject');
  const subjectSelect = document.createElement('select');
  subjectSelect.id = 'subjectFilter';
  
  const allSubjectsOption = document.createElement('option');
  allSubjectsOption.value = '';
  allSubjectsOption.textContent = LanguageManager.t('homework.all_subjects');
  subjectSelect.appendChild(allSubjectsOption);
  
  [...new Set(homeworkItems.map((item) => item.subject))]
    .sort()
    .forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });
  
  subjectGroup.appendChild(subjectLabel);
  subjectGroup.appendChild(subjectSelect);
  
  // Teacher filter
  const teacherGroup = document.createElement('div');
  teacherGroup.className = 'filter-group';
  const teacherLabel = document.createElement('label');
  teacherLabel.textContent = LanguageManager.t('homework.teacher');
  const teacherSelect = document.createElement('select');
  teacherSelect.id = 'teacherFilter';
  
  const allTeachersOption = document.createElement('option');
  allTeachersOption.value = '';
  allTeachersOption.textContent = LanguageManager.t('homework.all_teachers');
  teacherSelect.appendChild(allTeachersOption);
  
  [...new Set(homeworkItems.map((item) => item.teacher))]
    .sort()
    .forEach((teacher) => {
      const option = document.createElement('option');
      option.value = teacher;
      option.textContent = teacher;
      teacherSelect.appendChild(option);
    });
  
  teacherGroup.appendChild(teacherLabel);
  teacherGroup.appendChild(teacherSelect);
  
  // Deadline filter
  const deadlineGroup = document.createElement('div');
  deadlineGroup.className = 'filter-group';
  const deadlineLabel = document.createElement('label');
  deadlineLabel.textContent = LanguageManager.t('homework.due_date');
  const deadlineSelect = document.createElement('select');
  deadlineSelect.id = 'deadlineFilter';
  
  const deadlineOptions = [
    { value: '', text: LanguageManager.t('homework.all_deadlines') },
    { value: 'tomorrow', text: LanguageManager.t('homework.tomorrow_deadline') },
    { value: 'thisWeek', text: LanguageManager.t('homework.this_week') },
    { value: 'nextWeek', text: LanguageManager.t('homework.next_week') }
  ];
  
  deadlineOptions.forEach(({ value, text }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    deadlineSelect.appendChild(option);
  });
  
  deadlineGroup.appendChild(deadlineLabel);
  deadlineGroup.appendChild(deadlineSelect);
  
  filterContent.appendChild(subjectGroup);
  filterContent.appendChild(teacherGroup);
  filterContent.appendChild(deadlineGroup);
  
  filterCard.appendChild(filterHeader);
  filterCard.appendChild(filterContent);
  
  // Stats overview
  const statsOverview = document.createElement('div');
  statsOverview.className = 'stats-overview';
  statsOverview.id = 'statsOverview';
  
  const statCards = [
    { id: 'totalHomework', label: LanguageManager.t('homework.total_homework'), className: '' },
    { id: 'urgentHomework', label: LanguageManager.t('homework.urgent_homework'), className: 'urgent' },
    { id: 'completedHomework', label: LanguageManager.t('homework.completed_homework'), className: 'completed' },
    { id: 'pendingHomework', label: LanguageManager.t('homework.pending_homework'), className: '' }
  ];
  
  statCards.forEach(({ id, label, className }) => {
    const statCard = document.createElement('div');
    statCard.className = `stat-card ${className}`.trim();
    
    const statNumber = document.createElement('div');
    statNumber.className = 'stat-number';
    statNumber.id = id;
    statNumber.textContent = '0';
    
    const statLabel = document.createElement('div');
    statLabel.className = 'stat-label';
    statLabel.textContent = label;
    
    statCard.appendChild(statNumber);
    statCard.appendChild(statLabel);
    statsOverview.appendChild(statCard);
  });
  
  // Homework container
  const homeworkContainer = document.createElement('div');
  homeworkContainer.className = 'homework-container';
  
  const homeworkTable = document.createElement('table');
  homeworkTable.className = 'homework-table';
  homeworkTable.id = 'homeworkTable';
  
  const thead = document.createElement('thead');
  thead.className = 'table-header';
  const headerRow = document.createElement('tr');
  
  const headers = [
    LanguageManager.t('homework.due_date'),
    LanguageManager.t('homework.subject'),
    LanguageManager.t('homework.description'),
    LanguageManager.t('homework.teacher'),
    LanguageManager.t('homework.status')
  ];
  
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  
  const tbody = document.createElement('tbody');
  tbody.id = 'homeworkTableBody';
  
  // Biztonságos HTML tartalom hozzáadása
  const homeworkHTML = generateHomeworkHTML(homeworkItems);
  
  if (homeworkHTML.trim()) {
    // Biztonságos HTML parsing DOMParser használatával - table kontextusban
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<table><tbody>${homeworkHTML}</tbody></table>`, 'text/html');
    const tempTbody = doc.querySelector('tbody');
    while (tempTbody.firstChild) {
      tbody.appendChild(tempTbody.firstChild);
    }
  } else {
    // Ha nincs házi feladat, üres sor hozzáadása
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.textContent = LanguageManager.t('homework.no_homework') || 'Nincs házi feladat';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '20px';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  }
  
  homeworkTable.appendChild(thead);
  homeworkTable.appendChild(tbody);
  homeworkContainer.appendChild(homeworkTable);
  
  // Összeállítás
  main.appendChild(filterCard);
  main.appendChild(statsOverview);
  main.appendChild(homeworkContainer);
  
  kretaContainer.appendChild(main);
  document.body.appendChild(kretaContainer);

  setupFilters(homeworkItems, groupedHomework);
  setupUserDropdown();
  setupMobileNavigation();
  setupMobileGrouping();
  updateStatistics();
  loadingScreen.hide();
}

function generateHomeworkHTML(homeworkItems) {
  const sortedHomework = homeworkItems.sort((a, b) => {
    const dateA = new Date(
      a.deadline.split(" ")[0].split(".").reverse().join("-"),
    );
    const dateB = new Date(
      b.deadline.split(" ")[0].split(".").reverse().join("-"),
    );
    return dateA - dateB;
  });

  return sortedHomework
    .map((homework) => {
      const isUrgent = isTomorrow(homework.deadline);
      const status = homework.completed
        ? "completed"
        : isUrgent
          ? "urgent"
          : "pending";
      const statusText = homework.completed
        ? LanguageManager.t("homework.completed")
        : isUrgent
          ? LanguageManager.t("homework.urgent")
          : LanguageManager.t("homework.pending");

      return `
      <tr class="table-row ${isUrgent ? "due-tomorrow" : ""}" 
          data-subject="${homework.subject}" 
          data-teacher="${homework.teacher}"
          data-deadline="${homework.deadline}">
        <td class="table-cell date-cell" data-label="${LanguageManager.t("homework.due_date")}:">${homework.deadline}</td>
        <td class="table-cell subject-cell" data-label="${LanguageManager.t("homework.subject")}:">${homework.subject}</td>
        <td class="table-cell description-cell" data-label="${LanguageManager.t("homework.description")}:">${homework.description}</td>
        <td class="table-cell teacher-cell" data-label="${LanguageManager.t("homework.teacher")}:">${homework.teacher}</td>
        <td class="table-cell status-cell" data-label="${LanguageManager.t("homework.status")}:">
          <span class="status-badge ${status}">${statusText}</span>
        </td>
      </tr>
    `;
    })
    .join("");
}

function formatDateHeader(dateStr) {
  if (!dateStr) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const parts = dateStr.split(".");
  if (parts.length < 2) return dateStr;

  const month = parseInt(parts[0].trim()) - 1;
  const day = parseInt(parts[1].trim());
  const currentYear = today.getFullYear();

  const date = new Date(currentYear, month, day);

  if (date.toDateString() === today.toDateString()) {
    return LanguageManager.t("common.today") + " - " + dateStr;
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return LanguageManager.t("common.tomorrow") + " - " + dateStr;
  }

  const weekdays = [
    LanguageManager.t("common.sunday"),
    LanguageManager.t("common.monday"),
    LanguageManager.t("common.tuesday"),
    LanguageManager.t("common.wednesday"),
    LanguageManager.t("common.thursday"),
    LanguageManager.t("common.friday"),
    LanguageManager.t("common.saturday"),
  ];
  return `${weekdays[date.getDay()]} - ${dateStr}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return dateStr;
}

function setupFilters(homeworkItems, groupedHomework) {
  const subjectFilter = document.getElementById("subjectFilter");
  const teacherFilter = document.getElementById("teacherFilter");
  const deadlineFilter = document.getElementById("deadlineFilter");

  const applyFilters = () => {
    const selectedSubject = subjectFilter.value;
    const selectedTeacher = teacherFilter.value;
    const selectedDeadline = deadlineFilter.value;

    const tableRows = document.querySelectorAll(".table-row");

    tableRows.forEach((row) => {
      const subject = row.getAttribute("data-subject");
      const teacher = row.getAttribute("data-teacher");
      const deadline = row.getAttribute("data-deadline");

      let showRow = true;

      if (selectedSubject && subject !== selectedSubject) {
        showRow = false;
      }

      if (selectedTeacher && teacher !== selectedTeacher) {
        showRow = false;
      }

      if (selectedDeadline) {
        const parts = deadline.split(" ")[0].split(".");
        if (parts.length >= 2) {
          const month = parseInt(parts[0].trim()) - 1;
          const day = parseInt(parts[1].trim());
          const currentYear = new Date().getFullYear();
          const date = new Date(currentYear, month, day);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const startOfWeek = new Date(today);
          const dayOfWeek = today.getDay() || 7;
          startOfWeek.setDate(today.getDate() - dayOfWeek + 1);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          const startOfNextWeek = new Date(endOfWeek);
          startOfNextWeek.setDate(endOfWeek.getDate() + 1);

          const endOfNextWeek = new Date(startOfNextWeek);
          endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

          if (
            selectedDeadline === "tomorrow" &&
            date.toDateString() !== tomorrow.toDateString()
          ) {
            showRow = false;
          } else if (
            selectedDeadline === "thisWeek" &&
            (date < startOfWeek || date > endOfWeek)
          ) {
            showRow = false;
          } else if (
            selectedDeadline === "nextWeek" &&
            (date < startOfNextWeek || date > endOfNextWeek)
          ) {
            showRow = false;
          }
        }
      }

      row.style.display = showRow ? "" : "none";
    });

    updateDateGroupsVisibility();
    updateStatistics();
  };

  const resetFilters = () => {
    subjectFilter.value = "";
    teacherFilter.value = "";
    deadlineFilter.value = "";

    document.querySelectorAll(".table-row").forEach((row) => {
      row.style.display = "";
    });

    updateDateGroupsVisibility();
    updateStatistics();
  };

  subjectFilter.addEventListener("change", applyFilters);
  teacherFilter.addEventListener("change", applyFilters);
  deadlineFilter.addEventListener("change", applyFilters);
}

function updateStatistics() {
  const visibleRows = document.querySelectorAll(
    '.table-row:not([style*="display: none"])',
  );

  let totalCount = 0;
  let urgentCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  visibleRows.forEach((row) => {
    totalCount++;

    if (row.classList.contains("due-tomorrow")) {
      urgentCount++;
    }

    const statusBadge = row.querySelector(".status-badge");
    if (statusBadge) {
      if (statusBadge.classList.contains("completed")) {
        completedCount++;
      } else if (statusBadge.classList.contains("pending")) {
        pendingCount++;
      }
    }
  });

  document.getElementById("totalHomework").textContent = totalCount;
  document.getElementById("urgentHomework").textContent = urgentCount;
  document.getElementById("completedHomework").textContent = completedCount;
  document.getElementById("pendingHomework").textContent = pendingCount;
}

function setupMobileGrouping() {
  function handleResize() {
    if (window.innerWidth <= 480) {
      createMobileGroups();
    } else {
      removeMobileGroups();
    }
  }

  window.addEventListener("resize", handleResize);
  handleResize();
}

function createMobileGroups() {
  const tableBody = document.getElementById("homeworkTableBody");
  const rows = Array.from(tableBody.querySelectorAll(".table-row"));

  if (rows.length === 0) return;

  const groupedByDate = {};

  rows.forEach((row) => {
    const deadline = row.getAttribute("data-deadline");
    const dateKey = deadline.split(" ")[0];

    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(row);
  });

  tableBody.innerHTML = "";

  Object.keys(groupedByDate)
    .sort()
    .forEach((date) => {
      const dateGroup = document.createElement("div");
      dateGroup.className = "date-group";
      dateGroup.setAttribute("data-date", date);

      const header = document.createElement("div");
      header.className = "date-group-header";
      header.textContent = formatDateHeader(date);

      const content = document.createElement("div");
      content.className = "date-group-content";

      groupedByDate[date].forEach((row) => {
        content.appendChild(row);
      });

      dateGroup.appendChild(header);
      dateGroup.appendChild(content);
      tableBody.appendChild(dateGroup);
    });
}

function removeMobileGroups() {
  const tableBody = document.getElementById("homeworkTableBody");
  const dateGroups = tableBody.querySelectorAll(".date-group");

  if (dateGroups.length === 0) return;

  const allRows = [];
  dateGroups.forEach((group) => {
    const rows = group.querySelectorAll(".table-row");
    rows.forEach((row) => allRows.push(row));
  });

  tableBody.innerHTML = "";
  allRows.forEach((row) => tableBody.appendChild(row));
}

function updateDateGroupsVisibility() {
  const dateGroups = document.querySelectorAll(".date-group");

  dateGroups.forEach((group) => {
    const visibleRows = group.querySelectorAll(
      '.table-row:not([style*="display: none"])',
    );
    group.style.display = visibleRows.length > 0 ? "block" : "none";
  });
}

if (window.location.href.includes("/Tanulo/TanuloHaziFeladat")) {
  transformHomeworkPage().catch((error) => {
    console.error("Error transforming homework page:", error);
  });
}
