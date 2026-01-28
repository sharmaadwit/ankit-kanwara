// Reports V2 - New reporting structure
const ReportsV2 = {
    charts: {},
    currentPeriod: null,
    currentPeriodType: 'month', // 'month' or 'year'
    cachedData: null, // Store computed data for charts
    activeTab: 'presales', // 'presales', 'sales', 'regional'
    activityBreakdownFilter: 'all', // 'all', 'sow', 'poc', 'rfx', 'pricing', 'customerCall'

    // Initialize Reports V2
    init(period, periodType = 'month') {
        this.currentPeriod = period;
        this.currentPeriodType = periodType;
        this.cachedData = null; // Clear cache
        this.activeTab = 'presales';
        this.activityBreakdownFilter = 'all';
        this.render();
    },

    // Switch active tab
    switchTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    // Change activity breakdown filter
    changeActivityBreakdownFilter(filter) {
        this.activityBreakdownFilter = filter;
        const activities = this.getPeriodActivities();
        this.initActivityBreakdownChart(activities);
    },

    // Get activities for the selected period
    getPeriodActivities() {
        if (!this.currentPeriod) {
            console.warn('ReportsV2: currentPeriod is not set');
            return [];
        }

        const allActivities = DataManager.getAllActivities();
        if (!allActivities || !allActivities.length) {
            console.warn('ReportsV2: No activities found in DataManager');
            return [];
        }

        const period = this.currentPeriod;
        const isYear = this.currentPeriodType === 'year';

        const filtered = allActivities.filter(activity => {
            const activityDate = activity.date || activity.createdAt;
            if (!activityDate) return false;

            if (isYear) {
                const activityYear = activityDate.substring(0, 4);
                return activityYear === period;
            } else {
                const activityMonth = activityDate.substring(0, 7);
                return activityMonth === period;
            }
        });

        console.log(`ReportsV2: Found ${filtered.length} activities for period ${period} (${isYear ? 'year' : 'month'})`);
        return filtered;
    },

    // Format period display
    formatPeriod(period) {
        if (this.currentPeriodType === 'year') {
            return period;
        }
        if (typeof DataManager !== 'undefined' && typeof DataManager.formatMonth === 'function') {
            return DataManager.formatMonth(period);
        }
        const [year, month] = period.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    },

    // Navigate to previous period
    navigatePrevious() {
        if (this.currentPeriodType === 'year') {
            const year = parseInt(this.currentPeriod);
            this.currentPeriod = String(year - 1);
        } else {
            const [year, month] = this.currentPeriod.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            date.setMonth(date.getMonth() - 1);
            this.currentPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        this.render();
    },

    // Navigate to next period
    navigateNext() {
        if (this.currentPeriodType === 'year') {
            const year = parseInt(this.currentPeriod);
            this.currentPeriod = String(year + 1);
        } else {
            const [year, month] = this.currentPeriod.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            date.setMonth(date.getMonth() + 1);
            this.currentPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        this.render();
    },

    // Switch between monthly and annual
    switchPeriodType(type) {
        this.currentPeriodType = type;
        const today = new Date();
        if (type === 'year') {
            this.currentPeriod = String(today.getFullYear());
        } else {
            this.currentPeriod = today.toISOString().substring(0, 7);
        }
        this.render();
    },

    // Destroy all charts
    destroyCharts() {
        Object.keys(this.charts).forEach(canvasId => {
            if (this.charts[canvasId] && typeof this.charts[canvasId].destroy === 'function') {
                this.charts[canvasId].destroy();
            }
        });
        this.charts = {};
    },

    // Main render function
    render() {
        // Ensure we wait for DOM to be ready
        const container = document.getElementById('reportsContent');
        if (!container) {
            console.error('ReportsV2: reportsContent container not found. Retrying in 100ms...');
            setTimeout(() => this.render(), 100);
            return;
        }

        // Check if container is in a hidden view
        const reportsView = document.getElementById('reportsView');
        if (reportsView && reportsView.classList.contains('hidden')) {
            console.warn('ReportsV2: reportsView is hidden, waiting for view to be shown...');
            setTimeout(() => this.render(), 100);
            return;
        }

        // Check dependencies
        if (typeof DataManager === 'undefined') {
            console.error('ReportsV2: DataManager not available');
            container.innerHTML = '<div class="error-message">DataManager not loaded. Please refresh the page.</div>';
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error('ReportsV2: Chart.js not loaded');
            container.innerHTML = '<div class="error-message">Chart.js library not loaded. Please check your internet connection.</div>';
            return;
        }

        if (!this.currentPeriod) {
            console.error('ReportsV2: currentPeriod is null, cannot render');
            container.innerHTML = '<div class="error-message">Reports period not set. Please try refreshing the page.</div>';
            return;
        }

        try {
            // Destroy existing charts before re-rendering
            this.destroyCharts();

            const activities = this.getPeriodActivities();
            const periodLabel = this.formatPeriod(this.currentPeriod);
            
            console.log(`ReportsV2: Rendering reports for period ${this.currentPeriod} (${this.currentPeriodType}), ${activities.length} activities`);
            
            // Compute and cache data for charts
            this.cachedData = this.computeReportData(activities);

            container.innerHTML = `
                <div class="reports-v2-container">
                    ${this.renderHeader(periodLabel)}
                    ${this.renderTabNavigation()}
                    ${this.renderTabContent(activities)}
                </div>
            `;

            // Initialize charts after render - use requestAnimationFrame for better timing
            requestAnimationFrame(() => {
                setTimeout(() => {
                    try {
                        this.initCharts(activities);
                    } catch (error) {
                        console.error('ReportsV2: Error initializing charts:', error);
                    }
                }, 100);
            });
        } catch (error) {
            console.error('ReportsV2: Error in render():', error);
            container.innerHTML = `<div class="error-message">Error loading reports: ${error.message}</div>`;
        }
    },

    // Render tab navigation
    renderTabNavigation() {
        return `
            <div class="reports-v2-tabs">
                <button class="reports-v2-tab ${this.activeTab === 'presales' ? 'active' : ''}" 
                        onclick="ReportsV2.switchTab('presales')">
                    Presales Reports
                </button>
                <button class="reports-v2-tab ${this.activeTab === 'sales' ? 'active' : ''}" 
                        onclick="ReportsV2.switchTab('sales')">
                    Sales View
                </button>
                <button class="reports-v2-tab ${this.activeTab === 'regional' ? 'active' : ''}" 
                        onclick="ReportsV2.switchTab('regional')">
                    Regional Data
                </button>
            </div>
        `;
    },

    // Render tab content based on active tab
    renderTabContent(activities) {
        switch(this.activeTab) {
            case 'presales':
                return `
                    ${this.renderPresalesReports(activities)}
                    ${this.renderProductLevelData(activities)}
                `;
            case 'sales':
                return this.renderSalesView(activities);
            case 'regional':
                return this.renderRegionalData(activities);
            default:
                return this.renderPresalesReports(activities);
        }
    },

    // Compute all report data
    computeReportData(activities) {
        const data = {
            totalActivities: activities.length,
            internalCount: activities.filter(a => a.isInternal).length,
            externalCount: activities.filter(a => !a.isInternal).length,
            userActivity: {},
            activityBreakdown: {
                'SOW': 0,
                'POC': 0,
                'RFx': 0,
                'Pricing': 0,
                'Customer Calls': 0
            },
            salesRepRequests: {},
            missingSfdcAccounts: [],
            industryData: {}
        };

        // User activity
        activities.forEach(activity => {
            const userId = activity.userId || activity.assignedUserEmail || 'unknown';
            const userName = activity.userName || 'Unknown';
            if (!data.userActivity[userId]) {
                data.userActivity[userId] = { userName, count: 0 };
            }
            data.userActivity[userId].count++;
        });

        // Activity breakdown
        activities.forEach(activity => {
            if (activity.type === 'sow') data.activityBreakdown['SOW']++;
            else if (activity.type === 'poc') data.activityBreakdown['POC']++;
            else if (activity.type === 'rfx') data.activityBreakdown['RFx']++;
            else if (activity.type === 'pricing') data.activityBreakdown['Pricing']++;
            else if (activity.type === 'customerCall') data.activityBreakdown['Customer Calls']++;
        });

        // Sales rep requests
        activities.forEach(activity => {
            if (!activity.isInternal && activity.salesRep) {
                const repName = activity.salesRep;
                data.salesRepRequests[repName] = (data.salesRepRequests[repName] || 0) + 1;
            }
        });

        // Industry data
        const accounts = DataManager.getAccounts();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.accountId) {
                const account = accounts.find(a => a.id === activity.accountId);
                if (account && account.industry) {
                    const industry = account.industry;
                    if (!data.industryData[industry]) {
                        data.industryData[industry] = { total: 0, accounts: new Set() };
                    }
                    data.industryData[industry].total++;
                    data.industryData[industry].accounts.add(activity.accountId);
                }
            }
        });

        // Missing SFDC links
        const accountActivityMap = new Map();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.accountId) {
                if (!accountActivityMap.has(activity.accountId)) {
                    accountActivityMap.set(activity.accountId, {
                        accountId: activity.accountId,
                        accountName: activity.accountName || 'Unknown',
                        salesRep: activity.salesRep || 'Unknown',
                        salesRepRegion: activity.salesRepRegion || activity.region || 'Unknown',
                        activityCount: 0
                    });
                }
                accountActivityMap.get(activity.accountId).activityCount++;
            }
        });

        data.missingSfdcAccounts = Array.from(accountActivityMap.values())
            .filter(item => {
                const account = accounts.find(a => a.id === item.accountId);
                return account && (!account.sfdcLink || !account.sfdcLink.trim());
            })
            .sort((a, b) => a.activityCount - b.activityCount);

        return data;
    },

    // Render header with period toggle and navigation
    renderHeader(periodLabel) {
        const availableMonths = DataManager.getAvailableActivityMonths();
        const availableYears = DataManager.getAvailableActivityYears();
        const isYear = this.currentPeriodType === 'year';
        const canGoPrev = isYear 
            ? availableYears.includes(String(parseInt(this.currentPeriod) - 1))
            : availableMonths.includes(this.getPreviousPeriod());
        const canGoNext = isYear
            ? availableYears.includes(String(parseInt(this.currentPeriod) + 1))
            : availableMonths.includes(this.getNextPeriod());

        return `
            <div class="reports-v2-header">
                <div class="reports-v2-period-toggle">
                    <button type="button" 
                            class="btn btn-sm ${this.currentPeriodType === 'month' ? 'btn-primary' : 'btn-outline'}"
                            onclick="ReportsV2.switchPeriodType('month')">
                        Monthly
                    </button>
                    <button type="button" 
                            class="btn btn-sm ${this.currentPeriodType === 'year' ? 'btn-primary' : 'btn-outline'}"
                            onclick="ReportsV2.switchPeriodType('year')">
                        Annual
                    </button>
                </div>
                ${!isYear ? `
                    <div class="reports-v2-month-nav">
                        <button type="button" 
                                class="btn btn-sm btn-outline ${!canGoPrev ? 'disabled' : ''}"
                                onclick="ReportsV2.navigatePrevious()"
                                ${!canGoPrev ? 'disabled' : ''}>
                            ← Previous
                        </button>
                        <span class="reports-v2-current-period">${periodLabel}</span>
                        <button type="button" 
                                class="btn btn-sm btn-outline ${!canGoNext ? 'disabled' : ''}"
                                onclick="ReportsV2.navigateNext()"
                                ${!canGoNext ? 'disabled' : ''}>
                            Next →
                        </button>
                    </div>
                ` : `
                    <div class="reports-v2-year-selector">
                        <select class="form-control" 
                                id="reportsV2YearSelect"
                                onchange="ReportsV2.currentPeriod = this.value; ReportsV2.render();">
                            ${availableYears.map(year => `
                                <option value="${year}" ${year === this.currentPeriod ? 'selected' : ''}>${year}</option>
                            `).join('')}
                        </select>
                    </div>
                `}
            </div>
        `;
    },

    getPreviousPeriod() {
        const [year, month] = this.currentPeriod.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        date.setMonth(date.getMonth() - 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },

    getNextPeriod() {
        const [year, month] = this.currentPeriod.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        date.setMonth(date.getMonth() + 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },

    // Render Presales Reports Section
    renderPresalesReports(activities) {
        const totalActivities = activities.length;
        const internalCount = activities.filter(a => a.isInternal).length;
        const externalCount = activities.filter(a => !a.isInternal).length;
        const internalPercent = totalActivities > 0 ? Math.round((internalCount / totalActivities) * 100) : 0;
        const externalPercent = totalActivities > 0 ? Math.round((externalCount / totalActivities) * 100) : 0;

        // Presales Activity Report - Group by user
        const userActivityMap = new Map();
        activities.forEach(activity => {
            const userId = activity.userId || activity.assignedUserEmail || 'unknown';
            const userName = activity.userName || 'Unknown';
            if (!userActivityMap.has(userId)) {
                userActivityMap.set(userId, { userId, userName, count: 0 });
            }
            userActivityMap.get(userId).count++;
        });
        const userActivityData = Array.from(userActivityMap.values())
            .sort((a, b) => b.count - a.count);

        // Activity Breakdown
        const activityBreakdown = {
            'SOW': activities.filter(a => a.type === 'sow').length,
            'POC': activities.filter(a => a.type === 'poc').length,
            'RFx': activities.filter(a => a.type === 'rfx').length,
            'Pricing': activities.filter(a => a.type === 'pricing').length,
            'Customer Calls': activities.filter(a => a.type === 'customerCall').length
        };

        return `
            <div class="reports-v2-section">
                <h2 class="reports-v2-section-title">Presales Reports (Team Level)</h2>
                
                <div class="reports-v2-grid">
                    <!-- Activity Breakdown - First Row -->
                    <div class="reports-v2-card">
                        <div class="reports-v2-card-header">
                            <h3>Activity Breakdown</h3>
                            <select class="form-control reports-v2-filter-dropdown" 
                                    id="activityBreakdownFilter"
                                    onchange="ReportsV2.changeActivityBreakdownFilter(this.value)">
                                <option value="all" ${this.activityBreakdownFilter === 'all' ? 'selected' : ''}>All Activities</option>
                                <option value="sow" ${this.activityBreakdownFilter === 'sow' ? 'selected' : ''}>SOW</option>
                                <option value="poc" ${this.activityBreakdownFilter === 'poc' ? 'selected' : ''}>POC</option>
                                <option value="rfx" ${this.activityBreakdownFilter === 'rfx' ? 'selected' : ''}>RFx</option>
                                <option value="pricing" ${this.activityBreakdownFilter === 'pricing' ? 'selected' : ''}>Pricing</option>
                                <option value="customerCall" ${this.activityBreakdownFilter === 'customerCall' ? 'selected' : ''}>Customer Calls</option>
                            </select>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="activityBreakdownChart" height="250"></canvas>
                        </div>
                    </div>

                    <!-- Total Activities -->
                    <div class="reports-v2-card">
                        <div class="reports-v2-card-header">
                            <h3>Total Activities</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <div class="reports-v2-stat-large">${totalActivities.toLocaleString()}</div>
                            <p class="reports-v2-stat-label">All activities for ${this.formatPeriod(this.currentPeriod)}</p>
                        </div>
                    </div>

                    <!-- Internal vs External -->
                    <div class="reports-v2-card">
                        <div class="reports-v2-card-header">
                            <h3>Internal vs External Activity</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="internalExternalChart" height="200"></canvas>
                            <div class="reports-v2-legend">
                                <span class="reports-v2-legend-item">
                                    <span class="reports-v2-legend-color" style="background: #3182CE;"></span>
                                    Internal: ${internalCount} (${internalPercent}%)
                                </span>
                                <span class="reports-v2-legend-item">
                                    <span class="reports-v2-legend-color" style="background: #38A169;"></span>
                                    External: ${externalCount} (${externalPercent}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Presales Activity Report -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Presales Activity Report</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="presalesActivityChart" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render Sales View Section
    renderSalesView(activities) {
        // Missing SFDC Links - Regional bar graph
        const accounts = DataManager.getAccounts();
        const regionMissingMap = new Map();
        
        activities.forEach(activity => {
            if (!activity.isInternal && activity.accountId) {
                const account = accounts.find(a => a.id === activity.accountId);
                if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                    const region = activity.salesRepRegion || activity.region || account.region || 'Unknown';
                    regionMissingMap.set(region, (regionMissingMap.get(region) || 0) + 1);
                }
            }
        });

        const regionMissingData = Array.from(regionMissingMap.entries())
            .map(([region, count]) => ({ region, count }))
            .sort((a, b) => b.count - a.count);

        return `
            <div class="reports-v2-section">
                <h2 class="reports-v2-section-title">Sales View</h2>
                
                <div class="reports-v2-grid">
                    <!-- Missing SFDC Links - Regional -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Missing SFDC Links by Region</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            ${regionMissingData.length > 0 ? `
                                <canvas id="missingSfdcRegionalChart" height="300"></canvas>
                            ` : `
                                <p class="reports-v2-empty">All accounts have SFDC links for this period.</p>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render Regional Data Section
    renderRegionalData(activities) {
        const accounts = DataManager.getAccounts();
        
        // Sales Rep Missing Opportunities
        const salesRepMissingMap = new Map();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.salesRep && activity.accountId) {
                const account = accounts.find(a => a.id === activity.accountId);
                if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                    const repName = activity.salesRep;
                    const region = activity.salesRepRegion || activity.region || account.region || 'Unknown';
                    if (!salesRepMissingMap.has(repName)) {
                        salesRepMissingMap.set(repName, {
                            name: repName,
                            region: region,
                            missingCount: 0,
                            accountIds: new Set()
                        });
                    }
                    salesRepMissingMap.get(repName).missingCount++;
                    salesRepMissingMap.get(repName).accountIds.add(activity.accountId);
                }
            }
        });
        const salesRepMissingData = Array.from(salesRepMissingMap.values())
            .map(item => ({
                name: item.name,
                region: item.region,
                missingCount: item.missingCount,
                accountCount: item.accountIds.size
            }))
            .sort((a, b) => b.missingCount - a.missingCount);

        // Industry Wise Regional Traffic
        const regionIndustryMap = new Map();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.accountId) {
                const account = accounts.find(a => a.id === activity.accountId);
                if (account && account.industry) {
                    const region = activity.salesRepRegion || activity.region || account.region || 'Unknown';
                    const industry = account.industry;
                    const key = `${region}|${industry}`;
                    if (!regionIndustryMap.has(key)) {
                        regionIndustryMap.set(key, { region, industry, count: 0 });
                    }
                    regionIndustryMap.get(key).count++;
                }
            }
        });

        // Sales Rep Most Requests (by Region)
        const regionSalesRepMap = new Map();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.salesRep) {
                const region = activity.salesRepRegion || activity.region || 'Unknown';
                if (!regionSalesRepMap.has(region)) {
                    regionSalesRepMap.set(region, new Map());
                }
                const repName = activity.salesRep;
                const repMap = regionSalesRepMap.get(region);
                repMap.set(repName, (repMap.get(repName) || 0) + 1);
            }
        });

        // Missing SFDC Links by Sales Rep (bar graph)
        const salesRepSfdcMap = new Map();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.salesRep && activity.accountId) {
                const account = accounts.find(a => a.id === activity.accountId);
                if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                    const repName = activity.salesRep;
                    if (!salesRepSfdcMap.has(repName)) {
                        salesRepSfdcMap.set(repName, { name: repName, missingCount: 0, totalOpps: 0 });
                    }
                    salesRepSfdcMap.get(repName).missingCount++;
                }
            }
        });
        // Also count total opportunities per sales rep
        activities.forEach(activity => {
            if (!activity.isInternal && activity.salesRep) {
                const repName = activity.salesRep;
                if (!salesRepSfdcMap.has(repName)) {
                    salesRepSfdcMap.set(repName, { name: repName, missingCount: 0, totalOpps: 0 });
                }
                salesRepSfdcMap.get(repName).totalOpps++;
            }
        });
        const salesRepSfdcData = Array.from(salesRepSfdcMap.values())
            .filter(item => item.missingCount > 0)
            .sort((a, b) => b.missingCount - a.missingCount);

        return `
            <div class="reports-v2-section">
                <h2 class="reports-v2-section-title">Regional Data</h2>
                
                <div class="reports-v2-grid">
                    <!-- Sales Rep Missing Opportunities -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Sales Rep Missing Opportunities</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            ${salesRepMissingData.length > 0 ? `
                                <div class="reports-v2-table-container">
                                    <table class="reports-v2-table">
                                        <thead>
                                            <tr>
                                                <th>Sales Rep</th>
                                                <th>Region</th>
                                                <th># Missing Opps</th>
                                                <th># Accounts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${salesRepMissingData.map(item => `
                                                <tr>
                                                    <td>${item.name}</td>
                                                    <td>${item.region}</td>
                                                    <td>${item.missingCount}</td>
                                                    <td>${item.accountCount}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <p class="reports-v2-empty">No missing opportunities found for this period.</p>
                            `}
                        </div>
                    </div>

                    <!-- Industry Wise Regional Traffic -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Industry Wise Regional Traffic</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="industryRegionalChart" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Sales Rep Most Requests (by Region) -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Sales Rep Most Requests (Top 10)</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="salesRepRequestsChart" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Missing SFDC Links by Sales Rep -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Missing SFDC Links by Sales Rep</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            ${salesRepSfdcData.length > 0 ? `
                                <canvas id="missingSfdcSalesRepChart" height="300"></canvas>
                            ` : `
                                <p class="reports-v2-empty">All sales reps have SFDC links for their accounts.</p>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render Product Level Data Section
    renderProductLevelData(activities) {
        // Industry Wise - Total Activities
        const industryActivityMap = new Map();
        const industryAccountMap = new Map();

        activities.forEach(activity => {
            if (!activity.isInternal && activity.accountId) {
                const account = DataManager.getAccounts().find(a => a.id === activity.accountId);
                if (account && account.industry) {
                    const industry = account.industry;
                    if (!industryActivityMap.has(industry)) {
                        industryActivityMap.set(industry, { industry, totalActivities: 0, accountIds: new Set() });
                    }
                    industryActivityMap.get(industry).totalActivities++;
                    industryActivityMap.get(industry).accountIds.add(activity.accountId);
                }
            }
        });

        const industryData = Array.from(industryActivityMap.values()).map(item => ({
            industry: item.industry,
            totalActivities: item.totalActivities,
            accountCount: item.accountIds.size,
            averageActivities: item.accountIds.size > 0 ? (item.totalActivities / item.accountIds.size).toFixed(2) : 0
        })).sort((a, b) => b.totalActivities - a.totalActivities);

        return `
            <div class="reports-v2-section">
                <h2 class="reports-v2-section-title">Product Level Data</h2>
                
                <div class="reports-v2-grid">
                    <!-- Industry Wise - Total Activities -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Industry Wise - Total Activities</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="industryTotalChart" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Industry Wise - Average Activities -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Industry Wise - Average Activities</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="industryAverageChart" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Initialize all charts
    initCharts(activities) {
        if (!activities || activities.length === 0) {
            console.warn('ReportsV2: No activities to chart');
            return;
        }

        try {
            // Internal vs External Pie Chart
            const internalCount = activities.filter(a => a.isInternal).length;
            const externalCount = activities.filter(a => !a.isInternal).length;
            
            const internalExternalCanvas = document.getElementById('internalExternalChart');
            if (internalExternalCanvas && (internalCount > 0 || externalCount > 0)) {
                console.log('Rendering Internal vs External chart:', { internalCount, externalCount });
                this.renderPieChart('internalExternalChart', {
                    labels: ['Internal', 'External'],
                    data: [internalCount, externalCount],
                    colors: ['#3182CE', '#38A169']
                });
            } else if (!internalExternalCanvas) {
                console.warn('Internal vs External chart canvas not found');
            } else {
                console.log('No data for Internal vs External chart');
            }

            // Presales Activity Report
            const userActivityMap = new Map();
            activities.forEach(activity => {
                const userId = activity.userId || activity.assignedUserEmail || 'unknown';
                const userName = activity.userName || 'Unknown';
                if (!userActivityMap.has(userId)) {
                    userActivityMap.set(userId, { userName, count: 0 });
                }
                userActivityMap.get(userId).count++;
            });
            const userActivityData = Array.from(userActivityMap.values())
                .sort((a, b) => b.count - a.count);
            
            if (userActivityData.length > 0) {
                this.renderHorizontalBarChart('presalesActivityChart', {
                    labels: userActivityData.map(u => u.userName),
                    data: userActivityData.map(u => u.count),
                    label: 'Activities'
                });
            }

            // Activity Breakdown - Donut Chart with Filter (only if Presales tab)
            if (this.activeTab === 'presales') {
                this.initActivityBreakdownChart(activities);
            }

            // Missing SFDC Links - Regional Bar Chart (Sales View)
            if (this.activeTab === 'sales') {
                const accounts = DataManager.getAccounts();
                const regionMissingMap = new Map();
                activities.forEach(activity => {
                    if (!activity.isInternal && activity.accountId) {
                        const account = accounts.find(a => a.id === activity.accountId);
                        if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                            const region = activity.salesRepRegion || activity.region || account.region || 'Unknown';
                            regionMissingMap.set(region, (regionMissingMap.get(region) || 0) + 1);
                        }
                    }
                });
                const regionMissingData = Array.from(regionMissingMap.entries())
                    .map(([region, count]) => ({ region, count }))
                    .sort((a, b) => b.count - a.count);
                
                if (regionMissingData.length > 0) {
                    this.renderBarChart('missingSfdcRegionalChart', {
                        labels: regionMissingData.map(d => d.region),
                        data: regionMissingData.map(d => d.count),
                        label: 'Missing SFDC Links'
                    });
                }
            }

            // Regional Data Charts
            if (this.activeTab === 'regional') {
                const accounts = DataManager.getAccounts();
                
                // Industry Wise Regional Traffic
                const regionIndustryMap = new Map();
                activities.forEach(activity => {
                    if (!activity.isInternal && activity.accountId) {
                        const account = accounts.find(a => a.id === activity.accountId);
                        if (account && account.industry) {
                            const region = activity.salesRepRegion || activity.region || account.region || 'Unknown';
                            const industry = account.industry;
                            const key = `${region}|${industry}`;
                            if (!regionIndustryMap.has(key)) {
                                regionIndustryMap.set(key, { region, industry, count: 0 });
                            }
                            regionIndustryMap.get(key).count++;
                        }
                    }
                });
                
                // Group by region for stacked bar chart
                const regions = new Set();
                const industries = new Set();
                regionIndustryMap.forEach(({ region, industry }) => {
                    regions.add(region);
                    industries.add(industry);
                });
                
                const regionLabels = Array.from(regions).sort();
                const industryLabels = Array.from(industries).sort();
                const datasets = industryLabels.map((industry, idx) => ({
                    label: industry,
                    data: regionLabels.map(region => {
                        const key = `${region}|${industry}`;
                        return regionIndustryMap.get(key)?.count || 0;
                    }),
                    backgroundColor: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795'][idx % 7]
                }));
                
                if (datasets.length > 0 && regionLabels.length > 0) {
                    this.renderStackedBarChart('industryRegionalChart', {
                        labels: regionLabels,
                        datasets: datasets
                    });
                }

                // Missing SFDC Links by Sales Rep
                const salesRepSfdcMap = new Map();
                activities.forEach(activity => {
                    if (!activity.isInternal && activity.salesRep && activity.accountId) {
                        const account = accounts.find(a => a.id === activity.accountId);
                        if (account && (!account.sfdcLink || !account.sfdcLink.trim())) {
                            const repName = activity.salesRep;
                            salesRepSfdcMap.set(repName, (salesRepSfdcMap.get(repName) || 0) + 1);
                        }
                    }
                });
                const salesRepSfdcData = Array.from(salesRepSfdcMap.entries())
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15); // Top 15
                
                if (salesRepSfdcData.length > 0) {
                    this.renderHorizontalBarChart('missingSfdcSalesRepChart', {
                        labels: salesRepSfdcData.map(([name]) => name),
                        data: salesRepSfdcData.map(([, count]) => count),
                        label: 'Missing SFDC Links'
                    });
                }
            }

            // Sales Rep Most Requests
            const salesRepMap = new Map();
            activities.forEach(activity => {
                if (!activity.isInternal && activity.salesRep) {
                    const repName = activity.salesRep;
                    if (!salesRepMap.has(repName)) {
                        salesRepMap.set(repName, 0);
                    }
                    salesRepMap.set(repName, salesRepMap.get(repName) + 1);
                }
            });
            const topSalesReps = Array.from(salesRepMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            if (topSalesReps.length > 0) {
                this.renderHorizontalBarChart('salesRepRequestsChart', {
                    labels: topSalesReps.map(([name]) => name),
                    data: topSalesReps.map(([, count]) => count),
                    label: 'Requests'
                });
            }

            // Industry Total Activities
            const industryActivityMap = new Map();
            activities.forEach(activity => {
                if (!activity.isInternal && activity.accountId) {
                    const account = DataManager.getAccounts().find(a => a.id === activity.accountId);
                    if (account && account.industry) {
                        const industry = account.industry;
                        industryActivityMap.set(industry, (industryActivityMap.get(industry) || 0) + 1);
                    }
                }
            });
            const industryData = Array.from(industryActivityMap.entries())
                .sort((a, b) => b[1] - a[1]);
            
            if (industryData.length > 0) {
                this.renderHorizontalBarChart('industryTotalChart', {
                    labels: industryData.map(([industry]) => industry),
                    data: industryData.map(([, count]) => count),
                    label: 'Total Activities'
                });
            }

            // Industry Average Activities
            const industryAvgMap = new Map();
            activities.forEach(activity => {
                if (!activity.isInternal && activity.accountId) {
                    const account = DataManager.getAccounts().find(a => a.id === activity.accountId);
                    if (account && account.industry) {
                        const industry = account.industry;
                        if (!industryAvgMap.has(industry)) {
                            industryAvgMap.set(industry, { total: 0, accounts: new Set() });
                        }
                        industryAvgMap.get(industry).total++;
                        industryAvgMap.get(industry).accounts.add(activity.accountId);
                    }
                }
            });
            const industryAvgData = Array.from(industryAvgMap.entries())
                .map(([industry, data]) => ({
                    industry,
                    average: data.accounts.size > 0 ? (data.total / data.accounts.size) : 0
                }))
                .sort((a, b) => b.average - a.average);
            
            if (industryAvgData.length > 0) {
                this.renderHorizontalBarChart('industryAverageChart', {
                    labels: industryAvgData.map(d => d.industry),
                    data: industryAvgData.map(d => parseFloat(d.average.toFixed(2))),
                    label: 'Average Activities'
                });
            }
        } catch (error) {
            console.error('ReportsV2: Error in initCharts():', error);
        }
    },

    // Chart rendering helpers
    renderPieChart(canvasId, { labels, data, colors }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Chart canvas not found: ${canvasId}`);
            return;
        }
        
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Ensure data is valid
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn(`Invalid data for chart ${canvasId}:`, data);
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
            } catch (e) {
                console.warn(`Error destroying chart ${canvasId}:`, e);
            }
            delete this.charts[canvasId];
        }

        // Default colors if not provided
        const defaultColors = ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795'];
        const chartColors = colors || labels.map((_, idx) => defaultColors[idx % defaultColors.length]);
        
        console.log(`Creating pie chart ${canvasId} with data:`, { labels, data, colors: chartColors });

        try {
            this.charts[canvasId] = new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: chartColors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`Error creating pie chart ${canvasId}:`, error);
        }
    },

    renderBarChart(canvasId, { labels, data, label }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') {
            console.warn(`Chart canvas not found or Chart.js not loaded: ${canvasId}`);
            return;
        }

        // Ensure data is valid
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn(`Invalid data for chart ${canvasId}`);
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
            } catch (e) {
                console.warn(`Error destroying chart ${canvasId}:`, e);
            }
            delete this.charts[canvasId];
        }

        try {
            this.charts[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: '#3182CE',
                    borderColor: '#2B6CB0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        } catch (error) {
            console.error(`Error creating bar chart ${canvasId}:`, error);
        }
    },

    renderHorizontalBarChart(canvasId, { labels, data, label }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') {
            console.warn(`Chart canvas not found or Chart.js not loaded: ${canvasId}`);
            return;
        }

        // Ensure data is valid
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn(`Invalid data for chart ${canvasId}`);
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
            } catch (e) {
                console.warn(`Error destroying chart ${canvasId}:`, e);
            }
            delete this.charts[canvasId];
        }

        try {
            this.charts[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: '#3182CE',
                    borderColor: '#2B6CB0',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        } catch (error) {
            console.error(`Error creating horizontal bar chart ${canvasId}:`, error);
        }
    },

    // Initialize Activity Breakdown chart separately (for filter changes)
    initActivityBreakdownChart(activities) {
        const breakdown = {
            'SOW': activities.filter(a => a.type === 'sow').length,
            'POC': activities.filter(a => a.type === 'poc').length,
            'RFx': activities.filter(a => a.type === 'rfx').length,
            'Pricing': activities.filter(a => a.type === 'pricing').length,
            'Customer Calls': activities.filter(a => a.type === 'customerCall').length
        };
        
        let filteredBreakdown = breakdown;
        if (this.activityBreakdownFilter !== 'all') {
            const filterMap = {
                'sow': 'SOW',
                'poc': 'POC',
                'rfx': 'RFx',
                'pricing': 'Pricing',
                'customerCall': 'Customer Calls'
            };
            const selectedType = filterMap[this.activityBreakdownFilter];
            filteredBreakdown = { [selectedType]: breakdown[selectedType] || 0 };
        }
        
        this.renderDonutChart('activityBreakdownChart', {
            labels: Object.keys(filteredBreakdown),
            data: Object.values(filteredBreakdown),
            colors: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C']
        });
    },

    // Render Donut Chart
    renderDonutChart(canvasId, { labels, data, colors }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const total = data.reduce((a, b) => a + b, 0);

        this.charts[canvasId] = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw: function(chart) {
                    const ctx = chart.ctx;
                    const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                    const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                    
                    ctx.save();
                    ctx.font = 'bold 24px Arial';
                    ctx.fillStyle = '#111827';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(total.toString(), centerX, centerY - 10);
                    
                    ctx.font = '14px Arial';
                    ctx.fillStyle = '#6b7280';
                    ctx.fillText('Total', centerX, centerY + 15);
                    ctx.restore();
                }
            }]
        });
    },

    // Render Stacked Bar Chart
    renderStackedBarChart(canvasId, { labels, datasets }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') {
            console.warn(`Chart canvas not found or Chart.js not loaded: ${canvasId}`);
            return;
        }

        // Ensure data is valid
        if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
            console.warn(`Invalid datasets for chart ${canvasId}`);
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
            } catch (e) {
                console.warn(`Error destroying chart ${canvasId}:`, e);
            }
            delete this.charts[canvasId];
        }

        try {
            this.charts[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
        } catch (error) {
            console.error(`Error creating stacked bar chart ${canvasId}:`, error);
        }
    }
};

// Expose globally (only once)
if (typeof window !== 'undefined' && !window.ReportsV2) {
    window.ReportsV2 = ReportsV2;
}
