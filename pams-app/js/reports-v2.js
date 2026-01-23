// Reports V2 - New reporting structure
const ReportsV2 = {
    charts: {},
    currentPeriod: null,
    currentPeriodType: 'month', // 'month' or 'year'
    cachedData: null, // Store computed data for charts

    // Initialize Reports V2
    init(period, periodType = 'month') {
        this.currentPeriod = period;
        this.currentPeriodType = periodType;
        this.cachedData = null; // Clear cache
        this.render();
    },

    // Get activities for the selected period
    getPeriodActivities() {
        const allActivities = DataManager.getAllActivities();
        if (!allActivities || !allActivities.length) return [];

        const period = this.currentPeriod;
        const isYear = this.currentPeriodType === 'year';

        return allActivities.filter(activity => {
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

    // Main render function
    render() {
        const container = document.getElementById('reportsContent');
        if (!container) return;

        const activities = this.getPeriodActivities();
        const periodLabel = this.formatPeriod(this.currentPeriod);
        
        // Compute and cache data for charts
        this.cachedData = this.computeReportData(activities);

        container.innerHTML = `
            <div class="reports-v2-container">
                ${this.renderHeader(periodLabel)}
                ${this.renderPresalesReports(activities)}
                ${this.renderSalesView(activities)}
                ${this.renderProductLevelData(activities)}
            </div>
        `;

        // Initialize charts after render
        setTimeout(() => {
            this.initCharts(activities);
        }, 100);
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

                    <!-- Activity Breakdown -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Activity Breakdown</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="activityBreakdownChart" height="250"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render Sales View Section
    renderSalesView(activities) {
        // Sales Rep Most Requests (Top 10)
        const salesRepMap = new Map();
        activities.forEach(activity => {
            if (!activity.isInternal && activity.salesRep) {
                const repName = activity.salesRep;
                if (!salesRepMap.has(repName)) {
                    salesRepMap.set(repName, { name: repName, count: 0 });
                }
                salesRepMap.get(repName).count++;
            }
        });
        const topSalesReps = Array.from(salesRepMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Missing SFDC Links - Accounts without SFDC links
        const accounts = DataManager.getAccounts();
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

        const missingSfdcAccounts = Array.from(accountActivityMap.values())
            .filter(item => {
                const account = accounts.find(a => a.id === item.accountId);
                return account && (!account.sfdcLink || !account.sfdcLink.trim());
            })
            .sort((a, b) => a.activityCount - b.activityCount);

        return `
            <div class="reports-v2-section">
                <h2 class="reports-v2-section-title">Sales View</h2>
                
                <div class="reports-v2-grid">
                    <!-- Sales Rep Most Requests -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Sales Rep Most Requests (Top 10)</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            <canvas id="salesRepRequestsChart" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Missing SFDC Links -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Missing SFDC Links</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            ${missingSfdcAccounts.length > 0 ? `
                                <div class="reports-v2-table-container">
                                    <table class="reports-v2-table">
                                        <thead>
                                            <tr>
                                                <th>Sales Rep</th>
                                                <th>Account Name</th>
                                                <th># Activities</th>
                                                <th>Region</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${missingSfdcAccounts.map(item => `
                                                <tr>
                                                    <td>${item.salesRep}</td>
                                                    <td>${item.accountName}</td>
                                                    <td>${item.activityCount}</td>
                                                    <td>${item.salesRepRegion}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <p class="reports-v2-empty">All accounts have SFDC links for this period.</p>
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
        // Internal vs External Pie Chart
        const internalCount = activities.filter(a => a.isInternal).length;
        const externalCount = activities.filter(a => !a.isInternal).length;
        this.renderPieChart('internalExternalChart', {
            labels: ['Internal', 'External'],
            data: [internalCount, externalCount],
            colors: ['#3182CE', '#38A169']
        });

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
        this.renderHorizontalBarChart('presalesActivityChart', {
            labels: userActivityData.map(u => u.userName),
            data: userActivityData.map(u => u.count),
            label: 'Activities'
        });

        // Activity Breakdown
        const breakdown = {
            'SOW': activities.filter(a => a.type === 'sow').length,
            'POC': activities.filter(a => a.type === 'poc').length,
            'RFx': activities.filter(a => a.type === 'rfx').length,
            'Pricing': activities.filter(a => a.type === 'pricing').length,
            'Customer Calls': activities.filter(a => a.type === 'customerCall').length
        };
        this.renderBarChart('activityBreakdownChart', {
            labels: Object.keys(breakdown),
            data: Object.values(breakdown),
            label: 'Activities'
        });

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
        this.renderHorizontalBarChart('salesRepRequestsChart', {
            labels: topSalesReps.map(([name]) => name),
            data: topSalesReps.map(([, count]) => count),
            label: 'Requests'
        });

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
        this.renderHorizontalBarChart('industryTotalChart', {
            labels: industryData.map(([industry]) => industry),
            data: industryData.map(([, count]) => count),
            label: 'Total Activities'
        });

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
        this.renderHorizontalBarChart('industryAverageChart', {
            labels: industryAvgData.map(d => d.industry),
            data: industryAvgData.map(d => parseFloat(d.average.toFixed(2))),
            label: 'Average Activities'
        });
    },

    // Chart rendering helpers
    renderPieChart(canvasId, { labels, data, colors }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
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
    },

    renderBarChart(canvasId, { labels, data, label }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

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
    },

    renderHorizontalBarChart(canvasId, { labels, data, label }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

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
    }
};

// Expose globally
window.ReportsV2 = ReportsV2;
