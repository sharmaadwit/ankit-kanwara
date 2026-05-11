// Reports V2 - New reporting structure
// Tabs: Presales Reports | Sales View | Regional Data | Monthly report (PDF) | AI Intelligence
// Possible future reports: Activity trend (month-over-month), Pipeline by region, Win rate by rep,
// Industry heatmap, Call-type mix over time, Export to Excel/CSV for all sections.
const ReportsV2 = {
    charts: {},
    INR_TO_AED: 0.044, // 1 INR ≈ 0.044 AED (for Alhamra.ae and other AED wins stored as INR by mistake)
    formatReportCurrency(value, defaultZero = false, currency = 'INR') {
        if (value === null || value === undefined || value === '') {
            if (!defaultZero) return '—';
            if (currency === 'AED') return 'AED 0';
            if (currency === 'USD') return '$0';
            return '₹0';
        }
        const n = Number(value);
        if (!Number.isFinite(n)) return String(value);
        if (currency === 'AED') {
            return 'AED ' + n.toLocaleString('en-AE', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
        }
        if (currency === 'USD') {
            return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        }
        return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) + ' (INR)';
    },

    normalizeAccountNameForReportMatch(name) {
        return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    },

    /** Stable string id for monthly report checkboxes / filters (avoids number vs string mismatches). */
    normalizeProjectIdForReport(id) {
        if (id == null || id === '') return '';
        return String(id).trim();
    },

    /**
     * Activity breakdown donut: partition so segment sum equals `activities.length` (no double count).
     * Internal → `isInternal === true` only (type ignored). External buckets match normalized type; else Other.
     * Indexed over `length` so holes/null slots are counted; null-safe (avoids throw on bad rows).
     */
    computeActivityBreakdownPartition(activities) {
        const list = activities && Array.isArray(activities) ? activities : [];
        let customerCalls = 0;
        let internal = 0;
        let pricing = 0;
        let poc = 0;
        let sow = 0;
        let rfx = 0;
        let other = 0;
        const normExternalType = (a) => {
            if (a == null || typeof a !== 'object') return 'other';
            if (a.isInternal === true) return 'internal';
            const raw = a.type != null && a.type !== '' ? String(a.type).trim().toLowerCase().replace(/\s+/g, ' ') : '';
            if (!raw) return 'other';
            if (raw === 'customercall' || raw === 'customer_call' || raw === 'customer-call' || raw === 'customer call') return 'customerCall';
            if (raw === 'pricing') return 'pricing';
            if (raw === 'poc') return 'poc';
            if (raw === 'sow') return 'sow';
            if (raw === 'rfx') return 'rfx';
            return 'other';
        };
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            const bucket = normExternalType(a);
            if (bucket === 'internal') internal++;
            else if (bucket === 'customerCall') customerCalls++;
            else if (bucket === 'pricing') pricing++;
            else if (bucket === 'poc') poc++;
            else if (bucket === 'sow') sow++;
            else if (bucket === 'rfx') rfx++;
            else other++;
        }
        const out = {
            'Customer Calls': customerCalls,
            Internal: internal,
            Pricing: pricing,
            POC: poc,
            SOW: sow,
            RFx: rfx,
            Other: other
        };
        const sum = customerCalls + internal + pricing + poc + sow + rfx + other;
        if (sum !== list.length && typeof console !== 'undefined' && console.warn) {
            console.warn('ReportsV2: activity breakdown sum !== length', { sum, length: list.length, out });
        }
        return out;
    },

    /**
     * CRM wins for monthly PDF: `includedWinIds` null/undefined = show all; `[]` = show none;
     * otherwise only listed IDs (compared as strings, so number/string mismatch does not break).
     */
    filterCrmWinsForReport(winsForPeriod, includedWinIds) {
        if (includedWinIds == null) return winsForPeriod;
        const idSet = new Set(
            includedWinIds.map((x) => this.normalizeProjectIdForReport(x)).filter((s) => s !== '')
        );
        return winsForPeriod.filter((w) => {
            const pid = this.normalizeProjectIdForReport(w.projectId);
            return pid !== '' && idSet.has(pid);
        });
    },

    /**
     * Seeded PDF cards: only gate seeds when the same normalized client name exists as a CRM win row
     * and was excluded from `displayWins` (exact name match after normalize — seed text is source of truth).
     */
    filterSeededManualWinsForReport(seedRows, winsForPeriod, displayWins) {
        if (!seedRows || !seedRows.length) return [];
        const crmNames = new Set(winsForPeriod.map((w) => this.normalizeAccountNameForReportMatch(w.accountName)));
        const includedNames = new Set(displayWins.map((w) => this.normalizeAccountNameForReportMatch(w.accountName)));
        return seedRows.filter((seed) => {
            const sn = this.normalizeAccountNameForReportMatch(seed.clientName);
            if (!crmNames.has(sn)) return true;
            return includedNames.has(sn);
        });
    },

    /** March 2026 report: omit these accounts from Missing SFDC (email/PDF and charts). */
    isMarch2026MissingSfdcExcludedAccount(accountName) {
        const n = this.normalizeAccountNameForReportMatch(accountName);
        if (!n) return false;
        if (n.includes('credfix')) return true;
        if (n.includes('kinan') && n.includes('propert')) return true;
        const mk = n.includes('mk');
        if (mk && (n.includes('treckitt') || n.includes('reckitt'))) return true;
        if (mk && (n.includes('sbilife') || (n.includes('sbi') && n.includes('life')))) return true;
        return false;
    },

    shouldCountActivityTowardMissingSfdc(period, accountName) {
        if (period !== '2026-03') return true;
        return !this.isMarch2026MissingSfdcExcludedAccount(accountName);
    },

    /** April 2026 monthly PDF: omit BigCaring from losses table and loss counts. */
    isApril2026ExcludedLossAccount(accountName) {
        const n = this.normalizeAccountNameForReportMatch(accountName);
        if (!n) return false;
        if (n.includes('bigcaring')) return true;
        if (n.includes('big caring')) return true;
        return n.includes('big') && n.includes('caring');
    },

    shouldIncludeLossInMonthlyReport(period, accountName) {
        if (period === '2026-04' && this.isApril2026ExcludedLossAccount(accountName)) return false;
        return true;
    },

    /** April 2026 monthly PDF: omit Finesta from wins table and win counts (NaN/empty figures, not meaningful). */
    isApril2026ExcludedWinAccount(accountName) {
        const n = this.normalizeAccountNameForReportMatch(accountName);
        if (!n) return false;
        return n.includes('finesta');
    },

    shouldIncludeWinInMonthlyReport(period, accountName) {
        if (period === '2026-04' && this.isApril2026ExcludedWinAccount(accountName)) return false;
        return true;
    },

    isReportPresalesPlaceholderLabel(label) {
        const s = String(label == null ? '' : label)
            .trim()
            .toLowerCase();
        if (!s || s === '—') return true;
        if (s === 'user' || s === 'admin') return true;
        if (s === 'presales user' || s === 'presales representative' || s === 'presales lead') return true;
        return false;
    },

    /** When win/loss winner is a placeholder, infer presales from external activities on the account in-period. */
    inferPresalesRepFromAccountActivities(accountId, accountName, activities) {
        const list = activities && Array.isArray(activities) ? activities : [];
        const want = this.normalizeAccountNameForReportMatch(accountName);
        const counts = new Map();
        list.forEach((activity) => {
            if (!activity || activity.isInternal === true) return;
            if (accountId != null && accountId !== '' && activity.accountId != null) {
                if (String(activity.accountId) !== String(accountId)) return;
            } else if (want) {
                const an = this.normalizeAccountNameForReportMatch(activity.accountName || '');
                if (an !== want) return;
            } else {
                return;
            }
            const raw = activity.userName || activity.assignedUserEmail || '';
            const key = String(raw).trim();
            if (!key) return;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        let bestKey = '';
        let bestCount = 0;
        counts.forEach((count, key) => {
            if (count > bestCount) {
                bestCount = count;
                bestKey = key;
            }
        });
        return bestKey || null;
    },

    /**
     * Fixed presales roster for bar charts: always show these names (count may be 0).
     * Order = display order (top-to-bottom when reverseLabels is used on horizontal bars).
     * `test(part)` matches a single name fragment (e.g. after splitting "A / B" on slash or comma).
     */
    FIXED_PRESALES_ROSTER: [
        { label: 'Ankit Kanwara', test: (s) => /ankit/i.test(s) && /kanwara/i.test(s) },
        { label: 'Yashah', test: (s) => /yashas|yashah/i.test(s) },
        { label: 'Mridul', test: (s) => /mridul/i.test(s) },
        { label: 'Samruddha', test: (s) => /samruddha/i.test(s) },
        { label: 'Puru Chauhan', test: (s) => /purusottam/i.test(s) || /puru\s*chauhan/i.test(s) || (/puru/i.test(s) && /chauhan/i.test(s)) },
        { label: 'Nidhi', test: (s) => /\bnidhi\b/i.test(s) },
        { label: 'Nikhil', test: (s) => /\bnikhil\b/i.test(s) },
        { label: 'Gargi', test: (s) => /\bgargi\b/i.test(s) },
        { label: 'Sidharth', test: (s) => /sid(?:d)?harth/i.test(s) },
        { label: 'Mauricio', test: (s) => /mauricio/i.test(s) },
        { label: 'Maria', test: (s) => /\bmaria\b/i.test(s) }
    ],

    /**
     * Aggregate activities into fixed presales roster counts (unmatched activity users are ignored).
     * Each agent gets one bar total: internal + external (no separate bars per type).
     */
    buildFixedPresalesActivitySeries(activities) {
        const roster = ReportsV2.FIXED_PRESALES_ROSTER;
        const counts = {};
        roster.forEach((r) => {
            counts[r.label] = { internal: 0, external: 0 };
        });
        const list = activities && Array.isArray(activities) ? activities : [];
        list.forEach((activity) => {
            const isInternal = activity && activity.isInternal === true;
            const tryMatchPart = (part) => {
                const p = String(part || '').trim();
                if (!p) return;
                for (let i = 0; i < roster.length; i++) {
                    if (roster[i].test(p)) {
                        const bucket = counts[roster[i].label];
                        if (isInternal) bucket.internal++;
                        else bucket.external++;
                        return;
                    }
                }
            };
            const raw = activity.userName || activity.assignedUserEmail || '';
            const parts = String(raw)
                .split(/[/|,]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            if (parts.length === 0) tryMatchPart(raw);
            else parts.forEach(tryMatchPart);
        });
        return roster.map((r) => {
            const internal = counts[r.label].internal;
            const external = counts[r.label].external;
            return { id: r.label, name: r.label, internal, external, count: internal + external };
        });
    },

    /** Stacked horizontal bar: Internal + External per presales agent (one bar per label). */
    buildPresalesActivitySplitChartDatasets(series) {
        const rows = Array.isArray(series) ? series : [];
        return [
            {
                label: 'Internal',
                data: rows.map((u) => Number(u.internal) || 0),
                backgroundColor: '#805AD5',
                borderColor: '#6B46C1',
                borderWidth: 1
            },
            {
                label: 'External',
                data: rows.map((u) => Number(u.external) || 0),
                backgroundColor: '#4299E1',
                borderColor: '#3182CE',
                borderWidth: 1
            }
        ];
    },

    /**
     * Monthly PDF / tables: prefer fixed account→presales tags, then stored win/loss name/id resolution.
     * `presalesTag` may be null; accountName is always re-checked via DataManager when needed.
     */
    applyWinPresalesTagForDisplay(accountName, presalesTag, fromStored, projectName) {
        const tag =
            presalesTag ||
            (typeof DataManager !== 'undefined' && DataManager.getWinLossPresalesTagForWin
                ? DataManager.getWinLossPresalesTagForWin(accountName, projectName)
                : typeof DataManager !== 'undefined' && DataManager.getWinLossPresalesTagForAccountName
                  ? DataManager.getWinLossPresalesTagForAccountName(accountName)
                  : null);
        if (tag) return tag;
        if (fromStored != null && String(fromStored).trim()) return String(fromStored).trim();
        return '—';
    },

    /** Presales user who won: name saved on win/loss, else resolve from users list by wonByUserId. */
    resolveWonByUserNameForReport(wl, users) {
        if (!wl) return null;
        const stored =
            wl.wonByUserName != null && String(wl.wonByUserName).trim() ? String(wl.wonByUserName).trim() : null;
        const uid = wl.wonByUserId;
        if (uid != null && uid !== '' && users && users.length) {
            const u = users.find((x) =>
                typeof DataManager !== 'undefined' && DataManager.userIdsMatch
                    ? DataManager.userIdsMatch(x.id, uid)
                    : String(x.id) === String(uid)
            );
            if (u) {
                const nm = u.name != null && String(u.name).trim();
                if (nm) return String(u.name).trim();
                const un = u.username != null && String(u.username).trim();
                if (un && !this.isReportPresalesPlaceholderLabel(un)) return un;
            }
        }
        if (stored && !this.isReportPresalesPlaceholderLabel(stored)) return stored;
        return null;
    },

    /**
     * Locked March rows may store login keys (user, admin). Prefer users[].name; never show raw system logins on PDF.
     */
    PDF_PRESALES_LABEL_FOR_LOGIN: { user: 'Presales representative', admin: 'Presales lead' },

    displayNameForPresalesRepLabel(raw, users) {
        const s = raw == null ? '' : String(raw).trim();
        if (!s) return '—';
        const key = s.toLowerCase();
        if (users && users.length) {
            const u = users.find(
                (x) =>
                    (x.username && String(x.username).toLowerCase() === key) ||
                    (x.name && String(x.name).toLowerCase() === key)
            );
            if (u) {
                const nm = u.name != null && String(u.name).trim();
                if (nm) return String(u.name).trim();
            }
        }
        const fallback = this.PDF_PRESALES_LABEL_FOR_LOGIN[key];
        if (fallback) return fallback;
        return s;
    },

    /**
     * Monthly PDF line for a CRM win: account/project presales tags override logged winner when present
     * (otherwise wrong roster rows like username "user" / "admin" block the tag map).
     */
    presalesRepLineForCrmWin(accountName, projectTitle, wl, users, context) {
        const ctx = context && typeof context === 'object' ? context : {};
        const presalesTag =
            typeof DataManager !== 'undefined' && DataManager.getWinLossPresalesTagForWin
                ? DataManager.getWinLossPresalesTagForWin(accountName, projectTitle)
                : null;
        if (presalesTag) return this.displayNameForPresalesRepLabel(presalesTag, users);
        const wonBy = this.resolveWonByUserNameForReport(wl, users);
        if (wonBy) return this.displayNameForPresalesRepLabel(wonBy, users);
        const rest = this.applyWinPresalesTagForDisplay(accountName, null, null, projectTitle);
        let line = this.displayNameForPresalesRepLabel(rest, users);
        if (this.isReportPresalesPlaceholderLabel(line) && ctx.activities && ctx.activities.length) {
            const inferred = this.inferPresalesRepFromAccountActivities(ctx.accountId, accountName, ctx.activities);
            if (inferred) {
                const resolved = this.displayNameForPresalesRepLabel(inferred, users);
                if (!this.isReportPresalesPlaceholderLabel(resolved)) line = resolved;
            }
        }
        return line;
    },

    /**
     * Manual/seed PDF rows: when a logged CRM win exists for the same account name (normalized), use its account name and winner line.
     * Not applied to March 2026 in renderMonthlyReportPdf (that month uses hardcoded seed / Edit-report copy only).
     */
    enrichManualWinWithLoggedCrm(mw, winsForPeriod) {
        if (!mw || !winsForPeriod || !winsForPeriod.length) return mw;
        const sn = this.normalizeAccountNameForReportMatch(mw.clientName);
        if (!sn) return mw;
        const match = winsForPeriod.find((w) => this.normalizeAccountNameForReportMatch(w.accountName) === sn);
        if (!match) return mw;
        const out = { ...mw, clientName: match.accountName };
        if (match.presalesRep != null && String(match.presalesRep).trim() && match.presalesRep !== '—') {
            out.presalesRep = match.presalesRep;
        }
        return out;
    },

    currentPeriod: null,
    currentPeriodType: 'month', // 'month' or 'year'
    cachedData: null, // Store computed data for charts
    activeTab: 'presales', // 'presales', 'sales', 'regional', 'monthly', 'ai'
    activityBreakdownFilter: 'all', // 'all', 'sow', 'poc', 'rfx', 'pricing', 'customerCall', 'internal', 'other'

    // Plugin to show value on pie/doughnut segments and bar tops (matches dashboard)
    // Pre-built February 2026 Cube Analysis (from snapshot run) – used by "Load Feb 2026 analysis" button
    FEB_2026_ANALYSIS: {
        period: '2026-02',
        highlights: 'Total activities: 433 (433 external). Top regions: India North, MENA, LATAM.',
        useCases: [
            '4. Lead gen & onboarding\nIndustries: Banking, Healthcare, Retail\n8 activities in period, 5 separate accounts.',
            '1. Customer engagement & campaigns\nIndustries: Automobile, Banking, Energy, Events, F&B, HR, Healthcare, Manufacturing, Media & Entertainment, Metals, Partner agency, Professional Services, Real Estate & Construction, Retail\n50 activities in period, 19 separate accounts.',
            '2. Support & FAQ\nIndustries: Automotive, Banking, F&B, Government, Manufacturing, Professional Services, Real Estate & Construction, Retail, Telco\n49 activities in period, 18 separate accounts.',
            '3. Sales discovery & AI recommendation\nIndustries: Automobile, Banking, Education, Real Estate & Construction, Retail, Telco, Travel & Hospitality\n17 activities in period, 10 separate accounts.',
            '5. Operational automation\nIndustries: Banking, CPG & FMCG, Logistics & Supply Chain\n5 activities in period, 3 separate accounts.'
        ]
    },

    // Pre-built March 2026 Cube Analysis – same format as Feb; use with March period + seeded wins (seed cards respect CRM include/exclude)
    MARCH_2026_ANALYSIS: {
        period: '2026-03',
        highlights:
            'March 2026 – Q1 execution snapshot. External-led activity mix with continued strength in India North, MENA, and LATAM. Key win narratives: Prabhudas Liladhar Capital (E-KYC), Reckitt Benckiser (London) (Campaign Manager / retailer engagement), and Google Maps Local Guides India (community engagement on WhatsApp). Figures below follow activity tagged in PreSight for the month.',
        useCases: [
            '1. Lead gen & onboarding\nIndustries: Banking, Healthcare, Retail, Telco\nLead capture, onboarding, and qualification — including KYC and regulated-industry motions (E-KYC and compliance-led conversations).',
            '2. Customer engagement & campaigns\nIndustries: Automobile, Banking, Entertainment, Events, F&B, HR, Manufacturing, Media & Entertainment, Retail, Travel & Hospitality\nCampaigns, notifications, loyalty, and creator/audience programmes — including large-scale creator engagement on WhatsApp.',
            '3. Support & FAQ\nIndustries: Automotive, Banking, F&B, Government, Manufacturing, Professional Services, Retail, Telco\nService, helpdesk, and FAQ coverage across priority accounts.',
            '4. Sales discovery & AI recommendation\nIndustries: Banking, Education, Real Estate & Construction, Retail, Telco, Travel & Hospitality\nDiscovery, AI-led recommendations, and commerce-led conversations.',
            '5. Operational automation\nIndustries: Banking, CPG & FMCG, Logistics & Supply Chain\nBack-office efficiency, workflows, and operational automation.'
        ]
    },

    // Pre-built April 2026 Cube Analysis — points 4 & 5 not in scope for this month’s narrative
    APRIL_2026_ANALYSIS: {
        period: '2026-04',
        highlights:
            'April 2026 — Cube analysis centres on lead generation & onboarding, customer engagement & campaigns, and support/FAQ motions across tagged external activity. Sales discovery & AI recommendation (point 4) and operational automation (point 5) are not in scope for this month’s highlights. Regional mix continues across India North, MENA, and LATAM where accounts are tagged in PreSight.',
        useCases: [
            '1. Lead gen & onboarding\nIndustries: Banking, Healthcare, Retail, Telco\nLead capture, onboarding, and qualification — including KYC and regulated-industry conversations on WhatsApp.',
            '2. Customer engagement & campaigns\nIndustries: Automobile, Banking, Entertainment, Events, F&B, HR, Manufacturing, Media & Entertainment, Retail, Travel & Hospitality\nCampaigns, notifications, loyalty, and audience programmes on WhatsApp.',
            '3. Support & FAQ\nIndustries: Automotive, Banking, F&B, Government, Manufacturing, Professional Services, Retail, Telco\nService, helpdesk, and FAQ coverage across priority accounts.',
            '4. Sales discovery & AI recommendation\nNot relevant for April 2026 — excluded from this month’s cube analysis narrative.',
            '5. Operational automation\nNot relevant for April 2026 — excluded from this month’s cube analysis narrative.'
        ]
    },

    /** Monthly PDF Insights (page 1): saved overrides, then April preset, then auto-generated line. */
    monthlyReportInsightsText(period, overrides, defaultHighlights) {
        const o = overrides || {};
        const saved = o.highlights != null && String(o.highlights).trim() ? String(o.highlights).trim() : '';
        if (saved) return saved;
        if (period === '2026-04' && this.APRIL_2026_ANALYSIS && this.APRIL_2026_ANALYSIS.highlights) {
            return String(this.APRIL_2026_ANALYSIS.highlights).trim();
        }
        return defaultHighlights || '';
    },

    /** Cube Analysis card copy: saved override, then April preset for 2026-04, else empty (activity-derived fallback). */
    monthlyReportCubeUseCaseOverrideText(period, overrides, canonicalIdx) {
        const o = overrides || {};
        const saved =
            o.useCases && o.useCases[canonicalIdx] != null && String(o.useCases[canonicalIdx]).trim()
                ? String(o.useCases[canonicalIdx]).trim()
                : '';
        if (saved) return saved;
        if (
            period === '2026-04' &&
            this.APRIL_2026_ANALYSIS &&
            Array.isArray(this.APRIL_2026_ANALYSIS.useCases) &&
            this.APRIL_2026_ANALYSIS.useCases[canonicalIdx]
        ) {
            return String(this.APRIL_2026_ANALYSIS.useCases[canonicalIdx]).trim();
        }
        return '';
    },

    /**
     * March 2026 — locked PDF rows (sign-off). Rich optional fields render like manual seeds. Reckitt / Prabhudas / Google Maps are hardcoded seeds below (March only).
     */
    MARCH_2026_PDF_WINS_LOCKED: [
        { clientName: 'MIBL mk', mrrInr: 250000, useCase: 'existing bot upgrade', presalesRep: 'Mridul Kumawat' },
        { clientName: 'nissin', mrrInr: 190400, useCase: 'NA', presalesRep: 'Yashas Reddy' },
        {
            clientName: 'Trents Limited (Westside)',
            mrrInr: 205000,
            useCase: 'Order purchase',
            channel: 'WhatsApp',
            industry: 'Retail',
            buyerCentre: 'CIO',
            stakeholders:
                'Sales: Brendon | CSM: Mohit/Nidhi | Pre-sales: Mridul | Sales Leadership: Sandeep / Sujal | CS Leadership: Chris D\'mello | Potential of Upsell: Acquisition of customers, upsell and crosssell',
            commercials:
                'Monthly Recurring Revenue: ₹2,05,000/month | One time: ₹20k/man day (15 days efforts) | Inclusions: 50k free Advance messages | Overage: 0.5p',
            presalesRep: 'Mridul Kumawat'
        },
        {
            clientName: 'Azizi',
            mrrInr: 125200,
            useCase:
                'Azizi selected Gupshup primarily due to our strong platform capabilities, scalability, and seamless integration support with LeadSquared CRM. Since the client was looking to enable WhatsApp communication within their newly implemented LeadSquared system, our proven integration framework and ability to support scalable messaging workflows aligned well with their requirements, making us the preferred partner.',
            presalesRep: 'Gargi'
        }
    ],

    // Seeded manual wins for PDF. March: Prabhudas + Reckitt + Google Maps (rich cards; gated by filterSeededManualWinsForReport when CRM name matches).
    SEED_MANUAL_WINS_BY_PERIOD: {
        '2026-02': [
            { clientName: 'Prabhudas Liladhar Capital', useCase: 'Electronic Know Your Customer bot (E-KYC)', product: 'Converse (Bot Studio)', channel: 'WhatsApp', industry: 'Financial Services', buyerCentre: 'Chairperson & Managing Director', stakeholders: 'Sales: Premsagar Chourasia | Pre-sales: Purusottam Singh | Sales Leadership: Neerav Singh Chib & Sujal Shah', commercials: 'One time dev fee: INR 3 L (INR 20k / man-day) | Monthly platform fee: INR 1 L (no inclusions) | Overage: INR 0.30 / advanced message | Billing: Quarterly advance (Platform fee)', mrr: '100000', presalesRep: 'Purusottam Singh' },
            { clientName: 'YouTube Shopping', useCase: 'YouTube Shopping Creator engagement in India. BIC: 1. Product activation 2. Creator Engagement', channel: 'WhatsApp', industry: 'Entertainment', expansionPlan: 'Based on success in India they plan to expand to SEA, ME and LATAM.', stakeholders: 'Sales: Amrita Rath | Presales: Adwit Sharma | CSM: Ankita Acharya', commercials: 'One Time Charges: $4,000 | Annual Recurring Charges: $60,000 | Advance Message Cost: $0.006 | WA Messaging markup: $0.002', mrr: '', presalesRep: 'Adwit Sharma' }
        ],
        '2026-03': [
            {
                clientName: 'Prabhudas Liladhar Capital',
                useCase: 'Electronic Know Your Customer bot (E-KYC)',
                product: 'Converse (Bot Studio)',
                channel: 'WhatsApp',
                industry: 'Financial Services',
                buyerCentre: 'Chairperson & Managing Director',
                stakeholders: 'Sales: Premsagar Chourasia | Pre-sales: Purusottam Singh | Sales Leadership: Neerav Singh Chib & Sujal Shah',
                commercials:
                    'One time dev fee: INR 3 L (INR 20k / man-day) | Monthly platform fee: INR 1 L (no inclusions) | Overage: INR 0.30 / advanced message | Billing: Quarterly advance (Platform fee)',
                mrr: '100000',
                currency: 'INR',
                presalesRep: 'Purusottam Singh'
            },
            {
                clientName: 'Reckitt Benckiser (London)',
                useCase: 'Retailer Engagement (Integration with Accenture - Newspage)',
                product: 'Campaign Manager',
                channel: 'WhatsApp',
                industry: 'Consumer Goods',
                buyerCentre: 'Product Lead',
                stakeholders: 'Sales: Meet Nandu | Pre-sales: Mridul Kumawat | Sales Leadership: Sujal Shah & Neerav Singh Chib',
                commercials: 'One time dev fee: $400 per man-day | Monthly platform fee: $3,300',
                mrr: '3300',
                currency: 'USD',
                presalesRep: 'Mridul Kumawat'
            },
            {
                clientName: 'Google Maps (Local Guides India)',
                useCase:
                    '1. Brand Refresh Stickers: A high-priority campaign targeting 100k local guides where the WA bot converts user selfies into AI-generated caricatures using the new Google Maps brand logo to drive engagement.\n2. IPL Engagement Stickers: A viral campaign allowing Local Guides to generate team-themed caricature stickers from selfies. Includes a "share with friend" feature to drive organic bot growth.',
                channel: 'WhatsApp',
                industry: 'Community Engagement / Hyper-local Crowdsourcing',
                stakeholders: 'Sales: Amrita Rath | CSM: Sonali Sinha | Presales: Ankit Kanwara / Yashas Reddy',
                commercials:
                    'One-Time Charges (OTC): $8,000 | Platform fee per month: $6,000 (Inclusion: 10k Stickers) | Additional per sticker cost: $0.2 USD | Messaging fees: WhatsApp base cost + $0.001 surcharge per message',
                mrr: '6000',
                currency: 'USD',
                presalesRep: 'Ankit Kanwara / Yashas Reddy'
            }
        ]
    },

    chartValueLabelsPlugin: {
        id: 'chartValueLabels',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            if (!ctx) return;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta.data || meta.data.length === 0) return;
                const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value == null) return;
                    const num = Number(value);
                    if ((chart.config.type === 'pie' || chart.config.type === 'doughnut') && num === 0) return;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
                        ctx.font = '12px sans-serif';
                        ctx.fillStyle = '#1a202c';
                        const { x, y } = element.tooltipPosition();
                        const pct = total > 0 ? ((num / total) * 100).toFixed(0) : '';
                        ctx.fillText(String(num), x, y - 6);
                        if (pct) ctx.fillText(pct + '%', x, y + 8);
                    } else if (chart.config.type === 'bar') {
                        const horizontal = chart.options.indexAxis === 'y';
                        ctx.font = '600 12px sans-serif';
                        ctx.fillStyle = '#ffffff';
                        let cx;
                        let cy;
                        if (element && typeof element.getCenterPoint === 'function') {
                            const pt = element.getCenterPoint();
                            cx = pt.x;
                            cy = pt.y;
                        } else {
                            const props = element.getProps(['x', 'y', 'base'], true);
                            const base = props.base;
                            if (horizontal) {
                                cx = (props.x + base) / 2;
                                cy = props.y;
                            } else {
                                cx = props.x;
                                cy = (props.y + base) / 2;
                            }
                        }
                        if (horizontal && chart.scales && chart.scales.x) {
                            const xScale = chart.scales.x;
                            const x0 = xScale.getPixelForValue(0);
                            if (!Number.isFinite(num) || num === 0) {
                                cx = Math.min(x0 + 16, xScale.left + 28);
                                if (element && typeof element.getCenterPoint === 'function') {
                                    cy = element.getCenterPoint().y;
                                }
                            } else if (cx <= x0 + 4) {
                                cx = x0 + Math.min(18, (xScale.getPixelForValue(num) - x0) / 2);
                            }
                        }
                        ctx.fillText(String(num), cx, cy);
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
            const highlights = (o.highlights != null && o.highlights !== '') ? o.highlights : (this.monthlyReportData && this.monthlyReportData.defaultHighlights) || '';
            const useCases = Array.isArray(o.useCases) ? o.useCases : ['', '', '', '', ''];
            const includedWinIds = Array.isArray(o.includedWinIds) ? o.includedWinIds : null;
            const manualWins = Array.isArray(o.manualWins) ? o.manualWins : [];

            let winsHtml = '';
            if (this.monthlyReportData && this.monthlyReportData.winsForPeriod) {
                this.monthlyReportData.winsForPeriod.forEach(w => {
                    const checked =
                        includedWinIds === null ||
                        (Array.isArray(includedWinIds) &&
                            includedWinIds
                                .map((x) => ReportsV2.normalizeProjectIdForReport(x))
                                .includes(ReportsV2.normalizeProjectIdForReport(w.projectId)));
                    const presalesPart = (w.presalesRep && w.presalesRep !== '—') ? ' | Won by: ' + String(w.presalesRep).replace(/</g, '&lt;') : '';
                    const wCurr = w.currency || 'INR';
                    const wMrrStr = (w.mrr != null && w.mrr !== '' && w.mrr !== '—') ? ReportsV2.formatReportCurrency(Number(w.mrr), true, wCurr) : '—';
                    winsHtml += `<label class="monthly-report-edit-win-row"><input type="checkbox" data-project-id="${(w.projectId || '').replace(/"/g, '&quot;')}" ${checked ? 'checked' : ''}> ${(w.accountName || 'Unknown').replace(/</g, '&lt;')} – MRR: ${String(wMrrStr).replace(/</g, '&lt;')}${presalesPart}</label>`;
                });
            }

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
                                <input id="monthlyReportUseCase1" class="form-control" placeholder="Customer engagement & campaigns"><br>
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
        let includedWinIds;
        if (winsWrap && winsWrap.querySelectorAll('.monthly-report-edit-win-row').length > 0) {
            includedWinIds = [];
            winsWrap.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                const id = ReportsV2.normalizeProjectIdForReport(cb.getAttribute('data-project-id'));
                if (id) includedWinIds.push(id);
            });
        } else {
            includedWinIds = null;
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
        overrides[period] = { highlights, useCases, includedWinIds, manualWins };
        await DataManager.saveReportOverrides(overrides);
        this.closeEditReportModal();
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Report overrides saved.', 'success');
        this.render();
    },

    async loadFeb2026Analysis() {
        const feb = this.FEB_2026_ANALYSIS;
        if (!feb || feb.period !== '2026-02') return;
        const overrides = await DataManager.getReportOverrides();
        const prev = overrides['2026-02'] || {};
        overrides['2026-02'] = {
            highlights: feb.highlights,
            useCases: feb.useCases.slice(0, 5),
            includedWinIds: prev.includedWinIds !== undefined ? prev.includedWinIds : null,
            manualWins: Array.isArray(prev.manualWins) ? prev.manualWins : []
        };
        await DataManager.saveReportOverrides(overrides);
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Feb 2026 analysis loaded into report.', 'success');
        this.render();
    },

    async loadMarch2026Analysis() {
        const mar = this.MARCH_2026_ANALYSIS;
        if (!mar || mar.period !== '2026-03') return;
        const overrides = await DataManager.getReportOverrides();
        const prev = overrides['2026-03'] || {};
        overrides['2026-03'] = {
            highlights: mar.highlights,
            useCases: mar.useCases.slice(0, 5),
            includedWinIds: prev.includedWinIds !== undefined ? prev.includedWinIds : null,
            manualWins: Array.isArray(prev.manualWins) ? prev.manualWins : []
        };
        await DataManager.saveReportOverrides(overrides);
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('March 2026 analysis loaded into report.', 'success');
        this.render();
    },

    async loadApril2026Analysis() {
        const apr = this.APRIL_2026_ANALYSIS;
        if (!apr || apr.period !== '2026-04') return;
        const overrides = await DataManager.getReportOverrides();
        const prev = overrides['2026-04'] || {};
        overrides['2026-04'] = {
            highlights: apr.highlights,
            useCases: apr.useCases.slice(0, 5),
            includedWinIds: prev.includedWinIds !== undefined ? prev.includedWinIds : null,
            manualWins: Array.isArray(prev.manualWins) ? prev.manualWins : []
        };
        await DataManager.saveReportOverrides(overrides);
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('April 2026 analysis loaded into report.', 'success');
        this.render();
    },

    /** Export canvas as PNG with white background (no transparency). */
    canvasToPngWithWhiteBackground(canvas) {
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;
        const w = canvas.width;
        const h = canvas.height;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(canvas, 0, 0);
        return off.toDataURL('image/png');
    },

    /**
     * Export each monthly report page (summary, cube analysis, wins, win/loss tables, charts) as a PNG.
     * Includes section titles and all visible content on that page. Requires html2canvas (see index.html).
     */
    async downloadChartsAsImages() {
        const captureLib = typeof html2canvas !== 'undefined'
            ? html2canvas
            : (typeof window !== 'undefined' && typeof window.html2canvas === 'function' ? window.html2canvas : null);
        const period = this.currentPeriod || 'report';

        if (!captureLib) {
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Image export is unavailable (html2canvas not loaded). Refresh the page.', 'error');
            }
            return;
        }

        const root = document.getElementById('monthlyReportPdfContent');
        if (!root) {
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Open Reports → Monthly report (PDF) first.', 'warning');
            }
            return;
        }

        const pages = Array.from(root.querySelectorAll('.monthly-report-page'));
        if (!pages.length) {
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Nothing to export. Generate the monthly report first.', 'warning');
            }
            return;
        }

        if (typeof UI !== 'undefined' && UI.showNotification) {
            UI.showNotification(`Capturing ${pages.length} page(s)…`, 'info');
        }

        const slugFromTitle = (text, index) => {
            let slug = (text || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            if (!slug) slug = 'page';
            if (slug.length > 56) slug = slug.slice(0, 56).replace(/-$/, '');
            return `${String(index + 1).padStart(2, '0')}-${slug}`;
        };

        let ok = 0;
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const titleEl = page.querySelector('h3');
            const filenameBase = slugFromTitle(titleEl ? titleEl.textContent : '', i);

            try {
                page.scrollIntoView({ block: 'start', behavior: 'auto' });
                await new Promise((r) => setTimeout(r, 200));
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                const canvas = await captureLib(page, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    imageTimeout: 20000,
                    ignoreElements: (el) => el.classList && el.classList.contains('monthly-report-edit-hint')
                });

                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${filenameBase}-${period}.png`;
                link.href = dataUrl;
                link.click();
                ok += 1;
            } catch (err) {
                console.warn('[ReportsV2] downloadChartsAsImages failed for page', i + 1, err);
            }

            await new Promise((r) => setTimeout(r, 350));
        }

        if (typeof UI !== 'undefined' && UI.showNotification) {
            if (ok === pages.length) {
                UI.showNotification(`Downloaded ${ok} PNG(s) with titles and full page content.`, 'success');
            } else if (ok > 0) {
                UI.showNotification(`Downloaded ${ok} of ${pages.length} PNG(s). Some pages failed — check console.`, 'warning');
            } else {
                UI.showNotification('Could not export report images. Try again or use Download PDF.', 'error');
            }
        }
    },

    // Change activity breakdown filter (getPeriodActivities is async — must await or chart gets a Promise, not rows)
    changeActivityBreakdownFilter(filter) {
        this.activityBreakdownFilter = filter;
        void (async () => {
            const activities = await this.getPeriodActivities();
            this.initActivityBreakdownChart(activities);
        })();
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
        const resolveMonth = (typeof DataManager !== 'undefined' && DataManager.resolveActivityMonth)
            ? DataManager.resolveActivityMonth
            : (a) => {
                const d = a && (a.date || a.createdAt);
                if (!d) return null;
                const s = typeof d === 'string' ? d : (d.toISOString && d.toISOString()) || '';
                return s.length >= 7 ? s.substring(0, 7) : null;
            };

        let filtered = allActivities.filter(activity => {
            const activityMonthKey = resolveMonth(activity);
            if (!activityMonthKey) return false;
            if (activityMonthKey < cutoff) return false;

            if (isYear) {
                return activityMonthKey.substring(0, 4) === period;
            }
            return activityMonthKey === period;
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
        const internal = safe.filter((a) => a.isInternal === true).length;
        const external = safe.filter((a) => a.isInternal !== true).length;
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
                            if (
                                project.status === 'won' &&
                                ReportsV2.shouldIncludeWinInMonthlyReport(periodMonth, account.name || '')
                            ) {
                                winsPeriod++;
                            } else if (
                                project.status === 'lost' &&
                                ReportsV2.shouldIncludeLossInMonthlyReport(periodMonth, account.name || '')
                            ) {
                                lossesPeriod++;
                            }
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
        const internalCount = activities.filter((a) => a.isInternal === true).length;
        const externalCount = activities.filter((a) => a.isInternal !== true).length;
        const accounts = typeof DataManager !== 'undefined' ? await DataManager.getAccounts() : [];
        const users = typeof DataManager !== 'undefined' && DataManager.getUsers ? await DataManager.getUsers() : [];
        const overrides = typeof DataManager !== 'undefined' ? await DataManager.getReportOverrides() : {};
        const o = period ? (overrides[period] || {}) : {};
        let winsPeriod = 0;
        let lossesPeriod = 0;
        const winsForPeriod = [];
        const lossesForPeriod = [];
        const periodMonth = this.currentPeriodType === 'month' ? this.currentPeriod : null;
        if (periodMonth && accounts.length) {
            accounts.forEach(account => {
                account.projects?.forEach(project => {
                    if (project.status === 'won' || project.status === 'lost') {
                        const monthForWinLoss = project.winLossData?.monthOfWin ||
                            (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                        if (monthForWinLoss === periodMonth) {
                            if (project.status === 'won') {
                                const accountNameForFilter = String(account.name || '').trim();
                                if (!ReportsV2.shouldIncludeWinInMonthlyReport(periodMonth, accountNameForFilter)) {
                                    return;
                                }
                                winsPeriod++;
                                const uc = (project.useCases && project.useCases[0]);
                                const useCaseFromProject = typeof uc === 'string' ? uc : (uc && typeof uc === 'object' && uc.name) ? uc.name : '';
                                const useCaseText = (project.winLossData && project.winLossData.reason) ? String(project.winLossData.reason) : (useCaseFromProject || '—');
                                const accountName = accountNameForFilter || 'Unknown';
                                const wl = project.winLossData || {};
                                const projectTitle = (project.name || '').trim();
                                const presalesRep = this.presalesRepLineForCrmWin(accountName, projectTitle, wl, users, {
                                    activities,
                                    accountId: account.id,
                                    period: periodMonth
                                });
                                const isAlhamra = (accountName || '').toLowerCase().includes('alhamra');
                                let currency = wl.currency || 'INR';
                                let mrrVal = wl.mrr ?? project.mrr;
                                if (isAlhamra) {
                                    currency = 'AED';
                                    if (wl.currency === 'INR' && mrrVal != null && mrrVal !== '' && mrrVal !== '—') {
                                        const num = Number(mrrVal);
                                        if (Number.isFinite(num)) mrrVal = Math.round(num * ReportsV2.INR_TO_AED);
                                    }
                                }
                                const mrrInInr = wl.mrrInInr != null && Number.isFinite(Number(wl.mrrInInr)) ? Number(wl.mrrInInr) : (currency === 'INR' && mrrVal != null ? Number(mrrVal) : null);
                                winsForPeriod.push({
                                    projectId: this.normalizeProjectIdForReport(project.id),
                                    accountId: account.id,
                                    accountName: accountName,
                                    mrr: mrrVal ?? '—',
                                    currency,
                                    mrrInInr,
                                    otd: wl.otd != null && wl.otd !== '' ? wl.otd : null,
                                    otdInInr: wl.otdInInr != null && Number.isFinite(Number(wl.otdInInr)) ? Number(wl.otdInInr) : null,
                                    useCase: useCaseText,
                                    presalesRep
                                });
                            } else if (project.status === 'lost') {
                                const lossAccountName = String(account.name || '').trim() || 'Unknown';
                                if (!ReportsV2.shouldIncludeLossInMonthlyReport(periodMonth, lossAccountName)) {
                                    return;
                                }
                                lossesPeriod++;
                                const wl = project.winLossData || {};
                                const uc0 = project.useCases && project.useCases[0];
                                const reason = (wl.reason || '').trim() || (uc0 ? (typeof uc0 === 'string' ? uc0 : (uc0.name || '')) : '') || '—';
                                lossesForPeriod.push({
                                    accountName: lossAccountName,
                                    reason: reason || '—',
                                    lostTo: wl.lostTo || '—'
                                });
                            }
                        }
                    }
                });
            });
        }
        const breakdown = ReportsV2.computeActivityBreakdownPartition(activities);
        const callTypeData = (this.cachedData && this.cachedData.callTypeData) || {};
        const regionCounts = {};
        activities.filter(a => !a.isInternal).forEach(a => {
            const account = accounts.find(ac => ac.id === a.accountId);
            const region = a.salesRepRegion || a.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
            regionCounts[region] = (regionCounts[region] || 0) + 1;
        });
        const missingSfdcByRegion = {};
        const missingSfdcPeriod = period;
        activities.filter(a => !a.isInternal).forEach(a => {
            const account = accounts.find(ac => ac.id === a.accountId);
            const project = account && account.projects ? account.projects.find(p => p.id === a.projectId) : null;
            const hasSfdc = (account && account.sfdcLink) || (project && project.sfdcLink);
            if (!hasSfdc) {
                const accName = account ? (account.name || '') : (a.accountName || '');
                if (!this.shouldCountActivityTowardMissingSfdc(missingSfdcPeriod, accName)) return;
                const region = a.salesRepRegion || a.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
                missingSfdcByRegion[region] = (missingSfdcByRegion[region] || 0) + 1;
            }
        });
        const userActivityData = ReportsV2.buildFixedPresalesActivitySeries(activities);

        const regionsOrdered = Object.keys(regionCounts).sort((a, b) => (regionCounts[b] || 0) - (regionCounts[a] || 0));
        const callTypeOrder = ['Demo', 'Discovery', 'Scoping Deep Dive', 'Q&A', 'Follow-up', 'Customer Kickoff', 'Internal Kickoff'];

        // Five canonical use cases (match reference) – keyword mapping to bucket index 0–4
        const CANONICAL_USE_CASES = [
            'Lead gen & onboarding',
            'Customer engagement & campaigns',
            'Support & FAQ',
            'Sales discovery & AI recommendation',
            'Operational automation'
        ];
        const USE_CASE_KEYWORDS = [
            ['lead gen', 'onboarding', 'lead capture', 'kyc', 'recruitment', 'property', 'inquiry', 'qualification'],
            ['engagement', 'campaign', 'notification', 'alert', 'marketing', 'broadcast', 'promotion', 'voucher', 'coupon', 'loyalty', 'retention', 're-engagement', 'incentive', 'fan engagement', 'o2o'],
            ['support', 'faq', 'service', 'helpdesk', 'complaint', 'enquir'],
            ['sales', 'discovery', 'ai recommendation', 'virtual shopper', 'advisor', 'catalog', 'commerce', 'conversion', 'checkout', 'beauty', 'fashion'],
            ['operational', 'automation', 'back-office', 'efficiency', 'reporting', 'logistics', 'workflow', 'collection', 'document validation', 'tracking']
        ];
        const matchUseCaseToBucket = (text) => {
            if (!text || typeof text !== 'string') return -1;
            const t = text.toLowerCase();
            for (let i = 0; i < USE_CASE_KEYWORDS.length; i++) {
                if (USE_CASE_KEYWORDS[i].some(kw => t.includes(kw))) return i;
            }
            return -1;
        };
        // Cube Analysis: activities and use cases only (no wins). Per region: pick one use case that had max activities; show activity count + distinct accounts.
        const bucketStats = CANONICAL_USE_CASES.map(() => ({
            industries: new Set(),
            regionIndustries: new Map(),
            activityCount: 0,
            regionActivityCount: new Map(),
            regionAccountIds: new Map()
        }));
        const addToBucket = (bucketIdx, region, industry, accountId) => {
            if (bucketIdx < 0) return;
            const b = bucketStats[bucketIdx];
            b.activityCount++;
            if (industry) b.industries.add(industry);
            if (region && region !== 'Unassigned') {
                if (!b.regionIndustries.has(region)) b.regionIndustries.set(region, new Map());
                const rMap = b.regionIndustries.get(region);
                rMap.set(industry || '—', (rMap.get(industry || '—') || 0) + 1);
                b.regionActivityCount.set(region, (b.regionActivityCount.get(region) || 0) + 1);
                if (accountId) {
                    if (!b.regionAccountIds.has(region)) b.regionAccountIds.set(region, new Set());
                    b.regionAccountIds.get(region).add(accountId);
                }
            }
        };
        activities.filter(a => !a.isInternal && a.accountId).forEach(activity => {
            const account = accounts.find(ac => ac.id === activity.accountId);
            const project = account?.projects?.find(p => p.id === activity.projectId);
            const industry = account?.industry ? String(account.industry).trim() : null;
            const region = activity.salesRepRegion || activity.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
            const useCases = project?.useCases ? (Array.isArray(project.useCases) ? project.useCases : [project.useCases]) : [];
            useCases.forEach(uc => {
                const label = typeof uc === 'string' ? uc.trim() : (uc && typeof uc === 'object' && uc.name) ? String(uc.name).trim() : null;
                if (!label) return;
                const bucketIdx = matchUseCaseToBucket(label);
                addToBucket(bucketIdx, region, industry, activity.accountId);
            });
        });
        const useCaseCardsFromData = CANONICAL_USE_CASES.map((title, i) => {
            const b = bucketStats[i];
            const indList = Array.from(b.industries).sort();
            const industriesPhrase = indList.length ? indList.join(', ') : '—';
            const totalAccounts = new Set();
            b.regionAccountIds.forEach((set) => set.forEach((id) => totalAccounts.add(id)));
            const takeaway = b.activityCount > 0
                ? b.activityCount + ' activities in period' + (totalAccounts.size > 0 ? ', ' + totalAccounts.size + ' separate accounts.' : '.')
                : 'No activity in this period.';
            return {
                name: title,
                industries: indList,
                activityCount: b.activityCount,
                accountCount: totalAccounts.size,
                industriesPhrase,
                takeaway
            };
        });
        // Per region: pick the one use case with maximum activities; show activity count and distinct accounts for that (region, use case).
        const regionTopUseCase = [];
        const allRegions = new Set();
        bucketStats.forEach((b) => b.regionActivityCount.forEach((_, reg) => allRegions.add(reg)));
        allRegions.forEach((region) => {
            let maxCount = 0;
            let topBucketIdx = -1;
            CANONICAL_USE_CASES.forEach((_, i) => {
                const c = bucketStats[i].regionActivityCount.get(region) || 0;
                if (c > maxCount) { maxCount = c; topBucketIdx = i; }
            });
            if (topBucketIdx >= 0 && maxCount > 0) {
                const accountIds = bucketStats[topBucketIdx].regionAccountIds.get(region);
                const accountCount = accountIds ? accountIds.size : 0;
                regionTopUseCase.push({
                    region,
                    useCaseName: CANONICAL_USE_CASES[topBucketIdx],
                    activityCount: maxCount,
                    accountCount
                });
            }
        });
        regionTopUseCase.sort((a, b) => b.activityCount - a.activityCount);

        // Auto Cube Analysis highlights when none saved
        const defaultHighlights = !(o.highlights && o.highlights.trim())
            ? `Total activities: ${total} (${externalCount} external). Wins this period: ${winsPeriod}. Top regions: ${regionsOrdered.slice(0, 3).join(', ') || '—'}.`
            : '';

        const highlightsForPage1 = ReportsV2.monthlyReportInsightsText(period, o, defaultHighlights);
        const safeHlLine = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const page1InsightsHtml = highlightsForPage1
            ? `<div class="monthly-report-page-1-insights"><h4 class="monthly-report-insights-title">Insights</h4><p class="monthly-report-highlights-text">${safeHlLine(highlightsForPage1)}</p></div>`
            : '';

        const displayWinsForPdf = ReportsV2.filterCrmWinsForReport(winsForPeriod, o.includedWinIds);
        const seedRowsPdf = (ReportsV2.SEED_MANUAL_WINS_BY_PERIOD && ReportsV2.SEED_MANUAL_WINS_BY_PERIOD[period]) || [];
        const seedFilteredPdf = ReportsV2.filterSeededManualWinsForReport(seedRowsPdf, winsForPeriod, displayWinsForPdf);
        const manualRawForPdf = (o.manualWins || []).concat(seedFilteredPdf);
        // March 2026: use hardcoded seed / Edit-report copy as-is (names + presales) for go-live; other months overlay logged CRM account/winner when names match.
        const manualWinsForPdf =
            period === '2026-03'
                ? manualRawForPdf
                : manualRawForPdf.map((mw) => ReportsV2.enrichManualWinWithLoggedCrm(mw, winsForPeriod));
        const marchLockedWins = period === '2026-03' ? ReportsV2.MARCH_2026_PDF_WINS_LOCKED : null;
        const marchPdfSeedRows =
            period === '2026-03' && ReportsV2.SEED_MANUAL_WINS_BY_PERIOD && ReportsV2.SEED_MANUAL_WINS_BY_PERIOD['2026-03']
                ? ReportsV2.SEED_MANUAL_WINS_BY_PERIOD['2026-03']
                : [];

        this.monthlyReportData = {
            breakdown,
            totalActivities: total,
            callTypeData,
            regionCounts,
            missingSfdcByRegion,
            userActivityData,
            regionsOrdered,
            callTypeOrder,
            winsForPeriod,
            useCaseCardsFromData,
            regionTopUseCase,
            defaultHighlights
        };

        return `
            <div class="reports-v2-section monthly-report-pdf-section" id="monthlyReportPdfContent">
                <div class="reports-v2-monthly-pdf-actions">
                    <h2 class="reports-v2-section-title">Monthly report (PDF)</h2>
                    <p class="text-muted">Same structure as the email report. Use <strong>Edit report</strong> to change highlights, use cases and wins; then download or email.</p>
                    <div class="reports-v2-monthly-actions-btns">
                        <button type="button" id="reportsEditReportBtnContent" class="btn btn-primary" onclick="ReportsV2.openEditReportModal()">Edit report</button>
                        ${period === '2026-02' ? `<button type="button" class="btn btn-outline" onclick="ReportsV2.loadFeb2026Analysis()">Load Feb 2026 analysis</button>` : ''}
                        ${period === '2026-03' ? `<button type="button" class="btn btn-outline" onclick="ReportsV2.loadMarch2026Analysis()">Load March 2026 analysis</button>` : ''}
                        ${period === '2026-04' ? `<button type="button" class="btn btn-outline" onclick="ReportsV2.loadApril2026Analysis()">Load April 2026 analysis</button>` : ''}
                        <button type="button" class="btn btn-outline" onclick="window.print(); return false;">Download PDF</button>
                        <button type="button" class="btn btn-outline" onclick="void ReportsV2.downloadChartsAsImages()">Download report pages as PNG</button>
                        <a class="btn btn-outline" id="monthlyReportEmailBtn" href="#">Email report</a>
                    </div>
                </div>
                <div class="monthly-report-pages">
                    <!-- Page 1 – Summary only (no duplicate Cube Analysis here) -->
                    <div class="monthly-report-page">
                        <h3>Presales Update – ${periodLabel}</h3>
                        <div class="monthly-report-summary-box">
                            <div class="monthly-report-summary-total">${total}</div>
                            <div class="monthly-report-summary-label">Total Activity</div>
                            <div class="monthly-report-summary-period">${periodLabel}</div>
                            <div class="monthly-report-summary-pills">
                                <span>Internal ${internalCount}</span>
                                <span>External ${externalCount}</span>
                                <span>Wins ${marchLockedWins && marchLockedWins.length ? marchLockedWins.length + marchPdfSeedRows.length : winsPeriod}</span>
                            </div>
                        </div>
                        ${page1InsightsHtml}
                        <p class="text-muted small">Internal activities are presales-led, non-customer activities. External are customer-facing.</p>
                    </div>
                    <!-- Page 2 – Cube Analysis (5 use cases only; no highlights line, no description, no Edit) -->
                    <div class="monthly-report-page">
                        <h3>Cube Analysis Top Highlights – Global</h3>
                        <h4 class="monthly-report-use-cases-subtitle">USE CASES FIRST: 5 USE CASES ACROSS INDUSTRIES (ACTIVITIES ONLY)${period === '2026-04' ? ' — points 4 &amp; 5 not in scope for April' : ''}</h4>
                        <div class="monthly-report-use-cases">
                            ${(() => {
                                const safe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                const cubeCards =
                                    period === '2026-04'
                                        ? useCaseCardsFromData
                                        : [...useCaseCardsFromData].sort((a, b) => (b.activityCount || 0) - (a.activityCount || 0));
                                return cubeCards.map((fromData, displayIdx) => {
                                    const canonicalIdx = CANONICAL_USE_CASES.indexOf(fromData.name);
                                    const override =
                                        canonicalIdx >= 0
                                            ? ReportsV2.monthlyReportCubeUseCaseOverrideText(period, o, canonicalIdx)
                                            : '';
                                    if (override) return `<div class="monthly-report-use-case-card">${safe(override).replace(/\n/g, '<br>')}</div>`;
                                    if (!fromData) return `<div class="monthly-report-use-case-card"><strong>${displayIdx + 1}. ${CANONICAL_USE_CASES[displayIdx] || '—'}</strong><br/>No activity in this period.</div>`;
                                    return `<div class="monthly-report-use-case-card"><strong>${displayIdx + 1}. ${safe(fromData.name)}</strong><br/>Industries: ${safe(fromData.industriesPhrase)}<br/>${safe(fromData.takeaway)}</div>`;
                                }).join('');
                            })()}
                        </div>
                    </div>
                    <!-- Page 3 – Wins (edit via actions bar only; no Edit in PDF content) -->
                    <div class="monthly-report-page">
                        <h3>Wins – ${periodLabel}</h3>
                        <p class="text-muted monthly-report-edit-hint">${period === '2026-03' ? 'March 2026 wins below match the locked sign-off list in code (not CRM). Use Edit report for highlights and use cases.' : 'Use Edit report (above) to include/exclude wins or add manual wins.'}</p>
                        <div class="monthly-report-wins-grid">
                            ${(() => {
                                const safe = (s) => (s == null || s === '') ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                const manualPresalesLine = (mw) => {
                                    const p = mw.presalesRep;
                                    const raw =
                                        p != null && String(p).trim() && p !== '—'
                                            ? String(p).trim()
                                            : ReportsV2.applyWinPresalesTagForDisplay(mw.clientName || '', null, null, '');
                                    return ReportsV2.displayNameForPresalesRepLabel(raw, users);
                                };
                                const useCaseHtml = (text) =>
                                    (text == null ? '' : String(text))
                                        .split('\n')
                                        .map((line) => safe(line))
                                        .join('<br/>');
                                const renderManualWinCard = (mw) => {
                                    const hasRich = mw.product || mw.channel || mw.industry || mw.buyerCentre || mw.stakeholders || mw.commercials || mw.expansionPlan;
                                    const mrrCurr = mw.currency || 'INR';
                                    const mrrStr = (mw.mrr != null && mw.mrr !== '') ? ReportsV2.formatReportCurrency(mw.mrr, true, mrrCurr) : '—';
                                    if (hasRich) {
                                        const lines = [];
                                        lines.push('<strong>' + safe(mw.clientName || '') + '</strong>');
                                        lines.push('Use case: ' + useCaseHtml(mw.useCase || ''));
                                        if (mw.product) lines.push('GS Product: ' + safe(mw.product));
                                        if (mw.channel) lines.push('Channel: ' + safe(mw.channel));
                                        if (mw.industry) lines.push('Industry: ' + safe(mw.industry));
                                        if (mw.buyerCentre) lines.push('Buyer centre sold to: ' + safe(mw.buyerCentre));
                                        if (mw.stakeholders) lines.push('Key stakeholders: ' + safe(mw.stakeholders));
                                        if (mw.commercials) lines.push('Commercials: ' + safe(mw.commercials));
                                        if (mw.expansionPlan) lines.push('Expansion plan: ' + safe(mw.expansionPlan));
                                        if (mrrStr !== '—') lines.push('MRR: ' + mrrStr);
                                        const mwPresales = manualPresalesLine(mw);
                                        if (mwPresales && mwPresales !== '—') lines.push('Presales rep: ' + safe(mwPresales));
                                        return '<div class="monthly-report-win-card monthly-report-win-card--detailed">' + lines.join('<br/>') + '</div>';
                                    }
                                    const mwPresalesSimple = manualPresalesLine(mw);
                                    return (
                                        '<div class="monthly-report-win-card"><strong>' +
                                        safe(mw.clientName || '') +
                                        '</strong><br/>MRR: ' +
                                        mrrStr +
                                        '<br/>Use case: ' +
                                        useCaseHtml(mw.useCase || '') +
                                        (mwPresalesSimple && mwPresalesSimple !== '—' ? '<br/>Presales rep: ' + safe(mwPresalesSimple) : '') +
                                        '</div>'
                                    );
                                };
                                const renderLockedMarchCard = (row) => {
                                    const hasRich =
                                        row.product ||
                                        row.channel ||
                                        row.industry ||
                                        row.buyerCentre ||
                                        row.stakeholders ||
                                        row.commercials;
                                    const mrrStr = ReportsV2.formatReportCurrency(row.mrrInr, true, 'INR');
                                    if (hasRich) {
                                        const lines = [];
                                        lines.push('<strong>' + safe(row.clientName) + '</strong>');
                                        lines.push('Use case: ' + useCaseHtml(row.useCase));
                                        if (row.product) lines.push('GS Product: ' + safe(row.product));
                                        if (row.channel) lines.push('Channel: ' + safe(row.channel));
                                        if (row.industry) lines.push('Industry: ' + safe(row.industry));
                                        if (row.buyerCentre) lines.push('Buyer centre sold to: ' + safe(row.buyerCentre));
                                        if (row.stakeholders) lines.push('Key stakeholders: ' + safe(row.stakeholders));
                                        if (row.commercials) lines.push('Commercials: ' + safe(row.commercials));
                                        lines.push('MRR: ' + mrrStr);
                                        lines.push('Presales rep: ' + safe(row.presalesRep));
                                        return '<div class="monthly-report-win-card monthly-report-win-card--detailed">' + lines.join('<br/>') + '</div>';
                                    }
                                    return (
                                        '<div class="monthly-report-win-card"><strong>' +
                                        safe(row.clientName) +
                                        '</strong><br/>MRR: ' +
                                        mrrStr +
                                        '<br/>Use case: ' +
                                        useCaseHtml(row.useCase) +
                                        '<br/>Presales rep: ' +
                                        safe(row.presalesRep) +
                                        '</div>'
                                    );
                                };
                                if (marchLockedWins && marchLockedWins.length) {
                                    const lockedHtml = marchLockedWins.map((row) => renderLockedMarchCard(row)).join('');
                                    const seedHtml = (marchPdfSeedRows || []).map((mw) => renderManualWinCard(mw)).join('');
                                    return lockedHtml + seedHtml;
                                }
                                const cards = displayWinsForPdf.slice(0, 12).map(w => {
                                    const curr = w.currency || 'INR';
                                    const mrrNum = (curr === 'INR' && (w.mrrInInr != null && Number.isFinite(w.mrrInInr))) ? w.mrrInInr : (w.mrr != null && w.mrr !== '' && w.mrr !== '—' ? Number(w.mrr) : null);
                                    const mrrStr = mrrNum != null ? ReportsV2.formatReportCurrency(mrrNum, true, curr) : '—';
                                    const otdNum = w.otdInInr != null && Number.isFinite(w.otdInInr) ? w.otdInInr : (w.otd != null && w.otd !== '' ? Number(w.otd) : null);
                                    const otdStr = (otdNum != null ? ReportsV2.formatReportCurrency(otdNum, true, curr) : '');
                                    const mrrOtdLine = otdStr ? `MRR: ${mrrStr} | OTD: ${otdStr}` : `MRR: ${mrrStr}`;
                                    const pr = w.presalesRep && w.presalesRep !== '—'
                                        ? ReportsV2.displayNameForPresalesRepLabel(w.presalesRep, users)
                                        : '';
                                    return `<div class="monthly-report-win-card"><strong>${safe(w.accountName)}</strong><br/>${mrrOtdLine}<br/>Use case: ${safe(w.useCase)}${pr ? '<br/>Presales rep: ' + safe(pr) : ''}</div>`;
                                });
                                manualWinsForPdf.forEach(mw => cards.push(renderManualWinCard(mw)));
                                return cards.length ? cards.join('') : '<p class="text-muted">No wins in this period. Add wins via Edit report or log win/loss on projects.</p>';
                            })()}
                        </div>
                    </div>
                    <!-- Page 3b – Wins & Losses summary table (for PDF) -->
                    <div class="monthly-report-page">
                        <h3>Wins & Losses summary – ${periodLabel}</h3>
                        <div class="monthly-report-summary-tables">
                            <h4>Wins</h4>
                            <table class="monthly-report-table">
                                <thead><tr><th>Client</th><th>MRR / OTD</th><th>Use case</th><th>Presales rep</th></tr></thead>
                                <tbody>
                                    ${(() => {
                                        const safe = (s) => (s == null || s === '') ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                        const manualPresalesLine = (mw) => {
                                            const p = mw.presalesRep;
                                            const raw =
                                                p != null && String(p).trim() && p !== '—'
                                                    ? String(p).trim()
                                                    : ReportsV2.applyWinPresalesTagForDisplay(mw.clientName || '', null, null, '');
                                            return ReportsV2.displayNameForPresalesRepLabel(raw, users);
                                        };
                                        if (marchLockedWins && marchLockedWins.length) {
                                            const lockedRows = marchLockedWins
                                                .map((row) => {
                                                    const mrrStr = ReportsV2.formatReportCurrency(row.mrrInr, true, 'INR');
                                                    return `<tr><td>${safe(row.clientName)}</td><td>${mrrStr}</td><td>${safe(row.useCase)}</td><td>${safe(row.presalesRep)}</td></tr>`;
                                                })
                                                .join('');
                                            const useCaseForTableCell = (uc) => {
                                                const s = uc == null ? '' : String(uc);
                                                if (s.includes('\n')) return s.split('\n')[0].trim() + ' …';
                                                return s;
                                            };
                                            const seedRows = (marchPdfSeedRows || [])
                                                .map((mw) => {
                                                    const mrrStr =
                                                        mw.mrr != null && mw.mrr !== ''
                                                            ? ReportsV2.formatReportCurrency(mw.mrr, true, mw.currency || 'INR')
                                                            : '—';
                                                    const mwPresales = manualPresalesLine(mw);
                                                    return `<tr><td>${safe(mw.clientName)}</td><td>${mrrStr}</td><td>${safe(useCaseForTableCell(mw.useCase))}</td><td>${safe(mwPresales)}</td></tr>`;
                                                })
                                                .join('');
                                            return lockedRows + seedRows;
                                        }
                                        let rows = displayWinsForPdf.slice(0, 20).map(w => {
                                            const c = w.currency || 'INR';
                                            const mrrN = (c === 'INR' && w.mrrInInr != null) ? w.mrrInInr : (w.mrr != null && w.mrr !== '' && w.mrr !== '—' ? Number(w.mrr) : null);
                                            const mrrStr = mrrN != null ? ReportsV2.formatReportCurrency(mrrN, true, c) : '—';
                                            const pr = ReportsV2.displayNameForPresalesRepLabel(w.presalesRep, users);
                                            return `<tr><td>${safe(w.accountName)}</td><td>${mrrStr}</td><td>${safe(w.useCase)}</td><td>${safe(pr)}</td></tr>`;
                                        });
                                        manualWinsForPdf.forEach(mw => {
                                            const mrrStr = (mw.mrr != null && mw.mrr !== '') ? ReportsV2.formatReportCurrency(mw.mrr, true, mw.currency || 'INR') : '—';
                                            const mwPresales = manualPresalesLine(mw);
                                            rows.push(`<tr><td>${safe(mw.clientName)}</td><td>${mrrStr}</td><td>${safe(mw.useCase)}</td><td>${safe(mwPresales)}</td></tr>`);
                                        });
                                        return rows.length ? rows.join('') : '<tr><td colspan="4">No wins in this period.</td></tr>';
                                    })()}
                                </tbody>
                            </table>
                            <h4 style="margin-top: 1.5rem;">Losses (${lossesForPeriod.length})</h4>
                            <table class="monthly-report-table">
                                <thead><tr><th>Client</th><th>Reason / use case</th><th>Lost to</th></tr></thead>
                                <tbody>
                                    ${lossesForPeriod.length ? lossesForPeriod.slice(0, 20).map(l => {
                                        const safe = (s) => (s == null || s === '') ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                        return `<tr><td>${safe(l.accountName)}</td><td>${safe(l.reason)}</td><td>${safe(l.lostTo)}</td></tr>`;
                                    }).join('') : '<tr><td colspan="3">No losses in this period.</td></tr>'}
                                </tbody>
                            </table>
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
                            <canvas id="monthlyReportCallType" height="320"></canvas>
                        </div>
                    </div>
                    <!-- Page 6 – Region activity (vertical bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Regional intelligence</h3>
                        <p class="text-muted">${periodLabel} (External only)</p>
                        <div class="monthly-report-chart-wrap" style="height: 300px;">
                            <canvas id="monthlyReportRegion" height="320"></canvas>
                        </div>
                    </div>
                    <!-- Page 7 – Missing SFDC (vertical bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Missing SFDC opportunities</h3>
                        <p class="text-muted">External activities where project/account has no SFDC link. ${periodLabel}.</p>
                        <div class="monthly-report-chart-wrap" style="height: 300px;">
                            <canvas id="monthlyReportMissingSfdc" height="320"></canvas>
                        </div>
                    </div>
                    <!-- Page 8 – Presales individual activity (horizontal bar chart) -->
                    <div class="monthly-report-page">
                        <h3>Presales individual activity</h3>
                        <p class="text-muted">Activities by user – ${periodLabel}</p>
                        <div class="monthly-report-chart-wrap" style="height: 440px;">
                            <canvas id="monthlyReportPresales" height="420"></canvas>
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
            internalCount: activities.filter((a) => a.isInternal === true).length,
            externalCount: activities.filter((a) => a.isInternal !== true).length,
            userActivity: {},
            activityBreakdown: this.computeActivityBreakdownPartition(activities),
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
                const accName = item.accountName || (account && account.name) || '';
                if (!this.shouldCountActivityTowardMissingSfdc(this.currentPeriod, accName)) return false;
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
        const internalCount = activities.filter((a) => a.isInternal === true).length;
        const externalCount = activities.filter((a) => a.isInternal !== true).length;
        const internalPercent = totalActivities > 0 ? Math.round((internalCount / totalActivities) * 100) : 0;
        const externalPercent = totalActivities > 0 ? Math.round((externalCount / totalActivities) * 100) : 0;

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
                                <option value="internal" ${this.activityBreakdownFilter === 'internal' ? 'selected' : ''}>Internal</option>
                                <option value="other" ${this.activityBreakdownFilter === 'other' ? 'selected' : ''}>Other</option>
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
                            <canvas id="presalesActivityChart" height="420"></canvas>
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
                    const userActivityData = ReportsV2.buildFixedPresalesActivitySeries(safeActivities);
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
                    this.renderHorizontalStackedBarChart('presalesActivityChart', {
                        labels: userActivityData.map((u) => u.name),
                        datasets: ReportsV2.buildPresalesActivitySplitChartDatasets(userActivityData),
                        reverseCategoryAxis: true
                    });
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
                                const accName = account.name || activity.accountName || '';
                                if (!ReportsV2.shouldCountActivityTowardMissingSfdc(ReportsV2.currentPeriod, accName)) return;
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
                                const accName = account.name || activity.accountName || '';
                                if (!ReportsV2.shouldCountActivityTowardMissingSfdc(ReportsV2.currentPeriod, accName)) return;
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
                const donutColors = ['#4299E1', '#48BB78', '#ED8936', '#9F7AEA', '#38B2AC', '#ED64A6', '#718096'];
                if (document.getElementById('monthlyReportDonut') && md.breakdown) {
                    const entries = Object.entries(md.breakdown).filter(([, v]) => v > 0);
                    const labels = entries.map(([k]) => k);
                    const data = entries.map(([, v]) => v);
                    if (data.some((v) => v > 0)) {
                        this.renderDonutChart('monthlyReportDonut', {
                            labels,
                            data,
                            colors: donutColors,
                            centerTotal: md.totalActivities != null ? md.totalActivities : safeActivities.length
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
                if (document.getElementById('monthlyReportPresales') && Array.isArray(md.userActivityData) && md.userActivityData.length > 0) {
                    this.renderHorizontalStackedBarChart('monthlyReportPresales', {
                        labels: md.userActivityData.map((u) => (u.name || u.id || '—').toString()),
                        datasets: ReportsV2.buildPresalesActivitySplitChartDatasets(md.userActivityData),
                        reverseCategoryAxis: true
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

    renderHorizontalBarChart(canvasId, { labels, data, label, reverseCategoryAxis = false }) {
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

        const numericData = data.map((v) => Number(v) || 0);
        const maxVal = numericData.reduce((m, v) => Math.max(m, v), 0);
        const xScaleMax = maxVal === 0 ? 1 : undefined;

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
                        data: numericData,
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
                            ...(xScaleMax != null ? { max: xScaleMax } : {}),
                            ticks: {
                                stepSize: 1
                            }
                        },
                        y: {
                            reverse: reverseCategoryAxis === true
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
        const breakdown = ReportsV2.computeActivityBreakdownPartition(activities);
        let chartBreakdown = breakdown;
        if (this.activityBreakdownFilter !== 'all') {
            const filterMap = {
                sow: 'SOW',
                poc: 'POC',
                rfx: 'RFx',
                pricing: 'Pricing',
                customerCall: 'Customer Calls',
                internal: 'Internal',
                other: 'Other'
            };
            const selectedType = filterMap[this.activityBreakdownFilter];
            if (selectedType) {
                chartBreakdown = { [selectedType]: breakdown[selectedType] || 0 };
            }
        }
        const entries = Object.entries(chartBreakdown).filter(([, v]) => v > 0);
        const labels = entries.map(([k]) => k);
        const data = entries.map(([, v]) => v);
        if (!data.length || !data.some((v) => v > 0)) return;

        const centerTotal =
            this.activityBreakdownFilter === 'all' && Array.isArray(activities)
                ? activities.length
                : data.reduce((a, b) => a + (Number(b) || 0), 0);

        this.renderDonutChart('activityBreakdownChart', {
            labels,
            data,
            colors: ['#6B46C1', '#3182CE', '#38A169', '#DD6B20', '#D53F8C', '#805AD5', '#718096'],
            centerTotal
        });
    },

    // Render Donut Chart
    renderDonutChart(canvasId, { labels, data, colors, centerTotal: centerTotalOpt }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const sumSegments = data.reduce((a, b) => a + (Number(b) || 0), 0);
        const total = centerTotalOpt != null && Number.isFinite(Number(centerTotalOpt)) ? Number(centerTotalOpt) : sumSegments;

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
                                const pctBase = total > 0 ? total : 1;
                                const percentage = pctBase > 0 ? Math.round((value / pctBase) * 100) : 0;
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
    renderHorizontalStackedBarChart(canvasId, { labels, datasets, reverseCategoryAxis = false }) {
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
        const rowTotals = (labels || []).map((_, rowIdx) =>
            datasets.reduce((sum, ds) => sum + (Number(ds.data && ds.data[rowIdx]) || 0), 0)
        );
        const maxRowTotal = rowTotals.reduce((m, v) => Math.max(m, v), 0);
        const xScaleMax = maxRowTotal === 0 ? 1 : undefined;
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
                            ...(xScaleMax != null ? { max: xScaleMax } : {}),
                            ticks: { stepSize: 1 }
                        },
                        y: {
                            stacked: true,
                            reverse: reverseCategoryAxis === true
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
