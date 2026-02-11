// Analytics rendering helpers
const Analytics = (() => {
    const config = {
        chartHeight: 260,
        topUsersLimit: 8,
        topIndustryLimit: 7,
        palette: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795', '#F6AD55', '#63B3ED', '#4A5568'],
        extendedPalette: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795', '#F6AD55', '#63B3ED', '#4A5568', '#B794F4', '#68D391', '#F56565', '#ECC94B', '#4FD1C5', '#9F7AEA', '#ED64A6'],
        insightCopy: {
            target: 'Actual activities versus the presales target for the selected period.',
            mix: 'Distribution of external activity types logged in this period.',
            userStack: 'Breakdown of activity types owned by each presales user.',
            products: 'Products discussed per industry (top industries grouped).',
            industry: 'Total external activities logged per industry.',
            trend: 'Won vs. lost projects trend over the last six months.',
            channels: 'Channels associated with won and lost projects.',
            poc: 'POC requests, wins, and losses grouped by access type.'
        }
    };

    const charts = {};

    const formatNumber = (value) => Number(value || 0).toLocaleString();

    const infoIcon = (key) => config.insightCopy[key]
        ? `<span class="chart-info" title="${config.insightCopy[key]}">&#9432;</span>`
        : '';

    function buildMarkup(analytics, options = {}) {
        const {
            variant = 'standard',
            periodType = analytics.periodType || 'month',
            periodValue = analytics.periodValue || analytics.month,
            periodOptions = [],
            periodLabel,
            allowPeriodShift = true
        } = options;

        const prefix = variant === 'card' ? 'card' : 'reports';
        const wrapperClass = variant === 'card' ? 'content-card' : 'card';
        const headerClass = variant === 'card' ? 'content-card-header' : 'card-header';
        const bodyClass = variant === 'card' ? 'analytics-card-body' : 'card-body';
        const periodInputId = variant === 'card' ? 'cardReportMonth' : 'reportMonth';
        const viewLabel = periodType === 'year' ? 'Annual' : 'Monthly';
        const formatMonth = (value) => {
            if (!value) return 'Unknown';
            if (typeof DataManager !== 'undefined' && typeof DataManager.formatMonth === 'function') {
                return DataManager.formatMonth(value);
            }
            return value;
        };
        const displayPeriod = periodLabel
            ? periodLabel
            : (periodType === 'year' ? (periodValue || '') : formatMonth(periodValue || analytics.month));

        const onChangeHandler = variant === 'card'
            ? 'App.handleCardReportMonthChange(this.value)'
            : 'App.handleReportPeriodInput(this.value)';

        const titleMarkup = variant === 'card'
            ? `<h2 class="content-card-title">${viewLabel} Analytics - ${displayPeriod}</h2>`
            : `<h3>${viewLabel} Analytics - ${displayPeriod}</h3>`;

        const periodToggleMarkup = variant === 'card'
            ? ''
            : `
                <div class="analytics-period-toggle">
                    <button type="button"
                            class="btn btn-sm ${periodType === 'month' ? 'btn-primary' : 'btn-outline'}"
                            onclick="App.setAnalyticsPeriodMode('month')">
                        Monthly
                    </button>
                    <button type="button"
                            class="btn btn-sm ${periodType === 'year' ? 'btn-primary' : 'btn-outline'}"
                            onclick="App.setAnalyticsPeriodMode('year')">
                        Annual
                    </button>
                </div>
            `;

        const periodPickerMarkup = (periodType === 'year' && variant !== 'card')
            ? `
                <select id="${periodInputId}"
                        class="form-control"
                        onchange="${onChangeHandler}"
                        style="width: auto;">
                    ${(periodOptions.length ? periodOptions : [periodValue]).map(option => `
                        <option value="${option}" ${option === periodValue ? 'selected' : ''}>${option}</option>
                    `).join('')}
                </select>
            `
            : `
                <input type="month"
                       id="${periodInputId}"
                       class="form-control"
                       value="${periodValue || ''}"
                       onchange="${onChangeHandler}"
                       style="width: auto;">
            `;

        const periodControlsMarkup = variant === 'card'
            ? periodPickerMarkup
            : `
                <div class="analytics-period-controls">
                    ${periodToggleMarkup}
                    ${periodPickerMarkup}
                </div>
            `;

        const statsMarkup = `
            <div class="stats-grid analytics-stats">
                <div class="stat-card">
                    <h4>Target per Presales</h4>
                    <div class="stat-value">${formatNumber(analytics.targetValue)}</div>
                </div>
                <div class="stat-card">
                    <h4>Presales Users</h4>
                    <div class="stat-value">${formatNumber(analytics.totalPresalesUsers)}</div>
                </div>
                <div class="stat-card">
                    <h4>Team Target</h4>
                    <div class="stat-value">${formatNumber(analytics.teamTarget)}</div>
                </div>
                <div class="stat-card">
                    <h4>Activities This Period</h4>
                    <div class="stat-value">${formatNumber(analytics.totalActivities)}</div>
                </div>
            </div>
        `;

        const targetMeta = analytics.target?.updatedAt
            ? `Target updated ${typeof DataManager !== 'undefined' && DataManager.formatDate ? DataManager.formatDate(analytics.target.updatedAt) : analytics.target.updatedAt}${analytics.target.updatedBy ? ` by ${analytics.target.updatedBy}` : ''}.`
            : `Default target active. Update the presales target from Admin → Analytics Targets.`;

        const categorySummary = `
            <div class="analytics-category-summary">
                <span><strong>External:</strong> ${formatNumber(analytics.externalActivities)}</span>
                <span><strong>Internal:</strong> ${formatNumber(analytics.internalActivities)}</span>
                <span><strong>Wins:</strong> ${formatNumber(analytics.totalWonActivities || 0)}</span>
                <span><strong>Losses:</strong> ${formatNumber(analytics.totalLostActivities || 0)}</span>
            </div>
        `;

        const periodMonthsSummary = periodType === 'year' && Array.isArray(analytics.monthsInPeriod) && analytics.monthsInPeriod.length
            ? `<p class="text-muted analytics-note analytics-period-note">Covers ${analytics.monthsInPeriod.map(month => formatMonth(month)).join(', ')}.</p>`
            : '';

        const loaderMarkup = `
            <div id="${prefix}AnalyticsLoading" class="analytics-loading hidden">
                <div class="spinner"></div>
                <span>Crunching the latest activity insights…</span>
            </div>
        `;

        const chartsMarkup = `
            <div class="analytics-grid">
                <div class="chart-card">
                    <div class="chart-card-title">Team Target vs Actual ${infoIcon('target')}</div>
                    <canvas id="${prefix}TargetChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-card-title">Activity Mix ${infoIcon('mix')}</div>
                    <canvas id="${prefix}ActivityPieChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-card-title">Activities by User & Type ${infoIcon('userStack')}</div>
                    <canvas id="${prefix}UserStackedChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card chart-card-scroll">
                    <div class="chart-card-title">Products Discussed by Industry ${infoIcon('products')}</div>
                    <canvas id="${prefix}IndustryProductChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-card-title">Industry-wise Activity Volume ${infoIcon('industry')}</div>
                    <canvas id="${prefix}IndustryActivityChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-card-title">Win/Loss Trend (6 months) ${infoIcon('trend')}</div>
                    <canvas id="${prefix}WinLossTrendChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-card-title">Channels vs Outcomes ${infoIcon('channels')}</div>
                    <canvas id="${prefix}ChannelOutcomeChart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-card-title">POC Funnel Overview ${infoIcon('poc')}</div>
                    <canvas id="${prefix}PocFunnelChart" height="${config.chartHeight}"></canvas>
                </div>
            </div>
            <p class="text-muted analytics-note">Need more data? Log fresh activities to keep the insights current.</p>
        `;

        return `
            <div class="${wrapperClass}">
                <div class="${headerClass}">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                        ${titleMarkup}
                        ${periodControlsMarkup}
                    </div>
                </div>
                <div class="${bodyClass}">
                    ${loaderMarkup}
                    <div id="${prefix}AnalyticsWrapper">
                        ${statsMarkup}
                        ${categorySummary}
                        ${periodMonthsSummary}
                        <p class="text-muted analytics-note">${targetMeta}</p>
                        ${chartsMarkup}
                    </div>
                </div>
            </div>
        `;
    }

    async function renderCharts({ prefix, analytics }) {
        destroyCharts(prefix);

        renderTargetChart(prefix, analytics);
        renderActivityMixChart(prefix, analytics);
        renderUserStackChart(prefix, analytics);
        renderProductsByIndustryChart(prefix, analytics);
        renderIndustryVolumeChart(prefix, analytics);
        await renderWinLossTrend(prefix, analytics);
        await renderChannelOutcomeChart(prefix, analytics);
        await renderPocFunnelChart(prefix, analytics);
    }

    function destroyCharts(prefix) {
        Object.keys(charts).forEach(key => {
            if (!prefix || key.startsWith(prefix)) {
                charts[key].destroy();
                delete charts[key];
            }
        });
    }

    function prepareCanvas(canvas) {
        if (!canvas) return false;
        canvas.style.display = 'block';
        const card = canvas.closest('.chart-card');
        if (card) {
            card.querySelectorAll('.chart-empty').forEach(el => el.remove());
        }
        return true;
    }

    function renderEmptyState(canvas, message, ctaLabel = 'Log Activity', ctaAction = 'Activities.openActivityModal()') {
        if (!canvas) return;
        const card = canvas.closest('.chart-card');
        if (!card) return;
        canvas.style.display = 'none';
        if (!card.querySelector('.chart-empty')) {
            const note = document.createElement('div');
            note.className = 'chart-empty text-muted';
            note.innerHTML = `
                ${message}
                <div style="margin-top: 0.75rem;">
                    <button class="btn btn-link btn-sm" style="padding-left: 0;" onclick="${ctaAction}; return false;">${ctaLabel}</button>
                </div>
            `;
            card.appendChild(note);
        }
    }

    function registerChart(prefix, key, instance) {
        charts[`${prefix}-${key}`] = instance;
    }

    function getPalette(extended = false) {
        return extended ? config.extendedPalette : config.palette;
    }

    function renderTargetChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}TargetChart`);
        if (!prepareCanvas(canvas)) return;

        const summaries = (analytics.userSummaries || []).filter(summary => summary.total > 0);
        if (!summaries.length) {
        renderEmptyState(canvas, 'No user activity logged for this period.');
            return;
        }

        const presalesUsers = analytics.presalesUsers || [];
        const orderedSummaries = presalesUsers.map(user => ({
            userName: user.userName,
            total: summaries.find(summary => summary.userId === user.userId)?.total || 0
        }));

        if (!orderedSummaries.length) {
            renderEmptyState(canvas, 'No user activity logged for this period.');
            return;
        }

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: orderedSummaries.map(item => item.userName),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Actual Activities',
                        data: orderedSummaries.map(item => item.total),
                        backgroundColor: '#6B46C1',
                        borderRadius: 6
                    },
                    {
                        type: 'line',
                        label: `Target (${analytics.periodTargetValue || analytics.targetValue})`,
                        data: orderedSummaries.map(() => analytics.periodTargetValue || analytics.targetValue),
                        borderColor: '#F56565',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.2,
                        pointBackgroundColor: '#F56565'
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
        });
        registerChart(prefix, 'target', chart);
    }

    function renderActivityMixChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}ActivityPieChart`);
        if (!prepareCanvas(canvas)) return;

        const activityEntries = Object.entries(analytics.activityTypeCounts || {});
        const totalActivities = activityEntries.reduce((acc, [, count]) => acc + count, 0);

        if (!totalActivities) {
            renderEmptyState(canvas, 'No external activities recorded this period.');
            return;
        }

        const labels = activityEntries.map(([type]) => UI.getActivityTypeLabel(type));
        const data = activityEntries.map(([, count]) => count);
        const colors = labels.map((_, idx) => getPalette()[idx % getPalette().length]);

        const chart = new Chart(canvas, {
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
        });
        registerChart(prefix, 'pie', chart);
    }

    function renderUserStackChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}UserStackedChart`);
        if (!prepareCanvas(canvas)) return;

        const summaries = (analytics.userSummaries || []).filter(summary => summary.total > 0);
        if (!summaries.length) {
            renderEmptyState(canvas, 'No user activity logged this period.');
            return;
        }

        const sortedUsers = [...summaries].sort((a, b) => b.total - a.total).slice(0, config.topUsersLimit);
        const overflow = summaries.slice(config.topUsersLimit);
        if (overflow.length) {
            const aggregated = overflow.reduce((acc, summary) => {
                Object.entries(summary.types || {}).forEach(([type, count]) => {
                    acc.types[type] = (acc.types[type] || 0) + count;
                });
                acc.total += summary.total;
                return acc;
            }, { userName: 'Other Users', total: 0, types: {} });
            if (aggregated.total > 0) {
                sortedUsers.push(aggregated);
            }
        }

        const typeSet = new Set();
        sortedUsers.forEach(summary => {
            Object.keys(summary.types || {}).forEach(type => typeSet.add(type));
        });
        const typeKeys = Array.from(typeSet);
        if (!typeKeys.length) {
            renderEmptyState(canvas, 'No activity type data available.');
            return;
        }

        const labels = sortedUsers.map(summary => summary.userName);
        const datasets = typeKeys.map((type, index) => ({
            label: UI.getActivityTypeLabel(type),
            data: sortedUsers.map(summary => summary.types?.[type] || 0),
            backgroundColor: getPalette()[index % getPalette().length],
            stack: 'activity'
        }));

        const chart = new Chart(canvas, {
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
        });
        registerChart(prefix, 'stacked', chart);
    }

    function renderProductsByIndustryChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}IndustryProductChart`);
        if (!prepareCanvas(canvas)) return;

        const industryEntries = Object.entries(analytics.industryCounts || {}).sort((a, b) => b[1] - a[1]);
        const limitedIndustryEntries = industryEntries.slice(0, config.topIndustryLimit);
        const industryLabels = limitedIndustryEntries.map(([name]) => name);
        const productEntries = Object.entries(analytics.productTotals || {}).sort((a, b) => b[1] - a[1]);
        const topProducts = productEntries.slice(0, 5).map(([name]) => name);

        if (!industryLabels.length || !topProducts.length) {
            renderEmptyState(canvas, 'No product discussions recorded this period.');
            return;
        }

        const datasets = topProducts.map((product, index) => ({
            label: product,
            data: industryLabels.map(industry => (analytics.industryProductCounts?.[industry]?.[product] || 0)),
            backgroundColor: getPalette(true)[index % getPalette(true).length],
            stack: 'product'
        }));

        if (productEntries.length > topProducts.length) {
            const othersData = industryLabels.map(industry => {
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
            renderEmptyState(canvas, 'No product discussions recorded this period.');
            return;
        }

        const chart = new Chart(canvas, {
            type: 'bar',
            data: { labels: industryLabels, datasets },
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
        });
        registerChart(prefix, 'products', chart);
    }

    function renderIndustryVolumeChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}IndustryActivityChart`);
        if (!prepareCanvas(canvas)) return;

        const industryEntries = Object.entries(analytics.industryCounts || {}).sort((a, b) => b[1] - a[1]);
        if (!industryEntries.length) {
            renderEmptyState(canvas, 'No industry-level activity recorded this period.');
            return;
        }

        const limitedIndustryEntries = industryEntries.slice(0, config.topIndustryLimit);
        const industryLabels = limitedIndustryEntries.map(([name]) => name);
        const counts = limitedIndustryEntries.map(([, count]) => count);
        const otherTotal = industryEntries.slice(config.topIndustryLimit).reduce((sum, [, count]) => sum + count, 0);

        if (otherTotal > 0) {
            industryLabels.push('Other');
            counts.push(otherTotal);
        }

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: industryLabels,
                datasets: [{
                    label: 'Activities',
                    data: counts,
                    backgroundColor: industryLabels.map((_, idx) => getPalette()[idx % getPalette().length]),
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
        });
        registerChart(prefix, 'industry', chart);
    }

    async function renderWinLossTrend(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}WinLossTrendChart`);
        if (!prepareCanvas(canvas)) return;

        const trendData = await DataManager.getWinLossTrend(6);
        if (!trendData.length) {
            renderEmptyState(canvas, 'No win/loss updates recorded in recent months.');
            return;
        }

        const labels = trendData.map(item => UI.formatMonth(item.month));
        const chart = new Chart(canvas, {
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
        });
        registerChart(prefix, 'trend', chart);
    }

    async function renderChannelOutcomeChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}ChannelOutcomeChart`);
        if (!prepareCanvas(canvas)) return;

        const channelStats = await DataManager.getChannelOutcomeStats(analytics.month);
        const channelEntries = Object.entries(channelStats).map(([channel, counts]) => ({
            channel,
            total: (counts.won || 0) + (counts.lost || 0),
            won: counts.won || 0,
            lost: counts.lost || 0
        })).sort((a, b) => b.total - a.total);

        if (!channelEntries.length) {
            renderEmptyState(canvas, 'No channel data available for the selected month.');
            return;
        }

        const limitedChannels = channelEntries.slice(0, 6);
        const overflow = channelEntries.slice(6);
        if (overflow.length) {
            const aggregated = overflow.reduce((acc, entry) => ({
                channel: 'Other Channels',
                won: (acc.won || 0) + entry.won,
                lost: (acc.lost || 0) + entry.lost,
                total: (acc.total || 0) + entry.total
            }), { channel: 'Other Channels', won: 0, lost: 0, total: 0 });
            if (aggregated.total > 0) {
                limitedChannels.push(aggregated);
            }
        }

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: limitedChannels.map(item => item.channel),
                datasets: [
                    {
                        label: 'Wins',
                        data: limitedChannels.map(item => item.won),
                        backgroundColor: '#48BB78'
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
        });
        registerChart(prefix, 'channels', chart);
    }

    async function renderPocFunnelChart(prefix, analytics) {
        const canvas = document.getElementById(`${prefix}PocFunnelChart`);
        if (!prepareCanvas(canvas)) return;

        const pocStats = await DataManager.getPocFunnelStats(analytics.month);
        const funnelEntries = Object.entries(pocStats.types || {}).map(([accessType, stats]) => ({
            accessType,
            requests: stats.requests || 0,
            wins: stats.wins || 0,
            losses: stats.losses || 0
        })).filter(entry => entry.requests || entry.wins || entry.losses);

        if (!funnelEntries.length) {
            renderEmptyState(canvas, 'No POC activity recorded for the selected month.', 'Log POC Activity');
            return;
        }

        const chart = new Chart(canvas, {
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
        });
        registerChart(prefix, 'poc', chart);
    }

    return {
        config,
        buildMarkup,
        renderCharts,
        destroyCharts,
        renderEmptyState
    };
})();

if (typeof window !== 'undefined') {
    window.Analytics = Analytics;
}


