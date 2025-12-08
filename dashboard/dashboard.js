const DashboardUtils = {
  formatGradeValue(value) {
    const trimmedValue = value?.trim() || "";
    if (trimmedValue.toLowerCase() === "szöveges") {
      return "Sz";
    }
    return trimmedValue;
  },

  parseDate(dateStr) {
    return dateStr?.trim() || "";
  },

  formatHungarianDate(dateStr) {
    if (!dateStr) return "";

    const dateParts = dateStr.trim().split(".");
    if (dateParts.length < 3) return dateStr;

    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);

    if (isNaN(month) || month < 1 || month > 12) return dateStr;

    if (typeof window.LanguageManager !== "undefined") {
      const monthKeys = [
        "months.january",
        "months.february",
        "months.march",
        "months.april",
        "months.may",
        "months.june",
        "months.july",
        "months.august",
        "months.september",
        "months.october",
        "months.november",
        "months.december",
      ];
      const monthName = window.LanguageManager.t(monthKeys[month - 1]);
      return `${monthName} ${day}.`;
    }

    const monthKeys = [
      "months.january",
      "months.february",
      "months.march",
      "months.april",
      "months.may",
      "months.june",
      "months.july",
      "months.august",
      "months.september",
      "months.october",
      "months.november",
      "months.december",
    ];

    return `${LanguageManager.t(monthKeys[month - 1])} ${day}.`;
  },
};

class DashboardDataManager {
  constructor() {
    this.dashboardData = {
      grades: [],
      absences: [],
      notes: [],
      upcomingExams: [],
      news: [],
    };
  }

  extractGradeData() {
    const gradeRows = document.querySelectorAll(
      "#legutobbiErtekelesek tr:not(:first-child)",
    );

    this.dashboardData.grades = Array.from(gradeRows)
      .map((row) => {
        const gradeValue = row.querySelector(
          'span[style*="font-size: 200%"]',
        )?.textContent;
        const gradeInfo = row.querySelector(
          'span[style*="float: right"]',
        )?.textContent;

        if (!gradeValue || !gradeInfo) return null;

        const [fullSubject, date] = gradeInfo
          .split("\n")
          .map((str) => str.trim());
        const { subject, type, dateInSubject } =
          this.parseSubjectInformation(fullSubject);

        return {
          value: DashboardUtils.formatGradeValue(gradeValue),
          subject,
          date: DashboardUtils.parseDate(date),
          type: type || LanguageManager.t("dashboard.evaluation"),
          dateInSubject: dateInSubject || null,
        };
      })
      .filter(Boolean);
  }

  parseSubjectInformation(fullSubject) {
    const hungarianMonths = [
      "január",
      "február",
      "március",
      "április",
      "május",
      "június",
      "július",
      "augusztus",
      "szeptember",
      "október",
      "november",
      "december",
    ];
    const monthPattern = hungarianMonths.join("|");
    const datePattern = new RegExp(`(${monthPattern})\\s+(\\d{1,2})\\.?$`, "i");
    const dateMatch = fullSubject.match(datePattern);

    if (dateMatch) {
      const subjectPart = fullSubject.substring(0, dateMatch.index).trim();
      const datePart = dateMatch[0].trim();
      return {
        subject: subjectPart,
        type: "",
        dateInSubject: datePart,
      };
    }

    const months = [
      LanguageManager.t("months.january"),
      LanguageManager.t("months.february"),
      LanguageManager.t("months.march"),
      LanguageManager.t("months.april"),
      LanguageManager.t("months.may"),
      LanguageManager.t("months.june"),
      LanguageManager.t("months.july"),
      LanguageManager.t("months.august"),
      LanguageManager.t("months.september"),
      LanguageManager.t("months.october"),
      LanguageManager.t("months.november"),
      LanguageManager.t("months.december"),
    ];
    const fallbackMonthPattern = new RegExp(months.join("|"), "i");
    const monthMatch = fullSubject.match(fallbackMonthPattern);

    if (monthMatch) {
      const monthIndex = fullSubject.lastIndexOf(monthMatch[0]);
      return {
        subject: fullSubject.substring(0, monthIndex).trim(),
        type: fullSubject.substring(monthIndex).trim(),
      };
    }

    return { subject: fullSubject, type: "" };
  }

