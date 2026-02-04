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

const INDUSTRIES_KEY = 'industries';
const INDUSTRY_USE_CASES_KEY = 'industryUseCases';
const PENDING_INDUSTRIES_KEY = 'pendingIndustries';
const PENDING_USE_CASES_KEY = 'pendingUseCases';
const SUGGESTIONS_AND_BUGS_KEY = 'suggestionsAndBugs';

const DEFAULT_INDUSTRY_USE_CASES = {
    'BFSI': ['Account Opening', 'Transaction Alerts', 'Loan Processing', 'KYC Verification', 'Payment Reminders', 'Fraud Alerts', 'Customer Support', 'Investment Advisory', 'Claims Processing', 'Credit Card Services', 'EMI Reminders'],
    'IT & Software': ['Product Onboarding', 'Feature Updates', 'Technical Support', 'License Management', 'User Training', 'Bug Reports', 'API Documentation', 'System Alerts'],
    'Retail & eCommerce': ['Lead Generation', 'WhatsApp Commerce', 'Post Sales Support', 'Order Management', 'COD (Cash on Delivery)', 'Returns & Refunds', 'Customer Onboarding', 'Promotions & Campaigns', 'Inventory Management', 'Product Recommendations', 'Abandoned Cart Recovery'],
    'Telecom': ['SIM Activation', 'Bill Payments', 'Plan Upgrades', 'Network Alerts', 'Customer Support', 'Service Activation', 'Data Usage Alerts', 'Recharge Reminders'],
    'Healthcare': ['Appointment Booking', 'Patient Reminders', 'Prescription Management', 'Health Check-ups', 'Lab Reports', 'Telemedicine', 'Patient Onboarding', 'Medical Records', 'Vaccination Reminders'],
    'Media & Entertainment': ['Content Notifications', 'Subscription Management', 'User Engagement', 'Event Reminders', 'Support'],
    'Travel & Hospitality': ['Booking Confirmations', 'Check-in Reminders', 'Loyalty Updates', 'Customer Support', 'Offers'],
    'Automotive': ['Lead Follow-up', 'Service Reminders', 'Booking', 'Support'],
    'Government': ['Citizen Notifications', 'Document Status', 'Support'],
    'Education': ['Student Enrollment', 'Course Updates', 'Fee Reminders', 'Exam Notifications', 'Assignment Submissions', 'Parent-Teacher Communication', 'Library Management', 'Attendance Alerts', 'Result Notifications']
};

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
    initialize() {
        try {
            this.resetCache();
            // Initialize users if none exist
            const existingUsers = this.getUsers();
            if (!existingUsers.length) {
                const defaultUsers = [
                    {
                        id: this.generateId(),
                        username: 'admin',
                        email: 'admin@example.com',
                        password: 'admin123', // In production, this should be hashed
                        roles: ['Admin', 'Presales User', 'Analytics Access'],
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
                this.saveUsers(defaultUsers);
            }

        // Initialize industries if none exist
        if (!this.getIndustries().length) {
            const defaultIndustries = [
                'BFSI', 'IT & Software', 'Retail & eCommerce', 'Telecom',
                'Healthcare', 'Media & Entertainment', 'Travel & Hospitality',
                'Automotive', 'Government', 'Education'
            ];
            this.saveIndustries(defaultIndustries);
        }
        this.ensureIndustryUseCasesBaseline();

        // Initialize regions if none exist
        if (!this.getRegions().length) {
            this.saveRegions([...DEFAULT_SALES_REGIONS]);
        } else {
            this.ensureRegionBaseline();
        }

        // Initialize / ensure sales rep roster
        let salesReps = this.getGlobalSalesReps();
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

            const configuredRegionsSet = new Set(this.getRegions());
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
            this.saveAccounts([]);
        }
        if (!localStorage.getItem('activities')) {
            this.saveActivities([]);
        }
        if (!localStorage.getItem('internalActivities')) {
            this.saveInternalActivities([]);
        }

        if (!localStorage.getItem('presalesActivityTarget')) {
            this.savePresalesActivityTarget(20, { updatedBy: 'System' });
        }

        this.normalizeSalesRepRegions();
        this.backfillAccountSalesRepRegions();
        this.backfillActivitySalesRepRegions();
        this.applyMigrationCleanupIfNeeded();
        this.ensureAnalyticsPresetBaseline();
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    },

    applyMigrationCleanupIfNeeded() {
        try {
            const appliedVersion = localStorage.getItem(
                MIGRATION_CLEANUP_VERSION_KEY
            );
            if (appliedVersion === MIGRATION_CLEANUP_VERSION) {
                return;
            }

            const existingActivities = this.getActivities();
            const {
                records: normalizedActivities,
                changed: activitiesChanged
            } = this.prepareMigratedActivities(existingActivities);

            if (activitiesChanged) {
                this.saveActivities(normalizedActivities);
            }

            const existingAccounts = this.getAccounts();
            const {
                records: normalizedAccounts,
                changed: accountsChanged
            } = this.prepareMigratedAccounts(
                existingAccounts,
                normalizedActivities
            );

            if (accountsChanged) {
                this.saveAccounts(normalizedAccounts);
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

    // User Management
    getUsers() {
        if (this.cache.users) {
            return this.cache.users;
        }
        const stored = localStorage.getItem('users');
        const rawUsers = stored ? JSON.parse(stored) : [];
        const normalized = rawUsers.map(user => {
            const defaultRegion =
                typeof user.defaultRegion === 'string' ? user.defaultRegion.trim() : '';
            const regions = Array.isArray(user.regions) ? user.regions : [];
            const salesReps = Array.isArray(user.salesReps) ? user.salesReps : [];
            return {
                ...user,
                regions,
                salesReps,
                defaultRegion
            };
        });
        this.cache.users = normalized;
        return normalized;
    },
    
    // Ensure default users exist (call this if needed)
    ensureDefaultUsers() {
        const users = this.getUsers();
        if (users.length === 0) {
            const defaultUsers = [
                {
                    id: this.generateId(),
                    username: 'admin',
                    email: 'admin@example.com',
                    password: 'admin123',
                    roles: ['Admin', 'Presales User', 'POC Admin', 'Analytics Access'],
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
            this.saveUsers(defaultUsers);
        }
        return users;
    },

    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
        this.cache.users = users;
        this.cache.allActivities = null;
    },

    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },

    getUserByUsername(username) {
        return this.getUsers().find(u => u.username === username);
    },

    addUser(user) {
        const users = this.getUsers();
        user.id = this.generateId();
        user.createdAt = new Date().toISOString();
        user.isActive = user.isActive !== undefined ? user.isActive : true;
        user.forcePasswordChange = user.forcePasswordChange === true;
        user.passwordUpdatedAt = user.forcePasswordChange ? null : new Date().toISOString();
        const availableRegions = this.getRegions();
        const defaultRegion =
            typeof user.defaultRegion === 'string' ? user.defaultRegion.trim() : '';
        user.defaultRegion =
            defaultRegion && availableRegions.includes(defaultRegion) ? defaultRegion : '';
        user.regions = Array.isArray(user.regions) ? user.regions : [];
        user.salesReps = Array.isArray(user.salesReps) ? user.salesReps : [];
        users.push(user);
        this.saveUsers(users);
        return user;
    },

    updateUser(userId, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === userId);
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
                const availableRegions = this.getRegions();
                merged.defaultRegion =
                    trimmed && availableRegions.includes(trimmed) ? trimmed : '';
            }
            merged.updatedAt = new Date().toISOString();
            users[index] = merged;
            this.saveUsers(users);
            return users[index];
        }
        return null;
    },

    deleteUser(userId) {
        const users = this.getUsers().filter(u => u.id !== userId);
        this.saveUsers(users);
    },

    // Industry Management
    getIndustries() {
        const stored = localStorage.getItem('industries');
        return stored ? JSON.parse(stored) : [];
    },

    saveIndustries(industries) {
        localStorage.setItem('industries', JSON.stringify(industries));
    },

    addIndustry(industry) {
        const industries = this.getIndustries();
        if (!industries.includes(industry)) {
            industries.push(industry);
            this.saveIndustries(industries);
        }
    },

    deleteIndustry(industry) {
        const industries = this.getIndustries().filter(i => i !== industry);
        this.saveIndustries(industries);
    },

    // Industry Use Cases (per-industry)
    getIndustryUseCases() {
        const stored = localStorage.getItem(INDUSTRY_USE_CASES_KEY);
        if (!stored) return {};
        try {
            const parsed = JSON.parse(stored);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (e) {
            return {};
        }
    },

    getUseCasesForIndustry(industry) {
        if (!industry || typeof industry !== 'string') return [];
        const map = this.getIndustryUseCases();
        const list = map[industry.trim()];
        return Array.isArray(list) ? [...list] : [];
    },

    saveIndustryUseCases(map) {
        localStorage.setItem(INDUSTRY_USE_CASES_KEY, JSON.stringify(map || {}));
    },

    setUseCasesForIndustry(industry, useCases) {
        const trimmed = industry && typeof industry === 'string' ? industry.trim() : '';
        if (!trimmed) return;
        const map = this.getIndustryUseCases();
        map[trimmed] = Array.isArray(useCases) ? useCases : [];
        this.saveIndustryUseCases(map);
    },

    addUseCaseToIndustry(industry, useCase) {
        const trimmed = (useCase && typeof useCase === 'string' ? useCase.trim() : '') || '';
        if (!trimmed) return;
        const list = this.getUseCasesForIndustry(industry);
        if (list.includes(trimmed)) return;
        list.push(trimmed);
        this.setUseCasesForIndustry(industry, list);
    },

    removeUseCaseFromIndustry(industry, useCase) {
        const list = this.getUseCasesForIndustry(industry).filter(uc => uc !== useCase);
        this.setUseCasesForIndustry(industry, list);
    },

    ensureIndustryUseCasesBaseline() {
        const industries = this.getIndustries();
        const map = this.getIndustryUseCases();
        let changed = false;
        industries.forEach(ind => {
            if (!Array.isArray(map[ind]) || !map[ind].length) {
                const defaults = DEFAULT_INDUSTRY_USE_CASES[ind];
                map[ind] = Array.isArray(defaults) ? [...defaults] : ['Marketing', 'Commerce', 'Support'];
                changed = true;
            }
        });
        if (changed) this.saveIndustryUseCases(map);
    },

    // Pending industries (from "Other" in forms)
    getPendingIndustries() {
        const stored = localStorage.getItem(PENDING_INDUSTRIES_KEY);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    },

    savePendingIndustries(list) {
        localStorage.setItem(PENDING_INDUSTRIES_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    },

    addPendingIndustry(value, meta = {}) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return null;
        const industries = this.getIndustries();
        if (industries.includes(trimmed)) return null;
        const pending = this.getPendingIndustries();
        if (pending.some(p => (p.value || p).toString().trim() === trimmed)) return null;
        const entry = { value: trimmed, suggestedBy: meta.suggestedBy || null, createdAt: meta.createdAt || new Date().toISOString() };
        pending.push(entry);
        this.savePendingIndustries(pending);
        return entry;
    },

    acceptPendingIndustry(value) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return false;
        const pending = this.getPendingIndustries();
        const filtered = pending.filter(p => (p.value || p).toString().trim() !== trimmed);
        if (filtered.length === pending.length) return false;
        this.savePendingIndustries(filtered);
        this.addIndustry(trimmed);
        const map = this.getIndustryUseCases();
        if (!Array.isArray(map[trimmed]) || !map[trimmed].length) {
            map[trimmed] = ['Marketing', 'Commerce', 'Support'];
            this.saveIndustryUseCases(map);
        }
        return true;
    },

    rejectPendingIndustry(value) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return false;
        const pending = this.getPendingIndustries().filter(p => (p.value || p).toString().trim() !== trimmed);
        this.savePendingIndustries(pending);
        return true;
    },

    // Pending use cases (from "Other" in forms, per industry)
    getPendingUseCases() {
        const stored = localStorage.getItem(PENDING_USE_CASES_KEY);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    },

    savePendingUseCases(list) {
        localStorage.setItem(PENDING_USE_CASES_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    },

    getSuggestionsAndBugs() {
        try {
            const stored = localStorage.getItem(SUGGESTIONS_AND_BUGS_KEY);
            const list = stored ? JSON.parse(stored) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    },

    saveSuggestionsAndBugs(list) {
        localStorage.setItem(SUGGESTIONS_AND_BUGS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    },

    addPendingUseCase(value, industry, meta = {}) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        if (!trimmed) return null;
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        const existing = this.getUseCasesForIndustry(ind);
        if (existing.includes(trimmed)) return null;
        const pending = this.getPendingUseCases();
        if (pending.some(p => (p.value || p).toString().trim() === trimmed && (p.industry || '') === ind)) return null;
        const entry = { value: trimmed, industry: ind, suggestedBy: meta.suggestedBy || null, createdAt: meta.createdAt || new Date().toISOString() };
        pending.push(entry);
        this.savePendingUseCases(pending);
        return entry;
    },

    acceptPendingUseCase(value, industry) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        if (!trimmed) return false;
        const pending = this.getPendingUseCases();
        const filtered = pending.filter(p => (p.value || p).toString().trim() !== trimmed || (p.industry || '') !== ind);
        if (filtered.length === pending.length) return false;
        this.savePendingUseCases(filtered);
        this.addUseCaseToIndustry(ind, trimmed);
        return true;
    },

    rejectPendingUseCase(value, industry) {
        const trimmed = (value && typeof value === 'string' ? value.trim() : '') || '';
        const ind = (industry && typeof industry === 'string' ? industry.trim() : '') || '';
        const pending = this.getPendingUseCases().filter(p => (p.value || p).toString().trim() !== trimmed || (p.industry || '') !== ind);
        this.savePendingUseCases(pending);
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
    mergePendingIndustryInto(pendingValue, existingIndustry) {
        const fromVal = (pendingValue && typeof pendingValue === 'string' ? pendingValue.trim() : '') || '';
        const toVal = (existingIndustry && typeof existingIndustry === 'string' ? existingIndustry.trim() : '') || '';
        if (!fromVal || !toVal) return { success: false, message: 'Both values are required.' };
        const industries = this.getIndustries();
        if (!industries.includes(toVal)) return { success: false, message: 'Target industry is not in the approved list.' };
        const pending = this.getPendingIndustries();
        if (!pending.some(p => (p.value || p).toString().trim() === fromVal)) return { success: false, message: 'Pending industry not found.' };

        const accounts = this.getAccounts();
        let count = 0;
        accounts.forEach(acc => {
            const accInd = (acc.industry && typeof acc.industry === 'string' ? acc.industry.trim() : '') || '';
            if (accInd === fromVal) {
                acc.industry = toVal;
                count++;
            }
        });
        if (count > 0) this.saveAccounts(accounts);
        this.rejectPendingIndustry(fromVal);
        return { success: true, accountsUpdated: count };
    },

    /**
     * Merge a pending use case into an existing approved use case for the same industry.
     * Updates all projects that have the pending value in useCases to use the existing use case.
     * @param {string} pendingValue - The pending use case to merge away
     * @param {string} pendingIndustry - Industry of the pending use case
     * @param {string} existingUseCase - Approved use case to merge into
     * @returns {{ success: boolean, projectsUpdated?: number, message?: string }}
     */
    mergePendingUseCaseInto(pendingValue, pendingIndustry, existingUseCase) {
        const fromVal = (pendingValue && typeof pendingValue === 'string' ? pendingValue.trim() : '') || '';
        const ind = (pendingIndustry && typeof pendingIndustry === 'string' ? pendingIndustry.trim() : '') || '';
        const toVal = (existingUseCase && typeof existingUseCase === 'string' ? existingUseCase.trim() : '') || '';
        if (!fromVal || !toVal) return { success: false, message: 'Both values are required.' };
        const existingList = this.getUseCasesForIndustry(ind);
        if (!existingList.includes(toVal)) return { success: false, message: 'Target use case is not in the list for this industry.' };
        const pending = this.getPendingUseCases();
        if (!pending.some(p => (p.value || p).toString().trim() === fromVal && (p.industry || '') === ind)) return { success: false, message: 'Pending use case not found.' };

        const accounts = this.getAccounts();
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
        if (projectsUpdated > 0) this.saveAccounts(accounts);
        this.rejectPendingUseCase(fromVal, ind);
        return { success: true, projectsUpdated };
    },

    // Region Management
    getRegions() {
        const stored = localStorage.getItem('regions');
        return stored ? JSON.parse(stored) : [];
    },

    isDefaultRegion(region) {
        if (!region) return false;
        return DEFAULT_REGION_SET.has(region.trim());
    },

    saveRegions(regions) {
        localStorage.setItem('regions', JSON.stringify(regions));
    },

    addRegion(region) {
        const regions = this.getRegions();
        if (!regions.includes(region)) {
            regions.push(region);
            this.saveRegions(regions);
        }
    },

    deleteRegion(region) {
        const regions = this.getRegions().filter(r => r !== region);
        this.saveRegions(regions);
    },

    getRegionUsage(region) {
        if (!region) {
            return { salesReps: 0, accounts: 0, activities: 0, users: 0 };
        }
        const normalized = region.trim().toLowerCase();
        if (!normalized) {
            return { salesReps: 0, accounts: 0, activities: 0, users: 0 };
        }

        const salesReps = this.getGlobalSalesReps().filter(rep => (rep.region || '').trim().toLowerCase() === normalized).length;
        const accounts = this.getAccounts().filter(account => (account.salesRepRegion || '').trim().toLowerCase() === normalized).length;
        const activities = this.getAllActivities().filter(activity => (activity.salesRepRegion || '').trim().toLowerCase() === normalized).length;
        const users = this.getUsers().filter(user => (user.defaultRegion || '').trim().toLowerCase() === normalized).length;

        return { salesReps, accounts, activities, users };
    },

    removeRegion(region) {
        const trimmed = region && typeof region === 'string' ? region.trim() : '';
        if (!trimmed) {
            return { success: false, message: 'Select a region to remove.' };
        }

        if (this.isDefaultRegion(trimmed)) {
            return { success: false, message: 'Default regions cannot be removed.' };
        }

        const regions = this.getRegions();
        if (!regions.includes(trimmed)) {
            return { success: false, message: `Region "${trimmed}" was not found.` };
        }

        const usage = this.getRegionUsage(trimmed);
        if (usage.salesReps || usage.accounts || usage.activities || usage.users) {
            return {
                success: false,
                message: `Region "${trimmed}" is still in use.`,
                usage
            };
        }

        this.deleteRegion(trimmed);
        this.ensureRegionBaseline();
        this.recordAudit('region.delete', 'region', trimmed, usage);

        return { success: true, usage };
    },

    pruneUnusedRegions() {
        const regions = [...this.getRegions()];
        const removed = [];

        regions.forEach(region => {
            if (this.isDefaultRegion(region)) {
                return;
            }
            const usage = this.getRegionUsage(region);
            if (usage.salesReps || usage.accounts || usage.activities || usage.users) {
                return;
            }
            this.deleteRegion(region);
            this.recordAudit('region.delete', 'region', region, usage);
            removed.push(region);
        });

        if (removed.length) {
            this.ensureRegionBaseline();
        }

        return { removed };
    },

    // Global Sales Reps Management (Enhanced with email and region)
    // Email is PRIMARY KEY
    getGlobalSalesReps() {
        if (this.cache.globalSalesReps) {
            return this.cache.globalSalesReps;
        }
        const stored = localStorage.getItem('globalSalesReps');
        const reps = stored ? JSON.parse(stored) : [];
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

    getGlobalSalesRepByName(name) {
        if (!name) return null;
        const targetName = name.toLowerCase();
        return this.getGlobalSalesReps().find(rep => rep.name && rep.name.toLowerCase() === targetName) || null;
    },

    getGlobalSalesRepByEmail(email) {
        if (!email) return null;
        const targetEmail = email.toLowerCase();
        return this.getGlobalSalesReps().find(rep => rep.email && rep.email.toLowerCase() === targetEmail) || null;
    },

    getSalesRepsByRegion(region = 'all', options = {}) {
        const { includeInactive = false } = options || {};
        const normalizedRegion = region ? region.trim() : '';
        const reps = this.getGlobalSalesReps().filter(rep => includeInactive || rep.isActive !== false);
        if (!normalizedRegion || normalizedRegion.toLowerCase() === 'all') {
            return [...reps].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return reps
            .filter(rep => (rep.region || '') === normalizedRegion)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },

    saveGlobalSalesReps(salesReps) {
        localStorage.setItem('globalSalesReps', JSON.stringify(salesReps));
        this.cache.globalSalesReps = salesReps;
        this.cache.allActivities = null;
    },

    addGlobalSalesRep(salesRep) {
        const salesReps = this.getGlobalSalesReps();
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
        salesRep.region = regionTrimmed || (this.getRegions()[0] || '');
        salesReps.push(salesRep);
        this.saveGlobalSalesReps(salesReps);
        this.recordAudit('salesRep.create', 'salesRep', salesRep.id, {
            name: salesRep.name,
            email: salesRep.email,
            region: salesRep.region
        });
        this.backfillAccountSalesRepRegions();
        this.backfillActivitySalesRepRegions();
        return salesRep;
    },

    updateGlobalSalesRep(salesRepId, updates) {
        const salesReps = this.getGlobalSalesReps();
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
            merged.region = regionTrimmed || (current.region || this.getRegions()[0] || '');
            salesReps[index] = merged;
            this.saveGlobalSalesReps(salesReps);
            this.recordAudit('salesRep.update', 'salesRep', salesRepId, updates);
            this.backfillAccountSalesRepRegions();
            this.backfillActivitySalesRepRegions();
            return merged;
        }
        return null;
    },

    deleteGlobalSalesRep(salesRepId) {
        const salesReps = this.getGlobalSalesReps().filter(r => r.id !== salesRepId);
        this.saveGlobalSalesReps(salesReps);
        this.recordAudit('salesRep.delete', 'salesRep', salesRepId);
    },


    // Account Management
    getAccounts() {
        if (this.cache.accounts) {
            return this.cache.accounts;
        }
        const stored = localStorage.getItem('accounts');
        const accounts = stored ? JSON.parse(stored) : [];
        this.cache.accounts = accounts;
        return accounts;
    },

    saveAccounts(accounts) {
        localStorage.setItem('accounts', JSON.stringify(accounts));
        this.cache.accounts = accounts;
        this.cache.allActivities = null;
    },

    getAccountById(id) {
        return this.getAccounts().find(a => a.id === id);
    },

    addAccount(account) {
        const accounts = this.getAccounts();
        account.id = this.generateId();
        const resolvedRep = this.resolveSalesRepMetadata({
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
        this.saveAccounts(accounts);
        this.recordAudit('account.create', 'account', account.id, {
            name: account.name,
            industry: account.industry || ''
        });
        return account;
    },

    updateAccount(accountId, updates) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            const merged = { ...accounts[index], ...updates };
            const resolvedRep = this.resolveSalesRepMetadata({
                name: merged.salesRep || '',
                email: merged.salesRepEmail || '',
                fallbackRegion: merged.salesRepRegion
            });
            merged.salesRep = resolvedRep.name;
            merged.salesRepEmail = resolvedRep.email;
            merged.salesRepRegion = resolvedRep.region;
            merged.updatedAt = new Date().toISOString();
            accounts[index] = merged;
            this.saveAccounts(accounts);
            this.recordAudit('account.update', 'account', accountId, updates);
            return accounts[index];
        }
        return null;
    },
    
    deleteAccount(accountId) {
        // Delete all activities associated with this account
        const activities = this.getActivities();
        const filteredActivities = activities.filter(a => a.accountId !== accountId);
        this.saveActivities(filteredActivities);
        
        // Delete account (projects are nested, so they'll be deleted too)
        const accounts = this.getAccounts().filter(a => a.id !== accountId);
        this.saveAccounts(accounts);
        this.recordAudit('account.delete', 'account', accountId, {
            removedActivities: activities.length - filteredActivities.length
        });
    },

    // Project Management
    addProject(accountId, project) {
        const accounts = this.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            if (!account.projects) account.projects = [];
            project.id = this.generateId();
            project.activities = project.activities || [];
            project.status = project.status || 'active';
            project.createdAt = new Date().toISOString();
            account.projects.push(project);
            this.saveAccounts(accounts);
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

    updateProject(accountId, projectId, updates) {
        const accounts = this.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        if (account && account.projects) {
            const project = account.projects.find(p => p.id === projectId);
            if (project) {
                Object.assign(project, updates, { updatedAt: new Date().toISOString() });
                this.saveAccounts(accounts);
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
    getActivities() {
        if (this.cache.activities) {
            return this.cache.activities;
        }
        const stored = localStorage.getItem('activities');
        const activities = stored ? JSON.parse(stored) : [];
        this.cache.activities = activities;
        return activities;
    },

    getActivitiesByProject(projectId) {
        if (!projectId) return [];
        return this.getActivities().filter(a => a.projectId === projectId);
    },

    saveActivities(activities) {
        localStorage.setItem('activities', JSON.stringify(activities));
        this.cache.activities = activities;
        this.cache.allActivities = null;
    },

    addActivity(activity) {
        const activities = this.getActivities();
        const timestamp = new Date().toISOString();
        const normalized = {
            ...activity,
            id: this.generateId(),
            createdAt: timestamp,
            updatedAt: timestamp,
            source: activity?.source || 'manual',
            isMigrated: activity?.source === 'migration'
        };

        const referenceDate = normalized.date || normalized.createdAt;
        if (referenceDate) {
            const parsed = new Date(referenceDate);
            if (!Number.isNaN(parsed.getTime())) {
                const iso = parsed.toISOString();
                normalized.date = iso;
                if (!normalized.monthOfActivity) {
                    normalized.monthOfActivity = iso.slice(0, 7);
                }
            }
        }

        activities.push(normalized);
        this.saveActivities(activities);
        this.recordAudit('activity.create', 'activity', normalized.id, {
            accountId: normalized.accountId || null,
            projectId: normalized.projectId || null,
            type: normalized.type || '',
            category: normalized.isInternal ? 'internal' : 'external'
        });
        return normalized;
    },

    updateActivity(activityId, updates) {
        const activities = this.getActivities();
        const index = activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveActivities(activities);
            this.recordAudit('activity.update', 'activity', activityId, updates);
            return activities[index];
        }
        return null;
    },

    deleteActivity(activityId) {
        const activities = this.getActivities().filter(a => a.id !== activityId);
        this.saveActivities(activities);
        this.recordAudit('activity.delete', 'activity', activityId);
    },

    clearAllActivities(options = {}) {
        const { includeInternal = true } = options;

        this.saveActivities([]);
        if (includeInternal) {
            this.saveInternalActivities([]);
        } else {
            this.cache.internalActivities = this.getInternalActivities();
        }
        this.cache.allActivities = null;

        const accounts = this.getAccounts();
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
            this.saveAccounts(normalizedAccounts);
        }

        this.recordAudit('activity.purge', 'activity', '*', {
            includeInternal: !!includeInternal,
            removedAccounts: accountsMutated
        });
    },

    // Internal Activities
    getInternalActivities() {
        if (this.cache.internalActivities) {
            return this.cache.internalActivities;
        }
        const stored = localStorage.getItem('internalActivities');
        const activities = stored ? JSON.parse(stored) : [];
        this.cache.internalActivities = activities;
        return activities;
    },

    saveInternalActivities(activities) {
        localStorage.setItem('internalActivities', JSON.stringify(activities));
        this.cache.internalActivities = activities;
        this.cache.allActivities = null;
    },

    addInternalActivity(activity) {
        const activities = this.getInternalActivities();
        activity.id = this.generateId();
        activity.createdAt = new Date().toISOString();
        activity.updatedAt = new Date().toISOString();
        activities.push(activity);
        this.saveInternalActivities(activities);
        this.recordAudit('activity.create', 'internalActivity', activity.id, {
            type: activity.type || '',
            name: activity.activityName || ''
        });
        return activity;
    },

    updateInternalActivity(activityId, updates) {
        const activities = this.getInternalActivities();
        const index = activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveInternalActivities(activities);
            this.recordAudit('activity.update', 'internalActivity', activityId, updates);
            return activities[index];
        }
        return null;
    },

    deleteInternalActivity(activityId) {
        const activities = this.getInternalActivities().filter(a => a.id !== activityId);
        this.saveInternalActivities(activities);
        this.recordAudit('activity.delete', 'internalActivity', activityId);
    },

    // Presales analytics target management
    getPresalesActivityTarget() {
        const stored = localStorage.getItem('presalesActivityTarget');
        if (!stored) {
            return {
                value: 20,
                updatedAt: null,
                updatedBy: null
            };
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
            return {
                value: Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 20,
                updatedAt: null,
                updatedBy: null
            };
        }
    },

    savePresalesActivityTarget(value, meta = {}) {
        const numericValue = Number(value);
        const target = {
            value: Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : 0,
            updatedAt: meta.updatedAt || new Date().toISOString(),
            updatedBy: meta.updatedBy || null
        };
        localStorage.setItem('presalesActivityTarget', JSON.stringify(target));
        return target;
    },

    getWinLossTrend(limit = 6) {
        const accounts = this.getAccounts();
        const trendMap = {};

        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (project.status !== 'won' && project.status !== 'lost') return;
                const updatedAt = project.winLossData?.updatedAt || project.updatedAt || project.createdAt;
                if (!updatedAt) return;
                const month = updatedAt.substring(0, 7);
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

    getChannelOutcomeStats(month) {
        const result = {};
        const targetMonth = month;
        const accounts = this.getAccounts();

        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (!project.channels || !project.channels.length) return;
                if (project.status !== 'won' && project.status !== 'lost') return;
                const updatedAt = project.winLossData?.updatedAt || project.updatedAt || project.createdAt;
                if (targetMonth && updatedAt && updatedAt.substring(0, 7) !== targetMonth) return;

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

    getPocFunnelStats(month) {
        const targetMonth = month;
        const activities = this.getAllActivities();
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

        const accounts = this.getAccounts();
        accounts.forEach(account => {
            account.projects?.forEach(project => {
                if (!projectTypeMap[project.id]) return;
                if (project.status !== 'won' && project.status !== 'lost') return;
                const updatedAt = project.winLossData?.updatedAt || project.updatedAt || project.createdAt;
                if (targetMonth && updatedAt && updatedAt.substring(0, 7) !== targetMonth) return;

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

    getMonthlyAnalytics(period, filters = {}) {
        const now = new Date();
        const defaultMonth = now.toISOString().substring(0, 7);
        const rawPeriod = typeof period === 'string' && period.trim() ? period.trim() : defaultMonth;
        const normalizedPeriod = rawPeriod;
        const isYearMode = normalizedPeriod.length === 4 && !normalizedPeriod.includes('-');
        const referencePeriod = isYearMode ? normalizedPeriod : normalizedPeriod.substring(0, 7);

        const targetInfo = this.getPresalesActivityTarget();
        const targetValue = Number(targetInfo.value) >= 0 ? Number(targetInfo.value) : 0;

        const users = this.getUsers();
        const presalesUsers = users.filter(user => Array.isArray(user.roles) && user.roles.includes('Presales User'));
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

        const allActivities = this.getAllActivities();
        const monthsInPeriod = new Set();
        const resolveActivityMonth = (activity) => {
            const explicitMonth = typeof activity.monthOfActivity === 'string'
                ? activity.monthOfActivity.trim()
                : '';
            if (explicitMonth && /^\d{4}-\d{2}$/.test(explicitMonth)) {
                return explicitMonth;
            }
            const rawDate = activity.date || activity.createdAt;
            if (typeof rawDate === 'string' && rawDate.length >= 7) {
                return rawDate.substring(0, 7);
            }
            return null;
        };
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
            const monthKey = resolveActivityMonth(activity);
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

        const accounts = this.getAccounts();
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
    getAllActivities() {
        if (this.cache.allActivities) {
            return this.cache.allActivities.map(activity => ({ ...activity }));
        }

        const activities = this.getActivities();
        const internalActivities = this.getInternalActivities();
        const users = this.getUsers();

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

    getAvailableActivityMonths(includeInternal = true) {
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

        this.getActivities().forEach((activity) => {
            addMonth(
                activity.monthOfActivity ||
                    (activity.date ? activity.date.slice(0, 7) : '')
            );
        });
        if (includeInternal) {
            this.getInternalActivities().forEach((activity) => {
                addMonth(
                    activity.monthOfActivity ||
                        (activity.date ? activity.date.slice(0, 7) : '')
                );
            });
        }

        return Array.from(months)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
    },

    getAvailableActivityYears(includeInternal = true) {
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

        this.getActivities().forEach((activity) => {
            addYear(
                activity.monthOfActivity ||
                    (activity.date ? activity.date.slice(0, 7) : '')
            );
        });
        if (includeInternal) {
            this.getInternalActivities().forEach((activity) => {
                addYear(
                    activity.monthOfActivity ||
                        (activity.date ? activity.date.slice(0, 7) : '')
                );
            });
        }

        return Array.from(years)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
    },

    /**
     * Resolve the activity's month key (YYYY-MM) for grouping/counting.
     * Uses only user-given activity date: monthOfActivity first, then activity.date.
     * Does NOT use createdAt (submission time) so Jan count = activities where user said Jan.
     * @param {Object} activity - Activity object
     * @returns {string|null} 'YYYY-MM' or null
     */
    resolveActivityMonth(activity) {
        if (!activity) return null;
        const explicit = typeof activity.monthOfActivity === 'string'
            ? activity.monthOfActivity.trim()
            : '';
        if (explicit && /^\d{4}-\d{2}$/.test(explicit)) return explicit;
        const raw = activity.date;
        if (typeof raw === 'string' && raw.length >= 7) return raw.substring(0, 7);
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

    getAnalyticsAccessConfig() {
        try {
            const stored = localStorage.getItem(ANALYTICS_ACCESS_CONFIG_KEY);
            if (!stored) {
                const fallback = {
                    password: 'Gup$hup.io',
                    updatedAt: null,
                    updatedBy: null
                };
                this.saveAnalyticsAccessConfig(fallback);
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
        this.saveAnalyticsAccessConfig(fallback);
        return fallback;
    },

    saveAnalyticsAccessConfig(config) {
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
        localStorage.setItem(ANALYTICS_ACCESS_CONFIG_KEY, JSON.stringify(payload));
        return payload;
    },

    getAnalyticsTablePresets() {
        try {
            const stored = localStorage.getItem(ANALYTICS_TABLE_PRESETS_KEY);
            if (!stored) {
                this.saveAnalyticsTablePresets([]);
                return [];
            }
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.filter(preset => preset && typeof preset === 'object');
            }
        } catch (error) {
            console.warn('Failed to parse analytics table presets. Returning empty list.', error);
        }
        this.saveAnalyticsTablePresets([]);
        return [];
    },

    saveAnalyticsTablePresets(presets) {
        try {
            const sanitized = Array.isArray(presets)
                ? presets.filter(preset => preset && typeof preset === 'object')
                : [];
            localStorage.setItem(ANALYTICS_TABLE_PRESETS_KEY, JSON.stringify(sanitized));
        } catch (error) {
            console.warn('Unable to save analytics table presets.', error);
        }
    },

    ensureAnalyticsPresetBaseline() {
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

    ensureRegionBaseline() {
        const stored = this.getRegions();
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
            this.saveRegions(final);
        }
    },

    normalizeSalesRepRegions() {
        const salesReps = this.getGlobalSalesReps();
        if (!salesReps.length) return;

        // Use admin-configured regions (includes "Inside Sales" and any custom regions), not just DEFAULT_SALES_REGIONS
        const configuredRegions = this.getRegions();
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
            this.saveGlobalSalesReps(normalized);
        }
    },

    backfillAccountSalesRepRegions() {
        const accounts = this.getAccounts();
        if (!accounts.length) return;

        const salesReps = this.getGlobalSalesReps();
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

            const resolvedRegion = matched?.region || account.salesRepRegion || this.getRegions()[0] || 'India West';
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
            this.saveAccounts(normalized);
        }
    },

    backfillActivitySalesRepRegions() {
        const activities = this.getActivities();
        if (!activities.length) return;

        const salesReps = this.getGlobalSalesReps();
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

            const resolvedRegion = matched?.region || activity.salesRepRegion || this.getRegions()[0] || 'India West';
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
            this.saveActivities(normalized);
        }
    },

    resolveSalesRepMetadata({ email = '', name = '', fallbackRegion = null } = {}) {
        const trimmedEmail = email ? email.trim().toLowerCase() : '';
        const trimmedName = name ? name.trim().toLowerCase() : '';

        let rep = null;
        if (trimmedEmail) {
            rep = this.getGlobalSalesRepByEmail(trimmedEmail);
        }
        if (!rep && trimmedName) {
            rep = this.getGlobalSalesRepByName(trimmedName);
        }

        const resolvedName = rep?.name || name || '';
        const resolvedEmail = rep?.email || email || '';
        const resolvedRegion = rep?.region || fallbackRegion || this.getRegions()[0] || 'India West';

        return {
            name: resolvedName,
            email: resolvedEmail,
            region: resolvedRegion
        };
    }
};

// Initialize data on load
if (typeof DataManager !== 'undefined') {
    DataManager.initialize();
    // Also ensure users exist
    DataManager.ensureDefaultUsers();
    console.log('DataManager initialized. Users:', DataManager.getUsers().length);
    console.log('Industries:', DataManager.getIndustries().length);
    console.log('Industry Use Cases initialized:', Object.keys(DataManager.getIndustryUseCases()).length);
}

