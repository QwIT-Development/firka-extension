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

async function transformAbsencesPage() {
  const { basicData, absences, groupedAbsences } = await collectAbsencesData();

  document.body.innerHTML = `
    <div class="kreta-container">
      ${createTemplate.header()}

      <main class="kreta-main">
        <div class="filter-card">
          <div class="filter-header">
            <h2>${LanguageManager.t("absences.filter_title")}</h2>
          </div>
          <div class="filter-content">
            <div class="filter-group">
              <label>
                <img src="${chrome.runtime.getURL("icons/Calendar.svg")}" alt="Dátum" style="width: 24px; height: 24px;">
                ${LanguageManager.t("absences.date")}
              </label>
              <input type="date" id="dateFilter" class="filter-input">
            </div>
            <div class="filter-group">
              <label>
                <img src="${chrome.runtime.getURL("icons/Subject.svg")}" alt="Tantárgy" style="width: 24px; height: 24px;">
                ${LanguageManager.t("absences.subject")}
              </label>
              <select id="subjectFilter" class="filter-input">
                <option value="">${LanguageManager.t("absences.all_subjects")}</option>
                ${[...new Set(absences.map((a) => a.subject))]
                  .sort()
                  .map(
                    (subject) =>
                      `<option value="${subject}">${subject}</option>`,
                  )
                  .join("")}
              </select>
            </div>
            <div class="filter-group">
              <label>
                <img src="${chrome.runtime.getURL("icons/BadgeCheck.svg")}" alt="Igazolás" style="width: 24px; height: 24px;">
                ${LanguageManager.t("absences.justification")}
              </label>
              <select id="justificationFilter" class="filter-input">
                <option value="">${LanguageManager.t("absences.all_types")}</option>
                <option value="justified">${LanguageManager.t("absences.justified")}</option>
                <option value="unjustified">${LanguageManager.t("absences.unjustified")}</option>
                <option value="pending">${LanguageManager.t("absences.pending")}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="stats-overview">
          <div class="stat-card">
            <div class="stat-number">${absences.length}</div>
            <div class="stat-label">${LanguageManager.t("absences.total_absences")}</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${absences.filter((a) => a.justificationStatus === "justified").length}</div>
            <div class="stat-label">${LanguageManager.t("absences.justified")}</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${absences.filter((a) => a.justificationStatus === "unjustified").length}</div>
            <div class="stat-label">${LanguageManager.t("absences.unjustified")}</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${absences.filter((a) => a.justificationStatus === "pending").length}</div>
            <div class="stat-label">${LanguageManager.t("absences.pending")}</div>
          </div>
        </div>

        <div class="absences-container">
          <table class="absences-table">
            <thead class="table-header">
              <tr>
                <th>${LanguageManager.t("absences.date")}</th>
                <th>${LanguageManager.t("absences.lesson")}</th>
                <th>${LanguageManager.t("absences.subject")}</th>
                <th>${LanguageManager.t("absences.topic")}</th>
                <th>${LanguageManager.t("absences.status")}</th>
              </tr>
            </thead>
            <tbody>
              ${generateAbsencesHTML(absences)}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  `;

  
  setupUserDropdown();
  setupMobileNavigation();

  setupEventListeners();
  setupFilters();

  loadingScreen.hide();
}

function generateAbsencesHTML(absences) {
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

  let html = "";

  sortedDates.forEach((date) => {
    const dateAbsences = groupedByDate[date];

    html += `<tr class="date-group-divider" style="display: none;"></tr>`;

    dateAbsences.forEach((absence) => {
      html += `
        <tr class="table-row" 
            data-subject="${absence.subject}"
            data-justified="${absence.justified}"
            data-date="${absence.date}"
            data-date-group="${date}">
          <td class="table-cell date-cell" data-label="${LanguageManager.t("absences.date")}">
            ${absence.date}
          </td>
          <td class="table-cell lesson-cell" data-label="${LanguageManager.t("absences.lesson")}">
            ${absence.lesson}.
          </td>
          <td class="table-cell subject-cell" data-label="${LanguageManager.t("absences.subject")}">
            ${absence.subject}
          </td>
          <td class="table-cell topic-cell" data-label="${LanguageManager.t("absences.topic")}" title="${absence.topic}">
            ${absence.topic}
          </td>
          <td class="table-cell status-cell" data-label="${LanguageManager.t("absences.status")}">
            <span class="status-badge ${absence.justificationStatus}">
              ${
                absence.justificationStatus === "justified"
                  ? `<img src="${chrome.runtime.getURL("icons/BadgeCheck.svg")}" alt="Igazolt" style="width: 16px; height: 16px;"> ${LanguageManager.t("absences.justified")}`
                  : absence.justificationStatus === "unjustified"
                    ? `<span class="material-icons-round">cancel</span> ${LanguageManager.t("absences.unjustified")}`
                    : `<span class="material-icons-round">pending</span> ${LanguageManager.t("absences.pending")}`
              }
            </span>
          </td>
        </tr>
      `;
    });
  });

  return html;
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

  tbody.innerHTML = "";

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

  tbody.innerHTML = "";
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