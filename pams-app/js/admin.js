// Admin Module

const Admin = {
    // Load admin panel
    loadAdminPanel() {
        try {
            console.log('Loading admin panel...');
            this.loadUsers();
            this.loadSalesReps();
            this.loadAnalyticsSettings();
            this.loadPOCSandbox();
            console.log('Admin panel loaded');
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
            html += `
                <div class="admin-user-item">
                    <div class="admin-user-info">
                        <div class="admin-user-name">${user.username}</div>
                        <div class="admin-user-email">${user.email}</div>
                        <div class="admin-user-roles">
                            ${user.roles.map(role => `<span class="badge">${role}</span>`).join('')}
                            ${statusBadge}
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

        const user = {
            username: document.getElementById('newUsername').value,
            email: document.getElementById('newUserEmail').value,
            password: document.getElementById('newPassword').value,
            roles: roles,
            regions: [],
            salesReps: [],
            isActive: true
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
            isActive
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

