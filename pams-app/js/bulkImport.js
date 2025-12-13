// Bulk Import Module
const BulkImport = {
    state: {
        file: null,
        rows: [],
        parsedRows: [],
        summary: null,
        errorRows: [],
        duplicateRows: [],
        committed: false,
        previewFilter: 'all'
    },

    init() {
        this.cacheDom();
        this.bindEvents();
        this.reset();
    },

    cacheDom() {
        this.fileInput = document.getElementById('importFileInput');
        this.dryRunBtn = document.getElementById('importDryRunBtn');
        this.confirmBtn = document.getElementById('importConfirmBtn');
        this.loadingIndicator = document.getElementById('importLoadingIndicator');
        this.previewSection = document.getElementById('importPreviewSection');
        this.previewTableBody = document.querySelector('#importPreviewTable tbody');
        this.summaryContainer = document.getElementById('importSummary');
        this.commitSection = document.getElementById('importCommitResult');
        this.commitSummary = document.getElementById('importCommitSummary');
        this.downloadErrorsBtn = document.getElementById('importDownloadErrorsBtn');
        this.previewFilter = document.getElementById('importPreviewFilter');
        this.issuesPanel = document.getElementById('importIssuesPanel');
        this.issuesPanelBody = this.issuesPanel ? this.issuesPanel.querySelector('.card-body') : null;
    },

    bindEvents() {
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (event) => {
                const file = event.target.files && event.target.files[0];
                this.handleFileSelection(file);
            });
        }

        if (this.dryRunBtn) {
            this.dryRunBtn.addEventListener('click', () => this.runDryRun());
        }

        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', () => this.commitImport());
        }

        if (this.downloadErrorsBtn) {
            this.downloadErrorsBtn.addEventListener('click', () => this.downloadErrors());
        }

        if (this.previewFilter) {
            this.previewFilter.addEventListener('change', () => {
                this.state.previewFilter = this.previewFilter.value;
                this.renderPreviewTable();
            });
        }
    },

    reset() {
        this.state = {
            file: null,
            rows: [],
            parsedRows: [],
            summary: null,
            errorRows: [],
            duplicateRows: [],
            committed: false,
            previewFilter: 'all',
            categoryHint: ''
        };

        this.dryRunBtn && (this.dryRunBtn.disabled = true);
        if (this.fileInput) this.fileInput.value = '';
        if (this.previewSection) this.previewSection.classList.add('hidden');
        if (this.commitSection) this.commitSection.classList.add('hidden');
        if (this.previewTableBody) this.previewTableBody.innerHTML = '';
        if (this.summaryContainer) this.summaryContainer.innerHTML = '';
        if (this.commitSummary) this.commitSummary.innerHTML = '';
        if (this.downloadErrorsBtn) this.downloadErrorsBtn.style.display = 'none';
        if (this.previewFilter) this.previewFilter.value = 'all';
        if (this.issuesPanel) this.issuesPanel.style.display = 'none';
        if (this.issuesPanelBody) this.issuesPanelBody.innerHTML = '';
        if (typeof App !== 'undefined' && App.clearPendingDuplicateAlerts) {
            App.clearPendingDuplicateAlerts();
        }
    },

    toCsv(rows = []) {
        if (typeof App !== 'undefined' && typeof App.toCsv === 'function') {
            return App.toCsv(rows);
        }
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

    getTemplateOptions() {
        const products = [
            'AI Agents',
            'Campaign Manager',
            'Agent Assist',
            'Journey Builder',
            'Personalize',
            'Voice AI',
            'Other'
        ];

        const options = {
            activityCategories: ['external', 'internal'],
            externalActivityTypes: ['customerCall', 'sow', 'poc', 'rfx', 'pricing'],
            internalActivityTypes: [
                'Enablement',
                'Video Creation',
                'Webinar',
                'Event/Booth Hosting',
                'Product Feedback',
                'Content Creation',
                'Training',
                'Documentation',
                'Internal Meeting',
                'Other'
            ],
            callTypes: [
                'Demo',
                'Discovery',
                'Scoping Deep Dive',
                'Follow-up',
                'Q&A',
                'Internal Kickoff',
                'Customer Kickoff'
            ],
            pocAccessTypes: [
                'Sandbox',
                'Custom POC - Structured Journey',
                'Custom POC - Agentic',
                'Custom POC - Commerce',
                'Other'
            ],
            rfxTypes: ['RFP', 'RFI', 'RFQ', 'Other'],
            channels: ['WhatsApp', 'Web', 'Voice', 'RCS', 'Instagram', 'Mobile SDK', 'Other'],
            useCases: ['Marketing', 'Commerce', 'Support', 'Other'],
            products,
            timeSpentTypes: ['day', 'hour'],
            industries: DataManager.getIndustries().sort((a, b) => a.localeCompare(b)),
            salesRepNames: DataManager.getGlobalSalesReps()
                .filter(rep => rep.isActive)
                .map(rep => rep.name)
                .sort((a, b) => a.localeCompare(b))
        };

        return options;
    },

    downloadTemplate(type) {
        const today = new Date().toISOString().split('T')[0];
        const normalizedType = type === 'internal' || type === 'external' ? type : null;

        if (!normalizedType) {
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Please choose either the internal or external template. Category is inferred automatically.', 'info');
            }
            return;
        }

        const options = this.getTemplateOptions();

        const headersByType = {
            external: [
            'Activity Category',
            'Date',
            'Presales Username',
            'Activity Type',
            'Account Name',
            'Project Name',
            'Sales Rep Name',
            'Sales Rep Email',
            'Industry',
            'SFDC Link',
            'Use Cases',
            'Products',
            'Channels',
            'Call Type',
            'Description / MOM',
            'POC Access Type',
            'POC Use Case Description',
            'POC Sandbox Start Date',
            'POC Sandbox End Date',
            'POC Demo Environment',
            'POC Bot Trigger URL',
            'SOW Link',
            'RFx Type',
            'RFx Submission Deadline',
            'RFx Google Folder Link',
                'RFx Notes'
            ],
            internal: [
                'Activity Category',
                'Date',
                'Presales Username',
                'Activity Type',
            'Time Spent Type',
            'Time Spent Value',
            'Internal Activity Name',
            'Internal Topic',
            'Internal Description'
            ]
        };

        const instructionRow = ['# Leave "Activity Category" blank—imports infer it from the filename. Multi-select values use a pipe (WhatsApp | Web).'];
        const sampleRow = normalizedType === 'external'
            ? [
                '# external',
                    today,
                'user.name',
                    'customerCall',
                    'Acme Corp',
                    'Acme AI Project',
                    'Jane Smith',
                    'jane.smith@example.com',
                    'IT & Software',
                    'https://sfdc.example.com/oppty/123',
                    'Marketing | Support',
                `${options.products[0]} | ${options.products[3]}`,
                    'WhatsApp | Web',
                options.callTypes[0],
                    'Initial discovery call covering scope and next steps',
                options.pocAccessTypes[0],
                'Outline demo scope and success criteria',
                today,
                today,
                    '',
                    '',
                    '',
                options.rfxTypes[0],
                today,
                'https://drive.google.com/folder/abc',
                'Include pricing assumptions and dependencies'
                ]
            : [
                '# internal',
                    today,
                'user.name',
                options.internalActivityTypes[0],
                options.timeSpentTypes[1],
                    '2',
                    'Enablement Session',
                    'AI Agent Updates',
                    'Prepared deck for upcoming enablement session'
            ];

        const rows = [
            headersByType[normalizedType],
            instructionRow,
            sampleRow,
            ['# Rows beginning with "#" are ignored during import.']
        ];

        const csv = this.toCsv(rows);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = normalizedType === 'external'
            ? 'pams_external_activities_template.csv'
            : 'pams_internal_activities_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    downloadLookupReference() {
        const options = this.getTemplateOptions();
        const today = new Date().toISOString().split('T')[0];

        const rows = [
            [`# Field value reference generated ${today}`],
            ['Field', 'Allowed Values'],
            ['Activity Category', options.activityCategories.join(' | ')],
            ['External Activity Type', options.externalActivityTypes.join(' | ')],
            ['Internal Activity Type', options.internalActivityTypes.join(' | ')],
            ['Call Type', options.callTypes.join(' | ')],
            ['POC Access Type', options.pocAccessTypes.join(' | ')],
            ['RFx Type', options.rfxTypes.join(' | ')],
            ['Channels', options.channels.join(' | ')],
            ['Use Cases', options.useCases.join(' | ')],
            ['Products', options.products.join(' | ')],
            ['Time Spent Type', options.timeSpentTypes.join(' | ')],
            ['Industries', options.industries.length ? options.industries.join(' | ') : 'Add industries in Admin'],
            ['Sales Rep Name', options.salesRepNames.length ? options.salesRepNames.join(' | ') : 'Add active sales reps in Admin']
        ];

        const csv = this.toCsv(rows);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pams_field_value_reference.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    handleFileSelection(file) {
        this.reset();
        if (!file) {
            return;
        }
        this.state.file = file;
        const fileName = (file.name || '').toLowerCase();
        if (fileName.includes('internal')) {
            this.state.categoryHint = 'internal';
        } else if (fileName.includes('external')) {
            this.state.categoryHint = 'external';
        } else {
            this.state.categoryHint = '';
        }
        this.dryRunBtn.disabled = false;
    },

    runDryRun() {
        if (!this.state.file) return;

        const reader = new FileReader();
        this.setLoading(true);
        reader.onload = (event) => {
            const text = event.target.result;
            try {
                this.state.rows = this.parseCsv(text);
                this.processRows();
                this.renderPreview();
            } catch (error) {
                console.error('Error parsing CSV:', error);
                UI.showNotification(`Failed to parse CSV: ${error.message}`, 'error');
                this.reset();
            } finally {
                this.setLoading(false);
            }
        };
        reader.onerror = () => {
            UI.showNotification('Unable to read the selected file.', 'error');
            this.setLoading(false);
        };
        reader.readAsText(this.state.file);
    },

    parseCsv(text) {
        const rows = [];
        let currentRow = [];
        let currentValue = '';
        let inQuotes = false;

        const commitValue = () => {
            currentRow.push(currentValue);
            currentValue = '';
        };

        const commitRow = () => {
            if (currentRow.length > 0 || currentValue.length > 0) {
                commitValue();
                const firstCell = currentRow[0] ? currentRow[0].trim() : '';
                if (!firstCell.startsWith('#')) {
                rows.push(currentRow);
                }
                currentRow = [];
            }
        };

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (text[i + 1] === '"') {
                        currentValue += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentValue += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    commitValue();
                } else if (char === '\n') {
                    commitRow();
                } else if (char === '\r') {
                    if (text[i + 1] === '\n') {
                        continue;
                    }
                    commitRow();
                } else {
                    currentValue += char;
                }
            }
        }
        commitRow();

        if (!rows.length) {
            throw new Error('CSV file is empty.');
        }
        return rows;
    },

    normalizeHeader(header) {
        if (!header) return '';
        const cleaned = header.trim().toLowerCase();
        const map = {
            'activity category': 'category',
            'category': 'category',
            'date': 'date',
            'presales username': 'user',
            'presales user': 'user',
            'presales user username': 'user',
            'activity type': 'activityType',
            'account name': 'account',
            'project name': 'project',
            'sales rep name': 'salesRepName',
            'sales rep email': 'salesRepEmail',
            'industry': 'industry',
            'sfdc link': 'sfdcLink',
            'use cases': 'useCases',
            'use case other': 'useCaseOther',
            'products': 'products',
            'products other': 'productsOther',
            'channels': 'channels',
            'channels other': 'channelsOther',
            'call type': 'callType',
            'description / mom': 'description',
            'description': 'description',
            'poc access type': 'pocAccessType',
            'poc use case description': 'pocUseCaseDescription',
            'poc sandbox start date': 'pocSandboxStartDate',
            'poc sandbox end date': 'pocSandboxEndDate',
            'poc demo environment': 'pocDemoEnvironment',
            'poc bot trigger url': 'pocBotTriggerUrl',
            'sow link': 'sowLink',
            'rfx type': 'rfxType',
            'rfx submission deadline': 'rfxDeadline',
            'rfx google folder link': 'rfxFolderLink',
            'rfx notes': 'rfxNotes',
            'time spent type': 'timeSpentType',
            'time spent value': 'timeSpentValue',
            'internal activity name': 'internalActivityName',
            'internal topic': 'internalTopic',
            'internal description': 'internalDescription'
        };
        return map[cleaned] || cleaned;
    },

    processRows() {
        const [headerRow, ...dataRows] = this.state.rows;
        const headers = headerRow.map(h => this.normalizeHeader(h));
        const results = [];
        const users = DataManager.getUsers();
        const accounts = DataManager.getAccounts();
        const existingActivities = DataManager.getAllActivities();
        const duplicateHash = new Set();

        const summary = {
            totalRows: 0,
            externalCount: 0,
            internalCount: 0,
            readyCount: 0,
            errorCount: 0,
            duplicateCount: 0,
            newAccounts: new Set(),
            newProjects: new Set()
        };

        dataRows.forEach((rowValues, rowIndex) => {
            const isEmpty = rowValues.every(value => !value || !value.trim());
            if (isEmpty) {
                return;
            }
            const rowObject = {};
            headers.forEach((key, idx) => {
                if (!key) return;
                rowObject[key] = rowValues[idx] !== undefined ? rowValues[idx].trim() : '';
            });

            summary.totalRows++;
            const result = this.evaluateRow(rowObject, rowIndex + 2, users, accounts, existingActivities, duplicateHash);
            results.push(result);

            if (result.category === 'external') summary.externalCount++;
            if (result.category === 'internal') summary.internalCount++;
            if (result.status === 'ready') summary.readyCount++;
            if (result.status === 'error') summary.errorCount++;
            if (result.duplicate) summary.duplicateCount++;
            if (result.newAccount) summary.newAccounts.add(result.newAccount);
            if (result.newProject) summary.newProjects.add(result.newProject);
        });

        summary.newAccounts = Array.from(summary.newAccounts).filter(Boolean);
        summary.newProjects = Array.from(summary.newProjects).filter(Boolean);

        this.state.parsedRows = results;
        this.state.summary = summary;
        this.state.errorRows = results.filter(r => r.status === 'error');
        this.state.duplicateRows = results.filter(r => r.duplicate);
    },

    evaluateRow(row, displayRowNumber, users, accounts, existingActivities, duplicateHash) {
        const errors = [];
        const warnings = [];
        const messages = [];

        let category = (row.category || '').toLowerCase();
        const hintCategory = (this.state.categoryHint || '').toLowerCase();
        if (!category && hintCategory) {
            category = hintCategory;
        }
        if (!category && row.activitytype) {
            category = this.isInternalType(row.activitytype) ? 'internal' : 'external';
        }
        if (!category) {
            errors.push('Activity Category is required (internal/external).');
        } else if (!['internal', 'external'].includes(category)) {
            errors.push('Activity Category must be either "internal" or "external".');
        }
        if (category) {
            row.category = category;
        }

        const date = row.date;
        if (!date) {
            errors.push('Date is required.');
        }

        const userIdentifier = row.user;
        const user = users.find(u => u.username.toLowerCase() === (userIdentifier || '').toLowerCase());
        if (!user) {
            errors.push('Presales Username not found.');
        }

        if (category === 'internal') {
            return this.evaluateInternalRow(row, {errors, warnings, messages, user, date, displayRowNumber});
        }

        return this.evaluateExternalRow(row, {
            errors,
            warnings,
            messages,
            user,
            date,
            displayRowNumber,
            accounts,
            existingActivities,
            duplicateHash
        });
    },

    evaluateInternalRow(row, context) {
        const { errors, warnings, messages, user, date, displayRowNumber } = context;
        const activityType = row.activitytype || '';
        if (!activityType) {
            errors.push('Activity Type is required for internal rows.');
        }
        const timeSpentType = (row.timespenttype || '').toLowerCase();
        const timeSpentValue = row.timespentvalue;
        if (timeSpentType && !['day', 'days', 'hour', 'hours'].includes(timeSpentType)) {
            warnings.push('Time Spent Type should be "day" or "hour".');
        }
        if (timeSpentValue && isNaN(Number(timeSpentValue))) {
            warnings.push('Time Spent Value must be numeric.');
        }

        const payload = {
            category: 'internal',
            displayRowNumber,
            user,
            date,
            activityType: activityType,
            timeSpentType: timeSpentType.startsWith('day') ? 'day' : timeSpentType.startsWith('hour') ? 'hour' : '',
            timeSpentValue: timeSpentValue ? Number(timeSpentValue) : '',
            activityName: row.internalactivityname || '',
            topic: row.internaltopic || '',
            description: row.internaldescription || ''
        };

        const status = errors.length ? 'error' : 'ready';
        return {
            index: displayRowNumber,
            category: 'internal',
            status,
            duplicate: false,
            messages: [...errors, ...warnings, ...messages],
            errors,
            warnings,
            payload
        };
    },

    evaluateExternalRow(row, context) {
        const {
            errors,
            warnings,
            messages,
            user,
            date,
            displayRowNumber,
            accounts,
            existingActivities,
            duplicateHash
        } = context;

        const accountName = row.account;
        const projectName = row.project;
        const activityTypeRaw = row.activitytype;

        if (!accountName) errors.push('Account Name is required for external rows.');
        if (!projectName) errors.push('Project Name is required for external rows.');
        if (!activityTypeRaw) errors.push('Activity Type is required for external rows.');

        const activityType = this.normalizeExternalActivityType(activityTypeRaw);
        if (!activityType) {
            errors.push(`Activity Type "${activityTypeRaw}" is not recognized.`);
        }

        const callDescription = row.description;
        if (activityType === 'customerCall' && !callDescription) {
            errors.push('Description is required for Customer Call activities.');
        }

        const matchedAccount = this.findAccount(accounts, accountName);
        const matchedProject = matchedAccount && this.findProject(matchedAccount, projectName);
        const salesRepName = row.salesrepname || (matchedAccount ? matchedAccount.salesRep : '');
        const salesRepEmail = row.salesrepemail || '';
        const industry = row.industry || matchedAccount?.industry || '';

        const useCases = this.parseMulti(row.usecases);
        const products = this.parseMulti(row.products);
        const channels = this.parseMulti(row.channels);

        const duplicateKey = `${(accountName || '').toLowerCase()}|${(projectName || '').toLowerCase()}|${date}|${activityType || ''}`;
        let duplicate = false;
        if (duplicateHash.has(duplicateKey)) {
            duplicate = true;
            messages.push('Duplicate detected within the import file.');
        } else {
            duplicateHash.add(duplicateKey);
            const existing = existingActivities.find(a =>
                !a.isInternal &&
                (a.accountName || '').toLowerCase() === (accountName || '').toLowerCase() &&
                (a.projectName || '').toLowerCase() === (projectName || '').toLowerCase() &&
                (a.date || '').substring(0, 10) === (date || '').substring(0, 10) &&
                (a.type || '') === activityType
            );
            if (existing) {
                duplicate = true;
                messages.push('Existing activity with same account, project, date, and type detected.');
            }
        }

        const payload = {
            category: 'external',
            displayRowNumber,
            user,
            date,
            activityType,
            accountName,
            projectName,
            salesRepName,
            salesRepEmail,
            industry,
            sfdcLink: row.sfdclink || '',
            useCases,
            useCaseOther: row.usecaseother || '',
            products,
            productsOther: row.productsother || '',
            channels,
            channelsOther: row.channelsother || '',
            callType: row.calltype || '',
            description: callDescription || '',
            pocAccessType: row.pocaccesstype || '',
            pocUseCaseDescription: row.pocusecasedescription || '',
            pocSandboxStartDate: row.pocsandboxstartdate || '',
            pocSandboxEndDate: row.pocsandboxenddate || '',
            pocDemoEnvironment: row.pocdemoenvironment || '',
            pocBotTriggerUrl: row.pocbottriggerurl || '',
            sowLink: row.sowlink || '',
            rfxType: row.rfxtype || '',
            rfxDeadline: row.rfxdeadline || '',
            rfxFolderLink: row.rfxfolderlink || '',
            rfxNotes: row.rfxnotes || '',
            newAccount: matchedAccount ? null : accountName,
            newProject: matchedProject ? null : `${accountName} › ${projectName}`
        };

        const status = errors.length ? 'error' : duplicate ? 'duplicate' : 'ready';
        if (duplicate && !errors.length) {
            warnings.push('Row flagged as duplicate and will not be imported until resolved.');
        }

        return {
            index: displayRowNumber,
            category: 'external',
            status,
            duplicate,
            messages: [...errors, ...warnings, ...messages],
            errors,
            warnings,
            payload,
            newAccount: payload.newAccount,
            newProject: payload.newProject
        };
    },

    isInternalType(type) {
        if (!type) return false;
        const internalTypes = [
            'enablement',
            'video creation',
            'webinar',
            'event/booth hosting',
            'product feedback',
            'content creation',
            'training',
            'documentation',
            'internal meeting',
            'other'
        ];
        return internalTypes.includes(type.toLowerCase());
    },

    normalizeExternalActivityType(type) {
        if (!type) return '';
        const cleaned = type.trim().toLowerCase();
        const map = {
            'customer call': 'customerCall',
            'customercall': 'customerCall',
            'customer_call': 'customerCall',
            'call': 'customerCall',
            'sow': 'sow',
            'statement of work': 'sow',
            'poc': 'poc',
            'proof of concept': 'poc',
            'rfx': 'rfx',
            'rfp': 'rfx',
            'pricing': 'pricing'
        };
        return map[cleaned] || '';
    },

    parseMulti(value) {
        if (!value) return [];
        return value
            .split(/\||,|;/)
            .map(item => item.trim())
            .filter(Boolean);
    },

    findAccount(accounts, accountName) {
        if (!accountName) return null;
        return accounts.find(a => (a.name || '').toLowerCase() === accountName.toLowerCase()) || null;
    },

    findProject(account, projectName) {
        if (!account || !projectName) return null;
        return (account.projects || []).find(p => (p.name || '').toLowerCase() === projectName.toLowerCase()) || null;
    },

    renderPreview() {
        if (!this.previewSection) return;
        this.previewSection.classList.remove('hidden');
        this.commitSection && this.commitSection.classList.add('hidden');

        const rows = this.state.parsedRows;
        if (this.previewTableBody) {
            this.renderPreviewTable();
        }

        if (this.summaryContainer && this.state.summary) {
            const summary = this.state.summary;
            this.summaryContainer.innerHTML = `
                <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
                    <div><strong>Total rows:</strong> ${summary.totalRows}</div>
                    <div><strong>External:</strong> ${summary.externalCount}</div>
                    <div><strong>Internal:</strong> ${summary.internalCount}</div>
                    <div><strong>Ready:</strong> ${summary.readyCount}</div>
                    <div><strong>Errors:</strong> ${summary.errorCount}</div>
                    <div><strong>Duplicates:</strong> ${summary.duplicateCount}</div>
                </div>
                ${summary.newAccounts.length ? `<p style="margin-top: 1rem;"><strong>New accounts to be created:</strong> ${summary.newAccounts.join(', ')}</p>` : ''}
                ${summary.newProjects.length ? `<p><strong>New projects to be created:</strong> ${summary.newProjects.join(', ')}</p>` : ''}
            `;
        }

        if (this.downloadErrorsBtn) {
            this.downloadErrorsBtn.style.display = this.state.errorRows.length ? 'inline-flex' : 'none';
        }

        const canCommit = rows.some(row => row.status === 'ready');
        this.confirmBtn && (this.confirmBtn.disabled = !canCommit);
        if (this.previewFilter) {
            this.previewFilter.value = this.state.previewFilter || 'all';
        }
        this.renderIssuesPanel();
        if (typeof App !== 'undefined' && App.setPendingDuplicateAlerts) {
            if (this.state.duplicateRows.length) {
                App.setPendingDuplicateAlerts(this.state.duplicateRows);
                if (App.currentView === 'activities') {
                    App.loadActivitiesView();
                }
            } else if (App.clearPendingDuplicateAlerts) {
                App.clearPendingDuplicateAlerts();
                if (App.currentView === 'activities') {
                    App.loadActivitiesView();
                }
            }
        }
    },

    renderPreviewTable() {
        if (!this.previewTableBody) return;
        const filter = this.state.previewFilter || 'all';
        const rows = this.state.parsedRows.filter(row => {
            if (filter === 'ready') return row.status === 'ready';
            if (filter === 'error') return row.status === 'error';
            if (filter === 'duplicate') return row.duplicate === true;
            return true;
        });

        if (!rows.length) {
            this.previewTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-muted">No rows match the selected filter.</td>
                </tr>
            `;
            return;
        }

        this.previewTableBody.innerHTML = rows.map(row => `
            <tr class="${row.status === 'error' ? 'text-danger' : row.duplicate ? 'text-warning' : ''}">
                <td>${row.index}</td>
                <td>${row.category}</td>
                <td>${row.payload?.accountName || ''}</td>
                <td>${row.payload?.projectName || ''}</td>
                <td>${row.payload?.activityType || ''}</td>
                <td>${row.payload?.date || ''}</td>
                <td>${row.status.toUpperCase()}</td>
                <td>${row.messages.join('<br>')}</td>
            </tr>
        `).join('');
    },

    renderIssuesPanel() {
        if (!this.issuesPanel || !this.issuesPanelBody) return;
        const hasErrors = this.state.errorRows.length > 0;
        const hasDuplicates = this.state.duplicateRows.length > 0;

        if (!hasErrors && !hasDuplicates) {
            this.issuesPanel.style.display = 'none';
            this.issuesPanelBody.innerHTML = '';
            return;
        }

        const errorList = hasErrors
            ? `<div><strong>Errors (${this.state.errorRows.length}):</strong><ul style="margin-top: 0.5rem;">${this.state.errorRows.slice(0, 10).map(row => `
                    <li>Row ${row.index}: ${row.messages.join(' • ')}</li>
                `).join('')}</ul>${this.state.errorRows.length > 10 ? '<p class="text-muted" style="font-size: 0.8rem;">Download the error log for the full list.</p>' : ''}</div>`
            : '';

        const duplicateList = hasDuplicates
            ? `<div style="${hasErrors ? 'margin-top: 1rem;' : ''}"><strong>Duplicates (${this.state.duplicateRows.length}):</strong><ul style="margin-top: 0.5rem;">${this.state.duplicateRows.slice(0, 10).map(row => `
                    <li>Row ${row.index}: ${row.payload?.accountName || 'Unknown account'} › ${row.payload?.projectName || 'Unknown project'} (${row.payload?.date || 'Unknown date'})</li>
                `).join('')}</ul>${this.state.duplicateRows.length > 10 ? '<p class="text-muted" style="font-size: 0.8rem;">Only the first 10 duplicates are shown here.</p>' : ''}</div>`
            : '';

        this.issuesPanelBody.innerHTML = `${errorList}${duplicateList}`;
        this.issuesPanel.style.display = 'block';
    },

    setLoading(isLoading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        }
        if (this.dryRunBtn) this.dryRunBtn.disabled = isLoading || !this.state.file;
        if (this.confirmBtn) this.confirmBtn.disabled = true;
    },

    downloadErrors() {
        if (!this.state.errorRows.length) return;

        const header = ['Row', 'Category', 'Account', 'Project', 'Activity Type', 'Messages'];
        const rows = this.state.errorRows.map(row => [
            row.index,
            row.category,
            row.payload?.accountName || '',
            row.payload?.projectName || '',
            row.payload?.activityType || '',
            row.messages.join(' | ')
        ]);

        const csv = this.toCsv([header, ...rows]);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pams_import_errors.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    commitImport() {
        const readyRows = this.state.parsedRows.filter(row => row.status === 'ready');
        if (!readyRows.length) {
            UI.showNotification('No rows ready for import.', 'error');
            return;
        }

        let externalCount = 0;
        let internalCount = 0;
        let createdAccounts = 0;
        let createdProjects = 0;

        readyRows.forEach(row => {
            if (row.category === 'external') {
                const result = this.commitExternalRow(row.payload);
                externalCount++;
                createdAccounts += result.newAccount ? 1 : 0;
                createdProjects += result.newProject ? 1 : 0;
            } else if (row.category === 'internal') {
                this.commitInternalRow(row.payload);
                internalCount++;
            }
        });

        this.state.committed = true;
        this.renderCommitSummary({ externalCount, internalCount, createdAccounts, createdProjects });
        App.loadDashboard();
        App.loadActivitiesView();
        UI.showNotification(`Imported ${externalCount + internalCount} activities successfully.`, 'success');
        if (typeof App !== 'undefined' && App.clearPendingDuplicateAlerts) {
            App.clearPendingDuplicateAlerts();
        }
    },

    commitExternalRow(payload) {
        const accounts = DataManager.getAccounts();
        let account = this.findAccount(accounts, payload.accountName);
        let newAccountCreated = false;
        if (!account) {
            account = DataManager.addAccount({
                name: payload.accountName,
                industry: payload.industry || '',
                salesRep: payload.salesRepName || '',
                createdBy: payload.user.id
            });
            newAccountCreated = true;
            accounts.push(account);
        } else {
            if (payload.industry && payload.industry !== account.industry) {
                account.industry = payload.industry;
            }
            if (payload.salesRepName && payload.salesRepName !== account.salesRep) {
                account.salesRep = payload.salesRepName;
            }
            DataManager.saveAccounts(accounts);
        }

        let project = this.findProject(account, payload.projectName);
        let newProjectCreated = false;
        if (!project) {
            project = DataManager.addProject(account.id, {
                name: payload.projectName,
                sfdcLink: payload.sfdcLink || '',
                useCases: this.normalizeMultiValues(payload.useCases, payload.useCaseOther),
                productsInterested: this.normalizeMultiValues(payload.products, payload.productsOther),
                channels: this.normalizeMultiValues(payload.channels, payload.channelsOther),
                createdBy: payload.user.id
            });
            newProjectCreated = true;
            if (!Array.isArray(account.projects)) account.projects = [];
            account.projects.push(project);
        } else {
            if (payload.sfdcLink) project.sfdcLink = payload.sfdcLink;
            const accountsList = DataManager.getAccounts();
            const accountRef = accountsList.find(a => a.id === account.id);
            if (accountRef && accountRef.projects) {
                const projectRef = accountRef.projects.find(p => p.id === project.id);
                if (projectRef) {
                    if (payload.useCases.length || payload.useCaseOther) {
                        projectRef.useCases = this.normalizeMultiValues(payload.useCases, payload.useCaseOther);
                    }
                    if (payload.products.length || payload.productsOther) {
                        projectRef.productsInterested = this.normalizeMultiValues(payload.products, payload.productsOther);
                    }
                    if (payload.channels.length || payload.channelsOther) {
                        projectRef.channels = this.normalizeMultiValues(payload.channels, payload.channelsOther);
                    }
                    Object.assign(project, projectRef);
                }
                DataManager.saveAccounts(accountsList);
            }
        }

        const activity = {
            userId: payload.user.id,
            userName: payload.user.username,
            accountId: account.id,
            accountName: account.name,
            projectId: project.id,
            projectName: project.name,
            date: payload.date,
            type: payload.activityType,
            salesRep: payload.salesRepName || account.salesRep || '',
            industry: payload.industry || account.industry || '',
            details: {}
        };

        if (payload.activityType === 'customerCall') {
            activity.details = {
                callType: payload.callType || '',
                description: payload.description || ''
            };
        } else if (payload.activityType === 'sow') {
            activity.details = {
                sowLink: payload.sowLink || ''
            };
        } else if (payload.activityType === 'poc') {
            activity.details = {
                accessType: payload.pocAccessType || '',
                useCaseDescription: payload.pocUseCaseDescription || '',
                startDate: payload.pocSandboxStartDate || '',
                endDate: payload.pocSandboxEndDate || '',
                demoEnvironment: payload.pocDemoEnvironment || '',
                botTriggerUrl: payload.pocBotTriggerUrl || ''
            };
        } else if (payload.activityType === 'rfx') {
            activity.details = {
                rfxType: payload.rfxType || '',
                submissionDeadline: payload.rfxDeadline || '',
                googleFolderLink: payload.rfxFolderLink || '',
                notes: payload.rfxNotes || ''
            };
        } else if (payload.activityType === 'pricing') {
            activity.details = {};
        }

        DataManager.addActivity(activity);

        const accountsList = DataManager.getAccounts();
        const accountRef = accountsList.find(a => a.id === account.id);
        if (accountRef) {
            const projectRef = accountRef.projects?.find(p => p.id === project.id);
            if (projectRef) {
                if (!Array.isArray(projectRef.activities)) projectRef.activities = [];
                projectRef.activities.push(activity);
                DataManager.saveAccounts(accountsList);
            }
        }

        return { newAccount: newAccountCreated, newProject: newProjectCreated };
    },

    commitInternalRow(payload) {
        const activity = {
            userId: payload.user.id,
            userName: payload.user.username,
            date: payload.date,
            type: payload.activityType,
            timeSpent: payload.timeSpentType && payload.timeSpentValue
                ? `${payload.timeSpentValue} ${payload.timeSpentType === 'day' ? 'day(s)' : 'hour(s)'}`
                : null,
            activityName: payload.activityName || '',
            topic: payload.topic || '',
            description: payload.description || '',
            isInternal: true
        };
        DataManager.addInternalActivity(activity);
    },

    normalizeMultiValues(values, otherText) {
        let items = Array.isArray(values)
            ? values.filter(Boolean).map(item => item.trim()).filter(Boolean)
            : [];

        const lowerItems = items.map(item => item.toLowerCase());
        if (otherText) {
            const formattedOther = `Other: ${otherText}`;
            if (lowerItems.some(item => item === 'other' || item.startsWith('other:'))) {
                items = items.map(item => {
                    const lower = item.toLowerCase();
                    if (lower === 'other' || lower.startsWith('other:')) {
                        return formattedOther;
                    }
                    return item;
                });
            } else {
                items.push(formattedOther);
            }
        }

        return Array.from(new Set(items));
    },

    renderCommitSummary({ externalCount, internalCount, createdAccounts, createdProjects }) {
        if (!this.commitSection || !this.commitSummary) return;

        this.commitSection.classList.remove('hidden');
        this.commitSummary.innerHTML = `
            <p><strong>External activities imported:</strong> ${externalCount}</p>
            <p><strong>Internal activities imported:</strong> ${internalCount}</p>
            <p><strong>New accounts created:</strong> ${createdAccounts}</p>
            <p><strong>New projects created:</strong> ${createdProjects}</p>
        `;
    },

    toCsv(rows = []) {
        return rows.map(row => row.map(value => {
            if (value === null || value === undefined) return '';
            const text = String(value);
            return /[",\n]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
        }).join(',')).join('\r\n');
    }
};

if (typeof window !== 'undefined') {
    window.BulkImport = BulkImport;
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('importFileInput')) {
            BulkImport.init();
        }
    });
}

