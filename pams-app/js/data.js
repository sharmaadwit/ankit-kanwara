// Data Management Module - localStorage operations

const DEFAULT_SALES_REGIONS = [
    'India South',
    'India West',
    'India North',
    'Africa & Europe',
    'SEA',
    'MENA',
    'LATAM',
    'ROW',
    'Inside Sales'
];

const DEFAULT_SALES_REPS = [
    // India North
    { name: 'Kaushal Menghaney', email: 'kaushal.menghaney@gupshup.io', region: 'India North' },
    { name: 'Vikas Kumar', email: 'vikas.kumar@gupshup.io', region: 'India North' },
    { name: 'Shubham Kumar', email: 'shubham.kumar@gupshup.io', region: 'India North' },
    { name: 'Sanchit Aggarwal', email: 'sanchit.aggarwal@gupshup.io', region: 'India North' },
    { name: 'Preety Sharma', email: 'preety.sharma@gupshup.io', region: 'India North' },
    { name: 'Deepak Kumar', email: 'deepak.kumar@knowlarity.com', region: 'India North' },
    { name: 'Narender Singh', email: 'narender.singh@knowlarity.com', region: 'India North' },
    { name: 'Amit Malhotra', email: 'amit.malhotra@gupshup.io', region: 'India North' },
    { name: 'Shubhanjan Chatterjee', email: 'shubhanjan.chatterjee@gupshup.io', region: 'India North' },
    { name: 'Sakshi Dhaundiyal', email: 'sakshi.dhaundiyal@gupshup.io', region: 'India North' },
    { name: 'Vishal Sharma', email: 'vishal.sharma@gupshup.io', region: 'India North' },
    { name: 'Roneeta Basak', email: 'roneeta.basak@gupshup.io', region: 'India North' },
    { name: 'Nitin Bhatia', email: 'nitin.bhatia@gupshup.io', region: 'India North' },
    { name: 'Anshul Kumar', email: 'anshul.kumar@gupshup.io', region: 'India North' },
    { name: 'Rahul Verma', email: 'rahul.verma@gupshup.io', region: 'India North' },
    { name: 'Shubham Choudhary', email: 'shubham.choudhary@gupshup.io', region: 'India North' },
    { name: 'Rajshri Pandey', email: 'rajshri.pandey@gupshup.io', region: 'India North' },

    // India South
    { name: 'Ankit Kohli', email: 'ankit.kohli@gupshup.io', region: 'India South' },
    { name: 'Anand Abraham', email: 'anand.abraham@gupshup.io', region: 'India South' },
    { name: 'Kiran Kumar', email: 'kiran.kumar@gupshup.io', region: 'India South' },
    { name: 'Abhishek Phillips', email: 'abhishek.phillips@gupshup.io', region: 'India South' },
    { name: 'Ratan Saha', email: 'ratan@gupshup.io', region: 'India South' },
    { name: 'Rupam Nandi', email: 'rupam.nandi@gupshup.io', region: 'India South' },
    { name: 'Punitha M', email: 'punitha.m@gupshup.io', region: 'India South' },
    { name: 'Santosh Jigalmadi', email: 'santosh.jigalmadi@gupshup.io', region: 'India South' },
    { name: 'Anand Kumar Singh', email: 'anand.kumar@gupshup.io', region: 'India South' },
    { name: 'Ravindra Kulkarni', email: 'ravindra.kulkarni@gupshup.io', region: 'India South' },
    { name: 'Sai Pranay Maharajan', email: 'saipranay.maharajan@gupshup.io', region: 'India South' },
    { name: 'Dhananjay Kumar Singh', email: 'dhananjay.singh@knowlarity.com', region: 'India South' },
    { name: 'Vijay Kumar', email: 'vijay@gupshup.io', region: 'India South' },

    // India West
    { name: 'Chirag Panchal', email: 'chirag.panchal@gupshup.io', region: 'India West' },
    { name: 'Dhiren Khantwal', email: 'dhiren.khantwal@gupshup.io', region: 'India West' },
    { name: 'Avadhesh Chaturvedi', email: 'avadhesh.chaturvedi@gupshup.io', region: 'India West' },
    { name: 'Chandni Shetty', email: 'chandni.shetty@gupshup.io', region: 'India West' },
    { name: 'Vishal Pansari', email: 'vishal.pansari@gupshup.io', region: 'India West' },
    { name: 'Cyrus Carvalho', email: 'cyrus.carvalho@gupshup.io', region: 'India West' },
    { name: 'Neerav Chib', email: 'neerav.chib@gupshup.io', region: 'India West' },
    { name: 'Meet Nandu', email: 'meet.nandu@gupshup.io', region: 'India West' },
    { name: 'Premsagar Chourasia', email: 'premsagar.chourasia@gupshup.io', region: 'India West' },
    { name: 'Lakshya Mundra', email: 'lakshya.mundra@gupshup.io', region: 'India West' },
    { name: 'Sandeep Das', email: 'sandeep.das@gupshup.io', region: 'India West' },
    { name: 'Vijay Ghori', email: 'vijay.ghori@gupshup.io', region: 'India West' },
    { name: 'Sujal Shah', email: 'sujal.shah@gupshup.io', region: 'India West' },

    // SEA
    { name: 'Esther Khoo', email: 'esther.khoo@gupshup.io', region: 'SEA' },
    { name: 'Tanmay Srivastava', email: 'tanmay.srivastava@gupshup.io', region: 'SEA' },
    { name: 'Clifton David', email: 'clifton@gupshup.io', region: 'SEA' },

    // Africa & Europe
    { name: 'Mark Kreuiter', email: 'mark.kreuiter@gupshup.io', region: 'Africa & Europe' },
    { name: 'Idowu Adetule', email: 'idowu.adetule@gupshup.io', region: 'Africa & Europe' },
    { name: 'Joseph Cobbinah', email: 'joseph.cobbinah@gupshup.io', region: 'Africa & Europe' },
    { name: 'Sandra Mbachu', email: 'sandra.mbachu@gupshup.ai', region: 'Africa & Europe' },
    { name: 'Shashi Bhushan', email: 'shashi.bhushan@gupshup.io', region: 'Africa & Europe' },

    // LATAM
    { name: 'Bruno Montoro', email: 'bruno.montoro@gupshup.io', region: 'LATAM' },
    { name: 'Fernando Bueno', email: 'fernando.bueno@gupshup.io', region: 'LATAM' },
    { name: 'Javier Bracho', email: 'javier.bracho@gupshup.io', region: 'LATAM' },
    { name: 'Paulo Pinto', email: 'paulo.pinto@gupshup.io', region: 'LATAM' },
    { name: 'Bruno Silva', email: 'bruno.silva@gupshup.io', region: 'LATAM' },
    { name: 'Guilherme Garcia', email: 'guilherme.garcia@gupshup.io', region: 'LATAM' },

    // MENA
    { name: 'Bittu George', email: 'bittu.george@gupshup.io', region: 'MENA' },
    { name: 'Hemanth R Swamy', email: 'hemanth.swamy@gupshup.io', region: 'MENA' },
    { name: 'Mohd Abbas Murtaza', email: 'mohd.abbas@gupshup.io', region: 'MENA' },
    { name: 'Gaurav Tomar', email: 'gaurav.tomar@gupshup.io', region: 'MENA' },
    { name: 'Mohyeldein Elbaroudy', email: 'mohyeldein.elbaroudy@gupshup.io', region: 'MENA' },
    { name: 'Nayeem Mohammed', email: 'nayeem.mohammed@gupshup.io', region: 'MENA' }
];

const DEFAULT_REGION_SET = new Set(DEFAULT_SALES_REGIONS);

const SALES_REGION_MIGRATION_FLAG = 'salesRepRegionNormalized';
const MIGRATION_CLEANUP_VERSION_KEY = 'migrationCleanupVersion';
const MIGRATION_CLEANUP_VERSION = '2026-01-21';
const MIGRATION_DUPLICATE_PATTERNS = [
    { accountName: 'Daikin', type: 'sow', date: '2025-12-31' },
    { accountName: 'Money Control', type: 'customerCall', date: '2025-12-31' },
    { accountName: 'parse-ai', type: 'customerCall', date: '2025-12-31' },
    { accountName: 'colmexpro', type: 'customerCall', date: '2025-12-31' },
    { accountName: 'Solar Square', type: 'customerCall', date: '2025-12-31' }
].map((pattern) => ({
    ...pattern,
    accountNameLower: pattern.accountName.toLowerCase(),
    typeLower: pattern.type.toLowerCase()
}));

const ANALYTICS_ACCESS_CONFIG_KEY = 'analyticsAccessConfig';
const ANALYTICS_TABLE_PRESETS_KEY = 'analyticsTablePresets';
const INDUSTRY_USE_CASES_KEY = 'industryUseCases';
const PENDING_INDUSTRIES_KEY = 'pendingIndustries';
const PENDING_USE_CASES_KEY = 'pendingUseCases';
const SUGGESTIONS_AND_BUGS_KEY = 'suggestionsAndBugs';
const UNIVERSAL_USE_CASES_KEY = 'universalUseCases';

const DEFAULT_INDUSTRY_USE_CASES = {
    'BFSI': ['Account Opening', 'Transaction Alerts', 'Loan Processing', 'KYC Verification', 'Payment Reminders', 'Fraud Alerts', 'Support', 'Investment Advisory', 'Claims Processing', 'Credit Card Services', 'EMI Reminders'],
    'IT & Software': ['Product Onboarding', 'Feature Updates', 'Technical Support', 'License Management', 'User Training', 'Bug Reports', 'API Documentation', 'System Alerts'],
    'Retail & eCommerce': ['WhatsApp Commerce', 'Order Management', 'Returns & Refunds', 'Loyalty Updates', 'Inventory Management', 'In-store Appointments'],
    'E-commerce': ['Shopping Cart Recovery', 'Product Recommendations', 'Order Status', 'Flash Sales', 'Feedback'],
    'Healthcare': ['Appointment Booking', 'Patient Reminders', 'Prescription Management', 'Health Check-ups', 'Lab Reports', 'Telemedicine', 'Patient Onboarding', 'Medical Records', 'Vaccination Reminders'],
    'Education': ['Student Enrollment', 'Course Updates', 'Fee Reminders', 'Exam Notifications', 'Assignment Submissions', 'Parent-Teacher Communication', 'Attendance Alerts'],
    'Telecom': ['Plan Upgrades', 'Bill Payments', 'Network Status', 'SIM Activation', 'Roaming Alerts'],
    'Manufacturing': ['Inventory Alerts', 'Batch Management', 'Safety Guidelines', 'Supplier Coordination'],
    'Logistics': ['Tracking Updates', 'Delivery Proof', 'Route Alerts', 'Warehouse Management'],
    'Hospitality': ['Booking Confirmations', 'Room Services', 'Local Guides', 'Feedback Surveys'],
    'Real Estate': ['Property Alerts', 'Site Visit Reminders', 'Payment Schedules', 'Tenant Comms'],
    'Media': ['Content Alerts', 'Subscription Management', 'Event Updates', 'Audience Polls'],
    'Automotive': ['Service Reminders', 'Test Drive Booking', 'Recall Alerts', 'Spare Parts Status'],
    'Government': ['Public Service Alerts', 'Tax Reminders', 'Application Tracking', 'Voter Info']
};

// Entity keys: server-only fetch (phased). No localStorage fallback; invalidate after save.
const ENTITY_KEYS = new Set(['accounts', 'activities', 'internalActivities', 'users']);
const isEntityKey = (key) => key && (ENTITY_KEYS.has(key) || key === 'activities');

// Activity save trace: last 80 steps for debugging data loss. Persisted on failure so you can retrieve after refresh.
if (typeof window !== 'undefined') {
    window.__activitySaveTrace = window.__activitySaveTrace || [];
    const TRACE_MAX = 80;
    const TRACE_LAST_FAILURE_KEY = '__activitySaveTraceLastFailure';
    window.__activitySaveTracePush = function (msg, detail) {
        window.__activitySaveTrace = window.__activitySaveTrace || [];
        window.__activitySaveTrace.push({ t: Date.now(), msg: msg, detail: detail != null ? detail : undefined });
        if (window.__activitySaveTrace.length > TRACE_MAX) window.__activitySaveTrace.shift();
        console.log('[ActivitySave]', msg, detail != null ? detail : '');
    };
    window.__activitySaveTracePersistFailure = function (reason) {
        try {
            var payload = {
                at: new Date().toISOString(),
                reason: reason,
                trace: (window.__activitySaveTrace || []).slice(-TRACE_MAX)
            };
            window.localStorage.setItem(TRACE_LAST_FAILURE_KEY, JSON.stringify(payload));
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('trace persisted to localStorage', { key: TRACE_LAST_FAILURE_KEY });
            }
        } catch (e) { console.warn('[ActivitySave] persist failed', e); }
    };
    window.__activitySaveTraceCopy = function () {
        var arr = window.__activitySaveTrace || [];
        var lines = arr.map(function (e) {
            return (new Date(e.t).toISOString()) + ' ' + e.msg + (e.detail != null ? ' ' + JSON.stringify(e.detail) : '');
        });
        var text = lines.join('\n');
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(function () { console.log('[ActivitySave] Copied', arr.length, 'lines to clipboard'); })
                .catch(function () { console.warn('[ActivitySave] Clipboard failed (click page first). Trace logged below – copy from console.'); });
        }
        console.log('[ActivitySave] Trace (' + arr.length + ' steps):\n' + text);
        return text;
    };
    /** Refetch activities from server and check if an activity id exists. Usage: __findActivityById('mmfxkcu0wqb6pittr') */
    window.__findActivityById = function (id) {
        var dm = typeof window !== 'undefined' && window.DataManager;
        if (!dm || typeof dm.invalidateCache !== 'function' || typeof dm.getActivities !== 'function') {
            console.warn('[ActivitySave] DataManager not ready. Try again after app load.');
            return Promise.resolve(null);
        }
        dm.invalidateCache('activities', 'allActivities');
        return dm.getActivities().then(function (list) {
            var found = Array.isArray(list) ? list.find(function (a) { return a && a.id === id; }) : null;
            if (found) {
                console.log('[ActivitySave] Found activity:', found);
            } else {
                console.log('[ActivitySave] Activity id "' + id + '" NOT in list. Total activities on server:', list ? list.length : 0);
            }
            return found;
        });
    };
    window.addEventListener('unhandledrejection', function (event) {
        var reasonStr = String(event.reason && (event.reason.message || event.reason));
        if (reasonStr.indexOf('Clipboard') !== -1 || reasonStr.indexOf('writeText') !== -1) {
            return;
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('unhandledRejection', {
                reason: reasonStr,
                stack: event.reason && event.reason.stack
            });
            window.__activitySaveTracePersistFailure('unhandledRejection');
        }
    });
    var prevOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('window.onerror', {
                message: message,
                source: source,
                line: lineno,
                col: colno,
                stack: error && error.stack
            });
            window.__activitySaveTracePersistFailure('onerror');
        }
        if (prevOnError) return prevOnError.apply(this, arguments);
        return false;
    };
}

/**
 * Coerce roles from DB, legacy storage, or string JSON into string[].
 * Win/Loss and analytics depend on this when storage-shaped users omit roles.
 */
function coerceUserRoles(roles) {
    if (roles == null) return [];
    if (Array.isArray(roles)) {
        return roles.map((r) => String(r).trim()).filter(Boolean);
    }
    if (typeof roles === 'string') {
        const s = roles.trim();
        if (!s) return [];
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
                return parsed.map((r) => String(r).trim()).filter(Boolean);
            }
        } catch (_) {
            /* not JSON */
        }
        return s.split(',').map((x) => x.trim()).filter(Boolean);
    }
    return [];
}

/** Admin/industry lists: Customer Support → Support, dedupe. */
function migrateCustomerSupportInIndustryUseCaseMap(map) {
    if (!map || typeof map !== 'object') return { map: map || {}, changed: false };
    let changed = false;
    const out = { ...map };
    for (const k of Object.keys(out)) {
        if (!Array.isArray(out[k])) continue;
        const arr = out[k].map((uc) => {
            const s = String(uc || '').trim();
            if (s === 'Customer Support' || s.toLowerCase() === 'customer support') {
                changed = true;
                return 'Support';
            }
            return uc;
        });
        const deduped = [...new Set(arr)];
        if (deduped.length !== arr.length) changed = true;
        out[k] = deduped;
    }
    return { map: out, changed };
}

/** Same signals as remoteStorage.buildHeaders: X-Admin-User + Accept for /api/storage/.../append when STORAGE_API_KEY is set. */
function pamsStorageAppendHeaders() {
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };
    if (typeof window !== 'undefined') {
        const fromRs = window.__REMOTE_STORAGE_USER__;
        if (fromRs) {
            headers['X-Admin-User'] = fromRs;
        } else if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.username) {
            headers['X-Admin-User'] = Auth.currentUser.username;
        }
    }
    return headers;
}

