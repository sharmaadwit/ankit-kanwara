// Reports V2 - New reporting structure
const ReportsV2 = {
    charts: {},
    currentPeriod: null,
    currentPeriodType: 'month', // 'month' or 'year'
    cachedData: null, // Store computed data for charts
    activeTab: 'presales', // 'presales', 'sales', 'regional', 'monthly', 'ai'
    activityBreakdownFilter: 'all', // 'all', 'sow', 'poc', 'rfx', 'pricing', 'customerCall'

    // Plugin to show value on pie/doughnut segments and bar tops (matches dashboard)
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

    // Initialize Reports V2
    async init(period, periodType = 'month') {
        this.currentPeriod = period;
        this.currentPeriodType = periodType;
        this.cachedData = null; // Clear cache
        this.activeTab = 'presales';
        this.activityBreakdownFilter = 'all';
        await this.render();
    },

    // Switch active tab
    switchTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    openEditReportModal() {
        const period = this.currentPeriod;
        const periodLabel = this.formatPeriod(period);
        if (!period) return;
        (async () => {
            const overrides = await DataManager.getReportOverrides();
            const o = overrides[period] || {};
            const highlights = o.highlights != null ? o.highlights : '';
            const useCases = Array.isArray(o.useCases) ? o.useCases : ['', '', '', '', ''];
            const includedWinIds = Array.isArray(o.includedWinIds) ? o.includedWinIds : null;
            const manualWins = Array.isArray(o.manualWins) ? o.manualWins : [];

            let winsHtml = '';
            if (this.monthlyReportData && this.monthlyReportData.winsForPeriod) {
                this.monthlyReportData.winsForPeriod.forEach(w => {
                    const checked = includedWinIds === null || includedWinIds.includes(w.projectId);
                    winsHtml += `<label class="monthly-report-edit-win-row"><input type="checkbox" data-project-id="${(w.projectId || '').replace(/"/g, '&quot;')}" ${checked ? 'checked' : ''}> ${(w.accountName || 'Unknown').replace(/</g, '&lt;')} – MRR: ${String(w.mrr || '—').replace(/</g, '&lt;')}</label>`;
                });
            }
            manualWins.forEach((mw, i) => {
                winsHtml += `<div class="monthly-report-manual-win" data-index="${i}"><input type="text" placeholder="Client" value="${(mw.clientName || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="MRR" value="${(mw.mrr || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="Use case" value="${(mw.useCase || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="Presales rep" value="${(mw.presalesRep || '').replace(/"/g, '&quot;')}"><button type="button" class="btn btn-sm btn-danger" onclick="ReportsV2.removeManualWin(this)">Remove</button></div>`;
            });

            const modal = document.getElementById('monthlyReportEditModal');
            if (modal) {
                document.getElementById('monthlyReportEditHighlights').value = highlights;
                [0, 1, 2, 3, 4].forEach(i => { const el = document.getElementById('monthlyReportUseCase' + i); if (el) el.value = useCases[i] || ''; });
                const winsWrap = document.getElementById('monthlyReportEditWinsWrap');
                if (winsWrap) winsWrap.innerHTML = winsHtml || '<p class="text-muted">No wins in this period. Add manual wins below.</p>';
                const manualWrap = document.getElementById('monthlyReportManualWinsWrap');
                if (manualWrap) manualWrap.innerHTML = manualWins.map((mw, i) => `<div class="monthly-report-manual-win" data-index="${i}"><input type="text" placeholder="Client" value="${(mw.clientName || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="MRR" value="${(mw.mrr || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="Use case" value="${(mw.useCase || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="Presales rep" value="${(mw.presalesRep || '').replace(/"/g, '&quot;')}"><button type="button" class="btn btn-sm btn-danger" onclick="ReportsV2.removeManualWin(this)">Remove</button></div>`).join('');
            } else {
                const div = document.createElement('div');
                div.id = 'monthlyReportEditModal';
                div.className = 'modal hidden';
                div.innerHTML = `
                    <div class="modal-content" style="max-width: 640px;">
                        <div class="modal-header"><h3>Edit report – ${periodLabel}</h3><button type="button" class="modal-close" onclick="ReportsV2.closeEditReportModal()">&times;</button></div>
                        <div class="modal-body">
                            <div class="form-group"><label>Cube Analysis Top Highlights</label><textarea id="monthlyReportEditHighlights" class="form-control" rows="3" placeholder="Optional text for top highlights."></textarea></div>
                            <div class="form-group"><label>Use cases (5 boxes)</label>
                                <input id="monthlyReportUseCase0" class="form-control" placeholder="Lead gen & onboarding"><br>
                                <input id="monthlyReportUseCase1" class="form-control" placeholder="Loyalty & retention"><br>
                                <input id="monthlyReportUseCase2" class="form-control" placeholder="Support & FAQ"><br>
                                <input id="monthlyReportUseCase3" class="form-control" placeholder="Sales discovery & AI"><br>
                                <input id="monthlyReportUseCase4" class="form-control" placeholder="Operational automation">
                            </div>
                            <div class="form-group"><label>Wins – include/exclude</label><div id="monthlyReportEditWinsWrap"></div></div>
                            <div class="form-group"><label>Manual wins (add below)</label><div id="monthlyReportManualWinsWrap"></div><button type="button" class="btn btn-sm btn-outline" onclick="ReportsV2.addManualWinRow()">+ Add manual win</button></div>
                        </div>
                        <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="ReportsV2.closeEditReportModal()">Cancel</button><button type="button" class="btn btn-primary" onclick="ReportsV2.saveEditReportModal()">Save</button></div>
                    </div>`;
                document.body.appendChild(div);
                document.getElementById('monthlyReportEditHighlights').value = highlights;
                [0, 1, 2, 3, 4].forEach(i => { const el = document.getElementById('monthlyReportUseCase' + i); if (el) el.value = useCases[i] || ''; });
                document.getElementById('monthlyReportEditWinsWrap').innerHTML = winsHtml || '<p class="text-muted">No wins in this period. Add manual wins below.</p>';
                document.getElementById('monthlyReportManualWinsWrap').innerHTML = manualWins.map((mw, i) => `<div class="monthly-report-manual-win" data-index="${i}"><input type="text" placeholder="Client" value="${(mw.clientName || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="MRR" value="${(mw.mrr || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="Use case" value="${(mw.useCase || '').replace(/"/g, '&quot;')}"><input type="text" placeholder="Presales rep" value="${(mw.presalesRep || '').replace(/"/g, '&quot;')}"><button type="button" class="btn btn-sm btn-danger" onclick="ReportsV2.removeManualWin(this)">Remove</button></div>`).join('');
            }
            document.getElementById('monthlyReportEditModal').classList.remove('hidden');
            document.getElementById('monthlyReportEditModal').dataset.period = period;
        })();
    },

    closeEditReportModal() {
        const m = document.getElementById('monthlyReportEditModal');
        if (m) m.classList.add('hidden');
    },

    addManualWinRow() {
        const wrap = document.getElementById('monthlyReportManualWinsWrap');
        if (!wrap) return;
        const div = document.createElement('div');
        div.className = 'monthly-report-manual-win';
        div.innerHTML = '<input type="text" placeholder="Client"><input type="text" placeholder="MRR"><input type="text" placeholder="Use case"><input type="text" placeholder="Presales rep"><button type="button" class="btn btn-sm btn-danger" onclick="ReportsV2.removeManualWin(this)">Remove</button>';
        wrap.appendChild(div);
    },

    removeManualWin(btn) {
        if (btn && btn.parentNode) btn.parentNode.remove();
    },

    async saveEditReportModal() {
        const modal = document.getElementById('monthlyReportEditModal');
        if (!modal) return;
        const period = modal.dataset.period;
        if (!period) return;
        const highlights = (document.getElementById('monthlyReportEditHighlights') && document.getElementById('monthlyReportEditHighlights').value) || '';
        const useCases = [0, 1, 2, 3, 4].map(i => (document.getElementById('monthlyReportUseCase' + i) && document.getElementById('monthlyReportUseCase' + i).value) || '');
        const winsWrap = document.getElementById('monthlyReportEditWinsWrap');
        const includedWinIds = [];
        if (winsWrap) {
            winsWrap.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                const id = cb.getAttribute('data-project-id');
                if (id) includedWinIds.push(id);
            });
        }
        const manualWins = [];
        const manualWrap = document.getElementById('monthlyReportManualWinsWrap');
        if (manualWrap) {
            manualWrap.querySelectorAll('.monthly-report-manual-win').forEach(row => {
                const inputs = row.querySelectorAll('input[type="text"]');
                if (inputs.length >= 4 && (inputs[0].value || inputs[1].value)) {
                    manualWins.push({ clientName: inputs[0].value, mrr: inputs[1].value, useCase: inputs[2].value, presalesRep: inputs[3].value });
                }
            });
        }
        const overrides = await DataManager.getReportOverrides();
        overrides[period] = { highlights, useCases, includedWinIds: includedWinIds.length ? includedWinIds : null, manualWins };
        await DataManager.saveReportOverrides(overrides);
        this.closeEditReportModal();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Report overrides saved.', 'success');
        this.render();
    },

    downloadChartsAsImages() {
        const ids = ['monthlyReportDonut', 'monthlyReportCallType', 'monthlyReportRegion', 'monthlyReportMissingSfdc', 'monthlyReportPresales'];
        const names = ['activity-breakdown', 'call-types', 'region-activity', 'missing-sfdc', 'presales-by-user'];
        ids.forEach((id, i) => {
            const canvas = document.getElementById(id);
            if (canvas && canvas.width > 0) {
                const link = document.createElement('a');
                link.download = names[i] + '-' + (this.currentPeriod || 'report') + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        });
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Charts downloaded.', 'success');
    },

    // Change activity breakdown filter
    changeActivityBreakdownFilter(filter) {
        this.activityBreakdownFilter = filter;
        const activities = this.getPeriodActivities();
        this.initActivityBreakdownChart(activities);
    },

    // Cutoff: only show activities from Jan 2026 onwards (pre-Dec/Jan cleanup)
    REPORTS_ACTIVITY_CUTOFF: '2026-01',

    // Get activities for the selected period (only Jan 2026+)
    async getPeriodActivities() {
        if (!this.currentPeriod) {
            console.warn('ReportsV2: currentPeriod is not set');
            return [];
        }

        const allActivities = await DataManager.getAllActivities();
        if (!allActivities || !allActivities.length) {
            console.warn('ReportsV2: No activities found in DataManager');
            return [];
        }

        const period = this.currentPeriod;
        const isYear = this.currentPeriodType === 'year';
        const cutoff = this.REPORTS_ACTIVITY_CUTOFF || '2026-01';

        let filtered = allActivities.filter(activity => {
            const activityDate = activity.date || activity.createdAt;
            if (!activityDate) return false;
            if (activityDate < cutoff) return false;

            if (isYear) {
                const activityYear = activityDate.substring(0, 4);
                return activityYear === period;
            } else {
                const activityMonth = activityDate.substring(0, 7);
                return activityMonth === period;
            }
        });

        // Sales leader: scope to their region only
        const currentUser = typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser() : null;
        if (currentUser && currentUser.role === 'sales_leader' && currentUser.salesLeaderRegion) {
            const region = currentUser.salesLeaderRegion;
            const accounts = await DataManager.getAccounts();
            const accountMap = accounts.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});
            filtered = filtered.filter(activity => {
                const activityRegion = activity.salesRepRegion || activity.region ||
                    (accountMap[activity.accountId] && (accountMap[activity.accountId].salesRepRegion || accountMap[activity.accountId].region)) ||
                    '';
                return activityRegion === region;
            });
        }

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
    async render() {
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

            // Also destroy any Chart.js instances that might be lingering on canvases
            if (typeof Chart !== 'undefined' && Chart.getChart) {
                const chartCanvases = [
                    'activityBreakdownChart',
                    'callTypeChart',
                    'presalesActivityChart',
                    'missingSfdcRegionalChart',
                    'industryRegionalChart',
                    'missingSfdcSalesRepChart',
                    'salesRepRequestsChart',
                    'industryTotalChart',
                    'industryAverageChart',
                    'monthlyReportDonut',
                    'monthlyReportCallType',
                    'monthlyReportRegion',
                    'monthlyReportMissingSfdc',
                    'monthlyReportPresales'
                ];

                chartCanvases.forEach(canvasId => {
                    const canvas = document.getElementById(canvasId);
                    if (canvas) {
                        const existingChart = Chart.getChart(canvas);
                        if (existingChart) {
                            try {
                                existingChart.destroy();
                            } catch (e) {
                                console.warn(`Error destroying chart on ${canvasId}:`, e);
                            }
                        }
                    }
                });
            }

            const activities = await this.getPeriodActivities();
            const periodLabel = this.formatPeriod(this.currentPeriod);

            console.log(`ReportsV2: Rendering reports for period ${this.currentPeriod} (${this.currentPeriodType}), ${activities.length} activities`);

            // Compute and cache data for charts
            this.cachedData = await this.computeReportData(activities);

            container.innerHTML = `
                <div class="reports-v2-container">
                    ${await this.renderHeader(periodLabel)}
                    ${await this.renderReportsTotalActivityRow(activities, periodLabel)}
                    ${this.renderTabNavigation()}
                    ${await this.renderTabContent(activities)}
                </div>
            `;

            // Initialize charts after render; double rAF + delay so layout is complete (fixes blank Internal vs External chart)
            const self = this;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        try {
                            self.initCharts(activities);
                        } catch (error) {
                            console.error('ReportsV2: Error initializing charts:', error);
                        }
                    }, 100);
                });
            });
        } catch (error) {
            console.error('ReportsV2: Error in render():', error);
            container.innerHTML = `<div class="error-message">Error loading reports: ${error.message}</div>`;
        }
    },

    // Total Activity – one row, horizontal with insights (Reports only)
    async renderReportsTotalActivityRow(activities, periodLabel) {
        const safe = activities && Array.isArray(activities) ? activities : [];
        const total = safe.length;
        const internal = safe.filter(a => a.isInternal === true).length;
        const external = safe.filter(a => !a.isInternal).length;
        const accounts = typeof DataManager !== 'undefined' ? await DataManager.getAccounts() : [];
        const regionCounts = {};
        safe.filter(a => !a.isInternal).forEach(a => {
            const account = accounts.find(ac => ac.id === a.accountId);
            const region = a.salesRepRegion || a.region || (account && account.region) || 'Unassigned';
            regionCounts[region] = (regionCounts[region] || 0) + 1;
        });
        const topRegionEntry = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0];
        const topRegionName = topRegionEntry ? topRegionEntry[0] : '—';
        const topRegionCount = topRegionEntry ? topRegionEntry[1] : 0;
        let winsPeriod = 0;
        let lossesPeriod = 0;
        const periodMonth = this.currentPeriodType === 'month' ? this.currentPeriod : null;
        if (periodMonth) {
            accounts.forEach(account => {
                account.projects?.forEach(project => {
                    if (project.status === 'won' || project.status === 'lost') {
                        const monthForWinLoss = project.winLossData?.monthOfWin ||
                            (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                        if (monthForWinLoss && monthForWinLoss === periodMonth) {
                            if (project.status === 'won') winsPeriod++;
                            else if (project.status === 'lost') lossesPeriod++;
                        }
                    }
                });
            });
        }
        return `
            <div class="reports-total-activity-row">
                <div class="reports-total-activity-main">
                    <span class="reports-total-activity-label">Total Activity</span>
                    <span class="reports-total-activity-value">${total.toLocaleString()}</span>
                    <span class="reports-total-activity-period">${periodLabel}</span>
                </div>
                <div class="reports-total-activity-insights">
                    <span class="reports-total-insight"><strong>Internal</strong> ${internal}</span>
                    <span class="reports-total-insight"><strong>External</strong> ${external}</span>
                    ${periodMonth && (winsPeriod > 0 || lossesPeriod > 0) ? `
                    <span class="reports-total-insight reports-total-insight--win"><strong>Wins</strong> ${winsPeriod}</span>
                    <span class="reports-total-insight reports-total-insight--loss"><strong>Losses</strong> ${lossesPeriod}</span>
                    ` : ''}
                    ${topRegionName !== '—' ? `<span class="reports-total-insight"><strong>Top region</strong> ${topRegionName} (${topRegionCount})</span>` : ''}
                </div>
            </div>
        `;
    },

    // Render tab navigation
    renderTabNavigation() {
        const isMonthly = this.activeTab === 'monthly';
        return `
            <div class="reports-v2-tabs reports-v2-tabs-with-edit">
                <div class="reports-v2-tabs-inner">
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
                    <button class="reports-v2-tab ${this.activeTab === 'monthly' ? 'active' : ''}" 
                            onclick="ReportsV2.switchTab('monthly')">
                        Monthly report (PDF)
                    </button>
                    <button class="reports-v2-tab ${this.activeTab === 'ai' ? 'active' : ''}" 
                            onclick="ReportsV2.switchTab('ai')">
                        AI Intelligence
                    </button>
                </div>
                ${isMonthly ? `<button type="button" id="reportsEditReportBtn" class="btn btn-primary reports-v2-edit-in-tabs" onclick="ReportsV2.openEditReportModal()">Edit report</button>` : ''}
            </div>
        `;
    },

    // Render tab content based on active tab
    async renderTabContent(activities) {
        switch (this.activeTab) {
            case 'presales':
                return await this.renderPresalesReports(activities);
            case 'sales':
                return `
                    ${await this.renderSalesView(activities)}
                    ${await this.renderProductLevelData(activities)}
                `;
            case 'regional':
                return await this.renderRegionalData(activities);
            case 'monthly':
                return await this.renderMonthlyReportPdf(activities);
            case 'ai':
                return this.renderAIIntelligencePlaceholder();
            default:
                return await this.renderPresalesReports(activities);
        }
    },

    // Monthly report (PDF-style): 8-page structure per MONTHLY_EMAIL_REPORT_SPEC – single scrollable view + Download PDF
    async renderMonthlyReportPdf(activities) {
        const periodLabel = this.formatPeriod(this.currentPeriod);
        const period = this.currentPeriod;
        const total = activities.length;
        const internalCount = activities.filter(a => a.isInternal).length;
        const externalCount = activities.filter(a => !a.isInternal).length;
        const accounts = typeof DataManager !== 'undefined' ? await DataManager.getAccounts() : [];
        const overrides = typeof DataManager !== 'undefined' ? await DataManager.getReportOverrides() : {};
        const o = period ? (overrides[period] || {}) : {};
        let winsPeriod = 0;
        let lossesPeriod = 0;
        const winsForPeriod = [];
        const periodMonth = this.currentPeriodType === 'month' ? this.currentPeriod : null;
        if (periodMonth && accounts.length) {
            accounts.forEach(account => {
                account.projects?.forEach(project => {
                    if (project.status === 'won' || project.status === 'lost') {
                        const monthForWinLoss = project.winLossData?.monthOfWin ||
                            (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                        if (monthForWinLoss === periodMonth) {
                            if (project.status === 'won') {
                                winsPeriod++;
                                const uc = (project.useCases && project.useCases[0]);
                                const useCaseText = typeof uc === 'string' ? uc : (uc && typeof uc === 'object' && uc.name) ? uc.name : '—';
                                winsForPeriod.push({
                                    projectId: project.id,
                                    accountId: account.id,
                                    accountName: account.name || 'Unknown',
                                    mrr: project.winLossData?.mrr ?? project.mrr ?? '—',
                                    useCase: useCaseText
                                });
                            } else if (project.status === 'lost') lossesPeriod++;
                        }
                    }
                });
            });
        }
        const breakdown = {
            'Customer Calls': activities.filter(a => a.type === 'customerCall').length,
            'Internal': internalCount,
            'Pricing': activities.filter(a => a.type === 'pricing').length,
            'POC': activities.filter(a => a.type === 'poc').length,
            'SOW': activities.filter(a => a.type === 'sow').length,
            'RFx': activities.filter(a => a.type === 'rfx').length
        };
        const callTypeData = (this.cachedData && this.cachedData.callTypeData) || {};
        const regionCounts = {};
        activities.filter(a => !a.isInternal).forEach(a => {
            const account = accounts.find(ac => ac.id === a.accountId);
            const region = a.salesRepRegion || a.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
            regionCounts[region] = (regionCounts[region] || 0) + 1;
        });
        const missingSfdcByRegion = {};
        activities.filter(a => !a.isInternal).forEach(a => {
            const account = accounts.find(ac => ac.id === a.accountId);
            const project = account && account.projects ? account.projects.find(p => p.id === a.projectId) : null;
            const hasSfdc = (account && account.sfdcLink) || (project && project.sfdcLink);
            if (!hasSfdc) {
                const region = a.salesRepRegion || a.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
                missingSfdcByRegion[region] = (missingSfdcByRegion[region] || 0) + 1;
            }
        });
        const userActivityMap = new Map();
        activities.forEach(activity => {
            const userId = activity.userId || activity.assignedUserEmail || 'unknown';
            const userName = activity.userName || 'Unknown';
            if (!userActivityMap.has(userId)) userActivityMap.set(userId, { userName, count: 0 });
            userActivityMap.get(userId).count++;
        });
        const userActivityData = Array.from(userActivityMap.entries())
            .map(([id, o]) => ({ id, name: o.userName, count: o.count }))
            .sort((a, b) => b.count - a.count);

        const regionsOrdered = Object.keys(regionCounts).sort((a, b) => (regionCounts[b] || 0) - (regionCounts[a] || 0));
        const callTypeOrder = ['Demo', 'Discovery', 'Scoping Deep Dive', 'Q&A', 'Follow-up', 'Customer Kickoff', 'Internal Kickoff'];

        this.monthlyReportData = {
            breakdown,
            callTypeData,
            regionCounts,
            missingSfdcByRegion,
            userActivityData,
            regionsOrdered,
            callTypeOrder,
            winsForPeriod
        };

        return `
            <div class="reports-v2-section monthly-report-pdf-section" id="monthlyReportPdfContent">
                <div class="reports-v2-monthly-pdf-actions">
                    <h2 class="reports-v2-section-title">Monthly report (PDF)</h2>
                    <p class="text-muted">Same structure as the email report. Use <strong>Edit report</strong> to change highlights, use cases and wins; then download or email.</p>
                    <div class="reports-v2-monthly-actions-btns">
                        <button type="button" id="reportsEditReportBtnContent" class="btn btn-primary" onclick="ReportsV2.openEditReportModal()">Edit report</button>
                        <button type="button" class="btn btn-outline" onclick="window.print(); return false;">Download PDF</button>
                        <button type="button" class="btn btn-outline" onclick="ReportsV2.downloadChartsAsImages()">Download charts as images</button>
                        <a class="btn btn-outline" id="monthlyReportEmailBtn" href="#">Email report</a>
                    </div>
                </div>
                <div class="monthly-report-pages">
                    <!-- Page 1 – Summary -->
                    <div class="monthly-report-page">
                        <h3>Presales Update – ${periodLabel}</h3>
                        <div class="monthly-report-summary-box">
                            <div class="monthly-report-summary-total">${total}</div>
                            <div class="monthly-report-summary-label">Total Activity</div>
                            <div class="monthly-report-summary-period">${periodLabel}</div>
                            <div class="monthly-report-summary-pills">
                                <span>Internal ${internalCount}</span>
                                <span>External ${externalCount}</span>
                                <span>Wins ${winsPeriod}</span>
                            </div>
                        </div>
                        <p class="text-muted small">Internal activities are presales-led, non-customer activities. External are customer-facing.</p>
                        <h4>Cube Analysis Top Highlights – Global <button type="button" class="btn btn-link btn-sm" onclick="ReportsV2.openEditReportModal()" style="font-size: 0.875rem;">Edit</button></h4>
                        ${(o.highlights && o.highlights.trim()) ? `<div class="monthly-report-highlights-text">${String(o.highlights).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>')}</div>` : ''}
                    </div>
                    <!-- Page 2 – Use cases (editable) -->
                    <div class="monthly-report-page">
                        <h3>Use cases across industries</h3>
                        <p class="text-muted">What each use case is, where it shows up, and takeaways from the data.</p>
                        <div class="monthly-report-use-cases">
                            ${[0, 1, 2, 3, 4].map(i => {
                                const text = (o.useCases && o.useCases[i]) ? o.useCases[i] : ['Lead gen & onboarding – industries and regional highlights from pipeline.', 'Loyalty & retention – win themes by region.', 'Support & FAQ – pipeline share by region.', 'Sales discovery & AI recommendation – regional strengths.', 'Operational automation – regional examples.'][i];
                                const safe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                return `<div class="monthly-report-use-case-card">${safe(text)}</div>`;
                            }).join('')}
                        </div>
                    </div>
                    <!-- Page 3 – Wins (editable: include/exclude + manual) -->
                    <div class="monthly-report-page">
                        <h3>Wins – ${periodLabel} <button type="button" class="btn btn-link btn-sm" onclick="ReportsV2.openEditReportModal()" style="font-size: 0.875rem;">Edit</button></h3>
                        <p class="text-muted">Use <strong>Edit report</strong> to include/exclude wins or add manual wins.</p>
                        <div class="monthly-report-wins-grid">
                            ${(() => {
                                const safe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                let displayWins = o.includedWinIds && o.includedWinIds.length ? winsForPeriod.filter(w => o.includedWinIds.includes(w.projectId)) : winsForPeriod;
                                const manual = o.manualWins || [];
                                const cards = displayWins.slice(0, 9).map(w => `<div class="monthly-report-win-card"><strong>${safe(w.accountName)}</strong><br/>MRR: ${safe(w.mrr)} | Use case: ${safe(w.useCase)}</div>`);
                                manual.forEach(mw => { cards.push(`<div class="monthly-report-win-card"><strong>${safe(mw.clientName || '')}</strong><br/>MRR: ${safe(mw.mrr || '')} | Use case: ${safe(mw.useCase || '')}${mw.presalesRep ? ' | ' + safe(mw.presalesRep) : ''}</div>`); });
                                return cards.length ? cards.slice(0, 12).join('') : '<p class="text-muted">No wins in this period. Add wins via Edit report.</p>';
                            })()}
                        </div>
                    </div>
                    <!-- Page 4 – Activity breakdown (donut chart) -->
                    <div class="monthly-report-page">
                        <h3>Activity breakdown</h3>
                        <p class="text-muted">Overall Activity</p>
                        <div class="monthly-report-chart-wrap" style="height: 280px;">
                            <canvas id="monthlyReportDonut" height="280"></canvas>
                        </div>
                    </div>
                    <!-- Page 5 – Call types (horizontal bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Call types</h3>
                        <div class="monthly-report-chart-wrap" style="height: 280px;">
                            <canvas id="monthlyReportCallType" height="280"></canvas>
                        </div>
                    </div>
                    <!-- Page 6 – Region activity (vertical bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Regional intelligence</h3>
                        <p class="text-muted">${periodLabel} (External only)</p>
                        <div class="monthly-report-chart-wrap" style="height: 300px;">
                            <canvas id="monthlyReportRegion" height="300"></canvas>
                        </div>
                    </div>
                    <!-- Page 7 – Missing SFDC (vertical bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Missing SFDC opportunities</h3>
                        <p class="text-muted">External activities where project/account has no SFDC link. ${periodLabel}.</p>
                        <div class="monthly-report-chart-wrap" style="height: 300px;">
                            <canvas id="monthlyReportMissingSfdc" height="300"></canvas>
                        </div>
                    </div>
                    <!-- Page 8 – Presales individual activity (horizontal bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Presales individual activity</h3>
                        <p class="text-muted">Activities by user – ${periodLabel}</p>
                        <div class="monthly-report-chart-wrap" style="height: 300px;">
                            <canvas id="monthlyReportPresales" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // AI Intelligence tab – placeholder; data/analysis will be wired later
    renderAIIntelligencePlaceholder() {
        const periodLabel = this.formatPeriod(this.currentPeriod);
        return `
            <div class="reports-v2-section">
                <h2 class="reports-v2-section-title">AI Intelligence</h2>
                <div class="reports-v2-card reports-v2-card-wide" style="text-align: center; padding: 3rem 2rem;">
                    <p class="text-muted" style="font-size: 1.125rem; margin-bottom: 1rem;">
                        AI-driven insights will run on your submitted data (e.g. for ${periodLabel}) and appear here.
                    </p>
                    <p class="text-muted" style="font-size: 0.9375rem;">
                        This tab will show summaries, trends, and recommendations based on activities, regions, and sales data once the pipeline is connected.
                    </p>
                </div>
            </div>
        `;
    },

    // Compute all report data
    async computeReportData(activities) {
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

        // Call type (details.callType: Demo, Discovery, etc.) – external Customer Call activities only
        data.callTypeData = {};
        activities.forEach(activity => {
            if (!activity.isInternal && activity.type === 'customerCall') {
                const callType = (activity.details && activity.details.callType) ? activity.details.callType : 'Not specified';
                data.callTypeData[callType] = (data.callTypeData[callType] || 0) + 1;
            }
        });

        // Industry data
        const accounts = await DataManager.getAccounts();
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
    async renderHeader(periodLabel) {
        const availableMonths = await DataManager.getAvailableActivityMonths();
        const availableYears = await DataManager.getAvailableActivityYears();
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
    async renderPresalesReports(activities) {
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

                    <!-- Internal vs External Activity – numbers only (no chart) -->
                    <div class="reports-v2-card">
                        <div class="reports-v2-card-header">
                            <h3>Internal vs External Activity</h3>
                            <span class="text-muted">${this.formatPeriod(this.currentPeriod)}</span>
                        </div>
                        <div class="reports-v2-card-body reports-v2-internal-external-box">
                            <div class="reports-v2-internal-external-row">
                                <span class="reports-v2-internal-external-label">Internal</span>
                                <span class="reports-v2-internal-external-value">${(this.cachedData && this.cachedData.internalCount) || 0}</span>
                            </div>
                            <div class="reports-v2-internal-external-row">
                                <span class="reports-v2-internal-external-label">External</span>
                                <span class="reports-v2-internal-external-value">${(this.cachedData && this.cachedData.externalCount) || 0}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Call Type (Demo, Discovery, etc.) -->
                    <div class="reports-v2-card">
                        <div class="reports-v2-card-header">
                            <h3>Call Types</h3>
                        </div>
                        <div class="reports-v2-card-body">
                            ${Object.keys(this.cachedData.callTypeData || {}).length > 0 ? `
                                <canvas id="callTypeChart" height="280"></canvas>
                            ` : `
                                <p class="reports-v2-empty">No call type data for this period.</p>
                            `}
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
    async renderSalesView(activities) {
        // Missing SFDC Links - Regional bar graph
        const accounts = await DataManager.getAccounts();
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
    async renderRegionalData(activities) {
        const accounts = await DataManager.getAccounts();

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

        // Region-wise missing SFDC opps by reps (group by region, then rep) for this month
        const regionRepMissingMap = new Map();
        salesRepMissingData.forEach(item => {
            const region = item.region || 'Unknown';
            if (!regionRepMissingMap.has(region)) {
                regionRepMissingMap.set(region, []);
            }
            regionRepMissingMap.get(region).push({
                salesRep: item.name,
                missingCount: item.missingCount,
                accountCount: item.accountCount
            });
        });
        regionRepMissingMap.forEach((reps) => reps.sort((a, b) => b.missingCount - a.missingCount));
        const regionRepMissingData = Array.from(regionRepMissingMap.entries())
            .map(([region, reps]) => ({ region, reps }))
            .sort((a, b) => (a.region || '').localeCompare(b.region || ''));

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
                    <!-- Region-wise missing SFDC opps by reps (this month) -->
                    <div class="reports-v2-card reports-v2-card-wide">
                        <div class="reports-v2-card-header">
                            <h3>Region-wise missing SFDC opps by reps</h3>
                            <span class="text-muted">${this.formatPeriod(this.currentPeriod)} – external activities missing SFDC link</span>
                        </div>
                        <div class="reports-v2-card-body">
                            ${regionRepMissingData.length > 0 ? regionRepMissingData.map(({ region, reps }) => `
                                <div class="reports-v2-region-block" style="margin-bottom: 1.25rem;">
                                    <h4 class="reports-v2-region-heading" style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--gray-700);">${region}</h4>
                                    <div class="reports-v2-table-container">
                                        <table class="reports-v2-table">
                                            <thead>
                                                <tr>
                                                    <th>Sales Rep</th>
                                                    <th># Missing Opps</th>
                                                    <th># Accounts</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${reps.map(r => `
                                                    <tr>
                                                        <td>${r.salesRep}</td>
                                                        <td>${r.missingCount}</td>
                                                        <td>${r.accountCount}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `).join('') : `
                                <p class="reports-v2-empty">No missing SFDC opps by region for this period.</p>
                            `}
                        </div>
                    </div>

                    <!-- Sales Rep Missing Opportunities (flat table) -->
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
    async renderProductLevelData(activities) {
        // Industry Wise - Total Activities
        const industryActivityMap = new Map();
        const industryAccountMap = new Map();
        const accounts = await DataManager.getAccounts();

        activities.forEach(activity => {
            if (!activity.isInternal && activity.accountId) {
                const account = accounts.find(a => a.id === activity.accountId);
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
    async initCharts(activities) {
        const safeActivities = activities && Array.isArray(activities) ? activities : [];
        const accounts = await DataManager.getAccounts();

        try {
            if (typeof Chart !== 'undefined') {
                try { Chart.register(this.chartValueLabelsPlugin); } catch (_) { /* already registered */ }
            }
            // Presales Activity Report (only in Presales tab)
            if (this.activeTab === 'presales') {
                const presalesActivityCanvas = document.getElementById('presalesActivityChart');
                if (presalesActivityCanvas) {
                    const userActivityMap = new Map();
                    safeActivities.forEach(activity => {
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
                        // Destroy existing chart
                        if (this.charts['presalesActivityChart']) {
                            try {
                                this.charts['presalesActivityChart'].destroy();
                            } catch (e) {
                                console.warn('Error destroying presalesActivityChart:', e);
                            }
                            delete this.charts['presalesActivityChart'];
                        }
                        if (Chart.getChart && Chart.getChart(presalesActivityCanvas)) {
                            try {
                                Chart.getChart(presalesActivityCanvas).destroy();
                            } catch (e) {
                                console.warn('Error destroying Chart.js instance:', e);
                            }
                        }

                        this.renderHorizontalBarChart('presalesActivityChart', {
                            labels: userActivityData.map(u => u.userName),
                            data: userActivityData.map(u => u.count),
                            label: 'Activities'
                        });
                    }
                }
            }

            // Activity Breakdown - Donut Chart with Filter (only if Presales tab)
            if (this.activeTab === 'presales') {
                this.initActivityBreakdownChart(safeActivities);
            }

            // Call Type chart (Demo, Discovery, etc.) - Presales tab
            if (this.activeTab === 'presales') {
                const callTypeCanvas = document.getElementById('callTypeChart');
                if (callTypeCanvas && this.cachedData && this.cachedData.callTypeData) {
                    const callTypeEntries = Object.entries(this.cachedData.callTypeData)
                        .filter(([, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1]);
                    if (callTypeEntries.length > 0) {
                        if (this.charts['callTypeChart']) {
                            try { this.charts['callTypeChart'].destroy(); } catch (e) { /* ignore */ }
                            delete this.charts['callTypeChart'];
                        }
                        if (Chart.getChart && Chart.getChart(callTypeCanvas)) {
                            try { Chart.getChart(callTypeCanvas).destroy(); } catch (e) { /* ignore */ }
                        }
                        this.renderHorizontalBarChart('callTypeChart', {
                            labels: callTypeEntries.map(([name]) => name),
                            data: callTypeEntries.map(([, count]) => count),
                            label: 'Activities'
                        });
                    }
                }
            }

            // Missing SFDC Links - Regional Bar Chart (Sales View)
            if (this.activeTab === 'sales') {
                const missingSfdcCanvas = document.getElementById('missingSfdcRegionalChart');
                if (missingSfdcCanvas) {
                    const regionMissingMap = new Map();
                    safeActivities.forEach(activity => {
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
                        // Destroy existing chart
                        if (this.charts['missingSfdcRegionalChart']) {
                            try {
                                this.charts['missingSfdcRegionalChart'].destroy();
                            } catch (e) {
                                console.warn('Error destroying missingSfdcRegionalChart:', e);
                            }
                            delete this.charts['missingSfdcRegionalChart'];
                        }
                        if (Chart.getChart && Chart.getChart(missingSfdcCanvas)) {
                            try {
                                Chart.getChart(missingSfdcCanvas).destroy();
                            } catch (e) {
                                console.warn('Error destroying Chart.js instance:', e);
                            }
                        }

                        this.renderBarChart('missingSfdcRegionalChart', {
                            labels: regionMissingData.map(d => d.region),
                            data: regionMissingData.map(d => d.count),
                            label: 'Missing SFDC Links'
                        });
                    }
                }
            }

            // Regional Data Charts
            if (this.activeTab === 'regional') {
                // Industry Wise Regional Traffic
                const industryRegionalCanvas = document.getElementById('industryRegionalChart');
                if (industryRegionalCanvas) {
                    const regionIndustryMap = new Map();
                    safeActivities.forEach(activity => {
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
                        // Destroy existing chart
                        if (this.charts['industryRegionalChart']) {
                            try {
                                this.charts['industryRegionalChart'].destroy();
                            } catch (e) {
                                console.warn('Error destroying industryRegionalChart:', e);
                            }
                            delete this.charts['industryRegionalChart'];
                        }
                        if (Chart.getChart && Chart.getChart(industryRegionalCanvas)) {
                            try {
                                Chart.getChart(industryRegionalCanvas).destroy();
                            } catch (e) {
                                console.warn('Error destroying Chart.js instance:', e);
                            }
                        }

                        this.renderHorizontalStackedBarChart('industryRegionalChart', {
                            labels: regionLabels,
                            datasets: datasets
                        });
                    }
                }

                // Missing SFDC Links by Sales Rep
                const missingSfdcSalesRepCanvas = document.getElementById('missingSfdcSalesRepChart');
                if (missingSfdcSalesRepCanvas) {
                    const salesRepSfdcMap = new Map();
                    safeActivities.forEach(activity => {
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
                        // Destroy existing chart
                        if (this.charts['missingSfdcSalesRepChart']) {
                            try {
                                this.charts['missingSfdcSalesRepChart'].destroy();
                            } catch (e) {
                                console.warn('Error destroying missingSfdcSalesRepChart:', e);
                            }
                            delete this.charts['missingSfdcSalesRepChart'];
                        }
                        if (Chart.getChart && Chart.getChart(missingSfdcSalesRepCanvas)) {
                            try {
                                Chart.getChart(missingSfdcSalesRepCanvas).destroy();
                            } catch (e) {
                                console.warn('Error destroying Chart.js instance:', e);
                            }
                        }

                        this.renderHorizontalBarChart('missingSfdcSalesRepChart', {
                            labels: salesRepSfdcData.map(([name]) => name),
                            data: salesRepSfdcData.map(([, count]) => count),
                            label: 'Missing SFDC Links'
                        });
                    }
                }
            }

            // Sales Rep Most Requests (only in Regional Data tab)
            if (this.activeTab === 'regional') {
                const salesRepMap = new Map();
                safeActivities.forEach(activity => {
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
            }

            // Industry Total Activities (in Sales View tab - Product Level Data section)
            if (this.activeTab === 'sales') {
                const industryTotalCanvas = document.getElementById('industryTotalChart');
                const industryAverageCanvas = document.getElementById('industryAverageChart');

                if (industryTotalCanvas) {
                    const industryActivityMap = new Map();
                    safeActivities.forEach(activity => {
                        if (!activity.isInternal && activity.accountId) {
                            const account = accounts.find(a => a.id === activity.accountId);
                            if (account && account.industry) {
                                const industry = account.industry;
                                industryActivityMap.set(industry, (industryActivityMap.get(industry) || 0) + 1);
                            }
                        }
                    });
                    const industryData = Array.from(industryActivityMap.entries())
                        .sort((a, b) => b[1] - a[1]);

                    if (industryData.length > 0) {
                        // Destroy existing chart
                        if (this.charts['industryTotalChart']) {
                            try {
                                this.charts['industryTotalChart'].destroy();
                            } catch (e) {
                                console.warn('Error destroying industryTotalChart:', e);
                            }
                            delete this.charts['industryTotalChart'];
                        }
                        if (Chart.getChart && Chart.getChart(industryTotalCanvas)) {
                            try {
                                Chart.getChart(industryTotalCanvas).destroy();
                            } catch (e) {
                                console.warn('Error destroying Chart.js instance:', e);
                            }
                        }

                        this.renderHorizontalBarChart('industryTotalChart', {
                            labels: industryData.map(([industry]) => industry),
                            data: industryData.map(([, count]) => count),
                            label: 'Total Activities'
                        });
                    }
                }

                // Industry Average Activities
                if (industryAverageCanvas) {
                    const industryAvgMap = new Map();
                    safeActivities.forEach(activity => {
                        if (!activity.isInternal && activity.accountId) {
                            const account = accounts.find(a => a.id === activity.accountId);
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
                        // Destroy existing chart
                        if (this.charts['industryAverageChart']) {
                            try {
                                this.charts['industryAverageChart'].destroy();
                            } catch (e) {
                                console.warn('Error destroying industryAverageChart:', e);
                            }
                            delete this.charts['industryAverageChart'];
                        }
                        if (Chart.getChart && Chart.getChart(industryAverageCanvas)) {
                            try {
                                Chart.getChart(industryAverageCanvas).destroy();
                            } catch (e) {
                                console.warn('Error destroying Chart.js instance:', e);
                            }
                        }

                        this.renderHorizontalBarChart('industryAverageChart', {
                            labels: industryAvgData.map(d => d.industry),
                            data: industryAvgData.map(d => parseFloat(d.average.toFixed(2))),
                            label: 'Average Activities'
                        });
                    }
                }
            }

            // Monthly report (PDF) tab – same charts as spec: donut, call type, region, missing SFDC, presales by user
            if (this.activeTab === 'monthly' && this.monthlyReportData) {
                const md = this.monthlyReportData;
                const donutColors = ['#4299E1', '#48BB78', '#ED8936', '#9F7AEA', '#38B2AC', '#ED64A6'];
                if (document.getElementById('monthlyReportDonut') && md.breakdown) {
                    const labels = Object.keys(md.breakdown);
                    const data = Object.values(md.breakdown);
                    if (data.some(v => v > 0)) {
                        this.renderDonutChart('monthlyReportDonut', {
                            labels,
                            data,
                            colors: donutColors
                        });
                    }
                }
                if (document.getElementById('monthlyReportCallType') && md.callTypeData) {
                    const callEntries = (md.callTypeOrder || Object.keys(md.callTypeData)).map(label => [label, md.callTypeData[label] || 0]).filter(([, c]) => c > 0);
                    if (callEntries.length > 0) {
                        this.renderHorizontalBarChart('monthlyReportCallType', {
                            labels: callEntries.map(([n]) => n),
                            data: callEntries.map(([, c]) => c),
                            label: 'Activities'
                        });
                    }
                }
                if (document.getElementById('monthlyReportRegion') && md.regionsOrdered && md.regionsOrdered.length > 0) {
                    this.renderBarChart('monthlyReportRegion', {
                        labels: md.regionsOrdered,
                        data: md.regionsOrdered.map(r => md.regionCounts[r] || 0),
                        label: 'Activities'
                    });
                }
                if (document.getElementById('monthlyReportMissingSfdc')) {
                    const missingEntries = Object.entries(md.missingSfdcByRegion || {}).sort((a, b) => b[1] - a[1]);
                    if (missingEntries.length > 0) {
                        this.renderBarChart('monthlyReportMissingSfdc', {
                            labels: missingEntries.map(([r]) => r),
                            data: missingEntries.map(([, c]) => c),
                            label: 'Missing SFDC'
                        });
                    }
                }
                if (document.getElementById('monthlyReportPresales') && md.userActivityData && md.userActivityData.length > 0) {
                    this.renderHorizontalBarChart('monthlyReportPresales', {
                        labels: md.userActivityData.map(u => (u.name || u.id || '—').toString().slice(0, 20)),
                        data: md.userActivityData.map(u => u.count),
                        label: 'Activities'
                    });
                }
                const emailBtn = document.getElementById('monthlyReportEmailBtn');
                if (emailBtn) emailBtn.href = 'mailto:?subject=' + encodeURIComponent('Presales Update ' + this.formatPeriod(this.currentPeriod));
            }
        } catch (error) {
            console.error('ReportsV2: Error in initCharts():', error);
        }
    },

    renderBarChart(canvasId, { labels, data, label }) {
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
                console.warn(`Error destroying chart ${canvasId} from cache:`, e);
            }
            delete this.charts[canvasId];
        }

        // Also check Chart.js registry
        if (Chart.getChart && Chart.getChart(canvas)) {
            try {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            } catch (e) {
                console.warn(`Error destroying Chart.js instance on ${canvasId}:`, e);
            }
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
            console.log(`Successfully created bar chart ${canvasId}`);
        } catch (error) {
            console.error(`Error creating bar chart ${canvasId}:`, error);
            console.error('Error stack:', error.stack);
        }
    },

    renderHorizontalBarChart(canvasId, { labels, data, label }) {
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
                console.warn(`Error destroying chart ${canvasId} from cache:`, e);
            }
            delete this.charts[canvasId];
        }

        // Also check Chart.js registry
        if (Chart.getChart && Chart.getChart(canvas)) {
            try {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            } catch (e) {
                console.warn(`Error destroying Chart.js instance on ${canvasId}:`, e);
            }
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
            console.log(`Successfully created horizontal bar chart ${canvasId}`);
        } catch (error) {
            console.error(`Error creating horizontal bar chart ${canvasId}:`, error);
            console.error('Error stack:', error.stack);
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
                            label: function (context) {
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
                beforeDraw: function (chart) {
                    if (!chart.chartArea || chart.chartArea.right <= chart.chartArea.left || chart.chartArea.bottom <= chart.chartArea.top) return;
                    const ctx = chart.ctx;
                    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
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

    // Render horizontal stacked bar chart (regions/industries on Y, count on X)
    renderHorizontalStackedBarChart(canvasId, { labels, datasets }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') {
            console.warn(`Chart canvas not found or Chart.js not loaded: ${canvasId}`);
            return;
        }
        if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
            console.warn(`Invalid datasets for chart ${canvasId}`);
            return;
        }
        if (this.charts[canvasId]) {
            try { this.charts[canvasId].destroy(); } catch (e) { /* ignore */ }
            delete this.charts[canvasId];
        }
        if (Chart.getChart && Chart.getChart(canvas)) {
            try { Chart.getChart(canvas).destroy(); } catch (e) { /* ignore */ }
        }
        try {
            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: { display: true, position: 'bottom' }
                    }
                }
            });
        } catch (error) {
            console.error(`Error creating horizontal stacked bar chart ${canvasId}:`, error);
        }
    }
};

// Expose globally (only once)
if (typeof window !== 'undefined' && !window.ReportsV2) {
    window.ReportsV2 = ReportsV2;
    // Register value-labels plugin as soon as Chart is available (avoids "not a registered plugin" when Reports loads first)
    if (typeof Chart !== 'undefined') {
        try { Chart.register(ReportsV2.chartValueLabelsPlugin); } catch (_) { /* already registered */ }
    }
}
