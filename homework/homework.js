async function fetchHomeworkData() {
  try {
    const currentDomain = window.location.hostname;
    const apiUrl = `https://${currentDomain}/api/TanuloHaziFeladatApi/GetTanulotHaziFeladatGrid?sort=HaziFeladatHatarido-asc&page=1&pageSize=100&group=&filter=&data=%7B%22RegiHaziFeladatokElrejtese%22%3Afalse%7D&_=${Date.now()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching homework data:', error);
    return { Data: [], Total: 0 };
  }
}

async function collectHomeworkData() {
  const apiData = await fetchHomeworkData();
  
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
  
  if (apiData.Data && Array.isArray(apiData.Data)) {
    apiData.Data.forEach(item => {
      homeworkItems.push({
        id: item.ID,
        subject: item.TantargyNev || '',
        teacher: item.TanarNeve || '',
        description: item.HaziFeladatSzoveg || '',
        createdDate: formatApiDate(item.HaziFeladatRogzitesDatuma),
        deadline: formatApiDate(item.HaziFeladatHatarido),
        completed: item.MegoldottHF_BOOL || false,
        classGroup: item.OsztalyCsoport || ''
      });
    });
  }

  const groupedHomework = {};
  homeworkItems.forEach(homework => {
    const deadlineDate = homework.deadline.split(' ')[0];
    if (!groupedHomework[deadlineDate]) {
      groupedHomework[deadlineDate] = [];
    }
    groupedHomework[deadlineDate].push(homework);
  });

  return { basicData, homeworkItems, groupedHomework };
}

function formatApiDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const dayNames = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
    const dayName = dayNames[date.getDay()];
    
    return `${month}.${day}. (${dayName})`;
  } catch (error) {
    return dateString;
  }
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
    const partsA = a.split('.');
    const partsB = b.split('.');
    
    const monthA = parseInt(partsA[0]) - 1;
    const dayA = parseInt(partsA[1]);
    const monthB = parseInt(partsB[0]) - 1;
    const dayB = parseInt(partsB[1]);
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const yearA = monthA < currentMonth ? currentYear + 1 : currentYear;
    const yearB = monthB < currentMonth ? currentYear + 1 : currentYear;
    
    const dateA = new Date(yearA, monthA, dayA);
    const dateB = new Date(yearB, monthB, dayB);
    
    return dateB - dateA;
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
                <div class="homework-deadline ${urgentClass}">${homework.deadline}</div>
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
  if (parts.length < 2) return dateStr;
  
  const month = parseInt(parts[0].trim()) - 1;
  const day = parseInt(parts[1].trim());
  const currentYear = today.getFullYear();
  
  const date = new Date(currentYear, month, day);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Ma - ' + dateStr;
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Holnap - ' + dateStr;
  }
  
  const weekdays = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
  return `${weekdays[date.getDay()]} - ${dateStr}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr;
}

function formatHomeworkDescription(description) {
  if (!description) return '';
  
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