  extractAbsenceData() {
    const absenceRows = document.querySelectorAll(
      "#legutobbiMulasztasok tr:not(:first-child)",
    );

    this.dashboardData.absences = Array.from(absenceRows)
      .map((row) => {
        const spans = row.querySelectorAll("span");
        if (spans.length < 4) return null;

        return {
          date: spans[0]?.textContent?.trim() || "",
          day: spans[2]?.textContent?.trim() || "",
          type: spans[1]?.textContent?.trim() || "",
          count: spans[3]?.textContent?.trim() || "",
        };
      })
      .filter(Boolean);
  }

  extractNoteData() {
    const noteRows = document.querySelectorAll(
      "#legutobbiFeljegyzesek tr:not(:first-child)",
    );

    this.dashboardData.notes = Array.from(noteRows)
      .map((row) => {
        const spans = row.querySelectorAll("span");
        if (spans.length < 3) return null;

        return {
          title: spans[0]?.textContent?.trim() || "",
          author: spans[1]?.textContent?.trim() || "",
          date: spans[2]?.textContent?.trim() || "",
        };
      })
      .filter(Boolean);
  }

  extractExamData() {
    const examRows = document.querySelectorAll(
      "#legutobbiBejelentettSzamonkeres tr:not(:first-child)",
    );

    this.dashboardData.upcomingExams = Array.from(examRows)
      .map((row) => {
        const spans = row.querySelectorAll("span");
        if (spans.length < 4) return null;

        return {
          date: spans[0]?.textContent?.trim() || "",
          subject: spans[1]?.textContent?.trim() || "",
          day: spans[2]?.textContent?.trim() || "",
          type: spans[3]?.textContent?.trim() || "",
        };
      })
      .filter(Boolean);
  }

