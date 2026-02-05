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
            label: 'Sandbox Access',
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
    salesRepFilters: {
        region: 'all',
        search: ''
    },
    salesRepSearchDebounce: null,
    salesRepFiltersInitialized: false,
    loadedSections: new Set(),
    activeSection: null,
    clearActivitiesInProgress: false,

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

    // Load admin panel (legacy - redirects to systemAdmin)
    loadAdminPanel() {
        this.loadSystemAdminPanel();
    },
    
    // Load System Admin panel
    loadSystemAdminPanel() {
        try {
            this.loadedSections = new Set();
            this.activeSection = null;
            this.setupSectionNavigation('systemAdmin');

            const monthInput = document.getElementById('adminReportMonth');
            if (monthInput && !monthInput.value) {
                monthInput.value = new Date().toISOString().substring(0, 7);
            }

            // Open first section by default
            const firstSectionItem = document.querySelector('#systemAdminSectionsNav [data-admin-nav]');
            if (firstSectionItem) {
                this.openAdminSection(firstSectionItem.dataset.adminNav, null, 'systemAdmin');
            } else {
                // Show empty state if no sections
                const container = document.getElementById('systemAdminSectionsContainer');
                if (container) {
                    container.innerHTML = '<div class="admin-content-empty">Select an option from the sidebar to get started</div>';
                }
            }
        } catch (error) {
            console.error('Error loading system admin panel:', error);
            UI.showNotification('Error loading system admin panel', 'error');
        }
    },
    
    // Load Configuration panel
    loadConfigurationPanel() {
        try {
            this.loadedSections = new Set();
            this.activeSection = null;
            this.setupSectionNavigation('configuration');

            const interfaceSelect = document.getElementById('interfaceSelect') || document.getElementById('interfaceSelectConfig');
            if (interfaceSelect) {
                interfaceSelect.value = InterfaceManager.getCurrentInterface();
            }
            const themeSelect = document.getElementById('interfaceThemeSelect') || document.getElementById('interfaceThemeSelectConfig');
            if (themeSelect) {
                themeSelect.value = InterfaceManager.getCurrentTheme();
            }
            const monthInput = document.getElementById('adminReportMonth') || document.getElementById('adminReportMonthConfig');
            if (monthInput && !monthInput.value) {
                monthInput.value = new Date().toISOString().substring(0, 7);
            }

            // Open first section by default
            const firstSectionItem = document.querySelector('#configurationSectionsNav [data-admin-nav]');
            if (firstSectionItem) {
                this.openAdminSection(firstSectionItem.dataset.adminNav, null, 'configuration');
            } else {
                // Show empty state if no sections
                const container = document.getElementById('configurationSectionsContainer');
                if (container) {
                    container.innerHTML = '<div class="admin-content-empty">Select an option from the sidebar to get started</div>';
                }
            }
        } catch (error) {
            console.error('Error loading configuration panel:', error);
            UI.showNotification('Error loading configuration panel', 'error');
        }
    },

    setupSectionNavigation(viewType = 'systemAdmin') {
        // Expand all nav groups by default for easier navigation
        const navId = viewType === 'configuration' ? '#configurationSectionsNav' : '#systemAdminSectionsNav';
        const nav = document.querySelector(navId);
        if (nav) {
            nav.querySelectorAll('.admin-nav-group').forEach(group => {
                group.classList.add('expanded');
            });
        }
    },

    toggleNavGroup(header) {
        const group = header.closest('.admin-nav-group');
        if (group) {
            group.classList.toggle('expanded');
        }
    },

    openAdminSection(sectionId, event, viewType = null) {
        if (event) {
            event.preventDefault();
        }
        
        // Determine view type from context if not provided
        if (!viewType) {
            const systemAdminView = document.getElementById('systemAdminView');
            const configurationView = document.getElementById('configurationView');
            if (systemAdminView && !systemAdminView.classList.contains('hidden')) {
                viewType = 'systemAdmin';
            } else if (configurationView && !configurationView.classList.contains('hidden')) {
                viewType = 'configuration';
            } else {
                viewType = 'systemAdmin'; // Default
            }
        }
        
        this.openSection(sectionId, viewType);
        
        // Update active nav item in the current view
        const navId = viewType === 'configuration' ? '#configurationSectionsNav' : '#systemAdminSectionsNav';
        const nav = document.querySelector(navId);
        if (nav) {
            nav.querySelectorAll('.admin-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeItem = nav.querySelector(`[data-admin-nav="${sectionId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
                // Expand parent group if collapsed
                const parentGroup = activeItem.closest('.admin-nav-group');
                if (parentGroup && !parentGroup.classList.contains('expanded')) {
                    parentGroup.classList.add('expanded');
                }
            }
        }
    },

    openSection(sectionId, viewType = 'systemAdmin') {
        if (!sectionId) {
            return;
        }

        // Hide all sections in both views first
        const systemAdminContainer = document.getElementById('systemAdminSectionsContainer');
        const configurationContainer = document.getElementById('configurationSectionsContainer');
        
        if (systemAdminContainer) {
            systemAdminContainer.querySelectorAll('[data-admin-section]').forEach((section) => {
                section.classList.add('hidden');
            });
        }
        if (configurationContainer) {
            configurationContainer.querySelectorAll('[data-admin-section]').forEach((section) => {
                section.classList.add('hidden');
            });
        }

        // Show the selected section in the appropriate container
        const container = viewType === 'configuration' ? configurationContainer : systemAdminContainer;
        if (container) {
            const section = container.querySelector(`[data-admin-section="${sectionId}"]`);
            if (section) {
                section.classList.remove('hidden');
            }
        }

        // Scroll to top of content area
        const contentArea = document.querySelector('.admin-content');
        if (contentArea) {
            contentArea.scrollTo({ top: 0, behavior: 'smooth' });
        }

        this.markActiveSectionButton(sectionId);
        this.ensureSectionLoaded(sectionId);
        // Refresh Sandbox Access data when section is shown (Configuration only)
        if (sectionId === 'sandboxAccess') {
            const section = container && container.querySelector('[data-admin-section="sandboxAccess"]');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            requestAnimationFrame(() => this.loadPOCSandbox());
        }
        this.activeSection = sectionId;
    },

    markActiveSectionButton(sectionId) {
        // Active state is now handled by openAdminSection
        // This method kept for compatibility but sidebar handles it differently
    },

    ensureSectionLoaded(sectionId) {
        if (this.loadedSections.has(sectionId)) {
            return;
        }

        const loaders = this.getSectionLoaders();
        const loader = loaders[sectionId];
        if (typeof loader === 'function') {
            loader.call(this);
        }
        this.loadedSections.add(sectionId);
    },

    getSectionLoaders() {
        return {
            users: () => this.loadUsers(),
            sales: () => this.loadSalesReps(),
            regions: () => this.renderRegionsPanel(),
            industryUseCases: () => this.loadIndustryUseCasesSection(),
            interface: () => {},
            analytics: () => this.loadAnalyticsSettings(),
            projectHealth: () => this.renderProjectHealthSettings(),
            features: () => this.loadControls(),
            login: () => this.loadLoginLogs(),
            audit: () => this.loadActivityLogs(),
            storageDrafts: () => this.loadStorageDraftsSection(),
            monthly: () => {},
            reports: () => {},
            sandboxAccess: () => this.loadPOCSandbox()
        };
    },

    getStorageAuthHeaders() {
        const user = typeof Auth !== 'undefined' && Auth.getCurrentUser && Auth.getCurrentUser();
        const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (user && user.username) headers['X-Admin-User'] = user.username;
        return headers;
    },

    async loadStorageDraftsSection() {
        const container = document.getElementById('adminStorageDraftsList');
        if (!container) return;
        container.innerHTML = '<div class="text-muted">Loading…</div>';
        try {
            const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' && window.__REMOTE_STORAGE_BASE__
                ? window.__REMOTE_STORAGE_BASE__.replace(/\/$/, '')
                : (window.location.origin + '/api/storage');
            const res = await fetch(base + '/pending', { headers: this.getStorageAuthHeaders() });
            if (!res.ok) {
                if (res.status === 401) {
                    container.innerHTML = '<div class="text-warning">Admin access required to view server drafts.</div>';
                    return;
                }
                throw new Error(res.statusText || 'Failed to load');
            }
            const data = await res.json();
            const pending = (data && data.pending) || [];
            if (pending.length === 0) {
                container.innerHTML = '<div class="admin-empty-state"><div class="admin-empty-state-icon">✓</div><p>No server drafts</p></div>';
                return;
            }
            const rows = pending.map((p) => {
                const key = (p.storage_key || '').toString();
                const reason = (p.reason || '').toString();
                const user = (p.username || '').toString();
                const created = (p.created_at || '').toString().slice(0, 19).replace('T', ' ');
                const keyAttr = key.replace(/"/g, '&quot;').replace(/</g, '&lt;');
                return (
                    '<div class="admin-list-row" data-pending-id="' + p.id + '" data-storage-key="' + keyAttr + '">' +
                    '<div><strong>' + key.replace(/</g, '&lt;') + '</strong><br><span class="text-muted small">' + reason.replace(/</g, '&lt;') + (user ? ' · ' + user.replace(/</g, '&lt;') : '') + ' · ' + created + '</span></div>' +
                    '<div style="display: flex; gap: 0.25rem; align-items: center;">' +
                    '<button type="button" class="btn btn-primary btn-xs storage-draft-apply-btn" data-pending-id="' + p.id + '">Apply</button> ' +
                    '<button type="button" class="btn btn-outline btn-xs btn-danger" onclick="Admin.storageDraftDelete(' + p.id + ')">Delete</button>' +
                    '</div></div>'
                );
            }).join('');
            container.innerHTML = '<div class="space-y-2">' + rows + '</div>';
            container.querySelectorAll('.storage-draft-apply-btn').forEach((btn) => {
                btn.addEventListener('click', function () {
                    const row = this.closest('[data-pending-id]');
                    const id = row && parseInt(row.getAttribute('data-pending-id'), 10);
                    const key = row && row.getAttribute('data-storage-key');
                    if (id && key != null) Admin.storageDraftApply(id, key);
                });
            });
        } catch (e) {
            console.error('loadStorageDraftsSection', e);
            container.innerHTML = '<div class="text-danger">Failed to load drafts: ' + (e.message || 'Unknown error') + '</div>';
        }
    },

    async storageDraftApply(id, storageKey) {
        const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' && window.__REMOTE_STORAGE_BASE__
            ? window.__REMOTE_STORAGE_BASE__.replace(/\/$/, '')
            : (window.location.origin + '/api/storage');
        const headers = this.getStorageAuthHeaders();
        try {
            const listRes = await fetch(base + '/pending', { headers });
            if (!listRes.ok) throw new Error('Could not load pending list');
            const listData = await listRes.json();
            const pending = (listData.pending || []).find((p) => p.id === id);
            if (!pending) {
                UI.showNotification('Draft no longer found.', 'warning');
                this.loadStorageDraftsSection();
                return;
            }
            const key = pending.storage_key;
            const getRes = await fetch(base + '/' + encodeURIComponent(key), { headers });
            let valueToPut = pending.value;
            if (getRes.status === 200) {
                const current = await getRes.json();
                const currentVal = current.value;
                const pendingVal = pending.value;
                if (typeof currentVal === 'string' && typeof pendingVal === 'string') {
                    const merged = this.mergeStorageValueForApply(key, currentVal, pendingVal);
                    if (merged !== undefined) valueToPut = merged;
                }
            }
            const putRes = await fetch(base + '/' + encodeURIComponent(key), {
                method: 'PUT',
                headers,
                body: JSON.stringify({ value: valueToPut })
            });
            if (!putRes.ok) {
                UI.showNotification('Apply failed: ' + (putRes.status === 409 ? 'conflict' : putRes.status), 'error');
                return;
            }
            const delRes = await fetch(base + '/pending/' + id, { method: 'DELETE', headers });
            if (delRes.ok || delRes.status === 204) {
                UI.showNotification('Applied and removed from drafts.', 'success');
            } else {
                UI.showNotification('Applied but could not remove from list. Refresh to update.', 'warning');
            }
            this.loadStorageDraftsSection();
        } catch (e) {
            console.error('storageDraftApply', e);
            UI.showNotification('Apply failed: ' + (e.message || 'Unknown error'), 'error');
        }
    },

    mergeStorageValueForApply(storageKey, currentSerialized, pendingSerialized) {
        try {
            const current = typeof currentSerialized === 'string' ? JSON.parse(currentSerialized) : currentSerialized;
            const pending = typeof pendingSerialized === 'string' ? JSON.parse(pendingSerialized) : pendingSerialized;
            if (!Array.isArray(current) || !Array.isArray(pending)) return undefined;
            const byId = new Map();
            (current || []).forEach((item) => { if (item && item.id) byId.set(item.id, item); });
            (pending || []).forEach((item) => { if (item && item.id) byId.set(item.id, item); });
            return JSON.stringify(Array.from(byId.values()));
        } catch (e) {
            return undefined;
        }
    },

    async storageDraftDelete(id) {
        const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' && window.__REMOTE_STORAGE_BASE__
            ? window.__REMOTE_STORAGE_BASE__.replace(/\/$/, '')
            : (window.location.origin + '/api/storage');
        const headers = this.getStorageAuthHeaders();
        try {
            const res = await fetch(base + '/pending/' + id, { method: 'DELETE', headers });
            if (res.ok || res.status === 204) {
                UI.showNotification('Draft removed.', 'success');
                this.loadStorageDraftsSection();
            } else {
                UI.showNotification('Delete failed.', 'error');
            }
        } catch (e) {
            UI.showNotification('Delete failed: ' + (e.message || 'Unknown error'), 'error');
        }
    },

    async storageDraftsSubmitAll() {
        const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' && window.__REMOTE_STORAGE_BASE__
            ? window.__REMOTE_STORAGE_BASE__.replace(/\/$/, '')
            : (window.location.origin + '/api/storage');
        const headers = this.getStorageAuthHeaders();
        try {
            const listRes = await fetch(base + '/pending', { headers });
            if (!listRes.ok) throw new Error('Could not load pending list');
            const listData = await listRes.json();
            const pending = (listData.pending || []) || [];
            let applied = 0;
            let failed = 0;
            for (const p of pending) {
                try {
                    await this.storageDraftApply(p.id, p.storage_key);
                    applied++;
                } catch (e) {
                    failed++;
                }
            }
            UI.showNotification(applied + ' applied.' + (failed > 0 ? ' ' + failed + ' failed.' : ''), failed > 0 ? 'warning' : 'success');
            this.loadStorageDraftsSection();
        } catch (e) {
            console.error('storageDraftsSubmitAll', e);
            UI.showNotification('Submit all failed: ' + (e.message || 'Unknown error'), 'error');
        }
    },

    loadIndustryUseCasesSection() {
        // Ensure industries tab is active by default
        this.switchIndustryUseCaseTab('industries');
        this.renderAdminIndustriesList();
        this.renderAdminPendingIndustries();
        const industrySelect = document.getElementById('adminUseCaseIndustrySelect') || document.getElementById('adminUseCaseIndustrySelectConfig');
        if (industrySelect) {
            const industries = typeof DataManager !== 'undefined' ? DataManager.getIndustries() : [];
            industrySelect.innerHTML = '<option value="">Select industry...</option>' +
                industries.map(ind => `<option value="${ind.replace(/"/g, '&quot;')}">${ind}</option>`).join('');
            this.renderUseCasesForIndustry();
        }
        this.renderAdminPendingUseCases();
        this.updatePendingBadges();
    },

    switchIndustryUseCaseTab(tabName) {
        document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.querySelector(`[data-tab-content="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    },

    toggleCollapsible(id) {
        const header = document.querySelector(`[onclick*="${id}"]`);
        const content = document.getElementById(`${id}Content`);
        if (!header || !content) return;
        const isExpanded = content.classList.contains('expanded');
        if (isExpanded) {
            content.classList.remove('expanded');
            header.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            header.classList.add('expanded');
        }
    },

    updatePendingBadges() {
        const pendingIndustries = typeof DataManager !== 'undefined' ? DataManager.getPendingIndustries() : [];
        const pendingUseCases = typeof DataManager !== 'undefined' ? DataManager.getPendingUseCases() : [];
        const totalPending = pendingIndustries.length + pendingUseCases.length;
        
        // Update badges in both views
        const pendingBadges = [
            document.getElementById('adminPendingBadge'),
            document.getElementById('adminPendingBadgeConfig')
        ].filter(Boolean);
        const industriesBadges = [
            document.getElementById('adminPendingIndustriesBadge'),
            document.getElementById('adminPendingIndustriesBadgeConfig')
        ].filter(Boolean);
        const useCasesBadges = [
            document.getElementById('adminPendingUseCasesBadge'),
            document.getElementById('adminPendingUseCasesBadgeConfig')
        ].filter(Boolean);
        
        pendingBadges.forEach(badge => {
            if (totalPending > 0) {
                badge.textContent = totalPending;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
        
        industriesBadges.forEach(badge => {
            if (pendingIndustries.length > 0) {
                badge.textContent = pendingIndustries.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
        
        useCasesBadges.forEach(badge => {
            if (pendingUseCases.length > 0) {
                badge.textContent = pendingUseCases.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
    },

    renderAdminIndustriesList() {
        const container = document.getElementById('adminIndustriesList') || document.getElementById('adminIndustriesListConfig');
        if (!container) return;
        const industries = typeof DataManager !== 'undefined' ? DataManager.getIndustries() : [];
        container.innerHTML = industries.length === 0
            ? '<div class="admin-empty-state"><div class="admin-empty-state-icon">📋</div><p>No industries yet. Add one above.</p></div>'
            : industries.map(ind => {
                const attrVal = (ind || '').replace(/"/g, '&quot;');
                return `<div class="admin-list-row">
                    <span>${ind}</span>
                    <button type="button" class="btn btn-danger btn-xs" data-industry="${attrVal}" onclick="Admin.removeIndustryFromAdmin(this.getAttribute('data-industry'))">Remove</button>
                </div>`;
            }).join('');
    },

    addIndustryFromAdmin() {
        const input = document.getElementById('adminNewIndustry') || document.getElementById('adminNewIndustryConfig');
        if (!input) return;
        const value = (input.value || '').trim();
        if (!value) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Enter an industry name.', 'error');
            return;
        }
        if (typeof DataManager === 'undefined') return;
        DataManager.addIndustry(value);
        input.value = '';
        DataManager.ensureIndustryUseCasesBaseline();
        this.renderAdminIndustriesList();
        const industrySelect = document.getElementById('adminUseCaseIndustrySelect');
        if (industrySelect) {
            const industries = DataManager.getIndustries();
            industrySelect.innerHTML = '<option value="">Select industry...</option>' +
                industries.map(ind => `<option value="${ind.replace(/"/g, '&quot;')}">${ind}</option>`).join('');
        }
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Industry added.', 'success');
    },

    removeIndustryFromAdmin(industry) {
        if (!industry) return;
        if (!window.confirm('Remove industry "' + String(industry).replace(/"/g, '') + '"?')) return;
        if (typeof DataManager === 'undefined') return;
        const list = DataManager.getIndustries().filter(i => i !== industry);
        DataManager.saveIndustries(list);
        this.renderAdminIndustriesList();
        const industrySelect = document.getElementById('adminUseCaseIndustrySelect') || document.getElementById('adminUseCaseIndustrySelectConfig');
        if (industrySelect) {
            industrySelect.innerHTML = '<option value="">Select industry...</option>' +
                list.map(ind => `<option value="${ind.replace(/"/g, '&quot;')}">${ind}</option>`).join('');
            this.renderUseCasesForIndustry();
        }
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Industry removed.', 'success');
    },

    renderAdminPendingIndustries() {
        const container = document.getElementById('adminPendingIndustriesList') || document.getElementById('adminPendingIndustriesListConfig');
        if (!container) return;
        const pending = typeof DataManager !== 'undefined' ? DataManager.getPendingIndustries() : [];
        const industries = typeof DataManager !== 'undefined' ? DataManager.getIndustries() : [];
        container.innerHTML = pending.length === 0
            ? '<div class="admin-empty-state"><div class="admin-empty-state-icon">✓</div><p>No pending suggestions</p></div>'
            : pending.map(p => {
                const val = (p.value != null ? p.value : p).toString().trim();
                const dataVal = val.replace(/"/g, '&quot;');
                const meta = p.suggestedBy ? ` <small class="text-muted">(${p.suggestedBy})</small>` : '';
                const mergeOptions = industries.filter(i => i && i !== val).map(ind => {
                    const optVal = (ind || '').replace(/"/g, '&quot;');
                    return `<option value="${optVal}">${ind}</option>`;
                }).join('');
                return `<div class="admin-list-row admin-list-row-pending">
                    <span>${val}${meta}</span>
                    <span style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn btn-primary btn-xs" data-pending-industry="${dataVal}" onclick="Admin.acceptPendingIndustryFromAdmin(this.getAttribute('data-pending-industry'))">Accept</button>
                        <button type="button" class="btn btn-secondary btn-xs" data-pending-industry="${dataVal}" onclick="Admin.rejectPendingIndustryFromAdmin(this.getAttribute('data-pending-industry'))">Reject</button>
                        <span class="admin-merge-inline" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                            <label class="text-muted" style="font-size: 0.75rem; white-space: nowrap;">Merge into:</label>
                            <select class="form-control form-control-sm merge-industry-select" data-pending-industry="${dataVal}" style="min-width: 120px; max-width: 160px;">
                                <option value="">Select…</option>${mergeOptions}
                            </select>
                            <button type="button" class="btn btn-outline btn-xs" data-pending-industry="${dataVal}" onclick="Admin.mergePendingIndustryFromAdmin(this)">Merge</button>
                        </span>
                    </span>
                </div>`;
            }).join('');
        this.updatePendingBadges();
    },

    acceptPendingIndustryFromAdmin(value) {
        if (typeof DataManager === 'undefined') return;
        DataManager.acceptPendingIndustry(value);
        this.renderAdminIndustriesList();
        this.renderAdminPendingIndustries();
        this.updatePendingBadges();
        const industrySelect = document.getElementById('adminUseCaseIndustrySelect');
        if (industrySelect) {
            const industries = DataManager.getIndustries();
            industrySelect.innerHTML = '<option value="">Select industry...</option>' +
                industries.map(ind => `<option value="${ind.replace(/"/g, '&quot;')}">${ind}</option>`).join('');
        }
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Industry accepted.', 'success');
    },

    rejectPendingIndustryFromAdmin(value) {
        if (typeof DataManager === 'undefined') return;
        DataManager.rejectPendingIndustry(value);
        this.renderAdminPendingIndustries();
        this.updatePendingBadges();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Rejected.', 'success');
    },

    mergePendingIndustryFromAdmin(buttonEl) {
        if (typeof DataManager === 'undefined') return;
        const pendingValue = buttonEl?.getAttribute?.('data-pending-industry');
        if (!pendingValue) return;
        const row = buttonEl?.closest?.('.admin-list-row-pending');
        const select = row?.querySelector?.('.merge-industry-select');
        const targetIndustry = select?.value?.trim();
        if (!targetIndustry) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Select an industry to merge into.', 'error');
            return;
        }
        const result = DataManager.mergePendingIndustryInto(pendingValue, targetIndustry);
        if (!result.success) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(result.message || 'Merge failed.', 'error');
            return;
        }
        this.renderAdminIndustriesList();
        this.renderAdminPendingIndustries();
        this.updatePendingBadges();
        const msg = result.accountsUpdated > 0
            ? `Merged into "${targetIndustry}". ${result.accountsUpdated} account(s) updated.`
            : `Merged into "${targetIndustry}".`;
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(msg, 'success');
    },

    renderUseCasesForIndustry() {
        const panel = document.getElementById('adminUseCasesPanel') || document.getElementById('adminUseCasesPanelConfig');
        const industrySelect = document.getElementById('adminUseCaseIndustrySelect') || document.getElementById('adminUseCaseIndustrySelectConfig');
        if (!panel || !industrySelect) return;
        const industry = (industrySelect.value || '').trim();
        if (!industry) {
            panel.innerHTML = '<p class="text-muted">Select an industry to manage its use cases.</p>';
            return;
        }
        const useCases = typeof DataManager !== 'undefined' ? DataManager.getUseCasesForIndustry(industry) : [];
        const addInputId = 'adminNewUseCaseInput';
        panel.innerHTML = `
            <div class="admin-inline-form">
                <input type="text" id="${addInputId}" class="form-control" placeholder="New use case">
                <button type="button" class="btn btn-primary btn-sm" onclick="Admin.addUseCaseFromAdmin()">Add</button>
            </div>
            <div id="adminUseCasesList" class="space-y-compact" style="margin-top: 1rem;"></div>
        `;
        const listEl = document.getElementById('adminUseCasesList');
        if (listEl) {
            listEl.innerHTML = useCases.length === 0
                ? '<div class="admin-empty-state"><div class="admin-empty-state-icon">📋</div><p>No use cases. Add one above.</p></div>'
                : useCases.map(uc => {
                    const ucAttr = (uc || '').replace(/"/g, '&quot;');
                    const indAttr = (industry || '').replace(/"/g, '&quot;');
                    return `<div class="admin-list-row">
                        <span>${uc}</span>
                        <button type="button" class="btn btn-danger btn-xs" data-use-case="${ucAttr}" data-industry="${indAttr}" onclick="Admin.removeUseCaseFromAdmin(this.getAttribute('data-industry'), this.getAttribute('data-use-case'))">Remove</button>
                    </div>`;
                }).join('');
        }
    },

    addUseCaseFromAdmin() {
        const industrySelect = document.getElementById('adminUseCaseIndustrySelect') || document.getElementById('adminUseCaseIndustrySelectConfig');
        const input = document.getElementById('adminNewUseCaseInput');
        if (!industrySelect || !input) return;
        const industry = (industrySelect.value || '').trim();
        const value = (input.value || '').trim();
        if (!industry || !value) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Select industry and enter a use case.', 'error');
            return;
        }
        if (typeof DataManager === 'undefined') return;
        DataManager.addUseCaseToIndustry(industry, value);
        input.value = '';
        this.renderUseCasesForIndustry();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Use case added.', 'success');
    },

    removeUseCaseFromAdmin(industry, useCase) {
        if (!industry || !useCase) return;
        if (typeof DataManager === 'undefined') return;
        DataManager.removeUseCaseFromIndustry(industry, useCase);
        this.renderUseCasesForIndustry();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Use case removed.', 'success');
    },

    renderAdminPendingUseCases() {
        const container = document.getElementById('adminPendingUseCasesList') || document.getElementById('adminPendingUseCasesListConfig');
        if (!container) return;
        const pending = typeof DataManager !== 'undefined' ? DataManager.getPendingUseCases() : [];
        container.innerHTML = pending.length === 0
            ? '<div class="admin-empty-state"><div class="admin-empty-state-icon">✓</div><p>No pending suggestions</p></div>'
            : pending.map(p => {
                const val = (p.value != null ? p.value : p).toString().trim();
                const ind = (p.industry != null ? p.industry : '').toString().trim() || '';
                const dataVal = val.replace(/"/g, '&quot;');
                const dataInd = ind.replace(/"/g, '&quot;');
                const meta = p.suggestedBy ? ` <small class="text-muted">(${p.suggestedBy})</small>` : '';
                const indLabel = ind || 'Unassigned';
                const useCasesForIndustry = (typeof DataManager !== 'undefined' && ind) ? DataManager.getUseCasesForIndustry(ind) : [];
                const mergeOptions = useCasesForIndustry.filter(uc => uc && uc !== val).map(uc => {
                    const optVal = (uc || '').replace(/"/g, '&quot;');
                    return `<option value="${optVal}">${uc}</option>`;
                }).join('');
                return `<div class="admin-list-row admin-list-row-pending-uc">
                    <span>${val} <small class="text-muted">→ ${indLabel}</small>${meta}</span>
                    <span style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn btn-primary btn-xs" data-pending-value="${dataVal}" data-pending-industry="${dataInd}" onclick="Admin.acceptPendingUseCaseFromAdmin(this.getAttribute('data-pending-value'), this.getAttribute('data-pending-industry'))">Accept</button>
                        <button type="button" class="btn btn-secondary btn-xs" data-pending-value="${dataVal}" data-pending-industry="${dataInd}" onclick="Admin.rejectPendingUseCaseFromAdmin(this.getAttribute('data-pending-value'), this.getAttribute('data-pending-industry'))">Reject</button>
                        <span class="admin-merge-inline" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                            <label class="text-muted" style="font-size: 0.75rem; white-space: nowrap;">Merge into:</label>
                            <select class="form-control form-control-sm merge-usecase-select" data-pending-value="${dataVal}" data-pending-industry="${dataInd}" style="min-width: 120px; max-width: 160px;">
                                <option value="">Select…</option>${mergeOptions}
                            </select>
                            <button type="button" class="btn btn-outline btn-xs" data-pending-value="${dataVal}" data-pending-industry="${dataInd}" onclick="Admin.mergePendingUseCaseFromAdmin(this)">Merge</button>
                        </span>
                    </span>
                </div>`;
            }).join('');
        this.updatePendingBadges();
    },

    acceptPendingUseCaseFromAdmin(value, industry) {
        if (typeof DataManager === 'undefined') return;
        DataManager.acceptPendingUseCase(value, industry);
        this.renderUseCasesForIndustry();
        this.renderAdminPendingUseCases();
        this.updatePendingBadges();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Use case accepted.', 'success');
    },

    rejectPendingUseCaseFromAdmin(value, industry) {
        if (typeof DataManager === 'undefined') return;
        DataManager.rejectPendingUseCase(value, industry);
        this.renderAdminPendingUseCases();
        this.updatePendingBadges();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Rejected.', 'success');
    },

    mergePendingUseCaseFromAdmin(buttonEl) {
        if (typeof DataManager === 'undefined') return;
        const pendingValue = buttonEl?.getAttribute?.('data-pending-value');
        const pendingIndustry = buttonEl?.getAttribute?.('data-pending-industry');
        if (!pendingValue) return;
        const row = buttonEl?.closest?.('.admin-list-row-pending-uc');
        const select = row?.querySelector?.('.merge-usecase-select');
        const targetUseCase = select?.value?.trim();
        if (!targetUseCase) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Select a use case to merge into.', 'error');
            return;
        }
        const result = DataManager.mergePendingUseCaseInto(pendingValue, pendingIndustry, targetUseCase);
        if (!result.success) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(result.message || 'Merge failed.', 'error');
            return;
        }
        this.renderUseCasesForIndustry();
        this.renderAdminPendingUseCases();
        this.updatePendingBadges();
        const msg = result.projectsUpdated > 0
            ? `Merged into "${targetUseCase}". ${result.projectsUpdated} project(s) updated.`
            : `Merged into "${targetUseCase}".`;
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(msg, 'success');
    },

    loadAnalyticsSettings() {
        const targetInfo = DataManager.getPresalesActivityTarget();
        const targetValue = Number(targetInfo.value) >= 0 ? Number(targetInfo.value) : 0;

        const inputs = [
            document.getElementById('presalesTargetInput'),
            document.getElementById('presalesTargetInputConfig'),
            document.getElementById('cardPresalesTargetInput')
        ].filter(Boolean);

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
            document.getElementById('presalesTargetMetaConfig'),
            document.getElementById('cardPresalesTargetMeta')
        ].filter(Boolean);
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
            document.getElementById('presalesTargetSummaryConfig'),
            document.getElementById('cardPresalesTargetSummary')
        ].filter(Boolean);
        summaryElements.forEach(el => {
            if (el) el.textContent = summaryText;
        });

        const accessConfig = DataManager.getAnalyticsAccessConfig();
        const accessInputs = [
            document.getElementById('analyticsAccessPasswordInput'),
            document.getElementById('analyticsAccessPasswordInputConfig')
        ].filter(Boolean);
        accessInputs.forEach(input => {
            if (input) input.value = accessConfig.password || '';
        });
        
        const accessMetaElements = [
            document.getElementById('analyticsAccessMeta'),
            document.getElementById('analyticsAccessMetaConfig')
        ].filter(Boolean);
        accessMetaElements.forEach(meta => {
            if (meta) {
                meta.textContent = accessConfig.updatedAt
                ? `Last updated ${DataManager.formatDate ? DataManager.formatDate(accessConfig.updatedAt) : accessConfig.updatedAt}${accessConfig.updatedBy ? ` by ${accessConfig.updatedBy}` : ''}.`
                : 'Using default analytics password.';
        }
        });
    },

    saveAnalyticsAccessPassword(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only admins can update the analytics password.', 'info');
            return;
        }

        const input = document.getElementById('analyticsAccessPasswordInput') || document.getElementById('analyticsAccessPasswordInputConfig');
        if (!input) {
            UI.showNotification('Input not found.', 'error');
            return;
        }
        const trimmed = input.value ? input.value.trim() : '';
        if (!trimmed) {
            UI.showNotification('Enter a password before saving.', 'error');
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const config = DataManager.saveAnalyticsAccessConfig({
            password: trimmed,
            updatedBy: currentUser?.username || 'Admin',
            updatedAt: new Date().toISOString()
        });

        const metaElements = [
            document.getElementById('analyticsAccessMeta'),
            document.getElementById('analyticsAccessMetaConfig')
        ].filter(Boolean);
        metaElements.forEach(meta => {
        if (meta) {
            meta.textContent = config.updatedAt
                ? `Last updated ${DataManager.formatDate ? DataManager.formatDate(config.updatedAt) : config.updatedAt}${config.updatedBy ? ` by ${config.updatedBy}` : ''}.`
                : '';
        }
        });
        UI.showNotification('Analytics password updated.', 'success');
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
        const statusEl = document.getElementById('usersFilterStatus');
        if (!container) return;

        const statusFilter = (statusEl && statusEl.value) || 'active';
        let filtered = users;
        if (statusFilter === 'active') {
            filtered = users.filter(u => u.isActive !== false);
        } else if (statusFilter === 'inactive') {
            filtered = users.filter(u => u.isActive === false);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-muted">No users match the current filter.</p>';
            return;
        }

        let html = '';
        filtered.forEach(user => {
            const statusBadge = user.isActive !== false
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-danger">Inactive</span>';
            const passwordBadge = user.forcePasswordChange
                ? '<span class="badge badge-warning">Password reset pending</span>'
                : '';
            const defaultRegionInfo = user.defaultRegion
                ? `<div class="text-muted" style="margin-top: 0.25rem; font-size: 0.85rem;">Default region: ${user.defaultRegion}</div>`
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
                        ${defaultRegionInfo}
                    </div>
                    <div class="admin-user-actions">
                        <button class="btn btn-sm btn-outline" data-username="${(user.username || '').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" onclick="Admin.resetUserPassword(this)" title="Reset to default password (Welcome@Gupshup1)">Reset password</button>
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
        const defaultRegionSelect = document.getElementById('newUserDefaultRegion');
        if (defaultRegionSelect) {
            this.populateGenericRegionSelect(defaultRegionSelect, '');
        }
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
                            <label class="form-label">Temporary password</label>
                            <input type="text" class="form-control" value="Welcome@Gupshup1" disabled>
                            <small class="text-muted">Users will be prompted to set their own password on first login.</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Default Region (optional)</label>
                            <select class="form-control" id="newUserDefaultRegion"></select>
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
        this.populateGenericRegionSelect(document.getElementById('newUserDefaultRegion'), '');
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

        const forcePasswordChangeCheckbox = document.getElementById('forcePasswordChange');
        const forcePasswordChange = forcePasswordChangeCheckbox ? forcePasswordChangeCheckbox.checked : true;
        const defaultRegionSelect = document.getElementById('newUserDefaultRegion');
        const defaultRegionValue = defaultRegionSelect ? defaultRegionSelect.value : '';

        const user = {
            username: document.getElementById('newUsername').value,
            email: document.getElementById('newUserEmail').value,
            password: 'Welcome@Gupshup1',
            roles: roles,
            regions: [],
            salesReps: [],
            defaultRegion: defaultRegionValue || '',
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
                            <label class="form-label">Default Region (optional)</label>
                            <select class="form-control" id="editUserDefaultRegion"></select>
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
        this.populateGenericRegionSelect(document.getElementById('editUserDefaultRegion'), user.defaultRegion || '');
    },

    updateUser(event, userId) {
        event.preventDefault();

        const email = document.getElementById('editUserEmail').value.trim();
        const password = document.getElementById('editUserPassword').value;
        const isActive = document.getElementById('editUserActive').checked;
        const forcePasswordChange = document.getElementById('editForcePasswordChange')?.checked ?? false;
        const roles = Array.from(document.querySelectorAll('.edit-role-checkbox:checked')).map(cb => cb.value);
        const defaultRegionSelect = document.getElementById('editUserDefaultRegion');
        const defaultRegion = defaultRegionSelect ? defaultRegionSelect.value : '';

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
            forcePasswordChange,
            defaultRegion
        };
        if (password && password.trim().length > 0) {
            updates.password = password.trim();
        }

        const updated = DataManager.updateUser(userId, updates);
        if (updated) {
            if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
                const current = Auth.getCurrentUser();
                if (current?.id === userId) {
                    Auth.currentUser = updated;
                    if (typeof Activities !== 'undefined' && typeof Activities.getDefaultSalesRepRegion === 'function') {
                        Activities.currentSalesRepRegion = Activities.getDefaultSalesRepRegion();
                    }
                }
            }
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

    resetUserPassword(username) {
        const raw = typeof username === 'string'
            ? username
            : (username && typeof username.getAttribute === 'function' ? username.getAttribute('data-username') : null) || '';
        const trimmed = String(raw || '').trim();
        if (!trimmed) return;
        const defaultPassword = 'Welcome@Gupshup1';
        if (!confirm(`Reset password for "${trimmed}" to default (${defaultPassword})? They can log in immediately.`)) return;

        const tryApi = () => {
            return fetch('/api/admin/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.getAdminHeaders() },
                body: JSON.stringify({ username: trimmed, password: defaultPassword }),
                credentials: 'same-origin'
            });
        };

        tryApi()
            .then((response) => {
                if (response.ok) {
                    return response.json().then((data) => {
                        UI.showNotification(data.message || 'Password reset. User can log in with ' + defaultPassword + '. Refresh the page to see updated list.', 'success');
                    });
                }
                return response.json()
                    .then((b) => { throw new Error(b.message || 'Reset failed'); })
                    .catch((e) => {
                        if (e instanceof Error && e.message && e.message !== 'Reset failed') throw e;
                        throw new Error('Reset failed: ' + response.status);
                    });
            })
            .catch((err) => {
                console.warn('Reset password API failed, trying local update', err);
                const user = DataManager.getUserByUsername(trimmed) || DataManager.getUsers().find((u) =>
                    (u.email || '').toLowerCase() === trimmed.toLowerCase() ||
                    (String(u.username || '').toLowerCase()).replace(/\./g, ' ') === trimmed.toLowerCase()
                );
                if (user) {
                    DataManager.updateUser(user.id, { password: defaultPassword, forcePasswordChange: false });
                    UI.showNotification('Password reset (local). User can log in with ' + defaultPassword + '. If using remote storage, refresh and use Reset password again after deploy.', 'success');
                    this.loadUsers();
                } else {
                    UI.showNotification(err.message || 'Failed to reset password. User not found locally.', 'error');
                }
            });
    },

    // Sales Rep Management
    initSalesRepFilters() {
        const statusSelect = document.getElementById('salesRepFilterStatus');
        const regionSelect = document.getElementById('salesRepFilterRegion');
        const searchInput = document.getElementById('salesRepFilterSearch');
        const resetBtn = document.getElementById('salesRepResetFilters');

        if (this.salesRepFiltersInitialized) {
            if (regionSelect) {
                this.populateSalesRepRegionOptions(regionSelect);
            }
            if (searchInput) {
                searchInput.value = this.salesRepFilters.search || '';
            }
            return;
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', () => this.loadSalesReps());
        }

        if (regionSelect) {
            this.populateSalesRepRegionOptions(regionSelect);
            regionSelect.addEventListener('change', (event) => {
                this.salesRepFilters.region = event.target.value || 'all';
                this.loadSalesReps();
            });
        }

        if (searchInput) {
            searchInput.value = this.salesRepFilters.search || '';
            searchInput.addEventListener('input', (event) => {
                const value = event.target.value || '';
                if (this.salesRepSearchDebounce) {
                    clearTimeout(this.salesRepSearchDebounce);
                }
                this.salesRepSearchDebounce = setTimeout(() => {
                    this.salesRepFilters.search = value.trim();
                    this.loadSalesReps();
                }, 200);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (this.salesRepSearchDebounce) {
                    clearTimeout(this.salesRepSearchDebounce);
                    this.salesRepSearchDebounce = null;
                }
                this.salesRepFilters = { region: 'all', search: '' };
                if (statusSelect) statusSelect.value = 'active';
                if (regionSelect) {
                    this.populateSalesRepRegionOptions(regionSelect);
                    regionSelect.value = 'all';
                }
                if (searchInput) {
                    searchInput.value = '';
                }
                this.loadSalesReps();
            });
        }

        this.salesRepFiltersInitialized = true;
    },

    populateSalesRepRegionOptions(selectEl) {
        if (!selectEl || typeof DataManager === 'undefined' || typeof DataManager.getRegions !== 'function') {
            return;
        }

        const regions = DataManager.getRegions();
        const uniqueRegions = Array.from(new Set((regions || []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const selectedValue = this.salesRepFilters.region || 'all';

        let options = '<option value="all">All Regions</option>';
        uniqueRegions.forEach(region => {
            const value = region.replace(/"/g, '&quot;');
            options += `<option value="${value}">${region}</option>`;
        });

        selectEl.innerHTML = options;

        if (selectedValue && uniqueRegions.includes(selectedValue)) {
            selectEl.value = selectedValue;
        } else {
            selectEl.value = 'all';
            this.salesRepFilters.region = 'all';
        }
    },

    loadSalesReps() {
        if (!this.salesRepFiltersInitialized) {
            this.initSalesRepFilters();
        } else {
            const regionSelect = document.getElementById('salesRepFilterRegion');
            if (regionSelect) {
                this.populateSalesRepRegionOptions(regionSelect);
            }
            const searchInput = document.getElementById('salesRepFilterSearch');
            if (searchInput) {
                searchInput.value = this.salesRepFilters.search || '';
            }
        }

        const salesReps = DataManager.getGlobalSalesReps();
        const container = document.getElementById('salesRepsList');
        const summaryEl = document.getElementById('salesRepsSummary');
        if (!container) return;

        const regionSelect = document.getElementById('salesRepFilterRegion');
        if (regionSelect) {
            this.populateSalesRepRegionOptions(regionSelect);
        }

        const statusEl = document.getElementById('salesRepFilterStatus');
        const statusFilter = (statusEl && statusEl.value) || 'active';
        const { region = 'all', search = '' } = this.salesRepFilters || {};
        const normalizedSearch = search ? search.toLowerCase() : '';

        const filtered = salesReps.filter(rep => {
            if (!rep) return false;

            if (statusFilter === 'active' && rep.isActive === false) return false;
            if (statusFilter === 'inactive' && rep.isActive !== false) return false;

            const repRegion = rep.region || '';
            if (region && region !== 'all') {
                if (repRegion !== region) return false;
            }

            if (normalizedSearch) {
                const haystack = [
                    rep.name || '',
                    rep.email || '',
                    repRegion,
                    rep.currency || 'INR'
                ].join(' ').toLowerCase();
                return haystack.includes(normalizedSearch);
            }

            return true;
        });

        const totalCount = salesReps.length;
        const filteredCount = filtered.length;
        const activeCount = filtered.filter(rep => rep.isActive !== false).length;

        if (summaryEl) {
            let summary = `Showing ${filteredCount} of ${totalCount} sales users • Active: ${activeCount}`;
            if (region && region !== 'all') {
                summary += ` • Region: ${region}`;
            }
            if (normalizedSearch) {
                summary += ` • Search: "${search}"`;
            }
            summaryEl.textContent = summary;
        }

        if (filteredCount === 0) {
            container.innerHTML = '<p class="text-muted">No sales users match the current filters.</p>';
            return;
        }

        let html = '';
        filtered.forEach(rep => {
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
                        ${fxDisplay ? `<div class="text-muted" style="margin-top: 0.25rem; font-size: 0.85rem;">1 ${currency} ≈ ₹${fxDisplay}</div>` : ''}
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

        const modalRegionSelect = document.getElementById('salesRepRegion');
        if (modalRegionSelect) {
            // Only pre-select region if admin has a region filter set; otherwise leave as "Select Region" so they must choose (avoids defaulting inside sales to India West)
            const preferredRegion = this.salesRepFilters.region && this.salesRepFilters.region !== 'all'
                ? this.salesRepFilters.region
                : '';
            const hasPreferred = preferredRegion && Array.from(modalRegionSelect.options).some(option => option.value === preferredRegion);
            modalRegionSelect.value = hasPreferred ? preferredRegion : '';
        }
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
            this.refreshRegionDropdowns();
            this.loadSalesReps();
            if (this.loadedSections.has('regions')) {
                this.renderRegionsPanel();
            }
            UI.showNotification('Region added successfully', 'success');
        }
    },

    refreshRegionDropdowns() {
        const regions = DataManager.getRegions();

        if (!regions.includes(this.salesRepFilters.region)) {
            this.salesRepFilters.region = 'all';
        }

        const filterSelect = document.getElementById('salesRepFilterRegion');
        if (filterSelect) {
            this.populateSalesRepRegionOptions(filterSelect);
        }

        const addUserDefaultSelect = document.getElementById('newUserDefaultRegion');
        if (addUserDefaultSelect) {
            this.populateGenericRegionSelect(addUserDefaultSelect, addUserDefaultSelect.value || '');
        }

        const editUserDefaultSelect = document.getElementById('editUserDefaultRegion');
        if (editUserDefaultSelect) {
            this.populateGenericRegionSelect(editUserDefaultSelect, editUserDefaultSelect.value || '');
        }

        if (typeof Activities !== 'undefined') {
            if (Activities.currentSalesRepRegion && !regions.includes(Activities.currentSalesRepRegion)) {
                Activities.currentSalesRepRegion = Activities.getDefaultSalesRepRegion();
            }
            if (typeof Activities.populateSalesRepRegionOptions === 'function') {
                Activities.populateSalesRepRegionOptions(Activities.currentSalesRepRegion);
            }
            if (typeof Activities.populateSalesRepOptions === 'function') {
                Activities.populateSalesRepOptions(Activities.currentSalesRepRegion);
            }
        }

        let previousReportRegion = null;
        const reportRegionFilter = document.getElementById('reportRegionFilter');
        if (reportRegionFilter) {
            previousReportRegion = reportRegionFilter.value;
        }

        if (typeof App !== 'undefined') {
            if (App.currentView === 'reports' && typeof App.populateReportFilters === 'function') {
                App.populateReportFilters(DataManager.getAllActivities());
                const reportFilterEl = document.getElementById('reportRegionFilter');
                if (
                    reportFilterEl &&
                    previousReportRegion &&
                    Array.from(reportFilterEl.options).some(option => option.value === previousReportRegion)
                ) {
                    reportFilterEl.value = previousReportRegion;
                }
            }
            if (App.currentView === 'activities' && typeof App.loadActivitiesView === 'function') {
                App.loadActivitiesView();
            }
        }
    },

    populateGenericRegionSelect(selectEl, selectedValue = '', { includeBlank = true, blankLabel = 'No default region' } = {}) {
        if (!selectEl || typeof DataManager === 'undefined' || typeof DataManager.getRegions !== 'function') {
            return;
        }
        const regions = DataManager.getRegions();
        const uniqueRegions = Array.from(new Set((regions || []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const requested = (selectedValue || '').trim();
        let options = '';
        if (includeBlank) {
            options += `<option value="">${blankLabel}</option>`;
        }
        uniqueRegions.forEach(region => {
            const safeValue = region.replace(/"/g, '&quot;');
            const selectedAttr = region === requested ? 'selected' : '';
            options += `<option value="${safeValue}" ${selectedAttr}>${region}</option>`;
        });
        selectEl.innerHTML = options;
        if (requested && !uniqueRegions.includes(requested)) {
            selectEl.value = '';
        }
    },

    renderRegionsPanel() {
        const container = document.getElementById('regionsList');
        if (!container) return;

        const regions = DataManager.getRegions();
        if (!regions.length) {
            container.innerHTML = '<div class="admin-empty-state"><div class="admin-empty-state-icon">🌍</div><p>No regions configured</p></div>';
            return;
        }

        let html = '';
        regions.forEach(region => {
            const usage = DataManager.getRegionUsage(region);
            const isDefault = DataManager.isDefaultRegion(region);
            const totalUsage =
                (usage.salesReps || 0) +
                (usage.accounts || 0) +
                (usage.activities || 0) +
                (usage.users || 0);
            const statusLabel = isDefault ? 'Default' : totalUsage > 0 ? 'In use' : 'Unused';
            const encoded = encodeURIComponent(region);
            const canDelete = !isDefault && totalUsage === 0;
            const deleteButton = canDelete
                ? `<button class="btn btn-xs btn-danger" data-region="${encoded}" onclick="Admin.handleRegionDelete(event)">Remove</button>`
                : `<button class="btn btn-xs btn-danger" disabled title="${isDefault ? 'Default regions cannot be removed' : 'Region still referenced by records'}">Remove</button>`;

            html += `
                <div class="admin-list-row">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 0.25rem;">${region}</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--gray-600);">
                            <span>${usage.salesReps || 0} sales</span>
                            <span>${usage.accounts || 0} accounts</span>
                            <span>${usage.activities || 0} activities</span>
                            <span>${usage.users || 0} users</span>
                            <span class="text-muted">• ${statusLabel}</span>
                        </div>
                        </div>
                        ${deleteButton}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    handleRegionDelete(event) {
        const button = event?.currentTarget;
        if (!button) return;
        const encoded = button.dataset?.region;
        if (!encoded) return;

        const region = decodeURIComponent(encoded);
        const result = DataManager.removeRegion(region);
        if (!result?.success) {
            UI.showNotification(result?.message || 'Unable to remove region.', (result?.usage ? 'warning' : 'error'));
            return;
        }

        UI.showNotification(`Region "${region}" removed.`, 'success');
        this.renderRegionsPanel();
        this.refreshRegionDropdowns();
        this.loadSalesReps();
    },

    pruneUnusedRegions() {
        const summary = DataManager.pruneUnusedRegions();
        const removed = summary?.removed || [];
        if (!removed.length) {
            UI.showNotification('No unused regions to remove.', 'info');
        } else {
            UI.showNotification(`Removed ${removed.length} unused region${removed.length > 1 ? 's' : ''}: ${removed.join(', ')}`, 'success');
        }
        this.renderRegionsPanel();
        this.refreshRegionDropdowns();
        this.loadSalesReps();
    },


    // Sandbox Access (ex-POC Sandbox) – submission date + 7 days = end date; active from Jan 2026, closed/archive with Migrated data tag
    loadPOCSandbox() {
        const activities = DataManager.getAllActivities();
        const allPoc = (activities || []).filter(a => a.type === 'poc');
        const submissionToEnd = (a) => {
            const sub = a.date || a.createdAt || '';
            if (!sub) return null;
            const d = new Date(sub);
            d.setDate(d.getDate() + 7);
            return d.toISOString().substring(0, 10);
        };
        const cutoff = '2026-01-01';
        const active = allPoc.filter(a => {
            const end = submissionToEnd(a);
            return end && end >= cutoff;
        });
        const closed = allPoc.filter(a => {
            const end = submissionToEnd(a);
            return !end || end < cutoff;
        });

        this.pocActiveActivities = active;
        this.pocClosedActivities = closed;

        const accounts = [...new Set(allPoc.map(a => a.accountName).filter(Boolean))];
        const accountFilter = document.getElementById('pocAccountFilter');
        if (accountFilter) {
            let html = '<option value="">All Accounts</option>';
            accounts.forEach(account => {
                html += `<option value="${account}">${account}</option>`;
            });
            accountFilter.innerHTML = html;
        }

        this.filterPOCSandbox(active);
    },

    pocSandboxView: 'active', // 'active' | 'closed'

    switchSandboxTab(tab) {
        this.pocSandboxView = tab === 'closed' ? 'closed' : 'active';
        document.querySelectorAll('[data-sandbox-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-sandbox-tab') === tab);
        });
        const activities = tab === 'closed' ? (this.pocClosedActivities || []) : (this.pocActiveActivities || []);
        this.filterPOCSandbox(activities, tab === 'closed');
    },

    filterPOCSandbox(activities = null, showClosed = null) {
        const isClosed = showClosed === true || (showClosed === null && this.pocSandboxView === 'closed');
        if (!activities) {
            activities = isClosed ? (this.pocClosedActivities || []) : (this.pocActiveActivities || []);
        }
        if (!activities) {
            const allActivities = DataManager.getAllActivities();
            activities = (allActivities || []).filter(a => a.type === 'poc');
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

        const container = document.getElementById('pocSandboxTable');
        if (!container) return;

        const showClosedTag = isClosed;
        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-muted">' + (showClosedTag ? 'No closed/archived sandbox requests.' : 'No Sandbox Access requests found.') + '</p>';
            return;
        }

        const tagCol = showClosedTag ? '<th style="padding: 0.75rem; text-align: left;">Tag</th>' : '';
        let html = `
            <table class="admin-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                        <th style="padding: 0.75rem; text-align: left;">Account Name</th>
                        <th style="padding: 0.75rem; text-align: left;">User Name</th>
                        <th style="padding: 0.75rem; text-align: left;">Access Type</th>
                        <th style="padding: 0.75rem; text-align: left;">Start Date</th>
                        <th style="padding: 0.75rem; text-align: left;">End Date</th>
                        ${tagCol}
                        <th style="padding: 0.75rem; text-align: left;">POC Environment Name</th>
                        <th style="padding: 0.75rem; text-align: left;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtered.forEach(activity => {
            const accessType = activity.details?.accessType || '—';
            const envName = activity.details?.pocEnvironmentName || '';
            const status = activity.details?.assignedStatus || 'Unassigned';
            const envNameId = `pocEnv_${activity.id}`;
            const statusId = `pocStatus_${activity.id}`;
            const tagCell = showClosedTag ? '<td style="padding: 0.75rem;"><span class="badge" style="background: #718096; color: #fff;">Migrated data</span></td>' : '';

            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 0.75rem;">${activity.accountName || '-'}</td>
                    <td style="padding: 0.75rem;">${activity.userName || '-'}</td>
                    <td style="padding: 0.75rem;">${accessType}</td>
                    <td style="padding: 0.75rem;">${UI.formatDate(activity.details?.startDate || '')}</td>
                    <td style="padding: 0.75rem;">${UI.formatDate(activity.details?.endDate || '')}</td>
                    ${tagCell}
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


    loadControls(force) {
        const container = document.getElementById('featureDashboardControls') || document.getElementById('featureDashboardControlsConfig');
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
        const container = document.getElementById('featureDashboardControls') || document.getElementById('featureDashboardControlsConfig');
        if (!container) return;

        if (!this.controlDefinitions.length) {
            container.innerHTML = '<div class="text-muted">No configurable items available.</div>';
            return;
        }

        const rows = this.controlDefinitions
            .map((def) => {
                const state = this.controlDraft[def.key] || {};
                const isEnabled = state.value !== false;
                return `
                    <div class="feature-flag-row" data-admin-control="${def.key}">
                        <div class="feature-flag-info">
                            <div class="feature-flag-name">${def.label}</div>
                            ${def.description ? `<div class="feature-flag-description">${def.description}</div>` : ''}
                        </div>
                        <div class="feature-flag-controls">
                            <span class="feature-flag-status ${isEnabled ? 'status-on' : 'status-off'}">
                                ${isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <select class="form-control feature-flag-select"
                                    data-control-type="${def.supportsFeature ? 'feature' : 'dashboard'}"
                                    data-control-key="${def.key}">
                                <option value="enabled" ${isEnabled ? 'selected' : ''}>Enable</option>
                                <option value="disabled" ${!isEnabled ? 'selected' : ''}>Disable</option>
                            </select>
                        </div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = `
            <div class="feature-flag-list">
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
            .querySelectorAll('select.feature-flag-select')
            .forEach((select) =>
                select.addEventListener('change', (event) => this.handleControlSelectChange(event))
            );

        container.querySelector('#controlsSaveBtn')?.addEventListener('click', () => this.saveControls());
        container.querySelector('#controlsResetBtn')?.addEventListener('click', () => this.resetControls());

        this.markControlsDirty();
    },

    handleControlSelectChange(event) {
        const select = event.currentTarget;
        const controlKey = select?.dataset?.controlKey;
        if (!controlKey) {
            return;
        }

        const definition = this.controlDefinitions.find((def) => def.key === controlKey);
        if (!definition) {
            return;
        }

        const draft = this.controlDraft[controlKey] || {};
        draft.value = select.value !== 'disabled';
        this.controlDraft[controlKey] = draft;
        this.markControlsDirty();
    },

    updateControlStatuses() {
        this.controlDefinitions.forEach((def) => {
            const card = document.querySelector(`[data-admin-control="${def.key}"]`);
            if (!card) return;
            const statusEl = card.querySelector('.feature-flag-status');
            const selectEl = card.querySelector('.feature-flag-select');

            const draft = this.controlDraft[def.key] || {};
            const isOn = draft.value !== false;

            if (statusEl) {
                statusEl.textContent = isOn ? 'Enabled' : 'Disabled';
                statusEl.classList.toggle('status-on', isOn);
                statusEl.classList.toggle('status-off', !isOn);
            }

            if (selectEl) {
                selectEl.value = isOn ? 'enabled' : 'disabled';
            }
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

        const monthInput = document.getElementById('adminReportMonthConfig') || document.getElementById('adminReportMonth');
        const selectedMonth = monthInput && monthInput.value
            ? monthInput.value
            : new Date().toISOString().substring(0, 7);

        const allActivities = DataManager.getAllActivities();
        const resolveMonth = DataManager.resolveActivityMonth
            ? (a) => DataManager.resolveActivityMonth(a)
            : (a) => (a.date || '').substring(0, 7);
        const activitiesInMonth = allActivities.filter(a => resolveMonth(a) === selectedMonth);

        const header = ['Activity Date', 'Submitted At', 'User', 'Account', 'Project', 'Type', 'Internal/External', 'Summary'];
        const rows = activitiesInMonth.map(a => [
            a.date || '',
            a.createdAt || '',
            a.userName || a.assignedUserEmail || 'Unknown',
            a.accountName || '',
            a.projectName || '',
            a.type || '',
            a.isInternal ? 'Internal' : 'External',
            (a.summary || a.description || '').replace(/[\r\n]+/g, ' ')
        ]);
        const csvRows = [header, ...rows];
        const filename = `pams_activities_${selectedMonth}.csv`;
        if (typeof App !== 'undefined' && typeof App.downloadCsv === 'function') {
            App.downloadCsv(filename, csvRows);
        } else {
            const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        UI.showNotification(`Exported ${rows.length} activities for ${selectedMonth}.`, 'success');
        if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
            Audit.log({
                action: 'report.export',
                entity: 'monthlyActivities',
                entityId: selectedMonth,
                detail: { rowCount: rows.length }
            });
        }
    },

    promptClearAllActivities() {
        if (this.clearActivitiesInProgress) {
            return;
        }

        const confirmed = confirm('This will permanently delete all customer and internal activity records. This action cannot be undone. Continue?');
        if (!confirmed) {
            return;
        }

        try {
            this.clearActivitiesInProgress = true;
            DataManager.clearAllActivities({ includeInternal: true });
            UI.showNotification('All activity records cleared successfully.', 'success');
            this.loadActivityLogs(true);

            if (typeof App !== 'undefined') {
                if (typeof App.loadDashboard === 'function') {
                    App.loadDashboard();
                }
                if (App.currentView === 'activities' && typeof App.loadActivitiesView === 'function') {
                    App.loadActivitiesView();
                }
                if (App.currentView === 'reports' && typeof App.loadReports === 'function') {
                    App.loadReports();
                }
                if (App.currentView === 'projectHealth' && typeof App.loadProjectHealthView === 'function') {
                    App.loadProjectHealthView();
                }
                if (App.currentView === 'winloss' && typeof App.loadWinLossView === 'function') {
                    App.loadWinLossView();
                }
                if (App.currentView === 'sfdcCompliance' && typeof App.loadSfdcComplianceView === 'function') {
                    App.loadSfdcComplianceView();
                }
                if (App.currentView === 'accounts' && typeof App.loadAccountsView === 'function') {
                    App.loadAccountsView();
                }
            }
        } catch (error) {
            console.error('Failed to clear activities:', error);
            UI.showNotification('Failed to clear activities. Please try again.', 'error');
        } finally {
            this.clearActivitiesInProgress = false;
        }
    },

    loadActivityLogs(force, hours) {
        const container = document.getElementById('activityLogsTable');
        if (!container) return;

        this._activityLogsHoursFilter = typeof hours === 'number' ? hours : undefined;
        if (!force) {
            container.innerHTML = '<div class="text-muted">Loading activity logs…</div>';
        }

        const query = hours ? `limit=200&hours=${hours}` : 'limit=200';
        fetch(`/api/admin/activity?${query}`, {
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
        const hours = this._activityLogsHoursFilter;
        const query = hours ? `limit=500&hours=${hours}` : 'limit=500';
        fetch(`/api/admin/activity?${query}`, {
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

};

// Expose Admin globally
window.Admin = Admin;

