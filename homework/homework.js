async function collectHomeworkData() {
  await helper.waitForElement('#TanulotHaziFeladatkGrid');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const basicData = {
    schoolInfo: {
      name: cookieManager.get('schoolName') || 'Iskola',
      id: cookieManager.get('schoolCode') || ''
    },
    userData: {
      name: cookieManager.get('userName') || 'Felhasználó',
      time: document.querySelector('.usermenu_timer')?.textContent?.trim() || '45:00'
    }
  };

  const homeworkItems = [];
  const rows = document.querySelectorAll('#TanulotHaziFeladatkGrid .k-grid-content tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 7) {
      homeworkItems.push({
        subject: cells[3]?.textContent?.trim() || '',
        teacher: cells[4]?.textContent?.trim() || '',
        description: cells[5]?.textContent?.trim() || '',
        createdDate: cells[6]?.textContent?.trim() || '',
        deadline: cells[7]?.textContent?.trim() || ''
      });
    }
  });

  
  const groupedHomework = {};
  homeworkItems.forEach(homework => {
    
    const deadlineDate = homework.deadline.split(' ').slice(0, 3).join(' ');
    if (!groupedHomework[deadlineDate]) {
      groupedHomework[deadlineDate] = [];
    }
    groupedHomework[deadlineDate].push(homework);
  });

  return { basicData, homeworkItems, groupedHomework };
}

function isTomorrow(dateStr) {
  if (!dateStr) return false;
  
  
  const parts = dateStr.split('.');
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
  const { basicData, homeworkItems, groupedHomework } = await collectHomeworkData();

  document.body.innerHTML = `
    <div class="kreta-container">
      ${createTemplate.header()}

      <main class="kreta-main">
        <div class="filter-card">
          <div class="filter-header">
            <h2>Szűrés</h2>
          </div>
          <div class="filter-content">
            <div class="filter-group">
              <label>
                <!--<span class="material-icons-round">subject</span>-->
                Tantárgy
              </label>
              <select id="subjectFilter">
                <option value="">Összes tantárgy</option>
                ${[...new Set(homeworkItems.map(item => item.subject))]
                  .sort()
                  .map(subject => `<option value="${subject}">${subject}</option>`)
                  .join('')}
              </select>
            </div>
            <div class="filter-group">
              <label>
                <!--<span class="material-icons-round">person</span>-->
                Tanár
              </label>
              <select id="teacherFilter">
                <option value="">Összes tanár</option>
                ${[...new Set(homeworkItems.map(item => item.teacher))]
                  .sort()
                  .map(teacher => `<option value="${teacher}">${teacher}</option>`)
                  .join('')}
              </select>
            </div>
            <div class="filter-group">
              <label>
                <!--<span class="material-icons-round">date_range</span>-->
                Határidő
              </label>
              <select id="deadlineFilter">
                <option value="">Összes határidő</option>
                <option value="tomorrow">Holnapi határidő</option>
                <option value="thisWeek">Ezen a héten</option>
                <option value="nextWeek">Jövő héten</option>
              </select>
            </div>
          </div>
        </div>

        <div class="homework-list" id="homeworkList">
          ${renderHomeworkList(groupedHomework)}
        </div>
      </main>
    </div>
  `;

  setupFilters(homeworkItems, groupedHomework);
  setupUserDropdown();
  setupMobileNavigation();
  loadingScreen.hide();
}

