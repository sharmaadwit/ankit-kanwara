// Data Management Module - localStorage operations

const DataManager = {
    // Initialize default data
    initialize() {
        try {
            // Initialize users if none exist
            const existingUsers = this.getUsers();
            if (!existingUsers.length) {
                console.log('Initializing default users...');
                const defaultUsers = [
                    {
                        id: this.generateId(),
                        username: 'admin',
                        email: 'admin@example.com',
                        password: 'admin123', // In production, this should be hashed
                        roles: ['Admin', 'Presales User', 'Analytics Access'],
                        regions: ['India South', 'India North'],
                        salesReps: ['John Doe', 'Jane Smith'],
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: this.generateId(),
                        username: 'user',
                        email: 'user@example.com',
                        password: 'user123',
                        roles: ['Presales User'],
                        regions: ['India South'],
                        salesReps: ['John Doe'],
                        isActive: true,
                        createdAt: new Date().toISOString()
                    }
                ];
                this.saveUsers(defaultUsers);
                console.log('Default users created:', defaultUsers.length);
            } else {
                console.log('Users already exist:', existingUsers.length);
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

        // Initialize regions if none exist
        if (!this.getRegions().length) {
            const defaultRegions = [
                'India South', 'India North', 'India West', 'India East',
                'MENA', 'EU', 'NA', 'SEA', 'Africa', 'APAC', 'LATAM'
            ];
            this.saveRegions(defaultRegions);
        }

        // Initialize global sales reps if none exist
        if (!this.getGlobalSalesReps().length) {
            const defaultSalesReps = [
                {
                    id: this.generateId(),
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    region: 'India South',
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Jane Smith',
                    email: 'jane.smith@example.com',
                    region: 'India North',
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveGlobalSalesReps(defaultSalesReps);
        }
        
        // Initialize industries and regions as empty arrays (will be managed inline in forms)
        if (!localStorage.getItem('industries')) {
            this.saveIndustries(['BFSI', 'IT & Software', 'Retail & eCommerce', 'Telecom', 'Healthcare', 'Media & Entertainment', 'Travel & Hospitality', 'Automotive', 'Government', 'Education']);
        }
        if (!localStorage.getItem('regions')) {
            this.saveRegions(['India South', 'India North', 'India West', 'India East', 'MENA', 'EU', 'NA', 'SEA', 'Africa', 'APAC', 'LATAM']);
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
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    },

    // User Management
    getUsers() {
        const stored = localStorage.getItem('users');
        const users = stored ? JSON.parse(stored) : [];
        return users;
    },
    
    // Ensure default users exist (call this if needed)
    ensureDefaultUsers() {
        const users = this.getUsers();
        if (users.length === 0) {
            console.log('Creating default users...');
            const defaultUsers = [
                {
                    id: this.generateId(),
                    username: 'admin',
                    email: 'admin@example.com',
                    password: 'admin123',
                    roles: ['Admin', 'Presales User', 'POC Admin', 'Analytics Access'],
                    regions: ['India South', 'India North'],
                    salesReps: ['John Doe', 'Jane Smith'],
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    username: 'user',
                    email: 'user@example.com',
                    password: 'user123',
                    roles: ['Presales User'],
                    regions: ['India South'],
                    salesReps: ['John Doe'],
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveUsers(defaultUsers);
            console.log('Default users created:', defaultUsers.length);
            return defaultUsers;
        }
        return users;
    },

    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
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
        users.push(user);
        this.saveUsers(users);
        return user;
    },

    updateUser(userId, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
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

    // Region Management
    getRegions() {
        const stored = localStorage.getItem('regions');
        return stored ? JSON.parse(stored) : [];
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

    // Global Sales Reps Management (Enhanced with email and region)
    // Email is PRIMARY KEY
    getGlobalSalesReps() {
        const stored = localStorage.getItem('globalSalesReps');
        const reps = stored ? JSON.parse(stored) : [];
        return reps.map(rep => {
            const fxValue = Number(rep.fxToInr);
            return {
                ...rep,
                currency: rep.currency || 'INR',
                fxToInr: Number.isFinite(fxValue) && fxValue > 0 ? fxValue : null
            };
        });
    },

    getGlobalSalesRepByName(name) {
        if (!name) return null;
        const targetName = name.toLowerCase();
        return this.getGlobalSalesReps().find(rep => rep.name && rep.name.toLowerCase() === targetName) || null;
    },

    saveGlobalSalesReps(salesReps) {
        localStorage.setItem('globalSalesReps', JSON.stringify(salesReps));
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
        salesReps.push(salesRep);
        this.saveGlobalSalesReps(salesReps);
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
            salesReps[index] = merged;
            this.saveGlobalSalesReps(salesReps);
            return merged;
        }
        return null;
    },

    deleteGlobalSalesRep(salesRepId) {
        const salesReps = this.getGlobalSalesReps().filter(r => r.id !== salesRepId);
        this.saveGlobalSalesReps(salesReps);
    },

    // Get unique sales rep names from activities (for promotion)
    getSalesRepsFromActivities() {
        const activities = this.getAllActivities();
        const salesRepNames = new Set();
        
        activities.forEach(activity => {
            if (activity.salesRep) {
                salesRepNames.add(activity.salesRep);
            }
        });
        
        const globalSalesReps = this.getGlobalSalesReps();
        const globalNames = new Set(globalSalesReps.map(r => r.name));
        
        // Return names that are in activities but not in global list
        return Array.from(salesRepNames).filter(name => !globalNames.has(name));
    },

    // Account Management
    getAccounts() {
        const stored = localStorage.getItem('accounts');
        return stored ? JSON.parse(stored) : [];
    },

    saveAccounts(accounts) {
        localStorage.setItem('accounts', JSON.stringify(accounts));
    },

    getAccountById(id) {
        return this.getAccounts().find(a => a.id === id);
    },

    addAccount(account) {
        const accounts = this.getAccounts();
        account.id = this.generateId();
        account.projects = account.projects || [];
        account.createdAt = new Date().toISOString();
        accounts.push(account);
        this.saveAccounts(accounts);
        return account;
    },

    updateAccount(accountId, updates) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            accounts[index] = { ...accounts[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveAccounts(accounts);
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
                return project;
            }
        }
        return null;
    },

    // Activity Management
    getActivities() {
        const stored = localStorage.getItem('activities');
        return stored ? JSON.parse(stored) : [];
    },

    saveActivities(activities) {
        localStorage.setItem('activities', JSON.stringify(activities));
    },

    addActivity(activity) {
        const activities = this.getActivities();
        activity.id = this.generateId();
        activity.createdAt = new Date().toISOString();
        activity.updatedAt = new Date().toISOString();
        activities.push(activity);
        this.saveActivities(activities);
        return activity;
    },

    updateActivity(activityId, updates) {
        const activities = this.getActivities();
        const index = activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveActivities(activities);
            return activities[index];
        }
        return null;
    },

    deleteActivity(activityId) {
        const activities = this.getActivities().filter(a => a.id !== activityId);
        this.saveActivities(activities);
    },

    // Internal Activities
    getInternalActivities() {
        const stored = localStorage.getItem('internalActivities');
        return stored ? JSON.parse(stored) : [];
    },

    saveInternalActivities(activities) {
        localStorage.setItem('internalActivities', JSON.stringify(activities));
    },

    addInternalActivity(activity) {
        const activities = this.getInternalActivities();
        activity.id = this.generateId();
        activity.createdAt = new Date().toISOString();
        activity.updatedAt = new Date().toISOString();
        activities.push(activity);
        this.saveInternalActivities(activities);
        return activity;
    },

    updateInternalActivity(activityId, updates) {
        const activities = this.getInternalActivities();
        const index = activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveInternalActivities(activities);
            return activities[index];
        }
        return null;
    },

    deleteInternalActivity(activityId) {
        const activities = this.getInternalActivities().filter(a => a.id !== activityId);
        this.saveInternalActivities(activities);
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

    getMonthlyAnalytics(month, filters = {}) {
        const referenceMonth = month || new Date().toISOString().substring(0, 7);
        const targetInfo = this.getPresalesActivityTarget();
        const targetValue = Number(targetInfo.value) >= 0 ? Number(targetInfo.value) : 0;

        const users = this.getUsers();
        const presalesUsers = users.filter(user => Array.isArray(user.roles) && user.roles.includes('Presales User'));

        const userSummariesMap = {};
        presalesUsers.forEach(user => {
            userSummariesMap[user.id] = {
                userId: user.id,
                userName: user.username,
                email: user.email,
                total: 0,
                internal: 0,
                external: 0,
                types: {}
            };
        });

        const allActivities = this.getAllActivities();
        const monthActivities = allActivities.filter(activity => {
            const date = activity.date || activity.createdAt;
            if (!date || typeof date !== 'string') return false;
            return date.substring(0, 7) === referenceMonth;
        });

        const accounts = this.getAccounts();
        const accountMap = {};
        accounts.forEach(account => {
            accountMap[account.id] = account;
        });

        const normalizedIndustry = (filters.industry || '').toLowerCase();
        const normalizedChannel = (filters.channel || '').toLowerCase();

        const filteredActivities = monthActivities.filter(activity => {
            if (normalizedIndustry) {
                if (activity.isInternal) return false;
                const account = accountMap[activity.accountId];
                const industryValue = (activity.industry || account?.industry || '').toLowerCase();
                if (!industryValue || industryValue !== normalizedIndustry) return false;
            }

            if (normalizedChannel) {
                if (activity.isInternal) return false;
                const account = accountMap[activity.accountId];
                const project = account?.projects?.find(p => p.id === activity.projectId);
                const channels = (project?.channels || []).map(channel => (channel || '').toLowerCase());
                const matchesChannel = channels.some(channelValue => channelValue === normalizedChannel || channelValue.includes(normalizedChannel));
                if (!matchesChannel) return false;
            }

            return true;
        });

        const activityTypeCounts = {};
        const industryCounts = {};
        const industryProductCounts = {};
        const productTotals = {};
        let internalActivitiesCount = 0;
        let externalActivitiesCount = 0;

        filteredActivities.forEach(activity => {
            const userId = activity.userId || activity.user?.id || `anonymous-${activity.userName || activity.id || Math.random()}`;
            if (!userSummariesMap[userId]) {
                userSummariesMap[userId] = {
                    userId,
                    userName: activity.userName || activity.user?.username || 'Unknown',
                    email: activity.user?.email || '',
                    total: 0,
                    internal: 0,
                    external: 0,
                    types: {}
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
                const account = accountMap[activity.accountId];
                const industryRaw = activity.industry || account?.industry || 'Unspecified Industry';
                const industry = industryRaw && typeof industryRaw === 'string' ? industryRaw.trim() || 'Unspecified Industry' : 'Unspecified Industry';
                industryCounts[industry] = (industryCounts[industry] || 0) + 1;

                const project = account?.projects?.find(p => p.id === activity.projectId);
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
        });

        const userSummaries = Object.values(userSummariesMap).sort((a, b) => b.total - a.total);

        return {
            month: referenceMonth,
            target: targetInfo,
            targetValue,
            monthActivities: filteredActivities,
            presalesUsers: presalesUsers.map(user => ({
                userId: user.id,
                userName: user.username,
                email: user.email
            })),
            userSummaries,
            activityTypeCounts,
            industryCounts,
            industryProductCounts,
            productTotals,
            totalActivities: filteredActivities.length,
            totalPresalesUsers: presalesUsers.length,
            teamTarget: targetValue * presalesUsers.length,
            internalActivities: internalActivitiesCount,
            externalActivities: externalActivitiesCount
        };
    },

    // Get all activities (customer + internal) with user info
    getAllActivities() {
        const activities = this.getActivities();
        const internalActivities = this.getInternalActivities();
        const users = this.getUsers();
        
        const allActivities = [
            ...activities.map(a => {
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
        ];

        return allActivities.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt);
            const dateB = new Date(b.date || b.createdAt);
            return dateB - dateA;
        });
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
            const [year, month] = monthString.split('-');
            if (!year || !month) return monthString;
            const date = new Date(parseInt(year), parseInt(month) - 1);
            if (isNaN(date.getTime())) return monthString;
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } catch (error) {
            console.error('Error formatting month:', error);
            return monthString;
        }
    }
};

// Initialize data on load
if (typeof DataManager !== 'undefined') {
    DataManager.initialize();
    // Also ensure users exist
    DataManager.ensureDefaultUsers();
    console.log('DataManager initialized. Users:', DataManager.getUsers().length);
}

