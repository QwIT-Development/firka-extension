const utils = {
  formatGradeValue(value) {
    return value?.trim() || '';
  },

  parseDate(dateStr) {
    return dateStr?.trim() || '';
  },
  
  formatHungarianDate(dateStr) {
    if (!dateStr) return '';
    
    const dateParts = dateStr.trim().split('.');
    if (dateParts.length < 3) return dateStr;
    
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    
    if (isNaN(month) || month < 1 || month > 12) return dateStr;
    
    const hungarianMonths = [
      'január', 'február', 'március', 'április', 'május', 'június',
      'július', 'augusztus', 'szeptember', 'október', 'november', 'december'
    ];
    
    return `${hungarianMonths[month - 1]} ${day}.`;
  }
};


class DashboardDataExtractor {
  constructor() {
    this.data = {
      grades: [],
      absences: [],
      notes: [],
      upcomingExams: [],
      news: []
    };
  }

  extractGrades() {
    const gradeRows = document.querySelectorAll('#legutobbiErtekelesek tr:not(:first-child)');
    
    this.data.grades = Array.from(gradeRows).map(row => {
      const gradeValue = row.querySelector('span[style*="font-size: 200%"]')?.textContent;
      const gradeInfo = row.querySelector('span[style*="float: right"]')?.textContent;
      
      if (!gradeValue || !gradeInfo) return null;

      const [fullSubject, date] = gradeInfo.split('\n').map(str => str.trim());
      const { subject, type } = this.parseSubjectInfo(fullSubject);

      return {
        value: utils.formatGradeValue(gradeValue),
        subject,
        date: utils.parseDate(date),
        type: type || 'Értékelés'
      };
    }).filter(Boolean);
  }

  parseSubjectInfo(fullSubject) {
    const months = ['január', 'február', 'március', 'április', 'május', 'június', 
                   'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
    const monthPattern = new RegExp(months.join('|'), 'i');
    const monthMatch = fullSubject.match(monthPattern);
    
    if (!monthMatch) return { subject: fullSubject, type: '' };
    
    const monthIndex = fullSubject.lastIndexOf(monthMatch[0]);
    return {
      subject: fullSubject.substring(0, monthIndex).trim(),
      type: fullSubject.substring(monthIndex).trim()
    };
  }

  extractAbsences() {
    const absenceRows = document.querySelectorAll('#legutobbiMulasztasok tr:not(:first-child)');
    
    this.data.absences = Array.from(absenceRows).map(row => {
      const spans = row.querySelectorAll('span');
      if (spans.length < 4) return null;

      return {
        date: spans[0]?.textContent?.trim() || '',
        day: spans[2]?.textContent?.trim() || '',
        type: spans[1]?.textContent?.trim() || '',
        count: spans[3]?.textContent?.trim() || ''
      };
    }).filter(Boolean);
  }

  extractNotes() {
    const noteRows = document.querySelectorAll('#legutobbiFeljegyzesek tr:not(:first-child)');
    
    this.data.notes = Array.from(noteRows).map(row => {
      const spans = row.querySelectorAll('span');
      if (spans.length < 3) return null;

      return {
        title: spans[0]?.textContent?.trim() || '',
        author: spans[1]?.textContent?.trim() || '',
        date: spans[2]?.textContent?.trim() || ''
      };
    }).filter(Boolean);
  }

  extractExams() {
    const examRows = document.querySelectorAll('#legutobbiBejelentettSzamonkeres tr:not(:first-child)');
    
    this.data.upcomingExams = Array.from(examRows).map(row => {
      const spans = row.querySelectorAll('span');
      if (spans.length < 4) return null;

      return {
        date: spans[0]?.textContent?.trim() || '',
        subject: spans[1]?.textContent?.trim() || '',
        day: spans[2]?.textContent?.trim() || '',
        type: spans[3]?.textContent?.trim() || ''
      };
    }).filter(Boolean);
  }

  extractNews() {
    const newsContainer = document.querySelector('.faliujsag-lista, #faliujsagLista');
    if (!newsContainer) return;
    
    const newsItems = newsContainer.querySelectorAll('.nb-item, .news-item');
    
    this.data.news = Array.from(newsItems).map(item => {
      const titleElement = item.querySelector('.subject h4, .news-title');
      const contentElement = item.querySelector('.content, .news-content');
      
      
      const dateElement = item.querySelector('.nb-date, .news-date');
      let dateStr = '';
      
      if (dateElement) {
        const yearElement = dateElement.querySelector('.year');
        const monthElement = dateElement.querySelector('.month');
        const dayElement = dateElement.querySelector('.day');
        
        if (yearElement && monthElement && dayElement) {
          dateStr = `${yearElement.textContent} ${monthElement.textContent} ${dayElement.textContent}`;
        } else {
          dateStr = dateElement.textContent;
        }
      }
      
      
      const authorElement = item.querySelector('.auth-name span, .news-author');
      
      return {
        title: titleElement?.textContent?.trim() || '',
        date: dateStr.trim(),
        content: contentElement?.textContent?.trim() || '',
        author: authorElement?.textContent?.trim() || ''
      };
    }).filter(news => news.title || news.content);
  }

  extractAll() {
    this.extractGrades();
    this.extractAbsences();
    this.extractNotes();
    this.extractExams();
    this.extractNews();
    return this.data;
  }
}


class DashboardUI {
  constructor(data) {
    this.data = {
      ...data,
      schoolInfo: {
        name: cookieManager.get(COOKIE_KEYS.SCHOOL_NAME) || DEFAULT_VALUES.SCHOOL,
        id: cookieManager.get(COOKIE_KEYS.SCHOOL_CODE) || ''
      },
      userData: {
        name: cookieManager.get(COOKIE_KEYS.USER_NAME) || DEFAULT_VALUES.USER,
        time: document.querySelector('.usermenu_timer')?.textContent?.trim() || DEFAULT_VALUES.TIMER
      }
    };
    this.schoolNameFull = `${this.data.schoolInfo.id} - ${this.data.schoolInfo.name}`;
    this.shortenedSchoolName = helper.shortenSchoolName(this.schoolNameFull);
  }