function renderHomeworkList(groupedHomework) {
  
  const sortedDates = Object.keys(groupedHomework).sort((a, b) => {
    const dateA = new Date(a.replace(/\./g, ''));
    const dateB = new Date(b.replace(/\./g, ''));
    return dateA - dateB;
  });

  if (sortedDates.length === 0) {
    return `
      <div class="empty-state">
        <p>Nincs megjeleníthető házi feladat.</p>
      </div>
    `;
  }

  return sortedDates.map(date => {
    const homeworkItems = groupedHomework[date];
    return `
      <div class="homework-date-group" data-date="${date}">
        <div class="date-header">
          <h3>${formatDateHeader(date)}</h3>
        </div>
        ${homeworkItems.map(homework => {
          const isTomorrowClass = isTomorrow(homework.deadline) ? 'due-tomorrow' : '';
          const urgentClass = isTomorrow(homework.deadline) ? 'urgent' : '';
          
          return `
            <div class="homework-item ${isTomorrowClass}" data-subject="${homework.subject}" data-teacher="${homework.teacher}">
              <div class="homework-header">
                <div class="homework-subject">${homework.subject}</div>
                <div class="homework-deadline ${urgentClass}">${formatDeadline(homework.deadline)}</div>
              </div>
              <div class="homework-content">${formatHomeworkDescription(homework.description)}</div>
              <div class="homework-footer">
                <div class="homework-teacher">${homework.teacher}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function formatDateHeader(dateStr) {
  if (!dateStr) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const parts = dateStr.split('.');
  if (parts.length < 3) return dateStr;
  
  const year = parseInt(parts[0].trim());
  const month = parseInt(parts[1].trim()) - 1;
  const day = parseInt(parts[2].trim());
  
  const date = new Date(year, month, day);
  
  
  if (date.toDateString() === today.toDateString()) {
    return 'Ma - ' + dateStr;
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Holnap - ' + dateStr;
  }
  
  
  const weekdays = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
  return `${weekdays[date.getDay()]} - ${dateStr}`;
}

function formatDeadline(dateStr) {
  if (!dateStr) return '';
  
  
  if (isTomorrow(dateStr)) {
    return `Határidő: ${dateStr} (holnap!)`;
  }
  
  return `Határidő: ${dateStr}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr;
}

function formatHomeworkDescription(description) {
  if (!description) return '';
  
  
  description = description.replace(/(\d+\.)\s*(\w[^\n.]*)/g, '<strong>$1 $2</strong>');
  
  
  description = description.replace(/(Határidő:)\s*([^\n]+)/g, '<div class="homework-requirement"><span class="requirement-label">$1</span> $2</div>');
  description = description.replace(/(MS\s+[^\n.]+szerint\s+adható\s+be\.)/g, '<div class="homework-requirement"><span class="requirement-label">Beadás:</span> $1</div>');
  
  
  description = description.replace(/\n/g, '<br>');
  
  return description;
}

function setupFilters(homeworkItems, groupedHomework) {
  const subjectFilter = document.getElementById('subjectFilter');
  const teacherFilter = document.getElementById('teacherFilter');
  const deadlineFilter = document.getElementById('deadlineFilter');
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  
  
  const applyFilters = () => {
    const selectedSubject = subjectFilter.value;
    const selectedTeacher = teacherFilter.value;
    const selectedDeadline = deadlineFilter.value;
    
    
    const homeworkElements = document.querySelectorAll('.homework-item');
    const dateGroups = document.querySelectorAll('.homework-date-group');
    
    
    dateGroups.forEach(group => {
      group.style.display = 'none';
    });
    
    
    homeworkElements.forEach(item => {
      const subject = item.getAttribute('data-subject');
      const teacher = item.getAttribute('data-teacher');
      const dateGroup = item.closest('.homework-date-group');
      const dateStr = dateGroup.getAttribute('data-date');
      
      let showItem = true;
      
      
      if (selectedSubject && subject !== selectedSubject) {
        showItem = false;
      }
      
      
      if (selectedTeacher && teacher !== selectedTeacher) {
        showItem = false;
      }
      
      
      if (selectedDeadline) {
        const parts = dateStr.split('.');
        if (parts.length >= 3) {
          const year = parseInt(parts[0].trim());
          const month = parseInt(parts[1].trim()) - 1;
          const day = parseInt(parts[2].trim());
          const date = new Date(year, month, day);
          
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
          
          if (selectedDeadline === 'tomorrow' && date.toDateString() !== tomorrow.toDateString()) {
            showItem = false;
          } else if (selectedDeadline === 'thisWeek' && (date < startOfWeek || date > endOfWeek)) {
            showItem = false;
          } else if (selectedDeadline === 'nextWeek' && (date < startOfNextWeek || date > endOfNextWeek)) {
            showItem = false;
          }
        }
      }
      
      
      item.style.display = showItem ? 'block' : 'none';
      
      
      if (showItem) {
        dateGroup.style.display = 'block';
      }
    });
    
    
    const visibleItems = document.querySelectorAll('.homework-item[style="display: block"]');
    const homeworkList = document.getElementById('homeworkList');
    
    
    let emptyState = homeworkList.querySelector('.empty-state');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = '<p>Nincs a szűrési feltételeknek megfelelő házi feladat.</p>';
      homeworkList.appendChild(emptyState);
    }
    
    
    if (visibleItems.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }
  };
  
  
  const resetFilters = () => {
    subjectFilter.value = '';
    teacherFilter.value = '';
    deadlineFilter.value = '';
    
    
    document.querySelectorAll('.homework-item').forEach(item => {
      item.style.display = 'block';
    });
    
    document.querySelectorAll('.homework-date-group').forEach(group => {
      group.style.display = 'block';
    });
    
    
    const homeworkList = document.getElementById('homeworkList');
    const existingEmptyState = homeworkList.querySelector('.empty-state');
    if (existingEmptyState) {
      homeworkList.removeChild(existingEmptyState);
    }
  };
  
  
  subjectFilter.addEventListener('change', applyFilters);
  teacherFilter.addEventListener('change', applyFilters);
  deadlineFilter.addEventListener('change', applyFilters);
}



if (window.location.href.includes('/Tanulo/TanuloHaziFeladat')) {
  transformHomeworkPage().catch(error => {
    console.error('Error transforming homework page:', error);
  });
}