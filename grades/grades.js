(() => {
    function getCookie(name) {
        const cookieName = `${name}=`;
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');

        for(let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        return null;
    }

    function showLoadingScreen() {
        const existingLoadingScreen = document.querySelector('.loading-screen');
        if (existingLoadingScreen) return;

        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
      <div class="loading-content">
        <img src="${chrome.runtime.getURL('images/firka_logo.png')}" alt="Firka" class="loading-logo">
        <div class="loading-text">Betöltés alatt...</div>
        <div class="loading-text2">Kis türelmet!</div>
      </div>
    `;
        document.body.appendChild(loadingScreen);
    }

    function hideLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.addEventListener('transitionend', () => {
                loadingScreen.remove();
            });
        }
    }

    async function transformGradesPage() {
        try {
            showLoadingScreen();

            await waitForElement('#Osztalyzatok_7895TanuloErtekelesByTanuloGrid');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const gradesData = extractGradesData();
            const studentAverage = calculateOverallAverage(gradesData.subjects);
            const classAverage = calculateOverallClassAverage(gradesData.subjects);

            document.body.innerHTML = generatePageHTML(gradesData, studentAverage, classAverage);

            const links = [
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap' },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/icon?family=Material+Icons+Round' }
            ];


            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('grades/chart.js');
            document.head.appendChild(script);

            links.forEach(link => {
                const linkElement = document.createElement('link');
                Object.entries(link).forEach(([key, value]) => {
                    linkElement[key] = value;
                });
                document.head.appendChild(linkElement);
            });

            script.onload = () => {
                setupGradesChart(gradesData.subjects);
            };

            setupEventListeners();
            hideLoadingScreen();

        } catch (error) {
            console.error('Error transforming grades page:', error);
            hideLoadingScreen();
        }
    }

    function extractGradesData() {
        const subjects = [];
        const rows = document.querySelectorAll('#Osztalyzatok_7895TanuloErtekelesByTanuloGrid tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 17) {
                const subjectName = cells[2].textContent.trim();
                if (subjectName && subjectName !== 'Magatartás/Szorgalom') {
                    const grades = [];
                    const months = ['Szeptember', 'Oktober', 'November', 'December', 'JanuarI', 'JanuarII', 'Februar', 'Marcius', 'Aprilis', 'Majus', 'JuniusI', 'JuniusII'];

                    months.forEach((month, index) => {
                        const gradeElements = cells[index + 3].querySelectorAll('span[data-tanuloertekelesid]');
                        gradeElements.forEach(element => {
                            const gradeText = element.textContent.trim();
                            if (gradeText && gradeText !== '-') {
                                grades.push({
                                    value: gradeText,
                                    date: element.getAttribute('data-datum'),
                                    type: element.getAttribute('data-tipusmod'),
                                    theme: element.getAttribute('data-ertekelestema').replace('Téma: ', ''),
                                    weight: element.getAttribute('data-suly'),
                                    teacher: element.getAttribute('data-ertekelonyomtatasinev'),
                                    isSemesterGrade: (element.getAttribute('data-tipusmod') || '').toLowerCase().includes('félévi') ||
                                        (element.getAttribute('data-ertekelestema') || '').toLowerCase().includes('félévi') ||
                                        (element.getAttribute('data-tipus') || '').toLowerCase().includes('félévi')
                                });
                            }
                        });
                    });


                    const avgText = cells[16].textContent.trim();
                    const classAvgText = cells[17].textContent.trim();

                    const average = avgText !== '-' ? parseFloat(avgText.replace(',', '.')) : 0;
                    const classAvg = classAvgText !== '-' ? parseFloat(classAvgText.replace(',', '.')) : 0;

                    if (grades.length > 0) {

                        subjects.push({
                            name: subjectName,
                            grades: grades,
                            average: average || 0,
                            classAverage: classAvg || 0
                        });
                    }
                }
            }
        });

        return {
            schoolInfo: {
                id: getCookie('schoolCode') || '',
                name: getCookie('schoolName') || 'Iskola'
            },
            userData: {
                name: getCookie('userName') || 'Felhasználó',
                time: document.querySelector('.usermenu_timer')?.textContent?.trim() || '45:00'
            },
            subjects: subjects
        };
    }

    function calculateOverallAverage(subjects) {
        const validSubjects = subjects.filter(s => s.average > 0);
        if (validSubjects.length === 0) return 0;


        const weightedSum = validSubjects.reduce((sum, subject) => {
            const validGrades = subject.grades.filter(grade => !isNaN(parseInt(grade.value)));
            const subjectWeightedSum = validGrades.reduce((gradeSum, grade) => {
                const value = parseInt(grade.value);
                const weight = parseInt(grade.weight?.match(/\d+/)?.[0] || '100') / 100;
                return gradeSum + (value * weight);
            }, 0);

            const totalWeight = validGrades.reduce((weightSum, grade) => {
                const weight = parseInt(grade.weight?.match(/\d+/)?.[0] || '100') / 100;
                return weightSum + weight;
            }, 0);

            return sum + (subjectWeightedSum / totalWeight);
        }, 0);

        return weightedSum / validSubjects.length;
    }

    function calculateOverallClassAverage(subjects) {
        const validSubjects = subjects.filter(s => s.classAverage > 0);
        if (validSubjects.length === 0) return 0;
        return validSubjects.reduce((sum, s) => sum + s.classAverage, 0) / validSubjects.length;
    }

    function shortenEvaluationName(name, maxLength = 30) {
        if (!name) return '';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    }

    function generateGradeItem(grade) {
        const semesterClass = grade.isSemesterGrade ? 'semester-grade' : '';
        const dateObj = new Date(grade.date);
        const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
        const formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
        const shortenedTheme = shortenEvaluationName(grade.theme);
        return `
      <div class="grade-item grade-${grade.value} ${semesterClass}">
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
        const distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        subjects.forEach(subject => {
            subject.grades.forEach(grade => {
                const value = parseInt(grade.value);
                if (value >= 1 && value <= 5) {
                    distribution[value]++;
                }
            });
        });
        return distribution;
    }

    function generatePageHTML(data, studentAverage, classAverage) {
        const totalGrades = data.subjects.reduce((sum, subject) => sum + subject.grades.length, 0);
        const gradeDistribution = calculateGradeDistribution(data.subjects);
        const semesterGrades = extractSemesterGrades(data.subjects);


        const studentGradeLevel = Math.floor(studentAverage) || 0;
        const classGradeLevel = Math.floor(classAverage) || 0;

        return `
      <div class="kreta-container">
        <header class="kreta-header">
          <div class="school-info">
            <p class="logo-text">
              <img src="${chrome.runtime.getURL('images/firka_logo.png')}" alt="Firka" class="logo">
              Firka
            </p>
            <div class="school-details">
              <span>${data.schoolInfo.id} - ${data.schoolInfo.name}</span>
            </div>
          </div>
          <nav class="kreta-nav">
            <div class="nav-links">
              <a href="/Intezmeny/Faliujsag" data-page="dashboard" class="nav-item">
                <img src="${chrome.runtime.getURL('icons/dashboard-inactive.svg')}" alt="Kezdőlap">
                Kezdőlap
              </a>
              <a href="/TanuloErtekeles/Osztalyzatok" data-page="grades" class="nav-item active">
                <img src="${chrome.runtime.getURL('icons/grades-active.svg')}" alt="Jegyek">
                Jegyek
              </a>
              <a href="/Orarend/InformaciokOrarend" data-page="timetable" class="nav-item">
                <img src="${chrome.runtime.getURL('icons/timetable-inactive.svg')}" alt="Órarend">
                Órarend
              </a>
              <a href="/Hianyzas/Hianyzasok" data-page="absences" class="nav-item">
                <img src="${chrome.runtime.getURL('icons/absences-inactive.svg')}" alt="Mulasztások">
                Mulasztások
              </a>
              <a href="/Tanulo/TanuloHaziFeladat" data-page="other" class="nav-item">
                <img src="${chrome.runtime.getURL('icons/others.svg')}" alt="Egyéb">
                Egyéb
              </a>
            </div>
          </nav>
          <div class="user-profile">
            <button class="user-dropdown-btn">
              <div class="user-info">
                <span class="user-name">${data.userData.name}</span>
                <span class="nav-logout-timer" id="logoutTimer">${data.userData.time}</span>
              </div>
            </button>
            <div class="user-dropdown">
              <a href="/Adminisztracio/Profil" data-page="profile" class="dropdown-item">
                <img src="${chrome.runtime.getURL('icons/profile.svg')}" alt="Profil">
                Profil
              </a>
              <a href="#" class="dropdown-item" id="settingsBtn">
                <img src="${chrome.runtime.getURL('icons/settings.svg')}" alt="Beállítások">
                Beállítások
              </a>
              <a href="/Home/Logout" data-page="logout" class="dropdown-item">
                <img src="${chrome.runtime.getURL('icons/logout.svg')}" alt="Kijelentkezés">
                Kijelentkezés
              </a>
            </div>
          </div>
        </header>

        <main class="kreta-main">
          <div class="grades-overview">
            <div class="overall-averages card">
              <div class="chart-header">
                <div class="chart-title">Jegyek (${totalGrades}db)</div>
                <div class="chart-averages">
                  <div class="average-circle my-average" data-grade="${studentGradeLevel}">
                    <span class="average-value ${studentAverage < 2 && studentAverage > 0 ? 'warning' : ''}">${studentAverage > 0 ? studentAverage.toFixed(2) : '-'}</span>
                  </div>
                  ${classAverage > 0 ? `
                  <div class="average-circle class-average" data-grade="${classGradeLevel}">
                    <span class="average-value">${classAverage.toFixed(2)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              <div class="grades-chart">
                <canvas id="gradesChart"></canvas>
              </div>
              <div class="grade-distribution">
                ${Object.entries(gradeDistribution)
                  .map(([grade, count]) => `
                    <div class="grade-count grade-${grade}">
                      <span class="grade-value">${grade}</span>
                      <span class="grade-amount">${count}</span>
                    </div>
                  `).join('')}
              </div>
            </div>
            ${semesterGrades.length > 0 ? `
                <div class="semester-grades card">
                    <h3>Félévi értékelések</h3>
                    <div class="semester-grades-list">
                        ${semesterGrades.map(grade => `
                            <div class="semester-grade-item grade-${grade.value}">
                                <div class="semester-grade-value">${grade.value}</div>
                                <div class="semester-grade-subject">${grade.subject}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
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
        subjects.forEach(subject => {
            const semesterGrade = subject.grades.find(grade => grade.isSemesterGrade);
            if (semesterGrade) {
                semesterGrades.push({
                    subject: subject.name,
                    value: semesterGrade.value,
                    date: semesterGrade.date
                });
            }
        });
        return semesterGrades;
    }

    function calculateGradePoints(subjects) {
        const allGrades = [];

        subjects.forEach(subject => {
            subject.grades.forEach(grade => {
                const date = new Date(grade.date);
                const value = parseInt(grade.value);
                const weight = parseInt(grade.weight?.match(/\d+/)?.[0] || '100') / 100;
                if (date && value && weight) {
                    allGrades.push({
                        date,
                        value,
                        weight
                    });
                }
            });
        });


        allGrades.sort((a, b) => a.date - b.date);


        let totalWeight = 0;
        let weightedSum = 0;
        return allGrades.map(grade => {
            totalWeight += grade.weight;
            weightedSum += grade.value * grade.weight;
            return {
                date: grade.date.toISOString(),
                grade: grade.value,
                average: weightedSum / totalWeight
            };
        });
    }

    function setupGradesChart(subjects) {
        const ctx = document.getElementById('gradesChart');
        if (!ctx) return;

        const gradePoints = calculateGradePoints(subjects);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: gradePoints.map((_, index) => ''),
                datasets: [{
                    label: 'Átlag',
                    data: gradePoints.map(p => p.average),
                    borderWidth: 5,
                    tension: 0.5,
                    segment: {
                        borderColor: ctx => {
                            const curr = ctx.p1.parsed.y;
                            if (!curr) return 'transparent';
                            const color = getComputedStyle(document.documentElement).getPropertyValue(
                                curr < 2 ? '--grades-1' :
                                curr < 2.5 ? '--grades-2' :
                                curr < 3.5 ? '--grades-3' :
                                curr < 4.5 ? '--grades-4' : '--grades-5'
                            ).trim() + '80';
                            return color;
                        }
                    },
                    fill: true,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;

                        const gradientBg = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);


                        gradientBg.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue('--grades-1').trim() + '30');
                        gradientBg.addColorStop(0.2, getComputedStyle(document.documentElement).getPropertyValue('--grades-2').trim() + '30');
                        gradientBg.addColorStop(0.4, getComputedStyle(document.documentElement).getPropertyValue('--grades-3').trim() + '30');
                        gradientBg.addColorStop(0.6, getComputedStyle(document.documentElement).getPropertyValue('--grades-4').trim() + '30');
                        gradientBg.addColorStop(0.8, getComputedStyle(document.documentElement).getPropertyValue('--grades-5').trim() + '30');

                        return gradientBg;
                    },
                    pointBackgroundColor: context => {
                        const value = context.raw;
                        return getComputedStyle(document.documentElement).getPropertyValue(
                            value < 2 ? '--grades-1' :
                            value < 2.5 ? '--grades-2' :
                            value < 3.5 ? '--grades-3' :
                            value < 4.5 ? '--grades-4' : '--grades-5'
                        ).trim();
                    },
                    pointRadius: 0,
                    pointHoverRadius: 0
                }]
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
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-teritary') + '20',
                            lineWidth: 1,
                            borderDash: [5, 5]
                        }
                    },
                    x: {
                        display: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-card'),
                        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--text-teritary') + '20',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: () => '',
                            label: context => `Átlag: ${context.raw.toFixed(2)}`
                        }
                    }
                }
            }
        });
    }

    function generateSubjectCards(subjects) {
        const sortedSubjects = [...subjects].sort((a, b) => a.grades.length - b.grades.length);

        return sortedSubjects.map(subject => {
            const regularGrades = subject.grades.filter(grade => !grade.isSemesterGrade);
            const myGrade = Math.floor(subject.average) || 0;
            const classGrade = Math.floor(subject.classAverage) || 0;

            return `
        <div class="subject-card card">
          <div class="subject-header">
            <div class="subject-title">
              <h3>${subject.name}</h3>
            </div>
            <div class="subject-averages">
              <div class="average-circle my-average ${subject.average < 2 && subject.average > 0 ? 'warning' : ''}" data-grade="${myGrade}">
                <span class="average-value">${subject.average > 0 ? subject.average.toFixed(2) : '-'}</span>
              </div>
              ${subject.classAverage > 0 ? `
              <div class="average-circle class-average" data-grade="${classGrade}">
                <span class="average-value">${subject.classAverage.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>
          </div>
          <div class="grades-list">
            ${regularGrades.map(generateGradeItem).join('')}
          </div>
        </div>
      `;
        }).join('');
    }

    function setupEventListeners() {

        const userBtn = document.querySelector('.user-dropdown-btn');
        const userDropdown = document.querySelector('.user-dropdown');

        userBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            userDropdown?.classList.remove('show');
        });


        const timerEl = document.getElementById('logoutTimer');
        if (timerEl) {
            const startTime = parseInt(timerEl.textContent?.match(/\d+/)?.[0] || "45");
            let timeLeft = startTime * 60;

            const updateTimer = () => {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                if (timeLeft <= 0) {
                    window.location.href = '/Home/Logout';
                } else {
                    timeLeft--;
                }
            };

            updateTimer();
            setInterval(updateTimer, 1000);
        }
    }

    function waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }


    if (window.location.href.includes('/TanuloErtekeles/Osztalyzatok')) {
        transformGradesPage();
    }
})();