  generateMainContentHTML() {
    return `
      <main class="kreta-main">
        <div class="grid-container">
          ${this.generateGradeCard()}
          ${this.generateAbsenceCard()}
          ${this.generateNoteCard()}
          ${this.generateExamCard()}
          ${this.generateNewsCard()}
        </div>
      </main>
    `;
  }
  generateNewsCard() {
    const newsItems = this.data.news.map(news => `
      <div class="news-item">
        <div class="news-header">
          <div class="news-date">${news.date}</div>
          ${news.author ? `<div class="news-author">${news.author}</div>` : ''}
        </div>
        <div class="news-details">
          <h3 class="news-title">${news.title}</h3>
          <div class="news-content">${news.content}</div>
        </div>
      </div>
    `).join('');

    return this.generateCard('Hírek', newsItems || 'Jelenleg ez egy nem támogatott funkció', '/Intezmeny/Faliujsag', 'Összes hír');
  }
  generateGradeCard() {
    const gradeItems = this.data.grades.map(grade => `
      <div class="grade-item">
        <div class="grade-row">
          <div class="grade grade-${grade.value}">${grade.value}</div>
          <div class="grade-details">
            <div class="subject-name">${grade.subject}</div>
            <div class="grade-type">${grade.type}</div>
          </div>
          ${grade.date ? `<div class="grade-date">${grade.date}</div>` : ''}
        </div>
      </div>
    `).join('');

    return this.generateCard('Értékeléseid', gradeItems, '/TanuloErtekeles/Osztalyzatok', 'Összes jegyed');
  }
  generateAbsenceCard() {
    const absenceItems = this.data.absences.map(absence => `
      <div class="absence-item">
        <div class="absence-details">
          <div class="absence-type">${absence.type}</div>
          <div class="absence-date">${absence.date}</div>
        </div>
      </div>
    `).join('');

    return this.generateCard('Mulasztások', absenceItems, '/Hianyzas/Hianyzasok', 'Összes mulasztás');
  }
  generateNoteCard() {
    const noteItems = this.data.notes.map(note => `
      <div class="note-item">
        <div class="note-details">
          <div class="note-title">${note.title}</div>
          <div class="note-date">${note.date}</div>
        </div>
      </div>
    `).join('');

    return this.generateCard('Feljegyzések', noteItems, '/TanuloErtekeles/InformaciokFeljegyzesek', 'Összes üzeneted');
  }
  generateExamCard() {
    const examItems = this.data.upcomingExams.map(exam => `
      <div class="exam-item">
        <div class="exam-details">
          <div class="exam-subject">${exam.subject}</div>
          <div class="exam-date">${utils.formatHungarianDate(exam.date)}</div>
        </div>
      </div>
    `).join('');

    return this.generateCard('Bejelentett dolgozatok', examItems, '/Tanulo/TanuloBejelentettSzamonkeresek', 'Összes dolgozat');
  }
  generateCard(title, content, linkHref, linkText) {
    return `
      <div class="card">
        <h2>${title}</h2>
        <div class="card-content">
          ${content || `Jelenleg ez egy nem támogatott funkció`}
          <a href="${linkHref}" class="more-link">
            ${linkText}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
              <path d="M11.2997 5.19947L5.64282 5.19947M11.2997 5.19947L11.2997 10.8563M11.2997 5.19947L4.70001 11.7991" stroke="var(--accent-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          </a>
        </div>
      </div>
    `;
  }
  
  render() {
    document.body.innerHTML = `
      <div class="kreta-container">
        ${createTemplate.header()}
        ${this.generateMainContentHTML()}
      </div>
    `;
    setupUserDropdown();
  }
}

class DashboardApp {
  constructor() {
    this.initialize();
  }

  async initialize() {
    if (!window.location.href.includes('/Intezmeny/Faliujsag')) return;
  
    try {
      const dataExtractor = new DashboardDataExtractor();
      const dashboardData = dataExtractor.extractAll();
      createTemplate.importFonts();
      const ui = new DashboardUI(dashboardData);
      ui.render();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }
}


new DashboardApp();