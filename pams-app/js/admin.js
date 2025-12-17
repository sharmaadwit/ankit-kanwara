// Admin Module

const Admin = {
    featureFlagMetadata: {
        csvImport: {
            label: 'CSV Import',
            description: 'Allow users to upload activities via CSV templates.',
            dashboardKey: 'csvImport'
        },
        csvExport: {
            label: 'CSV Export',
            description: 'Allow analytics CSV exports from the Reports view.',
            dashboardKey: null
        },
        winLoss: {
            label: 'Win/Loss Tracking',
            description: 'Enable win/loss forms for project closure analysis.',
            dashboardKey: 'winLoss'
        },
        adminCsvExport: {
            label: 'Admin Monthly Export',
            description: 'Allow admins to download monthly analytics CSV snapshots.',
            dashboardKey: null
        }
    },
    currentFeatureFlags: {},
    dashboardVisibilityMetadata: {
        dashboard: {
            label: 'Dashboard',
            description: 'Show the dashboard overview to all users.'
        },
        csvImport: {
            label: 'Import CSV',
            description: 'Display the import option on the dashboard and sidebar.'
        },
        winLoss: {
            label: 'Win/Loss',
            description: 'Display Win/Loss dashboards and navigation entries.'
        },
        reports: {
            label: 'Reports',
            description: 'Show reports navigation and analytics views.'
        },
        admin: {
            label: 'Admin Mode',
            description: 'Allow administrators to access the admin panel.'
        },
        activities: {
            label: 'All Activities',
            description: 'Expose the activities workspace in navigation and dashboard cards.'
        },
        accounts: {
            label: 'Accounts',
            description: 'Allow users to access the accounts view and dashboard card.'
        },
        projectHealth: {
            label: 'Project Health',
            description: 'Show the project health tools in navigation and dashboard.'
        },
        sfdcCompliance: {
            label: 'SFDC Compliance',
            description: 'Show the SFDC compliance dashboards and navigation.'
        },
        logActivity: {
            label: 'Log Activity Shortcut',
            description: 'Display the quick log activity card on the dashboard.'
        },
        adminLogin: {
            label: 'Login Activity',
            description: 'Expose the detailed login activity workspace to administrators.'
        },
        adminPoc: {
            label: 'POC Sandbox',
            description: 'Provide access to the sandbox assignment manager for admins.'
        }
    },
    defaultDashboardVisibility: {
        dashboard: true,
        csvImport: true,
        winLoss: true,
        reports: true,
        admin: true,
        activities: true,
        accounts: true,
        projectHealth: true,
        sfdcCompliance: true,
        logActivity: true,
        adminLogin: true,
        adminPoc: true
    },
    currentDashboardVisibility: {},
    controlDefinitions: [],
    controlDraft: {},
    controlDirty: false,
    controlsLoading: false,
    loginLogsPage: 0,
    loginLogsLimit: 50,
    loginLogsHasMore: false,
    loginLogsLoading: false,
    loginLogsCurrentRows: [],
    pocFilteredActivities: [],

    getAdminHeaders() {
        const headers = {};
        try {
            if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
                const user = Auth.getCurrentUser();
                if (user && user.username) {
                    headers['x-admin-user'] = user.username;
                }
            }
        } catch (error) {
            console.warn('Unable to attach admin headers', error);
        }
        return headers;
    },

    // Load admin panel
    loadAdminPanel() {
        try {
            this.loadUsers();
            this.loadSalesReps();
            this.loadAnalyticsSettings();
            this.renderProjectHealthSettings();
            this.loadPOCSandbox();
            this.loadControls();
            this.loadLoginLogs();
            const monthInput = document.getElementById('adminReportMonth');
            if (monthInput && !monthInput.value) {
                monthInput.value = new Date().toISOString().substring(0, 7);
            }
            const interfaceSelect = document.getElementById('interfaceSelect');
            if (interfaceSelect) {
                interfaceSelect.value = InterfaceManager.getCurrentInterface();
            }
            const themeSelect = document.getElementById('interfaceThemeSelect');
            if (themeSelect) {
                themeSelect.value = InterfaceManager.getCurrentTheme();
            }
        } catch (error) {
            console.error('Error loading admin panel:', error);
            UI.showNotification('Error loading admin panel', 'error');
        }
    },

    loadAnalyticsSettings() {
        const targetInfo = DataManager.getPresalesActivityTarget();
        const targetValue = Number(targetInfo.value) >= 0 ? Number(targetInfo.value) : 0;

        const inputs = [
            document.getElementById('presalesTargetInput'),
            document.getElementById('cardPresalesTargetInput')
        ];

        inputs.forEach(input => {
            if (input) {
                input.value = targetValue;
            }
        });

        const metaText = targetInfo.updatedAt
            ? `Last updated ${DataManager.formatDate(targetInfo.updatedAt)}${targetInfo.updatedBy ? ` by ${targetInfo.updatedBy}` : ''}.`
            : 'Default target applied. Update to customise per-user expectation.';

        const metaElements = [
            document.getElementById('presalesTargetMeta'),
            document.getElementById('cardPresalesTargetMeta')
        ];
        metaElements.forEach(el => {
            if (el) el.textContent = metaText;
        });

        const analytics = DataManager.getMonthlyAnalytics();
        const analyticsMonth = UI.formatMonth(analytics.month);
        const summaryText = analytics.totalPresalesUsers > 0
            ? `Team target (${analytics.totalPresalesUsers} presales users): ${analytics.teamTarget} activities • Actual ${analyticsMonth}: ${analytics.totalActivities}`
            : 'No presales users configured yet. Add users to track team targets.';

        const summaryElements = [
            document.getElementById('presalesTargetSummary'),
            document.getElementById('cardPresalesTargetSummary')
        ];
        summaryElements.forEach(el => {
            if (el) el.textContent = summaryText;
        });
    },

    renderProjectHealthSettings() {
        const container = document.getElementById('projectHealthAdminControls');
        if (!container || typeof App === 'undefined') {
            return;
        }

        container.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Inactivity Threshold</label>
                    <select id="projectHealthThreshold" class="form-control">
                        <option value="30">30 days</option>
                        <option value="45">45 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="120">120 days</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Risk Focus</label>
                    <select id="projectHealthStatus" class="form-control">
                        <option value="all">High & Medium Risk</option>
                        <option value="high">High Risk Only</option>
                        <option value="medium">Medium Risk Only</option>
                        <option value="no-activity">No Activity</option>
                    </select>
                </div>
                <div class="form-group checkbox-group">
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="projectHealthInclude">
                        Include projects with no activity
                    </label>
                </div>
                <div class="form-group" style="align-self: flex-end;">
                    <button class="btn btn-link" id="projectHealthResetBtn">Reset to defaults</button>
                </div>
            </div>
        `;

        const thresholdSelect = container.querySelector('#projectHealthThreshold');
        const statusSelect = container.querySelector('#projectHealthStatus');
        const includeToggle = container.querySelector('#projectHealthInclude');
        const resetBtn = container.querySelector('#projectHealthResetBtn');

        if (thresholdSelect) {
            thresholdSelect.addEventListener('change', (event) => {
                App.handleProjectHealthFilterChange('threshold', event.target.value, 'admin');
                App.syncProjectHealthControls();
            });
        }
        if (statusSelect) {
            statusSelect.addEventListener('change', (event) => {
                App.handleProjectHealthFilterChange('status', event.target.value, 'admin');
                App.syncProjectHealthControls();
            });
        }
        if (includeToggle) {
            includeToggle.addEventListener('change', (event) => {
                App.toggleProjectHealthInclude(event.target.checked, 'admin');
                App.syncProjectHealthControls();
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', (event) => {
                event.preventDefault();
                App.resetProjectHealthFilters();
                App.syncProjectHealthControls();
            });
        }

        App.syncProjectHealthControls();
    },

    savePresalesTarget(event) {
        event.preventDefault();
        const form = event.target;
        const input = form.querySelector('input[type="number"]');
        if (!input) return;

        const value = Number(input.value);
        if (!Number.isFinite(value) || value < 0) {
            UI.showNotification('Please enter a valid non-negative number for the target.', 'error');
            return;
        }

        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        DataManager.savePresalesActivityTarget(value, {
            updatedBy: currentUser?.username || 'Admin'
        });

        UI.showNotification('Presales activity target updated successfully.', 'success');
        this.loadAnalyticsSettings();

        if (typeof App !== 'undefined') {
            if (App.currentView === 'reports') {
                App.loadReports();
            }
            if (InterfaceManager.getCurrentInterface() === 'card') {
                App.loadCardReportsView();
            }
        }
    },

    // User Management
    loadUsers() {
        const users = DataManager.getUsers();
        const container = document.getElementById('usersList');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted">No users found</p>';
            return;
        }

        let html = '';
        users.forEach(user => {
            const statusBadge = user.isActive !== false
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-danger">Inactive</span>';
            const passwordBadge = user.forcePasswordChange
                ? '<span class="badge badge-warning">Password reset pending</span>'
                : '';
            html += `
                <div class="admin-user-item">
                    <div class="admin-user-info">
                        <div class="admin-user-name">${user.username}</div>
                        <div class="admin-user-email">${user.email}</div>
                        <div class="admin-user-roles">
                            ${user.roles.map(role => `<span class="badge">${role}</span>`).join('')}
                            ${statusBadge}
                            ${passwordBadge}
                        </div>
                    </div>
                    <div class="admin-user-actions">
                        <button class="btn btn-sm btn-secondary" onclick="Admin.editUser('${user.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="Admin.deleteUser('${user.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    exportPocSandboxCsv() {
        if (!Array.isArray(this.pocFilteredActivities) || !this.pocFilteredActivities.length) {
            UI.showNotification('No sandbox records available to export.', 'info');
            return;
        }

        const header = ['Account', 'User', 'Start Date', 'End Date', 'Environment Name', 'Status'];
        const rows = this.pocFilteredActivities.map((activity) => [
            activity.accountName || '',
            activity.userName || '',
            activity.details?.startDate || '',
            activity.details?.endDate || '',
            activity.details?.pocEnvironmentName || '',
            activity.details?.assignedStatus || 'Unassigned'
        ]);
        const csvRows = [header, ...rows].map((line) => line.join(',')).join('\r\n');
        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `poc_sandbox_${new Date().toISOString().substring(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    showAddUserModal() {
        this.createAddUserModal();
        UI.showModal('addUserModal');
    },

    createAddUserModal() {
        const container = document.getElementById('modalsContainer');
        const modalId = 'addUserModal';
        
        if (document.getElementById(modalId)) return;

        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Add New User</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <form id="addUserForm" onsubmit="Admin.addUser(event)">
                        <div class="form-group">
                            <label class="form-label required">Username</label>
                            <input type="text" class="form-control" id="newUsername" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Email</label>
                            <input type="email" class="form-control" id="newUserEmail" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Password</label>
                            <input type="password" class="form-control" id="newPassword" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Roles</label>
                            <div class="role-checkbox-group">
                                <div class="role-checkbox-item">
                                    <input type="checkbox" id="rolePresales" value="Presales User" class="role-checkbox">
                                    <label for="rolePresales">Presales User</label>
                                </div>
                                <div class="role-checkbox-item">
                                    <input type="checkbox" id="roleAdmin" value="Admin" class="role-checkbox">
                                    <label for="roleAdmin">Admin</label>
                                </div>
                                <div class="role-checkbox-item">
                                    <input type="checkbox" id="roleAnalytics" value="Analytics Access" class="role-checkbox">
                                    <label for="roleAnalytics">Analytics Access</label>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="forcePasswordChange" checked>
                                <span>Require password change on first login</span>
                            </label>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add User</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
    },

    addUser(event) {
        event.preventDefault();
        
        const roles = [];
        document.querySelectorAll('.role-checkbox:checked').forEach(cb => {
            roles.push(cb.value);
        });

        if (roles.length === 0) {
            UI.showNotification('Please select at least one role', 'error');
            return;
        }

        const passwordInput = document.getElementById('newPassword');
        const forcePasswordChangeCheckbox = document.getElementById('forcePasswordChange');
        const forcePasswordChange = forcePasswordChangeCheckbox ? forcePasswordChangeCheckbox.checked : true;
        const password = passwordInput?.value ? passwordInput.value.trim() : '';

        if (!password) {
            UI.showNotification('Please provide a temporary password for the user.', 'error');
            passwordInput?.focus();
            return;
        }

        const user = {
            username: document.getElementById('newUsername').value,
            email: document.getElementById('newUserEmail').value,
            password,
            roles: roles,
            regions: [],
            salesReps: [],
            isActive: true,
            forcePasswordChange: forcePasswordChange
        };

        // Check if username already exists
        if (DataManager.getUserByUsername(user.username)) {
            UI.showNotification('Username already exists', 'error');
            return;
        }

        DataManager.addUser(user);
        UI.hideModal('addUserModal');
        UI.showNotification('User added successfully', 'success');
        this.loadUsers();
        
        // Reset form
        document.getElementById('addUserForm').reset();
    },

    editUser(userId) {
        const user = DataManager.getUserById(userId);
        if (!user) {
            UI.showNotification('User not found', 'error');
            return;
        }
        this.createEditUserModal(user);
        UI.showModal('editUserModal');
    },

    createEditUserModal(user) {
        const container = document.getElementById('modalsContainer');
        const modalId = 'editUserModal';

        if (document.getElementById(modalId)) {
            document.getElementById(modalId).remove();
        }

        const roleOptions = [
            { id: 'editRolePresales', value: 'Presales User', label: 'Presales User' },
            { id: 'editRoleAdmin', value: 'Admin', label: 'Admin' },
            { id: 'editRoleAnalytics', value: 'Analytics Access', label: 'Analytics Access' }
        ];

        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Edit User</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <form id="editUserForm" onsubmit="Admin.updateUser(event, '${user.id}')">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-control" id="editUsername" value="${user.username}" disabled>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Email</label>
                            <input type="email" class="form-control" id="editUserEmail" value="${user.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password (leave blank to keep unchanged)</label>
                            <input type="password" class="form-control" id="editUserPassword" placeholder="New password">
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Roles</label>
                            <div class="role-checkbox-group">
                                ${roleOptions.map(option => `
                                    <div class="role-checkbox-item">
                                        <input type="checkbox" id="${option.id}" value="${option.value}" class="edit-role-checkbox" ${user.roles.includes(option.value) ? 'checked' : ''}>
                                        <label for="${option.id}">${option.label}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="editForcePasswordChange" ${user.forcePasswordChange ? 'checked' : ''}>
                                <span>Require password change on next login</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="editUserActive" ${user.isActive !== false ? 'checked' : ''}>
                                <span>Active</span>
                            </label>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update User</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
    },

    updateUser(event, userId) {
        event.preventDefault();

        const email = document.getElementById('editUserEmail').value.trim();
        const password = document.getElementById('editUserPassword').value;
        const isActive = document.getElementById('editUserActive').checked;
        const forcePasswordChange = document.getElementById('editForcePasswordChange')?.checked ?? false;
        const roles = Array.from(document.querySelectorAll('.edit-role-checkbox:checked')).map(cb => cb.value);

        if (!email) {
            UI.showNotification('Email is required.', 'error');
            return;
        }
        if (roles.length === 0) {
            UI.showNotification('Select at least one role.', 'error');
            return;
        }

        const updates = {
            email,
            roles,
            isActive,
            forcePasswordChange
        };
        if (password && password.trim().length > 0) {
            updates.password = password.trim();
        }

        const updated = DataManager.updateUser(userId, updates);
        if (updated) {
            UI.hideModal('editUserModal');
            UI.showNotification('User updated successfully', 'success');
            this.loadUsers();
        } else {
            UI.showNotification('Failed to update user', 'error');
        }
    },

    deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        DataManager.deleteUser(userId);
        UI.showNotification('User deleted successfully', 'success');
        this.loadUsers();
    },


    // Sales Rep Management
    loadSalesReps() {
        const salesReps = DataManager.getGlobalSalesReps();
        const container = document.getElementById('salesRepsList');
        if (!container) return;

        if (salesReps.length === 0) {
            container.innerHTML = '<p class="text-muted">No sales reps found</p>';
            return;
        }

        let html = '';
        salesReps.forEach(rep => {
            const currency = rep.currency || 'INR';
            const fxDisplay = rep.fxToInr && Number.isFinite(Number(rep.fxToInr))
                ? Number(rep.fxToInr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : null;
            html += `
                <div class="admin-user-item">
                    <div class="admin-user-info">
                        <div class="admin-user-name">${rep.name}</div>
                        <div class="admin-user-email">${rep.email || 'No email'}</div>
                        <div class="admin-user-roles">
                            <span class="badge">${rep.region || 'No region'}</span>
                            <span class="badge">${currency}</span>
                            ${rep.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}
                        </div>
                        ${fxDisplay ? `<div class=\"text-muted\" style=\"margin-top: 0.25rem; font-size: 0.85rem;\">1 ${currency} ≈ ₹${fxDisplay}</div>` : ''}
                    </div>
                    <div class="admin-user-actions">
                        <button class="btn btn-sm btn-secondary" onclick="Admin.editSalesRep('${rep.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="Admin.deleteSalesRep('${rep.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    showAddSalesRepModal() {
        const container = document.getElementById('modalsContainer');
        const modalId = 'addSalesRepModal';
        
        if (document.getElementById(modalId)) {
            UI.showModal(modalId);
            return;
        }

        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Add Sales User</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <form id="addSalesRepForm" onsubmit="Admin.addSalesRep(event)">
                        <div class="form-group">
                            <label class="form-label required">Name</label>
                            <input type="text" class="form-control" id="salesRepName" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Email (Primary Key)</label>
                            <input type="email" class="form-control" id="salesRepEmail" required>
                            <small class="text-muted">Email must be unique</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Region</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <select class="form-control" id="salesRepRegion" required style="flex: 1;">
                                    <option value="">Select Region</option>
                                    ${DataManager.getRegions().map(r => `<option value="${r}">${r}</option>`).join('')}
                                </select>
                                <button type="button" class="btn btn-secondary" onclick="Admin.showAddRegionModal()" style="white-space: nowrap;">+ Add New</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Currency</label>
                            <select class="form-control" id="salesRepCurrency" required>
                                <option value="INR" selected>INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Conversion to INR</label>
                            <input type="number" class="form-control" id="salesRepFxToInr" step="0.0001" min="0" placeholder="e.g. 83.25">
                            <small class="text-muted">Optional: enter how much 1 unit of this currency equals in INR.</small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add Sales User</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
        UI.showModal(modalId);
    },

    addSalesRep(event) {
        event.preventDefault();
        
        const name = document.getElementById('salesRepName').value.trim();
        const email = document.getElementById('salesRepEmail').value.trim();
        const region = document.getElementById('salesRepRegion').value;
        const currency = document.getElementById('salesRepCurrency').value;
        const fxInput = document.getElementById('salesRepFxToInr').value.trim();
        const fxNumeric = fxInput ? Number(fxInput) : null;

        if (!name || !email || !region) {
            UI.showNotification('Please fill in all required fields', 'error');
            return;
        }
        if (fxInput && (!Number.isFinite(fxNumeric) || fxNumeric <= 0)) {
            UI.showNotification('Enter a valid conversion rate greater than 0.', 'error');
            return;
        }

        const salesRep = {
            name: name,
            email: email,
            region: region,
            currency: currency,
            fxToInr: fxNumeric,
            isActive: true
        };

        const result = DataManager.addGlobalSalesRep(salesRep);
        if (result && !result.error) {
            UI.hideModal('addSalesRepModal');
            UI.showNotification('Sales user added successfully', 'success');
            this.loadSalesReps();
            document.getElementById('addSalesRepForm').reset();
        } else if (result && result.error) {
            UI.showNotification(result.message || 'Failed to add sales user', 'error');
        } else {
            UI.showNotification('Failed to add sales user', 'error');
        }
    },

    editSalesRep(salesRepId) {
        const salesRep = DataManager.getGlobalSalesReps().find(r => r.id === salesRepId);
        if (!salesRep) return;

        const container = document.getElementById('modalsContainer');
        const modalId = 'editSalesRepModal';
        
        if (document.getElementById(modalId)) {
            document.getElementById(modalId).remove();
        }

        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Edit Sales Rep</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <form id="editSalesRepForm" onsubmit="Admin.updateSalesRep(event, '${salesRepId}')">
                        <div class="form-group">
                            <label class="form-label required">Name</label>
                            <input type="text" class="form-control" id="editSalesRepName" value="${salesRep.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Email</label>
                            <input type="email" class="form-control" id="editSalesRepEmail" value="${salesRep.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Region</label>
                            <select class="form-control" id="editSalesRepRegion" required>
                                <option value="">Select Region</option>
                                ${DataManager.getRegions().map(r => 
                                    `<option value="${r}" ${r === salesRep.region ? 'selected' : ''}>${r}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Currency</label>
                            <select class="form-control" id="editSalesRepCurrency" required>
                                <option value="INR" ${(salesRep.currency || 'INR') === 'INR' ? 'selected' : ''}>INR (₹)</option>
                                <option value="USD" ${salesRep.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="EUR" ${salesRep.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                                <option value="GBP" ${salesRep.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Conversion to INR</label>
                            <input type="number" class="form-control" id="editSalesRepFxToInr" step="0.0001" min="0" value="${salesRep.fxToInr !== null && salesRep.fxToInr !== undefined ? salesRep.fxToInr : ''}" placeholder="e.g. 83.25">
                            <small class="text-muted">Optional: enter how much 1 unit of this currency equals in INR.</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="editSalesRepActive" ${salesRep.isActive ? 'checked' : ''}>
                                <span>Active</span>
                            </label>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Sales Rep</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
        UI.showModal(modalId);
    },

    updateSalesRep(event, salesRepId) {
        event.preventDefault();
        
        const name = document.getElementById('editSalesRepName').value.trim();
        const email = document.getElementById('editSalesRepEmail').value.trim();
        const region = document.getElementById('editSalesRepRegion').value;
        const currency = document.getElementById('editSalesRepCurrency').value;
        const fxInput = document.getElementById('editSalesRepFxToInr').value.trim();
        const fxNumeric = fxInput ? Number(fxInput) : null;
        const isActive = document.getElementById('editSalesRepActive').checked;

        if (!name || !email || !region) {
            UI.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (fxInput && (!Number.isFinite(fxNumeric) || fxNumeric <= 0)) {
            UI.showNotification('Enter a valid conversion rate greater than 0.', 'error');
            return;
        }

        const updated = DataManager.updateGlobalSalesRep(salesRepId, {
            name: name,
            email: email,
            region: region,
            currency: currency,
            fxToInr: fxNumeric,
            isActive: isActive
        });

        if (updated) {
            UI.hideModal('editSalesRepModal');
            UI.showNotification('Sales rep updated successfully', 'success');
            this.loadSalesReps();
        } else {
            UI.showNotification('Failed to update sales rep', 'error');
        }
    },

    deleteSalesRep(salesRepId) {
        if (!confirm('Are you sure you want to delete this sales user?')) return;
        
        DataManager.deleteGlobalSalesRep(salesRepId);
        UI.showNotification('Sales user deleted successfully', 'success');
        this.loadSalesReps();
    },

    // Show add region modal
    showAddRegionModal() {
        const region = prompt('Enter new region name:');
        if (region && region.trim()) {
            DataManager.addRegion(region.trim());
            // Refresh all region dropdowns
            const selects = document.querySelectorAll('select[id*="Region"], select[id*="region"]');
            selects.forEach(select => {
                if (select && select.id !== 'reportRegionFilter' && select.id !== 'adminRegionFilter') {
                    const option = document.createElement('option');
                    option.value = region.trim();
                    option.textContent = region.trim();
                    select.appendChild(option);
                }
            });
            UI.showNotification('Region added successfully', 'success');
        }
    },

    // POC Sandbox Access Management
    loadPOCSandbox() {
        const activities = DataManager.getAllActivities();
        const pocSandboxActivities = activities.filter(a => 
            a.type === 'poc' && 
            a.details && 
            a.details.accessType === 'Sandbox'
        );

        // Populate account filter
        const accounts = [...new Set(pocSandboxActivities.map(a => a.accountName).filter(Boolean))];
        const accountFilter = document.getElementById('pocAccountFilter');
        if (accountFilter) {
            let html = '<option value="">All Accounts</option>';
            accounts.forEach(account => {
                html += `<option value="${account}">${account}</option>`;
            });
            accountFilter.innerHTML = html;
        }

        this.filterPOCSandbox(pocSandboxActivities);
    },

    filterPOCSandbox(activities = null) {
        if (!activities) {
            const allActivities = DataManager.getAllActivities();
            activities = allActivities.filter(a => 
                a.type === 'poc' && 
                a.details && 
                a.details.accessType === 'Sandbox'
            );
        }

        const statusFilter = document.getElementById('pocStatusFilter')?.value;
        const accountFilter = document.getElementById('pocAccountFilter')?.value;
        const dateFrom = document.getElementById('pocDateFrom')?.value;
        const dateTo = document.getElementById('pocDateTo')?.value;

        let filtered = activities;

        if (statusFilter) {
            filtered = filtered.filter(a => {
                const status = a.details?.assignedStatus || 'Unassigned';
                return status === statusFilter;
            });
        }

        if (accountFilter) {
            filtered = filtered.filter(a => a.accountName === accountFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(a => {
                const date = a.date || a.createdAt;
                return date >= dateFrom;
            });
        }

        if (dateTo) {
            filtered = filtered.filter(a => {
                const date = a.date || a.createdAt;
                return date <= dateTo;
            });
        }

        this.pocFilteredActivities = filtered;

        // Display in table
        const container = document.getElementById('pocSandboxTable');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-muted">No POC Sandbox requests found</p>';
            return;
        }

        let html = `
            <table class="admin-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                        <th style="padding: 0.75rem; text-align: left;">Account Name</th>
                        <th style="padding: 0.75rem; text-align: left;">User Name</th>
                        <th style="padding: 0.75rem; text-align: left;">Start Date</th>
                        <th style="padding: 0.75rem; text-align: left;">End Date</th>
                        <th style="padding: 0.75rem; text-align: left;">POC Environment Name</th>
                        <th style="padding: 0.75rem; text-align: left;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtered.forEach(activity => {
            const envName = activity.details?.pocEnvironmentName || '';
            const status = activity.details?.assignedStatus || 'Unassigned';
            const envNameId = `pocEnv_${activity.id}`;
            const statusId = `pocStatus_${activity.id}`;

            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 0.75rem;">${activity.accountName || '-'}</td>
                    <td style="padding: 0.75rem;">${activity.userName || '-'}</td>
                    <td style="padding: 0.75rem;">${UI.formatDate(activity.details?.startDate || '')}</td>
                    <td style="padding: 0.75rem;">${UI.formatDate(activity.details?.endDate || '')}</td>
                    <td style="padding: 0.75rem;">
                        <input type="text" 
                               id="${envNameId}" 
                               class="form-control" 
                               value="${envName}" 
                               placeholder="Enter environment name..."
                               style="min-width: 200px;"
                               onblur="Admin.updatePOCEnvironment('${activity.id}', this.value)">
                    </td>
                    <td style="padding: 0.75rem;">
                        <select id="${statusId}" 
                                class="form-control" 
                                style="min-width: 120px;"
                                onchange="Admin.updatePOCStatus('${activity.id}', this.value)">
                            <option value="Unassigned" ${status === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
                            <option value="Assigned" ${status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                        </select>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    updatePOCEnvironment(activityId, envName) {
        try {
            // Update in external activities
            const activities = DataManager.getActivities();
            const activity = activities.find(a => a.id === activityId);
            if (activity && activity.details) {
                activity.details.pocEnvironmentName = envName.trim();
                DataManager.saveActivities(activities);
                UI.showNotification('POC Environment Name updated', 'success');
                this.loadPOCSandbox(); // Refresh table
                return;
            }
            
            // If not found, try internal activities (shouldn't happen for POC, but just in case)
            const internalActivities = DataManager.getInternalActivities();
            const internalActivity = internalActivities.find(a => a.id === activityId);
            if (internalActivity && internalActivity.details) {
                internalActivity.details.pocEnvironmentName = envName.trim();
                DataManager.saveInternalActivities(internalActivities);
                UI.showNotification('POC Environment Name updated', 'success');
                this.loadPOCSandbox(); // Refresh table
            }
        } catch (error) {
            console.error('Error updating POC environment:', error);
            UI.showNotification('Error updating POC environment', 'error');
        }
    },

    updatePOCStatus(activityId, status) {
        try {
            // Update in external activities
            const activities = DataManager.getActivities();
            const activity = activities.find(a => a.id === activityId);
            if (activity && activity.details) {
                activity.details.assignedStatus = status;
                DataManager.saveActivities(activities);
                UI.showNotification('POC Status updated', 'success');
                this.loadPOCSandbox(); // Refresh table
                return;
            }
            
            // If not found, try internal activities (shouldn't happen for POC, but just in case)
            const internalActivities = DataManager.getInternalActivities();
            const internalActivity = internalActivities.find(a => a.id === activityId);
            if (internalActivity && internalActivity.details) {
                internalActivity.details.assignedStatus = status;
                DataManager.saveInternalActivities(internalActivities);
                UI.showNotification('POC Status updated', 'success');
                this.loadPOCSandbox(); // Refresh table
            }
        } catch (error) {
            console.error('Error updating POC status:', error);
            UI.showNotification('Error updating POC status', 'error');
        }
    },

    // Load promotable sales reps (from activities)
    loadPromotableSalesReps() {
        const promotable = DataManager.getSalesRepsFromActivities();
        const container = document.getElementById('promotableSalesReps');
        if (!container) return;

        if (promotable.length === 0) {
            container.innerHTML = '<p class="text-muted text-sm">No sales reps to promote</p>';
            return;
        }

        let html = '';
        promotable.forEach(name => {
            html += `
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
                    <span class="text-sm">${name}</span>
                    <button class="btn btn-sm btn-primary" onclick="Admin.promoteSalesRep('${name}')">Promote</button>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    promoteSalesRep(name) {
        // Show modal to add email and region
        const container = document.getElementById('modalsContainer');
        const modalId = 'promoteSalesRepModal';
        
        if (document.getElementById(modalId)) {
            document.getElementById(modalId).remove();
        }

        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Promote Sales Rep</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <form id="promoteSalesRepForm" onsubmit="Admin.addPromotedSalesRep(event, '${name}')">
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-control" value="${name}" disabled>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Email</label>
                            <input type="email" class="form-control" id="promoteSalesRepEmail" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Region</label>
                            <select class="form-control" id="promoteSalesRepRegion" required>
                                <option value="">Select Region</option>
                                ${DataManager.getRegions().map(r => `<option value="${r}">${r}</option>`).join('')}
                            </select>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add to Global List</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
        UI.showModal(modalId);
    },

    addPromotedSalesRep(event, name) {
        event.preventDefault();
        
        const email = document.getElementById('promoteSalesRepEmail').value.trim();
        const region = document.getElementById('promoteSalesRepRegion').value;

        if (!email || !region) {
            UI.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const salesRep = {
            name: name,
            email: email,
            region: region,
            isActive: true
        };

        const result = DataManager.addGlobalSalesRep(salesRep);
        if (result) {
            UI.hideModal('promoteSalesRepModal');
            UI.showNotification('Sales rep promoted successfully', 'success');
            this.loadSalesReps();
            this.loadPromotableSalesReps();
        } else {
            UI.showNotification('Sales rep already exists', 'error');
        }
    },

    // Admin Activities View
    loadAdminActivities() {
        const activities = DataManager.getAllActivities();
        const container = document.getElementById('adminActivitiesTable');
        if (!container) return;

        // Populate filters
        this.populateAdminFilters(activities);

        // Filter activities
        const filtered = this.filterAdminActivities(activities);

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-muted">No activities found</p>';
            return;
        }

        let html = `
            <table class="admin-activities-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Account</th>
                        <th>Project</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtered.forEach(activity => {
            html += `
                <tr>
                    <td>${UI.formatDate(activity.date || activity.createdAt)}</td>
                    <td>${activity.userName || 'Unknown'}</td>
                    <td><span class="badge ${activity.isInternal ? 'badge-internal' : 'badge-customer'}">${UI.getActivityTypeLabel(activity.type)}</span></td>
                    <td>${activity.accountName || '-'}</td>
                    <td>${activity.projectName || '-'}</td>
                    <td>${UI.getActivitySummary(activity) || '-'}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    populateAdminFilters(activities) {
        const users = DataManager.getUsers();
        const regions = DataManager.getRegions();
        
        // User filter
        const userFilter = document.getElementById('adminUserFilter');
        if (userFilter) {
            let html = '<option value="">All Users</option>';
            users.forEach(user => {
                html += `<option value="${user.id}">${user.username}</option>`;
            });
            userFilter.innerHTML = html;
        }

        // Region filter
        const regionFilter = document.getElementById('adminRegionFilter');
        if (regionFilter) {
            let html = '<option value="">All Regions</option>';
            regions.forEach(region => {
                html += `<option value="${region}">${region}</option>`;
            });
            regionFilter.innerHTML = html;
        }

        // Activity type filter
        const activityFilter = document.getElementById('adminActivityFilter');
        if (activityFilter) {
            const types = [...new Set(activities.map(a => a.type))];
            let html = '<option value="">All Activity Types</option>';
            types.forEach(type => {
                html += `<option value="${type}">${UI.getActivityTypeLabel(type)}</option>`;
            });
            activityFilter.innerHTML = html;
        }
    },

    loadControls(force) {
        const container = document.getElementById('featureDashboardControls');
        if (!container) return;

        if (!force) {
            container.innerHTML = '<div class="text-muted">Loading controls…</div>';
        }

        this.controlsLoading = true;

        Promise.all([
            fetch('/api/admin/config/feature-flags', {
                cache: 'no-store',
                headers: this.getAdminHeaders()
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load feature flags (${response.status})`);
                }
                return response.json();
            }),
            fetch('/api/admin/config/dashboard-visibility', {
                cache: 'no-store',
                headers: this.getAdminHeaders()
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load dashboard visibility (${response.status})`);
                }
                return response.json();
            })
        ])
            .then(([featurePayload, dashboardPayload]) => {
                const defaultFeatures = {};
                Object.keys(this.featureFlagMetadata).forEach((flag) => {
                    defaultFeatures[flag] = true;
                });
                this.currentFeatureFlags = {
                    ...defaultFeatures,
                    ...(featurePayload?.featureFlags || {})
                };

                this.currentDashboardVisibility = {
                    ...this.defaultDashboardVisibility,
                    ...(dashboardPayload?.visibility || {})
                };

                this.controlDefinitions = this.buildControlDefinitions();
                this.controlDraft = this.buildControlDraft();
                this.renderControlMatrix();
            })
            .catch((error) => {
                console.error('Failed to load capability controls:', error);
                container.innerHTML = `
                    <div class="text-muted">Unable to load controls. Please try again once the server is reachable.</div>
                `;
            })
            .finally(() => {
                this.controlsLoading = false;
                this.updateControlButtons();
            });
    },

    buildControlDefinitions() {
        const definitions = [];

        Object.keys(this.featureFlagMetadata).forEach((flag) => {
            const meta = this.featureFlagMetadata[flag] || {};
            definitions.push({
                key: flag,
                label: meta.label || flag,
                description: meta.description || '',
                supportsFeature: true,
                dashboardKey: meta.dashboardKey || null
            });
        });

        Object.keys(this.dashboardVisibilityMetadata).forEach((key) => {
            const alreadyIncluded = definitions.some(
                (def) => def.dashboardKey === key || def.key === key
            );
            if (alreadyIncluded) return;

            const meta = this.dashboardVisibilityMetadata[key] || {};
            definitions.push({
                key: key,
                label: meta.label || key,
                description: meta.description || '',
                supportsFeature: false,
                dashboardKey: key
            });
        });

        return definitions;
    },

    buildControlDraft() {
        const draft = {};
        this.controlDefinitions.forEach((def) => {
            const featureEnabled = def.supportsFeature
                ? this.currentFeatureFlags[def.key] !== false
                : true;
            const dashboardVisible = def.dashboardKey
                ? this.currentDashboardVisibility[def.dashboardKey] !== false
                : true;
            const value = def.supportsFeature ? (featureEnabled && dashboardVisible) : dashboardVisible;

            draft[def.key] = {
                value: value
            };
        });
        return draft;
    },

    renderControlMatrix() {
        const container = document.getElementById('featureDashboardControls');
        if (!container) return;

        if (!this.controlDefinitions.length) {
            container.innerHTML = '<div class="text-muted">No configurable items available.</div>';
            return;
        }

        const rows = this.controlDefinitions
            .map((def) => {
                const state = this.controlDraft[def.key] || {};
                const isOn = state.value !== false;
                const statusClass = isOn ? 'status-on' : 'status-off';
                const statusLabel = def.supportsFeature
                    ? (isOn ? 'Enabled' : 'Disabled')
                    : (isOn ? 'Visible' : 'Hidden');
                const toggleLabel = def.supportsFeature ? 'Enable feature & card' : 'Show to users';

                return `
                    <div class="admin-config-card" data-admin-control="${def.key}">
                        <div class="admin-config-card-header">
                            <h3 class="admin-config-card-title">${def.label}</h3>
                            <span class="admin-config-card-status ${statusClass}">
                                ${statusLabel}
                            </span>
                        </div>
                        <div class="admin-config-card-body">
                            <label class="control-toggle">
                                <input type="checkbox"
                                       data-control-type="${def.supportsFeature ? 'feature' : 'dashboard'}"
                                       data-control-key="${def.key}"
                                       ${isOn ? 'checked' : ''}>
                                <span>${toggleLabel}</span>
                            </label>
                            ${def.description
                                ? `<p class="admin-config-card-description">${def.description}</p>`
                                : ''}
                        </div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = `
            <div class="admin-config-grid">
                ${rows}
            </div>
            <div class="admin-config-actions">
                <div class="admin-config-toolbar">
                    <button id="controlsSaveBtn" class="btn btn-primary" disabled>Save changes</button>
                    <button id="controlsResetBtn" class="btn btn-secondary" disabled>Reset</button>
                </div>
                <div id="controlsStatusText" class="admin-config-note"></div>
            </div>
        `;

        container
            .querySelectorAll('input[data-control-type]')
            .forEach((input) =>
                input.addEventListener('change', (event) => this.handleControlToggle(event))
            );

        container.querySelector('#controlsSaveBtn')?.addEventListener('click', () => this.saveControls());
        container.querySelector('#controlsResetBtn')?.addEventListener('click', () => this.resetControls());

        this.markControlsDirty();
    },

    handleControlToggle(event) {
        const input = event.currentTarget;
        const controlKey = input?.dataset?.controlKey;
        if (!controlKey) {
            return;
        }

        const definition = this.controlDefinitions.find((def) => def.key === controlKey);
        if (!definition) {
            return;
        }

        const draft = this.controlDraft[controlKey] || {};
        draft.value = input.checked;
        this.controlDraft[controlKey] = draft;
        this.markControlsDirty();
    },

    updateControlStatuses() {
        this.controlDefinitions.forEach((def) => {
            const card = document.querySelector(`[data-admin-control="${def.key}"]`);
            if (!card) return;
            const statusEl = card.querySelector('.admin-config-card-status');
            if (!statusEl) return;

            const draft = this.controlDraft[def.key] || {};
            const isOn = draft.value !== false;
            statusEl.textContent = def.supportsFeature ? (isOn ? 'Enabled' : 'Disabled') : (isOn ? 'Visible' : 'Hidden');
            statusEl.classList.toggle('status-on', isOn);
            statusEl.classList.toggle('status-off', !isOn);
        });
    },

    markControlsDirty() {
        let dirty = false;

        this.controlDefinitions.forEach((def) => {
            const draftValue = (this.controlDraft[def.key] || {}).value !== false;
            const currentFeature = def.supportsFeature
                ? this.currentFeatureFlags[def.key] !== false
                : true;
            const currentDashboardVisible = def.dashboardKey
                ? this.currentDashboardVisibility[def.dashboardKey] !== false
                : true;
            const currentValue = def.supportsFeature
                ? (currentFeature && currentDashboardVisible)
                : currentDashboardVisible;

            if (draftValue !== currentValue) {
                dirty = true;
            }
        });

        this.controlDirty = dirty;
        this.updateControlButtons();
        this.updateControlStatuses();
    },

    updateControlButtons(message) {
        const saveBtn = document.getElementById('controlsSaveBtn');
        const resetBtn = document.getElementById('controlsResetBtn');
        const statusText = document.getElementById('controlsStatusText');

        if (statusText) {
            if (message) {
                statusText.textContent = message;
            } else if (this.controlsLoading) {
                statusText.textContent = 'Saving changes…';
            } else if (this.controlDirty) {
                statusText.textContent = 'You have unsaved changes.';
            } else {
                statusText.textContent = '';
            }
        }

        if (saveBtn) {
            saveBtn.disabled = !this.controlDirty || this.controlsLoading;
        }
        if (resetBtn) {
            resetBtn.disabled = (!this.controlDirty && !this.controlsLoading);
        }
    },

    resetControls() {
        if (this.controlsLoading) return;
        this.controlDraft = this.buildControlDraft();
        this.renderControlMatrix();
        this.controlDirty = false;
        this.updateControlButtons();
    },

    saveControls() {
        if (!this.controlDirty || this.controlsLoading) {
            return;
        }

        this.controlsLoading = true;
        this.updateControlButtons('Saving changes…');

        const featurePayload = {};
        this.controlDefinitions.forEach((def) => {
            if (!def.supportsFeature) return;
            const draft = this.controlDraft[def.key] || {};
            featurePayload[def.key] = draft.value !== false;
        });

        const visibilityPayload = { ...this.currentDashboardVisibility };
        this.controlDefinitions.forEach((def) => {
            if (!def.dashboardKey) return;
            const draft = this.controlDraft[def.key] || {};
            const visible = draft.value !== false;
            visibilityPayload[def.dashboardKey] = visible;
        });

        fetch('/api/admin/config/feature-flags', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...this.getAdminHeaders() },
            body: JSON.stringify({ featureFlags: featurePayload })
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Feature update failed (${response.status})`);
                }
                return response.json();
            })
            .then((featureResult) => {
                this.currentFeatureFlags = featureResult?.featureFlags || this.currentFeatureFlags;
                return fetch('/api/admin/config/dashboard-visibility', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...this.getAdminHeaders() },
                    body: JSON.stringify({ visibility: visibilityPayload })
                });
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Dashboard update failed (${response.status})`);
                }
                return response.json();
            })
            .then((visibilityResult) => {
                this.currentDashboardVisibility =
                    visibilityResult?.visibility || this.currentDashboardVisibility;
                this.controlDraft = this.buildControlDraft();
                this.renderControlMatrix();
                this.controlDirty = false;
                this.updateControlButtons('Changes saved.');
                UI.showNotification('Configuration updated.', 'success');
                if (typeof App !== 'undefined' && typeof App.refreshAppConfiguration === 'function') {
                    App.refreshAppConfiguration();
                }
            })
            .catch((error) => {
                console.error('Failed to save controls:', error);
                UI.showNotification('Unable to save configuration changes.', 'error');
                this.updateControlButtons('Unable to save configuration changes.');
            })
            .finally(() => {
                this.controlsLoading = false;
                setTimeout(() => this.updateControlButtons(), 1500);
            });
    },

    loadLoginLogs(force) {
        const summaryEl = document.getElementById('loginMetricsSummary');
        const perDayEl = document.getElementById('loginMetricsByDate');
        const topUsersEl = document.getElementById('loginTopUsers');

        if (!summaryEl || !perDayEl || !topUsersEl) {
            return;
        }

        if (!force) {
            summaryEl.textContent = 'Fetching latest activity...';
        }

        fetch(`/api/admin/logs?limit=100&offset=0`, {
            cache: 'no-store',
            headers: this.getAdminHeaders()
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load login logs');
                }
                return response.json();
            })
            .then((payload) => {
                this.renderLoginMetrics(payload);
            })
            .catch((error) => {
                console.error('Failed to load login logs:', error);
                summaryEl.textContent = 'Unable to load activity summary.';
                perDayEl.innerHTML = '<div class="text-muted">—</div>';
                topUsersEl.innerHTML = '<div class="text-muted">—</div>';
            });
    },

    renderLoginMetrics(payload = {}) {
        const metrics = payload?.metrics || {};
        const summaryEl = document.getElementById('loginMetricsSummary');
        const perDayTargets = [
            document.getElementById('loginMetricsByDate'),
            document.getElementById('loginLogsDetailByDate')
        ];
        const topUserTargets = [
            document.getElementById('loginTopUsers'),
            document.getElementById('loginLogsDetailTopUsers')
        ];

        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="metric-capsule">
                    <div class="metric-label">Logins today</div>
                    <div class="metric-value">${metrics.summary?.totalToday ?? 0}</div>
                </div>
                <div class="metric-capsule">
                    <div class="metric-label">Last 7 days</div>
                    <div class="metric-value">${metrics.summary?.total7Days ?? 0}</div>
                </div>
                <div class="metric-capsule">
                    <div class="metric-label">Unique users</div>
                    <div class="metric-value">${metrics.summary?.uniqueUsers7Days ?? 0}</div>
                </div>
            `;
        }

        const perDay = Array.isArray(metrics.activityByDate) ? metrics.activityByDate : [];
        perDayTargets.forEach((target) => {
            if (!target) return;
            target.innerHTML = perDay.length
                ? perDay.map(row => `<div class="metric-row"><span>${row.date}</span><span>${row.count}</span></div>`).join('')
                : '<div class="text-muted">No login activity recorded yet.</div>';
        });

        const topUsers = Array.isArray(metrics.topUsers) ? metrics.topUsers : [];
        topUserTargets.forEach((target) => {
            if (!target) return;
            target.innerHTML = topUsers.length
                ? topUsers.map(row => `<div class="metric-row"><span>${row.username}</span><span>${row.count}</span></div>`).join('')
                : '<div class="text-muted">No recent user activity.</div>';
        });
    },

    updateLoginLogsPagination() {
        const prevBtn = document.getElementById('loginLogsPrevBtn');
        const nextBtn = document.getElementById('loginLogsNextBtn');
        const label = document.getElementById('loginLogsPageLabel');

        if (prevBtn) {
            prevBtn.disabled = this.loginLogsLoading || this.loginLogsPage === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = this.loginLogsLoading || !this.loginLogsHasMore;
        }
        if (label) {
            const start = this.loginLogsPage * this.loginLogsLimit + 1;
            const end = start + this.loginLogsCurrentRows.length - 1;
            label.textContent = this.loginLogsCurrentRows.length
                ? `Showing ${start} – ${end}`
                : 'No entries to display';
        }
    },

    loadLoginLogsPage(action = 'refresh') {
        if (this.loginLogsLoading) {
            return;
        }

        if (action === 'prev' && this.loginLogsPage === 0) {
            return;
        }

        if (action === 'next' && !this.loginLogsHasMore) {
            return;
        }

        if (action === 'prev') {
            this.loginLogsPage = Math.max(this.loginLogsPage - 1, 0);
        } else if (action === 'next') {
            this.loginLogsPage += 1;
        } else if (action === 'refresh') {
            // keep current page
        } else if (action === 'reset') {
            this.loginLogsPage = 0;
        }

        const tableBody = document.querySelector('#loginLogsDetailTable tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="text-muted" style="text-align:center;">Loading login activity…</div>
                    </td>
                </tr>
            `;
        }

        this.loginLogsLoading = true;
        this.updateLoginLogsPagination();

        const offset = this.loginLogsPage * this.loginLogsLimit;
        fetch(`/api/admin/logs?limit=${this.loginLogsLimit}&offset=${offset}`, {
            cache: 'no-store',
            headers: this.getAdminHeaders()
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load login logs');
                }
                return response.json();
            })
            .then((payload) => {
                this.renderLoginMetrics(payload);
                const logs = Array.isArray(payload?.logs) ? payload.logs : [];
                this.loginLogsCurrentRows = logs;
                this.loginLogsHasMore = Boolean(payload?.hasMore);

                if (tableBody) {
                    if (!logs.length) {
                        tableBody.innerHTML = `
                            <tr>
                                <td colspan="7">
                                    <div class="text-muted" style="text-align:center;">No login attempts recorded.</div>
                                </td>
                            </tr>
                        `;
                    } else {
                        tableBody.innerHTML = logs
                            .map(log => {
                                const statusCapsule = log.status === 'success'
                                    ? '<span class="status-pill success">Success</span>'
                                    : '<span class="status-pill danger">Failure</span>';
                                return `
                                    <tr>
                                        <td>${this.formatDateTime(log.createdAt)}</td>
                                        <td>${log.username || 'Unknown'}</td>
                                        <td>${log.transactionId || '—'}</td>
                                        <td>${statusCapsule}</td>
                                        <td>${log.message || '—'}</td>
                                        <td>${log.ipAddress || 'Unknown'}</td>
                                        <td>${log.userAgent || ''}</td>
                                    </tr>
                                `;
                            })
                            .join('');
                    }
                }
            })
            .catch((error) => {
                console.error('Failed to load login logs page:', error);
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7">
                                <div class="text-muted" style="text-align:center;">Unable to load login logs.</div>
                            </td>
                        </tr>
                    `;
                }
            })
            .finally(() => {
                this.loginLogsLoading = false;
                this.updateLoginLogsPagination();
            });
    },

    exportLoginLogs() {
        if (!Array.isArray(this.loginLogsCurrentRows) || !this.loginLogsCurrentRows.length) {
            UI.showNotification('No login entries available to export.', 'info');
            return;
        }
        const header = ['Timestamp', 'User', 'Transaction ID', 'Status', 'Message', 'IP Address', 'User Agent'];
        const rows = this.loginLogsCurrentRows.map((log) => [
            this.formatDateTime(log.createdAt),
            log.username || 'Unknown',
            log.transactionId || '',
            log.status || '',
            (log.message || '').replace(/,/g, ';'),
            log.ipAddress || '',
            (log.userAgent || '').replace(/,/g, ';')
        ]);
        const csvRows = [header, ...rows].map((line) => line.join(',')).join('\r\n');
        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `login_logs_page_${this.loginLogsPage + 1}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    initLoginLogsView() {
        this.loginLogsPage = 0;
        this.loginLogsHasMore = false;
        this.loginLogsCurrentRows = [];
        this.updateLoginLogsPagination();
        this.loadLoginLogsPage('reset');
    },

    formatDateTime(value) {
        if (!value) return 'Unknown';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    exportMonthlyCsv() {
        if (typeof App !== 'undefined' && !App.isFeatureEnabled('adminCsvExport')) {
            UI.showNotification('Admin CSV export is currently disabled.', 'info');
            return;
        }

        const monthInput = document.getElementById('adminReportMonth');
        const selectedMonth = monthInput && monthInput.value
            ? monthInput.value
            : new Date().toISOString().substring(0, 7);

        const analytics = DataManager.getMonthlyAnalytics(selectedMonth, App.reportFilters || {});
        if (!analytics) {
            UI.showNotification('No analytics data available for the selected month.', 'error');
            return;
        }

        const rows = App.buildReportsCsvRows(analytics);
        const filename = `pams_reports_${selectedMonth}_admin.csv`;
        App.downloadCsv(filename, rows);
        UI.showNotification('Monthly analytics CSV downloaded.', 'success');
        if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
            Audit.log({
                action: 'report.export',
                entity: 'monthlyAnalytics',
                entityId: selectedMonth,
                detail: { rowCount: rows.length }
            });
        }
    },

    loadActivityLogs(force) {
        const container = document.getElementById('activityLogsTable');
        if (!container) return;

        if (!force) {
            container.innerHTML = '<div class="text-muted">Loading activity logs…</div>';
        }

        fetch('/api/admin/activity?limit=200', {
            cache: 'no-store',
            headers: this.getAdminHeaders()
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch activity logs');
                }
                return response.json();
            })
            .then(payload => {
                const logs = Array.isArray(payload?.logs) ? payload.logs : [];
                if (!logs.length) {
                    container.innerHTML = '<div class="text-muted">No activity records yet.</div>';
                    return;
                }

                const rows = logs.map(log => `
                    <tr>
                        <td>${this.formatDateTime(log.createdAt)}</td>
                        <td>${log.username || 'Unknown'}</td>
                        <td>${log.action || '—'}</td>
                        <td>${log.entity || '—'}</td>
                        <td>${log.entityId || '—'}</td>
                        <td>${log.transactionId || '—'}</td>
                        <td><code class="log-detail">${this.formatDetail(log.detail)}</code></td>
                    </tr>
                `).join('');

                container.innerHTML = `
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Entity ID</th>
                                    <th>Transaction ID</th>
                                    <th>Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                `;
            })
            .catch(error => {
                console.error('Failed to load activity logs:', error);
                container.innerHTML = '<div class="text-muted">Unable to load activity logs.</div>';
            });
    },

    exportActivityLogsCsv() {
        fetch('/api/admin/activity?limit=500', {
            cache: 'no-store',
            headers: this.getAdminHeaders()
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch activity logs for export');
                }
                return response.json();
            })
            .then(payload => {
                const logs = Array.isArray(payload?.logs) ? payload.logs : [];
                if (!logs.length) {
                    UI.showNotification('No activity logs available to export.', 'info');
                    return;
                }

                const header = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Transaction ID', 'Detail'];
                const rows = logs.map(log => [
                    this.formatDateTime(log.createdAt),
                    log.username || 'Unknown',
                    log.action || '',
                    log.entity || '',
                    log.entityId || '',
                    log.transactionId || '',
                    JSON.stringify(log.detail || {})
                ]);

                if (typeof App !== 'undefined' && typeof App.downloadCsv === 'function') {
                    App.downloadCsv(`activity_logs_${new Date().toISOString().substring(0, 10)}.csv`, [header, ...rows]);
                } else {
                    const csv = rows.map(row => row.join(',')).join('\r\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `activity_logs_${Date.now()}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }

                UI.showNotification('Activity logs exported.', 'success');
                if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
                    Audit.log({
                        action: 'activity.export',
                        entity: 'auditLogs',
                        entityId: `range:${rows.length}`,
                        detail: { rowCount: rows.length }
                    });
                }
            })
            .catch(error => {
                console.error('Failed to export activity logs:', error);
                UI.showNotification('Unable to export activity logs.', 'error');
            });
    },

    formatDetail(detail) {
        if (!detail) return '{}';
        try {
            return JSON.stringify(detail, null, 0);
        } catch (error) {
            return '{}';
        }
    },

    filterAdminActivities(activities = null) {
        if (!activities) {
            activities = DataManager.getAllActivities();
        }

        const userId = document.getElementById('adminUserFilter')?.value;
        const region = document.getElementById('adminRegionFilter')?.value;
        const activityType = document.getElementById('adminActivityFilter')?.value;

        let filtered = activities;

        if (userId) {
            filtered = filtered.filter(a => a.userId === userId);
        }

        if (region) {
            filtered = filtered.filter(a => a.region === region || a.account?.region === region);
        }

        if (activityType) {
            filtered = filtered.filter(a => a.type === activityType);
        }

        // Update table
        const container = document.getElementById('adminActivitiesTable');
        if (container) {
            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-muted">No activities found</p>';
                return filtered;
            }

            let html = `
                <table class="admin-activities-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>User</th>
                            <th>Type</th>
                            <th>Account</th>
                            <th>Project</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            filtered.forEach(activity => {
                html += `
                    <tr>
                        <td>${UI.formatDate(activity.date || activity.createdAt)}</td>
                        <td>${activity.userName || 'Unknown'}</td>
                        <td><span class="badge ${activity.isInternal ? 'badge-internal' : 'badge-customer'}">${UI.getActivityTypeLabel(activity.type)}</span></td>
                        <td>${activity.accountName || '-'}</td>
                        <td>${activity.projectName || '-'}</td>
                        <td>${UI.getActivitySummary(activity) || '-'}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;
        }

        return filtered;
    }
};

// Expose Admin globally
window.Admin = Admin;

