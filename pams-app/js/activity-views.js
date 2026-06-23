// Activity Views Module - Calendar and Tabular Views

const ActivityViews = {
  // Generate dummy activities for demonstration
  generateDummyActivities() {
    const today = new Date();
    const activities = [];
    const salesReps = ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown'];
    const accounts = ['Acme Corp', 'Tech Innovations Inc', 'Global Solutions Ltd', 'Digital Ventures'];
    const types = ['customerCall', 'poc', 'sow', 'rfx'];
    const callTypes = ['Demo', 'Discovery', 'Follow-up', 'Q&A'];
    const locations = ['USA', 'Europe', 'APAC', 'LATAM'];

    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      const type = types[Math.floor(Math.random() * types.length)];

      activities.push({
        id: 'dummy-' + i,
        date: date.toISOString().split('T')[0],
        type: type,
        accountName: accounts[Math.floor(Math.random() * accounts.length)],
        salesRep: salesReps[Math.floor(Math.random() * salesReps.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        description: `Sample ${type} activity - ${i + 1}`,
        details: {
          callType: callTypes[Math.floor(Math.random() * callTypes.length)],
          description: `This is a sample description for activity ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
          duration: Math.floor(Math.random() * 120) + 15,
          useCaseDescription: 'Sample use case for POC',
          accessType: 'Sandbox',
          sowLink: 'https://example.com/sow-' + i
        }
      });
    }
    return activities;
  },

  // Create and show calendar view
  showCalendarView() {
    const container = document.getElementById('calendarViewContainer') || this.createCalendarContainer();
    const activities = this.generateDummyActivities();

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    let html = `
      <div class="calendar-view">
        <div class="calendar-header">
          <button class="btn btn-sm" onclick="ActivityViews.previousMonth()">&lt; Previous</button>
          <h3 id="calendarMonthYear">${this.getMonthYearString(year, month)}</h3>
          <button class="btn btn-sm" onclick="ActivityViews.nextMonth()">Next &gt;</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-day-header">Sun</div>
          <div class="calendar-day-header">Mon</div>
          <div class="calendar-day-header">Tue</div>
          <div class="calendar-day-header">Wed</div>
          <div class="calendar-day-header">Thu</div>
          <div class="calendar-day-header">Fri</div>
          <div class="calendar-day-header">Sat</div>
          ${this.generateCalendarDays(year, month, activities)}
        </div>
      </div>
      <div class="calendar-legend">
        <div class="legend-item"><span class="legend-box customerCall"></span> Customer Call</div>
        <div class="legend-item"><span class="legend-box poc"></span> POC</div>
        <div class="legend-item"><span class="legend-box sow"></span> SOW</div>
        <div class="legend-item"><span class="legend-box rfx"></span> RFx</div>
      </div>
      <div class="calendar-activities-list">
        <h4>Activities in ${this.getMonthYearString(year, month)}</h4>
        ${this.renderActivitiesList(activities, year, month)}
      </div>
    `;

    container.innerHTML = html;
    container.classList.add('visible');
  },

  createCalendarContainer() {
    const container = document.createElement('div');
    container.id = 'calendarViewContainer';
    container.className = 'activity-view-container calendar-view-container';
    document.getElementById('appMaintenanceScreen')?.parentNode?.insertBefore(
      container,
      document.getElementById('mainApp')?.nextSibling || null
    ) || document.body.appendChild(container);
    return container;
  },

  generateCalendarDays(year, month, activities) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = '';

    // Empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayActivities = activities.filter(a => a.date === dateStr);
      const classList = ['calendar-day'];

      if (dayActivities.length > 0) {
        classList.push('has-activity');
      }

      html += `
        <div class="${classList.join(' ')}" data-date="${dateStr}">
          <div class="calendar-day-number">${day}</div>
          <div class="calendar-day-activities">
            ${dayActivities.map(a => `
              <div class="activity-dot ${a.type}" title="${a.accountName} - ${a.type}"
                   onclick="ActivityViews.showActivityDetail('${a.id}')"></div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Empty cells after month ends
    const totalCells = firstDay + daysInMonth;
    const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remainingCells; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    return html;
  },

  renderActivitiesList(activities, year, month) {
    const monthActivities = activities.filter(a => {
      const actDate = new Date(a.date);
      return actDate.getFullYear() === year && actDate.getMonth() === month;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (monthActivities.length === 0) {
      return '<p class="text-muted">No activities scheduled for this month</p>';
    }

    return `
      <div class="activities-table">
        ${monthActivities.map(a => `
          <div class="activity-row" onclick="ActivityViews.showActivityDetail('${a.id}')">
            <div class="activity-row-date">${this.formatDate(a.date)}</div>
            <div class="activity-row-type badge-${a.type}">${a.type.toUpperCase()}</div>
            <div class="activity-row-account">${a.accountName}</div>
            <div class="activity-row-rep">${a.salesRep}</div>
            <div class="activity-row-desc">${a.description}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Create and show tabular view
  showTabularView() {
    const container = document.getElementById('tabularViewContainer') || this.createTabularContainer();
    const activities = this.generateDummyActivities();

    let html = `
      <div class="tabular-view">
        <div class="view-header">
          <h3>Activity Log</h3>
          <button class="btn btn-primary" onclick="Activities.openActivityModal()">+ Log New Activity</button>
        </div>
        <div class="table-controls">
          <input type="text" class="form-control" id="tableSearchInput" placeholder="Search activities..."
                 onkeyup="ActivityViews.filterTable()">
          <select class="form-control" id="tableTypeFilter" onchange="ActivityViews.filterTable()">
            <option value="">All Types</option>
            <option value="customerCall">Customer Call</option>
            <option value="poc">POC</option>
            <option value="sow">SOW</option>
            <option value="rfx">RFx</option>
          </select>
        </div>
        <div class="table-container">
          <table class="activities-table" id="activitiesTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Account</th>
                <th>Sales Rep</th>
                <th>Location</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activities.map((a, idx) => `
                <tr class="table-row" data-type="${a.type}" data-content="${(a.accountName + ' ' + a.salesRep + ' ' + a.description).toLowerCase()}">
                  <td>${this.formatDate(a.date)}</td>
                  <td><span class="badge badge-${a.type}">${a.type}</span></td>
                  <td>${a.accountName}</td>
                  <td>${a.salesRep}</td>
                  <td>${a.location}</td>
                  <td>${a.description}</td>
                  <td>
                    <button class="btn btn-sm btn-info" onclick="ActivityViews.editActivity('${a.id}', ${idx})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="ActivityViews.deleteActivity('${a.id}')">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
    container.classList.add('visible');
  },

  createTabularContainer() {
    const container = document.createElement('div');
    container.id = 'tabularViewContainer';
    container.className = 'activity-view-container tabular-view-container';
    document.getElementById('mainApp')?.appendChild(container);
    return container;
  },

  filterTable() {
    const searchInput = document.getElementById('tableSearchInput');
    const typeFilter = document.getElementById('tableTypeFilter');
    const rows = document.querySelectorAll('.table-row');

    const searchTerm = searchInput?.value.toLowerCase() || '';
    const typeValue = typeFilter?.value || '';

    rows.forEach(row => {
      const content = row.getAttribute('data-content');
      const type = row.getAttribute('data-type');
      const matchesSearch = !searchTerm || content.includes(searchTerm);
      const matchesType = !typeValue || type === typeValue;

      row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    });
  },

  editActivity(activityId, index) {
    // Create modal for editing
    const container = document.getElementById('modalsContainer') || this.createModalsContainer();
    const editModalId = 'editActivityModal';

    if (document.getElementById(editModalId)) {
      document.getElementById(editModalId).remove();
    }

    const modalHTML = `
      <div id="${editModalId}" class="modal active">
        <div class="modal-content large">
          <div class="modal-header">
            <h2 class="modal-title">Edit Activity</h2>
            <button class="modal-close" onclick="ActivityViews.closeEditModal()">&times;</button>
          </div>
          <form id="editActivityForm" onsubmit="ActivityViews.saveEditedActivity(event, '${activityId}')">
            <div class="form-section">
              <h3>Activity Details</h3>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label required">Date</label>
                  <input type="date" class="form-control" id="editActivityDate" required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Type</label>
                  <select class="form-control" id="editActivityType" required>
                    <option value="customerCall">Customer Call</option>
                    <option value="poc">POC</option>
                    <option value="sow">SOW</option>
                    <option value="rfx">RFx</option>
                  </select>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label required">Account</label>
                  <input type="text" class="form-control" id="editActivityAccount" required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Sales Rep</label>
                  <input type="text" class="form-control" id="editActivityRep" required>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Location</label>
                  <select class="form-control" id="editActivityLocation">
                    <option value="">Select...</option>
                    <option value="USA">USA</option>
                    <option value="Europe">Europe</option>
                    <option value="APAC">APAC</option>
                    <option value="LATAM">LATAM</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Description</label>
                <textarea class="form-control" id="editActivityDescription" rows="4" required placeholder="Enter activity description..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="ActivityViews.closeEditModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', modalHTML);
  },

  saveEditedActivity(event, activityId) {
    event.preventDefault();
    // In a real app, this would save to the backend
    console.log('Saving activity:', activityId);
    alert('Activity updated successfully!');
    this.closeEditModal();
    this.showTabularView();
  },

  closeEditModal() {
    const modal = document.getElementById('editActivityModal');
    if (modal) modal.remove();
  },

  deleteActivity(activityId) {
    if (confirm('Are you sure you want to delete this activity?')) {
      console.log('Deleting activity:', activityId);
      alert('Activity deleted successfully!');
      this.showTabularView();
    }
  },

  showActivityDetail(activityId) {
    console.log('Showing detail for activity:', activityId);
    // Open a modal or drawer with full activity details
  },

  createModalsContainer() {
    const container = document.getElementById('modalsContainer') || (() => {
      const div = document.createElement('div');
      div.id = 'modalsContainer';
      document.body.appendChild(div);
      return div;
    })();
    return container;
  },

  // Navigation
  previousMonth() {
    // Implementation for previous month navigation
    console.log('Previous month clicked');
  },

  nextMonth() {
    // Implementation for next month navigation
    console.log('Next month clicked');
  },

  // Helper methods
  getMonthYearString(year, month) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[month]} ${year}`;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};
