// Main Application Module

const App = {
    currentView: 'dashboard',
    CHART_CONSTANTS: {
        palette: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795', '#F6AD55', '#63B3ED', '#4A5568'],
        extendedPalette: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795', '#F6AD55', '#63B3ED', '#4A5568', '#B794F4', '#68D391', '#F56565', '#ECC94B', '#4FD1C5', '#9F7AEA', '#ED64A6'],
        industryLimit: 7,
        userLimit: 8,
        channelLimit: 6
    },
    CURRENCY_SYMBOLS: {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        BRL: 'R$'
    },
    latestAnalytics: {},
    reportFilters: {
        industry: '',
        channel: '',
        region: ''
    },
    activityFilters: {
        search: '',
        type: 'all',
        industry: '',
        region: '',
        activityType: '',
        timeframe: 'all',
        dateFrom: '',
        dateTo: '',
        owner: 'all'
    },
    activitySortBy: 'dateDesc',
    activitiesViewMode: 'cards',
    winLossFilters: {
        owner: 'all',
        month: '',
        statusFilter: 'all'
    },
    pendingDuplicateAlerts: [],
    projectHealthFilters: {
        threshold: 60,
        status: 'all',
        includeNoActivity: true
    },
    sfdcFilters: {
        industry: '',
        account: '',
        owner: 'all',
        showAll: false
    },
    winLossMrrInputHandler: null,
    defaultFeatureFlags: {
        csvImport: true,
        csvExport: true,
        winLoss: true,
        adminCsvExport: true
    },
    featureFlags: {},
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
    dashboardVisibility: {},
    dashboardMonth: 'last',
    analyticsPeriodMode: 'month',
    analyticsActiveTab: 'overview',
    analyticsPreferences: {
        activityMixView: {}
    },
    savedAnalyticsTables: [],
    analyticsTableState: {
        dataset: 'regionPerformance',
        columns: [],
        rows: [],
        sortBy: '',
        generatedAt: null,
        generatedFrom: null
    },
    analyticsCharts: {},
    analyticsReloadTimer: null,
    analyticsRetryAttempts: 0,
    analyticsTableDefinitions: {
        regionPerformance: {
            label: 'Region Performance',
            description: 'Activity, win/loss, and account coverage by region.',
            columns: [
                { key: 'region', label: 'Region', default: true },
                { key: 'totalActivities', label: 'Total Activities', default: true },
                { key: 'externalActivities', label: 'External Activities', default: true },
                { key: 'internalActivities', label: 'Internal Activities', default: false },
                { key: 'wins', label: 'Won Activity Count', default: false },
                { key: 'losses', label: 'Lost Activity Count', default: false },
                { key: 'uniqueAccounts', label: 'Active Accounts', default: true },
                { key: 'uniqueProjects', label: 'Active Projects', default: false }
            ]
        },
        presalesPerformance: {
            label: 'Presales Performance',
            description: 'Per-user activity totals across the selected period.',
            columns: [
                { key: 'userName', label: 'User', default: true },
                { key: 'region', label: 'Region', default: true },
                { key: 'total', label: 'Total Activities', default: true },
                { key: 'external', label: 'External', default: true },
                { key: 'internal', label: 'Internal', default: false },
                { key: 'wins', label: 'Won Activity Count', default: false },
                { key: 'losses', label: 'Lost Activity Count', default: false }
            ]
        },
        projectPipeline: {
            label: 'Project Pipeline',
            description: 'Projects engaged during the selected period.',
            columns: [
                { key: 'projectName', label: 'Project', default: true },
                { key: 'accountName', label: 'Account', default: true },
                { key: 'status', label: 'Status', default: true },
                { key: 'region', label: 'Region', default: false },
                { key: 'totalActivities', label: 'Activity Count', default: true },
                { key: 'externalActivities', label: 'External', default: false },
                { key: 'internalActivities', label: 'Internal', default: false },
                { key: 'wins', label: 'Won Activities', default: false },
                { key: 'losses', label: 'Lost Activities', default: false },
                { key: 'lastActivityAt', label: 'Last Activity', default: false },
                { key: 'ownerCount', label: 'Owners', default: false }
            ]
        },
        accountEngagement: {
            label: 'Account Engagement',
            description: 'Accounts touched within the selected period.',
            columns: [
                { key: 'accountName', label: 'Account', default: true },
                { key: 'region', label: 'Region', default: true },
                { key: 'totalActivities', label: 'Activity Count', default: true },
                { key: 'externalActivities', label: 'External Activities', default: false },
                { key: 'internalActivities', label: 'Internal Activities', default: false },
                { key: 'totalProjects', label: 'Projects Involved', default: false },
                { key: 'activeProjects', label: 'Active Projects', default: false },
                { key: 'wonProjects', label: 'Won Projects', default: false },
                { key: 'lostProjects', label: 'Lost Projects', default: false },
                { key: 'lastActivityAt', label: 'Last Activity', default: false }
            ]
        },
        activityTypeMix: {
            label: 'Activity Type Mix',
            description: 'Activity counts grouped by type.',
            columns: [
                { key: 'type', label: 'Activity Type', default: true },
                { key: 'count', label: 'Count', default: true }
            ]
        }
    },
    loadingOverlay: null,
    loadingMessageEl: null,

    // Initialize application
    async init() {
        this.setupLoadingOverlay();
        this.setLoading(true, 'Preparing workspace…');

        try {
            // Always setup event listeners (needed for login form)
            this.setupEventListeners();

            const bootstrap = await this.loadBootstrap();
            this.setAppConfiguration(bootstrap.config || {});

            this.loadAnalyticsTablePresetsDeferred();

            let hasSession = false;
            if (bootstrap.user) {
                Auth.currentUser = {
                    id: bootstrap.user.userId,
                    username: bootstrap.user.username,
                    email: bootstrap.user.email || '',
                    roles: bootstrap.user.roles || [],
                    regions: bootstrap.user.regions || [],
                    salesReps: bootstrap.user.salesReps || [],
                    defaultRegion: bootstrap.user.defaultRegion || '',
                    isActive: true
                };
                Auth.writeSession({ userId: Auth.currentUser.id, loginTime: new Date().toISOString() });
                Auth.showMainApp();
                hasSession = true;
            } else {
                hasSession = await Auth.init();
            }
            if (!hasSession) {
                this.setLoading(false);
                return;
            }

            InterfaceManager.init();
            if (typeof Activities !== 'undefined' && typeof Activities.getDefaultSalesRepRegion === 'function') {
                Activities.currentSalesRepRegion = Activities.getDefaultSalesRepRegion();
            }
            const preferredView = this.getInitialView();
            const targetView = this.getAccessibleView(preferredView);
            if (InterfaceManager.getCurrentInterface() === 'card') {
                this.navigateToCardView(targetView);
            } else {
                this.switchView(targetView);
            }
            this.setLoading(false);
        } catch (error) {
            console.error('Application initialization failed', error);
            this.setLoading(false);
            if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
                UI.showNotification('Failed to initialise application', 'error');
            }
        }
    },

    async buildAnalyticsGlobalControls({ periodType, selectedPeriod, periodOptions }) {
        const toggleMarkup = `
            <div class="analytics-period-toggle">
                <button class="btn btn-tab ${periodType === 'month' ? 'active' : ''}"
                        onclick="App.switchAnalyticsPeriodMode('month')">Monthly</button>
                <button class="btn btn-tab ${periodType === 'year' ? 'active' : ''}"
                        onclick="App.switchAnalyticsPeriodMode('year')">Yearly</button>
            </div>
        `;

        const periodPicker = periodType === 'year'
            ? `
                <select id="reportMonth"
                        class="form-control analytics-period-input"
                        onchange="App.handleReportPeriodInput(this.value)">
                    ${periodOptions.map(option => `
                        <option value="${option}" ${option === selectedPeriod ? 'selected' : ''}>${option}</option>
                    `).join('')}
                </select>
            `
            : `
                <input type="month"
                       id="reportMonth"
                       class="form-control analytics-period-input"
                       value="${selectedPeriod}"
                       onchange="App.handleReportPeriodInput(this.value)">
            `;

        const regions = (await DataManager.getRegions()).sort((a, b) => a.localeCompare(b));
        const selectedRegion = this.reportFilters.region || '';

        return `
            <div class="analytics-global-controls">
                <div class="analytics-global-left">
                    ${toggleMarkup}
                    ${periodPicker}
                </div>
                <div class="analytics-global-right">
                    <div class="form-group">
                        <label class="form-label">Region</label>
                        <select id="analyticsRegionFilter"
                                class="form-control"
                                onchange="App.handleGlobalReportFilterChange('region', this.value)">
                            <option value="">All Regions</option>
                            ${regions.map(region => `
                                <option value="${region}" ${region === selectedRegion ? 'selected' : ''}>${region}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="align-self: flex-end;">
                        <button class="btn btn-link" onclick="App.resetGlobalAnalyticsFilters(); return false;">Reset</button>
                    </div>
                </div>
            </div>
        `;
    },

    buildAnalyticsTabNav() {
        const tabs = [
            { key: 'overview', label: 'Overview' },
            { key: 'products', label: 'Product Reports' },
            { key: 'regions', label: 'Regional Reports' },
            { key: 'table', label: 'Table Builder' }
        ];
        return `
            <div class="analytics-tabs">
                ${tabs.map(tab => `
                    <button type="button"
                            class="analytics-tab-btn ${this.analyticsActiveTab === tab.key ? 'active' : ''}"
                            onclick="App.switchAnalyticsTab('${tab.key}')">
                        ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    switchAnalyticsTab(tab) {
        const allowed = ['overview', 'products', 'regions', 'table'];
        this.analyticsActiveTab = allowed.includes(tab) ? tab : 'overview';
        this.loadReports();
    },

    buildAnalyticsLoader(prefix = 'reports') {
        return `
            <div id="${prefix}AnalyticsLoading" class="analytics-loading hidden">
                <div class="spinner"></div>
                <span>Crunching the latest activity insights…</span>
            </div>
        `;
    },

    async buildAnalyticsTabContent(tab, analytics, context = {}) {
        const scopedContext = { ...context, prefix: context.prefix || 'reports' };
        switch (tab) {
            case 'products':
                return await this.buildAnalyticsProductTab(analytics, scopedContext);
            case 'regions':
                return await this.buildAnalyticsRegionalTab(analytics, scopedContext);
            case 'table':
                return this.buildAnalyticsTableTab(analytics, scopedContext);
            case 'overview':
            default:
                return this.buildAnalyticsOverviewTab(analytics, scopedContext);
        }
    },

    buildAnalyticsOverviewTab(analytics, context = {}) {
        const prefix = context.prefix || 'reports';
        return `
            <div id="${prefix}AnalyticsWrapper" class="analytics-wrapper">
                <section class="analytics-section analytics-section-full">
                    <div class="analytics-section-header">
                        <h3>Activity Report</h3>
                        <span class="text-muted">Per-user activity totals for the selected period.</span>
                    </div>
                    <div class="analytics-section-body">
                        <canvas id="${prefix}ActivityReportChart"></canvas>
                    </div>
                </section>

                <div class="analytics-row analytics-row-two">
                    <section class="analytics-section analytics-section-tile">
                        <div class="analytics-section-header">
                            <div>
                                <h3>Activity Mix</h3>
                                <span class="text-muted">Activity type distribution.</span>
                            </div>
                            <select id="${prefix}ActivityMixView" class="analytics-chart-view">
                                <option value="donut">Donut Chart</option>
                                <option value="horizontal">Horizontal Bar</option>
                                <option value="vertical">Vertical Column</option>
                            </select>
                        </div>
                        <div class="analytics-section-body">
                            <canvas id="${prefix}ActivityMixChart"></canvas>
                        </div>
                    </section>

                    <section class="analytics-section analytics-section-tile">
                        <div class="analytics-section-header">
                            <h3>Win/Loss Trend</h3>
                            <span class="text-muted">Won vs lost projects across recent periods.</span>
                        </div>
                        <div class="analytics-section-body">
                            <canvas id="${prefix}WinLossTrendChart"></canvas>
                        </div>
                    </section>
                </div>

                <section class="analytics-section analytics-section-full">
                    <div class="analytics-section-header">
                        <h3>Activities by User</h3>
                        <span class="text-muted">Stacked view of activity types per presales user.</span>
                    </div>
                    <div class="analytics-section-body">
                        <canvas id="${prefix}ActivityByUserChart"></canvas>
                    </div>
                </section>
            </div>
        `;
    },

    async buildAnalyticsProductTab(analytics, context = {}) {
        const prefix = context.prefix || 'reports';
        const filters = await this.buildAnalyticsFilterBar('standard', { showIndustry: true, showChannel: false });
        return `
            ${filters}
            <div id="${prefix}AnalyticsWrapper" class="analytics-wrapper">
                <div class="analytics-row analytics-row-two">
                    <section class="analytics-section analytics-section-tile">
                        <div class="analytics-section-header">
                            <h3>Products by Industry</h3>
                            <span class="text-muted">Top industries discussing key products.</span>
                        </div>
                        <div class="analytics-section-body">
                            <canvas id="${prefix}IndustryProductChart"></canvas>
                        </div>
                    </section>
                    <section class="analytics-section analytics-section-tile">
                        <div class="analytics-section-header">
                            <h3>POC Funnel Overview</h3>
                            <span class="text-muted">Requests, wins, and losses by access type.</span>
                        </div>
                        <div class="analytics-section-body">
                            <canvas id="${prefix}PocFunnelChart"></canvas>
                        </div>
                    </section>
                </div>
            </div>
        `;
    },

    async buildAnalyticsRegionalTab(analytics, context = {}) {
        const prefix = context.prefix || 'reports';
        const filters = await this.buildAnalyticsFilterBar('standard', { showIndustry: false, showChannel: true });
        return `
            ${filters}
            <div id="${prefix}AnalyticsWrapper" class="analytics-wrapper">
                <section class="analytics-section analytics-section-full">
                    <div class="analytics-section-header">
                        <h3>Industry Activity Volume</h3>
                        <span class="text-muted">Top industries by activity volume.</span>
                    </div>
                    <div class="analytics-section-body">
                        <canvas id="${prefix}IndustryActivityChart"></canvas>
                    </div>
                </section>
                <div class="analytics-row analytics-row-two">
                    <section class="analytics-section analytics-section-tile">
                        <div class="analytics-section-header">
                            <h3>Channels vs Outcomes</h3>
                            <span class="text-muted">Won vs lost opportunities by channel.</span>
                        </div>
                        <div class="analytics-section-body">
                            <canvas id="${prefix}ChannelOutcomeChart"></canvas>
                        </div>
                    </section>
                    <section class="analytics-section analytics-section-tile">
                        <div class="analytics-section-header">
                            <h3>Win/Loss Trend</h3>
                            <span class="text-muted">Momentum across recent months.</span>
                        </div>
                        <div class="analytics-section-body">
                            <canvas id="${prefix}RegionalWinLossChart"></canvas>
                        </div>
                    </section>
                </div>
            </div>
        `;
    },

    buildAnalyticsTableTab(analytics, context = {}) {
        return `
            <div class="analytics-table-tab">
                ${this.buildAnalyticsTableBuilderMarkup()}
            </div>
        `;
    },

    handleGlobalReportFilterChange(key, value) {
        if (!['region'].includes(key)) return;
        this.reportFilters[key] = value || '';
        this.loadReports();
    },

    resetGlobalAnalyticsFilters() {
        this.reportFilters.region = '';
        this.reportFilters.industry = '';
        this.reportFilters.channel = '';
        this.loadReports();
    },

    async initAnalyticsChartsForTab(tab, analytics, periodValue) {
        if (tab === 'table') {
            this.renderAnalyticsTableBuilder(analytics, {
                periodType: this.analyticsPeriodMode === 'year' ? 'year' : 'month',
                periodValue
            });
            this.setAnalyticsLoading('reports', false);
            return;
        }
        this.setAnalyticsLoading('reports', true);
        await this.initAnalyticsCharts({ prefix: 'reports', analytics, month: periodValue });
        this.setAnalyticsLoading('reports', false);
        this.setupActivityMixToggle('reports', analytics);
    },

    setupActivityMixToggle(prefix, dataset) {
        const select = document.getElementById(`${prefix}ActivityMixView`);
        if (!select) return;
        if (!this.analyticsPreferences) {
            this.analyticsPreferences = { activityMixView: {} };
        }
        const current = this.analyticsPreferences.activityMixView[prefix] || 'donut';
        select.value = current;
        select.onchange = (event) => {
            const mode = event.target.value || 'donut';
            this.analyticsPreferences.activityMixView[prefix] = mode;
            this.renderActivityMixChart({
                prefix,
                analytics: dataset || (prefix === 'card' ? this.latestAnalytics.card : this.latestAnalytics.standard),
                palette: this.getPalette()
            }, mode);
        };
        this.renderActivityMixChart({
            prefix,
            analytics: dataset || (prefix === 'card' ? this.latestAnalytics.card : this.latestAnalytics.standard),
            palette: this.getPalette()
        }, current);
    },

    // Setup event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                this.setLoading(true, 'Signing you in…');
                const result = await Auth.login(username, password);
                if (result.success) {
                    if (result.requiresPasswordChange) {
                        this.setLoading(false);
                        UI.showNotification('Please update your password to continue.', 'info');
                        return;
                    }
                    this.handleSuccessfulLogin();
                } else {
                    this.setLoading(false);
                    UI.showNotification(result.message || 'Invalid credentials', 'error');
                }
            });
        }

        const analyticsAccessForm = document.getElementById('analyticsAccessForm');
        if (analyticsAccessForm) {
            analyticsAccessForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const passwordInput = document.getElementById('analyticsAccessPassword');
                const password = passwordInput ? passwordInput.value : '';
                this.setLoading(true, 'Preparing analytics…');
                const result = await Auth.loginAnalytics(password);
                if (result.success) {
                    this.analyticsPeriodMode = 'month';
                    this.handleSuccessfulLogin();
                } else {
                    this.setLoading(false);
                    UI.showNotification(result.message || 'Unable to open analytics workspace.', 'error');
                }
            });
        }

        const passwordResetForm = document.getElementById('passwordResetForm');
        if (passwordResetForm) {
            passwordResetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = document.getElementById('newPassword')?.value || '';
                const confirmPassword = document.getElementById('confirmPassword')?.value || '';
                await Auth.submitForcedPasswordChange(newPassword, confirmPassword);
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }

        // Sidebar navigation
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });

            // Warm likely next view data on intent (hover/focus/touch) without rendering.
            const intentPrefetch = (event) => {
                const view = event.currentTarget?.dataset?.view;
                this.queueViewPrefetch(view);
            };
            link.addEventListener('mouseenter', intentPrefetch);
            link.addEventListener('focus', intentPrefetch);
            link.addEventListener('touchstart', intentPrefetch, { passive: true });
        });

        // Sidebar toggle (mobile)
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                UI.toggleSidebar();
            });
        }

        // Interface change (admin only)
        // handled inline via onchange attribute on interfaceSelect

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select-container')) {
                document.querySelectorAll('.multi-select-dropdown').forEach(d => {
                    d.classList.remove('active');
                });
            }
            if (!e.target.closest('.search-select-container')) {
                document.querySelectorAll('.search-select-dropdown').forEach(d => {
                    d.classList.remove('active');
                });
            }
        });
    },

    setupLoadingOverlay() {
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.getElementById('appLoadingOverlay');
        }
        if (!this.loadingMessageEl) {
            this.loadingMessageEl = document.getElementById('appLoadingMessage');
        }
        this.setupSyncIndicator();
    },

    setupSyncIndicator() {
        const el = document.getElementById('syncIndicator');
        if (!el || this._syncIndicatorBound) return;
        this._syncIndicatorBound = true;
        const show = () => el.classList.remove('hidden');
        const hide = () => el.classList.add('hidden');
        window.addEventListener('remotestorage:reconcile-start', show);
        window.addEventListener('remotestorage:reconcile-end', hide);
        window.addEventListener('remotestorage:unauthorized', () => {
            this.capturePendingSubmissionsToDrafts();
            if (typeof Auth !== 'undefined' && typeof Auth.clearSession === 'function') Auth.clearSession();
            if (typeof Auth !== 'undefined' && typeof Auth.showLoginScreen === 'function') Auth.showLoginScreen();
            if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
                UI.showNotification('Session expired or invalid. Your work was saved to Drafts. Sign in and submit from Drafts.', 'warning');
            }
        });
        window.addEventListener('remotestorage:save-succeeded', () => {
            const app = typeof window !== 'undefined' && window.app;
            if (app && typeof app.updateDraftsBadge === 'function') app.updateDraftsBadge();
            if (app && typeof app.loadDraftsView === 'function') app.loadDraftsView();
        });
        window.addEventListener('remotestorage:save-failed', () => {
            if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
                UI.showNotification('Data not saved. Check Drafts to retry.', 'warning');
            }
            const app = typeof window !== 'undefined' && window.app;
            if (app) {
                if (typeof app.updateDraftsBadge === 'function') app.updateDraftsBadge();
                if (typeof app.loadDraftsView === 'function') app.loadDraftsView();
            }
        });
    },

    setLoading(isLoading, message) {
        this.setupLoadingOverlay();
        if (message && this.loadingMessageEl) {
            this.loadingMessageEl.textContent = message;
        }
        if (!this.loadingOverlay) {
            return;
        }
        if (isLoading) {
            this.loadingOverlay.classList.remove('hidden');
        } else {
            this.loadingOverlay.classList.add('hidden');
        }
    },

    async handleSuccessfulLogin() {
        this.setLoading(true, 'Loading workspace…');
        try {
            const currentUser =
                typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
                    ? Auth.getCurrentUser()
                    : null;

            if (currentUser && currentUser.username) {
                window.__REMOTE_STORAGE_USER__ = currentUser.username;
                window.__REMOTE_STORAGE_HEADERS__ = {
                    'X-Admin-User': currentUser.username
                };
                if (window.__REMOTE_STORAGE_ENABLED__ && typeof window.__REMOTE_STORAGE_RECONCILE__ === 'function') {
                    setTimeout(function () { window.__REMOTE_STORAGE_RECONCILE__(); }, 0);
                }
            }

            const defaultActivityOwner = this.getDefaultActivityOwnerFilter();
            this.activityFilters.owner = defaultActivityOwner;
            const defaultRecordOwner = this.getDefaultRecordOwnerFilter();
            this.winLossFilters.owner = defaultRecordOwner;
            this.sfdcFilters.owner = defaultRecordOwner;

            InterfaceManager.init();
            try {
                const configAge = this._configFetchedAt ? Date.now() - this._configFetchedAt : Infinity;
                if (configAge > 3000) {
                    await this.refreshAppConfiguration();
                }
            } catch (error) {
                console.warn('Configuration refresh after login failed.', error);
            }
            if (typeof Activities !== 'undefined' && typeof Activities.getDefaultSalesRepRegion === 'function') {
                Activities.currentSalesRepRegion = Activities.getDefaultSalesRepRegion();
            }
            const preferredView = this.getInitialView();
            const targetView = this.getAccessibleView(preferredView);
            if (InterfaceManager.getCurrentInterface() === 'card') {
                this.navigateToCardView(targetView);
            } else {
                this.switchView(targetView);
            }
        } finally {
            this.setLoading(false);
        }
    },

    async loadBootstrap() {
        try {
            const response = await fetch('/api/bootstrap', { credentials: 'include', cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Bootstrap failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('Bootstrap failed, falling back to config-only.', error);
            const config = await this.loadAppConfig();
            return { config: config || {}, user: null };
        }
    },

    async loadAppConfig() {
        try {
            const response = await fetch('/api/config', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Config request failed: ${response.status}`);
            }
            const payload = await response.json();
            this.setAppConfiguration(payload || {});
            return payload || {};
        } catch (error) {
            console.warn('Unable to load app config, falling back to defaults.', error);
            this.setAppConfiguration({});
            return {};
        }
    },

    loadAnalyticsTablePresetsDeferred() {
        this.loadAnalyticsTablePresets().catch((err) => {
            console.warn('Background load of analytics presets failed:', err);
        });
    },

    setAppConfiguration(config = {}) {
        this.featureFlags = {
            ...this.defaultFeatureFlags,
            ...(config.featureFlags || {})
        };
        this.dashboardVisibility = {
            ...this.defaultDashboardVisibility,
            ...(config.dashboardVisibility || {})
        };
        this.dashboardMonth = typeof config.dashboardMonth === 'string' && config.dashboardMonth.trim()
            ? config.dashboardMonth.trim()
            : 'last';
        if (typeof window !== 'undefined') {
            // Default to cookie auth unless explicitly disabled in config.
            window.__USE_COOKIE_AUTH__ = config.cookieAuth !== false;
        }
        this._configFetchedAt = Date.now();
        this.applyAppConfiguration();
    },

    async loadAnalyticsTablePresets() {
        try {
            this.savedAnalyticsTables = await DataManager.getAnalyticsTablePresets();
        } catch (error) {
            console.warn('Unable to load analytics table presets.', error);
            this.savedAnalyticsTables = [];
        }
    },

    async refreshAppConfiguration() {
        await this.loadAppConfig();
        if (!this.isAccessible('csvImport') && this.currentView === 'import') {
            this.switchView('dashboard');
        }
        if (!this.isAccessible('winLoss') && this.currentView === 'winloss') {
            this.switchView('dashboard');
        }
        if (!this.isAccessible('activities') && this.currentView === 'activities') {
            this.switchView('dashboard');
        }
        if (!this.isAccessible('accounts') && this.currentView === 'accounts') {
            this.switchView('dashboard');
        }
        if (!this.isAccessible('projectHealth') && this.currentView === 'projectHealth') {
            this.switchView('dashboard');
        }
        if (!this.isAccessible('sfdcCompliance') && this.currentView === 'sfdcCompliance') {
            this.switchView('dashboard');
        }
    },

    isFeatureEnabled(flag) {
        if (!flag) return true;
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        if (isAdmin) return true;
        return this.featureFlags[flag] !== false;
    },
    isDashboardVisible(key) {
        if (!key) return true;
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        if (isAdmin) return true;
        return this.dashboardVisibility[key] !== false;
    },

    isAccessible(key) {
        return this.isFeatureEnabled(key) && this.isDashboardVisible(key);
    },

    isViewAccessible(viewName) {
        const key = this.getDashboardVisibilityKey(viewName);
        if (!key) return true;
        return this.isAccessible(key);
    },

    getAccessibleView(preferred) {
        const candidateOrder = [
            preferred,
            'dashboard',
            'activities',
            'reports',
            'accounts',
            'winloss',
            'projectHealth',
            'sfdcCompliance',
            'import',
            'systemAdmin',
            'configuration',
            'admin', // Legacy support
            'adminLoginLogs',
            'adminPoc'
        ].filter(Boolean);

        for (const view of candidateOrder) {
            if (this.isViewAccessible(view)) {
                return view;
            }
        }
        return 'dashboard';
    },

    getDashboardVisibilityKey(viewName) {
        switch (viewName) {
            case 'dashboard':
                return 'dashboard';
            case 'import':
                return 'csvImport';
            case 'winloss':
                return 'winLoss';
            case 'reports':
                return 'reports';
            case 'activities':
                return 'activities';
            case 'accounts':
                return 'accounts';
            case 'projectHealth':
                return 'projectHealth';
            case 'sfdcCompliance':
                return 'sfdcCompliance';
            case 'admin':
            case 'systemAdmin':
            case 'configuration':
                return 'admin';
            case 'adminLoginLogs':
                return 'adminLogin';
            case 'adminPoc':
                return 'adminPoc';
            default:
                return null;
        }
    },

    getAccessMessage(key, type = 'feature') {
        const messages = {
            csvImport: {
                feature: 'CSV import is currently disabled by the administrator.',
                visibility: 'CSV import has been hidden by the administrator.'
            },
            winLoss: {
                feature: 'Win/Loss tracking is currently disabled by the administrator.',
                visibility: 'Win/Loss tracking has been hidden by the administrator.'
            },
            reports: {
                feature: 'Reports are currently disabled by the administrator.',
                visibility: 'Reports have been hidden by the administrator.'
            },
            admin: {
                feature: 'Admin mode is currently disabled.',
                visibility: 'Admin mode has been hidden by the administrator.'
            },
            dashboard: {
                feature: 'Dashboard access is disabled.',
                visibility: 'Dashboard access has been hidden.'
            },
            activities: {
                feature: 'Activities workspace is currently disabled.',
                visibility: 'Activities workspace has been hidden by the administrator.'
            },
            accounts: {
                feature: 'Accounts view is currently disabled.',
                visibility: 'Accounts view has been hidden by the administrator.'
            },
            projectHealth: {
                feature: 'Project health tools are currently disabled.',
                visibility: 'Project health tools have been hidden by the administrator.'
            },
            sfdcCompliance: {
                feature: 'SFDC compliance tools are currently disabled.',
                visibility: 'SFDC compliance view has been hidden by the administrator.'
            }
        };

        return messages[key]?.[type] || 'This section is currently unavailable.';
    },

    applyAppConfiguration() {
        document.querySelectorAll('[data-feature]').forEach((element) => {
            const flagKey = element.getAttribute('data-feature');
            const mode = element.getAttribute('data-feature-mode') || 'hide';
            const enabled = this.isFeatureEnabled(flagKey);

            if (mode === 'disable') {
                if (enabled) {
                    element.classList.remove('feature-disabled');
                    element.removeAttribute('disabled');
                    element.setAttribute('aria-disabled', 'false');
                } else {
                    element.classList.add('feature-disabled');
                    element.setAttribute('disabled', 'true');
                    element.setAttribute('aria-disabled', 'true');
                }
            } else {
                element.classList.toggle('feature-hidden', !enabled);
            }
        });

        document.querySelectorAll('[data-dashboard]').forEach((element) => {
            const key = element.getAttribute('data-dashboard');
            const visible = this.isDashboardVisible(key) && this.isFeatureEnabled(key);
            element.classList.toggle('dashboard-hidden', !visible);
        });

        if (typeof BulkImport !== 'undefined' && typeof BulkImport.evaluateFeatureAvailability === 'function') {
            BulkImport.evaluateFeatureAvailability();
        }
        const currentViewKey = this.getDashboardVisibilityKey(this.currentView);
        if (currentViewKey && !this.isAccessible(currentViewKey)) {
            if (currentViewKey !== 'dashboard') {
                this.switchView('dashboard');
            }
        }
    },

    isValidView(viewName) {
        if (!viewName || typeof viewName !== 'string') return false;
        return !!document.getElementById(`${viewName}View`);
    },

    getInitialView() {
        const params = new URLSearchParams(window.location.search);
        const requestedView = params.get('view');

        if (requestedView && this.isValidView(requestedView)) {
            if (!(typeof Auth !== 'undefined' && Auth.isAnalyticsOnly && Auth.isAnalyticsOnly()) || requestedView === 'reports') {
                return requestedView;
            }
        }

        if (typeof Auth !== 'undefined' && Auth.isAnalyticsOnly && Auth.isAnalyticsOnly()) {
            return 'reports';
        }

        return 'dashboard';
    },

    // Switch view
    switchView(viewName) {
        if (!this.isValidView(viewName)) {
            console.warn('Attempted to load unknown view:', viewName);
            return;
        }

        // POC Sandbox is now inline in System Admin; redirect there
        if (viewName === 'adminPoc') {
            if (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) {
                this.switchView('configuration');
                setTimeout(() => Admin.openAdminSection('sandboxAccess', null), 50);
            } else {
                if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('You do not have admin access', 'error');
                this.switchView('dashboard');
            }
            return;
        }

        const accessKey = this.getDashboardVisibilityKey(viewName);
        if (accessKey) {
            if (!this.isFeatureEnabled(accessKey)) {
                UI.showNotification(this.getAccessMessage(accessKey, 'feature'), 'info');
                return;
            }
            if (!this.isDashboardVisible(accessKey)) {
                UI.showNotification(this.getAccessMessage(accessKey, 'visibility'), 'info');
                return;
            }
        }

        if (typeof Auth !== 'undefined' && Auth.isAnalyticsOnly && Auth.isAnalyticsOnly() && viewName !== 'reports') {
            console.warn('Analytics-only user restricted to reports view. Redirecting.');
            viewName = 'reports';
        }

        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
            view.classList.add('hidden');
        });

        // Show selected view
        const view = document.getElementById(`${viewName}View`);
        if (view) {
            view.classList.remove('hidden');
            view.classList.add('active');
        }

        // Prevent "invalid form control not focusable": disable validation on forms inside hidden views only
        document.querySelectorAll('.view.hidden form').forEach(form => {
            form.setAttribute('novalidate', 'novalidate');
        });

        // Update sidebar active state
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentView = viewName;

        // Load view content
        switch (viewName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'activities':
                this.loadActivitiesView();
                break;
            case 'drafts':
                this.loadDraftsView();
                break;
            case 'winloss':
                this.loadWinLossView();
                break;
            case 'import':
                this.loadImportView();
                break;
            case 'reports':
                if (InterfaceManager.getCurrentInterface() === 'card') {
                    this.loadCardReportsView();
                } else {
                    // Small delay to ensure view is visible before loading reports
                    setTimeout(() => {
                        this.loadReports();
                    }, 50);
                }
                break;
            case 'accounts':
                this.loadAccountsView();
                break;
            case 'projectHealth':
                this.loadProjectHealthView();
                break;
            case 'sfdcCompliance':
                this.loadSfdcComplianceView();
                break;
            case 'admin':
                // Legacy support - redirect to systemAdmin
                this.switchView('systemAdmin');
                break;
            case 'systemAdmin':
                if (Auth.isAdmin()) {
                    if (InterfaceManager.getCurrentInterface() === 'card') {
                        this.loadCardSystemAdminView();
                    } else {
                        Admin.loadSystemAdminPanel();
                    }
                } else {
                    console.warn('User is not admin, cannot access system admin panel');
                    UI.showNotification('You do not have admin access', 'error');
                }
                break;
            case 'configuration':
                if (Auth.isAdmin()) {
                    if (InterfaceManager.getCurrentInterface() === 'card') {
                        this.loadCardConfigurationView();
                    } else {
                        Admin.loadConfigurationPanel();
                    }
                } else {
                    console.warn('User is not admin, cannot access configuration panel');
                    UI.showNotification('You do not have admin access', 'error');
                }
                break;
            case 'adminLoginLogs':
                if (Auth.isAdmin()) {
                    Admin.initLoginLogsView();
                } else {
                    UI.showNotification('You do not have admin access', 'error');
                    this.switchView('dashboard');
                }
                break;
            case 'adminPoc':
                // Handled at top of switchView (redirect to systemAdmin + poc section)
                break;
            case 'suggestionsBugs':
                this.loadSuggestionsBugsView();
                break;
        }
    },

    refreshCurrentViewData() {
        switch (this.currentView) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'activities':
                this.loadActivitiesView();
                break;
            case 'drafts':
                this.loadDraftsView();
                break;
            case 'winloss':
                this.loadWinLossView();
                break;
            case 'reports':
                if (InterfaceManager.getCurrentInterface() === 'card') {
                    this.loadCardReportsView();
                } else {
                    this.loadReports();
                }
                break;
            case 'accounts':
                this.loadAccountsView();
                break;
            case 'projectHealth':
                this.loadProjectHealthView();
                break;
            case 'sfdcCompliance':
                this.loadSfdcComplianceView();
                break;
            default:
                break;
        }
    },

    canPrefetchView(viewName) {
        if (!viewName || !this.isValidView(viewName)) return false;
        if (viewName === this.currentView) return false;
        if (!this.isAccessible(this.getDashboardVisibilityKey(viewName))) return false;
        if (typeof Auth !== 'undefined' && Auth.isAnalyticsOnly && Auth.isAnalyticsOnly() && viewName !== 'reports') {
            return false;
        }
        return true;
    },

    queueViewPrefetch(viewName) {
        if (!this.canPrefetchView(viewName)) return;
        if (!this._viewPrefetchTimers) this._viewPrefetchTimers = {};
        if (!this._viewPrefetchMeta) this._viewPrefetchMeta = {};

        const lastAt = this._viewPrefetchMeta[viewName]?.lastAt || 0;
        if (Date.now() - lastAt < 60_000) return; // Throttle to avoid repeated server work.

        clearTimeout(this._viewPrefetchTimers[viewName]);
        this._viewPrefetchTimers[viewName] = setTimeout(() => {
            const run = () => this.prefetchViewData(viewName);
            if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(run, { timeout: 400 });
            } else {
                setTimeout(run, 0);
            }
        }, 250);
    },

    async prefetchViewData(viewName) {
        if (!this.canPrefetchView(viewName)) return;
        if (!this._viewPrefetchMeta) this._viewPrefetchMeta = {};
        if (this._viewPrefetchMeta[viewName]?.inFlight) return;

        this._viewPrefetchMeta[viewName] = { ...(this._viewPrefetchMeta[viewName] || {}), inFlight: true };
        try {
            // Keep prefetch low-cost: warm only the core datasets each tab needs most.
            switch (viewName) {
                case 'activities':
                    await DataManager.getAllActivities();
                    break;
                case 'accounts':
                    await DataManager.getAccounts();
                    break;
                case 'winloss':
                case 'projectHealth':
                case 'sfdcCompliance':
                case 'reports':
                    await Promise.all([DataManager.getAccounts(), DataManager.getUsers()]);
                    break;
                case 'dashboard':
                    await Promise.all([DataManager.getAllActivities(), DataManager.getAccounts(), DataManager.getUsers()]);
                    break;
                default:
                    break;
            }
            this._viewPrefetchMeta[viewName] = { lastAt: Date.now(), inFlight: false };
        } catch (error) {
            this._viewPrefetchMeta[viewName] = { ...(this._viewPrefetchMeta[viewName] || {}), inFlight: false };
            if (typeof console !== 'undefined' && console.debug) {
                console.debug('[Prefetch] skipped/failed for view:', viewName, error?.message || error);
            }
        }
    },

    async persistDraftListByKey(keyToSave, listPayload, draftType = 'external') {
        const payloadArray = Array.isArray(listPayload) ? listPayload : [];

        if (keyToSave === 'accounts' && DataManager.saveAccounts) {
            await DataManager.saveAccounts(payloadArray);
            return;
        }
        if (keyToSave === 'users' && DataManager.saveUsers) {
            await DataManager.saveUsers(payloadArray);
            return;
        }
        if (keyToSave === 'activities' && DataManager.saveActivities) {
            await DataManager.saveActivities(payloadArray);
            return;
        }
        if (keyToSave === 'internalActivities' && DataManager.saveInternalActivities) {
            await DataManager.saveInternalActivities(payloadArray);
            return;
        }

        // Non-entity fallback path.
        const payload = JSON.stringify(listPayload);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft) {
            await window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft(keyToSave, payload, {
                type: draftType === 'internal' ? 'internal' : 'external'
            });
            if (typeof DataManager !== 'undefined' && DataManager.invalidateCache) DataManager.invalidateCache(keyToSave);
            return;
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            throw new Error('Remote storage async write path unavailable for draft list key: ' + keyToSave);
        }
        localStorage.setItem(keyToSave, payload);
        if (typeof DataManager !== 'undefined' && DataManager.invalidateCache) DataManager.invalidateCache(keyToSave);
    },

    // Load dashboard
    loadDashboard() {
        // Always use the new card-based dashboard
        // The old dashboard (updateStats/loadRecentActivities) is deprecated
        this.loadCardDashboard().catch(e => console.warn('loadCardDashboard failed', e));
        this.updateDraftsBadge();
    },

    // Resolve dashboard view month: 'current' | 'last' | 'YYYY-MM' -> YYYY-MM
    getDashboardViewMonth() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = now.getMonth() === 0
            ? `${now.getFullYear() - 1}-12`
            : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
        const setting = (this.dashboardMonth || 'last').trim().toLowerCase();
        if (setting === 'current') return currentMonth;
        if (setting === 'last') return lastMonth;
        if (/^\d{4}-\d{2}$/.test(setting)) return setting;
        return lastMonth;
    },

    // Admin: set dashboard month and reload (persists via API)
    async setDashboardMonthAndReload(value) {
        if (typeof Auth === 'undefined' || !Auth.isAdmin || !Auth.isAdmin()) return;
        try {
            const response = await fetch('/api/admin/config/dashboard-month', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Admin-User': Auth.getCurrentUser()?.username || '' },
                body: JSON.stringify({ dashboardMonth: value })
            });
            if (!response.ok) throw new Error(`Failed to update: ${response.status}`);
            const data = await response.json();
            this.dashboardMonth = data.dashboardMonth || value;
            await this.loadAppConfig();
            this.loadCardDashboard();
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Dashboard month updated.', 'success');
            }
        } catch (error) {
            console.error('Failed to set dashboard month', error);
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Could not update dashboard month.', 'error');
            }
        }
    },

    // Load card-based dashboard
    async loadCardDashboard() {
        const dashboardView = document.getElementById('dashboardView');
        if (!dashboardView) {
            console.error('Dashboard view element not found');
            return;
        }

        // Clear any existing content first (including old static HTML)
        dashboardView.innerHTML = '';

        // Destroy existing charts before reloading
        this.destroyDashboardCharts();

        const stats = await this.updateStats() || {};

        const [activities, accounts, users] = await Promise.all([
            DataManager.getAllActivities(),
            DataManager.getAccounts(),
            DataManager.getUsers()
        ]);
        const accountMap = new Map(accounts.map(a => [a.id, a]));
        const userMap = new Map(users.map(u => [u.id, u]));
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const viewMonth = this.getDashboardViewMonth();
        const isViewingCurrentMonth = viewMonth === currentMonth;

        // Previous month (for "last month" comparison card)
        const [vy, vm] = viewMonth.split('-').map(Number);
        const prevMonth = vm === 1 ? `${vy - 1}-12` : `${vy}-${String(vm - 1).padStart(2, '0')}`;
        const lastMonthActivities = activities.filter(a => {
            const month = DataManager.resolveActivityMonth ? DataManager.resolveActivityMonth(a) : (a.date || '').substring(0, 7);
            return month === prevMonth;
        });

        // Calculate week start (Monday) — only meaningful when viewing current month
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const monthActivities = activities.filter(a => {
            const month = DataManager.resolveActivityMonth ? DataManager.resolveActivityMonth(a) : (a.date || '').substring(0, 7);
            return month === viewMonth;
        });

        const weekActivities = isViewingCurrentMonth
            ? activities.filter(a => {
                const date = a.date || a.createdAt;
                if (!date) return false;
                const activityDate = new Date(date);
                return activityDate >= weekStart && activityDate <= weekEnd;
            })
            : [];

        // Last activity submission (who + when, submission timestamp, all activities)
        const submissionTs = (a) => (a.createdAt || a.date || '').replace(/\.\d{3}Z$/, 'Z');
        const sortedBySubmission = [...activities].sort((a, b) => new Date(submissionTs(b)) - new Date(submissionTs(a)));
        const lastActivity = sortedBySubmission[0];
        const lastActivityWho = lastActivity ? (lastActivity.userName || lastActivity.assignedUserEmail || 'Unknown') : '—';
        const lastActivityWhenRaw = lastActivity && (lastActivity.createdAt || lastActivity.date);
        const lastActivityWhen = lastActivityWhenRaw
            ? (() => { const d = new Date(lastActivityWhenRaw); return Number.isNaN(d.getTime()) ? lastActivityWhenRaw : d.toLocaleString(); })()
            : '—';

        // Internal vs External breakdown
        const internalCount = monthActivities.filter(a => a.isInternal).length;
        const externalCount = monthActivities.filter(a => !a.isInternal).length;

        // Call types breakdown (external activities only)
        const callTypes = {};
        monthActivities.filter(a => !a.isInternal).forEach(a => {
            const type = a.type || 'Other';
            callTypes[type] = (callTypes[type] || 0) + 1;
        });

        // Region activity (for default region)
        const currentUser = Auth.getCurrentUser();
        const defaultRegion = currentUser?.defaultRegion || '';
        const regionActivities = defaultRegion
            ? monthActivities.filter(a => {
                const account = accountMap.get(a.accountId);
                const user = userMap.get(a.userId);
                const region = DataManager.resolveActivityRegion(a, account, user);
                return region === defaultRegion;
            }).length
            : 0;

        // All regions breakdown for bar chart (EXTERNAL ACTIVITIES ONLY)
        const regionBreakdown = {};
        monthActivities.filter(a => !a.isInternal).forEach(a => {
            const account = accountMap.get(a.accountId);
            const user = userMap.get(a.userId);
            const region = DataManager.resolveActivityRegion(a, account, user) || 'Unassigned';
            regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
        });

        // Missing SFDC Opportunities calculation
        const externalMonthActivities = monthActivities.filter(a => !a.isInternal);
        const missingSfdcData = await this.calculateMissingSfdcStats(externalMonthActivities, currentUser, defaultRegion, userMap);

        // Top 3 Presales Reps by activity count
        const topPresalesReps = this.getTopPresalesReps(monthActivities, 3);

        // Wins and Losses for view month
        let winsThisMonth = 0;
        let lossesThisMonth = 0;
        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (project.status === 'won' || project.status === 'lost') {
                    const monthForWinLoss = project.winLossData?.monthOfWin ||
                        (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                    if (monthForWinLoss && monthForWinLoss === viewMonth) {
                        if (project.status === 'won') winsThisMonth++;
                        else if (project.status === 'lost') lossesThisMonth++;
                    }
                }
            });
        });

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const [viewYear, viewMonthNum] = viewMonth.split('-').map(Number);
        const viewMonthName = `${monthNames[viewMonthNum - 1]} ${viewYear}`;
        const prevMonthName = prevMonth.split('-').map(Number);
        const lastMonthLabel = `${monthNames[prevMonthName[1] - 1]} ${prevMonthName[0]}`;

        const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin();
        const monthOptions = (() => {
            const opts = [
                { value: 'last', label: 'Last month (default)' },
                { value: 'current', label: 'Current month' }
            ];
            for (let i = 0; i < 12; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
                const v = `${y}-${m}`;
                if (opts.some(o => o.value === v)) continue;
                opts.push({ value: v, label: `${monthNames[d.getMonth()]} ${y}` });
            }
            return opts;
        })();
        const currentValue = (this.dashboardMonth || 'last').trim().toLowerCase();
        const selectorValue = /^\d{4}-\d{2}$/.test(currentValue) ? currentValue : currentValue;

        let totalProjects = 0;
        let customerActivities = 0;
        const internalActivities = activities.filter(a => a.isInternal);

        accounts.forEach(account => {
            account.projects?.forEach(project => {
                totalProjects++;
                customerActivities += project.activities?.length || 0;
            });
        });

        let html = `
            <!-- Log Activity + Admin month selector -->
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <button class="btn btn-primary" onclick="Activities.openActivityModal()" style="padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;">
                    + Log Activity
                </button>
                ${isAdmin ? `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label for="dashboardMonthSelect" style="font-size: 0.875rem; color: var(--gray-600); white-space: nowrap;">Dashboard month:</label>
                    <select id="dashboardMonthSelect" onchange="App.setDashboardMonthAndReload(this.value)" style="padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid var(--gray-300); font-size: 0.875rem;">
                        ${monthOptions.map(o => `<option value="${o.value}" ${o.value === selectorValue ? 'selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
            </div>
            
            <!-- Quick Stats Row -->
            <div class="dashboard-stats-row">
                <div class="dashboard-stat-card">
                    <div class="dashboard-stat-card-title">Activities for ${viewMonthName}</div>
                    <div class="dashboard-stat-card-value">${monthActivities.length}</div>
                    <div class="dashboard-stat-card-detail">Selected month</div>
                </div>
                <div class="dashboard-stat-card dashboard-stat-card-last-activity">
                    <div class="dashboard-stat-card-title">Last activity submission</div>
                    <div class="dashboard-stat-card-value dashboard-stat-card-value-wrap" style="font-size: 1rem;">${lastActivityWho}</div>
                    <div class="dashboard-stat-card-detail">${lastActivityWhen}</div>
                </div>
                <div class="dashboard-stat-card" style="border-left-color: #805AD5;">
                    <div class="dashboard-stat-card-title">Activities last month</div>
                    <div class="dashboard-stat-card-value" style="color: #805AD5;">${lastMonthActivities.length}</div>
                    <div class="dashboard-stat-card-detail">${lastMonthLabel}</div>
                </div>
                <div class="dashboard-stat-card" style="border-left-color: #48BB78;">
                    <div class="dashboard-stat-card-title">Wins (${viewMonthName})</div>
                    <div class="dashboard-stat-card-value" style="color: #48BB78;">${winsThisMonth}</div>
                    <div class="dashboard-stat-card-detail">Projects won</div>
                </div>
                <div class="dashboard-stat-card" style="border-left-color: #F56565;">
                    <div class="dashboard-stat-card-title">Losses (${viewMonthName})</div>
                    <div class="dashboard-stat-card-value" style="color: #F56565;">${lossesThisMonth}</div>
                    <div class="dashboard-stat-card-detail">Projects lost</div>
                </div>
            </div>
            
            <!-- Charts Row 1: Pie Charts -->
            <div class="dashboard-charts-row">
                <div class="dashboard-chart-card">
                    <div class="dashboard-chart-header">
                        <h3>Internal vs External</h3>
                        <span class="text-muted">${viewMonthName}</span>
                    </div>
                    <canvas id="internalExternalChart" style="max-height: 200px;"></canvas>
                </div>
                <div class="dashboard-chart-card">
                    <div class="dashboard-chart-header">
                        <h3>Call Types</h3>
                        <span class="text-muted">External Activities</span>
                    </div>
                    <canvas id="callTypesChart" style="max-height: 200px;"></canvas>
                </div>
            </div>
            
            <!-- Charts Row 2: Region Activity -->
            <div class="dashboard-charts-row">
                <div class="dashboard-chart-card" style="grid-column: 1 / -1;">
                    <div class="dashboard-chart-header">
                        <h3>Region Activity</h3>
                        <span class="text-muted">${defaultRegion ? `Default: ${defaultRegion}` : 'All Regions'} - ${viewMonthName} (External Only)</span>
                    </div>
                    <canvas id="regionActivityChart" style="max-height: 200px;"></canvas>
                </div>
            </div>
            
            ${missingSfdcData.teamPercentage > 0 ? `
            <!-- Missing SFDC Opportunities -->
            <div class="dashboard-charts-row">
                <div class="dashboard-chart-card" style="grid-column: 1 / -1;">
                    <div class="dashboard-chart-header">
                        <h3>Missing SFDC Opportunities</h3>
                        <span class="text-muted">${viewMonthName}</span>
                    </div>
                    <div style="padding: 1rem 0;">
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.5rem;">
                                Team Level: ${missingSfdcData.teamPercentage.toFixed(1)}%
                            </div>
                            <div style="font-size: 0.875rem; color: var(--gray-600);">
                                ${missingSfdcData.teamMissing} of ${missingSfdcData.teamTotal} external activities missing SFDC links
                            </div>
                        </div>
                        ${missingSfdcData.regionPercentage > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.5rem;">
                                ${defaultRegion || 'Your Region'}: ${missingSfdcData.regionPercentage.toFixed(1)}%
                            </div>
                            <div style="font-size: 0.875rem; color: var(--gray-600);">
                                ${missingSfdcData.regionMissing} of ${missingSfdcData.regionTotal} activities missing SFDC links
                            </div>
                        </div>
                        ` : ''}
                        ${missingSfdcData.individualPercentage > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.5rem;">
                                Your Activities: ${missingSfdcData.individualPercentage.toFixed(1)}%
                            </div>
                            <div style="font-size: 0.875rem; color: var(--gray-600);">
                                ${missingSfdcData.individualMissing} of ${missingSfdcData.individualTotal} activities missing SFDC links
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${topPresalesReps.length > 0 ? `
            <!-- Top 3 Presales Reps -->
            <div class="dashboard-charts-row">
                <div class="dashboard-chart-card">
                    <div class="dashboard-chart-header">
                        <h3>Top 3 Presales Reps</h3>
                        <span class="text-muted">${viewMonthName}</span>
                    </div>
                    <div style="padding: 1rem 0;">
                        ${topPresalesReps.map((rep, index) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: ${index < topPresalesReps.length - 1 ? '1px solid var(--gray-200)' : 'none'};">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="width: 2rem; height: 2rem; border-radius: 50%; background: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}; display: flex; align-items: center; justify-content: center; font-weight: 600; color: white; font-size: 0.875rem;">
                                        ${index + 1}
                                    </div>
                                    <div>
                                        <div style="font-weight: 600; color: var(--gray-900);">${rep.name}</div>
                                        <div style="font-size: 0.875rem; color: var(--gray-600);">${rep.count} activities</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        dashboardView.innerHTML = html;
        this.applyAppConfiguration();

        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.initDashboardCharts({
                internalCount,
                externalCount,
                callTypes,
                regionBreakdown
            });
        }, 100);
    },

    async calculateMissingSfdcStats(externalActivities, currentUser, defaultRegion, userMap = null) {
        const accounts = await DataManager.getAccounts();
        const accountMap = new Map(accounts.map(a => [a.id, a]));
        if (userMap == null) {
            const users = await DataManager.getUsers();
            userMap = new Map(users.map(u => [u.id, u]));
        }
        const projectMap = new Map();
        accounts.forEach(account => {
            account.projects?.forEach(project => {
                projectMap.set(project.id, { account, project });
            });
        });

        // Team level
        let teamMissing = 0;
        let teamTotal = externalActivities.length;
        externalActivities.forEach(activity => {
            if (activity.projectId) {
                const projectData = projectMap.get(activity.projectId);
                const project = projectData?.project;
                if (project && (!project.sfdcLink || !project.sfdcLink.trim())) {
                    teamMissing++;
                }
            } else if (activity.accountId) {
                const account = accountMap.get(activity.accountId);
                if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                    teamMissing++;
                }
            }
        });
        const teamPercentage = teamTotal > 0 ? (teamMissing / teamTotal) * 100 : 0;

        // Region level (default region)
        let regionMissing = 0;
        let regionTotal = 0;
        if (defaultRegion) {
            externalActivities.forEach(activity => {
                const account = accountMap.get(activity.accountId);
                const user = userMap.get(activity.userId);
                const region = DataManager.resolveActivityRegion(activity, account, user);
                if (region === defaultRegion) {
                    regionTotal++;
                    if (activity.projectId) {
                        const projectData = projectMap.get(activity.projectId);
                        const project = projectData?.project;
                        if (project && (!project.sfdcLink || !project.sfdcLink.trim())) {
                            regionMissing++;
                        }
                    } else if (activity.accountId) {
                        const account = accountMap.get(activity.accountId);
                        if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                            regionMissing++;
                        }
                    }
                }
            });
        }
        const regionPercentage = regionTotal > 0 ? (regionMissing / regionTotal) * 100 : 0;

        // Individual level (current user)
        let individualMissing = 0;
        let individualTotal = 0;
        if (currentUser) {
            externalActivities.forEach(activity => {
                if (activity.userId === currentUser.id) {
                    individualTotal++;
                    if (activity.projectId) {
                        const projectData = projectMap.get(activity.projectId);
                        const project = projectData?.project;
                        if (project && (!project.sfdcLink || !project.sfdcLink.trim())) {
                            individualMissing++;
                        }
                    } else if (activity.accountId) {
                        const account = accountMap.get(activity.accountId);
                        if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                            individualMissing++;
                        }
                    }
                }
            });
        }
        const individualPercentage = individualTotal > 0 ? (individualMissing / individualTotal) * 100 : 0;

        return {
            teamMissing,
            teamTotal,
            teamPercentage,
            regionMissing,
            regionTotal,
            regionPercentage,
            individualMissing,
            individualTotal,
            individualPercentage
        };
    },

    getTopPresalesReps(activities, limit = 3) {
        const userCounts = {};
        activities.forEach(activity => {
            if (activity.userId && activity.userName) {
                if (!userCounts[activity.userId]) {
                    userCounts[activity.userId] = {
                        id: activity.userId,
                        name: activity.userName,
                        count: 0
                    };
                }
                userCounts[activity.userId].count++;
            }
        });

        return Object.values(userCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    },

    dashboardCharts: {},

    // Plugin to show value on pie segments and bar tops (no extra dependency)
    chartValueLabelsPlugin: {
        id: 'chartValueLabels',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            if (!ctx) return;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta.data || meta.data.length === 0) return;
                const total = dataset.data.reduce((a, b) => a + b, 0);
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value == null || value === 0) return;
                    const label = chart.data.labels && chart.data.labels[index] ? String(chart.data.labels[index]).slice(0, 12) : '';
                    ctx.save();
                    ctx.font = '12px sans-serif';
                    ctx.fillStyle = '#1a202c';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
                        const { x, y } = element.tooltipPosition();
                        const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '';
                        ctx.fillText(value, x, y - 6);
                        if (pct) ctx.fillText(pct + '%', x, y + 8);
                    } else if (chart.config.type === 'bar') {
                        const { x, y } = element.tooltipPosition();
                        ctx.fillText(value, x, y - 8);
                    }
                    ctx.restore();
                });
            });
        }
    },

    destroyDashboardCharts() {
        Object.values(this.dashboardCharts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.dashboardCharts = {};
    },

    initDashboardCharts(data) {
        // Destroy existing charts first
        this.destroyDashboardCharts();

        const { internalCount, externalCount, callTypes, regionBreakdown } = data;

        // Internal vs External Pie Chart
        const internalExternalCtx = document.getElementById('internalExternalChart');
        if (internalExternalCtx && (internalCount > 0 || externalCount > 0)) {
            if (typeof Chart !== 'undefined') {
                try { Chart.register(this.chartValueLabelsPlugin); } catch (_) { /* already registered */ }
            }
            this.dashboardCharts.internalExternal = new Chart(internalExternalCtx, {
                type: 'pie',
                data: {
                    labels: ['Internal', 'External'],
                    datasets: [{
                        data: [internalCount, externalCount],
                        backgroundColor: ['#805AD5', '#4299E1'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Call Types Pie Chart
        const callTypesCtx = document.getElementById('callTypesChart');
        if (callTypesCtx && Object.keys(callTypes).length > 0) {
            const labels = Object.keys(callTypes).map(type => {
                const labelMap = {
                    'customerCall': 'Customer Call',
                    'sow': 'SOW',
                    'poc': 'POC',
                    'rfx': 'RFx',
                    'pricing': 'Pricing',
                    'other': 'Other'
                };
                return labelMap[type.toLowerCase()] || type;
            });
            const values = Object.values(callTypes);
            const colors = ['#4299E1', '#48BB78', '#ED8936', '#9F7AEA', '#F56565', '#38B2AC', '#ECC94B'];

            if (typeof Chart !== 'undefined') {
                try { Chart.register(this.chartValueLabelsPlugin); } catch (_) { /* already registered */ }
            }
            this.dashboardCharts.callTypes = new Chart(callTypesCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Region Activity Bar Chart
        const regionActivityCtx = document.getElementById('regionActivityChart');
        if (regionActivityCtx && Object.keys(regionBreakdown).length > 0) {
            const regions = Object.keys(regionBreakdown).sort((a, b) => regionBreakdown[b] - regionBreakdown[a]);
            const counts = regions.map(r => regionBreakdown[r]);

            if (typeof Chart !== 'undefined') {
                try { Chart.register(this.chartValueLabelsPlugin); } catch (_) { /* already registered */ }
            }
            this.dashboardCharts.regionActivity = new Chart(regionActivityCtx, {
                type: 'bar',
                data: {
                    labels: regions,
                    datasets: [{
                        label: 'Activities',
                        data: counts,
                        backgroundColor: '#4299E1',
                        borderColor: '#3182CE',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
    },

    // Navigate to card view (for card interface)
    navigateToCardView(viewName) {
        const accessKey = this.getDashboardVisibilityKey(viewName);
        if (accessKey) {
            if (!this.isFeatureEnabled(accessKey)) {
                UI.showNotification(this.getAccessMessage(accessKey, 'feature'), 'info');
                return;
            }
            if (!this.isDashboardVisible(accessKey)) {
                UI.showNotification(this.getAccessMessage(accessKey, 'visibility'), 'info');
                return;
            }
        }

        if (typeof Auth !== 'undefined' && Auth.isAnalyticsOnly && Auth.isAnalyticsOnly() && viewName !== 'reports') {
            console.warn('Analytics-only user restricted to reports view. Redirecting.');
            viewName = 'reports';
        }
        if (InterfaceManager.getCurrentInterface() !== 'card') {
            // Fallback to normal navigation
            this.switchView(viewName);
            return;
        }

        // For card interface, load card-based views
        this.switchView(viewName);

        // Reload the view with card layout
        setTimeout(() => {
            switch (viewName) {
                case 'dashboard':
                    this.loadCardDashboard();
                    break;
                case 'activities':
                    this.loadCardActivitiesView();
                    break;
                case 'winloss':
                    this.loadCardWinLossView();
                    break;
                case 'reports':
                    this.loadCardReportsView();
                    break;
                case 'accounts':
                    this.loadCardAccountsView();
                    break;
                case 'import':
                    this.loadImportView();
                    break;
                case 'projectHealth':
                    this.loadCardProjectHealthView();
                    break;
                case 'sfdcCompliance':
                    this.loadCardSfdcComplianceView();
                    break;
                case 'admin':
                    // Legacy - redirect to systemAdmin
                    this.switchView('systemAdmin');
                    break;
                case 'systemAdmin':
                    if (Auth.isAdmin()) {
                        this.loadCardSystemAdminView();
                    }
                    break;
                case 'configuration':
                    if (Auth.isAdmin()) {
                        this.loadCardConfigurationView();
                    }
                    break;
                case 'adminLoginLogs':
                    if (Auth.isAdmin()) {
                        Admin.initLoginLogsView();
                    }
                    break;
                case 'adminPoc':
                    if (Auth.isAdmin()) {
                        Admin.loadPOCSandbox(true);
                    }
                    break;
            }
        }, 100);
    },

    // Update statistics
    async updateStats() {
        try {
            const [accounts, activities, internalActivities] = await Promise.all([
                DataManager.getAccounts(),
                DataManager.getAllActivities(),
                DataManager.getInternalActivities()
            ]);
            const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();

            let totalProjects = 0;
            let customerActivities = 0;
            let wonProjects = 0;
            let lostProjects = 0;
            let activeProjects = 0;

            accounts.forEach(account => {
                account.projects?.forEach(project => {
                    totalProjects++;
                    customerActivities += project.activities?.length || 0;

                    if (project.status === 'won') wonProjects++;
                    else if (project.status === 'lost') lostProjects++;
                    else activeProjects++;
                });
            });

            const stats = {
                totalProjects,
                totalActivities: activities.length,
                customerActivities,
                internalActivities: internalActivities.length,
                wonProjects,
                lostProjects,
                activeProjects
            };

            const setTextContent = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };

            setTextContent('totalProjectsStat', stats.totalProjects);
            setTextContent('totalActivitiesStat', stats.totalActivities);
            setTextContent('customerActivitiesStat', stats.customerActivities);
            setTextContent('internalActivitiesStat', stats.internalActivities);
            setTextContent('projectStatusStat', stats.totalProjects);
            setTextContent('wonProjectsStat', stats.wonProjects);
            setTextContent('lostProjectsStat', stats.lostProjects);
            setTextContent('activeProjectsStat', stats.activeProjects);

            return stats;
        } catch (error) {
            console.error('Error updating stats:', error);
            return null;
        }
    },

    // Load recent activities
    async loadRecentActivities() {
        try {
            const all = await DataManager.getAllActivities();
            const activities = all.slice(0, 10);
            const container = document.getElementById('recentActivitiesList');
            if (!container) {
                console.error('recentActivitiesList container not found');
                return;
            }

            if (activities.length === 0) {
                container.innerHTML = UI.emptyState('No recent activities');
                return;
            }

            let html = '';
            activities.forEach(activity => {
                html += `
                    <div class="activity-item">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong>${UI.getActivityTypeLabel(activity.type)}</strong>
                                <span class="activity-badge ${activity.isInternal ? 'internal' : 'customer'}">
                                    ${activity.isInternal ? 'Internal' : 'Customer'}
                                </span>
                                <div class="text-muted" style="margin-top: 0.5rem; font-size: 0.875rem;">
                                    ${activity.accountName || 'N/A'} ${activity.projectName ? '→ ' + activity.projectName : ''}
                                </div>
                                <div class="text-muted" style="font-size: 0.75rem; margin-top: 0.25rem;">
                                    ${UI.formatDate(activity.date || activity.createdAt)} • ${activity.userName || 'Unknown'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading recent activities:', error);
            const container = document.getElementById('recentActivitiesList');
            if (container) {
                container.innerHTML = UI.emptyState('Error loading activities');
            }
        }
    },

    // Load card-based activities view
    async loadCardActivitiesView() {
        const activitiesView = document.getElementById('activitiesView');
        if (!activitiesView) return;

        const allActivities = await DataManager.getAllActivities();
        const activities = await this.applyActivityFilters(allActivities);
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();

        // Group by month (use monthOfActivity when present so hosted data counts correctly)
        const activitiesByMonth = {};
        activities.forEach(activity => {
            const month = (DataManager.resolveActivityMonth && DataManager.resolveActivityMonth(activity)) || (activity.date || '').substring(0, 7) || 'Unknown';
            if (!activitiesByMonth[month]) {
                activitiesByMonth[month] = [];
            }
            activitiesByMonth[month].push(activity);
        });

        let html = `
            <a href="#" class="back-to-home" onclick="App.navigateToCardView('dashboard'); return false;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
                Back to Home
            </a>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="font-size: 2rem; font-weight: 700; color: var(--gray-900);">All Activities</h1>
                <button class="btn btn-primary" onclick="Activities.openActivityModal()">+ Log Activity</button>
            </div>
            <div class="analytics-filter-bar">
                <div class="form-group" style="flex: 1; min-width: 220px;">
                    <label class="form-label">Search</label>
                    <input type="text" id="cardActivitySearch" class="form-control" placeholder="Search activities..." oninput="App.handleActivitySearch(this.value, 'card')">
                </div>
                <div class="form-group">
                    <label class="form-label">Industry</label>
                    <select id="cardActivityFilterIndustry" class="form-control" onchange="App.handleActivityFiltersChange('card')">
                        <option value="">All Industries</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Channel</label>
                    <select id="cardActivityFilterChannel" class="form-control" onchange="App.handleActivityFiltersChange('card')">
                        <option value="">All Channels</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Timeframe</label>
                    <select id="cardActivityFilterTimeframe" class="form-control" onchange="App.handleActivityFiltersChange('card')">
                        <option value="all">All Time</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Owner</label>
                    <select id="cardActivityFilterOwner" class="form-control" onchange="App.handleActivityFiltersChange('card')">
                        <option value="all">All Activities</option>
                    </select>
                </div>
                <div class="form-group" style="align-self: flex-end;">
                    <button class="btn btn-link" onclick="App.resetActivityFilters(); return false;">Reset</button>
                </div>
            </div>
        `;

        if (activities.length === 0) {
            html += `<div class="content-card">${UI.emptyState('No activities match the current filters.')}</div>`;
        } else {
            Object.keys(activitiesByMonth).sort().reverse().forEach(month => {
                html += `
                    <div class="content-card">
                        <div class="content-card-header">
                            <h2 class="content-card-title">${UI.formatMonth(month)}</h2>
                            <span style="color: var(--gray-600); font-size: 0.875rem;">${activitiesByMonth[month].length} activities</span>
                        </div>
                        <div class="card-grid-4">
                `;

                activitiesByMonth[month].forEach(activity => {
                    const isOwner = currentUser
                        ? activity.userId === currentUser.id || activity.createdBy === currentUser.id
                        : false;
                    const canManage = isOwner || isAdmin;
                    html += `
                        <div class="activity-card ${activity.isInternal ? 'internal' : 'customer'}">
                            <div class="activity-card-header">
                                <div>
                                    <div class="activity-card-type">${UI.getActivityTypeLabel(activity.type)}</div>
                                    <span class="activity-card-badge ${activity.isInternal ? 'internal' : 'customer'}">
                                        ${activity.isInternal ? 'Internal' : 'Customer'}
                                    </span>
                                </div>
                            </div>
                            <div class="activity-card-info">
                                <div><strong>Account:</strong> ${activity.accountName || 'N/A'}</div>
                                ${activity.projectName ? `<div><strong>Project:</strong> ${activity.projectName}</div>` : ''}
                            </div>
                            <div class="activity-card-meta">
                                ${UI.formatDate(activity.date || activity.createdAt)}<br>
                                By: ${activity.userName || 'Unknown'}
                            </div>
                            ${canManage ? `
                                <div class="activity-card-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); App.editActivity('${activity.id}', ${activity.isInternal})" style="flex: 1;">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); App.deleteActivity('${activity.id}', ${activity.isInternal})" style="flex: 1;">Delete</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });

                html += `</div></div>`;
            });
        }

        activitiesView.innerHTML = html;
        await this.populateActivityFilterControls();
    },

    // Load card-based win/loss view
    async loadCardWinLossView() {
        const winlossView = document.getElementById('winlossView');
        if (!winlossView) return;

        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        if (!this.winLossFilters.owner) {
            this.winLossFilters.owner = this.getDefaultRecordOwnerFilter();
        }
        const ownerFilterRaw = this.winLossFilters.owner || this.getDefaultRecordOwnerFilter();
        const ownerFilterValue = this.resolveOwnerFilterValue(ownerFilterRaw, currentUser);

        let projects = await this.getWinLossProjectsDataset();
        projects = projects.filter(project => {
            const ownerIds = project.ownerIds || [];
            if (ownerFilterValue !== 'all') {
                return ownerIds.includes(ownerFilterValue);
            }
            if (!isAdmin && currentUser?.id) {
                return ownerIds.includes(currentUser.id);
            }
            return true;
        });
        const monthFilter = (this.winLossFilters.month || '').trim();
        if (monthFilter) {
            projects = projects.filter(project => {
                const monthOfWin = project.winLossData?.monthOfWin;
                return monthOfWin === monthFilter || (!monthOfWin && (project.status === 'active' || project.status === ''));
            });
        }
        const statusFilter = (this.winLossFilters.statusFilter || 'all').trim();
        if (statusFilter === 'won' || statusFilter === 'lost') {
            projects = projects.filter(p => p.status === statusFilter);
        }

        const wonProjects = projects.filter(project => project.status === 'won').length;
        const lostProjects = projects.filter(project => project.status === 'lost').length;
        const activeProjects = projects.filter(project => project.status !== 'won' && project.status !== 'lost').length;

        let html = `
            <a href="#" class="back-to-home" onclick="App.navigateToCardView('dashboard'); return false;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
                Back to Home
            </a>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h1 style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0;">Win/Loss Tracking</h1>
                <div class="form-group" style="min-width: 200px; margin: 0;">
                    <label class="form-label" style="color: var(--gray-600); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Owner</label>
                    <select id="cardWinlossOwnerFilter" class="form-control" onchange="App.handleWinLossOwnerChange(this.value, 'card')">
                        <option value="all">All Projects</option>
                    </select>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="card-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 2rem;">
                <div class="dashboard-stat-card" style="border-left-color: #48BB78;">
                    <div class="dashboard-stat-card-title">Won Projects</div>
                    <div class="dashboard-stat-card-value" style="color: #48BB78;">${wonProjects}</div>
                </div>
                <div class="dashboard-stat-card" style="border-left-color: #F56565;">
                    <div class="dashboard-stat-card-title">Lost Projects</div>
                    <div class="dashboard-stat-card-value" style="color: #F56565;">${lostProjects}</div>
                </div>
                <div class="dashboard-stat-card" style="border-left-color: #4299E1;">
                    <div class="dashboard-stat-card-title">Active Projects</div>
                    <div class="dashboard-stat-card-value" style="color: #4299E1;">${activeProjects}</div>
                </div>
            </div>
        `;

        if (!projects.length) {
            html += `<div class="content-card">${UI.emptyState('No projects match the current filters.')}</div>`;
        } else {
            const currentUserId = currentUser?.id;
            projects.forEach(project => {
                const statusColor = project.status === 'won' ? '#48BB78' : project.status === 'lost' ? '#F56565' : '#4299E1';
                const ownerLabel = project.primaryOwnerName || (project.ownerNames && project.ownerNames.length ? project.ownerNames.join(', ') : 'Unassigned');
                const canManage = isAdmin || (currentUserId && (project.ownerIds || []).includes(currentUserId));
                html += `
                    <div class="content-card">
                        <div class="content-card-header">
                            <div>
                                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">${project.name}</h3>
                                <div style="color: var(--gray-600); font-size: 0.875rem; margin-top: 0.25rem;">${project.accountName}</div>
                                <div style="color: var(--gray-500); font-size: 0.75rem; margin-top: 0.25rem;">Owner: ${ownerLabel}</div>
                            </div>
                            <span style="padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                                ${project.status || 'active'}
                            </span>
                        </div>
                        ${project.winLossData ? `
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200);">
                                ${project.winLossData.reason ? `<p><strong>Reason:</strong> ${project.winLossData.reason}</p>` : ''}
                                ${this.formatWinLossAmount(project.winLossData) ? `<p><strong>MRR:</strong> ${this.formatWinLossAmount(project.winLossData)}</p>` : ''}
                                ${project.winLossData.otd ? `<p><strong>OTD:</strong> ${project.winLossData.otd}</p>` : ''}
                            </div>
                        ` : ''}
                        <p class="text-muted" style="margin-top: 0.75rem;">
                            <strong>SFDC:</strong> ${project.sfdcLink ? `<a href="${project.sfdcLink}" target="_blank" rel="noopener">Open Link</a>` : 'Not set'}
                        </p>
                        <div style="margin-top: 1rem;">
                            ${canManage ? `
                                <button class="btn btn-sm btn-primary" data-feature="winLoss" onclick="App.openWinLossModal('${project.accountId}', '${project.id}')">
                                    ${project.status ? 'Update Status' : 'Set Win/Loss'}
                                </button>
                            ` : `
                                <span class="text-muted" style="font-size: 0.8rem;">View only</span>
                            `}
                        </div>
                    </div>
                `;
            });
        }

        winlossView.innerHTML = html;
        await this.populateWinLossOwnerFilter();
    },

    async promptProjectSfdcLink(accountId, projectId) {
        const accounts = await DataManager.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        const project = account?.projects?.find(p => p.id === projectId);

        if (!project) {
            UI.showNotification('Project not found', 'error');
            return;
        }

        const currentLink = project.sfdcLink || '';
        const updatedLink = prompt(`Update SFDC link for "${project.name}"`, currentLink);
        if (updatedLink === null) {
            return;
        }

        const trimmed = updatedLink.trim();
        if (!trimmed) {
            UI.showNotification('SFDC link cannot be empty.', 'error');
            return;
        }

        if (!/^https?:\/\//i.test(trimmed)) {
            UI.showNotification('Please enter a valid SFDC link starting with http:// or https://', 'error');
            return;
        }

        await DataManager.updateProject(accountId, projectId, { sfdcLink: trimmed });
        UI.showNotification('SFDC link updated successfully.', 'success');
        this.refreshCurrentViewData();
    },

    async updateSfdcLinkFromInput(accountId, projectId, inputId) {
        const input = document.getElementById(inputId);
        if (!input) {
            UI.showNotification('Unable to find SFDC input field.', 'error');
            return;
        }
        const trimmed = input.value.trim();
        if (!trimmed) {
            UI.showNotification('SFDC link cannot be empty.', 'error');
            return;
        }
        if (!/^https?:\/\//i.test(trimmed)) {
            UI.showNotification('Please enter a valid SFDC link starting with http:// or https://', 'error');
            return;
        }
        await DataManager.updateProject(accountId, projectId, { sfdcLink: trimmed });
        UI.showNotification('SFDC link updated successfully.', 'success');
        this.refreshCurrentViewData();
    },

    // Load card-based accounts view
    async loadCardAccountsView() {
        const accountsView = document.getElementById('accountsView');
        if (!accountsView) return;

        const [accounts, allActivities, ownerMap] = await Promise.all([
            DataManager.getAccounts(),
            DataManager.getAllActivities(),
            this.getProjectOwnerMap()
        ]);
        const isAdmin =
            typeof Auth !== 'undefined' &&
            typeof Auth.isAdmin === 'function' &&
            Auth.isAdmin();

        let html = `
            <a href="#" class="back-to-home" onclick="App.navigateToCardView('dashboard'); return false;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
                Back to Home
            </a>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="font-size: 2rem; font-weight: 700; color: var(--gray-900);">Accounts</h1>
            </div>
        `;

        if (accounts.length === 0) {
            html += `<div class="content-card">${UI.emptyState('No accounts found')}</div>`;
        } else {
            html += `<div class="card-grid-4">`;
            for (const account of accounts) {
                const projectCount = account.projects?.length || 0;
                const activityCount = allActivities.filter(a => a.accountId === account.id).length;
                const actionButtons = isAdmin
                    ? [
                        `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); App.editAccount('${account.id}')" style="flex: 1;">Edit</button>`,
                        `<button class="btn btn-sm btn-info" onclick="event.stopPropagation(); App.showMergeAccountModal('${account.id}')" style="flex: 1;">Merge</button>`,
                        `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); App.showDeleteAccountModal('${account.id}')" style="flex: 1;">Delete</button>`
                    ]
                    : [];
                const projectsMarkup = await this.buildAccountProjectsMarkup(account, 'card', ownerMap);
                html += `
                    <div class="account-card">
                        <div class="account-card-header">
                            <div>
                                <div class="account-card-name">${account.name}</div>
                                <div class="account-card-meta">
                                    ${account.industry || 'N/A'} • ${account.salesRep || 'N/A'}${account.salesRepRegion ? ` • ${account.salesRepRegion}` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="account-card-stats">
                            <div class="account-card-stat">
                                <div class="account-card-stat-label">Projects</div>
                                <div class="account-card-stat-value">${projectCount}</div>
                            </div>
                            <div class="account-card-stat">
                                <div class="account-card-stat-label">Activities</div>
                                <div class="account-card-stat-value">${activityCount}</div>
                            </div>
                        </div>
                        ${actionButtons.length ? `
                            <div class="account-card-actions">
                                ${actionButtons.join('')}
                            </div>
                        ` : ''}
                        ${projectsMarkup}
                    </div>
                `;
            }
            html += `</div>`;
        }

        accountsView.innerHTML = html;
    },

    // Load card-based reports view
    async loadCardReportsView() {
        const reportsView = document.getElementById('reportsView');
        if (!reportsView) return;
        const availableMonths = await DataManager.getAvailableActivityMonths();
        const fallbackMonth = new Date().toISOString().substring(0, 7);
        const monthOptions = availableMonths.length ? [...availableMonths] : [fallbackMonth];
        let selectedMonth = this.latestAnalytics.cardMonth
            || this.latestAnalytics.standardPeriod
            || (monthOptions.length ? monthOptions[monthOptions.length - 1] : fallbackMonth);

        if (monthOptions.length && !monthOptions.includes(selectedMonth)) {
            selectedMonth = monthOptions[monthOptions.length - 1] || fallbackMonth;
        }
        if (!selectedMonth) {
            selectedMonth = fallbackMonth;
        }
        this.latestAnalytics.cardMonth = selectedMonth;

        const analytics = await DataManager.getMonthlyAnalytics(selectedMonth, this.reportFilters || {});
        this.latestAnalytics.card = analytics;

        reportsView.innerHTML = `
            <a href="#" class="back-to-home" onclick="App.navigateToCardView('dashboard'); return false;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
                Back to Home
            </a>
            <div class="analytics-card-controls">
                <label class="form-label">Select Month</label>
                <div class="month-picker-group">
                    <button type="button" class="btn btn-outline month-nav" onclick="App.shiftReportMonth(-1, 'card')" aria-label="Previous month">
                        ‹
                    </button>
                    <input type="month"
                           id="cardReportMonth"
                           class="form-control"
                           value="${selectedMonth}"
                           onchange="App.handleCardReportMonthChange(this.value)">
                    <button type="button" class="btn btn-outline month-nav" onclick="App.shiftReportMonth(1, 'card')" aria-label="Next month">
                        ›
                    </button>
                </div>
            </div>
            ${this.buildAnalyticsOverviewTab(analytics, { prefix: 'card', periodType: 'month', periodValue: selectedMonth })}
        `;

        this.setAnalyticsLoading('card', true);
        await this.initAnalyticsCharts({ prefix: 'card', analytics, month: selectedMonth });
        this.setAnalyticsLoading('card', false);
        this.setupActivityMixToggle('card', analytics);
    },

    // Load card-based admin view
    loadCardAdminView() {
        // Legacy - redirect to systemAdmin
        this.loadCardSystemAdminView();
    },

    loadCardSystemAdminView() {
        Admin.loadSystemAdminPanel();
    },

    loadCardConfigurationView() {
        Admin.loadConfigurationPanel();
    },

    // Load activities view (async so callers can await refetch + re-render after save – FB2)
    async loadActivitiesView() {
        if (InterfaceManager.getCurrentInterface() === 'card') {
            await this.loadCardActivitiesView().catch(e => console.warn('loadCardActivitiesView failed', e));
            return;
        }
        // Initialize view mode if not set
        if (!this.activitiesViewMode) {
            this.activitiesViewMode = 'cards';
        }
        // Set initial button state
        setTimeout(() => {
            this.setActivitiesViewMode(this.activitiesViewMode);
        }, 50);
        await this.renderActivitiesList('activitiesContent');
    },

    /**
     * On session invalid (401): capture any in-progress activity or win/loss form into drafts
     * so the user can retry after signing in. Drafts are stored in localStorage and survive session clear.
     */
    capturePendingSubmissionsToDrafts() {
        if (typeof Drafts === 'undefined' || typeof Drafts.addDraft !== 'function') return;
        const msg = 'Session expired. Sign in and submit from Drafts.';

        // Activity modal: capture form state if visible and has meaningful data
        const activityModal = document.getElementById('activityModal');
        if (activityModal && activityModal.offsetParent !== null) {
            const categoryRadio = document.querySelector('#activityForm input[name="activityCategory"]:checked');
            const category = categoryRadio ? categoryRadio.value : '';
            const accountId = document.getElementById('selectedAccountId')?.value || '';
            const accountDisplay = document.getElementById('accountDisplay')?.textContent || '';
            const industry = document.getElementById('industry')?.value || '';
            const industryOtherText = document.getElementById('industryOtherText')?.value || '';
            const projectId = document.getElementById('selectedProjectId')?.value || '';
            const projectDisplay = document.getElementById('projectDisplay')?.textContent || '';
            const newAccountName = document.getElementById('newAccountName')?.value || '';
            const newProjectName = document.getElementById('newProjectName')?.value || '';
            const activityType = document.getElementById('activityTypeSelect')?.value || '';
            const activityDate = document.getElementById('activityDate')?.value || '';
            const hasData = category || accountId || accountDisplay || industry || projectId || projectDisplay || newAccountName || newProjectName || activityType || activityDate;
            if (hasData) {
                const formData = {
                    activityCategory: category,
                    accountId,
                    accountName: accountDisplay || newAccountName,
                    industry,
                    industryOtherText,
                    projectId,
                    projectName: projectDisplay || newProjectName,
                    newAccountName,
                    newProjectName,
                    activityType,
                    date: activityDate,
                    salesRepRegion: document.getElementById('salesRepRegionSelect')?.value || '',
                    salesRep: document.getElementById('salesRepSelect')?.value || '',
                    selectedUseCases: (typeof Activities !== 'undefined' && Activities.selectedUseCases) ? Activities.selectedUseCases.slice() : [],
                    callType: document.getElementById('callType')?.value || '',
                    callDescription: document.getElementById('callDescription')?.value || '',
                    sowLink: document.getElementById('sowLink')?.value || '',
                    rfxType: document.getElementById('rfxType')?.value || ''
                };
                Drafts.addDraft({
                    type: category === 'internal' ? 'internal' : 'external',
                    payload: { _activityForm: true, formData },
                    errorMessage: msg,
                    storageKey: 'activity_form',
                    label: 'Activity (in progress)'
                });
            }
        }

        // Win/Loss modal: capture form state if visible
        const winLossModal = document.getElementById('winLossModal');
        if (winLossModal && winLossModal.offsetParent !== null) {
            const accountId = document.getElementById('winLossAccountId')?.value || '';
            const projectId = document.getElementById('winLossProjectId')?.value || '';
            const status = document.getElementById('winLossStatus')?.value || '';
            const sfdcLink = (document.getElementById('winLossSfdcLink') && document.getElementById('winLossSfdcLink').value) ? document.getElementById('winLossSfdcLink').value.trim() : '';
            const mrrInput = document.getElementById('winLossMRR');
            const mrr = mrrInput ? mrrInput.value : '';
            const currency = mrrInput?.dataset?.currency || 'INR';
            const fxToInr = mrrInput?.dataset?.fx ? parseFloat(mrrInput.dataset.fx) : null;
            const monthOfWin = document.getElementById('winLossMonthOfWin')?.value || '';
            const wonByUserId = document.getElementById('winLossWonBy')?.value || '';
            const reason = document.getElementById('winLossReason')?.value || '';
            const competitors = document.getElementById('competitorAnalysis')?.value || '';
            const accountType = document.getElementById('accountType')?.value || '';
            const otd = document.getElementById('winLossOtd')?.value || '';
            if (accountId && projectId) {
                Drafts.addDraft({
                    type: 'external',
                    payload: {
                        _winlossForm: true,
                        accountId,
                        projectId,
                        status,
                        sfdcLink,
                        mrr,
                        currency,
                        fxToInr,
                        monthOfWin,
                        wonByUserId,
                        reason,
                        competitors,
                        accountType,
                        otd
                    },
                    errorMessage: msg,
                    storageKey: 'winloss',
                    label: 'Win/Loss update'
                });
            }
        }
    },

    updateDraftsBadge() {
        const badge = document.getElementById('draftsNavBadge');
        if (!badge) return;
        const count = typeof Drafts !== 'undefined' ? Drafts.getDrafts().length : 0;
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    },

    loadDraftsView() {
        const container = document.getElementById('draftsListContainer');
        const badge = document.getElementById('draftsNavBadge');
        if (!container) return;

        const drafts = typeof Drafts !== 'undefined' ? Drafts.getDrafts() : [];
        this.updateDraftsBadge();

        const headerActions = document.getElementById('draftsHeaderActions');
        if (headerActions) headerActions.style.display = drafts.length > 0 ? '' : 'none';

        if (drafts.length === 0) {
            container.innerHTML = '<p class="text-muted">No drafts. Your failed activities on this device appear here. Use <strong>Submit all</strong> to retry or <strong>Delete all</strong> to clear them.</p>';
            return;
        }

        const isFullListDraftPayload = (payload) => {
            return (Array.isArray(payload) && payload.length > 0) ||
                (!!payload && payload._fullList === true && typeof payload.payloadJson === 'string');
        };

        const decodeFullListPayload = (payload) => {
            if (Array.isArray(payload)) return payload;
            if (payload && payload._fullList === true && typeof payload.payloadJson === 'string') {
                try {
                    const parsed = JSON.parse(payload.payloadJson);
                    return Array.isArray(parsed) ? parsed : null;
                } catch (_) {
                    return null;
                }
            }
            return null;
        };

        const cards = drafts.map(function (d) {
            const isInternal = d.type === 'internal';
            const p = d.payload;
            const isWinlossForm = p && p._winlossForm === true;
            const isActivityForm = p && p._activityForm === true;
            const isFullList = isFullListDraftPayload(p);
            const fullListCount = Array.isArray(p) ? p.length : (p && Number.isFinite(Number(p.count)) ? Number(p.count) : null);
            const storageKey = d.storageKey || (isInternal ? 'internalActivities' : 'activities');
            const dateStr = isFullList ? (d.attemptedAt || '').toString().slice(0, 10) : (p && (p.date || p.createdAt || d.attemptedAt || '')).toString().slice(0, 10);
            const listLabel = storageKey === 'accounts'
                ? 'Accounts (win/loss) (' + (fullListCount != null ? fullListCount : '?') + ' items)'
                : isInternal ? 'Internal (' + (fullListCount != null ? fullListCount : '?') + ' items)' : 'Activities (' + (fullListCount != null ? fullListCount : '?') + ' items)';
            const label = d.label
                ? d.label + (dateStr ? ' – ' + dateStr : '')
                : isFullList
                    ? listLabel + ' – ' + dateStr
                    : isInternal
                        ? (p && (p.type || p.activityName || 'Internal')) + ' – ' + dateStr
                        : (p && (p.accountName || p.accountId || 'External')) + ' – ' + (p && p.type || '') + ' – ' + dateStr;
            const typeLabel = d.label ? d.label.split(' – ')[0] : (storageKey === 'accounts' ? 'Accounts' : storageKey === 'winloss' ? 'Win/Loss' : storageKey === 'activity_form' ? 'Activity' : (isInternal ? 'Internal' : 'External'));
            const err = (d.errorMessage || '').slice(0, 80);
            const isSubmitting = (d.errorMessage || '').trim() === 'Submitting…';
            const submitBtnLabel = isSubmitting ? 'Saving…' : (isActivityForm ? 'Open & Save' : 'Submit again');
            const submitDisabled = isSubmitting ? ' disabled' : '';
            const showEdit = !isFullList && !isSubmitting && (isActivityForm || (!isWinlossForm && !isActivityForm));
            return (
                '<div class="draft-card" data-draft-id="' + (d.id || '') + '">' +
                '<div class="draft-card-body">' +
                '<span class="draft-type">' + typeLabel + '</span>' +
                '<p class="draft-label">' + (label || 'Activity') + '</p>' +
                (err ? '<p class="draft-error text-muted small">' + err + '</p>' : '') +
                '<div class="draft-actions">' +
                '<button type="button" class="btn btn-primary btn-sm draft-submit"' + submitDisabled + '>' + submitBtnLabel + '</button> ' +
                (showEdit ? '<button type="button" class="btn btn-outline btn-sm draft-edit">Edit</button> ' : '') +
                '<button type="button" class="btn btn-outline btn-sm draft-discard"' + (isSubmitting ? ' disabled' : '') + '>Discard</button>' +
                '</div></div></div>'
            );
        }).join('');

        container.innerHTML = '<div class="drafts-grid">' + cards + '</div>';

        container.querySelectorAll('.draft-submit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const card = btn.closest('.draft-card');
                const id = card && card.getAttribute('data-draft-id');
                const draft = drafts.find(function (d) { return d.id === id; });
                if (!draft) return;
                (async function () {
                    try {
                        const p = draft.payload;
                        if (p && p._winlossForm === true) {
                            await App.applyWinLossDraft(p);
                            if (typeof Drafts !== 'undefined') Drafts.removeDraft(draft.id);
                            UI.showNotification('Win/Loss update saved.', 'success');
                            App.loadDraftsView();
                            if (typeof App.loadWinLossView === 'function') await App.loadWinLossView();
                            return;
                        }
                        if (p && p._activityForm === true && p.formData) {
                            if (typeof Activities !== 'undefined' && Activities.restoreFormFromDraft) {
                                await Activities.restoreFormFromDraft(p.formData, draft.id);
                            }
                            App.loadDraftsView();
                            return;
                        }
                        var isFullList = isFullListDraftPayload(p);
                        var keyToSave = draft.storageKey || (draft.type === 'internal' ? 'internalActivities' : 'activities');
                        if (isFullList) {
                            const decodedList = decodeFullListPayload(draft.payload);
                            if (!decodedList) throw new Error('Corrupt full-list draft payload');
                            await App.persistDraftListByKey(keyToSave, decodedList, draft.type);
                        } else if (draft.type === 'internal') {
                            await DataManager.addInternalActivity(draft.payload);
                        } else {
                            await DataManager.addActivity(draft.payload);
                        }
                        if (typeof Drafts !== 'undefined') Drafts.removeDraft(draft.id);
                        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Submitted successfully.', 'success');
                        App.loadDraftsView();
                        App.updateDraftsBadge();
                        if (App.currentView !== 'drafts' && typeof App.refreshCurrentViewData === 'function') {
                            App.refreshCurrentViewData();
                        }
                    } catch (e) {
                        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Still could not save. Try again or edit the draft.', 'error');
                    }
                })();
            });
        });

        container.querySelectorAll('.draft-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const card = btn.closest('.draft-card');
                const id = card && card.getAttribute('data-draft-id');
                const draft = drafts.find(function (d) { return d.id === id; });
                if (!draft) return;
                const p = draft.payload;
                if (p && p._activityForm === true && p.formData && typeof Activities !== 'undefined' && Activities.restoreFormFromDraft) {
                    Activities.restoreFormFromDraft(p.formData, draft.id);
                    App.loadDraftsView();
                    return;
                }
                if (isFullListDraftPayload(p)) return;
                if (typeof Activities === 'undefined' || !Activities.openActivityModal) return;
                Activities.openActivityModal({
                    mode: 'create',
                    activity: p,
                    isInternal: draft.type === 'internal',
                    fromDraftId: draft.id
                });
            });
        });

        container.querySelectorAll('.draft-discard').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const card = btn.closest('.draft-card');
                const id = card && card.getAttribute('data-draft-id');
                if (id && typeof Drafts !== 'undefined') Drafts.removeDraft(id);
                App.loadDraftsView();
                if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Draft discarded.', 'info');
            });
        });

        const submitAllBtn = document.getElementById('draftsSubmitAllBtn');
        const deleteAllBtn = document.getElementById('draftsDeleteAllBtn');
        if (submitAllBtn && !submitAllBtn._wired) {
            submitAllBtn._wired = true;
            submitAllBtn.addEventListener('click', function () {
                App.draftsSubmitAll();
            });
        }
        if (deleteAllBtn && !deleteAllBtn._wired) {
            deleteAllBtn._wired = true;
            deleteAllBtn.addEventListener('click', function () {
                App.draftsDeleteAll();
            });
        }
    },

    async draftsSubmitAll() {
        const drafts = typeof Drafts !== 'undefined' ? Drafts.getDrafts() : [];
        if (drafts.length === 0) return;
        let submitted = 0;
        let failed = 0;
        let skippedForms = 0;
        for (const draft of drafts) {
            const p = draft.payload;
            if (p && p._activityForm === true) {
                skippedForms++;
                continue;
            }
            if (p && p._winlossForm === true) {
                try {
                    await this.applyWinLossDraft(p);
                    if (typeof Drafts !== 'undefined') Drafts.removeDraft(draft.id);
                    submitted++;
                } catch (e) {
                    failed++;
                }
                continue;
            }
            try {
                const isFullList = isFullListDraftPayload(p);
                const keyToSave = draft.storageKey || (draft.type === 'internal' ? 'internalActivities' : 'activities');
                if (isFullList) {
                    const decodedList = decodeFullListPayload(draft.payload);
                    if (!decodedList) throw new Error('Corrupt full-list draft payload');
                    await this.persistDraftListByKey(keyToSave, decodedList, draft.type);
                } else if (draft.type === 'internal') {
                    await DataManager.addInternalActivity(draft.payload);
                } else {
                    await DataManager.addActivity(draft.payload);
                }
                if (typeof Drafts !== 'undefined') Drafts.removeDraft(draft.id);
                submitted++;
            } catch (e) {
                failed++;
            }
        }
        App.loadDraftsView();
        App.updateDraftsBadge();
        if (App.currentView !== 'drafts' && typeof App.refreshCurrentViewData === 'function') {
            App.refreshCurrentViewData();
        }
        if (typeof UI !== 'undefined' && UI.showNotification) {
            let msg = submitted + ' submitted.';
            if (failed > 0) msg += ' ' + failed + ' failed – check remaining drafts.';
            if (skippedForms > 0) msg += ' ' + skippedForms + ' in-progress form(s) – use Edit to complete.';
            UI.showNotification(msg, failed > 0 || skippedForms > 0 ? 'warning' : 'success');
        }
    },

    draftsDeleteAll() {
        if (typeof Drafts === 'undefined') return;
        const count = Drafts.getDrafts().length;
        if (count === 0) return;
        if (typeof window.confirm !== 'undefined' && !window.confirm('Delete all ' + count + ' draft(s)? This cannot be undone.')) return;
        Drafts.clearDrafts();
        App.loadDraftsView();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('All drafts deleted.', 'info');
    },

    async getWinLossProjectsDataset() {
        const [accounts, ownerMap, users] = await Promise.all([
            DataManager.getAccounts(),
            this.getProjectOwnerMap(),
            DataManager.getUsers()
        ]);
        const userLookup = new Map(users.map(user => [user.id, user]));

        const projects = [];
        accounts.forEach(account => {
            (account.projects || []).forEach(project => {
                const ownerIdsSet = new Set(ownerMap.get(project.id) || []);
                if (project.createdBy) {
                    ownerIdsSet.add(project.createdBy);
                }
                if (account.createdBy) {
                    ownerIdsSet.add(account.createdBy);
                }
                if (project.winLossData?.wonByUserId) {
                    ownerIdsSet.add(project.winLossData.wonByUserId);
                }
                const ownerIds = Array.from(ownerIdsSet);
                const ownerNames = ownerIds
                    .map(id => userLookup.get(id)?.username)
                    .filter(Boolean);
                projects.push({
                    ...project,
                    accountId: account.id,
                    accountName: account.name,
                    ownerIds,
                    ownerNames,
                    primaryOwnerName: ownerNames[0] || account.salesRep || 'Unassigned'
                });
            });
        });

        return projects;
    },

    async populateWinLossOwnerFilter() {
        const selectIds = ['winlossOwnerFilter', 'cardWinlossOwnerFilter'];
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const users = await this.getActiveUsers();

        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const options = [];
            if (isAdmin) {
                options.push({ value: 'all', label: 'All projects' });
            }
            if (currentUser?.id) {
                options.push({ value: currentUser.id, label: 'My projects' });
            }
            if (isAdmin) {
                users.forEach(user => {
                    options.push({ value: user.id, label: user.username });
                });
            }

            const uniqueOptions = [];
            const seen = new Set();
            options.forEach(option => {
                if (!option.value || seen.has(option.value)) return;
                seen.add(option.value);
                uniqueOptions.push(option);
            });

            select.innerHTML = uniqueOptions
                .map(option => `<option value="${option.value}">${option.label}</option>`)
                .join('');

            const desiredValue = this.winLossFilters.owner || this.getDefaultRecordOwnerFilter();
            if (select.querySelector(`option[value="${desiredValue}"]`)) {
                select.value = desiredValue;
            } else if (currentUser?.id && select.querySelector(`option[value="${currentUser.id}"]`)) {
                select.value = currentUser.id;
                this.winLossFilters.owner = currentUser.id;
            } else if (select.options.length) {
                select.value = select.options[0].value;
                this.winLossFilters.owner = select.value;
            }
        });
    },

    async populateWinLossMonthFilter() {
        const select = document.getElementById('winlossMonthFilter');
        if (!select) return;
        const allProjects = await this.getWinLossProjectsDataset();
        const months = new Set();
        allProjects.forEach(project => {
            const m = project.winLossData?.monthOfWin;
            if (m && /^\d{4}-\d{2}$/.test(m)) months.add(m);
        });
        const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const label = (ym) => {
            const [y, m] = ym.split('-').map(Number);
            return `${monthNames[m - 1]} ${y}`;
        };
        select.innerHTML = '<option value="">All months</option>' + sorted.map(ym => `<option value="${ym}">${label(ym)}</option>`).join('');
        const current = (this.winLossFilters.month || '').trim();
        if (current && select.querySelector(`option[value="${current}"]`)) {
            select.value = current;
        } else {
            select.value = '';
        }
    },

    handleWinLossOwnerChange(value = '', variant = 'standard') {
        const selectedValue = value || this.getDefaultRecordOwnerFilter();
        this.winLossFilters.owner = selectedValue;
        this.loadWinLossView();
        if (InterfaceManager.getCurrentInterface() === 'card' || variant === 'card') {
            this.loadCardWinLossView();
        }
    },

    handleWinLossMonthChange(value) {
        this.winLossFilters.month = value || '';
        this.loadWinLossView();
    },

    handleWinLossStatusFilterChange(value) {
        this.winLossFilters.statusFilter = value || 'all';
        this.loadWinLossView();
    },

    // Load win/loss view
    async loadWinLossView() {
        // Check if card interface is active
        if (InterfaceManager.getCurrentInterface() === 'card') {
            this.loadCardWinLossView().catch(e => console.warn('loadCardWinLossView failed', e));
            return;
        }

        try {
            const container = document.getElementById('winlossContent');
            if (!container) {
                console.error('winlossContent container not found');
                return;
            }
            if (!this.winLossFilters.owner) {
                this.winLossFilters.owner = this.getDefaultRecordOwnerFilter();
            }

            const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
                ? Auth.getCurrentUser()
                : null;
            const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
            const ownerFilterRaw = this.winLossFilters.owner || this.getDefaultRecordOwnerFilter();
            const ownerFilterValue = this.resolveOwnerFilterValue(ownerFilterRaw, currentUser);

            let visibleProjects = await this.getWinLossProjectsDataset();
            visibleProjects = visibleProjects.filter(project => {
                const ownerIds = project.ownerIds || [];
                if (ownerFilterValue !== 'all') {
                    return ownerIds.includes(ownerFilterValue);
                }
                if (!isAdmin && currentUser?.id) {
                    return ownerIds.includes(currentUser.id);
                }
                return true;
            });
            const monthFilter = (this.winLossFilters.month || '').trim();
            if (monthFilter) {
                visibleProjects = visibleProjects.filter(project => {
                    const monthOfWin = project.winLossData?.monthOfWin;
                    return monthOfWin === monthFilter || (!monthOfWin && (project.status === 'active' || project.status === ''));
                });
            }
            const statusFilter = (this.winLossFilters.statusFilter || 'all').trim();
            if (statusFilter === 'won' || statusFilter === 'lost') {
                visibleProjects = visibleProjects.filter(p => p.status === statusFilter);
            }

            const wins = visibleProjects.filter(p => p.status === 'won').length;
            const losses = visibleProjects.filter(p => p.status === 'lost').length;
            const active = visibleProjects.filter(p => p.status !== 'won' && p.status !== 'lost').length;

            const winsBadge = document.getElementById('totalWins');
            const lossesBadge = document.getElementById('totalLosses');
            const activeBadge = document.getElementById('totalActive');
            if (winsBadge) winsBadge.textContent = `${wins} Wins`;
            if (lossesBadge) lossesBadge.textContent = `${losses} Losses`;
            if (activeBadge) activeBadge.textContent = `${active} Active`;

            if (visibleProjects.length === 0) {
                container.innerHTML = UI.emptyState('No projects match the current filters.');
                return;
            }

            let html = '';
            visibleProjects.forEach(project => {
                const statusClass = project.status === 'won' ? 'won' :
                    project.status === 'lost' ? 'lost' : 'pending';
                const winLossDetails = project.winLossData ? `
                                <div style="margin-top: 0.5rem;">
                                    ${this.formatWinLossAmount(project.winLossData) ? `<p><strong>MRR:</strong> ${this.formatWinLossAmount(project.winLossData)}</p>` : ''}
                                    ${project.winLossData.reason ? `<p><strong>Reason:</strong> ${project.winLossData.reason}</p>` : ''}
                                    ${project.winLossData.otd ? `<p><strong>OTD:</strong> ${project.winLossData.otd}</p>` : ''}
                                </div>
                ` : '';
                const ownerLabel = project.primaryOwnerName || (project.ownerNames && project.ownerNames.length ? project.ownerNames.join(', ') : 'Unassigned');
                const canManage = isAdmin || (currentUser?.id && (project.ownerIds || []).includes(currentUser.id));

                html += `
                    <div class="project-card ${statusClass}">
                        <div class="project-info">
                            <h4>${project.name}</h4>
                            <p class="text-muted">${project.accountName}</p>
                            <p class="text-muted" style="margin-top: 0.5rem;">
                                <strong>Owner:</strong> ${ownerLabel}
                            </p>
                            ${winLossDetails}
                            <p class="text-muted" style="margin-top: 0.5rem;">
                                <strong>SFDC:</strong> ${project.sfdcLink ? `<a href="${project.sfdcLink}" target="_blank" rel="noopener">Open Link</a>` : 'Not set'}
                            </p>
                        </div>
                        <div class="win-loss-actions">
                            ${canManage ? `
                                <button class="btn btn-sm btn-primary" data-feature="winLoss" onclick="App.openWinLossModal('${project.accountId}', '${project.id}')">
                                    Update Status
                                </button>
                            ` : `
                                <span class="text-muted" style="font-size: 0.8rem;">View only</span>
                            `}
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
            await this.populateWinLossOwnerFilter();
            this.populateWinLossMonthFilter();
        } catch (error) {
            console.error('Error loading win/loss view:', error);
            const container = document.getElementById('winlossContent');
            if (container) {
                container.innerHTML = UI.emptyState('Error loading projects');
            }
        }
    },

    loadImportView() {
        if (typeof BulkImport !== 'undefined') {
            BulkImport.reset();
            BulkImport.evaluateFeatureAvailability();
        }

        const importView = document.getElementById('importView');
        if (!importView) return;

        if (InterfaceManager.getCurrentInterface() === 'card') {
            if (!importView.querySelector('.back-to-home')) {
                const backLink = document.createElement('a');
                backLink.href = '#';
                backLink.className = 'back-to-home';
                backLink.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"></path>
                    </svg>
                    Back to Home
                `;
                backLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    App.navigateToCardView('dashboard');
                });
                importView.insertBefore(backLink, importView.firstChild);
            }
        } else {
            const header = importView.querySelector('.page-header');
            if (header && !header.querySelector('.view-back-link')) {
                const backBtn = document.createElement('button');
                backBtn.className = 'btn btn-link view-back-link';
                backBtn.textContent = '← Back to Dashboard';
                backBtn.addEventListener('click', () => App.switchView('dashboard'));
                header.appendChild(backBtn);
            }
        }
    },

    // --- Suggestions and Bugs ---
    async loadSuggestionsBugsView() {
        const listEl = document.getElementById('suggestionsBugsList');
        if (!listEl) return;
        const entries = (typeof DataManager !== 'undefined' && DataManager.getSuggestionsAndBugs) ? await DataManager.getSuggestionsAndBugs() : [];
        const sorted = [...entries].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const user = typeof Auth !== 'undefined' && Auth.currentUser ? Auth.currentUser : null;
        const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin();
        const canEdit = (e) => user && (e.ownerId === user.id || isAdmin);

        if (sorted.length === 0) {
            listEl.innerHTML = `
                <div class="suggestions-bugs-empty">
                    <p>No suggestions or bugs yet. Use <strong>+ New suggestion or bug</strong> to add one.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = sorted.map((e) => {
            const comments = Array.isArray(e.comments) ? e.comments : [];
            const showEditDelete = canEdit(e);
            const createdAt = e.createdAt ? UI.formatDate ? UI.formatDate(e.createdAt) : e.createdAt : '';
            const updatedAt = e.updatedAt ? UI.formatDate ? UI.formatDate(e.updatedAt) : e.updatedAt : '';
            const updatedLine = e.updatedAt && e.updatedAt !== e.createdAt ? ` · Updated ${updatedAt}` : '';
            const commentsHtml = comments.map((c) => {
                const cDate = c.createdAt ? (UI.formatDate ? UI.formatDate(c.createdAt) : c.createdAt) : '';
                return `<div class="suggestions-bugs-comment"><strong>${(c.authorName || 'Unknown').replace(/</g, '&lt;')}</strong> <span class="suggestions-bugs-comment-date">${cDate}</span><p class="suggestions-bugs-comment-text">${(c.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p></div>`;
            }).join('');
            return `
                <div class="suggestions-bugs-card" data-entry-id="${(e.id || '').replace(/"/g, '&quot;')}">
                    <div class="suggestions-bugs-card-header">
                        <h3 class="suggestions-bugs-card-title">${(e.header || '').replace(/</g, '&lt;')}</h3>
                        ${showEditDelete ? `<span class="suggestions-bugs-actions"><button type="button" class="btn btn-link btn-sm" onclick="App.openSuggestionsBugsModal('${(e.id || '').replace(/'/g, "\\'")}')">Edit</button> <button type="button" class="btn btn-link btn-sm text-danger" onclick="App.deleteSuggestionsBugs('${(e.id || '').replace(/'/g, "\\'")}')">Delete</button></span>` : ''}
                    </div>
                    <p class="suggestions-bugs-card-description">${(e.description || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
                    <div class="suggestions-bugs-card-meta">By ${(e.ownerName || 'Unknown').replace(/</g, '&lt;')} · ${createdAt}${updatedLine}</div>
                    <div class="suggestions-bugs-comments">
                        <div class="suggestions-bugs-comments-list">${commentsHtml}</div>
                        <div class="suggestions-bugs-add-comment">
                            <input type="text" class="form-control suggestions-bugs-comment-input" placeholder="Add a comment..." data-entry-id="${(e.id || '').replace(/"/g, '&quot;')}">
                            <button type="button" class="btn btn-primary btn-sm" onclick="App.addSuggestionsBugsComment('${(e.id || '').replace(/'/g, "\\'")}')">Comment</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.suggestions-bugs-comment-input').forEach((input) => {
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    App.addSuggestionsBugsComment(input.dataset.entryId);
                }
            });
        });
    },

    async openSuggestionsBugsModal(entryId) {
        const modalId = 'suggestionsBugsModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            const container = document.getElementById('modalsContainer');
            if (!container) return;
            const modalHTML = `
                <div id="${modalId}" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title" id="suggestionsBugsModalTitle">New suggestion or bug</h2>
                            <button class="modal-close" onclick="App.closeSuggestionsBugsModal()">&times;</button>
                        </div>
                        <form id="suggestionsBugsForm" onsubmit="App.saveSuggestionsBugs(event)">
                            <input type="hidden" id="suggestionsBugsEntryId" value="">
                            <div class="form-group">
                                <label class="form-label required">Header</label>
                                <input type="text" class="form-control" id="suggestionsBugsHeader" required placeholder="Short title">
                            </div>
                            <div class="form-group">
                                <label class="form-label required">Description</label>
                                <textarea class="form-control" id="suggestionsBugsDescription" rows="4" required placeholder="Describe your suggestion or bug..."></textarea>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="App.closeSuggestionsBugsModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById(modalId);
        }
        const titleEl = document.getElementById('suggestionsBugsModalTitle');
        const idInput = document.getElementById('suggestionsBugsEntryId');
        const headerInput = document.getElementById('suggestionsBugsHeader');
        const descInput = document.getElementById('suggestionsBugsDescription');
        if (entryId) {
            const entries = await DataManager.getSuggestionsAndBugs();
            const entry = entries.find((e) => e.id === entryId);
            if (entry) {
                if (titleEl) titleEl.textContent = 'Edit suggestion or bug';
                if (idInput) idInput.value = entry.id;
                if (headerInput) headerInput.value = entry.header || '';
                if (descInput) descInput.value = entry.description || '';
            } else {
                if (titleEl) titleEl.textContent = 'New suggestion or bug';
                if (idInput) idInput.value = '';
                if (headerInput) headerInput.value = '';
                if (descInput) descInput.value = '';
            }
        } else {
            if (titleEl) titleEl.textContent = 'New suggestion or bug';
            if (idInput) idInput.value = '';
            if (headerInput) headerInput.value = '';
            if (descInput) descInput.value = '';
        }
        UI.showModal(modalId);
    },

    closeSuggestionsBugsModal() {
        UI.hideModal('suggestionsBugsModal');
    },

    async saveSuggestionsBugs(event) {
        if (event) event.preventDefault();
        const idInput = document.getElementById('suggestionsBugsEntryId');
        const headerInput = document.getElementById('suggestionsBugsHeader');
        const descInput = document.getElementById('suggestionsBugsDescription');
        if (!headerInput || !descInput || !DataManager || !DataManager.getSuggestionsAndBugs || !DataManager.saveSuggestionsAndBugs) return;
        const header = (headerInput.value || '').trim();
        const description = (descInput.value || '').trim();
        if (!header || !description) {
            UI.showNotification('Header and description are required', 'error');
            return;
        }
        const user = Auth && Auth.currentUser;
        if (!user) {
            UI.showNotification('You must be logged in to submit.', 'error');
            return;
        }
        const entries = await DataManager.getSuggestionsAndBugs();
        const existingId = (idInput && idInput.value) || null;
        if (existingId) {
            const entry = entries.find((e) => e.id === existingId);
            if (!entry) {
                UI.showNotification('Entry not found.', 'error');
                return;
            }
            const isAdmin = Auth.isAdmin && Auth.isAdmin();
            if (entry.ownerId !== user.id && !isAdmin) {
                UI.showNotification('Only the author or an admin can edit.', 'error');
                return;
            }
            entry.header = header;
            entry.description = description;
            entry.updatedAt = new Date().toISOString();
            await DataManager.saveSuggestionsAndBugs(entries);
            UI.showNotification('Updated.');
            this.closeSuggestionsBugsModal();
        } else {
            const newEntry = {
                id: 'sb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
                header,
                description,
                ownerId: user.id,
                ownerName: user.username || user.name || 'Unknown',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                comments: []
            };
            entries.push(newEntry);
            await DataManager.saveSuggestionsAndBugs(entries);
            UI.showNotification('Submitted.');
            this.closeSuggestionsBugsModal();
        }
        await this.loadSuggestionsBugsView();
    },

    async deleteSuggestionsBugs(entryId) {
        if (!entryId || !DataManager || !DataManager.getSuggestionsAndBugs || !DataManager.saveSuggestionsAndBugs) return;
        const user = Auth && Auth.currentUser;
        if (!user) return;
        const isAdmin = Auth.isAdmin && Auth.isAdmin();
        const entries = await DataManager.getSuggestionsAndBugs();
        const entry = entries.find((e) => e.id === entryId);
        if (!entry) return;
        if (entry.ownerId !== user.id && !isAdmin) {
            UI.showNotification('Only the author or an admin can delete.', 'error');
            return;
        }
        if (!window.confirm('Delete this suggestion/bug? This cannot be undone.')) return;
        const filtered = entries.filter((e) => e.id !== entryId);
        await DataManager.saveSuggestionsAndBugs(filtered);
        UI.showNotification('Deleted.');
        this.loadSuggestionsBugsView();
    },

    async addSuggestionsBugsComment(entryId) {
        if (!entryId || !DataManager || !DataManager.getSuggestionsAndBugs || !DataManager.saveSuggestionsAndBugs) return;
        const user = Auth && Auth.currentUser;
        if (!user) {
            UI.showNotification('You must be logged in to comment.', 'error');
            return;
        }
        const card = Array.from(document.querySelectorAll('.suggestions-bugs-card')).find((el) => el.getAttribute('data-entry-id') === entryId);
        const input = card ? card.querySelector('.suggestions-bugs-comment-input') : null;
        const text = (input && input.value) ? input.value.trim() : '';
        if (!text) return;
        const entries = await DataManager.getSuggestionsAndBugs();
        const entry = entries.find((e) => e.id === entryId);
        if (!entry) return;
        if (!Array.isArray(entry.comments)) entry.comments = [];
        entry.comments.push({
            id: 'sbc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
            authorId: user.id,
            authorName: user.username || user.name || 'Unknown',
            text,
            createdAt: new Date().toISOString()
        });
        await DataManager.saveSuggestionsAndBugs(entries);
        if (input) input.value = '';
        await this.loadSuggestionsBugsView();
    },

    // Filter win/loss
    filterWinLoss() {
        const query = document.getElementById('winlossSearch').value.toLowerCase();
        const cards = document.querySelectorAll('.project-card');

        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? '' : 'none';
        });
    },

    // Load reports V2
    async loadReports() {
        try {
            const isYearMode = this.analyticsPeriodMode === 'year';
            const availablePeriods = isYearMode
                ? await DataManager.getAvailableActivityYears()
                : await DataManager.getAvailableActivityMonths();
            const today = new Date();
            const fallbackPeriod = isYearMode
                ? String(today.getFullYear())
                : today.toISOString().substring(0, 7);
            const periodOptions = availablePeriods.length ? [...availablePeriods] : [fallbackPeriod];

            let selectedPeriod =
                this.latestAnalytics.standardPeriod ||
                (isYearMode ? this.latestAnalytics.standardYear : this.latestAnalytics.standardMonth) ||
                (periodOptions.length ? periodOptions[periodOptions.length - 1] : fallbackPeriod);

            if (!periodOptions.includes(selectedPeriod)) {
                selectedPeriod = periodOptions.length ? periodOptions[periodOptions.length - 1] : fallbackPeriod;
            }
            if (!selectedPeriod) {
                selectedPeriod = fallbackPeriod;
            }

            // Use Reports V2
            const container = document.getElementById('reportsContent');
            if (typeof ReportsV2 !== 'undefined' && ReportsV2 && typeof ReportsV2.init === 'function') {
                console.log(`Loading Reports V2 for period: ${selectedPeriod}, type: ${isYearMode ? 'year' : 'month'}`);
                try {
                    ReportsV2.init(selectedPeriod, isYearMode ? 'year' : 'month');
                } catch (error) {
                    console.error('Error initializing ReportsV2:', error);
                    if (container) {
                        container.innerHTML = `<div class="error-message">Error loading reports: ${error.message}</div>`;
                    }
                }
                return;
            } else {
                console.error('ReportsV2 is not defined or init function missing. Check if reports-v2.js is loaded.');
                console.log('Available globals:', typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('Report')) : 'window not available');
                if (container) {
                    container.innerHTML = '<div class="error-message">Reports module not loaded. Please refresh the page.</div>';
                }
            }

            // Fallback to old reports (hidden)
            const reportsContainer = document.getElementById('reportsContent');
            if (!reportsContainer) {
                console.error('reportsContent container not found');
                return;
            }
            reportsContainer.innerHTML = '<div style="display:none;"><!-- Old reports hidden --></div>';
        } catch (error) {
            console.error('Error loading reports:', error);
            const errorContainer = document.getElementById('reportsContent');
            if (errorContainer) {
                errorContainer.innerHTML = UI.emptyState('Error loading reports');
            }
        }
    },

    setAnalyticsPeriodMode(mode = 'month', variant = 'standard') {
        const normalized = mode === 'year' ? 'year' : 'month';
        if (this.analyticsPeriodMode === normalized) {
            return;
        }
        this.analyticsPeriodMode = normalized;
        if (variant === 'card') {
            this.loadCardReportsView();
        } else {
            this.loadReports();
        }
    },

    handleReportPeriodInput(value, variant = 'standard') {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (variant === 'card') {
            this.handleCardReportMonthChange(normalized);
            return;
        }
        if (normalized) {
            this.latestAnalytics.standardPeriod = normalized;
            if (this.analyticsPeriodMode === 'year') {
                this.latestAnalytics.standardYear = normalized;
            } else {
                this.latestAnalytics.standardMonth = normalized;
            }
        }
        this.loadReports();
    },

    async shiftReportMonth(step = 1, variant = 'standard') {
        const isCard = variant === 'card';
        const isYearMode = !isCard && this.analyticsPeriodMode === 'year';
        const periods = isYearMode
            ? await DataManager.getAvailableActivityYears()
            : await DataManager.getAvailableActivityMonths();
        if (!periods.length) {
            return;
        }
        const normalizedStep = Number.isFinite(step) ? step : 1;
        const inputId = isCard ? 'cardReportMonth' : 'reportMonth';
        const input = document.getElementById(inputId);
        const storedValue = isCard
            ? this.latestAnalytics.cardMonth
            : (isYearMode
                ? (this.latestAnalytics.standardYear || this.latestAnalytics.standardPeriod)
                : (this.latestAnalytics.standardMonth || this.latestAnalytics.standardPeriod));
        let current = (input && input.value) || storedValue || periods[periods.length - 1];
        if (!periods.includes(current)) {
            current = periods[periods.length - 1];
        }
        let index = periods.indexOf(current) + normalizedStep;
        if (index < 0) index = 0;
        if (index >= periods.length) index = periods.length - 1;
        const nextPeriod = periods[index];
        if (input) {
            input.value = nextPeriod;
        }
        if (isCard) {
            this.handleCardReportMonthChange(nextPeriod);
        } else {
            if (isYearMode) {
                this.latestAnalytics.standardYear = nextPeriod;
            } else {
                this.latestAnalytics.standardMonth = nextPeriod;
            }
            this.latestAnalytics.standardPeriod = nextPeriod;
            this.loadReports();
        }
    },

    async exportReportsCsv() {
        try {
            if (!this.isFeatureEnabled('csvExport')) {
                UI.showNotification('CSV export is currently disabled by the administrator.', 'info');
                return;
            }

            if (!this.isDashboardVisible('reports')) {
                UI.showNotification(this.getAccessMessage('reports', 'visibility'), 'info');
                return;
            }

            const monthInput = document.getElementById('reportMonth') || document.getElementById('cardReportMonth');
            const fallbackMonth = new Date().toISOString().substring(0, 7);
            const selectedMonth = monthInput && monthInput.value ? monthInput.value : (this.latestAnalytics.standardMonth || fallbackMonth);

            const analytics = (this.latestAnalytics.standard && this.latestAnalytics.standardMonth === selectedMonth)
                ? this.latestAnalytics.standard
                : await DataManager.getMonthlyAnalytics(selectedMonth, this.reportFilters || {});

            if (!analytics) {
                UI.showNotification('No analytics data available to export.', 'error');
                return;
            }

            const rows = this.buildReportsCsvRows(analytics);

            const filename = `pams_reports_${selectedMonth}.csv`;
            this.downloadCsv(filename, rows);
            UI.showNotification('Report exported successfully.', 'success');
        } catch (error) {
            console.error('Error exporting reports:', error);
            UI.showNotification('Unable to export reports.', 'error');
        }
    },

    buildReportsCsvRows(analytics) {
        if (!analytics) return [];

        const rows = [];

        const periodLabel = analytics.periodType === 'year'
            ? `${analytics.periodValue || analytics.month} (Annual)`
            : DataManager.formatMonth(analytics.periodValue || analytics.month);

        rows.push(['Summary']);
        rows.push(['Period', periodLabel]);
        rows.push(['Total Activities', analytics.totalActivities]);
        rows.push(['Internal Activities', analytics.internalActivities]);
        rows.push(['External Activities', analytics.externalActivities]);
        rows.push(['Presales Users', analytics.totalPresalesUsers]);
        rows.push(['Target per Presales User', analytics.targetValue]);
        rows.push(['Team Target', analytics.teamTarget]);
        rows.push([]);

        rows.push(['User Activity Breakdown']);
        rows.push(['User', 'Total', 'External', 'Internal']);
        (analytics.userSummaries || []).forEach(summary => {
            rows.push([
                summary.userName || 'Unknown',
                summary.total || 0,
                summary.external || 0,
                summary.internal || 0
            ]);
        });
        rows.push([]);

        rows.push(['Activity Types']);
        rows.push(['Type', 'Count']);
        Object.entries(analytics.activityTypeCounts || {}).forEach(([type, count]) => {
            rows.push([type, count]);
        });
        rows.push([]);

        rows.push(['Industries']);
        rows.push(['Industry', 'Count']);
        Object.entries(analytics.industryCounts || {}).forEach(([industry, count]) => {
            rows.push([industry, count]);
        });
        rows.push([]);

        rows.push(['Products Discussed']);
        rows.push(['Product', 'Count']);
        Object.entries(analytics.productTotals || {}).forEach(([product, count]) => {
            rows.push([product, count]);
        });

        return rows;
    },

    async handleCardReportMonthChange(value) {
        const availableMonths = await DataManager.getAvailableActivityMonths();
        const fallbackMonth = new Date().toISOString().substring(0, 7);
        let selected = value || this.latestAnalytics.cardMonth || fallbackMonth;
        if (availableMonths.length && !availableMonths.includes(selected)) {
            selected = availableMonths[availableMonths.length - 1];
        }
        this.latestAnalytics.cardMonth = selected;
        this.latestAnalytics.standardPeriod = selected;
        const reportsView = document.getElementById('reportsView');
        if (reportsView) {
            reportsView.dataset.currentTab = 'reports';
        }
        const input = document.getElementById('cardReportMonth');
        if (input) {
            input.value = selected;
        }
        this.loadCardReportsView();
    },

    async handleWinLossCurrencyChange(value) {
        const currency = value || 'INR';
        const mrrInput = document.getElementById('winLossMRR');
        if (!mrrInput) return;

        const accountId = document.getElementById('winLossAccountId')?.value;
        let fx = null;
        if (accountId) {
            const account = await DataManager.getAccountById(accountId);
            const rep = account?.salesRep ? await DataManager.getGlobalSalesRepByName(account.salesRep) : null;
            if (rep && rep.currency === currency && Number.isFinite(rep.fxToInr) && rep.fxToInr > 0) {
                fx = rep.fxToInr;
            }
        }

        mrrInput.dataset.currency = currency;
        if (fx) {
            mrrInput.dataset.fx = String(fx);
        } else {
            delete mrrInput.dataset.fx;
        }
        this.updateWinLossMrrHelper();
    },

    async buildAnalyticsFilterBar(variant = 'standard', options = {}) {
        const { showIndustry = true, showChannel = true } = options;
        const [industries, channels] = await Promise.all([
            DataManager.getIndustries().then(list => (list || []).sort((a, b) => a.localeCompare(b))),
            this.getAvailableChannels()
        ]);
        const selectedIndustry = this.reportFilters.industry || '';
        const selectedChannel = this.reportFilters.channel || '';
        const handlerVariantArg = variant === 'card' ? "'card'" : "'standard'";
        const segments = [];

        if (showIndustry) {
            segments.push(`
                <div class="form-group">
                    <label class="form-label">Industry</label>
                    <select class="form-control" onchange="App.handleReportFilterChange('industry', this.value, ${handlerVariantArg})">
                        <option value="">All Industries</option>
                        ${industries.map(industry => `
                            <option value="${industry}" ${industry === selectedIndustry ? 'selected' : ''}>${industry}</option>
                        `).join('')}
                    </select>
                </div>
            `);
        }

        if (showChannel) {
            segments.push(`
                <div class="form-group">
                    <label class="form-label">Channel</label>
                    <select class="form-control" onchange="App.handleReportFilterChange('channel', this.value, ${handlerVariantArg})">
                        <option value="">All Channels</option>
                        ${channels.map(channel => `
                            <option value="${channel}" ${channel === selectedChannel ? 'selected' : ''}>${channel}</option>
                        `).join('')}
                    </select>
                </div>
            `);
        }

        segments.push(`
            <div class="form-group" style="align-self: flex-end;">
                <button class="btn btn-link" onclick="App.resetReportFilters('${variant}'); return false;">Reset Filters</button>
            </div>
        `);

        return `
            <div class="analytics-filter-bar">
                ${segments.join('')}
            </div>
        `;
    },

    handleReportFilterChange(key, value, variant = 'standard') {
        if (!['industry', 'channel'].includes(key)) return;
        this.reportFilters[key] = value || '';
        if (variant === 'card') {
            this.loadCardReportsView();
        } else {
            this.loadReports();
        }
    },

    resetReportFilters(variant = 'standard') {
        this.reportFilters.industry = '';
        this.reportFilters.channel = '';
        if (variant === 'card') {
            this.loadCardReportsView();
        } else {
            this.loadReports();
        }
    },

    buildAnalyticsTableBuilderMarkup() {
        return `
            <div class="card analytics-table-builder" id="analyticsTableBuilderCard">
                <div class="card-header">
                    <h3>Custom Analytics Table</h3>
                    <p class="text-muted">Pick a dataset, configure the columns you care about, then export or save the view.</p>
                </div>
                <div class="card-body">
                    <div id="analyticsTableBuilderControls" class="analytics-table-controls"></div>
                    <div id="analyticsTablePreview" class="analytics-table-preview table-responsive"></div>
                    <div id="analyticsTablePresetsPanel" class="analytics-table-presets"></div>
                </div>
            </div>
        `;
    },

    renderAnalyticsTableBuilder(analytics, context = {}) {
        const controlsRoot = document.getElementById('analyticsTableBuilderControls');
        const previewRoot = document.getElementById('analyticsTablePreview');
        const presetsRoot = document.getElementById('analyticsTablePresetsPanel');
        if (!controlsRoot || !previewRoot || !presetsRoot) {
            return;
        }
        if (!analytics) {
            controlsRoot.innerHTML = '<p class="text-muted">Analytics data will appear here once a period is loaded.</p>';
            previewRoot.innerHTML = '';
            presetsRoot.innerHTML = '';
            return;
        }

        const definitions = this.getAnalyticsTableDefinitions();
        const datasetKeys = Object.keys(definitions);
        if (!datasetKeys.length) {
            controlsRoot.innerHTML = '<p class="text-muted">No analytics datasets available.</p>';
            previewRoot.innerHTML = '';
            presetsRoot.innerHTML = '';
            return;
        }

        if (!datasetKeys.includes(this.analyticsTableState.dataset)) {
            this.analyticsTableState.dataset = datasetKeys[0];
            this.analyticsTableState.columns = [];
            this.analyticsTableState.rows = [];
        }

        const datasetDefinition = this.getAnalyticsTableDefinition(this.analyticsTableState.dataset);
        const selectedColumns = this.ensureAnalyticsTableColumns(this.analyticsTableState.dataset);

        controlsRoot.innerHTML = `
            <div class="analytics-table-control-grid">
                <div class="form-group">
                    <label class="form-label">Primary Dimension (X Axis)</label>
                    <select id="analyticsTableDataset" class="form-control" onchange="App.handleAnalyticsTableDatasetChange(this.value)">
                        ${datasetKeys.map(key => `
                            <option value="${key}" ${key === this.analyticsTableState.dataset ? 'selected' : ''}>
                                ${definitions[key].label}
                            </option>
                        `).join('')}
                    </select>
                    <small class="text-muted">${datasetDefinition.description || ''}</small>
                </div>
                <div class="form-group analytics-table-columns">
                    <label class="form-label">Metrics (Y Axis)</label>
                    <div class="analytics-columns-grid">
                        ${datasetDefinition.columns.map(column => `
                            <label class="checkbox">
                                <input type="checkbox"
                                       value="${column.key}"
                                       ${selectedColumns.includes(column.key) ? 'checked' : ''}
                                       onchange="App.handleAnalyticsTableColumnToggle('${column.key}', this.checked)">
                                <span>${column.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="analytics-table-actions">
                    <button class="btn btn-primary" onclick="App.generateAnalyticsTable()">Generate Table</button>
                    <button class="btn btn-outline" onclick="App.exportAnalyticsTableCsv()">Export CSV</button>
                    ${(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())
                ? '<button class="btn btn-secondary" onclick="App.saveAnalyticsTablePreset()">Save Preset</button>'
                : ''}
                </div>
            </div>
        `;

        this.renderAnalyticsTablePreview();
        this.renderAnalyticsTablePresets();
    },

    getAnalyticsTableDefinitions() {
        return this.analyticsTableDefinitions || {};
    },

    getAnalyticsTableDefinition(key) {
        const definitions = this.getAnalyticsTableDefinitions();
        return definitions && key ? definitions[key] || null : null;
    },

    ensureAnalyticsTableColumns(datasetKey) {
        const definition = this.getAnalyticsTableDefinition(datasetKey);
        if (!definition) {
            this.analyticsTableState.columns = [];
            return [];
        }
        const validKeys = definition.columns.map(column => column.key);
        const existing = Array.isArray(this.analyticsTableState.columns) ? this.analyticsTableState.columns : [];
        const filtered = existing.filter(key => validKeys.includes(key));
        if (filtered.length) {
            this.analyticsTableState.columns = filtered;
            if (!filtered.includes(this.analyticsTableState.sortBy)) {
                this.analyticsTableState.sortBy = filtered[0];
            }
            return filtered;
        }

        const defaults = definition.columns.filter(column => column.default).map(column => column.key);
        const fallback = defaults.length ? defaults : (validKeys.length ? [validKeys[0]] : []);
        this.analyticsTableState.columns = fallback;
        if (fallback.length) {
            this.analyticsTableState.sortBy = fallback[0];
        }
        return fallback;
    },

    handleAnalyticsTableDatasetChange(value) {
        const datasetKey = value || 'regionPerformance';
        this.analyticsTableState.dataset = datasetKey;
        this.analyticsTableState.columns = [];
        this.analyticsTableState.rows = [];
        this.analyticsTableState.sortBy = '';
        this.renderAnalyticsTableBuilder(this.latestAnalytics.standard || null);
    },

    handleAnalyticsTableColumnToggle(columnKey, isChecked) {
        const definition = this.getAnalyticsTableDefinition(this.analyticsTableState.dataset);
        if (!definition) return;
        const validKeys = definition.columns.map(column => column.key);
        if (!validKeys.includes(columnKey)) return;

        const selected = new Set(this.analyticsTableState.columns || []);
        if (isChecked) {
            selected.add(columnKey);
        } else {
            selected.delete(columnKey);
        }
        if (!selected.size) {
            const defaults = definition.columns.filter(column => column.default).map(column => column.key);
            const fallback = defaults.length ? defaults[0] : validKeys[0];
            if (fallback) {
                selected.add(fallback);
            }
        }
        this.analyticsTableState.columns = Array.from(selected);
        if (!this.analyticsTableState.columns.includes(this.analyticsTableState.sortBy)) {
            this.analyticsTableState.sortBy = this.analyticsTableState.columns[0] || '';
        }
        if (this.analyticsTableState.rows && this.analyticsTableState.rows.length) {
            this.renderAnalyticsTablePreview();
        }
    },

    handleAnalyticsTableSortChange(columnKey) {
        const definition = this.getAnalyticsTableDefinition(this.analyticsTableState.dataset);
        if (!definition) return;
        const validKeys = definition.columns.map(column => column.key);
        if (columnKey && !validKeys.includes(columnKey)) {
            return;
        }
        this.analyticsTableState.sortBy = columnKey || '';
        if (this.analyticsTableState.rows && this.analyticsTableState.rows.length) {
            this.renderAnalyticsTablePreview();
        }
    },

    generateAnalyticsTable() {
        const analytics = this.latestAnalytics.standard;
        if (!analytics) {
            UI.showNotification('Load analytics data first.', 'info');
            return;
        }
        const datasetKey = this.analyticsTableState.dataset;
        const rows = this.buildAnalyticsTableRows(datasetKey, analytics);
        const definition = this.getAnalyticsTableDefinition(datasetKey);
        if (!definition) {
            UI.showNotification('Unknown dataset.', 'error');
            return;
        }

        this.ensureAnalyticsTableColumns(datasetKey);
        this.analyticsTableState.rows = rows;
        this.analyticsTableState.generatedAt = new Date().toISOString();
        this.analyticsTableState.generatedFrom = {
            periodType: analytics.periodType || 'month',
            periodValue: analytics.periodValue || analytics.month || ''
        };

        this.renderAnalyticsTablePreview();
        if (!rows.length) {
            UI.showNotification('No data for the selected dataset and filters.', 'info');
        } else {
            UI.showNotification('Analytics table generated.', 'success');
        }
    },

    buildAnalyticsTableRows(datasetKey, analytics) {
        switch (datasetKey) {
            case 'regionPerformance':
                return (analytics.regionSummaries || []).map(entry => ({ ...entry }));
            case 'presalesPerformance':
                return (analytics.userSummaries || []).map(entry => ({
                    userName: entry.userName,
                    region: entry.region || '',
                    total: entry.total || 0,
                    external: entry.external || 0,
                    internal: entry.internal || 0,
                    wins: entry.wins || 0,
                    losses: entry.losses || 0
                }));
            case 'projectPipeline':
                return (analytics.projectSummaries || []).map(entry => ({
                    projectName: entry.projectName,
                    accountName: entry.accountName,
                    status: entry.status,
                    region: entry.region || '',
                    totalActivities: entry.totalActivities || 0,
                    externalActivities: entry.externalActivities || 0,
                    internalActivities: entry.internalActivities || 0,
                    wins: entry.wins || 0,
                    losses: entry.losses || 0,
                    lastActivityAt: entry.lastActivityAt || '',
                    ownerCount: entry.ownerCount || (Array.isArray(entry.ownerIds) ? entry.ownerIds.length : 0)
                }));
            case 'accountEngagement':
                return (analytics.accountSummaries || []).map(entry => ({
                    accountName: entry.accountName,
                    region: entry.region || '',
                    totalActivities: entry.totalActivities || 0,
                    externalActivities: entry.externalActivities || 0,
                    internalActivities: entry.internalActivities || 0,
                    totalProjects: entry.totalProjects || 0,
                    activeProjects: entry.activeProjects || 0,
                    wonProjects: entry.wonProjects || 0,
                    lostProjects: entry.lostProjects || 0,
                    lastActivityAt: entry.lastActivityAt || ''
                }));
            case 'activityTypeMix':
                return Object.entries(analytics.activityTypeCounts || {}).map(([type, count]) => ({
                    type,
                    count
                }));
            default:
                return [];
        }
    },

    renderAnalyticsTablePreview() {
        const previewRoot = document.getElementById('analyticsTablePreview');
        if (!previewRoot) {
            return;
        }
        const datasetKey = this.analyticsTableState.dataset;
        const definition = this.getAnalyticsTableDefinition(datasetKey);
        if (!definition) {
            previewRoot.innerHTML = '<p class="text-muted">Dataset not available.</p>';
            return;
        }
        const rows = this.analyticsTableState.rows || [];
        if (!rows.length) {
            previewRoot.innerHTML = '<p class="text-muted">Generate a table to see the results here.</p>';
            return;
        }
        const selectedKeys = this.ensureAnalyticsTableColumns(datasetKey);
        const columns = definition.columns.filter(column => selectedKeys.includes(column.key));
        if (!columns.length) {
            previewRoot.innerHTML = '<p class="text-muted">Select at least one column.</p>';
            return;
        }

        const headerMarkup = columns.map(column => `<th>${this.escapeHtml(column.label)}</th>`).join('');
        const bodyMarkup = rows.map(row => {
            const cells = columns.map(column => `<td>${this.normalizeAnalyticsTableValue(column.key, row[column.key])}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        previewRoot.innerHTML = `
            <table class="table table-striped table-sm">
                <thead><tr>${headerMarkup}</tr></thead>
                <tbody>${bodyMarkup}</tbody>
            </table>
        `;
    },

    normalizeAnalyticsTableValue(key, value) {
        if (value === null || value === undefined || value === '') {
            return '–';
        }
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value.toLocaleString() : '0';
        }
        if (key.toLowerCase().includes('date') || key === 'lastActivityAt') {
            if (typeof DataManager !== 'undefined' && typeof DataManager.formatDate === 'function') {
                return this.escapeHtml(DataManager.formatDate(value));
            }
            return this.escapeHtml(String(value));
        }
        return this.escapeHtml(String(value));
    },

    exportAnalyticsTableCsv() {
        const rows = this.analyticsTableState.rows || [];
        if (!rows.length) {
            UI.showNotification('Generate a table before exporting.', 'info');
            return;
        }
        const datasetKey = this.analyticsTableState.dataset;
        const definition = this.getAnalyticsTableDefinition(datasetKey);
        if (!definition) {
            UI.showNotification('Unknown dataset.', 'error');
            return;
        }
        const selectedKeys = this.ensureAnalyticsTableColumns(datasetKey);
        const columns = definition.columns.filter(column => selectedKeys.includes(column.key));
        if (!columns.length) {
            UI.showNotification('Select at least one column.', 'info');
            return;
        }

        const headerRow = columns.map(column => column.label);
        const dataRows = rows.map(row =>
            columns.map(column => {
                const value = row[column.key];
                if (value === null || value === undefined) return '';
                if (typeof value === 'number') {
                    return Number.isFinite(value) ? value : '';
                }
                if (column.key.toLowerCase().includes('date') || column.key === 'lastActivityAt') {
                    return typeof DataManager !== 'undefined' && typeof DataManager.formatDate === 'function'
                        ? DataManager.formatDate(value)
                        : String(value);
                }
                return String(value);
            })
        );

        const csvRows = [headerRow, ...dataRows];
        const periodFragment = (this.analyticsTableState.generatedFrom?.periodValue || '')
            .replace(/[^0-9a-z_-]/gi, '') || 'period';
        const filename = `analytics_table_${datasetKey}_${periodFragment}.csv`;
        this.downloadCsv(filename, csvRows);
        UI.showNotification('Analytics table exported.', 'success');
    },

    async saveAnalyticsTablePreset() {
        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only admins can save presets.', 'info');
            return;
        }
        const datasetKey = this.analyticsTableState.dataset;
        const columns = this.ensureAnalyticsTableColumns(datasetKey);
        if (!columns.length) {
            UI.showNotification('Select at least one column.', 'info');
            return;
        }
        const name = prompt('Preset name');
        if (!name || !name.trim()) {
            return;
        }
        const trimmedName = name.trim();
        const preset = {
            id: DataManager.generateId(),
            name: trimmedName,
            dataset: datasetKey,
            columns,
            createdAt: new Date().toISOString(),
            createdBy: Auth.getCurrentUser()?.username || 'Admin'
        };
        const updated = [
            ...this.savedAnalyticsTables.filter(item => item.id !== preset.id && item.name !== trimmedName),
            preset
        ];
        await DataManager.saveAnalyticsTablePresets(updated);
        this.savedAnalyticsTables = updated;
        this.renderAnalyticsTablePresets();
        UI.showNotification('Preset saved.', 'success');
    },

    renderAnalyticsTablePresets() {
        const panel = document.getElementById('analyticsTablePresetsPanel');
        if (!panel) {
            return;
        }
        if (!this.savedAnalyticsTables.length) {
            panel.innerHTML = '<p class="text-muted">No saved presets yet.</p>';
            return;
        }
        const presetItems = this.savedAnalyticsTables
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(preset => {
                const applyButton = `<button class="btn btn-link btn-sm" onclick="App.applyAnalyticsTablePreset('${preset.id}')">${this.escapeHtml(preset.name)}</button>`;
                const deleteButton = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())
                    ? `<button class="btn btn-link btn-sm text-danger" onclick="App.deleteAnalyticsTablePreset('${preset.id}')">Delete</button>`
                    : '';
                const meta = preset.createdAt
                    ? `<span class="preset-meta text-muted">Saved ${DataManager.formatDate ? DataManager.formatDate(preset.createdAt) : preset.createdAt}</span>`
                    : '';
                return `<li>${applyButton}${deleteButton}${meta}</li>`;
            }).join('');

        panel.innerHTML = `
            <div class="analytics-presets-header">
                <h4>Saved Presets</h4>
            </div>
            <ul class="analytics-presets-list">
                ${presetItems}
            </ul>
        `;
    },

    applyAnalyticsTablePreset(id) {
        const preset = this.savedAnalyticsTables.find(item => item.id === id);
        if (!preset) return;
        this.analyticsTableState.dataset = preset.dataset;
        this.analyticsTableState.columns = Array.isArray(preset.columns) ? [...preset.columns] : [];
        this.analyticsTableState.rows = [];
        this.renderAnalyticsTableBuilder(this.latestAnalytics.standard || null);
        UI.showNotification(`Preset "${preset.name}" loaded.`, 'success');
    },

    async deleteAnalyticsTablePreset(id) {
        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only admins can delete presets.', 'info');
            return;
        }
        this.savedAnalyticsTables = this.savedAnalyticsTables.filter(item => item.id !== id);
        await DataManager.saveAnalyticsTablePresets(this.savedAnalyticsTables);
        this.renderAnalyticsTablePresets();
        UI.showNotification('Preset deleted.', 'success');
    },

    async getAvailableChannels() {
        const accounts = await DataManager.getAccounts();
        const channelsSet = new Set();
        accounts.forEach(account => {
            account.projects?.forEach(project => {
                (project.channels || []).forEach(channel => {
                    if (channel && typeof channel === 'string') {
                        channelsSet.add(channel.trim());
                    }
                });
            });
        });
        return Array.from(channelsSet).filter(Boolean).sort((a, b) => a.localeCompare(b));
    },

    async getActiveUsers() {
        try {
            const users = await DataManager.getUsers();
            return users
                .filter(user => user && user.isActive !== false)
                .sort((a, b) => (a.username || '').localeCompare(b.username || ''));
        } catch (error) {
            console.warn('Unable to load users for owner filters:', error);
            return [];
        }
    },

    getDefaultActivityOwnerFilter() {
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        if (isAdmin) {
            return 'all';
        }
        return currentUser?.id || 'mine';
    },

    getDefaultRecordOwnerFilter() {
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        if (isAdmin) {
            return 'all';
        }
        return currentUser?.id || 'mine';
    },

    resolveOwnerFilterValue(filterValue, currentUser) {
        if (!filterValue || filterValue === 'all') {
            return 'all';
        }
        if (filterValue === 'mine') {
            return currentUser?.id || '';
        }
        return filterValue;
    },

    async getProjectOwnerMap() {
        const ownerMap = new Map();
        try {
            const [accounts, activities] = await Promise.all([
                DataManager.getAccounts(),
                DataManager.getAllActivities()
            ]);
            accounts.forEach(account => {
                account.projects?.forEach(project => {
                    if (!project?.id) return;
                    if (!ownerMap.has(project.id)) {
                        ownerMap.set(project.id, new Set());
                    }
                    const owners = ownerMap.get(project.id);
                    if (project.createdBy) {
                        owners.add(project.createdBy);
                    }
                    if (account.createdBy) {
                        owners.add(account.createdBy);
                    }
                });
            });

            activities.forEach(activity => {
                if (!activity?.projectId || !activity?.userId) return;
                if (!ownerMap.has(activity.projectId)) {
                    ownerMap.set(activity.projectId, new Set());
                }
                ownerMap.get(activity.projectId).add(activity.userId);
            });
        } catch (error) {
            console.warn('Unable to compute project owner map:', error);
        }
        return ownerMap;
    },

    async populateActivityFilterControls() {
        const industries = (await DataManager.getIndustries()).sort((a, b) => a.localeCompare(b));
        const regions = (await DataManager.getRegions()).sort((a, b) => a.localeCompare(b));
        const activityTypes = ['customerCall', 'sow', 'poc', 'rfx', 'pricing', 'other'];
        const timeframeOptions = [
            { value: 'all', label: 'All Time' },
            { value: 'thisMonth', label: 'This Month' },
            { value: 'lastMonth', label: 'Last Month' },
            { value: 'thisWeek', label: 'This Week' },
            { value: 'custom', label: 'Custom Range' }
        ];

        // Populate Type filter
        const typeSelect = document.getElementById('activityFilterType');
        if (typeSelect) {
            typeSelect.value = this.activityFilters.type || 'all';
        }

        const cardTypeSelect = document.getElementById('cardActivityFilterType');
        if (cardTypeSelect) {
            cardTypeSelect.value = this.activityFilters.type || 'all';
        }

        // Populate Industry filter
        const industrySelect = document.getElementById('activityFilterIndustry');
        if (industrySelect) {
            industrySelect.innerHTML = '<option value="all">All Industries</option>' +
                industries.map(i => `<option value="${i}">${i}</option>`).join('');
            industrySelect.value = this.activityFilters.industry || 'all';
        }

        const cardIndustrySelect = document.getElementById('cardActivityFilterIndustry');
        if (cardIndustrySelect) {
            cardIndustrySelect.innerHTML = '<option value="">All Industries</option>' +
                industries.map(i => `<option value="${i}">${i}</option>`).join('');
            cardIndustrySelect.value = this.activityFilters.industry || '';
        }

        // Populate Region filter
        const regionSelect = document.getElementById('activityFilterRegion');
        if (regionSelect) {
            regionSelect.innerHTML = '<option value="all">All Regions</option>' +
                regions.map(r => `<option value="${r}">${r}</option>`).join('');
            regionSelect.value = this.activityFilters.region || 'all';
        }

        // Populate Activity Type filter (sidebar) – id is activityFilterActivityType
        const activityTypeSelect = document.getElementById('activityFilterActivityType');
        if (activityTypeSelect) {
            activityTypeSelect.innerHTML = '<option value="all">All Types</option>' +
                activityTypes.map(t => `<option value="${t}">${UI.getActivityTypeLabel(t)}</option>`).join('');
            activityTypeSelect.value = this.activityFilters.activityType || 'all';
        }

        // Populate Channel filter (legacy / other views)
        const channelSelect = document.getElementById('activityFilterChannel');
        if (channelSelect) {
            channelSelect.innerHTML = '<option value="all">All Channels</option>' +
                activityTypes.map(t => `<option value="${t}">${UI.getActivityTypeLabel(t)}</option>`).join('');
            channelSelect.value = this.activityFilters.activityType || 'all';
        }

        const cardChannelSelect = document.getElementById('cardActivityFilterChannel');
        if (cardChannelSelect) {
            cardChannelSelect.innerHTML = '<option value="">All Channels</option>' +
                activityTypes.map(t => `<option value="${t}">${UI.getActivityTypeLabel(t)}</option>`).join('');
            cardChannelSelect.value = this.activityFilters.activityType || '';
        }

        // Populate Timeframe filter
        const timeframeSelect = document.getElementById('activityFilterTimeframe');
        if (timeframeSelect) {
            timeframeSelect.innerHTML = timeframeOptions.map(o => `<option value="${o.value}" ${o.value === (this.activityFilters.timeframe || 'all') ? 'selected' : ''}>
                    ${o.label}
                </option>`).join('');
            this.toggleCustomDateRange();
        }

        const cardTimeframeSelect = document.getElementById('cardActivityFilterTimeframe');
        if (cardTimeframeSelect) {
            cardTimeframeSelect.innerHTML = timeframeOptions.map(o => `<option value="${o.value}" ${o.value === (this.activityFilters.timeframe || 'all') ? 'selected' : ''}>
                    ${o.label}
                </option>`).join('');
            cardTimeframeSelect.value = this.activityFilters.timeframe || 'all';
        }

        // Populate Date inputs
        const dateFromInput = document.getElementById('activityFilterDateFrom');
        if (dateFromInput) {
            dateFromInput.value = this.activityFilters.dateFrom || '';
        }
        const dateToInput = document.getElementById('activityFilterDateTo');
        if (dateToInput) {
            dateToInput.value = this.activityFilters.dateTo || '';
        }

        // Populate Owner filter
        const ownerSelect = document.getElementById('activityFilterOwner');
        const cardOwnerSelect = document.getElementById('cardActivityFilterOwner');

        if (ownerSelect || cardOwnerSelect) {
            const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
            const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
                ? Auth.getCurrentUser()
                : null;
            const users = await this.getActiveUsers();
            const options = [];

            if (currentUser) {
                const currentUserValue = currentUser.id || 'mine';
                options.push({ value: currentUserValue, label: 'My activities' });
            }

            if (isAdmin) {
                options.unshift({ value: 'all', label: 'All activities' });
            } else {
                options.push({ value: 'all', label: 'All team activities' });
            }

            if (isAdmin) {
                users.forEach(user => {
                    options.push({ value: user.id, label: user.username });
                });
            }

            const uniqueOptions = [];
            const seenValues = new Set();
            options.forEach(option => {
                if (!option?.value) return;
                if (seenValues.has(option.value)) return;
                seenValues.add(option.value);
                uniqueOptions.push(option);
            });

            const ownerOptionsHtml = uniqueOptions
                .map(option => `<option value="${option.value}">${option.label}</option>`)
                .join('');

            if (ownerSelect) {
                ownerSelect.innerHTML = ownerOptionsHtml;
                const desiredValue = this.activityFilters.owner || this.getDefaultActivityOwnerFilter();
                if (ownerSelect.querySelector(`option[value="${desiredValue}"]`)) {
                    ownerSelect.value = desiredValue;
                } else if (currentUser?.id && ownerSelect.querySelector(`option[value="${currentUser.id}"]`)) {
                    ownerSelect.value = currentUser.id;
                    this.activityFilters.owner = currentUser.id;
                } else if (ownerSelect.querySelector('option[value="all"]')) {
                    ownerSelect.value = 'all';
                    this.activityFilters.owner = 'all';
                }
            }

            if (cardOwnerSelect) {
                cardOwnerSelect.innerHTML = ownerOptionsHtml;
                const desiredValue = this.activityFilters.owner || this.getDefaultActivityOwnerFilter();
                if (cardOwnerSelect.querySelector(`option[value="${desiredValue}"]`)) {
                    cardOwnerSelect.value = desiredValue;
                } else if (currentUser?.id && cardOwnerSelect.querySelector(`option[value="${currentUser.id}"]`)) {
                    cardOwnerSelect.value = currentUser.id;
                    this.activityFilters.owner = currentUser.id;
                } else if (cardOwnerSelect.querySelector('option[value="all"]')) {
                    cardOwnerSelect.value = 'all';
                    this.activityFilters.owner = 'all';
                }
            }
        }

        // Populate search
        const searchInput = document.getElementById('activitySearch');
        if (searchInput && searchInput.value !== this.activityFilters.search) {
            searchInput.value = this.activityFilters.search || '';
        }

        // Populate sort
        const sortSelect = document.getElementById('activitySortBy');
        if (sortSelect) {
            sortSelect.value = this.activitySortBy || 'dateDesc';
        }
    },

    toggleCustomDateRange() {
        const timeframeSelect = document.getElementById('activityFilterTimeframe');
        const customRangeDiv = document.getElementById('activityCustomDateRange');
        if (timeframeSelect && customRangeDiv) {
            if (timeframeSelect.value === 'custom') {
                customRangeDiv.style.display = 'block';
            } else {
                customRangeDiv.style.display = 'none';
            }
        }
    },

    async applyActivityFilters(activities = []) {
        const list = Array.isArray(activities) ? activities : [];
        const filters = this.activityFilters || {};
        const searchTerm = (filters.search || '').toLowerCase().trim();
        const typeFilter = filters.type || 'all';
        const industryFilter = (filters.industry || '').toLowerCase();
        const regionFilter = (filters.region || '').toLowerCase();
        const activityTypeFilter = (filters.activityType || '').toLowerCase();
        const timeframe = filters.timeframe || 'all';
        const dateFrom = filters.dateFrom || '';
        const dateTo = filters.dateTo || '';
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const ownerFilterRaw = filters.owner || this.getDefaultActivityOwnerFilter();
        const ownerFilterValue = this.resolveOwnerFilterValue(ownerFilterRaw, currentUser);

        const accounts = await DataManager.getAccounts();
        const accountMap = {};
        accounts.forEach(account => {
            accountMap[account.id] = account;
        });

        const users = await DataManager.getUsers();
        const userMap = new Map();
        users.forEach(u => {
            if (u && u.id) userMap.set(u.id, u);
        });

        const now = new Date();

        return list.filter(activity => {
            // Type filter (Internal/External)
            if (typeFilter !== 'all') {
                if (typeFilter === 'internal' && !activity.isInternal) return false;
                if (typeFilter === 'external' && activity.isInternal) return false;
            }

            // Activity type filter (skip when 'all' or empty)
            if (activityTypeFilter && activityTypeFilter !== 'all') {
                const activityType = (activity.type || '').toLowerCase();
                if (activityType !== activityTypeFilter) return false;
            }

            // Date range filter: use only user-given activity date (monthOfActivity / date) for month; custom uses date when set
            const activityMonthKey = DataManager.resolveActivityMonth && DataManager.resolveActivityMonth(activity);
            const activityDate = new Date(activity.date || activity.createdAt);
            if (!Number.isNaN(activityDate.getTime()) || activityMonthKey) {
                if (timeframe === 'thisMonth') {
                    const monthKey = activityMonthKey || (activity.date || '').substring(0, 7);
                    const currentMonth = now.toISOString().substring(0, 7);
                    if (monthKey !== currentMonth) return false;
                } else if (timeframe === 'lastMonth') {
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const monthKey = activityMonthKey || (activity.date || '').substring(0, 7);
                    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
                    if (monthKey !== lastMonthKey) return false;
                } else if (timeframe === 'thisWeek') {
                    const weekStart = new Date(now);
                    const dayOfWeek = now.getDay();
                    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    weekStart.setDate(diff);
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);
                    if (activityDate < weekStart || activityDate > weekEnd) return false;
                } else if (timeframe === 'custom' && (dateFrom || dateTo)) {
                    if (dateFrom) {
                        const fromDate = new Date(dateFrom);
                        fromDate.setHours(0, 0, 0, 0);
                        if (activityDate < fromDate) return false;
                    }
                    if (dateTo) {
                        const toDate = new Date(dateTo);
                        toDate.setHours(23, 59, 59, 999);
                        if (activityDate > toDate) return false;
                    }
                } else if (timeframe !== 'all') {
                    // Legacy timeframe support
                    const diffDays = (now - activityDate) / (1000 * 60 * 60 * 24);
                    if (timeframe === 'month') {
                        const monthKey = activityMonthKey || (activity.date || '').substring(0, 7);
                        const currentMonth = now.toISOString().substring(0, 7);
                        if (monthKey !== currentMonth) return false;
                    } else if (timeframe === '30' && diffDays > 30) {
                        return false;
                    } else if (timeframe === '90' && diffDays > 90) {
                        return false;
                    } else if (timeframe === '365' && diffDays > 365) {
                        return false;
                    }
                }
            }

            // Industry filter (skip when 'all' or empty)
            if (industryFilter && industryFilter !== 'all') {
                if (activity.isInternal) return false;
                const industry = (activity.industry || accountMap[activity.accountId]?.industry || '').toLowerCase();
                if (!industry || industry !== industryFilter) return false;
            }

            // Region filter (skip when 'all' or empty; use pre-built userMap so we don't call async getUserById in filter)
            if (regionFilter && regionFilter !== 'all') {
                const account = accountMap[activity.accountId];
                const user = userMap.get(activity.userId) || userMap.get(activity.createdBy) || null;
                const region = (DataManager.resolveActivityRegion && DataManager.resolveActivityRegion(activity, account, user)) || '';
                if ((region || '').toLowerCase() !== regionFilter) return false;
            }

            // Search filter
            if (searchTerm) {
                const haystack = [
                    activity.accountName,
                    activity.projectName,
                    activity.userName,
                    UI.getActivityTypeLabel(activity.type),
                    activity.details?.description,
                    activity.activityName,
                    activity.topic,
                    activity.summary
                ].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(searchTerm)) return false;
            }

            // Owner filter: match userId or createdBy (activities may use either); normalize to string for comparison
            const isOwnedBy = (ownerId) => {
                if (!ownerId) return false;
                const id = String(ownerId);
                return (activity.userId != null && String(activity.userId) === id) || (activity.createdBy != null && String(activity.createdBy) === id);
            };
            if (ownerFilterValue !== 'all') {
                const targetOwnerId = ownerFilterValue === 'mine' ? currentUser?.id : ownerFilterValue;
                if (!isOwnedBy(targetOwnerId)) {
                    return false;
                }
            } else if (!isAdmin && currentUser?.id && ownerFilterRaw === 'mine') {
                if (!isOwnedBy(currentUser.id)) {
                    return false;
                }
            }

            return true;
        });
    },

    async handleActivitySearch(value, variant = 'standard') {
        this.activityFilters.search = value || '';
        await this.renderActivitiesList();
        if (InterfaceManager.getCurrentInterface() === 'card' || variant === 'card') {
            await this.loadCardActivitiesView();
        }
    },

    async handleActivityFiltersChange(variant = 'standard') {
        if (variant === 'card') {
            // Legacy card view filters (keep for compatibility)
            const channelId = 'cardActivityFilterChannel';
            const industryId = 'cardActivityFilterIndustry';
            const timeframeId = 'cardActivityFilterTimeframe';
            const ownerId = 'cardActivityFilterOwner';
            const channelSelect = document.getElementById(channelId);
            const industrySelect = document.getElementById(industryId);
            const timeframeSelect = document.getElementById(timeframeId);
            const ownerSelect = document.getElementById(ownerId);
            this.activityFilters.channel = channelSelect ? channelSelect.value : '';
            this.activityFilters.industry = industrySelect ? industrySelect.value : '';
            this.activityFilters.timeframe = timeframeSelect ? timeframeSelect.value || 'all' : 'all';
            if (ownerSelect) {
                const selectedOwner = ownerSelect.value;
                this.activityFilters.owner = selectedOwner || this.getDefaultActivityOwnerFilter();
            }
            await this.loadCardActivitiesView();
        } else {
            // New sidebar filters
            const typeSelect = document.getElementById('activityFilterType');
            const industrySelect = document.getElementById('activityFilterIndustry');
            const regionSelect = document.getElementById('activityFilterRegion');
            const activityTypeSelect = document.getElementById('activityFilterActivityType');
            const timeframeSelect = document.getElementById('activityFilterTimeframe');
            const dateFromInput = document.getElementById('activityFilterDateFrom');
            const dateToInput = document.getElementById('activityFilterDateTo');
            const ownerSelect = document.getElementById('activityFilterOwner');

            if (typeSelect) this.activityFilters.type = typeSelect.value || 'all';
            if (industrySelect) this.activityFilters.industry = industrySelect.value || '';
            if (regionSelect) this.activityFilters.region = regionSelect.value || '';
            if (activityTypeSelect) this.activityFilters.activityType = activityTypeSelect.value || '';
            if (timeframeSelect) {
                this.activityFilters.timeframe = timeframeSelect.value || 'all';
                this.toggleCustomDateRange();
            }
            if (dateFromInput) this.activityFilters.dateFrom = dateFromInput.value || '';
            if (dateToInput) this.activityFilters.dateTo = dateToInput.value || '';
            if (ownerSelect) {
                const selectedOwner = ownerSelect.value;
                this.activityFilters.owner = selectedOwner || this.getDefaultActivityOwnerFilter();
            }
            await this.renderActivitiesList();
        }
    },

    async resetActivityFilters() {
        this.activityFilters = {
            search: '',
            industry: '',
            channel: '',
            timeframe: 'all',
            owner: this.getDefaultActivityOwnerFilter()
        };
        const searchInput = document.getElementById('activitySearch');
        if (searchInput) searchInput.value = '';
        const cardSearch = document.getElementById('cardActivitySearch');
        if (cardSearch) cardSearch.value = '';
        await this.populateActivityFilterControls();
        await this.renderActivitiesList();
        if (InterfaceManager.getCurrentInterface() === 'card') {
            await this.loadCardActivitiesView();
        }
    },

    setPendingDuplicateAlerts(rows = []) {
        this.pendingDuplicateAlerts = rows.map(row => ({
            source: 'import',
            accountName: row.payload?.accountName || row.payload?.account || 'Unknown Account',
            projectName: row.payload?.projectName || row.payload?.project || 'Unknown Project',
            date: row.payload?.date || '',
            activityType: row.payload?.activityType || row.category || '',
            count: 2 // minimum duplicate pair
        }));
    },

    clearPendingDuplicateAlerts() {
        this.pendingDuplicateAlerts = [];
    },

    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/[&<>"']/g, (char) => {
            switch (char) {
                case '&':
                    return '&amp;';
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '"':
                    return '&quot;';
                case '\'':
                    return '&#39;';
                default:
                    return char;
            }
        });
    },

    downloadCsv(filename, rows) {
        const csvContent = this.toCsv(rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    toCsv(rows = []) {
        if (!Array.isArray(rows)) return '';
        return rows.map(row => {
            const normalizedRow = Array.isArray(row) ? row : [row];
            return normalizedRow.map(value => {
                if (value === null || value === undefined) return '';
                const text = String(value);
                return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
            }).join(',');
        }).join('\r\n');
    },

    formatCurrencyValue(value, currencyCode = 'INR', options = {}) {
        if (value === null || value === undefined || value === '') return '';
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return String(value);
        const symbol = this.CURRENCY_SYMBOLS[currencyCode] || (currencyCode === 'BRL' ? 'R$' : '');
        const formatted = numericValue.toLocaleString(undefined, {
            minimumFractionDigits: options.minimumFractionDigits ?? 2,
            maximumFractionDigits: options.maximumFractionDigits ?? 2
        });
        return symbol ? `${symbol}${formatted}` : `${currencyCode} ${formatted}`;
    },

    formatWinLossAmount(winLossData) {
        if (!winLossData) return '';
        const currency = winLossData.currency || 'INR';
        const primary = this.formatCurrencyValue(winLossData.mrr !== undefined ? winLossData.mrr : winLossData.mrrValue, currency);
        if (!primary) return '';
        if (currency !== 'INR' && winLossData.mrrInInr) {
            const converted = this.formatCurrencyValue(winLossData.mrrInInr, 'INR');
            return converted ? `${primary} (${converted})` : primary;
        }
        return primary;
    },

    updateWinLossMrrHelper() {
        const input = document.getElementById('winLossMRR');
        const helper = document.getElementById('winLossMrrHelper');
        const label = document.getElementById('winLossMrrLabel');

        if (!input || !helper || !label) return;

        const currency = input.dataset.currency || 'INR';
        const fx = parseFloat(input.dataset.fx || '');

        label.textContent = `MRR (${currency})`;

        const rawValue = input.value ? input.value.trim() : '';
        if (!rawValue) {
            if (currency === 'INR') {
                helper.textContent = 'Enter the deal value in INR.';
            } else if (!Number.isNaN(fx) && fx) {
                helper.textContent = `Enter the amount in ${currency}. We will also store the INR equivalent using ${fx}.`;
            } else {
                helper.textContent = `Enter the amount in ${currency}.`;
            }
            return;
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            helper.textContent = `Enter a numeric amount in ${currency}.`;
            return;
        }

        const primary = this.formatCurrencyValue(numericValue, currency);
        if (currency !== 'INR' && !Number.isNaN(fx) && fx) {
            const converted = this.formatCurrencyValue(numericValue * fx, 'INR');
            helper.textContent = `${primary} ≈ ${converted}`;
        } else {
            helper.textContent = primary;
        }
    },

    async getExistingDuplicateActivities(activities = []) {
        const map = {};
        activities.forEach(activity => {
            if (!activity) return;
            if (activity.isInternal) return;
            const accountKey = (activity.accountName || '').toLowerCase();
            const projectKey = (activity.projectName || '').toLowerCase();
            const dateKey = (activity.date || activity.createdAt || '').substring(0, 10);
            const typeKey = activity.type || '';
            const summaryKey = (activity.summary || '').trim().toLowerCase();
            const userKey = (
                activity.assignedUserEmail ||
                activity.userId ||
                activity.userName ||
                ''
            ).toLowerCase();
            const key = `${accountKey}|${projectKey}|${dateKey}|${typeKey}|${summaryKey}|${userKey}|${activity.isInternal ? 'internal' : 'external'}`;
            if (!map[key]) {
                map[key] = {
                    source: 'existing',
                    accountName: activity.accountName || 'Unknown Account',
                    projectName: activity.projectName || (activity.isInternal ? 'Internal Activity' : 'Unknown Project'),
                    date: dateKey,
                    activityType: typeKey,
                    summary: summaryKey ? activity.summary : '',
                    owner: userKey ? (activity.userName || activity.assignedUserEmail || activity.userId) : '',
                    count: 0
                };
            }
            map[key].count += 1;
        });
        return Object.values(map).filter(entry => entry.count > 1);
    },

    async computeProjectHealthData() {
        const [accounts, activities, users, ownerMap] = await Promise.all([
            DataManager.getAccounts(),
            DataManager.getAllActivities(),
            DataManager.getUsers(),
            this.getProjectOwnerMap()
        ]);
        const userLookup = new Map(users.map(user => [user.id, user]));
        const projectActivityMap = {};
        const dayMs = 1000 * 60 * 60 * 24;

        activities.forEach(activity => {
            if (activity.isInternal || !activity.projectId) return;
            const entry = projectActivityMap[activity.projectId] || { count: 0, lastDate: null };
            entry.count += 1;
            const activityDate = activity.date || activity.createdAt;
            if (activityDate && (!entry.lastDate || activityDate > entry.lastDate)) {
                entry.lastDate = activityDate;
            }
            projectActivityMap[activity.projectId] = entry;
        });

        const now = new Date();
        const projects = [];

        accounts.forEach(account => {
            (account.projects || []).forEach(project => {
                if (project?.isMigrated && (project.status || 'inactive') === 'inactive') {
                    return;
                }
                const stats = projectActivityMap[project.id] || { count: 0, lastDate: null };
                const lastDateString = stats.lastDate || project.updatedAt || null;
                const lastDate = lastDateString ? new Date(lastDateString) : null;
                const daysSinceActivity = lastDate ? Math.round((now - lastDate) / dayMs) : null;
                const createdString = project.createdAt || account.createdAt || null;
                const createdDate = createdString ? new Date(createdString) : null;
                const daysSinceCreation = createdDate ? Math.round((now - createdDate) / dayMs) : null;
                const sfdcLink = project.sfdcLink || '';
                const sfdcMissing = !sfdcLink || !/^https?:\/\//i.test(sfdcLink.trim());
                const ownerIdsSet = new Set(ownerMap.get(project.id) || []);
                if (project.createdBy) {
                    ownerIdsSet.add(project.createdBy);
                }
                if (account.createdBy) {
                    ownerIdsSet.add(account.createdBy);
                }
                if (project.winLossData?.wonByUserId) {
                    ownerIdsSet.add(project.winLossData.wonByUserId);
                }
                const ownerIds = Array.from(ownerIdsSet);
                const ownerNames = ownerIds
                    .map(id => userLookup.get(id)?.username)
                    .filter(Boolean);
                const primaryOwnerId = project.createdBy || ownerIds[0] || account.createdBy || null;
                const primaryOwnerName =
                    (primaryOwnerId && userLookup.get(primaryOwnerId)?.username) ||
                    ownerNames[0] ||
                    account.salesRep ||
                    'Unassigned';

                projects.push({
                    accountId: account.id,
                    accountName: account.name,
                    projectId: project.id,
                    projectName: project.name,
                    industry: account.industry || 'Unspecified',
                    salesRep: account.salesRep || '',
                    status: project.status || 'active',
                    activityCount: stats.count,
                    lastActivityDate: lastDateString,
                    daysSinceActivity,
                    createdAt: createdString,
                    daysSinceCreation,
                    sfdcLink: sfdcLink.trim(),
                    sfdcMissing,
                    ownerIds,
                    ownerNames,
                    primaryOwnerId,
                    primaryOwnerName
                });
            });
        });

        return projects;
    },

    getFilteredProjectHealthProjects(projects) {
        const threshold = Number(this.projectHealthFilters.threshold) || 60;
        const statusFilter = this.projectHealthFilters.status || 'all';
        const includeNoActivity = this.projectHealthFilters.includeNoActivity !== false;
        const mediumThreshold = Math.max(15, Math.floor(threshold * 0.6));

        const derived = projects.map(project => {
            let risk = 'low';
            if (!project.activityCount) {
                risk = 'no-activity';
            } else if (project.daysSinceActivity != null) {
                if (project.daysSinceActivity >= threshold) {
                    risk = 'high';
                } else if (project.daysSinceActivity >= mediumThreshold) {
                    risk = 'medium';
                }
            }
            return { ...project, risk };
        });

        const filtered = derived.filter(project => {
            if (project.risk === 'no-activity') {
                if (!includeNoActivity) return false;
                return statusFilter === 'all' || statusFilter === 'no-activity';
            }
            if (project.risk === 'high') {
                return statusFilter === 'all' || statusFilter === 'high';
            }
            if (project.risk === 'medium') {
                return statusFilter === 'all' || statusFilter === 'medium';
            }
            return false;
        });

        const activeProjects = derived.filter(project => project.activityCount > 0 && project.daysSinceActivity != null);
        const averageDays = activeProjects.length
            ? (activeProjects.reduce((sum, project) => sum + project.daysSinceActivity, 0) / activeProjects.length).toFixed(1)
            : '0';
        const oldestProject = activeProjects.reduce((acc, project) => {
            if (!acc || project.daysSinceActivity > acc.daysSinceActivity) {
                return project;
            }
            return acc;
        }, null);

        const summary = {
            total: projects.length,
            withActivity: derived.filter(project => project.activityCount > 0).length,
            noActivity: derived.filter(project => !project.activityCount).length,
            highRisk: derived.filter(project => project.risk === 'high').length,
            mediumRisk: derived.filter(project => project.risk === 'medium').length,
            attentionCount: filtered.length,
            averageDays,
            threshold,
            oldestProjectDays: oldestProject ? oldestProject.daysSinceActivity : null
        };

        return { projects: filtered, summary };
    },

    buildProjectHealthMarkup(projects, summary, variant = 'standard') {
        const wrapperClass = variant === 'card' ? 'content-card' : 'card';
        const headerClass = variant === 'card' ? 'content-card-header' : 'card-header';
        const bodyClass = variant === 'card' ? 'card-body' : 'card-body';
        const activeFilters = this.projectHealthFilters || {
            threshold: 60,
            status: 'all',
            includeNoActivity: true
        };
        const statusLabel = (() => {
            switch (activeFilters.status) {
                case 'high':
                    return 'High risk only';
                case 'medium':
                    return 'Medium risk only';
                case 'no-activity':
                    return 'Projects with no activity';
                default:
                    return 'High & Medium risk';
            }
        })();
        const filtersSummaryMarkup = `
            <div class="project-health-filter-summary">
                <p><strong>Current threshold:</strong> ${activeFilters.threshold} days</p>
                <p><strong>Risk focus:</strong> ${statusLabel}</p>
                <p><strong>Include projects with no activity:</strong> ${activeFilters.includeNoActivity !== false ? 'Yes' : 'No'}</p>
                <p class="text-muted" style="margin-top: 0.5rem;">Adjust these settings under <strong>Admin &amp; Settings → Project Health Filters</strong>.</p>
            </div>
        `;

        const statsMarkup = `
            <div class="stats-grid analytics-stats">
                <div class="stat-card">
                    <h4>Total Projects</h4>
                    <div class="stat-value">${summary.total}</div>
                </div>
                <div class="stat-card">
                    <h4>High Risk</h4>
                    <div class="stat-value text-danger">${summary.highRisk}</div>
                </div>
                <div class="stat-card">
                    <h4>Medium Risk</h4>
                    <div class="stat-value text-warning">${summary.mediumRisk}</div>
                </div>
                <div class="stat-card">
                    <h4>No Activity</h4>
                    <div class="stat-value">${summary.noActivity}</div>
                </div>
                <div class="stat-card">
                    <h4>Average Days Since Activity</h4>
                    <div class="stat-value">${summary.averageDays}</div>
                </div>
                <div class="stat-card">
                    <h4>Projects Requiring Attention</h4>
                    <div class="stat-value">${summary.attentionCount}</div>
                </div>
            </div>
        `;

        const listMarkup = projects.length ? `
            <div class="project-health-grid">
                ${projects.map(project => {
            const riskLabel = project.risk === 'no-activity'
                ? 'No Activity'
                : project.risk === 'high'
                    ? `Inactive ${project.daysSinceActivity} day${project.daysSinceActivity === 1 ? '' : 's'}`
                    : `Inactive ${project.daysSinceActivity} day${project.daysSinceActivity === 1 ? '' : 's'}`;
            const lastActivityText = project.activityCount
                ? `Last activity ${project.daysSinceActivity} day${project.daysSinceActivity === 1 ? '' : 's'} ago (${UI.formatDate(project.lastActivityDate)})`
                : 'No activity recorded yet';
            const sfdcMarkup = project.sfdcMissing
                ? `<p class="project-health-warning">SFDC link missing</p>
                            <button class="btn btn-sm btn-primary" onclick="App.promptProjectSfdcLink('${project.accountId}', '${project.projectId}')">Update SFDC Link</button>`
                : `<p class="project-health-link"><a href="${project.sfdcLink}" target="_blank" rel="noopener">View SFDC Record</a></p>`;
            return `
                        <div class="project-health-card risk-${project.risk}">
                            <div class="project-health-header">
                                <h4>${project.projectName || 'Unnamed Project'}</h4>
                                <span class="risk-badge risk-${project.risk}">${riskLabel}</span>
                            </div>
                            <p class="project-health-account">${project.accountName}</p>
                            <p class="project-health-meta">Industry: ${project.industry}</p>
                            <p class="project-health-meta">Owner: ${project.primaryOwnerName || 'Unassigned'}</p>
                            <p class="project-health-meta">Status: ${project.status || 'Active'}</p>
                            <p class="project-health-meta">Activities logged: ${project.activityCount}</p>
                            <p class="project-health-meta">${lastActivityText}</p>
                            ${sfdcMarkup}
                        </div>
                    `;
        }).join('')}
            </div>
        ` : `<p class="text-muted">No projects match the current filters.</p>`;

        return `
            <div class="${wrapperClass}">
                <div class="${headerClass}">
                    <h3>Project Risk Snapshot</h3>
                </div>
                <div class="${bodyClass}">
                    ${statsMarkup}
                    ${filtersSummaryMarkup}
                </div>
            </div>
            <div class="${wrapperClass}">
                <div class="${headerClass}">
                    <h3>Projects Requiring Attention (${projects.length})</h3>
                </div>
                <div class="${bodyClass}">
                    ${listMarkup}
                </div>
            </div>
        `;
    },

    syncProjectHealthControls() {
        const thresholdValue = String(this.projectHealthFilters.threshold);
        const statusValue = this.projectHealthFilters.status || 'all';
        const includeChecked = this.projectHealthFilters.includeNoActivity !== false;

        const controls = [
            { id: 'projectHealthThreshold', type: 'select', value: thresholdValue },
            { id: 'projectHealthStatus', type: 'select', value: statusValue },
            { id: 'projectHealthInclude', type: 'checkbox', value: includeChecked },
            { id: 'cardProjectHealthThreshold', type: 'select', value: thresholdValue },
            { id: 'cardProjectHealthStatus', type: 'select', value: statusValue },
            { id: 'cardProjectHealthInclude', type: 'checkbox', value: includeChecked }
        ];

        controls.forEach(control => {
            const element = document.getElementById(control.id);
            if (!element) return;
            if (control.type === 'select') {
                element.value = control.value;
                if (element.value !== control.value && element.options.length) {
                    element.value = element.options[0].value;
                }
            } else if (control.type === 'checkbox') {
                element.checked = control.value;
            }
        });
    },

    handleProjectHealthFilterChange(key, value, variant = 'standard') {
        this.projectHealthFilters[key] = key === 'threshold' ? Number(value) : value;
        this.loadProjectHealthView();
        if (InterfaceManager.getCurrentInterface() === 'card' || variant === 'card') {
            this.loadCardProjectHealthView();
        }
    },

    toggleProjectHealthInclude(checked, variant = 'standard') {
        this.projectHealthFilters.includeNoActivity = !!checked;
        this.loadProjectHealthView();
        if (InterfaceManager.getCurrentInterface() === 'card' || variant === 'card') {
            this.loadCardProjectHealthView();
        }
    },

    resetProjectHealthFilters() {
        this.projectHealthFilters = {
            threshold: 60,
            status: 'all',
            includeNoActivity: true
        };
        this.loadProjectHealthView();
        if (InterfaceManager.getCurrentInterface() === 'card') {
            this.loadCardProjectHealthView();
        }
    },

    async loadProjectHealthView() {
        if (InterfaceManager.getCurrentInterface() === 'card') {
            this.loadCardProjectHealthView().catch(e => console.warn('loadCardProjectHealthView failed', e));
            return;
        }

        const container = document.getElementById('projectHealthContent');
        if (!container) {
            console.error('projectHealthContent container not found');
            return;
        }

        const projects = await this.computeProjectHealthData();
        const { projects: filteredProjects, summary } = this.getFilteredProjectHealthProjects(projects);
        const backLink = `
            <div class="view-header-utility">
                <button class="btn btn-link view-back-link" onclick="App.switchView('dashboard')">← Back to Dashboard</button>
            </div>
        `;
        container.innerHTML = `
            ${backLink}
            ${this.buildProjectHealthMarkup(filteredProjects, summary, 'standard')}
        `;
        this.syncProjectHealthControls();
    },

    async loadCardProjectHealthView() {
        const view = document.getElementById('projectHealthView');
        const container = document.getElementById('projectHealthContent');
        if (!container) {
            console.error('projectHealthContent container not found');
            return;
        }

        const projects = await this.computeProjectHealthData();
        const { projects: filteredProjects, summary } = this.getFilteredProjectHealthProjects(projects);
        if (view && !view.querySelector('.back-to-home')) {
            const backLink = document.createElement('a');
            backLink.href = '#';
            backLink.className = 'back-to-home';
            backLink.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
                Back to Home
            `;
            backLink.addEventListener('click', (event) => {
                event.preventDefault();
                App.navigateToCardView('dashboard');
            });
            view.insertBefore(backLink, view.firstChild);
        }
        container.innerHTML = this.buildProjectHealthMarkup(filteredProjects, summary, 'card');
        this.syncProjectHealthControls();
    },

    async computeSfdcComplianceData() {
        const projects = await this.computeProjectHealthData();
        return projects.map(project => {
            const link = (project.sfdcLink || '').trim();
            const hasLink = !!link;
            const isValid = hasLink && /^https?:\/\//i.test(link);
            return {
                ...project,
                sfdcLink: link,
                hasLink,
                isValid,
                compliant: hasLink && isValid
            };
        });
    },

    getFilteredSfdcProjects(projects) {
        const industryFilter = (this.sfdcFilters.industry || '').toLowerCase();
        const accountFilter = (this.sfdcFilters.account || '').toLowerCase();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const ownerFilterRaw = this.sfdcFilters.owner || this.getDefaultRecordOwnerFilter();
        const ownerFilterValue = this.resolveOwnerFilterValue(ownerFilterRaw, currentUser);
        const showAll = !!this.sfdcFilters.showAll;

        const filtered = projects.filter(project => {
            if (!showAll && project.compliant) return false;
            if (industryFilter && (project.industry || '').toLowerCase() !== industryFilter) return false;
            if (accountFilter && (project.accountName || '').toLowerCase() !== accountFilter) return false;
            const ownerIds = project.ownerIds || [];
            if (ownerFilterValue !== 'all') {
                if (!ownerIds.includes(ownerFilterValue)) return false;
            } else if (!isAdmin && currentUser?.id) {
                if (!ownerIds.includes(currentUser.id)) return false;
            }
            return true;
        });

        const summary = {
            total: projects.length,
            missing: projects.filter(project => !project.hasLink).length,
            invalid: projects.filter(project => project.hasLink && !project.isValid).length,
            compliant: projects.filter(project => project.compliant).length,
            attentionCount: filtered.length
        };

        return { projects: filtered, summary };
    },

    buildSfdcComplianceMarkup(filteredProjects, summary, variant = 'standard', allProjects = []) {
        const prefix = variant === 'card' ? 'card' : '';
        const wrapperClass = variant === 'card' ? 'content-card' : 'card';
        const headerClass = variant === 'card' ? 'content-card-header' : 'card-header';
        const bodyClass = variant === 'card' ? 'card-body' : 'card-body';

        const industries = Array.from(new Set(allProjects.map(project => project.industry))).filter(Boolean).sort((a, b) => a.localeCompare(b));
        const accounts = Array.from(new Set(allProjects.map(project => project.accountName))).filter(Boolean).sort((a, b) => a.localeCompare(b));
        const ownerEntries = new Map();
        allProjects.forEach(project => {
            const ownerIds = project.ownerIds || [];
            const ownerNames = project.ownerNames || [];
            ownerIds.forEach((ownerId, index) => {
                if (!ownerId) return;
                if (!ownerEntries.has(ownerId)) {
                    ownerEntries.set(ownerId, ownerNames[index] || project.primaryOwnerName || 'Unassigned');
                }
            });
        });
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const ownerOptions = [];
        if (isAdmin) {
            ownerOptions.push({ value: 'all', label: 'All owners' });
            const sortedOwners = Array.from(ownerEntries.entries())
                .sort((a, b) => (a[1] || '').localeCompare(b[1] || ''));
            sortedOwners.forEach(([id, name]) => {
                ownerOptions.push({ value: id, label: name || 'Unassigned' });
            });
        } else if (currentUser?.id) {
            ownerOptions.push({ value: currentUser.id, label: 'My projects' });
        }
        const ownerSelectMarkup = ownerOptions.length ? `
                <div class="form-group">
                    <label class="form-label">Owner</label>
                    <select id="${prefix ? `${prefix}SfdcOwnerFilter` : 'sfdcOwnerFilter'}" class="form-control" onchange="App.handleSfdcFilterChange('owner', this.value, '${variant}')">
                        ${ownerOptions.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
                    </select>
                </div>
        ` : '';

        const filtersMarkup = `
            <div class="analytics-filter-bar">
                <div class="form-group">
                    <label class="form-label">Industry</label>
                    <select id="${prefix ? `${prefix}SfdcIndustryFilter` : 'sfdcIndustryFilter'}" class="form-control" onchange="App.handleSfdcFilterChange('industry', this.value, '${variant}')">
                        <option value="">All Industries</option>
                        ${industries.map(industry => `<option value="${industry}">${industry}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Account</label>
                    <select id="${prefix ? `${prefix}SfdcAccountFilter` : 'sfdcAccountFilter'}" class="form-control" onchange="App.handleSfdcFilterChange('account', this.value, '${variant}')">
                        <option value="">All Accounts</option>
                        ${accounts.map(account => `<option value="${account}">${account}</option>`).join('')}
                    </select>
                </div>
                ${ownerSelectMarkup}
                <div class="form-group checkbox-group">
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="${prefix ? `${prefix}SfdcShowAll` : 'sfdcShowAll'}" onchange="App.toggleSfdcShowAll(this.checked, '${variant}')">
                        Include compliant projects
                    </label>
                </div>
                <div class="form-group" style="align-self: flex-end;">
                    <button class="btn btn-link" onclick="App.resetSfdcFilters(); return false;">Reset</button>
                </div>
            </div>
        `;

        const statsMarkup = `
            <div class="stats-grid analytics-stats">
                <div class="stat-card">
                    <h4>Total Projects</h4>
                    <div class="stat-value">${summary.total}</div>
                </div>
                <div class="stat-card">
                    <h4>Missing Link</h4>
                    <div class="stat-value text-danger">${summary.missing}</div>
                </div>
                <div class="stat-card">
                    <h4>Invalid Link</h4>
                    <div class="stat-value text-warning">${summary.invalid}</div>
                </div>
                <div class="stat-card">
                    <h4>Compliant</h4>
                    <div class="stat-value text-success">${summary.compliant}</div>
                </div>
                <div class="stat-card">
                    <h4>Requires Update</h4>
                    <div class="stat-value">${summary.attentionCount}</div>
                </div>
            </div>
        `;

        const listMarkup = filteredProjects.length ? (() => {
            const rows = filteredProjects.map(project => {
                let statusLabel = 'Missing';
                let statusClass = 'missing';
                if (project.hasLink && !project.isValid) {
                    statusLabel = 'Invalid';
                    statusClass = 'invalid';
                } else if (project.compliant) {
                    statusLabel = 'Compliant';
                    statusClass = 'compliant';
                }
                const lastActivityText = project.activityCount
                    ? `Last activity ${project.daysSinceActivity} day${project.daysSinceActivity === 1 ? '' : 's'} ago (${UI.formatDate(project.lastActivityDate)})`
                    : 'No activity recorded yet';
                const inputId = `${prefix ? `${prefix}_` : ''}sfdcInput_${project.projectId}`;
                const currentLinkMarkup = project.sfdcLink
                    ? `<a href="${project.sfdcLink}" target="_blank" rel="noopener">Open</a>`
                    : '<span class="text-muted">Not set</span>';
                return `
                    <tr class="status-${statusClass}">
                        <td>${project.accountName}</td>
                        <td>${project.projectName || 'Unnamed Project'}</td>
                        <td>${project.primaryOwnerName || 'Unassigned'}</td>
                        <td><span class="sfdc-status-badge ${statusClass}">${statusLabel}</span></td>
                        <td>${lastActivityText}</td>
                        <td>
                            <input type="text" id="${inputId}" class="form-control sfdc-link-input" value="${project.sfdcLink || ''}" placeholder="https://example.com/...">
                            <div class="sfdc-current-link">${currentLinkMarkup}</div>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-sm btn-primary" onclick="App.updateSfdcLinkFromInput('${project.accountId}', '${project.projectId}', '${inputId}')">Save</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            return `
                <div class="sfdc-compliance-table-wrap">
                    <table class="table sfdc-compliance-table">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Project</th>
                                <th>Owner</th>
                                <th>Status</th>
                                <th>Last Activity</th>
                                <th>SFDC Link</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        })() : `<p class="text-muted">All projects are compliant with the selected filters.</p>`;

        return `
            <div class="${wrapperClass}">
                <div class="${headerClass}">
                    <h3>Filters</h3>
                </div>
                <div class="${bodyClass}">
                    ${filtersMarkup}
                </div>
            </div>
            <div class="${wrapperClass}">
                <div class="${headerClass}">
                    <h3>Compliance Overview</h3>
                </div>
                <div class="${bodyClass}">
                    ${statsMarkup}
                </div>
            </div>
            <div class="${wrapperClass}">
                <div class="${headerClass}">
                    <h3>Projects Requiring Attention (${filteredProjects.length})</h3>
                </div>
                <div class="${bodyClass}">
                    ${listMarkup}
                </div>
            </div>
        `;
    },

    syncSfdcControls() {
        const industryValue = this.sfdcFilters.industry || '';
        const accountValue = this.sfdcFilters.account || '';
        const ownerValue = this.sfdcFilters.owner || '';
        const showAll = !!this.sfdcFilters.showAll;

        const controls = [
            { id: 'sfdcIndustryFilter', type: 'select', value: industryValue },
            { id: 'sfdcAccountFilter', type: 'select', value: accountValue },
            { id: 'sfdcOwnerFilter', type: 'select', value: ownerValue },
            { id: 'sfdcShowAll', type: 'checkbox', value: showAll },
            { id: 'cardSfdcIndustryFilter', type: 'select', value: industryValue },
            { id: 'cardSfdcAccountFilter', type: 'select', value: accountValue },
            { id: 'cardSfdcOwnerFilter', type: 'select', value: ownerValue },
            { id: 'cardSfdcShowAll', type: 'checkbox', value: showAll }
        ];

        controls.forEach(control => {
            const element = document.getElementById(control.id);
            if (!element) return;
            if (control.type === 'select') {
                element.value = control.value;
            } else if (control.type === 'checkbox') {
                element.checked = control.value;
            }
        });
    },

    handleSfdcFilterChange(key, value, variant = 'standard') {
        if (key === 'owner' && !value) {
            this.sfdcFilters.owner = this.getDefaultRecordOwnerFilter();
        } else {
            this.sfdcFilters[key] = value;
        }
        this.loadSfdcComplianceView();
        if (InterfaceManager.getCurrentInterface() === 'card' || variant === 'card') {
            this.loadCardSfdcComplianceView();
        }
    },

    toggleSfdcShowAll(checked, variant = 'standard') {
        this.sfdcFilters.showAll = !!checked;
        this.loadSfdcComplianceView();
        if (InterfaceManager.getCurrentInterface() === 'card' || variant === 'card') {
            this.loadCardSfdcComplianceView();
        }
    },

    resetSfdcFilters() {
        this.sfdcFilters = {
            industry: '',
            account: '',
            owner: this.getDefaultRecordOwnerFilter(),
            showAll: false
        };
        this.loadSfdcComplianceView();
        if (InterfaceManager.getCurrentInterface() === 'card') {
            this.loadCardSfdcComplianceView();
        }
    },

    async loadSfdcComplianceView() {
        if (InterfaceManager.getCurrentInterface() === 'card') {
            this.loadCardSfdcComplianceView().catch(e => console.warn('loadCardSfdcComplianceView failed', e));
            return;
        }

        if (!this.sfdcFilters.owner) {
            this.sfdcFilters.owner = this.getDefaultRecordOwnerFilter();
        }

        const container = document.getElementById('sfdcComplianceContent');
        if (!container) {
            console.error('sfdcComplianceContent container not found');
            return;
        }

        const projects = await this.computeSfdcComplianceData();
        const { projects: filteredProjects, summary } = this.getFilteredSfdcProjects(projects);
        const backLink = `
            <div class="view-header-utility">
                <button class="btn btn-link view-back-link" onclick="App.switchView('dashboard')">← Back to Dashboard</button>
            </div>
        `;
        container.innerHTML = `
            ${backLink}
            ${this.buildSfdcComplianceMarkup(filteredProjects, summary, 'standard', projects)}
        `;
        this.syncSfdcControls();
    },

    async loadCardSfdcComplianceView() {
        const view = document.getElementById('sfdcComplianceView');
        const container = document.getElementById('sfdcComplianceContent');
        if (!container) {
            console.error('sfdcComplianceContent container not found');
            return;
        }

        if (!this.sfdcFilters.owner) {
            this.sfdcFilters.owner = this.getDefaultRecordOwnerFilter();
        }

        const projects = await this.computeSfdcComplianceData();
        const { projects: filteredProjects, summary } = this.getFilteredSfdcProjects(projects);
        if (view && !view.querySelector('.back-to-home')) {
            const backLink = document.createElement('a');
            backLink.href = '#';
            backLink.className = 'back-to-home';
            backLink.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
                Back to Home
            `;
            backLink.addEventListener('click', (event) => {
                event.preventDefault();
                App.navigateToCardView('dashboard');
            });
            view.insertBefore(backLink, view.firstChild);
        }
        container.innerHTML = this.buildSfdcComplianceMarkup(filteredProjects, summary, 'card', projects);
        this.syncSfdcControls();
    },

    initAnalyticsCharts({ variant = 'standard', analytics, month }) {
        if (!analytics) return;
        const prefix = variant === 'card' ? 'card' : 'reports';
        const wrapper = document.getElementById(`${prefix}AnalyticsWrapper`);
        if (!wrapper) return;

        if (typeof Chart === 'undefined') {
            if (!wrapper.querySelector('.chart-library-warning')) {
                const warning = document.createElement('p');
                warning.className = 'text-muted chart-library-warning';
                warning.textContent = 'Charts unavailable: analytics library not loaded.';
                wrapper.appendChild(warning);
            }
            return;
        }

        this.destroyAnalyticsCharts(prefix);

        this.setAnalyticsLoading(prefix, true);
        const palette = this.getPalette();
        const extendedPalette = this.getPalette(true);
        const summaryMap = {};
        (analytics.userSummaries || []).forEach(summary => {
            summaryMap[summary.userId] = summary;
        });

        const industryEntries = Object.entries(analytics.industryCounts || {}).sort((a, b) => b[1] - a[1]);
        const industryLimit = this.CHART_CONSTANTS.industryLimit;
        const limitedIndustryEntries = industryEntries.slice(0, industryLimit);
        const industryLabelsForProducts = limitedIndustryEntries.map(([name]) => name);
        const otherIndustryTotal = industryEntries.slice(industryLimit).reduce((sum, [, count]) => sum + count, 0);
        const industriesForActivity = [...industryLabelsForProducts];
        const industryCountsForChart = limitedIndustryEntries.map(([, count]) => count);
        if (otherIndustryTotal > 0) {
            industriesForActivity.push('Other');
            industryCountsForChart.push(otherIndustryTotal);
        }

        const context = {
            prefix,
            analytics,
            month,
            palette,
            extendedPalette,
            summaryMap,
            targetValue: Number(analytics.targetValue || 0),
            industryLabelsForProducts,
            industriesForActivity,
            industryCountsForChart
        };

        this.renderActivityReportChart(context);
        const mixMode = (this.analyticsPreferences && this.analyticsPreferences.activityMixView
            && this.analyticsPreferences.activityMixView[prefix]) || 'donut';
        this.renderActivityMixChart(context, mixMode);
        this.renderUserStackedChart(context);
        this.renderProductsChart(context);
        this.renderIndustryActivityChart(context);
        this.renderWinLossTrendChart(context);
        this.renderChannelOutcomeChart(context);
        this.renderPocFunnelChart(context);

        this.setAnalyticsLoading(prefix, false);
    },

    renderActivityReportChart(context) {
        const prefix = context?.prefix || 'reports';
        const analytics = context?.analytics;
        const palette = context?.palette || this.getPalette();
        const summaryMap = context?.summaryMap || {};
        const canvas = document.getElementById(`${prefix}ActivityReportChart`) || document.getElementById(`${prefix}TargetChart`);
        if (!canvas) return;
        if (!analytics) {
            this.renderChartEmptyState(canvas, 'Analytics data unavailable for this period.');
            return;
        }

        const presalesUsers = analytics.presalesUsers || [];
        const summaryEntries = (analytics.userSummaries || []).map(summary => ({
            userId: summary.userId,
            userName:
                summary.userName ||
                presalesUsers.find(user => user.userId === summary.userId)?.userName ||
                summary.email ||
                'Unknown',
            total: summary.total || 0
        }));

        const supplementalEntries = presalesUsers
            .filter(user => !summaryEntries.some(entry => entry.userId === user.userId))
            .map(user => ({
                userId: user.userId,
                userName: user.userName,
                total: summaryMap[user.userId]?.total || 0
            }));

        const orderedSummaries = [...summaryEntries, ...supplementalEntries]
            .filter(entry => entry.userName)
            .sort((a, b) => b.total - a.total);

        if (!orderedSummaries.length) {
            this.renderChartEmptyState(canvas, 'Add presales users to track team targets.');
            return;
        }

        this.prepareChartCanvas(canvas);
        const chart = this.tryRenderChart(canvas, {
            type: 'bar',
            data: {
                labels: orderedSummaries.map(item => item.userName),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Activities',
                        data: orderedSummaries.map(item => item.total),
                        backgroundColor: palette[0],
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        }, `${prefix}-activity-report`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-activity-report`, data: orderedSummaries });
        }
    },

    renderActivityMixChart(context, mode = 'donut') {
        const prefix = context?.prefix || 'reports';
        const analytics = context?.analytics;
        const palette = context?.palette || this.getPalette();
        const canvas = document.getElementById(`${prefix}ActivityMixChart`) || document.getElementById(`${prefix}ActivityPieChart`);
        if (!canvas) return;
        if (!this.analyticsCharts) {
            this.analyticsCharts = {};
        }
        if (!analytics) {
            this.renderChartEmptyState(canvas, 'Analytics data unavailable for this period.');
            return;
        }
        if (!this.analyticsPreferences) {
            this.analyticsPreferences = { activityMixView: {} };
        }
        this.analyticsPreferences.activityMixView[prefix] = mode;

        const activityEntries = Object.entries(analytics.activityTypeCounts || {});
        const totalActivities = activityEntries.reduce((acc, [, count]) => acc + count, 0);
        if (!totalActivities) {
            this.renderChartEmptyState(canvas, 'No activities recorded for this period.');
            return;
        }

        this.prepareChartCanvas(canvas);
        const labels = activityEntries.map(([type]) => UI.getActivityTypeLabel(type));
        const data = activityEntries.map(([, count]) => count);
        const colors = labels.map((_, idx) => palette[idx % palette.length]);

        let chartConfig;
        if (mode === 'horizontal') {
            chartConfig = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Activities',
                        data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            };
        } else if (mode === 'vertical') {
            chartConfig = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Activities',
                        data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            };
        } else {
            chartConfig = {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: context => `${context.label}: ${context.raw}`
                            }
                        }
                    }
                }
            };
        }

        const existingKey = `${prefix}-activity-mix`;
        if (this.analyticsCharts[existingKey]) {
            this.analyticsCharts[existingKey].destroy();
        }
        const chart = this.tryRenderChart(canvas, chartConfig, existingKey);
        if (chart) {
            console.info('chart_rendered', { key: existingKey, data: activityEntries });
        }
    },

    renderUserStackedChart(context) {
        const { prefix, analytics, palette } = context;
        const canvas = document.getElementById(`${prefix}ActivityByUserChart`) || document.getElementById(`${prefix}UserStackedChart`);
        if (!canvas) return;

        const presalesUsers = analytics.presalesUsers || [];
        if (!presalesUsers.length) {
            this.renderChartEmptyState(canvas, 'No presales users configured.');
            return;
        }

        const summaries = analytics.userSummaries || [];
        const presalesLookup = presalesUsers.reduce((acc, user) => {
            acc[user.userId] = user;
            return acc;
        }, {});
        const userSummariesMap = new Map();

        summaries.forEach(summary => {
            const baseName =
                summary.userName ||
                presalesLookup[summary.userId]?.userName ||
                summary.email ||
                'Unknown';
            userSummariesMap.set(summary.userId, {
                userId: summary.userId,
                userName: baseName,
                total: summary.total || 0,
                types: summary.types || {}
            });
        });

        presalesUsers.forEach(user => {
            if (!userSummariesMap.has(user.userId)) {
                userSummariesMap.set(user.userId, {
                    userId: user.userId,
                    userName: user.userName,
                    total: 0,
                    types: {}
                });
            }
        });

        const userSummaries = Array.from(userSummariesMap.values());

        const sortedUsers = [...userSummaries].sort((a, b) => b.total - a.total);

        const labels = sortedUsers.map(summary => summary.userName);
        const typeSet = new Set();
        sortedUsers.forEach(summary => Object.keys(summary.types || {}).forEach(type => typeSet.add(type)));
        const typeKeys = Array.from(typeSet);

        this.prepareChartCanvas(canvas);
        let datasets;
        if (!typeKeys.length) {
            datasets = [
                {
                    label: 'Activities',
                    data: sortedUsers.map(summary => summary.total || 0),
                    backgroundColor: palette[0]
                }
            ];
        } else {
            datasets = typeKeys.map((type, index) => ({
                label: UI.getActivityTypeLabel(type),
                data: sortedUsers.map(summary => summary.types?.[type] || 0),
                backgroundColor: palette[index % palette.length],
                stack: 'activity'
            }));
        }

        const chart = this.tryRenderChart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        }, `${prefix}-stacked`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-stacked`, data: userSummaries });
        }
    },

    renderProductsChart(context) {
        const { prefix, analytics, extendedPalette, industryLabelsForProducts } = context;
        const canvas = document.getElementById(`${prefix}IndustryProductChart`);
        if (!canvas) return;

        const productEntries = Object.entries(analytics.productTotals || {}).sort((a, b) => b[1] - a[1]);
        const topProducts = productEntries.slice(0, 5).map(([name]) => name);

        if (!industryLabelsForProducts.length || !topProducts.length) {
            this.renderChartEmptyState(canvas, 'No product discussions recorded this period.');
            return;
        }

        const datasets = topProducts.map((product, index) => ({
            label: product,
            data: industryLabelsForProducts.map(industry => (analytics.industryProductCounts?.[industry]?.[product] || 0)),
            backgroundColor: extendedPalette[index % extendedPalette.length],
            stack: 'product'
        }));

        if (productEntries.length > topProducts.length) {
            const othersData = industryLabelsForProducts.map(industry => {
                const industryProducts = analytics.industryProductCounts?.[industry] || {};
                const total = Object.values(industryProducts).reduce((sum, count) => sum + count, 0);
                const topSum = topProducts.reduce((sum, product) => sum + (industryProducts[product] || 0), 0);
                return Math.max(total - topSum, 0);
            });
            if (othersData.some(value => value > 0)) {
                datasets.push({
                    label: 'Other Products',
                    data: othersData,
                    backgroundColor: '#CBD5E0',
                    stack: 'product'
                });
            }
        }

        const combinedTotal = datasets.reduce((sum, dataset) => sum + dataset.data.reduce((a, b) => a + b, 0), 0);
        if (!combinedTotal) {
            this.renderChartEmptyState(canvas, 'No product discussions recorded this period.');
            return;
        }

        this.prepareChartCanvas(canvas);
        const chart = this.tryRenderChart(canvas, {
            type: 'bar',
            data: { labels: industryLabelsForProducts, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
                    y: { stacked: true }
                }
            }
        }, `${prefix}-products`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-products`, labels: industryLabelsForProducts });
        }
    },

    renderIndustryActivityChart(context) {
        const { prefix, industriesForActivity, industryCountsForChart, palette } = context;
        const canvas = document.getElementById(`${prefix}IndustryActivityChart`);
        if (!canvas) return;

        if (!industriesForActivity.length) {
            this.renderChartEmptyState(canvas, 'No industry-level activity recorded this period.');
            return;
        }

        this.prepareChartCanvas(canvas);
        const chart = this.tryRenderChart(canvas, {
            type: 'bar',
            data: {
                labels: industriesForActivity,
                datasets: [{
                    label: 'Activities',
                    data: industryCountsForChart,
                    backgroundColor: industriesForActivity.map((_, idx) => palette[idx % palette.length]),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        }, `${prefix}-industry`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-industry`, labels: industriesForActivity });
        }
    },

    renderWinLossTrendChart(context) {
        const { prefix } = context;
        const canvas = document.getElementById(`${prefix}WinLossTrendChart`)
            || document.getElementById(`${prefix}RegionalWinLossChart`);
        if (!canvas) return;

        const trendData = DataManager.getWinLossTrend(6);
        if (!trendData.length) {
            this.renderChartEmptyState(canvas, 'No win/loss updates recorded in recent months.');
            return;
        }

        this.prepareChartCanvas(canvas);
        const labels = trendData.map(item => UI.formatMonth(item.month));
        const chart = this.tryRenderChart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Wins',
                        data: trendData.map(item => item.won),
                        borderColor: '#38A169',
                        backgroundColor: 'rgba(56, 161, 105, 0.2)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Losses',
                        data: trendData.map(item => item.lost),
                        borderColor: '#E53E3E',
                        backgroundColor: 'rgba(229, 62, 62, 0.2)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        }, `${prefix}-trend`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-trend`, labels });
        }
    },

    renderChannelOutcomeChart(context) {
        const { prefix, analytics, palette } = context;
        const canvas = document.getElementById(`${prefix}ChannelOutcomeChart`);
        if (!canvas) return;

        const channelStats = DataManager.getChannelOutcomeStats(analytics.month);
        const channelEntries = Object.entries(channelStats).map(([channel, counts]) => ({
            channel,
            total: (counts.won || 0) + (counts.lost || 0),
            won: counts.won || 0,
            lost: counts.lost || 0
        })).sort((a, b) => b.total - a.total);

        if (!channelEntries.length) {
            this.renderChartEmptyState(canvas, 'No channel data available for the selected period.');
            return;
        }

        const channelLimit = this.CHART_CONSTANTS.channelLimit;
        const limitedChannels = channelEntries.slice(0, channelLimit);
        const overflow = channelEntries.slice(channelLimit);
        if (overflow.length) {
            const aggregated = overflow.reduce((acc, entry) => ({
                channel: 'Other Channels',
                won: acc.won + entry.won,
                lost: acc.lost + entry.lost,
                total: acc.total + entry.total
            }), { channel: 'Other Channels', won: 0, lost: 0, total: 0 });
            if (aggregated.total > 0) {
                limitedChannels.push(aggregated);
            }
        }

        this.prepareChartCanvas(canvas);
        const chart = this.tryRenderChart(canvas, {
            type: 'bar',
            data: {
                labels: limitedChannels.map(item => item.channel),
                datasets: [
                    {
                        label: 'Wins',
                        data: limitedChannels.map(item => item.won),
                        backgroundColor: palette[2]
                    },
                    {
                        label: 'Losses',
                        data: limitedChannels.map(item => item.lost),
                        backgroundColor: '#F56565'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        }, `${prefix}-channels`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-channels`, labels: limitedChannels.map(item => item.channel) });
        }
    },

    renderPocFunnelChart(context) {
        const { prefix, analytics } = context;
        const canvas = document.getElementById(`${prefix}PocFunnelChart`);
        if (!canvas) return;

        const pocStats = DataManager.getPocFunnelStats(analytics.month);
        const funnelEntries = Object.entries(pocStats.types || {}).map(([accessType, stats]) => ({
            accessType,
            requests: stats.requests || 0,
            wins: stats.wins || 0,
            losses: stats.losses || 0
        })).filter(entry => entry.requests || entry.wins || entry.losses);

        if (!funnelEntries.length) {
            this.renderChartEmptyState(canvas, 'No POC activity recorded for the selected period.');
            return;
        }

        this.prepareChartCanvas(canvas);
        const chart = this.tryRenderChart(canvas, {
            type: 'bar',
            data: {
                labels: funnelEntries.map(entry => entry.accessType),
                datasets: [
                    {
                        label: 'Requests',
                        data: funnelEntries.map(entry => entry.requests),
                        backgroundColor: '#3182CE'
                    },
                    {
                        label: 'Wins',
                        data: funnelEntries.map(entry => entry.wins),
                        backgroundColor: '#38A169'
                    },
                    {
                        label: 'Losses',
                        data: funnelEntries.map(entry => entry.losses),
                        backgroundColor: '#E53E3E'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        }, `${prefix}-poc`);
        if (chart) {
            console.info('chart_rendered', { key: `${prefix}-poc`, labels: funnelEntries.map(entry => entry.accessType) });
        }
    },

    destroyAnalyticsCharts(prefix) {
        Object.keys(this.analyticsCharts).forEach(key => {
            if (!prefix || key.startsWith(prefix)) {
                this.analyticsCharts[key].destroy();
                delete this.analyticsCharts[key];
            }
        });
    },

    prepareChartCanvas(canvas) {
        if (!canvas) return;
        canvas.style.display = 'block';
        const card = canvas.closest('.chart-card');
        if (card) {
            card.querySelectorAll('.chart-empty').forEach(el => el.remove());
        }
    },

    renderChartEmptyState(canvas, message) {
        if (!canvas) return;
        const card = canvas.closest('.chart-card');
        if (!card) return;
        canvas.style.display = 'none';
        if (!card.querySelector('.chart-empty')) {
            const note = document.createElement('p');
            note.className = 'chart-empty text-muted';
            note.innerHTML = `${message}<br><button class="btn btn-link btn-sm" style="padding-left: 0;" onclick="Activities.openActivityModal()">Log Activity</button>`;
            card.appendChild(note);
        }
    },

    renderChartError(canvas, errorMessage) {
        if (!canvas) return;
        const card = canvas.closest('.chart-card') || canvas.parentElement;
        if (!card) return;
        canvas.style.display = 'none';
        const existing = card.querySelector('.chart-error');
        const message = errorMessage || 'Unable to render analytics chart.';
        if (existing) {
            existing.textContent = message;
            return;
        }
        const note = document.createElement('p');
        note.className = 'chart-error text-danger';
        note.textContent = message;
        card.appendChild(note);
    },

    tryRenderChart(canvas, config, cacheKey) {
        if (!canvas) return null;
        try {
            const chart = new Chart(canvas, config);
            if (cacheKey) {
                this.analyticsCharts[cacheKey] = chart;
            }
            return chart;
        } catch (error) {
            console.error('analytics_chart_render_failed', {
                cacheKey,
                message: error?.message,
                stack: error?.stack
            });
            this.renderChartError(canvas, error?.message);
            return null;
        }
    },

    getPalette(extended = false) {
        return extended ? this.CHART_CONSTANTS.extendedPalette : this.CHART_CONSTANTS.palette;
    },

    setAnalyticsLoading(prefix, isLoading) {
        const loader = document.getElementById(`${prefix}AnalyticsLoading`);
        if (!loader) return;
        loader.classList.toggle('hidden', !isLoading);
    },

    // Load accounts view
    async loadAccountsView() {
        // Check if card interface is active
        if (InterfaceManager.getCurrentInterface() === 'card') {
            await this.loadCardAccountsView();
            return;
        }

        try {
            const accounts = await DataManager.getAccounts();
            const container = document.getElementById('accountsContent');
            if (!container) {
                console.error('accountsContent container not found');
                return;
            }

            const searchTerm = (this.accountFilters.search || '').toLowerCase().trim();
            const industryFilter = this.accountFilters.industry || '';
            const salesRepFilter = this.accountFilters.salesRep || '';

            const filtered = accounts.filter(account => {
                const matchesSearch = !searchTerm ||
                    (account.name && account.name.toLowerCase().includes(searchTerm)) ||
                    (account.salesRep && account.salesRep.toLowerCase().includes(searchTerm));
                const matchesIndustry = !industryFilter || account.industry === industryFilter;
                const matchesSalesRep = !salesRepFilter || account.salesRep === salesRepFilter;
                return matchesSearch && matchesIndustry && matchesSalesRep;
            });

            const industries = [...new Set(accounts.map(a => a.industry).filter(Boolean))].sort();
            const salesReps = [...new Set(accounts.map(a => a.salesRep).filter(Boolean))].sort();

            const backLink = `
                <div class="view-header-utility">
                    <button class="btn btn-link view-back-link" onclick="App.switchView('dashboard')">← Back to Dashboard</button>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="App.showMergeAccountModal()">Merge Accounts</button>
                    </div>
                </div>
            `;

            const filterBar = `
                <div class="activity-filters">
                    <div class="form-group" style="flex: 2;">
                        <label class="form-label">Search</label>
                        <input type="text" id="accountSearch" class="form-control" placeholder="Search by name or rep..." value="${this.accountFilters.search || ''}" oninput="App.searchAccounts()">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Industry</label>
                        <select id="accountFilterIndustry" class="form-control" onchange="App.handleAccountFilterChange('industry', this.value)">
                            <option value="">All Industries</option>
                            ${industries.map(i => `<option value="${i}" ${i === industryFilter ? 'selected' : ''}>${i}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sales Rep</label>
                        <select id="accountFilterSalesRep" class="form-control" onchange="App.handleAccountFilterChange('salesRep', this.value)">
                            <option value="">All Reps</option>
                            ${salesReps.map(r => `<option value="${r}" ${r === salesRepFilter ? 'selected' : ''}>${r}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="align-self: flex-end;">
                        <button class="btn btn-link" onclick="App.resetAccountFilters(); return false;">Reset</button>
                    </div>
                </div>
            `;

            const ownerMap = await this.getProjectOwnerMap();
            const cards = await Promise.all(filtered.map(async account => {
                const activityCount = await this.getAccountActivityCount(account.id);
                return `
                    <div class="account-card">
                        <div class="account-card-header">
                            <h3 class="account-card-title">${account.name}</h3>
                            <button class="btn btn-icon" onclick="App.editAccount('${account.id}')" title="Edit Account">✎</button>
                        </div>
                        <div class="account-card-meta">
                            <div class="account-card-meta-item">
                                <strong>Industry:</strong> ${account.industry || 'Unknown'}
                            </div>
                            <div class="account-card-meta-item">
                                <strong>Sales Rep:</strong> ${account.salesRep || 'Unassigned'}
                            </div>
                            <div class="account-card-meta-item">
                                <strong>Activities:</strong> ${activityCount}
                            </div>
                        </div>
                        ${await this.buildAccountProjectsMarkup(account, 'classic', ownerMap)}
                    </div>
                `;
            }));

            container.innerHTML = `
                ${backLink}
                ${filterBar}
                <div class="accounts-grid">
                    ${cards.join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading accounts view:', error);
            const container = document.getElementById('accountsContent');
            if (container) {
                container.innerHTML = UI.emptyState('Error loading accounts');
            }
        }
    },

    // Search accounts
    searchAccounts() {
        const query = document.getElementById('accountSearch').value.toLowerCase();
        const classicCards = document.querySelectorAll('#accountsContent .card');
        const cardInterfaceCards = document.querySelectorAll('#accountsView .account-card');

        [...classicCards, ...cardInterfaceCards].forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = !query || text.includes(query) ? '' : 'none';
        });
    },

    // Get activity count for account
    async getAccountActivityCount(accountId) {
        const activities = await DataManager.getAllActivities();
        return activities.filter(a => a.accountId === accountId).length;
    },

    async buildAccountProjectsMarkup(account, variant = 'classic', ownerMap = null) {
        const projects = Array.isArray(account.projects) ? account.projects : [];
        if (!projects.length) return '';

        const wrapperClass = variant === 'card' ? 'account-projects account-projects-card' : 'account-projects';
        const map = ownerMap != null ? ownerMap : await this.getProjectOwnerMap();
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
        const rows = projects.map(project => {
            const status = project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Active';
            const sfdcMarkup = project.sfdcLink
                ? `<a href="${project.sfdcLink}" target="_blank" rel="noopener">Open Link</a>`
                : '<span class="text-muted">Not set</span>';
            const ownerIds = Array.from(map.get(project.id) || new Set());
            if (project.createdBy && !ownerIds.includes(project.createdBy)) {
                ownerIds.push(project.createdBy);
            }
            const canManageProject = isAdmin || (currentUser?.id && ownerIds.includes(currentUser.id));
            return `
                <div class="account-project-row">
                    <div class="account-project-info">
                        <div class="account-project-name">${project.name}</div>
                        <div class="account-project-meta">
                            <span class="account-project-status">${status}</span>
                            <span>SFDC: ${sfdcMarkup}</span>
                        </div>
                    </div>
                    ${canManageProject ? `
                        <div class="account-project-actions">
                            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); App.promptProjectSfdcLink('${account.id}', '${project.id}')">Update SFDC</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="${wrapperClass}">
                <h4 class="account-projects-title">Projects</h4>
                ${rows}
            </div>
        `;
    },

    // Edit account
    async editAccount(accountId) {
        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only administrators can edit accounts.', 'error');
            return;
        }
        const account = await DataManager.getAccountById(accountId);
        if (!account) {
            UI.showNotification('Account not found', 'error');
            return;
        }

        const name = prompt('Enter new account name:', account.name);
        if (!name || name.trim() === '') return;

        const industry = prompt('Enter industry:', account.industry || '');
        if (industry === null) return;

        // Get sales rep
        const salesReps = await DataManager.getGlobalSalesReps();
        const currentSalesRep = salesReps.find(r => r.name === account.salesRep);
        let salesRepEmail = currentSalesRep ? currentSalesRep.email : '';

        if (salesReps.length > 0) {
            const salesRepOptions = salesReps.map(r => `${r.name} (${r.email})`).join('\n');
            const selectedIndex = prompt(`Select sales rep (enter number):\n${salesReps.map((r, i) => `${i + 1}. ${r.name} (${r.email})`).join('\n')}\n0. None`);
            if (selectedIndex !== null) {
                const index = parseInt(selectedIndex) - 1;
                if (index >= 0 && index < salesReps.length) {
                    salesRepEmail = salesReps[index].email;
                } else if (selectedIndex === '0') {
                    salesRepEmail = '';
                }
            }
        }

        const selectedSalesRep = salesReps.find(r => r.email === salesRepEmail);
        const salesRepName = selectedSalesRep ? selectedSalesRep.name : '';

        // Update account
        const accounts = await DataManager.getAccounts();
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].name = name.trim();
            accounts[accountIndex].industry = industry.trim();
            accounts[accountIndex].salesRep = salesRepName;
            accounts[accountIndex].salesRepEmail = selectedSalesRep?.email || '';
            const newRegion = selectedSalesRep?.region || accounts[accountIndex].salesRepRegion || ((await DataManager.getRegions())[0] || '');
            accounts[accountIndex].salesRepRegion = newRegion;
            accounts[accountIndex].updatedAt = new Date().toISOString();
            if (typeof console !== 'undefined' && console.log) {
                console.log('PAMS: Account region set', { accountId, accountName: name, salesRepRegion: newRegion, fromRep: selectedSalesRep?.name });
            }
            await DataManager.saveAccounts(accounts);

            UI.showNotification('Account updated successfully', 'success');
            await this.loadAccountsView();
        }
    },

    // Ensure merge account modal exists (search + checkbox list, then Merge button)
    ensureMergeAccountModal() {
        const modalId = 'mergeAccountModal';
        if (document.getElementById(modalId)) return;
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        const modalHTML = `
            <div id="${modalId}" class="modal" data-merge-source-id="">
                <div class="modal-content" style="max-width: 520px;">
                    <div class="modal-header">
                        <h2 class="modal-title" id="mergeAccountModalTitle">Merge account into...</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted" style="margin-bottom: 0.75rem; font-size: 0.9rem;">Select the account to merge into (search and choose one).</p>
                        <input type="text" id="mergeAccountSearch" class="form-control" placeholder="Search by name, industry, sales rep..." style="margin-bottom: 1rem;" autocomplete="off">
                        <div id="mergeAccountList" class="merge-account-list" style="max-height: 280px; overflow-y: auto; border: 1px solid var(--gray-200, #e5e7eb); border-radius: 6px; padding: 0.25rem;"></div>
                        <p id="mergeAccountNoResults" class="text-muted" style="display: none; margin-top: 0.5rem; font-size: 0.9rem;">No accounts match your search.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                        <button type="button" class="btn btn-primary" id="mergeAccountConfirmBtn" disabled onclick="App.confirmMergeAccount()">Merge</button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
        const searchInput = document.getElementById('mergeAccountSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterMergeAccountList());
        }
    },

    filterMergeAccountList() {
        const query = (document.getElementById('mergeAccountSearch')?.value || '').toLowerCase().trim();
        const list = document.getElementById('mergeAccountList');
        const noResults = document.getElementById('mergeAccountNoResults');
        if (!list) return;
        const rows = list.querySelectorAll('.merge-account-row');
        let visible = 0;
        rows.forEach(row => {
            const searchText = (row.getAttribute('data-search') || '').toLowerCase();
            const show = !query || searchText.includes(query);
            row.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        if (noResults) noResults.style.display = visible === 0 && rows.length > 0 ? 'block' : 'none';
    },

    // Show merge account modal with search + select list
    async showMergeAccountModal(accountId) {
        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only administrators can merge accounts.', 'error');
            return;
        }
        const account = await DataManager.getAccountById(accountId);
        if (!account) {
            UI.showNotification('Account not found', 'error');
            return;
        }
        const accounts = await DataManager.getAccounts();
        const others = accounts.filter(a => a.id !== accountId);
        if (others.length === 0) {
            UI.showNotification('No other accounts to merge with', 'error');
            return;
        }

        this.ensureMergeAccountModal();
        const modalId = 'mergeAccountModal';
        const modal = document.getElementById(modalId);
        const titleEl = document.getElementById('mergeAccountModalTitle');
        const listEl = document.getElementById('mergeAccountList');
        const searchInput = document.getElementById('mergeAccountSearch');
        const confirmBtn = document.getElementById('mergeAccountConfirmBtn');
        const noResults = document.getElementById('mergeAccountNoResults');

        if (modal) modal.dataset.mergeSourceId = accountId;
        if (titleEl) titleEl.textContent = `Merge "${account.name}" into...`;
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Search by name, industry, sales rep...';
        }
        if (noResults) noResults.style.display = 'none';

        const searchable = (a) => [a.name, a.industry, a.salesRep, a.salesRepRegion].filter(Boolean).join(' ').toLowerCase();
        const rowHTML = others.map(a => `
            <label class="merge-account-row" data-search="${searchable(a)}" style="display: block; padding: 0.5rem 0.75rem; margin: 0; cursor: pointer; border-radius: 4px;">
                <input type="radio" name="mergeTargetAccount" value="${a.id}" style="margin-right: 0.5rem;">
                <strong>${a.name}</strong>
                <span class="text-muted" style="font-size: 0.9rem;"> · ${a.industry || 'N/A'} · ${a.salesRep || 'N/A'}</span>
            </label>
        `).join('');
        if (listEl) {
            listEl.innerHTML = rowHTML;
            listEl.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    if (confirmBtn) confirmBtn.disabled = false;
                });
            });
        }
        if (confirmBtn) confirmBtn.disabled = true;

        UI.showModal(modalId);
    },

    confirmMergeAccount() {
        const modal = document.getElementById('mergeAccountModal');
        const sourceId = modal?.dataset?.mergeSourceId;
        const selected = document.querySelector('input[name="mergeTargetAccount"]:checked');
        if (!sourceId) {
            UI.showNotification('Merge session expired. Please try again.', 'error');
            UI.hideModal('mergeAccountModal');
            return;
        }
        if (!selected) {
            UI.showNotification('Please select an account to merge into.', 'error');
            return;
        }
        const targetId = selected.value;
        UI.hideModal('mergeAccountModal');
        this.mergeAccounts(sourceId, targetId);
    },

    // Merge accounts
    async mergeAccounts(sourceAccountId, targetAccountId) {
        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only administrators can merge accounts.', 'error');
            return;
        }
        const sourceAccount = await DataManager.getAccountById(sourceAccountId);
        const targetAccount = await DataManager.getAccountById(targetAccountId);

        if (!sourceAccount || !targetAccount) {
            UI.showNotification('One or both accounts not found', 'error');
            return;
        }

        // Check for conflicts
        const conflicts = [];
        if (sourceAccount.salesRep !== targetAccount.salesRep) {
            conflicts.push({
                field: 'Sales Rep',
                source: sourceAccount.salesRep || 'None',
                target: targetAccount.salesRep || 'None'
            });
        }
        if (sourceAccount.industry !== targetAccount.industry) {
            conflicts.push({
                field: 'Industry',
                source: sourceAccount.industry || 'None',
                target: targetAccount.industry || 'None'
            });
        }

        // Show conflicts and get user choices
        let finalSalesRep = targetAccount.salesRep;
        let finalIndustry = targetAccount.industry;

        if (conflicts.length > 0) {
            let conflictMsg = 'Conflicts detected:\n\n';
            conflicts.forEach(c => {
                conflictMsg += `${c.field}:\n  Source: ${c.source}\n  Target: ${c.target}\n\n`;
            });
            conflictMsg += 'Enter "1" to use Source values, "2" to use Target values, or "3" to cancel:';

            const choice = prompt(conflictMsg);
            if (choice === '3' || choice === null) return;

            if (choice === '1') {
                finalSalesRep = sourceAccount.salesRep;
                finalIndustry = sourceAccount.industry;
            }
        }

        // Merge projects
        const mergedProjects = [...(targetAccount.projects || [])];
        (sourceAccount.projects || []).forEach(project => {
            // Check for duplicate project names
            const existing = mergedProjects.find(p => p.name === project.name);
            if (!existing) {
                mergedProjects.push(project);
            } else {
                // Merge project activities
                if (project.activities) {
                    if (!existing.activities) existing.activities = [];
                    existing.activities.push(...project.activities);
                }
            }
        });

        // Update target account
        const accounts = await DataManager.getAccounts();
        const targetIndex = accounts.findIndex(a => a.id === targetAccountId);
        if (targetIndex !== -1) {
            accounts[targetIndex].salesRep = finalSalesRep;
            const salesRepsList = typeof DataManager.getGlobalSalesReps === 'function' ? await DataManager.getGlobalSalesReps() : [];
            const finalRepRecord = salesRepsList.find(rep => rep.name === finalSalesRep) || null;
            accounts[targetIndex].salesRepEmail = finalRepRecord?.email || accounts[targetIndex].salesRepEmail || '';
            accounts[targetIndex].salesRepRegion = finalRepRecord?.region || accounts[targetIndex].salesRepRegion || (typeof DataManager !== 'undefined' && DataManager.getRegions && (await DataManager.getRegions())[0]) || '';
            accounts[targetIndex].industry = finalIndustry;
            accounts[targetIndex].projects = mergedProjects;
            accounts[targetIndex].updatedAt = new Date().toISOString();

            // Update only external (customer) activities – internal activities stay in internalActivities key
            const externalActivities = await DataManager.getActivities();
            let activitiesUpdated = 0;
            externalActivities.forEach(activity => {
                if (activity.accountId === sourceAccountId) {
                    activity.accountId = targetAccountId;
                    activity.accountName = targetAccount.name;
                    activitiesUpdated++;
                }
            });
            try {
                await DataManager.saveActivities(externalActivities);
            } catch (err) {
                console.error('Merge: saveActivities failed', err);
                UI.showNotification('Merge failed: could not save activities. Try again or refresh.', 'error');
                return;
            }

            // Remove source account and persist (deleteAccount saves activities + accounts)
            try {
                await DataManager.deleteAccount(sourceAccountId);
            } catch (err) {
                console.error('Merge: deleteAccount/save failed', err);
                UI.showNotification('Merge failed: could not save. Activities were moved – please refresh and try merging again.', 'error');
                return;
            }

            UI.showNotification(`Accounts merged successfully. "${sourceAccount.name}" merged into "${targetAccount.name}"${activitiesUpdated ? ` (${activitiesUpdated} activities moved)` : ''}.`, 'success');
            this.loadAccountsView();
        }
    },

    // Show delete account modal
    async showDeleteAccountModal(accountId) {
        if (!(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin())) {
            UI.showNotification('Only administrators can delete accounts.', 'error');
            return;
        }
        const account = await DataManager.getAccountById(accountId);
        if (!account) {
            UI.showNotification('Account not found', 'error');
            return;
        }

        const projectCount = account.projects?.length || 0;
        const activityCount = await this.getAccountActivityCount(accountId);

        let message = `Are you sure you want to delete "${account.name}"?\n\n`;
        message += `This will delete:\n`;
        message += `- ${projectCount} project(s)\n`;
        message += `- ${activityCount} activity/activities\n\n`;
        message += `This action cannot be undone!\n\n`;
        message += `Enter "DELETE" to confirm:`;

        const confirmation = prompt(message);
        if (confirmation !== 'DELETE') {
            return;
        }

        // Check for activities with different sales reps
        const allActivitiesForDelete = await DataManager.getAllActivities();
        const activities = allActivitiesForDelete.filter(a => a.accountId === accountId);
        const uniqueSalesReps = [...new Set(activities.map(a => a.salesRep).filter(Boolean))];

        if (uniqueSalesReps.length > 1) {
            const salesRepMsg = `Warning: Activities have different sales reps:\n${uniqueSalesReps.join(', ')}\n\n`;
            const salesRepMsg2 = `Do you want to reassign activities to another account before deletion?\n\n`;
            const salesRepMsg3 = `Enter account name to reassign, or "DELETE" to proceed with deletion:`;
            const reassign = prompt(salesRepMsg + salesRepMsg2 + salesRepMsg3);

            if (reassign && reassign !== 'DELETE') {
                const allAccounts = await DataManager.getAccounts();
                const targetAccount = allAccounts.find(a => a.name.toLowerCase() === reassign.toLowerCase());
                if (targetAccount) {
                    // Reassign: get full activities list, update the ones for this account, then save
                    const externalActivities = await DataManager.getActivities();
                    externalActivities.forEach(activity => {
                        if (activity.accountId === accountId) {
                            activity.accountId = targetAccount.id;
                            activity.accountName = targetAccount.name;
                        }
                    });
                    await DataManager.saveActivities(externalActivities);
                    UI.showNotification(`Activities reassigned to "${targetAccount.name}"`, 'success');
                } else {
                    UI.showNotification('Account not found. Deletion cancelled.', 'error');
                    return;
                }
            }
        }

        // Delete account (this will also delete projects and activities)
        await DataManager.deleteAccount(accountId);

        UI.showNotification('Account deleted successfully', 'success');
        this.loadAccountsView();
    },

    async renderActivitiesList(containerId = 'activitiesContent') {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Activities container not found:', containerId);
                return;
            }

            const allActivities = await DataManager.getAllActivities();
            const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
                ? Auth.getCurrentUser()
                : null;
            const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();

            if (containerId === 'activitiesContent') {
                await this.populateActivityFilterControls();
            }

            const applyFilters = containerId === 'activitiesContent';
            let activities = applyFilters ? await this.applyActivityFilters(allActivities) : allActivities;

            // Apply sorting
            activities = this.applyActivitySorting(activities);

            if (activities.length === 0) {
                container.innerHTML = UI.emptyState(applyFilters ? 'No activities match the current filters.' : 'No activities found');
                return;
            }

            const viewMode = this.activitiesViewMode || 'cards';

            if (viewMode === 'table') {
                container.innerHTML = this.renderActivitiesTable(activities, currentUser, isAdmin);
            } else {
                container.innerHTML = this.renderActivitiesCards(activities, currentUser, isAdmin);
            }
        } catch (error) {
            console.error('Error loading activities view:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = UI.emptyState('Error loading activities');
            }
        }
    },

    renderActivitiesCards(activities, currentUser, isAdmin) {
        const activityTypeColors = {
            'customerCall': '#4299E1',
            'sow': '#48BB78',
            'poc': '#ED8936',
            'rfx': '#9F7AEA',
            'pricing': '#F56565',
            'other': '#718096'
        };

        const activitiesByMonth = {};
        activities.forEach(activity => {
            const month = (DataManager.resolveActivityMonth && DataManager.resolveActivityMonth(activity)) || (activity.date || '').substring(0, 7) || 'Unknown';
            if (!activitiesByMonth[month]) {
                activitiesByMonth[month] = [];
            }
            activitiesByMonth[month].push(activity);
        });

        let html = '';
        Object.keys(activitiesByMonth).sort().reverse().forEach(month => {
            html += `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3>${DataManager.formatMonth(month)}</h3>
                    </div>
                    <div class="card-body">
            `;

            activitiesByMonth[month].forEach(activity => {
                const isOwner = currentUser
                    ? activity.userId === currentUser.id || activity.createdBy === currentUser.id
                    : false;
                const canManage = isOwner || isAdmin;

                const activityType = activity.type || 'other';
                const typeColor = activityTypeColors[activityType.toLowerCase()] || activityTypeColors.other;
                const typeLabel = UI.getActivityTypeLabel(activityType);

                if (activity.isInternal) {
                    const activityName = activity.activityName || typeLabel || 'Internal Activity';
                    html += `
                        <div class="activity-item">
                            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <span class="activity-badge internal">Internal</span>
                                    </div>
                                    <div style="margin-bottom: 0.5rem;">
                                        <span class="activity-highlight internal-name" style="color: ${typeColor}; font-weight: 600;">${activityName}</span>
                                        <span style="color: var(--gray-600);"> - </span>
                                        <span class="activity-highlight type" style="color: ${typeColor}; font-weight: 600;">${typeLabel}</span>
                                    </div>
                                    <div class="activity-meta">
                                        <span>Entered by: <strong>${activity.userName || 'Unknown'}</strong></span>
                                        <span>•</span>
                                        <span>Date: <strong>${UI.formatDate(activity.date || activity.createdAt)}</strong></span>
                                    </div>
                                    ${activity.description ? `<div style="margin-top: 0.5rem; color: var(--gray-600); font-size: 0.875rem;">${activity.description}</div>` : ''}
                                </div>
                                ${canManage ? `
                                    <div class="activity-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="App.editActivity('${activity.id}', true)">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="App.deleteActivity('${activity.id}', true)">Delete</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                } else {
                    const accountName = activity.accountName || 'N/A';
                    const projectName = activity.projectName || '';
                    html += `
                        <div class="activity-item">
                            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                                <div style="flex: 1;">
                                    <div style="margin-bottom: 0.5rem; font-size: 1rem;">
                                        <span class="activity-badge external">External</span>
                                        <span class="activity-highlight account" style="color: #3182CE; font-weight: 600;">${accountName}</span>
                                        ${projectName ? `<span style="color: var(--gray-400);"> → </span><span class="activity-highlight project" style="color: #38A169; font-weight: 600;">${projectName}</span>` : ''}
                                        <span style="color: var(--gray-400);"> → </span>
                                        <span class="activity-highlight type" style="color: ${typeColor}; font-weight: 600;">${typeLabel}</span>
                                    </div>
                                    <div class="activity-meta">
                                        <span>Entered by: <strong>${activity.userName || 'Unknown'}</strong></span>
                                        <span>•</span>
                                        <span>Date: <strong>${UI.formatDate(activity.date || activity.createdAt)}</strong></span>
                                    </div>
                                    ${activity.summary ? `<div style="margin-top: 0.5rem; color: var(--gray-600); font-size: 0.875rem;">${activity.summary}</div>` : ''}
                                </div>
                                ${canManage ? `
                                    <div class="activity-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="App.editActivity('${activity.id}', false)">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="App.deleteActivity('${activity.id}', false)">Delete</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }
            });

            html += `
                    </div>
                </div>
            `;
        });

        return html;
    },

    renderActivitiesTable(activities, currentUser, isAdmin) {
        const activityTypeColors = {
            'customerCall': '#4299E1',
            'sow': '#48BB78',
            'poc': '#ED8936',
            'rfx': '#9F7AEA',
            'pricing': '#F56565',
            'other': '#718096'
        };

        const activitiesByMonth = {};
        activities.forEach(activity => {
            const month = (DataManager.resolveActivityMonth && DataManager.resolveActivityMonth(activity)) || (activity.date || '').substring(0, 7) || 'Unknown';
            if (!activitiesByMonth[month]) {
                activitiesByMonth[month] = [];
            }
            activitiesByMonth[month].push(activity);
        });

        let html = '';
        Object.keys(activitiesByMonth).sort().reverse().forEach(month => {
            html += `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3>${DataManager.formatMonth(month)}</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <table class="activities-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Account / Activity</th>
                                    <th>Project</th>
                                    <th>Activity Type</th>
                                    <th>Entered By</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            activitiesByMonth[month].forEach(activity => {
                const isOwner = currentUser
                    ? activity.userId === currentUser.id || activity.createdBy === currentUser.id
                    : false;
                const canManage = isOwner || isAdmin;

                const activityType = activity.type || 'other';
                const typeColor = activityTypeColors[activityType.toLowerCase()] || activityTypeColors.other;
                const typeLabel = UI.getActivityTypeLabel(activityType);

                if (activity.isInternal) {
                    const activityName = activity.activityName || typeLabel || 'Internal Activity';
                    html += `
                        <tr>
                            <td><span class="activity-badge internal">Internal</span></td>
                            <td><span class="activity-highlight internal-name" style="color: ${typeColor}; font-weight: 600;">${activityName}</span></td>
                            <td>-</td>
                            <td><span class="activity-highlight type" style="color: ${typeColor}; font-weight: 600;">${typeLabel}</span></td>
                            <td>${activity.userName || 'Unknown'}</td>
                            <td>${UI.formatDate(activity.date || activity.createdAt)}</td>
                            <td>
                                ${canManage ? `
                                    <button class="btn btn-xs btn-secondary" onclick="App.editActivity('${activity.id}', true)">Edit</button>
                                    <button class="btn btn-xs btn-danger" onclick="App.deleteActivity('${activity.id}', true)">Delete</button>
                                ` : '-'}
                            </td>
                        </tr>
                    `;
                } else {
                    const accountName = activity.accountName || 'N/A';
                    const projectName = activity.projectName || '-';
                    html += `
                        <tr>
                            <td><span class="activity-badge external">External</span></td>
                            <td><span class="activity-highlight account" style="color: #3182CE; font-weight: 600;">${accountName}</span></td>
                            <td><span class="activity-highlight project" style="color: #38A169; font-weight: 600;">${projectName}</span></td>
                            <td><span class="activity-highlight type" style="color: ${typeColor}; font-weight: 600;">${typeLabel}</span></td>
                            <td>${activity.userName || 'Unknown'}</td>
                            <td>${UI.formatDate(activity.date || activity.createdAt)}</td>
                            <td>
                                ${canManage ? `
                                    <button class="btn btn-xs btn-secondary" onclick="App.editActivity('${activity.id}', false)">Edit</button>
                                    <button class="btn btn-xs btn-danger" onclick="App.deleteActivity('${activity.id}', false)">Delete</button>
                                ` : '-'}
                            </td>
                        </tr>
                    `;
                }
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        return html;
    },

    applyActivitySorting(activities) {
        const sortBy = this.activitySortBy || 'dateDesc';
        const sorted = [...activities];

        sorted.sort((a, b) => {
            switch (sortBy) {
                case 'dateDesc':
                    const dateA = new Date(a.date || a.createdAt);
                    const dateB = new Date(b.date || b.createdAt);
                    return dateB - dateA;
                case 'dateAsc':
                    const dateA2 = new Date(a.date || a.createdAt);
                    const dateB2 = new Date(b.date || b.createdAt);
                    return dateA2 - dateB2;
                case 'accountAsc':
                    const accountA = (a.accountName || '').toLowerCase();
                    const accountB = (b.accountName || '').toLowerCase();
                    return accountA.localeCompare(accountB);
                case 'accountDesc':
                    const accountA2 = (a.accountName || '').toLowerCase();
                    const accountB2 = (b.accountName || '').toLowerCase();
                    return accountB2.localeCompare(accountA2);
                case 'typeAsc':
                    const typeA = (UI.getActivityTypeLabel(a.type) || '').toLowerCase();
                    const typeB = (UI.getActivityTypeLabel(b.type) || '').toLowerCase();
                    return typeA.localeCompare(typeB);
                case 'typeDesc':
                    const typeA2 = (UI.getActivityTypeLabel(a.type) || '').toLowerCase();
                    const typeB2 = (UI.getActivityTypeLabel(b.type) || '').toLowerCase();
                    return typeB2.localeCompare(typeA2);
                case 'userAsc':
                    const userA = (a.userName || '').toLowerCase();
                    const userB = (b.userName || '').toLowerCase();
                    return userA.localeCompare(userB);
                case 'userDesc':
                    const userA2 = (a.userName || '').toLowerCase();
                    const userB2 = (b.userName || '').toLowerCase();
                    return userB2.localeCompare(userA2);
                default:
                    return 0;
            }
        });

        return sorted;
    },

    setActivitiesViewMode(mode) {
        this.activitiesViewMode = mode;
        // Update toggle buttons
        const cardsBtn = document.getElementById('activitiesViewModeCards');
        const tableBtn = document.getElementById('activitiesViewModeTable');
        if (cardsBtn && tableBtn) {
            if (mode === 'cards') {
                cardsBtn.classList.remove('btn-outline');
                cardsBtn.classList.add('btn-primary');
                tableBtn.classList.remove('btn-primary');
                tableBtn.classList.add('btn-outline');
            } else {
                tableBtn.classList.remove('btn-outline');
                tableBtn.classList.add('btn-primary');
                cardsBtn.classList.remove('btn-primary');
                cardsBtn.classList.add('btn-outline');
            }
        }
        this.renderActivitiesList();
    },

    toggleActivitiesSidebar() {
        const sidebar = document.querySelector('.activities-sidebar');
        const icon = document.getElementById('activitiesSidebarToggleIcon');
        const toggleBtn = document.getElementById('activitiesSidebarToggleBtn');
        if (sidebar) {
            const isCollapsing = !sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            if (icon) {
                icon.textContent = sidebar.classList.contains('collapsed') ? '▶' : '▼';
            }
            // Show/hide the toggle button in header when sidebar is collapsed
            if (toggleBtn) {
                toggleBtn.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
            }
        }
    },

    handleActivitySortChange() {
        const sortSelect = document.getElementById('activitySortBy');
        if (sortSelect) {
            this.activitySortBy = sortSelect.value;
            this.renderActivitiesList();
        }
    },

    // Load user regions (legacy - kept for compatibility)
    async loadUserRegions() {
        try {
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) {
                console.error('No current user for loadUserRegions');
                return;
            }

            const allRegions = await DataManager.getRegions();
            const userRegions = currentUser.regions || [];
            const container = document.getElementById('userRegionsList');
            if (!container) {
                console.error('userRegionsList container not found');
                return;
            }

            console.log('Loading regions. All:', allRegions.length, 'User:', userRegions.length);

            if (allRegions.length === 0) {
                container.innerHTML = '<p class="text-muted">No regions available</p>';
                return;
            }

            let html = '';
            allRegions.forEach(region => {
                const checked = userRegions.includes(region) ? 'checked' : '';
                html += `
                    <div class="settings-item">
                        <input type="checkbox" id="region_${region}" ${checked} value="${region}">
                        <label for="region_${region}">${region}</label>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading user regions:', error);
        }
    },

    // Save user regions
    async saveUserRegions() {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const checkboxes = document.querySelectorAll('#userRegionsList input[type="checkbox"]:checked');
        const regions = Array.from(checkboxes).map(cb => cb.value);

        await DataManager.updateUser(currentUser.id, { regions });
        Auth.currentUser.regions = regions;
        UI.showNotification('Regions saved successfully', 'success');
    },

    // Load user sales reps
    async loadUserSalesReps() {
        try {
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) {
                console.error('No current user for loadUserSalesReps');
                return;
            }

            const salesReps = currentUser.salesReps || [];
            const container = document.getElementById('salesRepsList');
            if (!container) {
                console.error('salesRepsList container not found');
                return;
            }

            console.log('Loading sales reps:', salesReps.length);

            if (salesReps.length === 0) {
                container.innerHTML = '<p class="text-muted">No sales reps added</p>';
                return;
            }

            let html = '';
            salesReps.forEach(rep => {
                html += `
                    <div class="settings-item">
                        <span>${rep}</span>
                        <button class="btn btn-sm btn-danger" onclick="App.removeSalesRep('${rep}')">Remove</button>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading user sales reps:', error);
        }
    },

    // Add sales rep
    async addSalesRep() {
        const input = document.getElementById('newSalesRep');
        const rep = input.value.trim();

        if (!rep) {
            UI.showNotification('Please enter a sales rep name', 'error');
            return;
        }

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const salesReps = currentUser.salesReps || [];
        if (salesReps.includes(rep)) {
            UI.showNotification('Sales rep already exists', 'error');
            return;
        }

        salesReps.push(rep);
        await DataManager.updateUser(currentUser.id, { salesReps });
        Auth.currentUser.salesReps = salesReps;

        input.value = '';
        UI.showNotification('Sales rep added successfully', 'success');
        await this.loadUserSalesReps();
    },

    // Remove sales rep
    async removeSalesRep(rep) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const salesReps = (currentUser.salesReps || []).filter(r => r !== rep);
        await DataManager.updateUser(currentUser.id, { salesReps });
        Auth.currentUser.salesReps = salesReps;

        UI.showNotification('Sales rep removed successfully', 'success');
        await this.loadUserSalesReps();
    },

    // Open win/loss modal
    async openWinLossModal(accountId, projectId) {
        if (!this.isFeatureEnabled('winLoss')) {
            UI.showNotification(this.getAccessMessage('winLoss', 'feature'), 'info');
            return;
        }
        if (!this.isDashboardVisible('winLoss')) {
            UI.showNotification(this.getAccessMessage('winLoss', 'visibility'), 'info');
            return;
        }
        this.createWinLossModal();

        const accounts = await DataManager.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        const project = account?.projects?.find(p => p.id === projectId);

        if (!project) {
            UI.showNotification('Project not found', 'error');
            return;
        }

        const accountSalesRep = await DataManager.getGlobalSalesRepByName(account?.salesRep || '');
        const existingWinLoss = project.winLossData || {};
        const defaultCurrency = existingWinLoss.currency || accountSalesRep?.currency || 'INR';
        const defaultFx = existingWinLoss.fxToInr !== undefined && existingWinLoss.fxToInr !== null ? Number(existingWinLoss.fxToInr) : (accountSalesRep && accountSalesRep.fxToInr ? Number(accountSalesRep.fxToInr) : null);

        document.getElementById('winLossAccountId').value = accountId;
        document.getElementById('winLossProjectId').value = projectId;
        document.getElementById('winLossStatus').value = project.status || 'active';
        const sfdcInput = document.getElementById('winLossSfdcLink');
        const reasonInput = document.getElementById('winLossReason');
        const competitorInput = document.getElementById('competitorAnalysis');
        const mrrInput = document.getElementById('winLossMRR');
        const accountTypeSelect = document.getElementById('accountType');
        const otdInput = document.getElementById('winLossOtd');
        const currencySelect = document.getElementById('winLossCurrency');

        const monthOfWinInput = document.getElementById('winLossMonthOfWin');
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (monthOfWinInput) {
            monthOfWinInput.value = project.winLossData?.monthOfWin || defaultMonth;
        }
        const wonBySelect = document.getElementById('winLossWonBy');
        if (wonBySelect) {
            const allUsers = (typeof DataManager !== 'undefined' && DataManager.getUsers) ? await DataManager.getUsers() : [];
            const presalesUsers = allUsers.filter(u => u && Array.isArray(u.roles) && u.roles.includes('Presales User'));
            wonBySelect.innerHTML = '<option value="">Select presales</option>' +
                presalesUsers.map(u => `<option value="${u.id}">${u.username || u.name || u.id}</option>`).join('');
            wonBySelect.value = project.winLossData?.wonByUserId || '';
        }
        if (project.winLossData) {
            if (reasonInput) reasonInput.value = project.winLossData.reason || '';
            if (competitorInput) competitorInput.value = project.winLossData.competitors || '';
            if (mrrInput) mrrInput.value = project.winLossData.mrr ?? '';
            if (accountTypeSelect) accountTypeSelect.value = project.winLossData.accountType || 'existing';
            if (otdInput) otdInput.value = project.winLossData.otd || '';
            if (wonBySelect) wonBySelect.value = project.winLossData.wonByUserId || '';
            if (sfdcInput) {
                sfdcInput.value = project.sfdcLink || '';
            }
        } else {
            if (reasonInput) reasonInput.value = '';
            if (competitorInput) competitorInput.value = '';
            if (mrrInput) mrrInput.value = '';
            if (accountTypeSelect) accountTypeSelect.value = 'existing';
            if (otdInput) otdInput.value = '';
            if (wonBySelect) wonBySelect.value = '';
            if (sfdcInput) sfdcInput.value = project.sfdcLink || '';
        }

        if (mrrInput) {
            mrrInput.dataset.currency = defaultCurrency || 'INR';
            if (!Number.isNaN(defaultFx) && defaultFx) {
                mrrInput.dataset.fx = String(defaultFx);
            } else {
                delete mrrInput.dataset.fx;
            }
            if (!this.winLossMrrInputHandler) {
                this.winLossMrrInputHandler = () => this.updateWinLossMrrHelper();
            }
            mrrInput.removeEventListener('input', this.winLossMrrInputHandler);
            mrrInput.addEventListener('input', this.winLossMrrInputHandler);
        }
        if (currencySelect) {
            currencySelect.value = defaultCurrency || 'INR';
            this.handleWinLossCurrencyChange(currencySelect.value);
        }

        this.toggleWinLossFields();
        this.updateWinLossMrrHelper();

        UI.showModal('winLossModal');
    },

    // Create Win/Loss modal
    createWinLossModal() {
        const container = document.getElementById('modalsContainer');
        const modalId = 'winLossModal';

        if (document.getElementById(modalId)) return;

        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Update Project Status</h2>
                        <button class="modal-close" onclick="UI.hideModal('${modalId}')">&times;</button>
                    </div>
                    <form id="winLossForm" onsubmit="App.saveWinLoss(event)">
                        <input type="hidden" id="winLossProjectId">
                        <input type="hidden" id="winLossAccountId">
                        <div class="form-group">
                            <label class="form-label required">Project Status</label>
                            <select class="form-control" id="winLossStatus" required onchange="App.toggleWinLossFields()">
                                <option value="">Select Status</option>
                                <option value="active">Active</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>
                        <div id="winLossFields" class="d-none">
                            <div class="form-group">
                                <label class="form-label required">SFDC Link</label>
                                <input type="url" class="form-control" id="winLossSfdcLink" placeholder="https://..." data-winloss-required="true" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label required">Reason for Win/Loss</label>
                                <textarea class="form-control" id="winLossReason" rows="3" placeholder="Explain the reason..." data-winloss-required="true" required></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Competitor Analysis</label>
                                <input type="text" class="form-control" id="competitorAnalysis" placeholder="Which competitors were involved?">
                            </div>
                            <div class="form-group">
                                <label class="form-label required">Currency</label>
                                <select class="form-control" id="winLossCurrency" data-winloss-required="true" required onchange="App.handleWinLossCurrencyChange(this.value)">
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="BRL">BRL (R$)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label required" id="winLossMrrLabel">MRR (Monthly Recurring Revenue)</label>
                                <input type="number" class="form-control" id="winLossMRR" min="0" step="100" placeholder="Enter amount" data-winloss-required="true" required>
                                <small class="text-muted" id="winLossMrrHelper"></small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Account Type</label>
                                <select class="form-control" id="accountType">
                                    <option value="existing">Existing Account</option>
                                    <option value="new">New Account</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label required">Month of Win/Loss</label>
                                <input type="month" class="form-control" id="winLossMonthOfWin" data-winloss-required="true" required title="Which month does this win/loss belong to?">
                            </div>
                            <div class="form-group">
                                <label class="form-label" id="winLossWonByLabel">Presales who won</label>
                                <select class="form-control" id="winLossWonBy" title="Select the presales user who won this project">
                                    <option value="">Select presales</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">OTD / Delivery Notes</label>
                                <textarea class="form-control" id="winLossOtd" rows="2" placeholder="Implementation commitments, next steps, delivery dates, etc."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="UI.hideModal('${modalId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Status</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Toggle Win/Loss fields
    toggleWinLossFields() {
        const status = document.getElementById('winLossStatus').value;
        const fields = document.getElementById('winLossFields');
        if (!fields) return;

        const requiresDetail = status === 'won' || status === 'lost';
        const requiredInputs = fields.querySelectorAll('[data-winloss-required]');

        if (requiresDetail) {
            fields.classList.remove('d-none');
            requiredInputs.forEach(input => input.setAttribute('required', 'required'));
            const wonBySelect = document.getElementById('winLossWonBy');
            const wonByLabel = document.getElementById('winLossWonByLabel');
            if (wonBySelect && wonByLabel) {
                if (status === 'won') {
                    wonBySelect.setAttribute('required', 'required');
                    wonByLabel.classList.add('required');
                } else {
                    wonBySelect.removeAttribute('required');
                    wonByLabel.classList.remove('required');
                }
            }
        } else {
            fields.classList.add('d-none');
            requiredInputs.forEach(input => input.removeAttribute('required'));
            const wonBySelect = document.getElementById('winLossWonBy');
            const wonByLabel = document.getElementById('winLossWonByLabel');
            if (wonBySelect) wonBySelect.removeAttribute('required');
            if (wonByLabel) wonByLabel.classList.remove('required');
        }
        this.updateWinLossMrrHelper();
    },

    // Save Win/Loss
    async saveWinLoss(event) {
        event.preventDefault();

        const accountId = document.getElementById('winLossAccountId').value;
        const projectId = document.getElementById('winLossProjectId').value;
        const status = document.getElementById('winLossStatus').value;
        const sfdcInput = document.getElementById('winLossSfdcLink');
        const sfdcLinkValue = sfdcInput ? sfdcInput.value.trim() : '';
        const mrrInput = document.getElementById('winLossMRR');
        const otdInput = document.getElementById('winLossOtd');
        UI.clearFieldError(sfdcInput);
        UI.clearFieldError(mrrInput);

        const accounts = await DataManager.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        const project = account?.projects?.find(p => p.id === projectId);

        if (!project) {
            UI.showNotification('Project not found', 'error');
            return;
        }

        project.status = status;

        if (status === 'won' || status === 'lost') {
            if (!sfdcLinkValue) {
                UI.setFieldError(sfdcInput, 'SFDC link is required for won/lost projects.');
                UI.showNotification('Please provide an SFDC link before completing win/loss updates.', 'error');
                return;
            }
            if (!/^https?:\/\//i.test(sfdcLinkValue)) {
                UI.setFieldError(sfdcInput, 'Enter a valid SFDC link including http(s)://');
                UI.showNotification('Enter a valid SFDC link (http/https).', 'error');
                return;
            }
            const mrrRaw = mrrInput ? mrrInput.value.trim() : '';
            const mrrValue = Number(mrrRaw);
            if (!Number.isFinite(mrrValue) || mrrValue < 0) {
                UI.setFieldError(mrrInput, 'Enter a positive numeric value for MRR.');
                UI.showNotification('Enter a numeric value for MRR.', 'error');
                return;
            }
            const currency = mrrInput?.dataset?.currency || 'INR';
            const fxValue = parseFloat(mrrInput?.dataset?.fx || '');
            const fxToInr = Number.isFinite(fxValue) && fxValue > 0 ? fxValue : null;
            const mrrRounded = Number(mrrValue.toFixed(2));
            const mrrInInr = currency === 'INR' ? mrrRounded : (fxToInr ? Number((mrrRounded * fxToInr).toFixed(2)) : null);

            project.sfdcLink = sfdcLinkValue;
            const monthOfWinEl = document.getElementById('winLossMonthOfWin');
            const monthOfWin = monthOfWinEl && monthOfWinEl.value ? monthOfWinEl.value : null;
            const wonByEl = document.getElementById('winLossWonBy');
            const wonByUserId = wonByEl && wonByEl.value ? wonByEl.value : null;
            if (status === 'won' && !wonByUserId) {
                UI.showNotification('Please select the presales user who won this project.', 'error');
                if (wonByEl) { wonByEl.focus(); UI.setFieldError(wonByEl, 'Required for wins'); }
                return;
            }
            const wonByUserName = wonByUserId && typeof DataManager !== 'undefined' && DataManager.getUsers
                ? (await DataManager.getUsers()).find(u => u.id === wonByUserId)?.username || null
                : null;
            project.winLossData = {
                reason: document.getElementById('winLossReason').value,
                competitors: document.getElementById('competitorAnalysis').value,
                mrr: mrrRounded,
                accountType: document.getElementById('accountType').value,
                currency,
                fxToInr,
                mrrInInr,
                otd: otdInput ? otdInput.value : '',
                monthOfWin: monthOfWin || undefined,
                wonByUserId: wonByUserId || undefined,
                wonByUserName: wonByUserName || undefined,
                updatedAt: new Date().toISOString()
            };
        } else {
            delete project.winLossData;
            if (sfdcInput && sfdcLinkValue) {
                if (!/^https?:\/\//i.test(sfdcLinkValue)) {
                    UI.setFieldError(sfdcInput, 'Enter a valid SFDC link including http(s)://');
                    UI.showNotification('Enter a valid SFDC link (http/https).', 'error');
                    return;
                }
                project.sfdcLink = sfdcLinkValue;
            }
        }

        await DataManager.saveAccounts(accounts);

        UI.hideModal('winLossModal');
        UI.showNotification('Project status updated!', 'success');
        await this.loadWinLossView();
    },

    /** Apply a win/loss draft (saved when session was invalid). Loads accounts, applies form data, saves. */
    async applyWinLossDraft(payload) {
        if (!payload || payload._winlossForm !== true || !payload.accountId || !payload.projectId) return;
        const accounts = await DataManager.getAccounts();
        const account = accounts.find(a => a.id === payload.accountId);
        const project = account?.projects?.find(p => p.id === payload.projectId);
        if (!project) {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Account or project no longer found. Discard the draft.', 'error');
            return;
        }
        project.status = payload.status || project.status;
        if (payload.sfdcLink) project.sfdcLink = payload.sfdcLink;
        if (payload.status === 'won' || payload.status === 'lost') {
            const mrr = Number(payload.mrr);
            project.winLossData = {
                reason: payload.reason || '',
                competitors: payload.competitors || '',
                mrr: Number.isFinite(mrr) ? mrr : 0,
                accountType: payload.accountType || '',
                currency: payload.currency || 'INR',
                fxToInr: payload.fxToInr || null,
                mrrInInr: payload.currency === 'INR' && Number.isFinite(mrr) ? mrr : (payload.fxToInr && Number.isFinite(mrr) ? Number((mrr * payload.fxToInr).toFixed(2)) : null),
                otd: payload.otd || '',
                monthOfWin: payload.monthOfWin || undefined,
                wonByUserId: payload.wonByUserId || undefined,
                wonByUserName: payload.wonByUserId && typeof DataManager !== 'undefined' && DataManager.getUsers
                    ? (await DataManager.getUsers()).find(u => u.id === payload.wonByUserId)?.username || null
                    : null,
                updatedAt: new Date().toISOString()
            };
        } else {
            delete project.winLossData;
        }
        await DataManager.saveAccounts(accounts);
    },

    // Edit activity (own activities only)
    async editActivity(activityId, isInternal) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        // Find activity
        let activity;
        if (isInternal) {
            const activities = await DataManager.getInternalActivities();
            activity = activities.find(a => a.id === activityId);
        } else {
            const activities = await DataManager.getActivities();
            activity = activities.find(a => a.id === activityId);
        }

        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();

        if (!activity) {
            UI.showNotification('Activity not found', 'error');
            return;
        }

        const isOwner = activity.userId === currentUser.id || activity.createdBy === currentUser.id;

        // Check if user owns this activity
        if (!isAdmin && !isOwner) {
            UI.showNotification('You can only edit your own activities', 'error');
            return;
        }

        if (typeof Activities !== 'undefined' && Activities.openActivityModal) {
            await Activities.openActivityModal({
                mode: 'edit',
                activity,
                isInternal: !!isInternal
            });
        } else {
            UI.showNotification('Activity editor not available', 'error');
        }
    },

    // Delete activity (own activities only)
    async deleteActivity(activityId, isInternal) {
        if (!confirm('Are you sure you want to delete this activity?')) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        // Find activity
        let activity;
        if (isInternal) {
            const activities = await DataManager.getInternalActivities();
            activity = activities.find(a => a.id === activityId);
        } else {
            const activities = await DataManager.getActivities();
            activity = activities.find(a => a.id === activityId);
        }

        const isAdmin = typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();

        if (!activity) {
            UI.showNotification('Activity not found', 'error');
            return;
        }

        const isOwner = activity.userId === currentUser.id || activity.createdBy === currentUser.id;

        // Check if user owns this activity
        if (!isAdmin && !isOwner) {
            UI.showNotification('You can only delete your own activities', 'error');
            return;
        }

        // Delete activity
        if (isInternal) {
            await DataManager.deleteInternalActivity(activityId);
        } else {
            await DataManager.deleteActivity(activityId);
        }

        UI.showNotification('Activity deleted successfully', 'success');
        if (this.currentView === 'activities') {
            await this.loadActivitiesView();
        } else {
            this.refreshCurrentViewData();
        }
    },
    // Expose functions globally
    openActivityModal: () => Activities.openActivityModal()
};

// Make app globally available
window.app = App;

// Make DataManager available globally for debugging
window.DataManager = DataManager;
window.Auth = Auth;

// Override analytics helpers with module-driven implementations
if (typeof Analytics !== 'undefined') {
    App.initAnalyticsCharts = async function ({ prefix = 'reports', analytics }) {
        await Analytics.renderCharts({ prefix, analytics });
    };

    App.destroyAnalyticsCharts = function (prefix) {
        Analytics.destroyCharts(prefix);
    };
}

// Utility function to reset users (for testing)
window.resetUsers = async function () {
    localStorage.removeItem('users');
    await DataManager.ensureDefaultUsers();
    const users = await DataManager.getUsers();
    console.log('Users reset. Current users:', users.map(u => u.username));
    alert('Users reset! You can now login with:\n- admin / admin123\n- user / user123');
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    App.init().catch(error => {
        console.error('Failed to initialise application', error);
    });
});

