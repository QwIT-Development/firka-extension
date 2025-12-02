(() => {
  async function transformGradesPage() {
    try {
      const tanuloIdElement = document.querySelector("#TanuloId");
      const tanuloId = tanuloIdElement ? tanuloIdElement.value : "772481";

      const gradesData = await fetchGradesFromAPI(tanuloId);
      const studentAverage = calculateOverallAverage(gradesData.subjects);
      const classAverage = calculateOverallClassAverage(gradesData.subjects);

      window.currentGradesData = gradesData;
      document.body.innerHTML = '';
      const parser = new DOMParser();
      const doc = parser.parseFromString(await generatePageHTML(
        gradesData,
        studentAverage,
        classAverage,
      ), 'text/html');
      const tempDiv = doc.body;
      while (tempDiv.firstChild) {
        document.body.appendChild(tempDiv.firstChild);
      }

      
      setupUserDropdown();

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("grades/chart.js");
      document.head.appendChild(script);

      script.onload = () => {
        setupGradesChart(gradesData.subjects);
      };

      setupEventListeners();
      setupGradesListScrolling();
      loadingScreen.hide();
    } catch (error) {
      console.error("Error loading grades:", error);
      loadingScreen.hide();
    }
  }

  async function fetchGradesFromAPI(tanuloId) {
    try {
      const currentDomain = window.location.origin;
      const apiUrl = `${currentDomain}/api/TanuloErtekelesByTanuloApi/GetTanuloErtekelesByTanuloGridTanuloView?sort=&group=&filter=&data=%7B%22tanuloId%22%3A%22${tanuloId}%22%2C%22oktatasiNevelesiFeladatId%22%3A%227895%22%2C%22isOsztalyAtlagMegjelenik%22%3A%22True%22%7D&_=${Date.now()}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return await processAPIGradesData(data);
    } catch (error) {
      console.error("Error fetching grades from API:", error);
      return await extractGradesDataFromDOM();
    }
  }

  async function processAPIGradesData(apiData) {
    const subjects = [];

    if (!apiData.Data || !Array.isArray(apiData.Data)) {
      return {
        schoolInfo: {
          id: await storageManager.get("schoolCode", ""),
          name: await storageManager.get("schoolName", "OM azonosító - Iskola neve"),
        },
        userData: {
          name: await storageManager.get("userName", "Felhasználónév"),
          time:
            document.querySelector(".usermenu_timer")?.textContent?.trim() ||
            "45:00",
        },
        subjects: [],
      };
    }

    apiData.Data.forEach((subject) => {
      if (
        subject.TantargyNev &&
        subject.TantargyNev !== "Magatartás/Szorgalom"
      ) {
        const grades = [];
        const monthFields = [
          "Szeptember",
          "Oktober",
          "November",
          "December",
          "JanuarI",
          "I",
          "JanuarII",
          "Februar",
          "Marcius",
          "Aprilis",
          "Majus",
          "Junius",
          "Julius",
          "Augusztus",
          "II",
        ];

        monthFields.forEach((month) => {
          const monthData = subject[month];
          if (monthData && monthData.trim() !== "") {
            const gradeMatches = monthData.match(
              /<span[^>]*data-tanuloertekelesid[^>]*>([^<]+)<\/span>/g,
            );
            if (gradeMatches) {
              gradeMatches.forEach((gradeHtml) => {
                const gradeValue = gradeHtml
                  .match(/>([^<]+)<\/span>/)?.[1]
                  ?.trim();
                if (
                  gradeValue &&
                  gradeValue !== "-" &&
                  !gradeValue.includes("%")
                ) {
                  const dateMatch = gradeHtml.match(/data-datum='([^']*)'/);
                  const typeMatch = gradeHtml.match(/data-tipusmod='([^']*)'/);
                  const themeMatch = gradeHtml.match(
                    /data-ertekelestema='([^']*)'/,
                  );
                  const weightMatch = gradeHtml.match(/data-suly='([^']*)'/);
                  const teacherMatch = gradeHtml.match(
                    /data-ertekelonyomtatasinev='([^']*)'/,
                  );

                  const theme = themeMatch
                    ? themeMatch[1]
                        .replace("Téma: ", "")
                        .replace(/&#\d+;/g, (match) => {
                          const code = match.match(/\d+/)[0];
                          return String.fromCharCode(code);
                        })
                    : "";

                  const teacher = teacherMatch
                    ? teacherMatch[1].replace(/&#\d+;/g, (match) => {
                        const code = match.match(/\d+/)[0];
                        return String.fromCharCode(code);
                      })
                    : "";

                  const type = typeMatch
                    ? typeMatch[1].replace(/&#\d+;/g, (match) => {
                        const code = match.match(/\d+/)[0];
                        return String.fromCharCode(code);
                      })
                    : "";

                  grades.push({
                    value: gradeValue,
                    date: dateMatch ? dateMatch[1] : "",
                    type: type,
                    theme: theme,
                    weight: weightMatch ? weightMatch[1] : "",
                    teacher: teacher,
                    isSemesterGrade:
                      type.toLowerCase().includes("félévi") ||
                      theme.toLowerCase().includes("félévi"),
                    isYearEndGrade:
                      type.toLowerCase().includes("évvégi") ||
                      theme.toLowerCase().includes("évvégi") ||
                      type.toLowerCase().includes("év végi") ||
                      theme.toLowerCase().includes("év végi"),
                  });
                }
              });
            }
          }
        });

        if (grades.length > 0) {
          subjects.push({
            name: subject.TantargyNev,
            grades: grades,
            average: subject.Atlag || 0,
            classAverage: subject.OsztalyAtlag || 0,
          });
        }
      }
    });

    return {
      schoolInfo: {
        id: await storageManager.get("schoolCode", ""),
        name: await storageManager.get("schoolName", "Iskola"),
      },
      userData: {
        name: await storageManager.get("userName", "Felhasználó"),
        time:
          document.querySelector(".usermenu_timer")?.textContent?.trim() ||
          "45:00",
      },
      subjects: subjects,
    };
  }

  async function extractGradesDataFromDOM() {
    const subjects = [];
    const rows = document.querySelectorAll(
      "#Osztalyzatok_7895TanuloErtekelesByTanuloGrid tbody tr",
    );

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 17) {
        const subjectName = cells[2].textContent.trim();
        if (subjectName && subjectName !== "Magatartás/Szorgalom") {
          const grades = [];
          const months = [
            LanguageManager.t("grades.september"),
            LanguageManager.t("grades.october"),
            LanguageManager.t("grades.november"),
            LanguageManager.t("grades.december"),
            LanguageManager.t("grades.january_1"),
            LanguageManager.t("grades.january_2"),
            LanguageManager.t("grades.february"),
            LanguageManager.t("grades.march"),
            LanguageManager.t("grades.april"),
            LanguageManager.t("grades.may"),
            LanguageManager.t("grades.june_1"),
            LanguageManager.t("grades.june_2"),
          ];

          months.forEach((month, index) => {
            const gradeElements = cells[index + 3].querySelectorAll(
              "span[data-tanuloertekelesid]",
            );
            gradeElements.forEach((element) => {
              const gradeText = element.textContent.trim();
              if (gradeText && gradeText !== "-" && !gradeText.includes("%")) {
                const type = element.getAttribute("data-tipusmod") || "";
                const theme = element.getAttribute("data-ertekelestema") || "";
                const dataType = element.getAttribute("data-tipus") || "";

                grades.push({
                  value: gradeText,
                  date: element.getAttribute("data-datum"),
                  type: type,
                  theme: theme.replace("Téma: ", ""),
                  weight: element.getAttribute("data-suly"),
                  teacher: element.getAttribute("data-ertekelonyomtatasinev"),
                  isSemesterGrade:
                    type.toLowerCase().includes("félévi") ||
                    theme.toLowerCase().includes("félévi") ||
                    dataType.toLowerCase().includes("félévi"),
                  isYearEndGrade:
                    type.toLowerCase().includes("évvégi") ||
                    theme.toLowerCase().includes("évvégi") ||
                    type.toLowerCase().includes("év végi") ||
                    theme.toLowerCase().includes("év végi") ||
                    dataType.toLowerCase().includes("évvégi") ||
                    dataType.toLowerCase().includes("év végi"),
                });
              }
            });
          });

          const avgText = cells[16].textContent.trim();
          const classAvgText = cells[17].textContent.trim();

          const average =
            avgText !== "-" ? parseFloat(avgText.replace(",", ".")) : 0;
          const classAvg =
            classAvgText !== "-"
              ? parseFloat(classAvgText.replace(",", "."))
              : 0;

          if (grades.length > 0) {
            subjects.push({
              name: subjectName,
              grades: grades,
              average: average || 0,
              classAverage: classAvg || 0,
            });
          }
        }
      }
    });

    return {
      schoolInfo: {
        id: await storageManager.get("schoolCode", ""),
        name: await storageManager.get("schoolName", "Iskola"),
      },
      userData: {
        name: await storageManager.get("userName", "Felhasználó"),
        time:
          document.querySelector(".usermenu_timer")?.textContent?.trim() ||
          "45:00",
      },
      subjects: subjects,
    };
  }

  function calculateOverallAverage(subjects) {
    const validSubjects = subjects.filter((s) => s.average > 0);
    if (validSubjects.length === 0) return 0;

    return (
      validSubjects.reduce((sum, s) => sum + s.average, 0) /
      validSubjects.length
    );
  }

  function calculateOverallClassAverage(subjects) {
    const validSubjects = subjects.filter((s) => s.classAverage > 0);
    if (validSubjects.length === 0) return 0;
    return (
      validSubjects.reduce((sum, s) => sum + s.classAverage, 0) /
      validSubjects.length
    );
  }

  function shortenEvaluationName(name, maxLength = 30) {
    if (!name) return "";
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + "...";
  }

  function generateGradeItem(grade) {
    const semesterClass = grade.isSemesterGrade ? "semester-grade" : "";
    const yearEndClass = grade.isYearEndGrade ? "year-end-grade" : "";
    const dateObj = new Date(grade.date);
    const monthNames = [
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
    const formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
    const shortenedTheme = shortenEvaluationName(grade.theme);
    return `
      <div class="grade-item grade-${grade.value} ${semesterClass} ${yearEndClass}">
        <div class="grade-value">${grade.value}</div>
        <div class="grade-details">
          <div class="grade-theme" title="${grade.theme}">${shortenedTheme}</div>
          <div class="grade-meta">${grade.type}</div>
        </div>
        <div class="grade-date">${formattedDate}</div>
      </div>
    `;
  }

  function calculateGradeDistribution(subjects) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    subjects.forEach((subject) => {
      subject.grades.forEach((grade) => {
        const value = parseInt(grade.value);
        if (value >= 1 && value <= 5 && !grade.value.includes("%")) {
          distribution[value]++;
        }
      });
    });
    return distribution;
  }

  async function generatePageHTML(data, studentAverage, classAverage) {
    const totalGrades = data.subjects.reduce(
      (sum, subject) => sum + subject.grades.length,
      0,
    );
    const gradeDistribution = calculateGradeDistribution(data.subjects);
    const semesterGrades = extractSemesterGrades(data.subjects);
    const yearEndGrades = extractYearEndGrades(data.subjects);

    const studentGradeLevel = Math.floor(studentAverage) || 0;
    const classGradeLevel = Math.floor(classAverage) || 0;

    schoolNameFull = `${data.schoolInfo.id} - ${data.schoolInfo.name}`;
    shortenedSchoolName = helper.shortenSchoolName(schoolNameFull);

    return `
      <div class="kreta-container">
        ${await createTemplate.header()}

        <main class="kreta-main">
          <div class="grades-overview">
            <div class="overall-averages card">
              <div class="chart-header">
                <div class="chart-title">${LanguageManager.t("grades.chart_title")} (${totalGrades}db)</div>
                <div class="chart-averages">
                  <div class="average-circle my-average" data-grade="${studentGradeLevel}">
                    <span class="average-value ${studentAverage < 2 && studentAverage > 0 ? "warning" : ""}">${studentAverage > 0 ? studentAverage.toFixed(2) : "-"}</span>
                  </div>
                  ${
                    classAverage > 0
                      ? `
                  <div class="average-circle class-average" data-grade="${classGradeLevel}">
                    <span class="average-value">${classAverage.toFixed(2)}</span>
                  </div>
                  `
                      : ""
                  }
                </div>
              </div>
              <div class="grades-chart">
                <canvas id="gradesChart"></canvas>
              </div>
              <div class="grade-distribution">
                ${Object.entries(gradeDistribution)
                  .map(
                    ([grade, count]) => `
                    <div class="grade-count grade-${grade}">
                      <span class="grade-value">${grade}</span>
                      <span class="grade-amount">${count}</span>
                    </div>
                  `,
                  )
                  .join("")}
              </div>
            </div>
            ${
              yearEndGrades.length > 0
                ? `
                <div class="year-end-grades card">
                    <div class="grades-summary-header">
                        <h3>${LanguageManager.t("grades.year_end_evaluations")}</h3>
                    </div>
                    <div class="year-end-grades-list">
                        ${yearEndGrades
                          .map(
                            (grade) => `
                            <div class="year-end-grade-item grade-${grade.value}">
                                <div class="year-end-grade-value">${grade.value}</div>
                                <div class="year-end-grade-subject">${grade.subject}</div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `
                : ""
            }
          </div>
          <div class="grades-grid">
            ${generateSubjectCards(data.subjects)}
          </div>
        </main>
      </div>
    `;
  }

  function extractSemesterGrades(subjects) {
    const semesterGrades = [];
    subjects.forEach((subject) => {
      const semesterGrade = subject.grades.find(
        (grade) => grade.isSemesterGrade,
      );
      if (semesterGrade) {
        semesterGrades.push({
          subject: subject.name,
          value: semesterGrade.value,
          date: semesterGrade.date,
        });
      }
    });
    return semesterGrades;
  }

  function extractYearEndGrades(subjects) {
    const yearEndGrades = [];
    subjects.forEach((subject) => {
      const yearEndGrade = subject.grades.find((grade) => grade.isYearEndGrade);
      if (yearEndGrade) {
        yearEndGrades.push({
          subject: subject.name,
          value: yearEndGrade.value,
          date: yearEndGrade.date,
        });
      }
    });
    return yearEndGrades;
  }

  function calculateGradePoints(subjects) {
    const allGrades = [];

    subjects.forEach((subject) => {
      subject.grades.forEach((grade) => {
        const date = new Date(grade.date);
        const value = parseInt(grade.value);
        const weight = parseInt(grade.weight?.match(/\d+/)?.[0] || "100") / 100;
        if (date && value && weight && !grade.value.includes("%")) {
          allGrades.push({
            date,
            value,
            weight,
          });
        }
      });
    });

    allGrades.sort((a, b) => a.date - b.date);

    let totalWeight = 0;
    let weightedSum = 0;
    return allGrades.map((grade) => {
      totalWeight += grade.weight;
      weightedSum += grade.value * grade.weight;
      return {
        date: grade.date.toISOString(),
        grade: grade.value,
        average: weightedSum / totalWeight,
      };
    });
  }

  function setupGradesChart(subjects) {
    const ctx = document.getElementById("gradesChart");
    if (!ctx) return;

    const gradePoints = calculateGradePoints(subjects);
    const accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent-accent")
      .trim();

    new Chart(ctx, {
      type: "line",
      data: {
        labels: gradePoints.map((_, index) => ""),
        datasets: [
          {
            label: "Átlag",
            data: gradePoints.map((p) => p.average),
            borderWidth: 5,
            borderColor: accentColor,
            tension: 0.5,
            fill: true,
            backgroundColor: function (context) {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return null;

              const gradientBg = ctx.createLinearGradient(
                0,
                chartArea.bottom,
                0,
                chartArea.top,
              );

              gradientBg.addColorStop(0, accentColor + "30");
              gradientBg.addColorStop(1, accentColor + "10");

              return gradientBg;
            },
            pointBackgroundColor: accentColor,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              color: accentColor,
            },
            grid: {
              color: accentColor + "20",
              lineWidth: 1,
              borderDash: [5, 5],
            },
          },
          x: {
            display: false,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: getComputedStyle(
              document.documentElement,
            ).getPropertyValue("--card-card"),
            titleColor: getComputedStyle(
              document.documentElement,
            ).getPropertyValue("--text-primary"),
            bodyColor: getComputedStyle(
              document.documentElement,
            ).getPropertyValue("--text-primary"),
            borderColor:
              getComputedStyle(document.documentElement).getPropertyValue(
                "--text-teritary",
              ) + "20",
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: () => "",
              label: (context) => `Átlag: ${context.raw.toFixed(2)}`,
            },
          },
        },
      },
    });
  }

  function generateSubjectCards(subjects) {
    const sortedSubjects = [...subjects].sort(
      (a, b) => a.grades.length - b.grades.length,
    );

    return sortedSubjects
      .map((subject) => {
        const regularGrades = subject.grades
          .filter((grade) => !grade.isSemesterGrade)
          .reverse();
        const myGrade = Math.floor(subject.average) || 0;
        const classGrade = Math.floor(subject.classAverage) || 0;

        return `
        <div class="subject-card card">
          <div class="subject-header">
            <div class="subject-title">
              <h3>${subject.name}</h3>
            </div>
            <div class="subject-averages">
              <div class="average-circle my-average ${subject.average < 2 && subject.average > 0 ? "warning" : ""}" data-grade="${myGrade}">
                <span class="average-value">${subject.average > 0 ? subject.average.toFixed(2) : "-"}</span>
              </div>
              ${
                subject.classAverage > 0
                  ? `
              <div class="average-circle class-average" data-grade="${classGrade}">
                <span class="average-value">${subject.classAverage.toFixed(2)}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          <div class="grades-list">
            ${regularGrades.map(generateGradeItem).join("")}
          </div>
        </div>
      `;
      })
      .join("");
  }

  function setupEventListeners() {
    const timerEl = document.getElementById("logoutTimer");
    if (timerEl) {
      const startTime = parseInt(
        timerEl.textContent?.match(/\d+/)?.[0] || "45",
      );
      let timeLeft = startTime * 60;

      const updateTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        timeLeft--;

        if (timeLeft < 0) {
          window.location.href = chrome.runtime.getURL("logout/logout.html");
        }
      };

      setInterval(updateTimer, 1000);
    }
  }

  function setupGradesListScrolling() {
    const gradesLists = document.querySelectorAll(".grades-list");

    gradesLists.forEach((list) => {
      const checkScrollable = () => {
        if (list.scrollHeight > list.clientHeight) {
          list.classList.add("scrollable", "has-more");

          const handleScroll = () => {
            const isAtBottom =
              list.scrollTop + list.clientHeight >= list.scrollHeight - 5;
            if (isAtBottom) {
              list.classList.remove("has-more");
            } else {
              list.classList.add("has-more");
            }
          };

          list.addEventListener("scroll", handleScroll);
          handleScroll();
        } else {
          list.classList.remove("scrollable", "has-more");
        }
      };

      checkScrollable();
    });
  }

  if (window.location.href.includes("/TanuloErtekeles/Osztalyzatok")) {
    transformGradesPage();
  }
})();
