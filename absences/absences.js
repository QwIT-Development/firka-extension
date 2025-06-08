async function collectAbsencesData() {
  await helper.waitForElement('#HianyzasGrid');
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

  const absences = [];
  const rows = document.querySelectorAll('#HianyzasGrid .k-grid-content tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 9) {
      absences.push({
        date: cells[1]?.textContent?.trim() || '',
        lesson: cells[2]?.textContent?.trim() || '',
        subject: cells[3]?.textContent?.trim() || '',
        topic: cells[4]?.textContent?.trim() || '',
        type: cells[5]?.textContent?.trim() || '',
        justified: cells[6]?.textContent?.trim() === 'Igen',
        justificationStatus: cells[6]?.textContent?.trim() === 'Igen' ? 'justified' : 
                            cells[6]?.textContent?.trim() === 'Nem' ? 'unjustified' : 'pending',
        purposeful: cells[7]?.textContent?.trim() || '',
        justificationType: cells[8]?.textContent?.trim() || ''
      });
    }
  });

  const groupedAbsences = {};
  absences.forEach(absence => {
    if (!groupedAbsences[absence.date]) {
      groupedAbsences[absence.date] = [];
    }
    groupedAbsences[absence.date].push(absence);
  });

  return { basicData, absences, groupedAbsences };
}

async function transformAbsencesPage() {
  const { basicData, absences, groupedAbsences } = await collectAbsencesData();

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
                <span class="material-icons-round">date_range</span>
                Dátum
              </label>
              <input type="date" id="dateFilter" class="filter-input" disabled>
            </div>
            <div class="filter-group">
              <label>
                <span class="material-icons-round">school</span>
                Tantárgy
              </label>
              <select id="subjectFilter" class="filter-input">
                <option value="">Minden tantárgy</option>
                ${[...new Set(absences.map(a => a.subject))].sort().map(subject =>
                  `<option value="${subject}">${subject}</option>`
                ).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label>
                <span class="material-icons-round">check_circle</span>
                Igazolás
              </label>
              <select id="justificationFilter" class="filter-input">
                <option value="">Mindegy</option>
                <option value="justified">Igazolt</option>
                <option value="unjustified">Igazolatlan</option>
                <option value="pending">Igazolásra vár</option>
              </select>
            </div>
          </div>
        </div>

        <div class="absences-container">
          ${Object.entries(groupedAbsences).map(([date, dayAbsences]) => `
            <div class="absence-group" data-date="${date}">
              <div class="absence-date">
                <span class="material-icons-round">event</span>
                ${date}
                <span class="absence-count">${dayAbsences.length} óra</span>
              </div>
              <div class="absence-list">
                ${dayAbsences.map(absence => `
                  <div class="absence-item" 
                       data-subject="${absence.subject}"
                       data-justified="${absence.justified}">
                    <div class="absence-time">
                      <span class="material-icons-round">schedule</span>
                      ${absence.lesson}. óra
                    </div>
                    <div class="absence-details">
                      <div class="absence-subject">${absence.subject}</div>
                      <div class="absence-topic">${absence.topic}</div>
                    </div>
                    <div class="absence-status ${absence.justificationStatus}">
                      ${absence.justificationStatus === 'justified' ? 
                        `Igazolt <span class="material-icons-round">check_circle</span>` : 
                        absence.justificationStatus === 'unjustified' ?
                        `Igazolatlan <span class="material-icons-round">cancel</span>` :
                        `Igazolásra vár <span class="material-icons-round">pending</span>`}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </main>
    </div>
  `;

  createTemplate.importFonts();
  setupUserDropdown();
  setupMobileNavigation();

  setupEventListeners();
  setupFilters();
  
  loadingScreen.hide();
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
}

function setupFilters() {
  try {
    const filters = {
      dateFilter: document.getElementById('dateFilter'),
      subject: document.getElementById('subjectFilter'),
      justified: document.getElementById('justificationFilter')
    };

    
    if (!filters.dateFilter || !filters.subject || !filters.justified) {
      console.warn('Some filter elements were not found in the DOM');
      return;
    }

    
    if (filters.dateFilter) {
      filters.dateFilter.disabled = true;
    }

    const filterAbsences = () => {
      try {
        
        const dateFilterValue = filters.dateFilter.value;
        const subject = filters.subject.value;
        const justified = filters.justified.value;
        
        
        const selectedDate = dateFilterValue ? new Date(dateFilterValue) : null;

        document.querySelectorAll('.absence-group').forEach(group => {
          const dateStr = group.dataset.date;
          const dateParts = dateStr.split('.');
          
          
          if (dateParts.length < 3) {
            console.error(`Invalid date format: ${dateStr}`);
            return;
          }
          
          
          const parsedDay = parseInt(dateParts[0].trim(), 10);
          const parsedMonth = parseInt(dateParts[1].trim(), 10) - 1;
          const parsedYear = parseInt(dateParts[2].trim(), 10);
          
          
          if (isNaN(parsedDay) || isNaN(parsedMonth) || isNaN(parsedYear)) {
            console.error(`Invalid date components: ${dateStr}`);
            return;
          }
          
          
          const groupDate = new Date(parsedYear, parsedMonth, parsedDay);
          
          let showGroup = true;

          const absenceItems = group.querySelectorAll('.absence-item');
          let visibleItems = 0;

          absenceItems.forEach(item => {
            let showItem = true;
            if (subject && item.dataset.subject !== subject) showItem = false;
            
            if (justified) {
              const statusElement = item.querySelector('.absence-status');
              const hasStatus = statusElement.classList.contains(justified);
              if (!hasStatus) showItem = false;
            }

            item.style.display = showItem ? '' : 'none';
            if (showItem) visibleItems++;
          });

          group.style.display = (showGroup && visibleItems > 0) ? '' : 'none';
        });
      } catch (err) {
        
        console.error('Error during filtering absences:', err);
      }
    };
    
    
    Object.values(filters).forEach(filter => {
      try {
        if (filter && filter !== filters.dateFilter) {
          filter.addEventListener('change', filterAbsences);
        }
      } catch (err) {
        if (err.message && err.message.includes('Extension context invalidated')) {
          console.warn('Extension context invalidated during event listener setup');
        } else {
          console.error('Error setting up filter event listener:', err);
        }
      }
    });
    
    
    filterAbsences();
  } catch (err) {
    
    if (err.message && err.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated during filter setup');
    } else {
      console.error('Error setting up filters:', err);
    }
  }
}


if (window.location.href.includes('/Hianyzas/Hianyzasok')) {
  transformAbsencesPage().catch(error => {
    console.error('Hiba történt az oldal átalakítása során:', error);
  });
}