const DataManager = {
    cache: {
        accounts: null,
        activities: null,
        internalActivities: null,
        users: null,
        globalSalesReps: null,
        allActivities: null
    },

    resetCache() {
        this.cache = {
            accounts: null,
            activities: null,
            internalActivities: null,
            users: null,
            globalSalesReps: null,
            allActivities: null
        };
    },

    invalidateCache(...keys) {
        if (!keys.length) {
            this.resetCache();
            return;
        }
        keys.forEach((key) => {
            if (key === 'activities' || key === 'internalActivities') {
                this.cache.allActivities = null;
            }
            if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
                this.cache[key] = null;
            }
        });
    },

    recordAudit(action, entity, entityId, detail = {}) {
        try {
            if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
                Audit.log({
                    action,
                    entity,
                    entityId,
                    detail
                });
            }
        } catch (error) {
            console.warn('Audit logging skipped:', error);
        }
    },

    // Initialize default data
    async initialize() {
        try {
            this.resetCache();
            // Initialize users if none exist
            const existingUsers = await this.getUsers();
            if (!existingUsers.length) {
                const defaultUsers = [
                    {
                        id: this.generateId(),
                        username: 'admin',
                        email: 'admin@example.com',
                        password: 'admin123', // In production, this should be hashed
                        roles: ['Admin', 'Presales User'],
                        regions: ['India South', 'India North'],
                        salesReps: ['John Doe', 'Jane Smith'],
                        defaultRegion: 'India South',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        forcePasswordChange: false,
                        passwordUpdatedAt: new Date().toISOString()
                    },
                    {
                        id: this.generateId(),
                        username: 'user',
                        email: 'user@example.com',
                        password: 'user123',
                        roles: ['Presales User'],
                        regions: ['India South'],
                        salesReps: ['John Doe'],
                        defaultRegion: 'India South',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        forcePasswordChange: false,
                        passwordUpdatedAt: new Date().toISOString()
                    }
                ];
                await this.saveUsers(defaultUsers);
            }

            // Initialize industries if none exist
            const existingIndustries = await this.getIndustries();
            if (!existingIndustries.length) {
                const defaultIndustries = [
                    'Banking', 'Fintech', 'Insurance', 'IT & Software', 'Retail',
                    'CPG & FMCG', 'Healthcare', 'Pharma & Life Sciences', 'Manufacturing',
                    'Logistics & Supply Chain', 'Industrial', 'Agritech',
                    'Real Estate & Construction', 'Education', 'Media & Entertainment',
                    'Travel & Hospitality', 'Government & Public Sector', 'Professional Services'
                ];
                this.saveIndustries(defaultIndustries);
            }

            // Initialize Industry-Use Case map if empty
            const storage = typeof this.getLocalStorage === 'function' ? this.getLocalStorage() : (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage && !storage.getItem(INDUSTRY_USE_CASES_KEY)) {
                this.saveIndustryUseCases(DEFAULT_INDUSTRY_USE_CASES);
                const industries = Object.keys(DEFAULT_INDUSTRY_USE_CASES).sort();
                this.saveIndustries(industries);
            }
            // Initialize regions if none exist
            const existingRegions = await this.getRegions();
            if (!existingRegions.length) {
                this.saveRegions([...DEFAULT_SALES_REGIONS]);
            } else {
                await this.ensureRegionBaseline();
            }

            // Initialize / ensure sales rep roster
            let salesReps = await this.getGlobalSalesReps();
            if (!salesReps.length) {
                salesReps = DEFAULT_SALES_REPS.map(rep => ({
                    id: this.generateId(),
                    name: rep.name,
                    email: rep.email,
                    region: rep.region,
                    currency: rep.currency || 'INR',
                    fxToInr: null,
                    isActive: true,
                    createdAt: new Date().toISOString()
                }));
                this.saveGlobalSalesReps(salesReps);
            } else {
                const emailIndex = new Map();
                salesReps.forEach((rep, index) => {
                    const emailKey = (rep.email || '').toLowerCase();
                    if (emailKey) {
                        emailIndex.set(emailKey, index);
                    }
                });
                let mutated = false;

                const configuredRegionsSet = new Set(await this.getRegions());
                DEFAULT_SALES_REPS.forEach(rep => {
                    const emailKey = rep.email.toLowerCase();
                    if (!emailIndex.has(emailKey)) {
                        const newRep = {
                            id: this.generateId(),
                            name: rep.name,
                            email: rep.email,
                            region: rep.region,
                            currency: rep.currency || 'INR',
                            fxToInr: null,
                            isActive: true,
                            createdAt: new Date().toISOString()
                        };
                        salesReps.push(newRep);
                        emailIndex.set(emailKey, salesReps.length - 1);
                        mutated = true;
                        return;
                    }

                    const index = emailIndex.get(emailKey);
                    const current = salesReps[index];
                    const updated = { ...current };
                    let changed = false;

                    if ((current.name || '').trim() !== rep.name) {
                        updated.name = rep.name;
                        changed = true;
                    }

                    // Preserve existing region (e.g. Inside sales) – never overwrite with default list so admins' choices stick
                    const currentRegion = (current.region || '').trim();
                    if (!currentRegion && rep.region) {
                        updated.region = rep.region;
                        changed = true;
                    }

                    if (!current.currency) {
                        updated.currency = rep.currency || 'INR';
                        changed = true;
                    }

                    if (updated.isActive === undefined) {
                        updated.isActive = true;
                        changed = true;
                    }

                    if (changed) {
                        salesReps[index] = updated;
                        mutated = true;
                    }
                });

                if (mutated) {
                    this.saveGlobalSalesReps(salesReps);
                }
            }

            // Initialize industries and regions as empty arrays (will be managed inline in forms)
            if (!localStorage.getItem('industries')) {
                this.saveIndustries(['BFSI', 'IT & Software', 'Retail & eCommerce', 'Telecom', 'Healthcare', 'Media & Entertainment', 'Travel & Hospitality', 'Automotive', 'Government', 'Education']);
            }
            if (!localStorage.getItem('regions')) {
                this.saveRegions([...DEFAULT_SALES_REGIONS]);
            }

            // Initialize other data structures
            if (!localStorage.getItem('accounts')) {
                await this.saveAccounts([]);
            }
            if (!localStorage.getItem('activities')) {
                await this.saveActivities([]);
            }
            if (!localStorage.getItem('internalActivities')) {
                await this.saveInternalActivities([]);
            }

            if (!localStorage.getItem('presalesActivityTarget')) {
                this.savePresalesActivityTarget(20, { updatedBy: 'System' });
            }

            this.normalizeSalesRepRegions();
            this.backfillAccountSalesRepRegions();
            // When remote storage is on, skip full-list activity backfill/cleanup on init so we don't PUT 3283 activities right after reconcile (would overwrite server and undo user edits).
            if (typeof window === 'undefined' || !window.__REMOTE_STORAGE_ENABLED__) {
                this.backfillActivitySalesRepRegions();
                await this.applyMigrationCleanupIfNeeded();
            }
            this.ensureAnalyticsPresetBaseline();
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    },

    async applyMigrationCleanupIfNeeded() {
        try {
            const appliedVersion = localStorage.getItem(
                MIGRATION_CLEANUP_VERSION_KEY
            );
            if (appliedVersion === MIGRATION_CLEANUP_VERSION) {
                return;
            }

            const existingActivities = await this.getActivities();
            const {
                records: normalizedActivities,
                changed: activitiesChanged
            } = this.prepareMigratedActivities(existingActivities);

            if (activitiesChanged) {
                await this.saveActivities(normalizedActivities);
            }

            const existingAccounts = await this.getAccounts();
            const {
                records: normalizedAccounts,
                changed: accountsChanged
            } = this.prepareMigratedAccounts(
                existingAccounts,
                normalizedActivities
            );

            if (accountsChanged) {
                await this.saveAccounts(normalizedAccounts);
            }

            localStorage.setItem(
                MIGRATION_CLEANUP_VERSION_KEY,
                MIGRATION_CLEANUP_VERSION
            );
            this.invalidateCache('activities', 'accounts', 'allActivities');
        } catch (error) {
            console.error('Migration cleanup failed:', error);
        }
    },

    prepareMigratedActivities(activities) {
        const seenSignatures = new Set();
        const seenUserSummarySignatures = new Set();
        const deduped = [];
        let changed = false;

        (Array.isArray(activities) ? activities : []).forEach((activity) => {
            const { record, mutated } =
                this.normalizeMigratedActivity(activity);
            if (mutated) {
                changed = true;
            }
            const signature = this.buildActivitySignature(record);
            if (seenSignatures.has(signature)) {
                changed = true;
                return;
            }
            seenSignatures.add(signature);

            const userSummarySignature = this.buildActivityUserSummarySignature(
                record
            );
            if (seenUserSummarySignatures.has(userSummarySignature)) {
                changed = true;
                return;
            }
            seenUserSummarySignatures.add(userSummarySignature);
            deduped.push(record);
        });

        const patternResult = this.removePatternDuplicates(deduped);
        if (patternResult.changed) {
            changed = true;
        }

        return { records: patternResult.records, changed };
    },

    normalizeMigratedActivity(activity = {}) {
        const original = activity || {};
        const normalized = { ...original };
        let mutated = false;

        const trimField = (field) => {
            if (typeof normalized[field] === 'string') {
                const trimmed = normalized[field].trim();
                if (trimmed !== normalized[field]) {
                    normalized[field] = trimmed;
                    mutated = true;
                }
            }
        };

        trimField('summary');
        trimField('salesRep');
        trimField('accountName');
        trimField('userName');
        trimField('assignedUserEmail');

        const candidateDate =
            normalized.date || normalized.createdAt || normalized.monthOfActivity;
        if (candidateDate) {
            const parsed = new Date(candidateDate);
            if (!Number.isNaN(parsed.getTime())) {
                const iso = parsed.toISOString();
                if (iso !== normalized.date) {
                    normalized.date = iso;
                    mutated = true;
                }
                if (!normalized.createdAt) {
                    normalized.createdAt = iso;
                    mutated = true;
                }
                if (!normalized.monthOfActivity) {
                    normalized.monthOfActivity = iso.slice(0, 7);
                    mutated = true;
                }
            }
        }

        if (!normalized.monthOfActivity && normalized.date) {
            normalized.monthOfActivity = normalized.date.slice(0, 7);
            mutated = true;
        }

        if (!normalized.source) {
            normalized.source = 'migration';
            mutated = true;
        }

        if (normalized.source === 'migration' && !normalized.isMigrated) {
            normalized.isMigrated = true;
            mutated = true;
        }

        return {
            record: mutated ? normalized : original,
            mutated
        };
    },

    buildActivitySignature(activity) {
        const normalize = (value) =>
            (value || '')
                .toString()
                .trim()
                .toLowerCase();

        const summarySnippet = normalize(activity.summary).slice(0, 280);
        const datePart = normalize(activity.date || activity.createdAt).slice(
            0,
            10
        );

        return [
            normalize(activity.accountId || activity.accountName),
            normalize(activity.projectId || activity.projectName),
            normalize(activity.type),
            datePart,
            normalize(activity.assignedUserEmail || activity.userId),
            normalize(activity.salesRep),
            summarySnippet
        ].join('|');
    },

    buildActivityUserSummarySignature(activity = {}) {
        const normalize = (value) =>
            (value || '')
                .toString()
                .trim()
                .toLowerCase();

        const datePart = normalize(activity.date || activity.createdAt).slice(
            0,
            10
        );

        const accountKey = normalize(activity.accountId || activity.accountName);
        const projectKey = normalize(activity.projectId || activity.projectName);
        const typeKey = normalize(activity.type);
        const summaryKey = normalize(activity.summary);
        const userKey = normalize(
            activity.assignedUserEmail ||
            activity.userId ||
            activity.userName ||
            ''
        );

        return [
            accountKey,
            projectKey,
            datePart,
            typeKey,
            summaryKey,
            userKey
        ].join('|');
    },

    removePatternDuplicates(records) {
        if (!Array.isArray(records) || !records.length) {
            return { records, changed: false };
        }

        let changed = false;
        const working = records.map((activity) => ({ ...activity }));

        MIGRATION_DUPLICATE_PATTERNS.forEach((pattern) => {
            const matches = [];
            working.forEach((activity, index) => {
                if (!activity || activity.source !== 'migration') return;
                const accountName = (activity.accountName || '').trim().toLowerCase();
                const type = (activity.type || '').trim().toLowerCase();
                const date = (activity.date || activity.createdAt || '').slice(0, 10);
                if (
                    accountName === pattern.accountNameLower &&
                    type === pattern.typeLower &&
                    date === pattern.date
                ) {
                    matches.push({ activity, index });
                }
            });

            if (matches.length > 1) {
                const [keep, ...rest] = matches;
                rest.forEach(({ index }) => {
                    working[index] = null;
                    changed = true;
                });
            }
        });

        return {
            records: working.filter(Boolean),
            changed
        };
    },

    prepareMigratedAccounts(accounts, activities) {
        const manualProjectIds = new Set(
            (Array.isArray(activities) ? activities : [])
                .filter(
                    (activity) =>
                        activity &&
                        activity.projectId &&
                        activity.source &&
                        activity.source !== 'migration'
                )
                .map((activity) => activity.projectId)
        );

        let changed = false;

        const normalizedAccounts = (Array.isArray(accounts) ? accounts : []).map(
            (account) => {
                if (
                    !account ||
                    !Array.isArray(account.projects) ||
                    !account.projects.length
                ) {
                    return account;
                }

                let accountMutated = false;
                const projects = account.projects.map((project) => {
                    if (!project) return project;
                    const updated = { ...project };
                    let projectMutated = false;

                    const normalizedName =
                        typeof updated.name === 'string'
                            ? updated.name.trim()
                            : updated.name;
                    if (normalizedName !== updated.name) {
                        updated.name = normalizedName;
                        projectMutated = true;
                    }

                    const hasManual = manualProjectIds.has(updated.id);
                    if (hasManual) {
                        if (updated.status !== 'active') {
                            updated.status = 'active';
                            projectMutated = true;
                        }
                        if (updated.isMigrated) {
                            delete updated.isMigrated;
                            projectMutated = true;
                        }
                    } else {
                        if (updated.status !== 'inactive') {
                            updated.status = 'inactive';
                            projectMutated = true;
                        }
                        if (!updated.isMigrated) {
                            updated.isMigrated = true;
                            projectMutated = true;
                        }
                    }

                    if (projectMutated) {
                        accountMutated = true;
                        return updated;
                    }

                    return project;
                });

                if (accountMutated) {
                    changed = true;
                    return { ...account, projects };
                }

                return account;
            }
        );

        return {
            records: changed ? normalizedAccounts : accounts,
            changed
        };
    },

    // User Management. Never throws: returns [] on failure so callers can always render. Load when needed (e.g. admin section), not critical for initial page load.
    async getUsers() {
        if (this.cache.users) {
            return this.cache.users;
        }
        try {
            return await this._getUsersImpl();
        } catch (err) {
            console.warn('[DataManager] getUsers failed:', err);
            return [];
        }
    },

    async _getUsersImpl() {
        const normalizeUser = (user) => {
            if (!user || typeof user !== 'object') return user;
            const defaultRegion =
                typeof (user.defaultRegion || user.default_region) === 'string' ? (user.defaultRegion || user.default_region).trim() : '';
            const regions = Array.isArray(user.regions) ? user.regions : [];
            const salesReps = Array.isArray(user.salesReps) ? user.salesReps : (Array.isArray(user.sales_reps) ? user.sales_reps : []);
            return {
                ...user,
                regions,
                salesReps,
                defaultRegion,
                roles: coerceUserRoles(user.roles)
            };
        };
        const toRawUsers = (parsed) => {
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users)) return parsed.users;
            return [];
        };
        const fetchWithTimeout = (url, ms) => {
            const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const id = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
            const p = fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined });
            if (id) p.finally(() => clearTimeout(id));
            return p;
        };
        const ADMIN_USERS_TIMEOUT_MS = 12000;
        const adminUsersUrl = () => {
            const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' ? window.__REMOTE_STORAGE_BASE__ : '';
            const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
            const apiRoot = (base && base.replace) ? base.replace(/\/api\/storage\/?$/, '') : '';
            const root = (apiRoot && apiRoot.length > 0) ? apiRoot : origin;
            return root ? (root.replace(/\/$/, '') + '/api/admin/users') : '/api/admin/users';
        };
        const rosterUsersUrl = () => {
            const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' ? window.__REMOTE_STORAGE_BASE__ : '';
            const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
            const apiRoot = (base && base.replace) ? base.replace(/\/api\/storage\/?$/, '') : '';
            const root = (apiRoot && apiRoot.length > 0) ? apiRoot : origin;
            return root ? (root.replace(/\/$/, '') + '/api/users') : '/api/users';
        };
        // Remote: prefer DB-backed /api/admin/users when it returns rows (fixes edit user vs stale storage `users`).
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                let adminOk = false;
                let adminList = [];
                let lastErr;
                for (let attempt = 0; attempt <= 1; attempt++) {
                    try {
                        const res = await fetchWithTimeout(adminUsersUrl(), ADMIN_USERS_TIMEOUT_MS);
                        if (res.ok) {
                            const fromDb = await res.json();
                            adminList = Array.isArray(fromDb) ? fromDb : [];
                            adminOk = true;
                            break;
                        }
                        if (res.status === 401 || res.status === 403) {
                            if (attempt === 0) console.warn('[DataManager] GET /api/admin/users: admin auth required (', res.status, ')');
                            lastErr = new Error('Admin access required');
                            break;
                        }
                    } catch (apiErr) {
                        lastErr = apiErr;
                        if (attempt === 0) console.warn('[DataManager] GET /api/admin/users failed (will retry once):', apiErr);
                    }
                }
                if (lastErr && !adminOk) console.warn('[DataManager] GET /api/admin/users failed after retry:', lastErr);

                if (adminOk && adminList.length > 0) {
                    const normalized = adminList.map(normalizeUser).filter(Boolean);
                    this.cache.users = normalized;
                    return normalized;
                }

                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync('users');
                const parsed = stored ? (typeof stored === 'string' ? (() => { try { return JSON.parse(stored); } catch (_) { return []; } })() : stored) : [];
                const rawUsers = toRawUsers(parsed);
                if (rawUsers.length > 0) {
                    const normalized = rawUsers.map(normalizeUser).filter(Boolean);
                    this.cache.users = normalized;
                    return normalized;
                }

                if (adminOk) {
                    const normalized = adminList.map(normalizeUser).filter(Boolean);
                    this.cache.users = normalized;
                    return normalized;
                }

                try {
                    const rosterRes = await fetch(rosterUsersUrl(), { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
                    if (rosterRes.ok) {
                        const fromRoster = await rosterRes.json();
                        const list = Array.isArray(fromRoster) ? fromRoster : [];
                        const normalized = list.map(normalizeUser).filter(Boolean);
                        this.cache.users = normalized;
                        return normalized;
                    }
                } catch (rosterErr) {
                    console.warn('[DataManager] Fallback GET /api/users failed:', rosterErr);
                }
                return [];
            } catch (err) {
                console.warn('[DataManager] Async getUsers failed:', err);
                if (isEntityKey('users')) return [];
            }
        }
        if (isEntityKey('users')) return [];
        const stored = localStorage.getItem('users');
        const rawUsers = stored ? (() => { try { const p = JSON.parse(stored); return toRawUsers(p); } catch (_) { return []; } })() : [];
        const normalized = rawUsers.map(normalizeUser).filter(Boolean);
        this.cache.users = normalized;
        return normalized;
    },

    userIsPresalesUser(user) {
        if (!user || typeof user !== 'object') return false;
        return coerceUserRoles(user.roles).some((r) => String(r).trim().toLowerCase() === 'presales user');
    },

    /**
     * Active users from GET /api/users (DB). Bypasses storage-backed user list so roles stay accurate for dropdowns.
     */
    async getActiveRosterUsers() {
        const normalizeUser = (user) => {
            if (!user || typeof user !== 'object') return user;
            const defaultRegion =
                typeof (user.defaultRegion || user.default_region) === 'string' ? (user.defaultRegion || user.default_region).trim() : '';
            const regions = Array.isArray(user.regions) ? user.regions : [];
            const salesReps = Array.isArray(user.salesReps) ? user.salesReps : (Array.isArray(user.sales_reps) ? user.sales_reps : []);
            return {
                ...user,
                regions,
                salesReps,
                defaultRegion,
                roles: coerceUserRoles(user.roles)
            };
        };
        try {
            const base = typeof window.__REMOTE_STORAGE_BASE__ !== 'undefined' ? window.__REMOTE_STORAGE_BASE__ : '';
            const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
            const apiRoot = (base && base.replace) ? base.replace(/\/api\/storage\/?$/, '') : '';
            const root = (apiRoot && apiRoot.length > 0) ? apiRoot : origin;
            const rosterUrl = root ? (root.replace(/\/$/, '') + '/api/users') : '/api/users';
            const rosterRes = await fetch(rosterUrl, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
            if (!rosterRes.ok) return [];
            const fromRoster = await rosterRes.json();
            const list = Array.isArray(fromRoster) ? fromRoster : [];
            return list.map(normalizeUser).filter(Boolean);
        } catch (e) {
            console.warn('[DataManager] getActiveRosterUsers failed:', e);
            return [];
        }
    },

    /**
     * Presales roster for Win/Loss dropdown: merge DB roster (/api/users) with cached getUsers()
     * so roles and ids stay in sync when one source omits "Presales User" or returns partial rows.
     */
    async getPresalesUsersForWinLoss() {
        const [roster, users] = await Promise.all([
            this.getActiveRosterUsers().catch(() => []),
            this.getUsers().catch(() => [])
        ]);
        const byId = new Map();
        for (const u of users) {
            if (!u || u.id == null) continue;
            byId.set(String(u.id), { ...u, roles: coerceUserRoles(u.roles) });
        }
        for (const u of roster) {
            if (!u || u.id == null) continue;
            const k = String(u.id);
            const existing = byId.get(k);
            const rRoles = coerceUserRoles(u.roles);
            if (!existing) {
                byId.set(k, { ...u, roles: rRoles });
            } else {
                const mergedRoles = [...new Set([...existing.roles, ...rRoles])];
                byId.set(k, { ...existing, ...u, roles: mergedRoles });
            }
        }
        return Array.from(byId.values())
            .filter((u) => this.userIsPresalesUser(u))
            .sort((a, b) => {
                const an = String(a.username || a.name || a.id || '').toLowerCase();
                const bn = String(b.username || b.name || b.id || '').toLowerCase();
                return an.localeCompare(bn);
            });
    },

    /**
     * Fixed presales attribution for known accounts (Win/Loss list, modal preselect, monthly report wins).
     * First matching rule wins; match is on normalized account name (lowercase).
     */
    getWinLossPresalesTagRules() {
        const hasMk = (n) => n.includes('mk');
        const sbilifeLike = (n) => n.includes('sbilife') || (n.includes('sbi') && n.includes('life'));
        return [
            { presalesName: 'Mridul Kumawat', match: (n) => hasMk(n) && n.includes('reckitt') },
            { presalesName: 'Mridul Kumawat', match: (n) => hasMk(n) && sbilifeLike(n) },
            { presalesName: 'Mridul Kumawat', match: (n) => (n.includes('mibl') && hasMk(n)) || /\bmibl\b/.test(n) },
            { presalesName: 'Yashas Reddy', match: (n) => n.includes('nissin') },
            { presalesName: 'Mridul Kumawat', match: (n) => /\btrent\b/.test(n) },
            { presalesName: 'Gargi Upadhyay', match: (n) => n.includes('azizi') }
        ];
    },

    normalizeAccountNameForWinLossTag(name) {
        return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    },

    getWinLossPresalesTagForAccountName(accountName) {
        const n = this.normalizeAccountNameForWinLossTag(accountName);
        if (!n) return null;
        for (const rule of this.getWinLossPresalesTagRules()) {
            if (rule.match(n)) return rule.presalesName;
        }
        return null;
    },

    /** Tag lookup on account name, then optional project/opportunity name (labels often differ). */
    getWinLossPresalesTagForWin(accountName, projectName) {
        const fromAccount = this.getWinLossPresalesTagForAccountName(accountName);
        if (fromAccount) return fromAccount;
        if (projectName && String(projectName).trim()) {
            const fromProject = this.getWinLossPresalesTagForAccountName(projectName);
            if (fromProject) return fromProject;
        }
        return null;
    },

    /** Resolve roster user id for a display name (exact, then all tokens contained in username/name). */
    findPresalesUserIdForTagNameSync(users, displayName) {
        if (!displayName || !String(displayName).trim() || !users || !users.length) return null;
        const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const wanted = norm(displayName);
        let u = users.find((x) => norm(x.username) === wanted || norm(x.name) === wanted);
        if (u && u.id != null) return u.id;
        const parts = wanted.split(' ').filter((p) => p.length > 1);
        if (parts.length) {
            u = users.find((x) => {
                const un = norm(x.username);
                const nm = norm(x.name);
                return parts.every((p) => un.includes(p) || nm.includes(p));
            });
        }
        return u && u.id != null ? u.id : null;
    },

    async findPresalesUserIdForTagName(displayName) {
        if (!displayName || !String(displayName).trim()) return null;
        let users;
        try {
            users = await this.getUsers();
        } catch (e) {
            return null;
        }
        return this.findPresalesUserIdForTagNameSync(users, displayName);
    },

    // Ensure default users exist (call this if needed)
    async ensureDefaultUsers() {
        const users = await this.getUsers();
        if (users.length === 0) {
            const defaultUsers = [
                {
                    id: this.generateId(),
                    username: 'admin',
                    email: 'admin@example.com',
                    password: 'admin123',
                    roles: ['Admin', 'Presales User', 'POC Admin'],
                    regions: ['India South', 'India North'],
                    salesReps: ['John Doe', 'Jane Smith'],
                    defaultRegion: 'India South',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: false,
                    passwordUpdatedAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    username: 'user',
                    email: 'user@example.com',
                    password: 'user123',
                    roles: ['Presales User'],
                    regions: ['India South'],
                    salesReps: ['John Doe'],
                    defaultRegion: 'India South',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: false,
                    passwordUpdatedAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    username: 'nikhil.sharma',
                    email: 'nikhil.sharma@knowlarity.com',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['India North'],
                    salesReps: [],
                    defaultRegion: 'India North',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'puru.chauhan',
                    email: 'puru.chauhan@knowlarity.com',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['India North'],
                    salesReps: [],
                    defaultRegion: 'India North',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'mridul.kumawat',
                    email: 'mridul.kumawat@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['India West'],
                    salesReps: [],
                    defaultRegion: 'India West',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'purusottam.singh',
                    email: 'purusottam.singh@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['India West'],
                    salesReps: [],
                    defaultRegion: 'India West',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'kathyayani.nayak',
                    email: 'kathyayani.nayak@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['India South'],
                    salesReps: [],
                    defaultRegion: 'India South',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'yashas.reddy',
                    email: 'yashas.reddy@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['Africa & Europe'],
                    salesReps: [],
                    defaultRegion: 'Africa & Europe',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'mauricio.martins',
                    email: 'mauricio.martins@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['LATAM'],
                    salesReps: [],
                    defaultRegion: 'LATAM',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'gargi.upadhyay',
                    email: 'gargi.upadhyay@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['MENA'],
                    salesReps: [],
                    defaultRegion: 'MENA',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'siddharth.singh',
                    email: 'siddharth.singh@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: ['MENA'],
                    salesReps: [],
                    defaultRegion: 'MENA',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                },
                {
                    id: this.generateId(),
                    username: 'adwit.sharma',
                    email: 'adwit.sharma@gupshup.io',
                    password: 'Welcome@Gupshup1',
                    roles: ['Presales User'],
                    regions: [],
                    salesReps: [],
                    defaultRegion: '',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    forcePasswordChange: true,
                    passwordUpdatedAt: null
                }
            ];
            await this.saveUsers(defaultUsers);
        }
        return users;
    },

    async saveUsers(users) {
        const payload = JSON.stringify(users);
        // Use async with draft for conflict handling
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft('users', payload, { type: 'external' });
                this.invalidateCache('users', 'allActivities');
                return;
            } catch (err) {
                console.warn('[DataManager] Async saveUsers failed; preserving draft and aborting sync overwrite:', err);
                throw err;
            }
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            throw new Error('Remote entity write path unavailable for users');
        }
        localStorage.setItem('users', payload);
        this.invalidateCache('users', 'allActivities');
    },

    /** DB numeric ids vs DOM dataset string ids — compare loosely. */
    userIdsMatch(a, b) {
        if (a == null || b == null) return false;
        return String(a) === String(b);
    },

    async getUserById(id) {
        const users = await this.getUsers();
        return users.find(u => this.userIdsMatch(u.id, id));
    },

    async getUserByUsername(username) {
        const users = await this.getUsers();
        return users.find(u => u.username === username);
    },

    async addUser(user) {
        const users = await this.getUsers();
        user.id = this.generateId();
        user.createdAt = new Date().toISOString();
        user.isActive = user.isActive !== undefined ? user.isActive : true;
        user.forcePasswordChange = user.forcePasswordChange === true;
        user.passwordUpdatedAt = user.forcePasswordChange ? null : new Date().toISOString();
        const availableRegions = await this.getRegions();
        const defaultRegion =
            typeof user.defaultRegion === 'string' ? user.defaultRegion.trim() : '';
        user.defaultRegion =
            defaultRegion && availableRegions.includes(defaultRegion) ? defaultRegion : '';
        user.regions = Array.isArray(user.regions) ? user.regions : [];
        user.salesReps = Array.isArray(user.salesReps) ? user.salesReps : [];
        users.push(user);
        await this.saveUsers(users);
        return user;
    },

    async updateUser(userId, updates) {
        const users = await this.getUsers();
        const index = users.findIndex(u => this.userIdsMatch(u.id, userId));
        if (index !== -1) {
            const merged = { ...users[index], ...updates };
            if (updates.forcePasswordChange !== undefined) {
                merged.forcePasswordChange = updates.forcePasswordChange === true;
                if (merged.forcePasswordChange) {
                    merged.passwordUpdatedAt = null;
                }
            }
            if (updates.password) {
                if (!merged.forcePasswordChange) {
                    merged.passwordUpdatedAt = new Date().toISOString();
                }
            }
            if (updates.defaultRegion !== undefined) {
                const trimmed =
                    typeof updates.defaultRegion === 'string' ? updates.defaultRegion.trim() : '';
                const availableRegions = await this.getRegions();
                merged.defaultRegion =
                    trimmed && availableRegions.includes(trimmed) ? trimmed : '';
            }
            merged.updatedAt = new Date().toISOString();
            users[index] = merged;
            await this.saveUsers(users);
            return users[index];
        }
        return null;
    },

    async deleteUser(userId) {
        const users = (await this.getUsers()).filter(u => !this.userIdsMatch(u.id, userId));
        await this.saveUsers(users);
    },

    // Industry Management
    async getIndustries() {
        if (this.cache.industries) return this.cache.industries;
        const key = 'industries';
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                const raw = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
                const industries = Array.isArray(raw) ? raw : [];
                this.cache.industries = industries;
                return industries;
            } catch (err) {
                console.warn('[DataManager] Async getIndustries failed:', err);
            }
        }
        const stored = localStorage.getItem(key);
        let industries = stored ? (() => { try { const p = JSON.parse(stored); return Array.isArray(p) ? p : []; } catch (_) { return []; } })() : [];
        this.cache.industries = industries;
        return industries;
    },

    async saveIndustries(industries) {
        const key = 'industries';
        const payload = JSON.stringify(industries);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                this.cache.industries = industries;
                return;
            } catch (err) {
                console.warn('[DataManager] Async saveIndustries failed:', err);
            }
        }
        localStorage.setItem(key, payload);
        this.cache.industries = industries;
    },

    async addIndustry(industry) {
        const industries = await this.getIndustries();
        if (!industries.includes(industry)) {
            industries.push(industry);
            await this.saveIndustries(industries);
        }
    },

    async deleteIndustry(industry) {
        const industries = (await this.getIndustries()).filter(i => i !== industry);
        await this.saveIndustries(industries);
    },

    /**
     * Remove an industry and clean all dependencies: update accounts that had this industry (set to ''),
     * remove from industryUseCases map, then remove from industries list. Use when admin "removes" an industry.
     * @param {string} industry - Industry name to remove
     * @returns {{ accountsUpdated: number }}
     */
    async removeIndustryWithCleanup(industry) {
        const toRemove = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        if (!toRemove) return { accountsUpdated: 0, activitiesUpdated: 0 };

        const accounts = await this.getAccounts();
        let accountsUpdated = 0;
        accounts.forEach((acc) => {
            if ((acc.industry || '').trim() === toRemove) {
                acc.industry = '';
                accountsUpdated++;
            }
        });
        if (accountsUpdated > 0) await this.saveAccounts(accounts, { skipDraft: true });

        let activitiesUpdated = 0;
        try {
            const activities = await this.getActivities();
            if (Array.isArray(activities)) {
                activities.forEach((a) => {
                    if ((a.industry || '').trim() === toRemove) {
                        a.industry = '';
                        activitiesUpdated++;
                    }
                });
                if (activitiesUpdated > 0) await this.saveActivities(activities);
            }
        } catch (e) {
            console.warn('[DataManager] removeIndustryWithCleanup: could not update activity.industry', e);
        }

        const map = await this.getIndustryUseCases();
        if (Object.prototype.hasOwnProperty.call(map, toRemove)) {
            delete map[toRemove];
            await this.saveIndustryUseCases(map);
        }

        const industries = (await this.getIndustries()).filter(i => i !== toRemove);
        await this.saveIndustries(industries);
        return { accountsUpdated, activitiesUpdated };
    },

    // Industry Use Cases (per-industry)
    async getIndustryUseCases() {
        const key = (typeof INDUSTRY_USE_CASES_KEY !== 'undefined' ? INDUSTRY_USE_CASES_KEY : 'industryUseCases');
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                if (!stored) return {};
                const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
                const base = typeof parsed === 'object' && parsed !== null ? parsed : {};
                const { map: migrated, changed } = migrateCustomerSupportInIndustryUseCaseMap(base);
                if (changed) await this.saveIndustryUseCases(migrated);
                return migrated;
            } catch (e) {
                console.warn('[DataManager] Async getIndustryUseCases failed:', e);
            }
        }
        const stored = localStorage.getItem(key);
        if (!stored) return {};
        try {
            const parsed = JSON.parse(stored);
            const base = typeof parsed === 'object' && parsed !== null ? parsed : {};
            const { map: migrated, changed } = migrateCustomerSupportInIndustryUseCaseMap(base);
            if (changed) await this.saveIndustryUseCases(migrated);
            return migrated;
        } catch (e) {
            return {};
        }
    },

    normalizePrimaryUseCaseLabel(uc) {
        if (uc == null) return uc;
        const s = String(uc).trim();
        if (s === 'Customer Support' || s.toLowerCase() === 'customer support') return 'Support';
        return uc;
    },

    async getUseCasesForIndustry(industry) {
        if (!industry || typeof industry !== 'string') return [];
        const trimmed = industry.trim();
        const map = await this.getIndustryUseCases();
        let list = map[trimmed];
        if (!Array.isArray(list) || list.length === 0) {
            const defaults = DEFAULT_INDUSTRY_USE_CASES[trimmed] || ['Support', 'Commerce', 'Marketing'];
            const sorted = [...defaults].sort((a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' }));
            map[trimmed] = sorted;
            await this.saveIndustryUseCases(map);
            list = sorted;
        }
        return [...list].sort((a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' }));
    },

    async getUniversalUseCases() {
        const key = UNIVERSAL_USE_CASES_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                return stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
            } catch (e) {
                console.warn('[DataManager] Async getUniversalUseCases failed:', e);
            }
        }
        try {
            const storage = typeof this.getLocalStorage === 'function' ? this.getLocalStorage() : (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!storage) return [];
            const data = storage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    async saveUniversalUseCases(list) {
        if (!Array.isArray(list)) return;
        const key = UNIVERSAL_USE_CASES_KEY;
        const payload = JSON.stringify(list);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] Async saveUniversalUseCases failed:', e);
            }
        }
        try {
            const storage = typeof this.getLocalStorage === 'function' ? this.getLocalStorage() : (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage) storage.setItem(key, payload);
        } catch (e) {
            console.error('Failed to save universal use cases:', e);
        }
    },

    async saveIndustryUseCases(map) {
        const key = INDUSTRY_USE_CASES_KEY;
        const payload = JSON.stringify(map || {});
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] Async saveIndustryUseCases failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    async setUseCasesForIndustry(industry, useCases) {
        const trimmed = industry && typeof industry === 'string' ? industry.trim() : '';
        if (!trimmed) return;
        const map = await this.getIndustryUseCases();
        const list = Array.isArray(useCases) ? useCases : [];
        map[trimmed] = [...list].sort((a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' }));
        await this.saveIndustryUseCases(map);
    },

    async addUseCaseToIndustry(industry, useCase) {
        const trimmed = (useCase && typeof useCase === 'string' ? useCase.trim() : '') || '';
        if (!trimmed) return;
        const list = await this.getUseCasesForIndustry(industry);
        if (list.includes(trimmed)) return;
        list.push(trimmed);
        await this.setUseCasesForIndustry(industry, list);
    },

    async removeUseCaseFromIndustry(industry, useCase) {
        const list = (await this.getUseCasesForIndustry(industry)).filter(uc => uc !== useCase);
        await this.setUseCasesForIndustry(industry, list);
    },

    async ensureIndustryUseCasesBaseline() {
        const industries = await this.getIndustries();
        const map = await this.getIndustryUseCases();
        let changed = false;
        industries.forEach(ind => {
            if (!Array.isArray(map[ind]) || !map[ind].length) {
                const defaults = DEFAULT_INDUSTRY_USE_CASES[ind] || ['Support', 'Commerce', 'Marketing'];
                map[ind] = [...defaults];
                changed = true;
            }
        });
        if (changed) await this.saveIndustryUseCases(map);
    },

    // Pending industries (from "Other" in forms)
    async getPendingIndustries() {
        const key = PENDING_INDUSTRIES_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                return stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
            } catch (e) {
                console.warn('[DataManager] Async getPendingIndustries failed:', e);
            }
        }
        const stored = localStorage.getItem(key);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    },

    async savePendingIndustries(list) {
        const key = PENDING_INDUSTRIES_KEY;
        const payload = JSON.stringify(Array.isArray(list) ? list : []);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] Async savePendingIndustries failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    async addPendingIndustry(value, meta = {}) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return null;
        const industries = await this.getIndustries();
        if (industries.includes(trimmed)) return null;
        const pending = await this.getPendingIndustries();
        if (pending.some(p => (p.value || p).toString().trim() === trimmed)) return null;
        const entry = { value: trimmed, suggestedBy: meta.suggestedBy || null, createdAt: meta.createdAt || new Date().toISOString() };
        pending.push(entry);
        await this.savePendingIndustries(pending);
        return entry;
    },

    async acceptPendingIndustry(value) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return false;
        const pending = await this.getPendingIndustries();
        const filtered = pending.filter(p => (p.value || p).toString().trim() !== trimmed);
        if (filtered.length === pending.length) return false;
        await this.savePendingIndustries(filtered);
        await this.addIndustry(trimmed);
        const map = await this.getIndustryUseCases();
        if (!Array.isArray(map[trimmed]) || !map[trimmed].length) {
            map[trimmed] = ['Marketing', 'Commerce', 'Support'];
            await this.saveIndustryUseCases(map);
        }
        return true;
    },

    async rejectPendingIndustry(value) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return false;
        const pending = (await this.getPendingIndustries()).filter(p => (p.value || p).toString().trim() !== trimmed);
        await this.savePendingIndustries(pending);
        return true;
    },

    // Pending use cases (from "Other" in forms, per industry)
    async getPendingUseCases() {
        const key = PENDING_USE_CASES_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                return stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
            } catch (e) {
                console.warn('[DataManager] Async getPendingUseCases failed:', e);
            }
        }
        const stored = localStorage.getItem(key);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    },

    async savePendingUseCases(list) {
        const key = PENDING_USE_CASES_KEY;
        const payload = JSON.stringify(Array.isArray(list) ? list : []);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] Async savePendingUseCases failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    async getSuggestionsAndBugs() {
        const key = SUGGESTIONS_AND_BUGS_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                let list = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
                if (!Array.isArray(list)) list = [];
                // Restore from local if remote is empty (e.g. after migration or key was cleared)
                if (list.length === 0 && typeof localStorage !== 'undefined') {
                    try {
                        const localStored = localStorage.getItem(key);
                        const localList = localStored ? JSON.parse(localStored) : [];
                        if (Array.isArray(localList) && localList.length > 0) {
                            return localList;
                        }
                    } catch (_) { /* ignore */ }
                }
                return list;
            } catch (e) {
                console.warn('[DataManager] Async getSuggestionsAndBugs failed:', e);
            }
        }
        try {
            const stored = localStorage.getItem(key);
            const list = stored ? JSON.parse(stored) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    },

    async saveSuggestionsAndBugs(list) {
        const key = SUGGESTIONS_AND_BUGS_KEY;
        const payload = JSON.stringify(Array.isArray(list) ? list : []);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] Async saveSuggestionsAndBugs failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    async addPendingUseCase(value, industry, meta = {}) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return null;
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        const existing = await this.getUseCasesForIndustry(ind);
        if (existing.includes(trimmed)) return null;
        const pending = await this.getPendingUseCases();
        if (pending.some(p => (p.value || p).toString().trim() === trimmed && (p.industry || '') === ind)) return null;
        const entry = { value: trimmed, industry: ind, suggestedBy: meta.suggestedBy || null, createdAt: meta.createdAt || new Date().toISOString() };
        pending.push(entry);
        await this.savePendingUseCases(pending);
        return entry;
    },

    /**
     * Accept a pending use case: add to canonical list and sync into all projects (activities) for that industry
     * so activities reflect the accepted value (e.g. "Other: Foo" -> "Foo").
     */
    async acceptPendingUseCase(value, industry) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        if (!trimmed) return false;
        const pending = await this.getPendingUseCases();
        const filtered = pending.filter(p => (p.value || p).toString().trim() !== trimmed || (p.industry || '') !== ind);
        if (filtered.length === pending.length) return false;
        await this.savePendingUseCases(filtered);
        await this.addUseCaseToIndustry(ind, trimmed);
        const accounts = await this.getAccounts();
        let projectsUpdated = 0;
        accounts.forEach(account => {
            if ((account.industry || '').trim() !== ind) return;
            (account.projects || []).forEach(project => {
                const useCases = project.useCases || [];
                let changed = false;
                const newUseCases = useCases.map(uc => {
                    const u = (uc && typeof uc === 'string' ? uc.trim() : '') || '';
                    if (u === trimmed || u === `Other: ${trimmed}`) {
                        changed = true;
                        return trimmed;
                    }
                    return uc;
                });
                if (changed) {
                    project.useCases = newUseCases;
                    projectsUpdated++;
                }
            });
        });
        if (projectsUpdated > 0) await this.saveAccounts(accounts, { skipDraft: true });
        return true;
    },

    async rejectPendingUseCase(value, industry) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        const pending = (await this.getPendingUseCases()).filter(p => (p.value || p).toString().trim() !== trimmed || (p.industry || '') !== ind);
        await this.savePendingUseCases(pending);
        return true;
    },

    /**
     * Merge a pending industry into an existing approved industry.
     * Updates all accounts that have the pending value as industry to use the existing industry.
     * Reject does NOT change existing data; merge does.
     * @param {string} pendingValue - The pending industry to merge away (e.g. "Fintech")
     * @param {string} existingIndustry - Approved industry to merge into (e.g. "BFSI")
     * @returns {{ success: boolean, accountsUpdated?: number, message?: string }}
     */
    async mergePendingIndustryInto(pendingValue, existingIndustry) {
        const fromVal = (pendingValue && typeof pendingValue === 'string' ? pendingValue.trim() : '') || '';
        const toVal = (existingIndustry && typeof existingIndustry === 'string' ? existingIndustry.trim() : '') || '';
        if (!fromVal || !toVal) return { success: false, message: 'Both values are required.' };
        const industries = await this.getIndustries();
        if (!industries.includes(toVal)) return { success: false, message: 'Target industry is not in the approved list.' };
        const pending = await this.getPendingIndustries();
        if (!pending.some(p => (p.value || p).toString().trim() === fromVal)) return { success: false, message: 'Pending industry not found.' };

        const accounts = await this.getAccounts();
        let count = 0;
        accounts.forEach(acc => {
            const accInd = (acc.industry && typeof acc.industry === 'string' ? acc.industry.trim() : '') || '';
            if (accInd === fromVal) {
                acc.industry = toVal;
                count++;
            }
        });
        if (count > 0) await this.saveAccounts(accounts, { skipDraft: true });

        let activitiesUpdated = 0;
        try {
            const activities = await this.getActivities();
            if (Array.isArray(activities)) {
                activities.forEach((a) => {
                    if ((a.industry || '').trim() === fromVal) {
                        a.industry = toVal;
                        activitiesUpdated++;
                    }
                });
                if (activitiesUpdated > 0) await this.saveActivities(activities);
            }
        } catch (e) {
            console.warn('[DataManager] mergePendingIndustryInto: could not update activity.industry', e);
        }
        await this.rejectPendingIndustry(fromVal);
        return { success: true, accountsUpdated: count, activitiesUpdated };
    },

    /**
     * Merge a pending use case into an existing approved use case for the same industry.
     * Updates all projects that have the pending value in useCases to use the existing use case.
     * @param {string} pendingValue - The pending use case to merge away
     * @param {string} pendingIndustry - Industry of the pending use case
     * @param {string} existingUseCase - Approved use case to merge into
     * @returns {{ success: boolean, projectsUpdated?: number, message?: string }}
     */
    async mergePendingUseCaseInto(pendingValue, pendingIndustry, existingUseCase) {
        const fromVal = (pendingValue && typeof pendingValue === 'string' ? pendingValue.trim() : '') || '';
        const ind = (pendingIndustry && typeof pendingIndustry === 'string' ? pendingIndustry.trim() : '') || '';
        const toVal = (existingUseCase && typeof existingUseCase === 'string' ? existingUseCase.trim() : '') || '';
        if (!fromVal || !toVal) return { success: false, message: 'Both values are required.' };
        const existingList = await this.getUseCasesForIndustry(ind);
        if (!existingList.includes(toVal)) return { success: false, message: 'Target use case is not in the list for this industry.' };
        const pending = await this.getPendingUseCases();
        if (!pending.some(p => (p.value || p).toString().trim() === fromVal && (p.industry || '') === ind)) return { success: false, message: 'Pending use case not found.' };

        const accounts = await this.getAccounts();
        let projectsUpdated = 0;
        accounts.forEach(account => {
            (account.projects || []).forEach(project => {
                const useCases = project.useCases || [];
                let changed = false;
                const newUseCases = useCases.map(uc => {
                    const u = (uc && typeof uc === 'string' ? uc.trim() : '') || '';
                    if (u === fromVal || u === `Other: ${fromVal}`) {
                        changed = true;
                        return toVal;
                    }
                    return uc;
                });
                if (changed) {
                    project.useCases = newUseCases;
                    projectsUpdated++;
                }
            });
        });
        if (projectsUpdated > 0) await this.saveAccounts(accounts, { skipDraft: true });
        await this.rejectPendingUseCase(fromVal, ind);
        return { success: true, projectsUpdated };
    },

    /** Rename an industry; updates industries list, industryUseCases map, and all account.industry. */
    async renameIndustry(oldName, newName) {
        const fromVal = (oldName && typeof oldName === 'string' ? oldName.trim() : '') || '';
        const toVal = (newName && typeof newName === 'string' ? newName.trim() : '') || '';
        if (!fromVal || !toVal || fromVal === toVal) return { success: false, message: 'Different names required.' };
        const industries = await this.getIndustries();
        if (!industries.includes(fromVal)) return { success: false, message: 'Industry not found.' };
        if (industries.includes(toVal)) return { success: false, message: 'Target name already exists.' };
        const map = await this.getIndustryUseCases();
        const newIndustries = industries.map((i) => (i === fromVal ? toVal : i)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        await this.saveIndustries(newIndustries);
        if (map[fromVal]) {
            map[toVal] = map[fromVal];
            delete map[fromVal];
            await this.saveIndustryUseCases(map);
        }
        const accounts = await this.getAccounts();
        let count = 0;
        accounts.forEach((acc) => {
            if (acc.industry === fromVal) {
                acc.industry = toVal;
                count++;
            }
        });
        if (count > 0) await this.saveAccounts(accounts, { skipDraft: true });

        let activitiesUpdated = 0;
        try {
            const activities = await this.getActivities();
            if (Array.isArray(activities)) {
                activities.forEach((a) => {
                    if ((a.industry || '').trim() === fromVal) {
                        a.industry = toVal;
                        activitiesUpdated++;
                    }
                });
                if (activitiesUpdated > 0) await this.saveActivities(activities);
            }
        } catch (e) {
            console.warn('[DataManager] renameIndustry: could not update activity.industry', e);
        }
        return { success: true, accountsUpdated: count, activitiesUpdated: activitiesUpdated || 0 };
    },

    /** Rename a use case within an industry; updates list and all project.useCases for that industry. */
    async renameUseCaseInIndustry(industry, oldName, newName) {
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        const fromVal = (oldName && typeof oldName === 'string' ? oldName.trim() : '') || '';
        const toVal = (newName && typeof newName === 'string' ? newName.trim() : '') || '';
        if (!ind || !fromVal || !toVal || fromVal === toVal) return { success: false, message: 'Industry and different use case names required.' };
        const list = await this.getUseCasesForIndustry(ind);
        if (!list.includes(fromVal)) return { success: false, message: 'Use case not found.' };
        if (list.includes(toVal)) return { success: false, message: 'Target use case name already exists.' };
        const newList = list.map((uc) => (uc === fromVal ? toVal : uc)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        await this.setUseCasesForIndustry(ind, newList);
        const accounts = await this.getAccounts();
        let projectsUpdated = 0;
        accounts.forEach((account) => {
            (account.projects || []).forEach((project) => {
                const useCases = project.useCases || [];
                const changed = useCases.some((uc) => (uc && uc.trim()) === fromVal || uc === `Other: ${fromVal}`);
                if (changed) {
                    project.useCases = useCases.map((uc) => {
                        const u = (uc && typeof uc === 'string' ? uc.trim() : '') || '';
                        if (u === fromVal || uc === `Other: ${fromVal}`) return toVal;
                        return uc;
                    });
                    projectsUpdated++;
                }
            });
        });
        if (projectsUpdated > 0) await this.saveAccounts(accounts, { skipDraft: true });
        return { success: true, projectsUpdated };
    },

    // Region Management
    async getRegions() {
        if (this.cache.regions) return this.cache.regions;
        const key = 'regions';
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                const regions = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
                this.cache.regions = regions;
                return regions;
            } catch (err) {
                console.warn('[DataManager] Async getRegions failed:', err);
            }
        }
        const stored = localStorage.getItem(key);
        const regions = stored ? JSON.parse(stored) : [];
        this.cache.regions = regions;
        return regions;
    },

    isDefaultRegion(region) {
        if (!region) return false;
        return DEFAULT_REGION_SET.has(region.trim());
    },

    async saveRegions(regions) {
        const key = 'regions';
        const payload = JSON.stringify(regions);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                this.cache.regions = regions;
                return;
            } catch (err) {
                console.warn('[DataManager] Async saveRegions failed:', err);
            }
        }
        localStorage.setItem(key, payload);
        this.cache.regions = regions;
    },

    async addRegion(region) {
        const regions = await this.getRegions();
        if (!regions.includes(region)) {
            regions.push(region);
            await this.saveRegions(regions);
        }
    },

    async deleteRegion(region) {
        const regions = (await this.getRegions()).filter(r => r !== region);
        await this.saveRegions(regions);
    },

    async getRegionUsage(region) {
        if (!region) {
            return { salesReps: 0, accounts: 0, activities: 0, users: 0 };
        }
        const normalized = region.trim().toLowerCase();
        if (!normalized) {
            return { salesReps: 0, accounts: 0, activities: 0, users: 0 };
        }

        const [accounts, activities, users] = await Promise.all([this.getAccounts(), this.getAllActivities(), this.getUsers()]);
        const salesReps = (await this.getGlobalSalesReps()).filter(rep => (rep.region || '').trim().toLowerCase() === normalized).length;
        const accountsCount = accounts.filter(account => (account.salesRepRegion || '').trim().toLowerCase() === normalized).length;
        const activitiesCount = activities.filter(activity => (activity.salesRepRegion || '').trim().toLowerCase() === normalized).length;
        const usersCount = users.filter(user => (user.defaultRegion || '').trim().toLowerCase() === normalized).length;
        return { salesReps, accounts: accountsCount, activities: activitiesCount, users: usersCount };
    },

    async removeRegion(region) {
        const trimmed = region && typeof region === 'string' ? region.trim() : '';
        if (!trimmed) {
            return { success: false, message: 'Select a region to remove.' };
        }

        if (this.isDefaultRegion(trimmed)) {
            return { success: false, message: 'Default regions cannot be removed.' };
        }

        const regions = await this.getRegions();
        if (!regions.includes(trimmed)) {
            return { success: false, message: `Region "${trimmed}" was not found.` };
        }

        const usage = await this.getRegionUsage(trimmed);
        if (usage.salesReps || usage.accounts || usage.activities || usage.users) {
            return {
                success: false,
                message: `Region "${trimmed}" is still in use.`,
                usage
            };
        }

        await this.deleteRegion(trimmed);
        await this.ensureRegionBaseline();
        this.recordAudit('region.delete', 'region', trimmed, usage);

        return { success: true, usage };
    },

    async pruneUnusedRegions() {
        const regions = [...await this.getRegions()];
        const removed = [];

        for (const region of regions) {
            if (this.isDefaultRegion(region)) {
                continue;
            }
            const usage = await this.getRegionUsage(region);
            if (usage.salesReps || usage.accounts || usage.activities || usage.users) {
                continue;
            }
            await this.deleteRegion(region);
            this.recordAudit('region.delete', 'region', region, usage);
            removed.push(region);
        }

        if (removed.length) {
            await this.ensureRegionBaseline();
        }

        return { removed };
    },

    // Global Sales Reps Management (Enhanced with email and region)
    // Email is PRIMARY KEY
    async getGlobalSalesReps() {
        if (this.cache.globalSalesReps) {
            return this.cache.globalSalesReps;
        }
        const key = 'globalSalesReps';
        let reps = [];
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                reps = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
            } catch (err) {
                console.warn('[DataManager] Async getGlobalSalesReps failed:', err);
            }
        }
        if (!reps.length) {
            const stored = localStorage.getItem(key);
            reps = stored ? JSON.parse(stored) : [];
        }

        const normalized = reps.map(rep => {
            const fxValue = Number(rep.fxToInr);
            const regionTrimmed = (rep.region != null && String(rep.region).trim()) ? String(rep.region).trim() : '';
            return {
                ...rep,
                currency: rep.currency || 'INR',
                fxToInr: Number.isFinite(fxValue) && fxValue > 0 ? fxValue : null,
                region: regionTrimmed
            };
        });
        this.cache.globalSalesReps = normalized;
        return normalized;
    },

    async getGlobalSalesRepByName(name) {
        if (!name) return null;
        const targetName = name.toLowerCase();
        const reps = await this.getGlobalSalesReps();
        return reps.find(rep => rep.name && rep.name.toLowerCase() === targetName) || null;
    },

    async getGlobalSalesRepByEmail(email) {
        if (!email) return null;
        const targetEmail = email.toLowerCase();
        const reps = await this.getGlobalSalesReps();
        return reps.find(rep => rep.email && rep.email.toLowerCase() === targetEmail) || null;
    },

    async getSalesRepsByRegion(region = 'all', options = {}) {
        const { includeInactive = false } = options || {};
        const normalizedRegion = region ? region.trim() : '';
        const allReps = await this.getGlobalSalesReps();
        const reps = allReps.filter(rep => includeInactive || rep.isActive !== false);
        if (!normalizedRegion || normalizedRegion.toLowerCase() === 'all') {
            return [...reps].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return reps
            .filter(rep => (rep.region || '') === normalizedRegion)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },

    async saveGlobalSalesReps(salesReps) {
        const key = 'globalSalesReps';
        const payload = JSON.stringify(salesReps);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                this.cache.globalSalesReps = salesReps;
                this.cache.allActivities = null;
                return;
            } catch (err) {
                console.warn('[DataManager] Async saveGlobalSalesReps failed:', err);
            }
        }
        localStorage.setItem(key, payload);
        this.cache.globalSalesReps = salesReps;
        this.cache.allActivities = null;
    },

    async addGlobalSalesRep(salesRep) {
        const salesReps = await this.getGlobalSalesReps();
        // Check if sales rep with same email already exists (email is primary key)
        const existing = salesReps.find(r => r.email && salesRep.email && r.email.toLowerCase() === salesRep.email.toLowerCase());
        if (existing) {
            // Return error object with existing user details
            return {
                error: true,
                message: `Sales rep with email "${salesRep.email}" already exists`,
                existing: {
                    name: existing.name,
                    email: existing.email,
                    region: existing.region
                }
            };
        }

        salesRep.currency = salesRep.currency || 'INR';
        const fxValue = Number(salesRep.fxToInr);
        salesRep.fxToInr = Number.isFinite(fxValue) && fxValue > 0 ? fxValue : null;
        salesRep.id = this.generateId();
        salesRep.createdAt = new Date().toISOString();
        salesRep.isActive = salesRep.isActive !== undefined ? salesRep.isActive : true;
        const regionTrimmed = (salesRep.region != null && String(salesRep.region).trim()) ? String(salesRep.region).trim() : '';
        const currentRegions = await this.getRegions();
        salesRep.region = regionTrimmed || (currentRegions[0] || '');
        salesReps.push(salesRep);
        await this.saveGlobalSalesReps(salesReps);
        this.recordAudit('salesRep.create', 'salesRep', salesRep.id, {
            name: salesRep.name,
            email: salesRep.email,
            region: salesRep.region
        });
        await this.backfillAccountSalesRepRegions();
        await this.backfillActivitySalesRepRegions();
        return salesRep;
    },

    async updateGlobalSalesRep(salesRepId, updates) {
        const salesReps = await this.getGlobalSalesReps();
        const index = salesReps.findIndex(r => r.id === salesRepId);
        if (index !== -1) {
            const current = salesReps[index];
            const merged = {
                ...current,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            merged.currency = merged.currency || 'INR';
            const fxValue = Number(merged.fxToInr);
            merged.fxToInr = Number.isFinite(fxValue) && fxValue > 0 ? fxValue : null;
            const regionTrimmed = (merged.region != null && String(merged.region).trim()) ? String(merged.region).trim() : '';
            const currentRegions = await this.getRegions();
            merged.region = regionTrimmed || (current.region || currentRegions[0] || '');
            salesReps[index] = merged;
            await this.saveGlobalSalesReps(salesReps);
            this.recordAudit('salesRep.update', 'salesRep', salesRepId, updates);
            await this.backfillAccountSalesRepRegions();
            await this.backfillActivitySalesRepRegions();
            return merged;
        }
        return null;
    },

    async deleteGlobalSalesRep(salesRepId) {
        const salesReps = (await this.getGlobalSalesReps()).filter(r => r.id !== salesRepId);
        await this.saveGlobalSalesReps(salesReps);
        this.recordAudit('salesRep.delete', 'salesRep', salesRepId);
    },


    // Account Management
    async getAccounts() {
        if (this.cache.accounts) {
            return this.cache.accounts;
        }
        // Try async first if available, fallback to sync for initial load
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync('accounts');
                const accounts = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
                const list = Array.isArray(accounts) ? accounts : [];
                this.cache.accounts = list;
                return list;
            } catch (err) {
                console.warn('[DataManager] Async getAccounts failed:', err);
                if (isEntityKey('accounts')) return [];
            }
        }
        if (isEntityKey('accounts')) return [];
        const stored = localStorage.getItem('accounts');
        const accounts = stored ? JSON.parse(stored) : [];
        this.cache.accounts = accounts;
        return accounts;
    },

    async saveAccounts(accounts, options) {
        const payload = JSON.stringify(accounts);
        const skipDraft = options && options.skipDraft === true;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__) {
            const useDirect = skipDraft && window.__REMOTE_STORAGE_ASYNC__.setItemAsync;
            const useDraft = !skipDraft && window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft;
            if (useDirect) {
                try {
                    await window.__REMOTE_STORAGE_ASYNC__.setItemAsync('accounts', payload);
                    this.invalidateCache('accounts', 'allActivities');
                    return;
                } catch (err) {
                    console.warn('[DataManager] saveAccounts (direct) failed:', err);
                    throw err;
                }
            }
            if (useDraft) {
                try {
                    await window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft('accounts', payload, { type: 'external' });
                    this.invalidateCache('accounts', 'allActivities');
                    return;
                } catch (err) {
                    console.warn('[DataManager] Async saveAccounts failed; preserving draft and aborting sync overwrite:', err);
                    throw err;
                }
            }
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            throw new Error('Remote entity write path unavailable for accounts');
        }
        localStorage.setItem('accounts', payload);
        this.invalidateCache('accounts', 'allActivities');
    },

    async getAccountById(id) {
        const accounts = await this.getAccounts();
        return accounts.find(a => a.id === id);
    },

    async addAccount(account) {
        const accounts = await this.getAccounts();
        account.id = this.generateId();
        const resolvedRep = await this.resolveSalesRepMetadata({
            name: account.salesRep || '',
            email: account.salesRepEmail || '',
            fallbackRegion: account.salesRepRegion
        });
        account.salesRep = resolvedRep.name;
        account.salesRepEmail = resolvedRep.email;
        account.salesRepRegion = resolvedRep.region;
        account.projects = account.projects || [];
        account.createdAt = new Date().toISOString();
        accounts.push(account);
        await this.saveAccounts(accounts);
        this.recordAudit('account.create', 'account', account.id, {
            name: account.name,
            industry: account.industry || ''
        });
        return account;
    },

    async updateAccount(accountId, updates) {
        const accounts = await this.getAccounts();
        const index = accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            const merged = { ...accounts[index], ...updates };
            const resolvedRep = await this.resolveSalesRepMetadata({
                name: merged.salesRep || '',
                email: merged.salesRepEmail || '',
                fallbackRegion: merged.salesRepRegion
            });
            merged.salesRep = resolvedRep.name;
            merged.salesRepEmail = resolvedRep.email;
            merged.salesRepRegion = resolvedRep.region;
            merged.updatedAt = new Date().toISOString();
            accounts[index] = merged;
            await this.saveAccounts(accounts);
            this.recordAudit('account.update', 'account', accountId, updates);
            return accounts[index];
        }
        return null;
    },

    async deleteAccount(accountId) {
        const activities = await this.getActivities();
        const toRemove = activities.filter(a => a.accountId === accountId);

        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__ && typeof this.removeActivityViaServer === 'function') {
            for (const a of toRemove) {
                if (a && a.id) await this.removeActivityViaServer(a.id);
            }
        } else {
            const filteredActivities = activities.filter(a => a.accountId !== accountId);
            await this.saveActivities(filteredActivities);
        }

        const accounts = (await this.getAccounts()).filter(a => a.id !== accountId);
        await this.saveAccounts(accounts);
        this.recordAudit('account.delete', 'account', accountId, {
            removedActivities: toRemove.length
        });
    },

    // Project Management
    async addProject(accountId, project) {
        const accounts = await this.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            if (!account.projects) account.projects = [];
            project.id = String(this.generateId());
            project.activities = project.activities || [];
            project.status = project.status || 'active';
            project.createdAt = new Date().toISOString();
            account.projects.push(project);
            await this.saveAccounts(accounts);
            this.recordAudit('project.create', 'project', project.id, {
                accountId,
                name: project.name,
                status: project.status
            });
            if (project.name && account.name && String(project.name).trim() === String(account.name).trim() && typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Project name should describe the use case, not repeat the account name.', 'warning');
            }
            return project;
        }
        return null;
    },

    async updateProject(accountId, projectId, updates) {
        const accounts = await this.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        if (account && account.projects) {
            const project = account.projects.find(p => String(p.id) === String(projectId));
            if (project) {
                Object.assign(project, updates, { updatedAt: new Date().toISOString() });
                await this.saveAccounts(accounts);
                this.recordAudit('project.update', 'project', projectId, {
                    accountId,
                    ...updates
                });
                const projectName = project.name || updates.name;
                if (projectName && account.name && String(projectName).trim() === String(account.name).trim() && typeof UI !== 'undefined' && UI.showNotification) {
                    UI.showNotification('Project name should describe the use case, not repeat the account name.', 'warning');
                }
                return project;
            }
        }
        return null;
    },

    // Activity Management
    async getActivities() {
        // Use cache when set (e.g. right after addActivity) so a stale refetch does not hide the new activity
        if (this.cache.activities) {
            return this.cache.activities;
        }
        // Try async first if available, fallback to sync for initial load
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync('activities');
                const activities = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
                this.cache.activities = activities;
                return activities;
            } catch (err) {
                console.warn('[DataManager] Async getActivities failed:', err);
                if (isEntityKey('activities')) return [];
            }
        }
        if (isEntityKey('activities')) return [];
        const stored = localStorage.getItem('activities');
        const activities = stored ? JSON.parse(stored) : [];
        this.cache.activities = activities;
        return activities;
    },

    async getActivitiesByProject(projectId) {
        if (!projectId) return [];
        const activities = await this.getActivities();
        return activities.filter(a => a.projectId === projectId);
    },

    _mergeActivitiesByIdNewerWins(serverArr, localArr) {
        if (!Array.isArray(serverArr)) serverArr = [];
        if (!Array.isArray(localArr)) localArr = [];
        const byId = new Map();
        const ts = (a) => (a && (a.updatedAt || a.createdAt)) ? String(a.updatedAt || a.createdAt) : '';
        const keyOf = (a) => (a && a.id != null && String(a.id).trim() ? String(a.id) : null);
        serverArr.forEach((s) => {
            const k = keyOf(s);
            if (k) byId.set(k, s);
        });
        localArr.forEach((l) => {
            const k = keyOf(l);
            if (!k) return;
            const existing = byId.get(k);
            if (!existing) { byId.set(k, l); return; }
            if (ts(l) > ts(existing)) byId.set(k, l);
        });
        return Array.from(byId.values());
    },
    _dedupeActivitiesBySignature(arr) {
        if (!Array.isArray(arr) || !arr.length) return arr;
        const seen = new Map();
        arr.forEach((a) => {
            const dateDay = (a.date || a.createdAt || '').toString().slice(0, 10);
            const sig = (a.accountId || '') + '|' + (a.projectId || '') + '|' + dateDay + '|' + (a.type || '');
            seen.set(sig, a);
        });
        return Array.from(seen.values());
    },

    /**
     * External `activities` bucket: server validates the full array on PUT. Normalize legacy rows so one bad
     * activity does not block saves (same idea as normalizeInternalActivitiesForRemoteSave).
     */
    normalizeActivitiesForRemoteSave(activities) {
        if (!Array.isArray(activities)) return [];
        const tMin = new Date('2020-01-01').getTime();
        const tMax = new Date('2050-12-31').getTime();
        const inRange = (val) => {
            if (val == null || val === '') return false;
            const s = typeof val === 'string' ? val.trim() : val;
            const toParse = typeof s === 'string' && /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s;
            const d = new Date(toParse);
            if (!Number.isFinite(d.getTime())) return false;
            const t = d.getTime();
            return t >= tMin && t <= tMax;
        };
        return activities
            .filter((item) => item != null && typeof item === 'object')
            .map((item) => {
                const out = { ...item };
                if (out.id != null && out.id !== '' && typeof out.id !== 'string') {
                    out.id = String(out.id);
                }
                if (!out.id || !String(out.id).trim()) {
                    out.id = this.generateId();
                }
                let dateVal = out.activityDate ?? out.date ?? out.createdAt ?? out.monthOfActivity;
                if (!inRange(dateVal)) {
                    for (const cand of [out.updatedAt, out.createdAt, out.date, out.monthOfActivity, new Date().toISOString()]) {
                        if (inRange(cand)) {
                            const iso = typeof cand === 'string' ? cand : new Date(cand).toISOString();
                            if (!out.date) {
                                const mo = typeof out.monthOfActivity === 'string' && /^\d{4}-\d{2}$/.test(out.monthOfActivity.trim())
                                    ? out.monthOfActivity.trim()
                                    : null;
                                out.date = mo ? `${mo}-01` : iso.slice(0, 10);
                            }
                            break;
                        }
                    }
                }
                dateVal = out.activityDate ?? out.date ?? out.createdAt ?? out.monthOfActivity;
                if (!inRange(dateVal)) {
                    const today = new Date().toISOString().slice(0, 10);
                    out.date = today;
                    if (!out.createdAt) out.createdAt = new Date().toISOString();
                }
                const tv = out.activityType ?? out.type;
                if (tv != null && typeof tv === 'object') {
                    if (Array.isArray(tv)) {
                        const joined = tv.map((x) => String(x)).filter(Boolean).join(', ') || 'customerCall';
                        out.type = joined;
                        if (out.activityType != null && Array.isArray(out.activityType)) out.activityType = joined;
                    } else {
                        out.type = 'customerCall';
                        if (out.activityType && typeof out.activityType === 'object') out.activityType = out.type;
                    }
                } else if (tv != null && typeof tv !== 'string') {
                    const s = String(tv);
                    out.type = s;
                    if (out.activityType != null && typeof out.activityType !== 'string') out.activityType = s;
                }
                if (out.durationHours !== undefined && out.durationHours !== null && out.durationHours !== '') {
                    const n = typeof out.durationHours === 'number' ? out.durationHours : Number(out.durationHours);
                    if (!Number.isFinite(n) || n < 0 || n > 24) delete out.durationHours;
                    else out.durationHours = n;
                }
                if (out.durationDays !== undefined && out.durationDays !== null && out.durationDays !== '') {
                    const n = typeof out.durationDays === 'number' ? out.durationDays : Number(out.durationDays);
                    if (!Number.isFinite(n) || n < 0 || n > 31) delete out.durationDays;
                    else out.durationDays = n;
                }
                if (out.accountId !== undefined && out.accountId !== null && typeof out.accountId !== 'string') {
                    out.accountId = String(out.accountId);
                }
                if (out.projectId !== undefined && out.projectId !== null && typeof out.projectId !== 'string') {
                    out.projectId = String(out.projectId);
                }
                return out;
            });
    },

    async saveActivities(activities) {
        const rawLen = Array.isArray(activities) ? activities.length : 0;
        const normalized = this.normalizeActivitiesForRemoteSave(activities);
        if (normalized.length < rawLen) {
            console.warn(
                '[DataManager] saveActivities: removed',
                rawLen - normalized.length,
                'invalid entries before save'
            );
        }
        const count = normalized.length;
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('saveActivities called', { count });
        }
        const payload = JSON.stringify(normalized);
        // Use async with draft for conflict handling
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft('activities', payload, { type: 'external' });
                this.invalidateCache('activities', 'allActivities');
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('saveActivities success', { count });
                }
                return;
            } catch (err) {
                if (err && err.status === 409 && err.value != null) {
                    if (typeof window.__activitySaveTracePush === 'function') {
                        let serverCount = null;
                        try {
                            const v = typeof err.value === 'string' ? JSON.parse(err.value) : err.value;
                            if (Array.isArray(v)) serverCount = v.length;
                        } catch (_) { }
                        window.__activitySaveTracePush('409 conflict, merging and retrying', { serverCount });
                    }
                    try {
                        const serverArr = typeof err.value === 'string' ? JSON.parse(err.value) : err.value;
                        if (Array.isArray(serverArr)) {
                            const merged = this._mergeActivitiesByIdNewerWins(serverArr, normalized);
                            const deduped = this._dedupeActivitiesBySignature(merged);
                            this.invalidateCache('activities', 'allActivities');
                            await this.saveActivities(deduped);
                            if (typeof window.__activitySaveTracePush === 'function') {
                                window.__activitySaveTracePush('merge retry success', { mergedCount: deduped.length });
                            }
                            return;
                        }
                    } catch (mergeErr) {
                        if (typeof window.__activitySaveTracePush === 'function') {
                            window.__activitySaveTracePush('merge retry failed', { message: mergeErr && mergeErr.message });
                        }
                        console.warn('[DataManager] Activities 409 merge retry failed', mergeErr);
                    }
                }
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('saveActivities failed', { status: err && err.status, message: err && err.message });
                    window.__activitySaveTracePersistFailure('saveActivities');
                }
                console.warn('[DataManager] Async saveActivities failed; preserving draft and aborting sync overwrite:', err);
                throw err;
            }
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            throw new Error('Remote entity write path unavailable for activities');
        }
        localStorage.setItem('activities', payload);
        this.invalidateCache('activities', 'allActivities');
    },

    /**
     * Append one activity via server API (no bulk PUT). Saves to draft first, then POST /activities/append.
     * On success: remove draft, invalidate cache. On failure: draft stays for Edit & Submit.
     * Use this when remote storage is enabled so we never send the full list.
     */
    async appendActivity(activity) {
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('appendActivity start', { type: activity && activity.type, date: activity && (activity.date || activity.createdAt) });
        }
        const timestamp = new Date().toISOString();
        const source = activity && (activity.source === 'migration') ? 'migration' : 'manual';
        const normalized = {
            ...activity,
            id: this.generateId(),
            createdAt: timestamp,
            updatedAt: timestamp,
            source: source,
            isMigrated: source === 'migration'
        };
        const referenceDate = normalized.date || normalized.createdAt;
        if (referenceDate) {
            const parsed = new Date(referenceDate);
            if (!Number.isNaN(parsed.getTime())) normalized.date = parsed.toISOString();
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) this.cache.activities = null;
        var draftId = null;
        if (typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
            var d = window.Drafts.addDraft({
                type: 'external',
                storageKey: 'activities',
                payload: { _singleActivity: true, activity: normalized },
                errorMessage: 'Submitting…'
            });
            if (d && d.id) draftId = d.id;
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('appendActivity draft added', { draftId: draftId });
            }
        }
        var apiBase = (typeof window !== 'undefined' && window.__REMOTE_STORAGE_BASE__) || '/api/storage';
        var url = apiBase + '/activities/append';
        var bodyStr = JSON.stringify({ activity: normalized });
        var lastErr = null;
        var maxAttempts = 3;
        var retryDelays = [0, 1000, 2000];
        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0 && retryDelays[attempt] > 0) {
                if (draftId && window.Drafts && typeof window.Drafts.updateDraft === 'function') {
                    window.Drafts.updateDraft(draftId, { errorMessage: 'Retrying in ' + (retryDelays[attempt] / 1000) + 's…' });
                }
                await new Promise(function (r) { setTimeout(r, retryDelays[attempt]); });
            }
            try {
                var res = await fetch(url, {
                    method: 'POST',
                    headers: pamsStorageAppendHeaders(),
                    credentials: 'include',
                    body: bodyStr
                });
                var data = await res.json().catch(function () { return {}; });
                if (res.ok && data && data.ok) {
                    if (draftId && window.Drafts && typeof window.Drafts.removeDraft === 'function') {
                        window.Drafts.removeDraft(draftId);
                    }
                    this.invalidateCache('activities', 'allActivities');
                    if (typeof window.__activitySaveTracePush === 'function') {
                        window.__activitySaveTracePush('appendActivity success', { id: normalized.id, attempt: attempt + 1, duplicate: !!data.duplicate });
                    }
                    try { window.localStorage.removeItem('__activitySaveTraceLastFailure'); } catch (e) {}
                    this.cache.activities = null;
                    this.recordAudit('activity.create', 'activity', normalized.id, {
                        accountId: normalized.accountId || null,
                        projectId: normalized.projectId || null,
                        type: normalized.type || '',
                        category: normalized.isInternal ? 'internal' : 'external',
                        fullSnapshot: normalized
                    });
                    return normalized;
                }
                var errMsg = (data && data.message) || ('Request failed: ' + res.status);
                lastErr = new Error(errMsg);
                if (res.status >= 400 && res.status < 500 && res.status !== 408) {
                    break;
                }
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('appendActivity attempt failed', { attempt: attempt + 1, status: res.status, message: errMsg });
                }
            } catch (err) {
                lastErr = err;
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('appendActivity attempt threw', { attempt: attempt + 1, message: err && err.message });
                }
            }
        }
        var msg = lastErr && (lastErr.message || lastErr.status);
        if (draftId && window.Drafts && typeof window.Drafts.updateDraft === 'function') {
            window.Drafts.updateDraft(draftId, { errorMessage: msg || 'Could not save. Click Submit again or Edit & Save.' });
        } else if (!draftId && typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
            window.Drafts.addDraft({
                type: 'external',
                storageKey: 'activities',
                payload: { _singleActivity: true, activity: normalized },
                errorMessage: msg || 'Could not save. Click Submit again or Edit & Save.'
            });
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('appendActivity failed: draft added for retry', { id: normalized.id });
            }
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('appendActivity failed after retries', { message: msg });
        }
        window.__activitySaveTracePersistFailure && window.__activitySaveTracePersistFailure('appendActivity');
        throw lastErr || new Error('Append failed');
    },

    /**
     * Append one internal activity via POST /internalActivities/append (no full-list PUT).
     * Caller must set id, createdAt, updatedAt. Draft + retries mirror appendActivity.
     */
    async appendInternalActivity(activity) {
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('appendInternalActivity start', {
                type: activity && activity.type,
                date: activity && (activity.date || activity.createdAt),
                id: activity && activity.id
            });
        }
        const normalized = { ...activity, isInternal: true };
        const referenceDate = normalized.date || normalized.createdAt;
        if (referenceDate) {
            const parsed = new Date(referenceDate);
            if (!Number.isNaN(parsed.getTime())) normalized.date = parsed.toISOString();
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) this.cache.internalActivities = null;
        var draftId = null;
        if (typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
            var dInt = window.Drafts.addDraft({
                type: 'internal',
                storageKey: 'internalActivities',
                payload: { _singleActivity: true, activity: normalized },
                errorMessage: 'Submitting…'
            });
            if (dInt && dInt.id) draftId = dInt.id;
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('appendInternalActivity draft added', { draftId: draftId });
            }
        }
        var apiBaseInt = (typeof window !== 'undefined' && window.__REMOTE_STORAGE_BASE__) || '/api/storage';
        var urlInt = apiBaseInt + '/internalActivities/append';
        var bodyStrInt = JSON.stringify({ activity: normalized });
        var lastErrInt = null;
        var maxAttemptsInt = 3;
        var retryDelaysInt = [0, 1000, 2000];
        for (var attemptInt = 0; attemptInt < maxAttemptsInt; attemptInt++) {
            if (attemptInt > 0 && retryDelaysInt[attemptInt] > 0) {
                if (draftId && window.Drafts && typeof window.Drafts.updateDraft === 'function') {
                    window.Drafts.updateDraft(draftId, { errorMessage: 'Retrying in ' + (retryDelaysInt[attemptInt] / 1000) + 's…' });
                }
                await new Promise(function (r) { setTimeout(r, retryDelaysInt[attemptInt]); });
            }
            try {
                var resInt = await fetch(urlInt, {
                    method: 'POST',
                    headers: pamsStorageAppendHeaders(),
                    credentials: 'include',
                    body: bodyStrInt
                });
                var dataInt = await resInt.json().catch(function () { return {}; });
                if (resInt.ok && dataInt && dataInt.ok) {
                    if (draftId && window.Drafts && typeof window.Drafts.removeDraft === 'function') {
                        window.Drafts.removeDraft(draftId);
                    }
                    this.invalidateCache('internalActivities', 'allActivities');
                    if (typeof window.__activitySaveTracePush === 'function') {
                        window.__activitySaveTracePush('appendInternalActivity success', { id: normalized.id, attempt: attemptInt + 1 });
                    }
                    try { window.localStorage.removeItem('__activitySaveTraceLastFailure'); } catch (e1) {}
                    this.cache.internalActivities = null;
                    this.recordAudit('activity.create', 'internalActivity', normalized.id, {
                        type: normalized.type || '',
                        name: normalized.activityName || '',
                        fullSnapshot: normalized
                    });
                    return normalized;
                }
                var errMsgInt = (dataInt && dataInt.message) || ('Request failed: ' + resInt.status);
                lastErrInt = new Error(errMsgInt);
                if (resInt.status >= 400 && resInt.status < 500 && resInt.status !== 408) {
                    break;
                }
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('appendInternalActivity attempt failed', {
                        attempt: attemptInt + 1,
                        status: resInt.status,
                        message: errMsgInt
                    });
                }
            } catch (errI) {
                lastErrInt = errI;
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('appendInternalActivity attempt threw', {
                        attempt: attemptInt + 1,
                        message: errI && errI.message
                    });
                }
            }
        }
        var msgInt = lastErrInt && (lastErrInt.message || lastErrInt.status);
        if (draftId && window.Drafts && typeof window.Drafts.updateDraft === 'function') {
            window.Drafts.updateDraft(draftId, { errorMessage: msgInt || 'Could not save. Click Submit again or Edit & Save.' });
        } else if (!draftId && typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
            window.Drafts.addDraft({
                type: 'internal',
                storageKey: 'internalActivities',
                payload: { _singleActivity: true, activity: normalized },
                errorMessage: msgInt || 'Could not save. Click Submit again or Edit & Save.'
            });
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('appendInternalActivity failed: draft added for retry', { id: normalized.id });
            }
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('appendInternalActivity failed after retries', { message: msgInt });
        }
        if (typeof window.__activitySaveTracePersistFailure === 'function') {
            window.__activitySaveTracePersistFailure('appendInternalActivity');
        }
        throw lastErrInt || new Error('Internal append failed');
    },

    /** Submit one existing internal activity (draft retry). */
    async submitSingleInternalActivityToServer(activity) {
        if (!activity || !activity.id) throw new Error('Activity must have an id');
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('submitSingleInternalActivityToServer start', {
                id: activity.id,
                type: activity.type,
                date: activity.date || activity.createdAt
            });
        }
        var apiBaseI = (typeof window !== 'undefined' && window.__REMOTE_STORAGE_BASE__) || '/api/storage';
        var urlI = apiBaseI + '/internalActivities/append';
        var bodyI = JSON.stringify({ activity: { ...activity, isInternal: true } });
        var lastErrI = null;
        for (var att = 0; att < 3; att++) {
            if (att > 0) await new Promise(function (r) { setTimeout(r, 1000 * att); });
            try {
                var resI = await fetch(urlI, { method: 'POST', headers: pamsStorageAppendHeaders(), credentials: 'include', body: bodyI });
                var dataI = await resI.json().catch(function () { return {}; });
                if (resI.ok && dataI && dataI.ok) {
                    this.invalidateCache('internalActivities', 'allActivities');
                    this.cache.internalActivities = null;
                    if (typeof window.__activitySaveTracePush === 'function') {
                        window.__activitySaveTracePush('submitSingleInternalActivityToServer success', { id: activity.id, attempt: att + 1 });
                    }
                    try { window.localStorage.removeItem('__activitySaveTraceLastFailure'); } catch (e2) {}
                    return activity;
                }
                lastErrI = new Error((dataI && dataI.message) || ('Request failed: ' + resI.status));
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('submitSingleInternalActivityToServer attempt failed', {
                        attempt: att + 1,
                        status: resI.status,
                        message: lastErrI.message
                    });
                }
                if (resI.status >= 400 && resI.status < 500 && resI.status !== 408) break;
            } catch (errB) {
                lastErrI = errB;
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('submitSingleInternalActivityToServer attempt threw', {
                        attempt: att + 1,
                        message: errB && errB.message
                    });
                }
            }
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('submitSingleInternalActivityToServer failed after retries', {
                id: activity.id,
                message: lastErrI && lastErrI.message
            });
            if (typeof window.__activitySaveTracePersistFailure === 'function') {
                window.__activitySaveTracePersistFailure('submitSingleInternalActivityToServer');
            }
        }
        throw lastErrI || new Error('Submit failed');
    },

    /** Submit one existing activity (e.g. from draft) to the append API. Auto-retries up to 3 times on failure. */
    async submitSingleActivityToServer(activity) {
        if (!activity || !activity.id) throw new Error('Activity must have an id');
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('submitSingleActivityToServer start', {
                id: activity.id,
                type: activity.type,
                date: activity.date || activity.createdAt
            });
        }
        var apiBase = (typeof window !== 'undefined' && window.__REMOTE_STORAGE_BASE__) || '/api/storage';
        var url = apiBase + '/activities/append';
        var bodyStr = JSON.stringify({ activity: activity });
        var lastErr = null;
        for (var attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) await new Promise(function (r) { setTimeout(r, 1000 * attempt); });
            try {
                var res = await fetch(url, { method: 'POST', headers: pamsStorageAppendHeaders(), credentials: 'include', body: bodyStr });
                if (res.ok) {
                    this.invalidateCache('activities', 'allActivities');
                    this.cache.activities = null;
                    if (typeof window.__activitySaveTracePush === 'function') {
                        window.__activitySaveTracePush('submitSingleActivityToServer success', { id: activity.id, attempt: attempt + 1 });
                    }
                    try { window.localStorage.removeItem('__activitySaveTraceLastFailure'); } catch (e) {}
                    return activity;
                }
                var data = await res.json().catch(function () { return {}; });
                lastErr = new Error((data && data.message) || ('Request failed: ' + res.status));
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('submitSingleActivityToServer attempt failed', {
                        attempt: attempt + 1,
                        status: res.status,
                        message: lastErr.message
                    });
                }
                if (res.status >= 400 && res.status < 500 && res.status !== 408) break;
            } catch (err) {
                lastErr = err;
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('submitSingleActivityToServer attempt threw', {
                        attempt: attempt + 1,
                        message: err && err.message
                    });
                }
            }
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('submitSingleActivityToServer failed after retries', {
                id: activity.id,
                message: lastErr && lastErr.message
            });
            if (typeof window.__activitySaveTracePersistFailure === 'function') {
                window.__activitySaveTracePersistFailure('submitSingleActivityToServer');
            }
        }
        throw lastErr || new Error('Submit failed');
    },

    async addActivity(activity) {
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__ && typeof this.appendActivity === 'function') {
            return this.appendActivity(activity);
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('addActivity start', {
                type: activity && activity.type,
                date: activity && (activity.date || activity.createdAt),
                accountId: activity && activity.accountId
            });
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            this.cache.activities = null;
        }
        const activities = await this.getActivities();
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('getActivities returned', { count: Array.isArray(activities) ? activities.length : 0 });
        }
        const timestamp = new Date().toISOString();
        const source = activity && (activity.source === 'migration') ? 'migration' : 'manual';
        const normalized = {
            ...activity,
            id: this.generateId(),
            createdAt: timestamp,
            updatedAt: timestamp,
            source: source,
            isMigrated: source === 'migration'
        };
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('addActivity normalized', { source: normalized.source, isMigrated: !!normalized.isMigrated, date: normalized.date });
        }
        const referenceDate = normalized.date || normalized.createdAt;
        if (referenceDate) {
            const parsed = new Date(referenceDate);
            if (!Number.isNaN(parsed.getTime())) normalized.date = parsed.toISOString();
        }
        const dateDay = (normalized.date || normalized.createdAt || '').toString().slice(0, 10);
        const duplicate = activities.find(function (a) {
            return (a.accountId || '') === (normalized.accountId || '') &&
                (a.projectId || '') === (normalized.projectId || '') &&
                (a.date || a.createdAt || '').toString().slice(0, 10) === dateDay &&
                (a.type || '') === (normalized.type || '');
        });
        if (duplicate) {
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('addActivity skipped duplicate', { accountId: normalized.accountId, date: dateDay, type: normalized.type });
            }
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('An activity with the same account, project, date and type already exists. Skipping duplicate.', 'warning');
            }
            return duplicate;
        }
        activities.push(normalized);
        try {
            await this.saveActivities(activities);
        } catch (err) {
            if (typeof window.__activitySaveTracePush === 'function') {
                window.__activitySaveTracePush('addActivity failed', { status: err && err.status, message: err && err.message });
                window.__activitySaveTracePersistFailure('addActivity');
            }
            throw err;
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('addActivity success', { id: normalized.id, date: normalized.date });
        }
        try { window.localStorage.removeItem('__activitySaveTraceLastFailure'); } catch (e) {}
        this.cache.activities = activities;
        this.recordAudit('activity.create', 'activity', normalized.id, {
            accountId: normalized.accountId || null,
            projectId: normalized.projectId || null,
            type: normalized.type || '',
            category: normalized.isInternal ? 'internal' : 'external',
            fullSnapshot: normalized
        });
        return normalized;
    },

    async updateActivity(activityId, updates) {
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            this.cache.activities = null;
        }
        const activities = await this.getActivities();
        const index = activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates, updatedAt: new Date().toISOString() };
            await this.saveActivities(activities);
            this.recordAudit('activity.update', 'activity', activityId, updates);
            return activities[index];
        }
        return null;
    },

    /**
     * Remove one activity via server POST /activities/remove (used when remote storage enabled).
     * Throws on failure; err.status === 423 when account/project is locked.
     */
    async removeActivityViaServer(activityId) {
        const apiBase = (typeof window !== 'undefined' && window.__REMOTE_STORAGE_BASE__) || '/api/storage';
        const res = await fetch(apiBase + '/activities/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ activityId })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.ok) {
            this.invalidateCache('activities', 'allActivities');
            this.recordAudit('activity.delete', 'activity', activityId);
            return;
        }
        const err = new Error((data && data.message) || ('Request failed: ' + res.status));
        err.status = res.status;
        err.locked = res.status === 423 && !!(data && data.locked);
        throw err;
    },

    async deleteActivity(activityId) {
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__ && typeof this.removeActivityViaServer === 'function') {
            try {
                await this.removeActivityViaServer(activityId);
                return;
            } catch (e) {
                if (e.status === 423 && e.locked && typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
                    window.Drafts.addDraft({
                        type: 'external',
                        storageKey: 'activities',
                        payload: { _pendingDelete: true, activityId },
                        errorMessage: (e && e.message) || 'Account/project locked. Try again in a moment (lock expires in 60s).'
                    });
                }
                throw e;
            }
        }
        this.invalidateCache('activities', 'allActivities');
        const activities = (await this.getActivities()).filter(a => a.id !== activityId);
        await this.saveActivities(activities);
        this.recordAudit('activity.delete', 'activity', activityId);
    },

    async clearAllActivities(options = {}) {
        const { includeInternal = true } = options;

        await this.saveActivities([]);
        if (includeInternal) {
            await this.saveInternalActivities([]);
        } else {
            this.cache.internalActivities = await this.getInternalActivities();
        }
        this.cache.allActivities = null;

        const accounts = await this.getAccounts();
        let accountsMutated = false;

        const normalizedAccounts = accounts.map(account => {
            if (!Array.isArray(account?.projects) || !account.projects.length) {
                return account;
            }
            let projectMutated = false;
            const updatedProjects = account.projects.map(project => {
                if (Array.isArray(project?.activities) && project.activities.length) {
                    projectMutated = true;
                    return {
                        ...project,
                        activities: []
                    };
                }
                return project;
            });
            if (projectMutated) {
                accountsMutated = true;
                return {
                    ...account,
                    projects: updatedProjects
                };
            }
            return account;
        });

        if (accountsMutated) {
            await this.saveAccounts(normalizedAccounts);
        }

        this.recordAudit('activity.purge', 'activity', '*', {
            includeInternal: !!includeInternal,
            removedAccounts: accountsMutated
        });
    },

    // Internal Activities
    async getInternalActivities() {
        if (this.cache.internalActivities) {
            return this.cache.internalActivities;
        }
        // Try async first if available, fallback to sync for initial load
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync('internalActivities');
                const activities = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : [];
                this.cache.internalActivities = activities;
                return activities;
            } catch (err) {
                console.warn('[DataManager] Async getInternalActivities failed:', err);
                if (isEntityKey('internalActivities')) return [];
            }
        }
        if (isEntityKey('internalActivities')) return [];
        const stored = localStorage.getItem('internalActivities');
        const activities = stored ? JSON.parse(stored) : [];
        this.cache.internalActivities = activities;
        return activities;
    },

    /**
     * Server validates every internal activity on PUT. Legacy rows (bad dates, non-string type, NaN durations)
     * block all saves — normalize before upload so one bad row cannot break logging.
     */
    normalizeInternalActivitiesForRemoteSave(activities) {
        if (!Array.isArray(activities)) return [];
        const tMin = new Date('2020-01-01').getTime();
        const tMax = new Date('2050-12-31').getTime();
        const inRange = (val) => {
            if (val == null || val === '') return false;
            const s = typeof val === 'string' ? val.trim() : val;
            const toParse = typeof s === 'string' && /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s;
            const d = new Date(toParse);
            if (!Number.isFinite(d.getTime())) return false;
            const t = d.getTime();
            return t >= tMin && t <= tMax;
        };
        return activities
            .filter((item) => item != null && typeof item === 'object')
            .map((item) => {
                const out = { ...item };
                if (out.id != null && out.id !== '' && typeof out.id !== 'string') {
                    out.id = String(out.id);
                }
                if (!out.id || !String(out.id).trim()) {
                    out.id = this.generateId();
                }
                let dateVal = out.activityDate ?? out.date ?? out.createdAt ?? out.monthOfActivity ?? out.updatedAt;
                if (!inRange(dateVal)) {
                    for (const cand of [out.updatedAt, out.createdAt, out.monthOfActivity, new Date().toISOString()]) {
                        if (inRange(cand)) {
                            const iso = typeof cand === 'string' ? cand : new Date(cand).toISOString();
                            if (!out.date) {
                                const mo = typeof out.monthOfActivity === 'string' && /^\d{4}-\d{2}$/.test(out.monthOfActivity.trim())
                                    ? out.monthOfActivity.trim()
                                    : null;
                                out.date = mo ? `${mo}-01` : iso.slice(0, 10);
                            }
                            break;
                        }
                    }
                }
                dateVal = out.activityDate ?? out.date ?? out.createdAt ?? out.monthOfActivity ?? out.updatedAt;
                if (!inRange(dateVal)) {
                    const today = new Date().toISOString().slice(0, 10);
                    out.date = today;
                    if (!out.createdAt) out.createdAt = new Date().toISOString();
                }
                const tv = out.activityType ?? out.type;
                if (tv != null && typeof tv === 'object') {
                    if (Array.isArray(tv)) {
                        const joined = tv.map((x) => String(x)).filter(Boolean).join(', ') || 'Other';
                        out.type = joined;
                        if (out.activityType != null && Array.isArray(out.activityType)) out.activityType = joined;
                    } else {
                        out.type = 'Other';
                        if (out.activityType && typeof out.activityType === 'object') out.activityType = 'Other';
                    }
                } else if (tv != null && typeof tv !== 'string') {
                    const s = String(tv);
                    out.type = s;
                    if (out.activityType != null && typeof out.activityType !== 'string') out.activityType = s;
                }
                if (out.durationHours !== undefined && out.durationHours !== null && out.durationHours !== '') {
                    const n = typeof out.durationHours === 'number' ? out.durationHours : Number(out.durationHours);
                    if (!Number.isFinite(n) || n < 0 || n > 24) delete out.durationHours;
                    else out.durationHours = n;
                }
                if (out.durationDays !== undefined && out.durationDays !== null && out.durationDays !== '') {
                    const n = typeof out.durationDays === 'number' ? out.durationDays : Number(out.durationDays);
                    if (!Number.isFinite(n) || n < 0 || n > 31) delete out.durationDays;
                    else out.durationDays = n;
                }
                return out;
            });
    },

    async saveInternalActivities(activities) {
        const rawLen = Array.isArray(activities) ? activities.length : 0;
        const normalized = this.normalizeInternalActivitiesForRemoteSave(activities);
        if (normalized.length < rawLen) {
            console.warn(
                '[DataManager] saveInternalActivities: removed',
                rawLen - normalized.length,
                'invalid entries before save'
            );
        }
        const payload = JSON.stringify(normalized);
        // Use async with draft for conflict handling
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsyncWithDraft('internalActivities', payload, { type: 'internal' });
                this.invalidateCache('internalActivities', 'allActivities');
                return;
            } catch (err) {
                if (err && err.status === 409 && err.value != null) {
                    if (typeof window.__activitySaveTracePush === 'function') {
                        let serverCount = null;
                        try {
                            const v = typeof err.value === 'string' ? JSON.parse(err.value) : err.value;
                            if (Array.isArray(v)) serverCount = v.length;
                        } catch (_) { }
                        window.__activitySaveTracePush('internalActivities 409 conflict, merging and retrying', { serverCount });
                    }
                    try {
                        const serverArr = typeof err.value === 'string' ? JSON.parse(err.value) : err.value;
                        if (Array.isArray(serverArr)) {
                            const merged = this._mergeActivitiesByIdNewerWins(serverArr, normalized);
                            this.invalidateCache('internalActivities', 'allActivities');
                            await this.saveInternalActivities(merged);
                            if (typeof window.__activitySaveTracePush === 'function') {
                                window.__activitySaveTracePush('internalActivities merge retry success', { mergedCount: merged.length });
                            }
                            return;
                        }
                    } catch (mergeErr) {
                        if (typeof window.__activitySaveTracePush === 'function') {
                            window.__activitySaveTracePush('internalActivities merge retry failed', { message: mergeErr && mergeErr.message });
                        }
                        console.warn('[DataManager] internalActivities 409 merge retry failed', mergeErr);
                    }
                }
                console.warn('[DataManager] Async saveInternalActivities failed; preserving draft and aborting sync overwrite:', err);
                if (typeof window.__activitySaveTracePush === 'function') {
                    window.__activitySaveTracePush('saveInternalActivities failed', {
                        status: err && err.status,
                        message: err && err.message
                    });
                    if (typeof window.__activitySaveTracePersistFailure === 'function') {
                        window.__activitySaveTracePersistFailure('saveInternalActivities');
                    }
                }
                throw err;
            }
        }
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__) {
            throw new Error('Remote entity write path unavailable for internalActivities');
        }
        localStorage.setItem('internalActivities', payload);
        this.invalidateCache('internalActivities', 'allActivities');
    },

    /**
     * CSV import only: write cloned accounts, external activities, and internal activities together.
     * Does not use appendActivity / appendInternalActivity. Normal manual logging is unchanged.
     * Audits run only after all three saves succeed (individual audit failures are logged, not thrown).
     */
    async persistCsvImportBatch(accounts, activities, internalActivities, auditRecords = []) {
        if (!Array.isArray(accounts) || !Array.isArray(activities) || !Array.isArray(internalActivities)) {
            throw new Error('persistCsvImportBatch: accounts, activities, and internalActivities must be arrays');
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('persistCsvImportBatch start', {
                accounts: accounts.length,
                activities: activities.length,
                internalActivities: internalActivities.length,
                auditRecords: auditRecords.length
            });
        }
        await this.saveAccounts(accounts, { skipDraft: true });
        await this.saveActivities(activities);
        await this.saveInternalActivities(internalActivities);
        this.cache.accounts = accounts;
        this.cache.activities = activities;
        this.cache.internalActivities = internalActivities;
        this.cache.allActivities = null;
        for (const rec of auditRecords) {
            try {
                this.recordAudit(rec.action, rec.entity, rec.entityId, rec.detail);
            } catch (e) {
                console.warn('[DataManager] persistCsvImportBatch audit record failed', e);
            }
        }
        if (typeof window.__activitySaveTracePush === 'function') {
            window.__activitySaveTracePush('persistCsvImportBatch done', {});
        }
    },

    async addInternalActivity(activity) {
        const activities = await this.getInternalActivities();
        const dateDay = (activity.date || activity.createdAt || '').toString().slice(0, 10);
        const duplicate = activities.find(function (a) {
            return (a.date || a.createdAt || '').toString().slice(0, 10) === dateDay &&
                (a.type || '') === (activity.type || '') &&
                (a.activityName || '') === (activity.activityName || '');
        });
        if (duplicate) {
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('An internal activity with the same date, type and name already exists. Skipping duplicate.', 'warning');
            }
            return duplicate;
        }
        activity.id = this.generateId();
        activity.createdAt = new Date().toISOString();
        activity.updatedAt = activity.createdAt;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ENABLED__ && typeof this.appendInternalActivity === 'function') {
            return this.appendInternalActivity(activity);
        }
        activities.push(activity);
        try {
            await this.saveInternalActivities(activities);
        } catch (err) {
            throw err;
        }
        this.recordAudit('activity.create', 'internalActivity', activity.id, {
            type: activity.type || '',
            name: activity.activityName || '',
            fullSnapshot: activity
        });
        return activity;
    },

    async updateInternalActivity(activityId, updates) {
        const activities = await this.getInternalActivities();
        const idStr = activityId != null ? String(activityId) : '';
        const index = activities.findIndex(a => a && String(a.id) === idStr);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates, updatedAt: new Date().toISOString() };
            await this.saveInternalActivities(activities);
            this.recordAudit('activity.update', 'internalActivity', activityId, updates);
            return activities[index];
        }
        return null;
    },

    async deleteInternalActivity(activityId) {
        const idDel = activityId != null ? String(activityId) : '';
        const activities = (await this.getInternalActivities()).filter(a => !a || String(a.id) !== idDel);
        await this.saveInternalActivities(activities);
        this.recordAudit('activity.delete', 'internalActivity', activityId);
    },

    // Presales analytics target management
    async getPresalesActivityTarget() {
        const key = 'presalesActivityTarget';
        let stored;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
            } catch (e) {
                console.warn('[DataManager] Async getPresalesActivityTarget failed:', e);
            }
        }
        if (!stored) {
            stored = localStorage.getItem(key);
        }

        if (!stored) {
            const fallback = {
                value: 20,
                updatedAt: null,
                updatedBy: null
            };
            await this.savePresalesActivityTarget(fallback.value, fallback);
            return fallback;
        }

        try {
            const parsed = JSON.parse(stored);
            return {
                value: Number(parsed.value) >= 0 ? Number(parsed.value) : 20,
                updatedAt: parsed.updatedAt || null,
                updatedBy: parsed.updatedBy || null
            };
        } catch (error) {
            // Backwards compatibility if value stored as plain number/string
            const numericValue = Number(stored);
            const fallback = {
                value: Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 20,
                updatedAt: null,
                updatedBy: null
            };
            await this.savePresalesActivityTarget(fallback.value, fallback);
            return fallback;
        }
    },

    async savePresalesActivityTarget(value, meta = {}) {
        const numericValue = Number(value);
        const target = {
            value: Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : 0,
            updatedAt: meta.updatedAt || new Date().toISOString(),
            updatedBy: meta.updatedBy || null
        };
        const key = 'presalesActivityTarget';
        const payload = JSON.stringify(target);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return target;
            } catch (e) {
                console.warn('[DataManager] Async savePresalesActivityTarget failed:', e);
            }
        }
        localStorage.setItem(key, payload);
        return target;
    },

    async getWinLossTrend(limit = 6) {
        const accounts = await this.getAccounts();
        const trendMap = {};

        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (project.status !== 'won' && project.status !== 'lost') return;
                const month = project.winLossData?.monthOfWin ||
                    (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                if (!month) return;
                if (!trendMap[month]) {
                    trendMap[month] = { won: 0, lost: 0 };
                }
                trendMap[month][project.status === 'won' ? 'won' : 'lost'] += 1;
            });
        });

        const months = Object.keys(trendMap).sort();
        const limitedMonths = limit > 0 ? months.slice(-limit) : months;

        return limitedMonths.map(month => ({
            month,
            won: trendMap[month]?.won || 0,
            lost: trendMap[month]?.lost || 0
        }));
    },

    async getChannelOutcomeStats(month) {
        const result = {};
        const targetMonth = month;
        const accounts = await this.getAccounts();

        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (!project.channels || !project.channels.length) return;
                if (project.status !== 'won' && project.status !== 'lost') return;
                const monthForWinLoss = project.winLossData?.monthOfWin ||
                    (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                if (targetMonth && (!monthForWinLoss || monthForWinLoss !== targetMonth)) return;

                const outcome = project.status === 'won' ? 'won' : 'lost';
                project.channels.forEach(rawChannel => {
                    const channel = (rawChannel && rawChannel.trim()) || 'Unspecified';
                    if (!result[channel]) {
                        result[channel] = { won: 0, lost: 0 };
                    }
                    result[channel][outcome] += 1;
                });
            });
        });

        return result;
    },

    async getPocFunnelStats(month) {
        const targetMonth = month;
        const activities = await this.getAllActivities();
        const pocActivities = activities.filter(activity => {
            if (activity.isInternal || activity.type !== 'poc') return false;
            const date = activity.date || activity.createdAt;
            if (targetMonth && (!date || date.substring(0, 7) !== targetMonth)) return false;
            return true;
        });

        const typeBuckets = {
            'Sandbox': { requests: 0, wins: 0, losses: 0 },
            'Custom POC - Structured Journey': { requests: 0, wins: 0, losses: 0 },
            'Custom POC - Agentic': { requests: 0, wins: 0, losses: 0 },
            'Custom POC - Commerce': { requests: 0, wins: 0, losses: 0 },
            'Other': { requests: 0, wins: 0, losses: 0 }
        };

        const projectTypeMap = {};

        pocActivities.forEach(activity => {
            const accessType = activity.details?.accessType || 'Other';
            const bucketKey = typeBuckets[accessType] ? accessType : 'Other';
            typeBuckets[bucketKey].requests += 1;
            if (activity.projectId) {
                if (!projectTypeMap[activity.projectId]) {
                    projectTypeMap[activity.projectId] = new Set();
                }
                projectTypeMap[activity.projectId].add(bucketKey);
            }
        });

        const accounts = await this.getAccounts();
        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (!projectTypeMap[project.id]) return;
                if (project.status !== 'won' && project.status !== 'lost') return;
                const monthForWinLoss = project.winLossData?.monthOfWin ||
                    (project.winLossData?.updatedAt || project.updatedAt || project.createdAt || '').toString().substring(0, 7);
                if (targetMonth && (!monthForWinLoss || monthForWinLoss !== targetMonth)) return;

                const outcome = project.status === 'won' ? 'wins' : 'losses';
                projectTypeMap[project.id].forEach(typeKey => {
                    if (typeBuckets[typeKey]) {
                        typeBuckets[typeKey][outcome] += 1;
                    }
                });
            });
        });

        return {
            types: typeBuckets,
            totalRequests: pocActivities.length,
            totalWins: Object.values(typeBuckets).reduce((sum, item) => sum + item.wins, 0),
            totalLosses: Object.values(typeBuckets).reduce((sum, item) => sum + item.losses, 0)
        };
    },

    async getMonthlyAnalytics(period, filters = {}) {
        const now = new Date();
        const defaultMonth = now.toISOString().substring(0, 7);
        const rawPeriod = typeof period === 'string' && period.trim() ? period.trim() : defaultMonth;
        const normalizedPeriod = rawPeriod;
        const isYearMode = normalizedPeriod.length === 4 && !normalizedPeriod.includes('-');
        const referencePeriod = isYearMode ? normalizedPeriod : normalizedPeriod.substring(0, 7);

        const targetInfo = await this.getPresalesActivityTarget();
        const targetValue = Number(targetInfo.value) >= 0 ? Number(targetInfo.value) : 0;

        const users = await this.getUsers();
        const presalesUsers = users.filter((user) => this.userIsPresalesUser(user));
        const userLookup = new Map(users.map(user => [user.id, user]));
        const userMap = new Map(users.map(user => [user.id, user]));

        const userSummariesMap = {};
        presalesUsers.forEach(user => {
            userSummariesMap[user.id] = {
                userId: user.id,
                userName: user.username,
                email: user.email,
                total: 0,
                internal: 0,
                external: 0,
                types: {},
                region: this.resolveUserRegion(user),
                wins: 0,
                losses: 0
            };
        });

        const allActivities = await this.getAllActivities();
        const monthsInPeriod = new Set();
        const resolveActivityYear = (activity, monthKey) => {
            if (monthKey && monthKey.length >= 4) {
                return monthKey.substring(0, 4);
            }
            const rawDate = activity.date || activity.createdAt;
            if (typeof rawDate === 'string' && rawDate.length >= 4) {
                return rawDate.substring(0, 4);
            }
            return null;
        };

        const periodActivities = allActivities.filter(activity => {
            const monthKey = this.resolveActivityMonth(activity);
            const yearKey = resolveActivityYear(activity, monthKey);
            if (isYearMode) {
                if (yearKey === referencePeriod) {
                    if (monthKey) {
                        monthsInPeriod.add(monthKey);
                    }
                    return true;
                }
                return false;
            }
            if (monthKey === referencePeriod) {
                monthsInPeriod.add(monthKey);
                return true;
            }
            return false;
        });

        const accounts = await this.getAccounts();
        const accountMap = {};
        accounts.forEach(account => {
            accountMap[account.id] = account;
        });
        const projectLookup = new Map();
        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (project?.id) {
                    projectLookup.set(project.id, { account, project });
                }
            });
        });

        const normalizedIndustry = (filters.industry || '').toLowerCase();
        const normalizedChannel = (filters.channel || '').toLowerCase();
        const normalizedRegion = (filters.region || '').toLowerCase();

        const filteredActivities = periodActivities.filter(activity => {
            if (normalizedIndustry) {
                if (activity.isInternal) return false;
                const projectEntry = projectLookup.get(activity.projectId);
                const account = projectEntry?.account || accountMap[activity.accountId];
                const industryValue = (activity.industry || account?.industry || '').toLowerCase();
                if (!industryValue || industryValue !== normalizedIndustry) return false;
            }

            if (normalizedChannel) {
                if (activity.isInternal) return false;
                const projectEntry = projectLookup.get(activity.projectId);
                const account = projectEntry?.account || accountMap[activity.accountId];
                const project = projectEntry?.project || account?.projects?.find(p => p.id === activity.projectId);
                const channels = (project?.channels || []).map(channel => (channel || '').toLowerCase());
                const matchesChannel = channels.some(channelValue => channelValue === normalizedChannel || channelValue.includes(normalizedChannel));
                if (!matchesChannel) return false;
            }

            if (normalizedRegion) {
                const projectEntry = projectLookup.get(activity.projectId);
                const account = projectEntry?.account || accountMap[activity.accountId];
                const user = userLookup.get(activity.userId);
                const regionValue = (this.resolveActivityRegion(activity, account, user) || '').toLowerCase();
                if (!regionValue || regionValue !== normalizedRegion) {
                    return false;
                }
            }

            return true;
        });

        const activityTypeCounts = {};
        const industryCounts = {};
        const industryProductCounts = {};
        const productTotals = {};
        let internalActivitiesCount = 0;
        let externalActivitiesCount = 0;
        let totalWonActivities = 0;
        let totalLostActivities = 0;

        const regionAggregates = new Map();
        const projectAggregates = new Map();
        const accountAggregates = new Map();

        filteredActivities.forEach(activity => {
            const userId = activity.userId || activity.user?.id || `anonymous-${activity.userName || activity.id || Math.random()}`;
            if (!userSummariesMap[userId]) {
                const fallbackUser = userMap.get(userId);
                userSummariesMap[userId] = {
                    userId,
                    userName: activity.userName || activity.user?.username || 'Unknown',
                    email: activity.user?.email || '',
                    total: 0,
                    internal: 0,
                    external: 0,
                    types: {},
                    region: this.resolveUserRegion(fallbackUser) || this.resolveActivityRegion(activity, accountMap[activity.accountId], fallbackUser),
                    wins: 0,
                    losses: 0
                };
            }

            const summary = userSummariesMap[userId];
            summary.userName = summary.userName || activity.userName || activity.user?.username || 'Unknown';
            summary.total += 1;
            if (activity.isInternal) {
                summary.internal += 1;
                internalActivitiesCount += 1;
            } else {
                summary.external += 1;
                externalActivitiesCount += 1;
            }

            const typeKey = activity.type || (activity.isInternal ? 'Internal Activity' : 'External Activity');
            summary.types[typeKey] = (summary.types[typeKey] || 0) + 1;
            activityTypeCounts[typeKey] = (activityTypeCounts[typeKey] || 0) + 1;

            if (!activity.isInternal) {
                const projectEntry = projectLookup.get(activity.projectId);
                const account = projectEntry?.account || accountMap[activity.accountId];
                const industryRaw = activity.industry || account?.industry || 'Unspecified Industry';
                const industry = industryRaw && typeof industryRaw === 'string' ? industryRaw.trim() || 'Unspecified Industry' : 'Unspecified Industry';
                industryCounts[industry] = (industryCounts[industry] || 0) + 1;

                const project = projectEntry?.project || account?.projects?.find(p => p.id === activity.projectId);
                if (project && Array.isArray(project.productsInterested)) {
                    if (!industryProductCounts[industry]) {
                        industryProductCounts[industry] = {};
                    }
                    project.productsInterested.forEach(product => {
                        const productName = product && typeof product === 'string' ? product.trim() || 'Unspecified Product' : 'Unspecified Product';
                        industryProductCounts[industry][productName] = (industryProductCounts[industry][productName] || 0) + 1;
                        productTotals[productName] = (productTotals[productName] || 0) + 1;
                    });
                }
            }

            const projectEntry = projectLookup.get(activity.projectId);
            const account = projectEntry?.account || accountMap[activity.accountId];
            const project = projectEntry?.project || account?.projects?.find(p => p.id === activity.projectId);
            const user = userMap.get(userId);
            const region = this.resolveActivityRegion(activity, account, user);

            // Region aggregates
            if (!regionAggregates.has(region)) {
                regionAggregates.set(region, {
                    region,
                    totalActivities: 0,
                    internalActivities: 0,
                    externalActivities: 0,
                    wins: 0,
                    losses: 0,
                    uniqueAccounts: new Set(),
                    uniqueProjects: new Set()
                });
            }
            const regionEntry = regionAggregates.get(region);
            regionEntry.totalActivities += 1;
            if (activity.isInternal) {
                regionEntry.internalActivities += 1;
            } else {
                regionEntry.externalActivities += 1;
            }
            if (account?.id) {
                regionEntry.uniqueAccounts.add(account.id);
            }
            if (project?.id) {
                regionEntry.uniqueProjects.add(project.id);
            }

            const projectStatus = (project?.status || '').toLowerCase();
            if (projectStatus === 'won') {
                summary.wins += 1;
                regionEntry.wins += 1;
                totalWonActivities += 1;
            } else if (projectStatus === 'lost') {
                summary.losses += 1;
                regionEntry.losses += 1;
                totalLostActivities += 1;
            }

            if (project) {
                if (!projectAggregates.has(project.id)) {
                    projectAggregates.set(project.id, {
                        projectId: project.id,
                        projectName: project.name || project.projectName || activity.projectName || 'Unnamed Project',
                        accountId: account?.id || '',
                        accountName: account?.accountName || account?.name || activity.accountName || 'Unknown Account',
                        status: project.status || 'inactive',
                        region,
                        totalActivities: 0,
                        externalActivities: 0,
                        internalActivities: 0,
                        wins: 0,
                        losses: 0,
                        ownerIds: new Set(),
                        lastActivityAt: null
                    });
                }
                const projectAggregate = projectAggregates.get(project.id);
                projectAggregate.totalActivities += 1;
                if (activity.isInternal) {
                    projectAggregate.internalActivities += 1;
                } else {
                    projectAggregate.externalActivities += 1;
                }
                if (projectStatus === 'won') {
                    projectAggregate.wins += 1;
                } else if (projectStatus === 'lost') {
                    projectAggregate.losses += 1;
                }
                if (activity.date || activity.createdAt) {
                    const activityDate = activity.date || activity.createdAt;
                    if (!projectAggregate.lastActivityAt || activityDate > projectAggregate.lastActivityAt) {
                        projectAggregate.lastActivityAt = activityDate;
                    }
                }
                if (activity.userId) {
                    projectAggregate.ownerIds.add(activity.userId);
                }
            }

            if (account) {
                if (!accountAggregates.has(account.id)) {
                    accountAggregates.set(account.id, {
                        accountId: account.id,
                        accountName: account.accountName || account.name || activity.accountName || 'Unknown Account',
                        region: this.resolveAccountRegion(account) || region,
                        totalActivities: 0,
                        externalActivities: 0,
                        internalActivities: 0,
                        activeProjects: new Set(),
                        wonProjects: new Set(),
                        lostProjects: new Set(),
                        projectIds: new Set(),
                        lastActivityAt: null
                    });
                }
                const accountAggregate = accountAggregates.get(account.id);
                accountAggregate.totalActivities += 1;
                if (activity.isInternal) {
                    accountAggregate.internalActivities += 1;
                } else {
                    accountAggregate.externalActivities += 1;
                }
                if (project?.id) {
                    accountAggregate.projectIds.add(project.id);
                    if (projectStatus === 'won') {
                        accountAggregate.wonProjects.add(project.id);
                    } else if (projectStatus === 'lost') {
                        accountAggregate.lostProjects.add(project.id);
                    } else {
                        accountAggregate.activeProjects.add(project.id);
                    }
                }
                if (activity.date || activity.createdAt) {
                    const activityDate = activity.date || activity.createdAt;
                    if (!accountAggregate.lastActivityAt || activityDate > accountAggregate.lastActivityAt) {
                        accountAggregate.lastActivityAt = activityDate;
                    }
                }
            }
        });

        const userSummaries = Object.values(userSummariesMap)
            .map(summary => ({
                ...summary,
                wins: summary.wins || 0,
                losses: summary.losses || 0
            }))
            .sort((a, b) => b.total - a.total);

        const regionSummaries = Array.from(regionAggregates.values())
            .map(entry => ({
                region: entry.region,
                totalActivities: entry.totalActivities,
                externalActivities: entry.externalActivities,
                internalActivities: entry.internalActivities,
                wins: entry.wins,
                losses: entry.losses,
                uniqueAccounts: entry.uniqueAccounts.size,
                uniqueProjects: entry.uniqueProjects.size
            }))
            .sort((a, b) => b.totalActivities - a.totalActivities);

        const projectSummaries = Array.from(projectAggregates.values())
            .map(entry => ({
                ...entry,
                ownerCount: entry.ownerIds.size,
                ownerIds: Array.from(entry.ownerIds),
                lastActivityAt: entry.lastActivityAt
            }))
            .sort((a, b) => b.totalActivities - a.totalActivities);

        const accountSummaries = Array.from(accountAggregates.values())
            .map(entry => ({
                ...entry,
                activeProjects: entry.activeProjects.size,
                wonProjects: entry.wonProjects.size,
                lostProjects: entry.lostProjects.size,
                totalProjects: entry.projectIds.size,
                lastActivityAt: entry.lastActivityAt
            }))
            .sort((a, b) => b.totalActivities - a.totalActivities);

        const monthsCovered = Array.from(monthsInPeriod).sort((a, b) => a.localeCompare(b));
        const monthsMultiplier = isYearMode ? Math.max(monthsCovered.length, 1) : 1;
        const periodTargetValue = targetValue * monthsMultiplier;

        return {
            month: referencePeriod,
            periodType: isYearMode ? 'year' : 'month',
            periodValue: referencePeriod,
            monthsInPeriod: monthsCovered,
            year: referencePeriod.substring(0, 4),
            target: targetInfo,
            targetValue,
            monthActivities: filteredActivities,
            periodActivities: filteredActivities,
            presalesUsers: presalesUsers.map(user => ({
                userId: user.id,
                userName: user.username,
                email: user.email,
                region: this.resolveUserRegion(user)
            })),
            userSummaries,
            activityTypeCounts,
            industryCounts,
            industryProductCounts,
            productTotals,
            totalActivities: filteredActivities.length,
            totalPresalesUsers: presalesUsers.length,
            teamTarget: targetValue * presalesUsers.length * monthsMultiplier,
            periodTargetValue,
            internalActivities: internalActivitiesCount,
            externalActivities: externalActivitiesCount,
            regionSummaries,
            projectSummaries,
            accountSummaries,
            totalWonActivities,
            totalLostActivities
        };
    },

    // Get all activities (customer + internal) with user info. Deduplicates by id so merge
    // corruption (internal saved into activities key) and duplicate ids don't double-count.
    async getAllActivities() {
        if (this.cache.allActivities) {
            return this.cache.allActivities.map(activity => ({ ...activity }));
        }

        const activities = await this.getActivities();
        const internalActivities = await this.getInternalActivities();
        const users = await this.getUsers();

        const internalIds = new Set(internalActivities.map(a => a.id));
        const externalOnly = activities.filter(a => !internalIds.has(a.id));
        const seenIds = new Set();
        const externalDeduped = externalOnly.filter(a => {
            if (seenIds.has(a.id)) return false;
            seenIds.add(a.id);
            return true;
        });

        const allActivities = [
            ...externalDeduped.map(a => {
                const user = users.find(u => u.id === a.userId);
                return {
                    ...a,
                    isInternal: false,
                    userName: a.userName || user?.username || 'Unknown',
                    user: user
                };
            }),
            ...internalActivities.map(a => {
                const user = users.find(u => u.id === a.userId);
                return {
                    ...a,
                    isInternal: true,
                    userName: a.userName || user?.username || 'Unknown',
                    user: user
                };
            })
        ].sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt);
            const dateB = new Date(b.date || b.createdAt);
            return dateB - dateA;
        });

        this.cache.allActivities = allActivities;
        return allActivities.map(activity => ({ ...activity }));
    },

    async getAvailableActivityMonths(includeInternal = true) {
        const months = new Set();
        const addMonth = (value) => {
            if (!value) return;
            const month =
                typeof value === 'string'
                    ? value.slice(0, 7)
                    : '';
            if (month) {
                months.add(month);
            }
        };

        const activities = await this.getActivities();
        activities.forEach((activity) => {
            addMonth(this.resolveActivityMonth(activity) || (activity.date ? activity.date.slice(0, 7) : ''));
        });
        if (includeInternal) {
            const internalActivities = await this.getInternalActivities();
            internalActivities.forEach((activity) => {
                const month = activity.date ? activity.date.slice(0, 7) : (activity.monthOfActivity || '');
                addMonth(month || '');
            });
        }

        return Array.from(months)
            .filter(Boolean)
            .filter((m) => m >= '2026-01')
            .sort((a, b) => a.localeCompare(b));
    },

    async getAvailableActivityYears(includeInternal = true) {
        const years = new Set();
        const addYear = (value) => {
            if (!value) return;
            const year =
                typeof value === 'string'
                    ? value.slice(0, 4)
                    : '';
            if (year) {
                years.add(year);
            }
        };

        const activities = await this.getActivities();
        activities.forEach((activity) => {
            const month = this.resolveActivityMonth(activity) || (activity.date ? activity.date.slice(0, 7) : '');
            addYear(month);
        });
        if (includeInternal) {
            const internalActivities = await this.getInternalActivities();
            internalActivities.forEach((activity) => {
                const month = activity.date ? activity.date.slice(0, 7) : (activity.monthOfActivity || '');
                addYear(month);
            });
        }

        return Array.from(years)
            .filter(Boolean)
            .filter((y) => y >= '2026')
            .sort((a, b) => a.localeCompare(b));
    },

    /**
     * Resolve the activity's month key (YYYY-MM) for grouping/counting/reports.
     * - New logged data: month is derived only from activity.date (then createdAt); no monthOfActivity.
     * - Migrated activities: use monthOfActivity (migration source of truth), then date.
     * @param {Object} activity - Activity object
     * @returns {string|null} 'YYYY-MM' or null
     */
    resolveActivityMonth(activity) {
        if (!activity) return null;
        const isMigrated = activity.source === 'migration' || activity.isMigrated === true;
        if (isMigrated) {
            const explicit = typeof activity.monthOfActivity === 'string'
                ? activity.monthOfActivity.trim()
                : '';
            if (explicit && /^\d{4}-\d{2}$/.test(explicit)) return explicit;
        }
        const rawDate = activity.date || activity.createdAt;
        if (typeof rawDate === 'string' && rawDate.length >= 7) return rawDate.substring(0, 7);
        return null;
    },

    // Utility
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatMonth(monthString) {
        if (!monthString) return 'Unknown';
        try {
            if (monthString.length === 4 && !monthString.includes('-')) {
                return monthString;
            }
            const [year, month] = monthString.split('-');
            if (!year || !month) return monthString;
            const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
            if (isNaN(date.getTime())) return monthString;
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } catch (error) {
            console.error('Error formatting month:', error);
            return monthString;
        }
    },

    resolveAccountRegion(account) {
        if (!account) return '';
        const candidates = [];
        const pushCandidate = (value) => {
            if (value && typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed) candidates.push(trimmed);
            }
        };

        pushCandidate(account.salesRepRegion);
        pushCandidate(account.region);
        pushCandidate(account.salesRegion);
        pushCandidate(account.salesTerritory);
        pushCandidate(account.salesGeo);
        if (Array.isArray(account.regions)) {
            account.regions.forEach(pushCandidate);
        }
        if (Array.isArray(account.salesRegions)) {
            account.salesRegions.forEach(pushCandidate);
        }

        return candidates.length ? candidates[0] : '';
    },

    resolveUserRegion(user) {
        if (!user) return '';
        const candidates = [];
        const pushCandidate = (value) => {
            if (value && typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed) candidates.push(trimmed);
            }
        };
        pushCandidate(user.defaultRegion);
        if (Array.isArray(user.regions)) {
            user.regions.forEach(pushCandidate);
        }
        return candidates.length ? candidates[0] : '';
    },

    resolveActivityRegion(activity, account, user) {
        const candidates = [];
        const pushCandidate = (value) => {
            if (value && typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed) candidates.push(trimmed);
            }
        };

        if (activity) {
            pushCandidate(activity.salesRepRegion);
            pushCandidate(activity.region);
            pushCandidate(activity.salesRegion);
            if (activity.metadata && typeof activity.metadata === 'object') {
                pushCandidate(activity.metadata.region);
                pushCandidate(activity.metadata.salesRegion);
            }
        }
        if (account) {
            pushCandidate(this.resolveAccountRegion(account));
        }
        if (user) {
            pushCandidate(this.resolveUserRegion(user));
        }

        return candidates.length ? candidates[0] : 'Unassigned';
    },

    async getAnalyticsAccessConfig() {
        const key = ANALYTICS_ACCESS_CONFIG_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                if (!stored) {
                    const fallback = {
                        password: 'Gup$hup.io',
                        updatedAt: null,
                        updatedBy: null
                    };
                    await this.saveAnalyticsAccessConfig(fallback);
                    return fallback;
                }
                const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
                if (parsed && typeof parsed === 'object') {
                    return {
                        password: typeof parsed.password === 'string' && parsed.password.trim()
                            ? parsed.password.trim()
                            : 'Gup$hup.io',
                        updatedAt: parsed.updatedAt || null,
                        updatedBy: parsed.updatedBy || null
                    };
                }
            } catch (error) {
                console.warn('Failed to parse analytics access config. Using defaults.', error);
            }
        }
        try {
            const stored = localStorage.getItem(key);
            if (!stored) {
                const fallback = {
                    password: 'Gup$hup.io',
                    updatedAt: null,
                    updatedBy: null
                };
                await this.saveAnalyticsAccessConfig(fallback);
                return fallback;
            }
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                return {
                    password: typeof parsed.password === 'string' && parsed.password.trim()
                        ? parsed.password.trim()
                        : 'Gup$hup.io',
                    updatedAt: parsed.updatedAt || null,
                    updatedBy: parsed.updatedBy || null
                };
            }
        } catch (error) {
            console.warn('Failed to parse analytics access config. Using defaults.', error);
        }
        const fallback = {
            password: 'Gup$hup.io',
            updatedAt: null,
            updatedBy: null
        };
        await this.saveAnalyticsAccessConfig(fallback);
        return fallback;
    },

    async saveAnalyticsAccessConfig(config) {
        if (!config || typeof config !== 'object') {
            return;
        }
        const payload = {
            password: typeof config.password === 'string' && config.password.trim()
                ? config.password.trim()
                : 'Gup$hup.io',
            updatedAt: config.updatedAt !== undefined ? config.updatedAt : new Date().toISOString(),
            updatedBy: config.updatedBy !== undefined ? config.updatedBy : null
        };
        const key = ANALYTICS_ACCESS_CONFIG_KEY;
        const jsonPayload = JSON.stringify(payload);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, jsonPayload);
                return payload;
            } catch (e) {
                console.warn('[DataManager] Async saveAnalyticsAccessConfig failed:', e);
            }
        }
        localStorage.setItem(key, jsonPayload);
        return payload;
    },

    SALES_LEADERS_KEY: 'pams_salesLeaders',

    async getSalesLeaders() {
        const key = this.SALES_LEADERS_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                if (!stored) return {};
                const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
                return typeof parsed === 'object' && parsed !== null ? parsed : {};
            } catch (e) {
                console.warn('[DataManager] getSalesLeaders async failed:', e);
            }
        }
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return {};
            return JSON.parse(stored);
        } catch (e) {
            return {};
        }
    },

    async saveSalesLeaders(map) {
        const key = this.SALES_LEADERS_KEY;
        const payload = JSON.stringify(typeof map === 'object' && map !== null ? map : {});
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] saveSalesLeaders async failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    LEADERS_KEY: 'pams_leaders',

    async getLeaders() {
        const key = this.LEADERS_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                if (!stored) return [];
                const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
                return Array.isArray(parsed) ? parsed.filter(e => typeof e === 'string' && e.trim()) : [];
            } catch (e) {
                console.warn('[DataManager] getLeaders async failed:', e);
            }
        }
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed.filter(e => typeof e === 'string' && e.trim()) : [];
        } catch (e) {
            return [];
        }
    },

    async saveLeaders(emails) {
        const key = this.LEADERS_KEY;
        const list = Array.isArray(emails) ? emails.filter(e => typeof e === 'string' && e.trim()) : [];
        const payload = JSON.stringify(list);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] saveLeaders async failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    REPORT_OVERRIDES_KEY: 'pams_reportOverrides',

    async getReportOverrides() {
        const key = this.REPORT_OVERRIDES_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                if (!stored) return {};
                const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
                return typeof parsed === 'object' && parsed !== null ? parsed : {};
            } catch (e) {
                console.warn('[DataManager] getReportOverrides async failed:', e);
            }
        }
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return {};
            return JSON.parse(stored);
        } catch (e) {
            return {};
        }
    },

    async saveReportOverrides(overrides) {
        const key = this.REPORT_OVERRIDES_KEY;
        const payload = JSON.stringify(typeof overrides === 'object' && overrides !== null ? overrides : {});
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] saveReportOverrides async failed:', e);
            }
        }
        localStorage.setItem(key, payload);
    },

    async getAnalyticsTablePresets() {
        const key = ANALYTICS_TABLE_PRESETS_KEY;
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.getItemAsync) {
            try {
                const stored = await window.__REMOTE_STORAGE_ASYNC__.getItemAsync(key);
                if (!stored) {
                    await this.saveAnalyticsTablePresets([]);
                    return [];
                }
                const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
                if (Array.isArray(parsed)) {
                    return parsed.filter(preset => preset && typeof preset === 'object');
                }
            } catch (error) {
                console.warn('Failed to parse analytics table presets from async storage. Returning empty list.', error);
            }
        }
        try {
            const stored = localStorage.getItem(key);
            if (!stored) {
                await this.saveAnalyticsTablePresets([]);
                return [];
            }
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.filter(preset => preset && typeof preset === 'object');
            }
        } catch (error) {
            console.warn('Failed to parse analytics table presets. Returning empty list.', error);
        }
        await this.saveAnalyticsTablePresets([]);
        return [];
    },

    async saveAnalyticsTablePresets(presets) {
        const key = ANALYTICS_TABLE_PRESETS_KEY;
        const sanitized = Array.isArray(presets)
            ? presets.filter(preset => preset && typeof preset === 'object')
            : [];
        const payload = JSON.stringify(sanitized);
        if (typeof window !== 'undefined' && window.__REMOTE_STORAGE_ASYNC__ && window.__REMOTE_STORAGE_ASYNC__.setItemAsync) {
            try {
                await window.__REMOTE_STORAGE_ASYNC__.setItemAsync(key, payload);
                return;
            } catch (e) {
                console.warn('[DataManager] Async saveAnalyticsTablePresets failed:', e);
            }
        }
        try {
            localStorage.setItem(key, payload);
        } catch (error) {
            console.warn('Unable to save analytics table presets.', error);
        }
    },

    async ensureAnalyticsPresetBaseline() {
        try {
            let hasPresetKey = false;
            if (typeof localStorage?.length === 'number' && typeof localStorage.key === 'function') {
                for (let index = 0; index < localStorage.length; index += 1) {
                    const key = localStorage.key(index);
                    if (key === ANALYTICS_TABLE_PRESETS_KEY) {
                        hasPresetKey = true;
                        break;
                    }
                }
            }
            if (!hasPresetKey) {
                this.saveAnalyticsTablePresets([]);
            }
        } catch (error) {
            console.warn('Failed to ensure analytics table preset baseline:', error);
        }
    },

    async ensureRegionBaseline() {
        const stored = await this.getRegions();
        const cleaned = [];
        const seenStored = new Set();

        stored.forEach(region => {
            const value = region && typeof region === 'string' ? region.trim() : '';
            if (!value || seenStored.has(value)) return;
            seenStored.add(value);
            cleaned.push(value);
        });

        const final = [];
        const seenFinal = new Set();

        DEFAULT_SALES_REGIONS.forEach(region => {
            if (!seenFinal.has(region)) {
                final.push(region);
                seenFinal.add(region);
            }
        });

        cleaned.forEach(region => {
            if (!seenFinal.has(region)) {
                final.push(region);
                seenFinal.add(region);
            }
        });

        const changed = JSON.stringify(stored) !== JSON.stringify(final);
        if (changed) {
            await this.saveRegions(final);
        }
    },

    async normalizeSalesRepRegions() {
        const salesReps = await this.getGlobalSalesReps();
        if (!salesReps.length) return;

        // Use admin-configured regions (includes "Inside Sales" and any custom regions), not just DEFAULT_SALES_REGIONS
        const configuredRegions = await this.getRegions();
        const allowed = new Set(configuredRegions.length ? configuredRegions : DEFAULT_SALES_REGIONS);
        const fallbackRegion = configuredRegions[0] || DEFAULT_SALES_REGIONS[0] || 'India West';
        let mutated = false;

        const normalized = salesReps.map(rep => {
            const existingRegion = (rep.region && typeof rep.region === 'string' ? rep.region.trim() : '') || '';
            // Preserve region if it is in the allowed (configured) list; otherwise set fallback
            const nextRegion = existingRegion && allowed.has(existingRegion)
                ? existingRegion
                : fallbackRegion;

            if (nextRegion !== existingRegion) {
                mutated = true;
            }

            return {
                ...rep,
                region: nextRegion || fallbackRegion
            };
        });

        if (mutated) {
            await this.saveGlobalSalesReps(normalized);
        }
    },

    async backfillAccountSalesRepRegions() {
        const accounts = await this.getAccounts();
        if (!accounts.length) return;

        const salesReps = await this.getGlobalSalesReps();
        const byEmail = new Map();
        const byName = new Map();

        salesReps.forEach(rep => {
            if (rep?.email) {
                byEmail.set(rep.email.toLowerCase(), rep);
            }
            if (rep?.name) {
                byName.set(rep.name.toLowerCase(), rep);
            }
        });

        const currentRegions = await this.getRegions();
        const fallbackRegion = currentRegions[0] || 'India West';
        let mutated = false;
        const normalized = accounts.map(account => {
            if (!account || !account.salesRep) {
                return account;
            }

            const currentEmail = account.salesRepEmail ? account.salesRepEmail.toLowerCase() : '';
            let matched = currentEmail ? byEmail.get(currentEmail) : null;
            if (!matched) {
                matched = byName.get(account.salesRep.toLowerCase());
            }

            const resolvedRegion = matched?.region || account.salesRepRegion || fallbackRegion;
            const resolvedEmail = matched?.email || account.salesRepEmail || '';
            const resolvedName = matched?.name || account.salesRep;

            if (resolvedRegion !== account.salesRepRegion || resolvedEmail !== (account.salesRepEmail || '') || resolvedName !== account.salesRep) {
                mutated = true;
                return {
                    ...account,
                    salesRep: resolvedName,
                    salesRepEmail: resolvedEmail,
                    salesRepRegion: resolvedRegion
                };
            }

            return account;
        });

        if (mutated) {
            await this.saveAccounts(normalized);
        }
    },

    async backfillActivitySalesRepRegions() {
        const activities = await this.getActivities();
        if (!activities.length) return;

        const salesReps = await this.getGlobalSalesReps();
        const byEmail = new Map();
        const byName = new Map();

        salesReps.forEach(rep => {
            if (rep?.email) {
                byEmail.set(rep.email.toLowerCase(), rep);
            }
            if (rep?.name) {
                byName.set(rep.name.toLowerCase(), rep);
            }
        });

        const currentRegions = await this.getRegions();
        const fallbackRegion = currentRegions[0] || 'India West';
        let mutated = false;
        const normalized = activities.map(activity => {
            if (!activity || !activity.salesRep) {
                return activity;
            }

            const currentEmail = activity.salesRepEmail ? activity.salesRepEmail.toLowerCase() : '';
            let matched = currentEmail ? byEmail.get(currentEmail) : null;
            if (!matched) {
                matched = byName.get(activity.salesRep.toLowerCase());
            }

            const resolvedRegion = matched?.region || activity.salesRepRegion || fallbackRegion;
            const resolvedEmail = matched?.email || activity.salesRepEmail || '';
            const resolvedName = matched?.name || activity.salesRep;

            if (resolvedRegion !== activity.salesRepRegion || resolvedEmail !== (activity.salesRepEmail || '') || resolvedName !== activity.salesRep) {
                mutated = true;
                return {
                    ...activity,
                    salesRep: resolvedName,
                    salesRepEmail: resolvedEmail,
                    salesRepRegion: resolvedRegion
                };
            }

            return activity;
        });

        if (mutated) {
            await this.saveActivities(normalized);
        }
    },

    async resolveSalesRepMetadata({ email = '', name = '', fallbackRegion = null } = {}) {
        const trimmedEmail = email ? email.trim().toLowerCase() : '';
        const trimmedName = name ? name.trim().toLowerCase() : '';

        let rep = null;
        if (trimmedEmail) {
            rep = await this.getGlobalSalesRepByEmail(trimmedEmail);
        }
        if (!rep && trimmedName) {
            rep = await this.getGlobalSalesRepByName(trimmedName);
        }

        const resolvedName = rep?.name || name || '';
        const resolvedEmail = rep?.email || email || '';
        const currentRegions = await this.getRegions();
        const resolvedRegion = rep?.region || fallbackRegion || currentRegions[0] || 'India West';

        return {
            name: resolvedName,
            email: resolvedEmail,
            region: resolvedRegion
        };
    }
};

// Initialize data on load
if (typeof DataManager !== 'undefined') {
    (async () => {
        try {
            await DataManager.initialize();
            // Also ensure users exist
            await DataManager.ensureDefaultUsers();
            const users = await DataManager.getUsers();
            const industries = await DataManager.getIndustries();
            const useCases = await DataManager.getIndustryUseCases();
            console.log('DataManager initialized. Users:', users.length);
            console.log('Industries:', industries.length);
            console.log('Industry Use Cases initialized:', Object.keys(useCases).length);
        } catch (err) {
            console.error('DataManager async initialization failed:', err);
        }
    })();
}