  async extractNewsData() {
    try {
      const timestamp = Date.now();
      const apiUrl = `https://${window.location.hostname}/Intezmeny/Faliujsag/GetMoreEntries?startindex=0&range=10&_=${timestamp}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.FaliujsagElemek || !Array.isArray(data.FaliujsagElemek)) {
        return;
      }

      data.FaliujsagElemek.forEach((item, index) => {
        let formattedDate = "";
        if (item.DatumNap && item.DatumHonap && item.DatumEv) {
          formattedDate = `${item.DatumEv}. ${item.DatumHonap} ${item.DatumNap}.`;
        } else if (item.Idopont) {
          const match = item.Idopont.match(/\/Date\((\d+)\)\//);
          if (match) {
            const timestamp = parseInt(match[1]);
            const date = new Date(timestamp);
            formattedDate = date.toLocaleDateString("hu-HU");
          }
        }

        if (!formattedDate) {
          formattedDate = new Date().toLocaleDateString("hu-HU");
        }

        let cleanContent = item.EsemenySzovege || "";
        cleanContent = cleanContent.replace(/<[^>]*>/g, "");
        cleanContent = cleanContent.replace(/\r\n/g, " ");
        cleanContent = cleanContent.replace(/\s+/g, " ").trim();

        const newsItem = {
          title: item.EsemenyCime || `Hír ${index + 1}`,
          content: cleanContent || "Nincs elérhető tartalom",
          date: formattedDate,
          author: `${item.Nev || "Ismeretlen"} (${item.Munkakor || "Ismeretlen"})`,
        };

        this.dashboardData.news.push(newsItem);
      });
    } catch (error) {
      console.error("❌ Error fetching news from API:", error);
    }
  }

  async extractAllData() {
    this.extractGradeData();
    this.extractAbsenceData();
    this.extractNoteData();
    this.extractExamData();
    await this.extractNewsData();
    return this.dashboardData;
  }
}

class DashboardRenderer {
  constructor(data, settings = {}) {
    this.baseData = data;
    this.settings = settings;
  }

  async init() {
    this.data = {
      ...this.baseData,
      schoolInfo: {
        name:
          await storageManager.get("schoolName", "OM azonosító - Iskola neve"),
        id: await storageManager.get("schoolCode", ""),
      },
      userData: {
        name: await storageManager.get("userName", "Felhasználónév"),
        time:
          document.querySelector(".usermenu_timer")?.textContent?.trim() ||
          "45:00",
      },
    };
    this.schoolNameFull = `${this.data.schoolInfo.id} - ${this.data.schoolInfo.name}`;
    this.shortenedSchoolName = helper.shortenSchoolName(this.schoolNameFull);
  }

  generateMainContent() {
    const cards = [];
    
    if (!this.settings.hideGrades) {
      cards.push(this.createGradeCard());
    }
    if (!this.settings.hideAbsences) {
      cards.push(this.createAbsenceCard());
    }
    if (!this.settings.hideNotes) {
      cards.push(this.createNoteCard());
    }
    if (!this.settings.hideExams) {
      cards.push(this.createExamCard());
    }

    cards.push(this.createNewsCard());

    if (cards.length === 1) {
      cards.unshift(this.createGradeCard());
    }
    
    return `
      <main class="kreta-main">
        <div class="grid-container">
          ${cards.join('')}
        </div>
      </main>
    `;
  }
  createNewsCard() {
    const newsItems = this.data.news
      .map(
        (news) => `
      <div class="widget-item news-item">
        <div class="widget-row">
          <div class="widget-details news-details">
            <div class="widget-title news-title">${news.title}</div>
            <div class="widget-content news-content">${news.content}</div>
          </div>
          <div class="widget-meta">
            ${news.date ? `<div class="widget-date news-date">${news.date}</div>` : ""}
            ${news.author ? `<div class="widget-author news-author">${news.author}</div>` : ""}
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    return this.createCard(
      LanguageManager.t("dashboard.news"),
      newsItems || LanguageManager.t("dashboard.not_supported"),
      "/Intezmeny/Faliujsag",
      LanguageManager.t("dashboard.all_news"),
    );
  }

  createGradeCard() {
    const gradeItems = this.data.grades
      .map(
        (grade) => `
      <div class="widget-item grade-item">
        <div class="widget-row grade-row">
          <div class="grade grade-${grade.value}">${grade.value}</div>
          <div class="widget-details grade-details">
            <div class="widget-title subject-name">${grade.subject}</div>
            <div class="grade-type-with-date">
              <div class="widget-subtitle grade-type">${grade.type}</div>
              ${grade.dateInSubject || grade.date ? `<div class="widget-subtitle grade-date">${grade.dateInSubject || grade.date}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    return this.createCard(
      LanguageManager.t("dashboard.grades"),
      gradeItems,
      "/TanuloErtekeles/Osztalyzatok",
      LanguageManager.t("dashboard.all_grades"),
    );
  }

  createAbsenceCard() {
    const absenceItems = this.data.absences
      .map(
        (absence) => `
      <div class="widget-item absence-item">
        <div class="widget-row">
          <div class="widget-details absence-details">
            <div class="widget-title absence-type">${absence.type}</div>
            <div class="widget-subtitle absence-date">${absence.date}</div>
          </div>
          ${absence.day ? `<div class="widget-date">${absence.day}</div>` : ""}
        </div>
      </div>
    `,
      )
      .join("");

    return this.createCard(
      LanguageManager.t("dashboard.absences"),
      absenceItems,
      "/Hianyzas/Hianyzasok",
      LanguageManager.t("dashboard.all_absences"),
    );
  }

  createNoteCard() {
    const noteItems = this.data.notes
      .map(
        (note) => `
      <div class="widget-item note-item">
        <div class="widget-row">
          <div class="widget-details note-details">
            <div class="widget-title note-title">${note.title}</div>
            <div class="widget-subtitle note-date">${note.date}</div>
          </div>
          ${note.author ? `<div class="widget-author note-author">${note.author}</div>` : ""}
        </div>
      </div>
    `,
      )
      .join("");

    return this.createCard(
      LanguageManager.t("dashboard.notes"),
      noteItems,
      "/TanuloErtekeles/InformaciokFeljegyzesek",
      LanguageManager.t("dashboard.all_messages"),
    );
  }

  createExamCard() {
    const examItems = this.data.upcomingExams
      .map(
        (exam) => `
      <div class="widget-item exam-item">
        <div class="widget-row">
          <div class="widget-details exam-details">
            <div class="widget-title exam-subject">${exam.subject}</div>
            <div class="widget-subtitle exam-type">${exam.type || ""}</div>
          </div>
          <div class="widget-date exam-date">${DashboardUtils.formatHungarianDate(exam.date)}</div>
        </div>
      </div>
    `,
      )
      .join("");

    return this.createCard(
      LanguageManager.t("dashboard.exams"),
      examItems,
      "/Tanulo/TanuloBejelentettSzamonkeresek",
      LanguageManager.t("dashboard.all_exams"),
    );
  }

  createCard(title, content, linkHref, linkText) {
    return `
      <div class="widget-card card">
        <div class="widget-header">
          <h2 class="widget-card-title">${title}</h2>
        </div>
        <div class="widget-content card-content">
          ${content || `<div class="widget-empty">${LanguageManager.t("dashboard.not_supported")}</div>`}
        </div>
        <div class="widget-footer">
          <a href="${linkHref}" class="widget-link more-link">
            ${linkText}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
              <path d="M11.2997 5.19947L5.64282 5.19947M11.2997 5.19947L11.2997 10.8563M11.2997 5.19947L4.70001 11.7991" stroke="var(--accent-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    `;
  }

  async render() {
    await this.init();
    document.body.innerHTML = '';
    
    const kretaContainer = document.createElement('div');
    kretaContainer.className = 'kreta-container';
    const headerDiv = document.createElement('div');
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(await createTemplate.header(), 'text/html');
    const headerContent = headerDoc.body;
    while (headerContent.firstChild) {
      headerDiv.appendChild(headerContent.firstChild);
    }
    kretaContainer.appendChild(headerDiv);
    const mainContentDiv = document.createElement('div');
    const parser2 = new DOMParser();
    const mainDoc = parser2.parseFromString(this.generateMainContent(), 'text/html');
    const mainContent = mainDoc.body;
    while (mainContent.firstChild) {
      mainContentDiv.appendChild(mainContent.firstChild);
    }
    kretaContainer.appendChild(mainContentDiv);
    
    document.body.appendChild(kretaContainer);
    
    setupUserDropdown();
  }
}

class DashboardApplication {
  constructor() {
    this.init();
  }

  async loadBulletinSettings() {
    try {
      const settings = await storageManager.get("pageSettings_bulletin", {});
      return {
        hideGrades: settings.hideGrades || false,
        hideAbsences: settings.hideAbsences || false,
        hideNotes: settings.hideNotes || false,
        hideExams: settings.hideExams || false
      };
    } catch (error) {
      console.error("Error loading bulletin settings:", error);
      return {
        hideGrades: false,
        hideAbsences: false,
        hideNotes: false,
        hideExams: false
      };
    }
  }

  async init() {
    if (!window.location.href.includes("/Intezmeny/Faliujsag")) {
      return;
    }

    while (
      typeof window.LanguageManager === "undefined" ||
      !window.LanguageManager.t("dashboard.grades") ||
      window.LanguageManager.t("dashboard.grades") === "dashboard.grades"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    while (!document.querySelector(".faliujsag-lista, #faliujsagLista")) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    let newsItemsFound = false;
    let attempts = 0;
    const maxAttempts = 50;

    while (!newsItemsFound && attempts < maxAttempts) {
      const newsContainer = document.querySelector(
        ".faliujsag-lista, #faliujsagLista",
      );
      if (newsContainer) {
        const possibleSelectors = [
          ".nb-item",
          ".news-item",
          ".faliujsag-item",
          ".list-group-item",
          "li",
          'div[class*="item"]',
          'div[class*="news"]',
        ];

        for (const selector of possibleSelectors) {
          const items = newsContainer.querySelectorAll(selector);
          if (items.length > 0) {
            newsItemsFound = true;
            break;
          }
        }

        if (!newsItemsFound) {
          if (
            newsContainer.children.length > 0 ||
            newsContainer.textContent.trim().length > 0
          ) {
            newsItemsFound = true;
          }
        }
      }

      if (!newsItemsFound) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    try {
      const dataManager = new DashboardDataManager();
      const dashboardData = await dataManager.extractAllData();
      const bulletinSettings = await this.loadBulletinSettings();
      
      const renderer = new DashboardRenderer(dashboardData, bulletinSettings);
      await renderer.render();
    } catch (error) {
      console.error("Error initializing dashboard:", error);
    }
  }
}

new DashboardApplication();
