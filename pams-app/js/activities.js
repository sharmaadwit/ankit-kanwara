// Activities Management Module

// Common Products List (avoid code duplication)
const COMMON_PRODUCTS = [
    'AI Agents',
    'Campaign Manager',
    'Agent Assist',
    'Journey Builder',
    'Personalize',
    'Voice AI',
    'WA Voice',
    'Advertise',
    'Other'
];

const Activities = {
    selectedUseCases: [],
    selectedChannels: [],
    selectedProjectProducts: [],
    editingContext: null,
    activityType: null, // 'internal' or 'external'
    allAccounts: [],
    currentProjectOptions: [],
    currentSalesRepRegion: null,

    /** Build 4 (FB4): Remember last activity date per user. Use browser localStorage only (not remote) – device-specific, avoid 404. */
    _getLocalStorage() {
        if (typeof window !== 'undefined' && window.__BROWSER_LOCAL_STORAGE__) {
            return window.__BROWSER_LOCAL_STORAGE__;
        }
        return typeof localStorage !== 'undefined' ? localStorage : null;
    },
    getLastActivityDateForUser(userId) {
        const store = this._getLocalStorage();
        if (!userId || !store) return null;
        try {
            return store.getItem('__pams_last_activity_date_' + userId) || null;
        } catch (e) {
            return null;
        }
    },
    setLastActivityDateForUser(userId, dateYyyyMmDd) {
        const store = this._getLocalStorage();
        if (!userId || !dateYyyyMmDd || !store) return;
        try {
            store.setItem('__pams_last_activity_date_' + userId, String(dateYyyyMmDd).slice(0, 10));
        } catch (e) { }
    },

    // Open unified activity modal
    async openActivityModal(context = {}) {
        await this.resetActivityForm();
        await this.createActivityModal();

        const {
            mode = 'create',
            activity = null,
            isInternal = false,
            fromDraftId = null,
            restoreFormData = null
        } = context || {};
        this._restoreFormDataPending = restoreFormData || null;

        const isEdit = mode === 'edit' && activity;

        this.editingContext = isEdit
            ? {
                activity: JSON.parse(JSON.stringify(activity)),
                isInternal: !!isInternal,
                originalAccountId: activity.accountId || null,
                originalProjectId: activity.projectId || null,
                fromDraftId: fromDraftId || null
            }
            : (fromDraftId ? { fromDraftId } : null);

        const modalId = 'activityModal';
        const modalTitle = document.querySelector(`#${modalId} .modal-title`);
        const submitButton = document.querySelector(`#${modalId} .modal-footer .btn-primary`);

        if (modalTitle) {
            modalTitle.textContent = isEdit ? 'Edit Activity' : 'Log Activity';
        }

        if (submitButton) {
            submitButton.textContent = isEdit ? 'Update Activity' : 'Save Activity';
        }

        const categoryRadios = document.querySelectorAll(`#${modalId} input[name="activityCategory"]`);
        categoryRadios.forEach(radio => {
            radio.checked = false;
            radio.disabled = false;
        });

        if (isEdit) {
            const desiredCategory = isInternal ? 'internal' : 'external';
            categoryRadios.forEach(radio => {
                if (radio.value !== desiredCategory) {
                    radio.disabled = true;
                }
            });
        }

        const addAnotherBtn = document.getElementById('addAnotherActivityBtn');
        if (addAnotherBtn) {
            addAnotherBtn.style.display = isEdit ? 'none' : '';
            addAnotherBtn.onclick = () => this.addAnotherActivityRow();
        }
        this.removeExtraActivityRows();

        UI.showModal(modalId);

        // Initialize use case dropdown after modal is shown
        setTimeout(async () => {
            if (this._restoreFormDataPending) {
                await this.restoreFormFromDraftFields(this._restoreFormDataPending);
                this._restoreFormDataPending = null;
            } else if ((isEdit || fromDraftId) && activity) {
                await this.populateEditForm(activity, !!isInternal);
            } else {
                const currentUser = typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser() : null;
                const lastDate = currentUser && this.getLastActivityDateForUser(currentUser.id);
                if (lastDate) {
                    const dateInput = document.getElementById('activityDate');
                    if (dateInput) dateInput.value = lastDate.slice(0, 10);
                }
                this.refreshUseCaseOptions('');
            }
            this.updateAddAnotherActivityButtonVisibility();
        }, 100);
    },

    /**
     * Restore activity form from draft (e.g. after session expired). Called when user retries from Drafts.
     */
    async restoreFormFromDraft(formData, draftId) {
        if (!formData || typeof formData !== 'object') return;
        await this.openActivityModal({
            mode: 'create',
            fromDraftId: draftId || null,
            restoreFormData: formData
        });
    },

    async restoreFormFromDraftFields(formData) {
        if (!formData) return;
        const category = formData.activityCategory || 'external';
        const categoryRadio = document.querySelector(`#activityForm input[name="activityCategory"][value="${category}"]`);
        if (categoryRadio) {
            categoryRadio.checked = true;
            await this.setActivityCategory(category);
        }
        if (category === 'internal') return;

        const accountId = formData.accountId || '';
        const accountName = formData.accountName || formData.newAccountName || '';
        const projectId = formData.projectId || '';
        const projectName = formData.projectName || formData.newProjectName || '';
        const selAcc = document.getElementById('selectedAccountId');
        const accDisp = document.getElementById('accountDisplay');
        const selProj = document.getElementById('selectedProjectId');
        const projDisp = document.getElementById('projectDisplay');
        if (selAcc) selAcc.value = accountId;
        if (accDisp) accDisp.textContent = accountName || 'Select account...';
        if (selProj) selProj.value = projectId;
        if (projDisp) projDisp.textContent = projectName || 'Select account first...';
        const newAcc = document.getElementById('newAccountName');
        const newProj = document.getElementById('newProjectName');
        if (newAcc) { newAcc.value = formData.newAccountName || ''; newAcc.closest('div') && (newAcc.closest('div').style.display = accountId === 'new' ? 'block' : 'none'); }
        if (newProj) { newProj.value = formData.newProjectName || ''; newProj.closest('div') && (newProj.closest('div').style.display = projectId === 'new' ? 'block' : 'none'); }
        const accountSection = document.getElementById('accountSection');
        const projectSection = document.getElementById('projectSection');
        if (accountSection) accountSection.classList.remove('hidden');
        if (projectSection) projectSection.classList.remove('hidden');
        if (accountId && accountId !== 'new') await this.selectAccount(accountId, accountName);
        if (projectId && projectId !== 'new') await this.selectProject(projectId, projectName);
        const industryEl = document.getElementById('industry');
        if (industryEl) {
            industryEl.value = formData.industry || '';
            const otherText = document.getElementById('industryOtherText');
            if (formData.industry === 'Other' && otherText) {
                otherText.value = formData.industryOtherText || '';
                otherText.style.display = 'block';
            }
            this.handleIndustryChange(formData.industry || '');
        }
        if (formData.salesRepRegion) {
            this.currentSalesRepRegion = formData.salesRepRegion;
            await this.populateSalesRepRegionOptions(formData.salesRepRegion);
            await this.populateSalesRepOptions(formData.salesRepRegion);
        }
        const salesRepSelect = document.getElementById('salesRepSelect');
        if (salesRepSelect && formData.salesRep) salesRepSelect.value = formData.salesRep;
        const typeSelect = document.getElementById('activityTypeSelect');
        if (typeSelect && formData.activityType) typeSelect.value = formData.activityType;
        const dateInput = document.getElementById('activityDate');
        if (dateInput && formData.date) dateInput.value = formData.date;
        if (Array.isArray(formData.selectedUseCases)) this.selectedUseCases = formData.selectedUseCases.slice();
        const callType = document.getElementById('callType');
        if (callType && formData.callType) callType.value = formData.callType;
        const callDesc = document.getElementById('callDescription');
        if (callDesc && formData.callDescription) callDesc.value = formData.callDescription;
        const sowLink = document.getElementById('sowLink');
        if (sowLink && formData.sowLink) sowLink.value = formData.sowLink;
        const rfxType = document.getElementById('rfxType');
        if (rfxType && formData.rfxType) rfxType.value = formData.rfxType;
        this.updateMultiSelectDisplay('useCaseSelected', this.selectedUseCases || []);
        this.syncMultiSelectState('useCase', this.selectedUseCases || []);
    },

    updateAddAnotherActivityButtonVisibility() {
        const btn = document.getElementById('addAnotherActivityBtn');
        if (!btn) return;
        const externalChecked = document.querySelector('input[name="activityCategory"][value="external"]')?.checked;
        const isEditing = !!this.editingContext;
        btn.style.display = externalChecked && !isEditing ? 'inline-block' : 'none';
    },

    removeExtraActivityRows() {
        const container = document.getElementById('newActivityRowsContainer');
        if (!container) return;
        const rows = container.querySelectorAll('.activity-detail-row');
        rows.forEach((row, i) => { if (i > 0) row.remove(); });
    },

    addAnotherActivityRow() {
        const container = document.getElementById('newActivityRowsContainer');
        if (!container) return;
        const rows = container.querySelectorAll('.activity-detail-row');
        const nextIndex = rows.length;
        const externalTypeOptions = `
            <option value="">Select Activity Type</option>
            <option value="customerCall">Customer Call</option>
            <option value="sow">SOW</option>
            <option value="poc">POC</option>
            <option value="rfx">RFx</option>
            <option value="pricing">Pricing</option>
            <option value="other">Other</option>
        `;
        const rowHtml = `
            <div class="activity-detail-row" data-row="${nextIndex}" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label required">Date</label>
                        <input type="date" class="form-control" id="activityDate_${nextIndex}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">Activity Type</label>
                        <select class="form-control" id="activityTypeSelect_${nextIndex}" required onchange="Activities.showActivityFieldsForRow(${nextIndex})">
                            ${externalTypeOptions}
                        </select>
                    </div>
                </div>
                <div id="activityFields_${nextIndex}" class="activity-fields-extra" style="margin-top: 0.5rem;"></div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <label class="form-label">Details / notes</label>
                    <textarea class="form-control" id="activityDetailsExtra_${nextIndex}" rows="2" placeholder="Optional notes for this activity"></textarea>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', rowHtml);
        const today = new Date().toISOString().split('T')[0];
        const dateEl = document.getElementById(`activityDate_${nextIndex}`);
        if (dateEl) dateEl.value = today;
    },

    // Show type-specific fields for an extra activity row (e.g. POC → Access Type, Customer Call → Call Type)
    showActivityFieldsForRow(rowIndex) {
        const typeSelect = document.getElementById('activityTypeSelect_' + rowIndex);
        const container = document.getElementById('activityFields_' + rowIndex);
        if (!typeSelect || !container) return;
        const type = typeSelect.value;
        const suffix = '_' + rowIndex;
        let html = '';
        if (type === 'customerCall') {
            html = this.getCustomerCallFields(suffix);
        } else if (type === 'sow') {
            html = this.getSOWFields(suffix);
        } else if (type === 'poc') {
            html = this.getPOCFields(suffix);
            setTimeout(() => this.togglePOCFields(suffix), 0);
        } else if (type === 'rfx') {
            html = this.getRFxFields(suffix);
        } else if (type === 'pricing' || type === 'other') {
            html = '';
        }
        container.innerHTML = html;
    },

    formatDateForInput(value) {
        if (!value) return '';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '';
        }
        return parsed.toISOString().split('T')[0];
    },

    async populateEditForm(activity, isInternal) {
        if (!activity) return;

        const categoryValue = isInternal ? 'internal' : 'external';
        const categoryRadio = document.querySelector(`input[name="activityCategory"][value="${categoryValue}"]`);
        if (categoryRadio) {
            categoryRadio.checked = true;
        }

        this.setActivityCategory(categoryValue);

        const dateInput = document.getElementById('activityDate');
        const formattedDate = this.formatDateForInput(activity.date || activity.createdAt);
        if (dateInput && formattedDate) {
            dateInput.value = formattedDate;
        }

        const activityTypeSelect = document.getElementById('activityTypeSelect');
        if (activityTypeSelect) {
            activityTypeSelect.value = activity.type || '';
        }

        this.showActivityFields();

        if (isInternal) {
            this.populateInternalEditFields(activity);
        } else {
            await this.populateExternalEditFields(activity);
        }
    },

    populateInternalEditFields(activity) {
        if (!activity) return;

        const timeSpent = activity.timeSpent || '';
        if (timeSpent) {
            const normalized = timeSpent.toLowerCase();
            let typeValue = '';
            if (normalized.includes('day')) {
                typeValue = 'day';
            } else if (normalized.includes('hour')) {
                typeValue = 'hour';
            }

            if (typeValue) {
                const radio = document.querySelector(`input[name="timeSpentType"][value="${typeValue}"]`);
                if (radio) {
                    radio.checked = true;
                    this.toggleTimeSpentInput();
                }

                const valueMatch = timeSpent.match(/[\d.]+/);
                if (valueMatch) {
                    const timeInput = document.getElementById('timeSpentValue');
                    if (timeInput) {
                        timeInput.value = valueMatch[0];
                    }
                }
            }
        }

        const activityNameInput = document.getElementById('internalActivityName');
        if (activityNameInput) activityNameInput.value = activity.activityName || '';

        const topicInput = document.getElementById('internalTopic');
        if (topicInput) topicInput.value = activity.topic || '';

        const descriptionInput = document.getElementById('internalDescription');
        if (descriptionInput) descriptionInput.value = activity.description || '';
    },

    async populateExternalEditFields(activity) {
        if (!activity) return;

        const desiredAccountId = activity.accountId || null;
        let accountResolved = false;

        if (desiredAccountId) {
            const account = await DataManager.getAccountById(desiredAccountId);
            if (account) {
                await this.selectAccount(account.id, account.name || activity.accountName || 'Account');
                accountResolved = true;
            }
        }

        if (!accountResolved) {
            this.prefillNewAccountForEdit(activity);
        }

        const desiredProjectId = activity.projectId || null;
        let projectResolved = false;
        const selectedAccountId = document.getElementById('selectedAccountId')?.value;

        if (selectedAccountId && selectedAccountId !== 'new' && desiredProjectId) {
            const account = await DataManager.getAccountById(selectedAccountId);
            const project = account?.projects?.find(p => p.id === desiredProjectId);
            if (project) {
                await this.selectProject(project.id, project.name || activity.projectName || 'Project');
                projectResolved = true;
            }
        }

        if (!projectResolved) {
            this.prefillNewProjectForEdit(activity);
        }

        const resolvedRegion = activity.salesRepRegion || await this.getDefaultSalesRepRegion();
        await this.populateSalesRepRegionOptions(resolvedRegion);
        await this.populateSalesRepOptions(resolvedRegion);

        const salesRepSelect = document.getElementById('salesRepSelect');
        if (salesRepSelect && activity.salesRep) {
            const desiredEmail = activity.salesRepEmail || '';
            let matchedOption = null;
            if (desiredEmail) {
                matchedOption = Array.from(salesRepSelect.options).find(option => option.value === desiredEmail);
            }
            if (!matchedOption) {
                const targetName = activity.salesRep.toLowerCase();
                matchedOption = Array.from(salesRepSelect.options).find(option => {
                    const optionName = (option.getAttribute('data-name') || option.text || '').toLowerCase();
                    return optionName === targetName;
                });
            }
            if (matchedOption) {
                salesRepSelect.value = matchedOption.value;
            }
        }

        const industrySelect = document.getElementById('industry');
        if (industrySelect && activity.industry) {
            industrySelect.value = activity.industry;
            this.handleIndustryChange(activity.industry);
        }

        this.populateExternalDetailFields(activity);
    },

    prefillNewAccountForEdit(activity) {
        const selectedAccountId = document.getElementById('selectedAccountId');
        if (selectedAccountId) selectedAccountId.value = 'new';

        const accountDisplay = document.getElementById('accountDisplay');
        if (accountDisplay) accountDisplay.textContent = activity.accountName || 'New Account';

        const newAccountFields = document.getElementById('newAccountFields');
        if (newAccountFields) newAccountFields.style.display = 'block';

        const newAccountName = document.getElementById('newAccountName');
        if (newAccountName) {
            newAccountName.required = true;
            newAccountName.value = activity.accountName || '';
        }

        const projectDisplayContainer = document.getElementById('projectDisplayContainer');
        if (projectDisplayContainer) {
            projectDisplayContainer.style.background = '';
            projectDisplayContainer.style.cursor = 'pointer';
        }

        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = 'Select or create project...';

        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = '';

        this.clearProjectFields();
    },

    prefillNewProjectForEdit(activity) {
        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = 'new';

        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = activity.projectName || 'New Project';

        const newProjectFields = document.getElementById('newProjectFields');
        if (newProjectFields) newProjectFields.style.display = 'block';

        const newProjectName = document.getElementById('newProjectName');
        if (newProjectName) {
            newProjectName.required = true;
            newProjectName.value = activity.projectName || '';
        }

        const sfdcLinkInput = document.getElementById('sfdcLink');
        const noSfdcLinkCheckbox = document.getElementById('noSfdcLink');
        if (sfdcLinkInput && noSfdcLinkCheckbox) {
            if (activity.sfdcLink) {
                noSfdcLinkCheckbox.checked = false;
                sfdcLinkInput.style.display = 'block';
                sfdcLinkInput.value = activity.sfdcLink;
            } else {
                noSfdcLinkCheckbox.checked = true;
                sfdcLinkInput.style.display = 'none';
                sfdcLinkInput.value = '';
            }
        }

        this.selectedUseCases = [];
        this.selectedProjectProducts = [];
        this.selectedChannels = [];
        this.updateMultiSelectDisplay('useCaseSelected', []);
        this.updateMultiSelectDisplay('projectProductsSelected', []);
        this.updateMultiSelectDisplay('channelsSelected', []);
    },

    populateExternalDetailFields(activity) {
        if (!activity) return;
        const details = activity.details || {};

        if (activity.type === 'customerCall') {
            const callType = document.getElementById('callType');
            if (callType && details.callType) {
                callType.value = details.callType;
            }
            const description = document.getElementById('callDescription');
            if (description) {
                description.value = details.description || '';
            }
        } else if (activity.type === 'sow') {
            const sowLink = document.getElementById('sowLink');
            if (sowLink) {
                sowLink.value = details.sowLink || '';
            }
        } else if (activity.type === 'poc') {
            const accessType = document.getElementById('accessType');
            if (accessType && details.accessType) {
                accessType.value = details.accessType;
                this.togglePOCFields();
            }

            const useCaseDescription = document.getElementById('useCaseDescription');
            if (useCaseDescription) {
                useCaseDescription.value = details.useCaseDescription || '';
            }

            const startDate = document.getElementById('pocStartDate');
            if (startDate && details.startDate) {
                startDate.value = this.formatDateForInput(details.startDate);
            }

            const endDate = document.getElementById('pocEndDate');
            if (endDate && details.endDate) {
                endDate.value = this.formatDateForInput(details.endDate);
            }

            const demoEnvironment = document.getElementById('demoEnvironment');
            if (demoEnvironment && details.demoEnvironment) {
                demoEnvironment.value = details.demoEnvironment;
            }

            const botTriggerUrl = document.getElementById('botTriggerUrl');
            if (botTriggerUrl && details.botTriggerUrl) {
                botTriggerUrl.value = details.botTriggerUrl;
            }
        } else if (activity.type === 'rfx') {
            const rfxType = document.getElementById('rfxType');
            if (rfxType && details.rfxType) {
                rfxType.value = details.rfxType;
            }

            const submissionDeadline = document.getElementById('submissionDeadline');
            if (submissionDeadline && details.submissionDeadline) {
                submissionDeadline.value = this.formatDateForInput(details.submissionDeadline);
            }

            const googleFolderLink = document.getElementById('googleFolderLink');
            if (googleFolderLink) {
                googleFolderLink.value = details.googleFolderLink || '';
            }

            const notes = document.getElementById('rfxNotes');
            if (notes) {
                notes.value = details.notes || '';
            }
        }
    },

    closeActivityModal() {
        this.editingContext = null;
        const categoryRadios = document.querySelectorAll('#activityModal input[name="activityCategory"]');
        categoryRadios.forEach(radio => {
            radio.disabled = false;
        });
        UI.hideModal('activityModal');
    },

    // Create unified activity modal HTML
    async createActivityModal() {
        const container = document.getElementById('modalsContainer');
        const modalId = 'activityModal';

        if (document.getElementById(modalId)) return; // Already exists

        const industries = await DataManager.getIndustries();
        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2 class="modal-title">Log Activity</h2>
                        <button class="modal-close" onclick="Activities.closeActivityModal()">&times;</button>
                    </div>
                    <form id="activityForm" onsubmit="Activities.saveActivity(event)">
                        <!-- SECTION 1: Activity Type (Internal/External) -->
                        <div class="form-section">
                            <h3>Activity Type</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label required">Select Activity Category</label>
                                    <div class="radio-group">
                                        <label class="radio-label">
                                            <input type="radio" name="activityCategory" value="internal" onchange="Activities.setActivityCategory('internal')" required>
                                            <span>Internal Activity</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="activityCategory" value="external" onchange="Activities.setActivityCategory('external')" required>
                                            <span>External Activity</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SECTION 2: Account Section (Only for External) -->
                        <div id="accountSection" class="form-section hidden">
                            <h3>Account Information</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label required">Account Name</label>
                                    <div class="search-select-container" style="position: relative;">
                                        <div class="form-control" style="display: flex; align-items: center; cursor: pointer; position: relative;" onclick="event.stopPropagation(); Activities.toggleAccountDropdown()">
                                            <span id="accountDisplay" style="flex: 1;">Select account...</span>
                                            <span style="margin-left: 0.5rem;">▼</span>
                                        </div>
                                        <div class="search-select-dropdown" id="accountDropdown" style="display: none; position: absolute; z-index: 1000; width: 100%;">
                                            <!-- Will be populated by loadAccountDropdown() -->
                                        </div>
                                    </div>
                                    <input type="hidden" id="selectedAccountId">
                                    <div id="newAccountFields" style="margin-top: 0.5rem; display: none;">
                                        <input type="text" class="form-control" id="newAccountName" placeholder="Account Name" style="margin-bottom: 0.5rem;">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label required">Sales Region</label>
                                    <select class="form-control" id="salesRepRegionSelect" data-was-required="true" required onchange="Activities.handleSalesRepRegionChange(this.value)">
                                        <option value="">Select region...</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label required">Sales Rep</label>
                                    <select class="form-control" id="salesRepSelect" data-was-required="true" required>
                                        <option value="">Select Sales Rep...</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label required">Industry</label>
                                    <select class="form-control" id="industry" data-was-required="true" required onchange="Activities.handleIndustryChange(this.value)">
                                        <option value="">Select Industry</option>
                                        ${(industries || []).map(ind => `<option value="${ind}">${ind}</option>`).join('')}
                                        <option value="Other">Other</option>
                                    </select>
                                    <input type="text" class="form-control" id="industryOtherText" placeholder="Specify industry..." style="margin-top: 0.5rem; display: none;">
                                </div>
                            </div>
                        </div>

                        <!-- SECTION 3: Project Section (Only for External) -->
                        <div id="projectSection" class="form-section hidden">
                            <h3>Project Information</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label required">Project Name</label>
                                    <div class="search-select-container" style="position: relative;">
                                        <div class="form-control" id="projectDisplayContainer" style="display: flex; align-items: center; cursor: pointer; position: relative; background: #e5e7eb; cursor: not-allowed;" onclick="event.stopPropagation(); Activities.toggleProjectDropdown()">
                                            <span id="projectDisplay" style="flex: 1;">Select account first...</span>
                                            <span style="margin-left: 0.5rem;">▼</span>
                                        </div>
                                        <div class="search-select-dropdown" id="projectDropdown" style="display: none; position: absolute; z-index: 2100; width: 100%;">
                                            <!-- Will be populated by loadProjectDropdown() -->
                                        </div>
                                    </div>
                                    <input type="hidden" id="selectedProjectId">
                                    <div id="newProjectFields" style="margin-top: 0.5rem; display: none;">
                                        <input type="text" class="form-control" id="newProjectName" placeholder="Project Name" style="margin-bottom: 0.5rem;">
                                    </div>
                                    <div id="editProjectNameWrap" style="margin-top: 0.5rem; display: none;">
                                        <label class="form-label">Edit project name</label>
                                        <input type="text" class="form-control" id="projectNameEdit" placeholder="Project name">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">SFDC Link</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="noSfdcLink" onchange="Activities.toggleSfdcLink()">
                                            <span>No SFDC link exists</span>
                                        </label>
                                    </div>
                                    <input type="url" class="form-control" id="sfdcLink" placeholder="https://..." style="margin-top: 0.5rem;">
                                </div>
                            </div>
                            <!-- Past activities for selected project (external only) -->
                            <div id="pastActivitiesSection" class="form-section hidden" style="margin-top: 1rem;">
                                <h3 class="past-activities-header" style="cursor: pointer; user-select: none; display: flex; align-items: center; gap: 0.5rem;" onclick="Activities.togglePastActivities()">
                                    <span class="past-activities-arrow">▼</span> Past activities for this project
                                </h3>
                                <div id="pastActivitiesList" class="past-activities-list" style="display: none; margin-top: 0.5rem; max-height: 200px; overflow-y: auto;"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group" id="projectUseCasesGroup">
                                    <label class="form-label required">Primary Use Case</label>
                                    <div class="multi-select-container">
                                        <div class="multi-select-trigger" onclick="Activities.toggleMultiSelect('useCaseDropdown')">
                                            <span class="multi-select-selected" id="useCaseSelected">Select use cases...</span>
                                            <span>▼</span>
                                        </div>
                                        <div class="multi-select-dropdown" id="useCaseDropdown">
                                            <!-- Populated by refreshUseCaseOptions() -->
                                        </div>
                                    </div>
                                    <input type="text" class="form-control" id="useCaseOtherText" placeholder="Specify other use case..." style="margin-top: 0.5rem; display: none;">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Location</label>
                                    <input type="text" class="form-control" id="projectLocation" placeholder="e.g. store, region, territory (Retail & others)">
                                </div>
                            </div>
                            <div class="form-group" id="projectProductsGroup">
                                <label class="form-label required">Products Interested</label>
                                <div class="multi-select-container">
                                    <div class="multi-select-trigger" onclick="Activities.toggleMultiSelect('projectProductsDropdown')">
                                        <span class="multi-select-selected" id="projectProductsSelected">Select products...</span>
                                        <span>▼</span>
                                    </div>
                                    <div class="multi-select-dropdown" id="projectProductsDropdown">
                                        ${COMMON_PRODUCTS.map(p => `
                                            <div class="multi-select-option" onclick="Activities.toggleOption('projectProducts', '${p}')">
                                                <input type="checkbox" value="${p}"> ${p}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <input type="text" class="form-control" id="projectProductsOtherText" placeholder="Specify other product..." style="margin-top: 0.5rem; display: none;">
                            </div>
                            <div class="form-group">
                                <label class="form-label required">Channels</label>
                                <div class="multi-select-container">
                                    <div class="multi-select-trigger" onclick="Activities.toggleMultiSelect('channelsDropdown')">
                                        <span class="multi-select-selected" id="channelsSelected">Select channels...</span>
                                        <span>▼</span>
                                    </div>
                                    <div class="multi-select-dropdown" id="channelsDropdown">
                                        ${['WhatsApp', 'Web', 'Voice', 'RCS', 'Instagram', 'Mobile SDK', 'Other'].map(c => `
                                            <div class="multi-select-option" onclick="Activities.toggleOption('channels', '${c}')">
                                                <input type="checkbox" value="${c}"> ${c}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <input type="text" class="form-control" id="channelsOtherText" placeholder="Specify other channel..." style="margin-top: 0.5rem; display: none;">
                            </div>
                        </div>

                        <!-- SECTION 4: Activity Details -->
                        <div class="form-section">
                            <h3>Activity Details</h3>
                            <div id="newActivityRowsContainer">
                                <div class="activity-detail-row" data-row="0">
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <label class="form-label required">Date</label>
                                            <input type="date" class="form-control" id="activityDate" required>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label required">Activity Type</label>
                                            <select class="form-control" id="activityTypeSelect" onchange="Activities.showActivityFields()" required>
                                                <option value="">Select Activity Type</option>
                                                <!-- Options will be populated based on Internal/External -->
                                            </select>
                                        </div>
                                    </div>
                                    <div id="activityFields"></div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary" id="addAnotherActivityBtn" style="margin-top: 0.5rem; display: none;" onclick="Activities.addAnotherActivityRow()">+ Add another activity</button>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="Activities.closeActivityModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Activity</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);

        // Set default date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('activityDate');
        if (dateInput) dateInput.value = today;

        await this.populateSalesRepRegionOptions(this.currentSalesRepRegion);
        await this.populateSalesRepOptions(this.currentSalesRepRegion);
    },

    async getDefaultSalesRepRegion() {
        if (typeof DataManager === 'undefined' || typeof DataManager.getRegions !== 'function') {
            return '';
        }
        const regionsList = await DataManager.getRegions();
        const regions = Array.from(new Set((regionsList || []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        if (!regions.length) return '';
        const currentUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const preferred = currentUser?.defaultRegion;
        if (preferred && regions.includes(preferred)) return preferred;
        return regions[0];
    },

    async populateSalesRepRegionOptions(selectedRegion = null) {
        const regionSelect = document.getElementById('salesRepRegionSelect');
        if (!regionSelect || typeof DataManager === 'undefined' || typeof DataManager.getRegions !== 'function') {
            return;
        }

        const regions = await DataManager.getRegions();
        const uniqueRegions = Array.from(new Set((regions || []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const defaultRegion = selectedRegion || this.currentSalesRepRegion || await this.getDefaultSalesRepRegion();

        let options = '<option value="">Select region...</option>';
        uniqueRegions.forEach(region => {
            options += `<option value="${region}">${region}</option>`;
        });

        regionSelect.innerHTML = options;

        const hasDefault = defaultRegion && uniqueRegions.includes(defaultRegion);
        if (hasDefault) {
            regionSelect.value = defaultRegion;
        } else if (uniqueRegions.length) {
            regionSelect.value = uniqueRegions[0];
        } else {
            regionSelect.value = '';
        }

        this.currentSalesRepRegion = regionSelect.value || '';
    },

    async populateSalesRepOptions(region = null) {
        const salesRepSelect = document.getElementById('salesRepSelect');
        if (!salesRepSelect || typeof DataManager === 'undefined') {
            return;
        }

        const targetRegion = region || this.currentSalesRepRegion || await this.getDefaultSalesRepRegion();
        let reps = typeof DataManager.getSalesRepsByRegion === 'function'
            ? await DataManager.getSalesRepsByRegion(targetRegion || 'all')
            : await DataManager.getGlobalSalesReps();

        // If this region has no reps (e.g. "Inside Sales"), fall back to all reps so user can still select someone
        const usedAllReps = reps.length === 0 && targetRegion && targetRegion.toLowerCase() !== 'all' && typeof DataManager.getSalesRepsByRegion === 'function';
        if (usedAllReps) {
            reps = await DataManager.getSalesRepsByRegion('all');
        }

        let options = '<option value="">Select Sales Rep...</option>';
        if (!reps.length) {
            options += '<option value="" disabled>No active sales users for this region</option>';
            salesRepSelect.innerHTML = options;
            salesRepSelect.disabled = true;
            return;
        }

        if (usedAllReps) {
            options += '<option value="" disabled>— No reps in this region; showing all —</option>';
        }
        salesRepSelect.disabled = false;
        reps.forEach(rep => {
            options += `<option value="${rep.email}" data-name="${rep.name}">${rep.name}</option>`;
        });
        salesRepSelect.innerHTML = options;
    },

    handleSalesRepRegionChange(region) {
        this.currentSalesRepRegion = region || '';
        this.populateSalesRepOptions(this.currentSalesRepRegion || 'all').catch(() => { });
        if (typeof UI !== 'undefined' && UI.clearFieldError) {
            const regionSelect = document.getElementById('salesRepRegionSelect');
            if (regionSelect) {
                UI.clearFieldError(regionSelect);
            }
        }
        const salesRepSelect = document.getElementById('salesRepSelect');
        if (salesRepSelect) {
            salesRepSelect.value = '';
        }
    },

    // Show activity fields based on type
    showActivityFields() {
        const activityTypeSelect = document.getElementById('activityTypeSelect');
        if (!activityTypeSelect) return;

        const type = activityTypeSelect.value;
        const container = document.getElementById('activityFields');
        if (!container) return;

        // Project-level Use Cases and Products Interested: always show for external activities (project-level fields)
        const projectUseCasesGroup = document.getElementById('projectUseCasesGroup');
        const projectProductsGroup = document.getElementById('projectProductsGroup');
        const isExternal = this.activityType === 'external';
        if (projectUseCasesGroup) {
            projectUseCasesGroup.style.display = isExternal ? 'block' : 'none';
        }
        if (projectProductsGroup) {
            projectProductsGroup.style.display = isExternal ? 'block' : 'none';
        }

        let html = '';
        if (this.activityType === 'internal') {
            html = this.getInternalActivityFields();
        } else if (this.activityType === 'external') {
            if (type === 'customerCall') {
                html = this.getCustomerCallFields('');
            } else if (type === 'sow') {
                html = this.getSOWFields('');
            } else if (type === 'poc') {
                html = this.getPOCFields('');
                setTimeout(() => this.togglePOCFields(''), 0);
            } else if (type === 'rfx') {
                html = this.getRFxFields('');
            } else if (type === 'pricing') {
                html = ''; // No fields for pricing
            }
        }

        container.innerHTML = html;
    },

    // Get customer call fields (suffix = '' for main row, '_1', '_2' for extra rows)
    getCustomerCallFields(suffix = '') {
        return `
            <div class="form-group">
                <label class="form-label required">Call Type</label>
                <select class="form-control" id="callType${suffix}" required>
                    <option value="">Select Type</option>
                    <option value="Demo">Demo</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Scoping Deep Dive">Scoping Deep Dive</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Q&A">Q&A</option>
                    <option value="Internal Kickoff">Internal Kickoff</option>
                    <option value="Customer Kickoff">Customer Kickoff</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Description / MOM</label>
                <textarea class="form-control" id="callDescription${suffix}" rows="4" required placeholder="Enter description or minutes of meeting..."></textarea>
            </div>
        `;
    },

    // Get POC fields (suffix = '' for main row, '_1', '_2' for extra rows)
    getPOCFields(suffix = '') {
        return `
            <div class="form-group">
                <label class="form-label required">Access Type</label>
                <select class="form-control" id="accessType${suffix}" required onchange="Activities.togglePOCFields('${suffix}')">
                    <option value="">Select Access Type</option>
                    <option value="Sandbox">Sandbox</option>
                    <option value="Custom POC - Structured Journey">Custom POC - Structured Journey</option>
                    <option value="Custom POC - Agentic">Custom POC - Agentic</option>
                    <option value="Custom POC - Commerce">Custom POC - Commerce</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Use Case Description</label>
                <textarea class="form-control" id="useCaseDescription${suffix}" rows="3" required></textarea>
            </div>
            <!-- Sandbox Fields -->
            <div id="pocSandboxFields${suffix}" class="hidden">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label required">Start Date</label>
                        <input type="date" class="form-control" id="pocStartDate${suffix}" required onchange="Activities.setPOCEndDate('${suffix}')">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">End Date</label>
                        <input type="date" class="form-control" id="pocEndDate${suffix}" required>
                    </div>
                </div>
            </div>
            <!-- Custom POC Fields -->
            <div id="pocCustomFields${suffix}" class="hidden">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Demo Environment</label>
                        <input type="text" class="form-control" id="demoEnvironment${suffix}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bot Trigger URL/Number</label>
                        <input type="text" class="form-control" id="botTriggerUrl${suffix}" placeholder="URL or number">
                    </div>
                </div>
            </div>
        `;
    },

    // Toggle POC fields based on Access Type (suffix = '' for main row, '_1', '_2' for extra rows)
    togglePOCFields(suffix = '') {
        const accessType = document.getElementById('accessType' + suffix)?.value;
        const sandboxFields = document.getElementById('pocSandboxFields' + suffix);
        const customFields = document.getElementById('pocCustomFields' + suffix);
        const pocStartDate = document.getElementById('pocStartDate' + suffix);
        const pocEndDate = document.getElementById('pocEndDate' + suffix);

        if (accessType === 'Sandbox') {
            if (sandboxFields) sandboxFields.classList.remove('hidden');
            if (customFields) customFields.classList.add('hidden');
            if (pocStartDate) pocStartDate.setAttribute('required', 'required');
            if (pocEndDate) pocEndDate.setAttribute('required', 'required');
        } else {
            if (sandboxFields) sandboxFields.classList.add('hidden');
            if (customFields) customFields.classList.toggle('hidden', !(accessType && accessType.startsWith('Custom POC')));
            if (pocStartDate) pocStartDate.removeAttribute('required');
            if (pocEndDate) pocEndDate.removeAttribute('required');
        }
    },

    // Get SOW fields (suffix = '' for main row, '_1', '_2' for extra rows)
    getSOWFields(suffix = '') {
        return `
            <div class="form-group">
                <label class="form-label required">SOW Document Link</label>
                <input type="url" class="form-control" id="sowLink${suffix}" placeholder="https://..." required>
            </div>
        `;
    },

    // Get Internal Activity fields
    getInternalActivityFields() {
        return `
            <div class="form-group">
                <label class="form-label required">Time Spent</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="timeSpentType" value="day" onchange="Activities.toggleTimeSpentInput()">
                        <span>Day(s)</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="timeSpentType" value="hour" onchange="Activities.toggleTimeSpentInput()">
                        <span>Hour(s)</span>
                    </label>
                </div>
                <input type="number" class="form-control" id="timeSpentValue" placeholder="Enter value..." style="margin-top: 0.5rem; display: none;" min="0" step="0.5">
            </div>
            <div class="form-group">
                <label class="form-label">Activity Name</label>
                <input type="text" class="form-control" id="internalActivityName" placeholder="Enter activity name...">
            </div>
            <div class="form-group">
                <label class="form-label">Topic</label>
                <input type="text" class="form-control" id="internalTopic" placeholder="Enter topic...">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="internalDescription" rows="4" placeholder="Enter description..."></textarea>
            </div>
        `;
    },

    // Toggle time spent input
    toggleTimeSpentInput() {
        const timeSpentValue = document.getElementById('timeSpentValue');
        const selected = document.querySelector('input[name="timeSpentType"]:checked');
        if (timeSpentValue && selected) {
            timeSpentValue.style.display = 'block';
            if (selected.value === 'day') {
                timeSpentValue.placeholder = 'Enter number of days';
                timeSpentValue.step = '1';
            } else {
                timeSpentValue.placeholder = 'Enter hours';
                timeSpentValue.step = '0.5';
            }
        }
    },

    // Get RFx fields (suffix = '' for main row, '_1', '_2' for extra rows)
    getRFxFields(suffix = '') {
        return `
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label required">RFx Type</label>
                    <select class="form-control" id="rfxType${suffix}" required>
                        <option value="">Select Type</option>
                        <option value="RFP">RFP (Request for Proposal)</option>
                        <option value="RFI">RFI (Request for Information)</option>
                        <option value="RFQ">RFQ (Request for Quote)</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label required">Submission Deadline</label>
                    <input type="date" class="form-control" id="submissionDeadline${suffix}" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Google Folder Link</label>
                <input type="url" class="form-control" id="googleFolderLink${suffix}" placeholder="https://drive.google.com/...">
            </div>
            <div class="form-group">
                <label class="form-label">Additional Notes</label>
                <textarea class="form-control" id="rfxNotes${suffix}" rows="3"></textarea>
            </div>
        `;
    },

    // Multi-select functions
    toggleMultiSelect(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.classList.toggle('active');

            // Close other dropdowns
            document.querySelectorAll('.multi-select-dropdown').forEach(d => {
                if (d.id !== dropdownId) {
                    d.classList.remove('active');
                }
            });
        }
    },

    toggleOption(category, value) {
        if (typeof event !== 'undefined' && event && typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }

        let selectedArray;
        let displayId;
        let otherTextId = null;

        if (category === 'useCase') {
            selectedArray = this.selectedUseCases;
            displayId = 'useCaseSelected';
            otherTextId = 'useCaseOtherText';
        } else if (category === 'channels') {
            selectedArray = this.selectedChannels;
            displayId = 'channelsSelected';
            otherTextId = 'channelsOtherText';
        } else if (category === 'projectProducts') {
            selectedArray = this.selectedProjectProducts;
            displayId = 'projectProductsSelected';
            otherTextId = 'projectProductsOtherText';
        }

        const index = selectedArray.indexOf(value);
        const optionEl = (typeof event !== 'undefined' && event) ? event.currentTarget : null;
        const checkbox = optionEl ? optionEl.querySelector('input[type="checkbox"]') : null;

        if (index > -1) {
            selectedArray.splice(index, 1);
            // Hide other text field if "Other" is deselected
            if (value === 'Other' && otherTextId) {
                const otherText = document.getElementById(otherTextId);
                if (otherText) {
                    otherText.style.display = 'none';
                    otherText.value = '';
                    otherText.required = false;
                }
            }
        } else {
            selectedArray.push(value);
            // Show other text field if "Other" is selected
            if (value === 'Other' && otherTextId) {
                const otherText = document.getElementById(otherTextId);
                if (otherText) {
                    otherText.style.display = 'block';
                    otherText.required = true;
                    // Issue #4: Ensure focus and clear if needed
                    otherText.focus();
                }
            }
        }

        if (checkbox) {
            checkbox.checked = selectedArray.includes(value);
        }

        this.syncMultiSelectState(category, selectedArray);
        this.updateMultiSelectDisplay(displayId, selectedArray);
    },

    updateMultiSelectDisplay(displayId, selectedArray) {
        const display = document.getElementById(displayId);
        if (!display) return;

        if (selectedArray.length === 0) {
            display.textContent = displayId.includes('useCase') ? 'Select use cases...' :
                displayId.includes('products') ? 'Select products...' :
                    displayId.includes('channels') ? 'Select channels...' :
                        'Select products...';
        } else {
            display.innerHTML = selectedArray.map(item =>
                `<span class="multi-select-tag">${item}</span>`
            ).join('');
        }
    },

    syncMultiSelectState(category, selectedValues = []) {
        let dropdownId = '';
        if (category === 'useCase') {
            dropdownId = 'useCaseDropdown';
        } else if (category === 'projectProducts') {
            dropdownId = 'projectProductsDropdown';
        } else if (category === 'channels') {
            dropdownId = 'channelsDropdown';
        }

        if (!dropdownId) return;

        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = selectedValues.includes(checkbox.value);
        });
    },

    handleIndustryChange(value) {
        const otherText = document.getElementById('industryOtherText');
        if (otherText) {
            if (value === 'Other') {
                otherText.style.display = 'block';
                otherText.required = true;
            } else {
                otherText.style.display = 'none';
                otherText.value = '';
                otherText.required = false;
            }
        }
        this.refreshUseCaseOptions(value === 'Other' ? '' : value).catch(() => { });
    },

    async refreshUseCaseOptions(industry) {
        const dropdown = document.getElementById('useCaseDropdown');
        if (!dropdown) return;
        const useCases = (typeof DataManager !== 'undefined' && industry)
            ? await DataManager.getUseCasesForIndustry(industry)
            : [];
        const list = useCases.length ? useCases : ['Marketing', 'Commerce', 'Support'];
        const keepSelected = this.selectedUseCases.filter(uc => uc !== 'Other' && list.includes(uc));
        this.selectedUseCases = keepSelected;
        dropdown.innerHTML = list.map(uc => {
            const attrVal = (uc || '').replace(/"/g, '&quot;');
            return `<div class="multi-select-option" data-value="${attrVal}" onclick="Activities.toggleOption('useCase', this.getAttribute('data-value'))">
                <input type="checkbox" value="${attrVal}"> ${uc}
            </div>`;
        }).join('') + `
            <div class="multi-select-option" onclick="Activities.toggleOption('useCase', 'Other')">
                <input type="checkbox" value="Other" id="useCaseOtherCheck"> Other
            </div>`;
        this.syncMultiSelectState('useCase', this.selectedUseCases);
        this.updateMultiSelectDisplay('useCaseSelected', this.selectedUseCases);
    },

    // Load account dropdown (with inline search)
    async loadAccountDropdown() {
        const dropdown = document.getElementById('accountDropdown');
        if (!dropdown) return;

        this.allAccounts = await DataManager.getAccounts();
        const optionsHtml = this.renderAccountOptions(this.allAccounts);

        dropdown.innerHTML = `
            <div class="search-select-search">
                <input type="text"
                       class="search-select-input form-control"
                       id="accountDropdownSearch"
                       placeholder="Search accounts..."
                       oninput="Activities.filterAccountDropdown(this.value)">
            </div>
            <div id="accountDropdownList">
                ${optionsHtml}
                <div class="search-select-create" onclick="Activities.showNewAccountFields()">+ Add New Account</div>
            </div>
        `;
    },

    renderAccountOptions(accounts = []) {
        if (!accounts.length) {
            return `<div class="search-select-empty">No accounts found</div>`;
        }

        return accounts.map(account => {
            const safeName = JSON.stringify(account.name);
            return `<div class="search-select-item" data-id="${account.id}" onclick='Activities.selectAccount("${account.id}", ${safeName})'>${account.name}</div>`;
        }).join('');
    },

    async filterAccountDropdown(query = '') {
        const list = document.getElementById('accountDropdownList');
        if (!list) return;

        const normalized = query.trim().toLowerCase();
        const accounts = this.allAccounts || await DataManager.getAccounts();
        const filtered = normalized
            ? accounts.filter(acc => acc.name.toLowerCase().includes(normalized))
            : accounts;

        list.innerHTML = `
            ${this.renderAccountOptions(filtered)}
            <div class="search-select-create" onclick="Activities.showNewAccountFields()">+ Add New Account</div>
        `;
    },

    // Toggle account dropdown
    toggleAccountDropdown() {
        const dropdown = document.getElementById('accountDropdown');
        if (!dropdown) return;

        const isVisible = dropdown.style.display !== 'none';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            this.loadAccountDropdown();
            dropdown.style.display = 'block';
            dropdown.classList.add('active');

            const searchInput = document.getElementById('accountDropdownSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
        }
    },

    // Show new account fields
    showNewAccountFields() {
        const dropdown = document.getElementById('accountDropdown');
        if (dropdown) dropdown.style.display = 'none';

        const selectedAccountId = document.getElementById('selectedAccountId');
        const accountDisplay = document.getElementById('accountDisplay');
        const newAccountFields = document.getElementById('newAccountFields');
        const newAccountName = document.getElementById('newAccountName');

        if (selectedAccountId) selectedAccountId.value = 'new';
        if (accountDisplay) accountDisplay.textContent = 'New Account';
        if (newAccountFields) newAccountFields.style.display = 'block';
        if (newAccountName) {
            newAccountName.required = true;
            newAccountName.value = '';
        }

        const searchInput = document.getElementById('accountDropdownSearch');
        if (searchInput && searchInput.value.trim() && newAccountName) {
            newAccountName.value = searchInput.value.trim();
        }

        const salesRepSelect = document.getElementById('salesRepSelect');
        if (salesRepSelect) {
            salesRepSelect.value = '';
        }
        const industrySelect = document.getElementById('industry');
        if (industrySelect) {
            industrySelect.value = '';
        }

        const projectDisplayContainer = document.getElementById('projectDisplayContainer');
        if (projectDisplayContainer) {
            projectDisplayContainer.style.background = '';
            projectDisplayContainer.style.cursor = 'pointer';
            projectDisplayContainer.removeAttribute('disabled');
        }
        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = 'Select or create project...';

        // Reset project selection state for new account
        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = '';
        const newProjectFields = document.getElementById('newProjectFields');
        if (newProjectFields) newProjectFields.style.display = 'none';
        const newProjectName = document.getElementById('newProjectName');
        if (newProjectName) {
            newProjectName.value = '';
            newProjectName.required = false;
        }
        this.clearProjectFields();
    },

    async selectAccount(id, name) {
        const selectedAccountId = document.getElementById('selectedAccountId');
        const accountDisplay = document.getElementById('accountDisplay');
        const accountDropdown = document.getElementById('accountDropdown');
        const newAccountFields = document.getElementById('newAccountFields');
        const newAccountName = document.getElementById('newAccountName');

        if (selectedAccountId) selectedAccountId.value = id;
        if (accountDisplay) accountDisplay.textContent = name;
        if (accountDropdown) accountDropdown.style.display = 'none';
        if (newAccountFields) newAccountFields.style.display = 'none';
        if (newAccountName) {
            newAccountName.required = false;
            newAccountName.value = '';
        }
        this.clearProjectFields();

        // Auto-populate Sales Rep and Industry from account
        const account = await DataManager.getAccountById(id);
        if (account) {
            const accountRegion = account.salesRepRegion || await this.getDefaultSalesRepRegion();
            await this.populateSalesRepRegionOptions(accountRegion);
            await this.populateSalesRepOptions(accountRegion);

            const salesRepSelect = document.getElementById('salesRepSelect');
            const industrySelect = document.getElementById('industry');

            if (salesRepSelect && account.salesRep) {
                const resolvedEmail = account.salesRepEmail || (await (async () => {
                    const rep = typeof DataManager.getGlobalSalesRepByName === 'function'
                        ? await DataManager.getGlobalSalesRepByName(account.salesRep)
                        : null;
                    return rep?.email || '';
                })());
                if (resolvedEmail) {
                    const option = Array.from(salesRepSelect.options).find(opt => opt.value === resolvedEmail);
                    if (option) {
                        salesRepSelect.value = resolvedEmail;
                    }
                }
            }
            if (industrySelect && account.industry) {
                const standardIndustries = (typeof DataManager.getIndustries === 'function' ? await DataManager.getIndustries() : []) || [];
                const isCustomIndustry = !standardIndustries.includes(account.industry);
                if (isCustomIndustry) {
                    industrySelect.value = 'Other';
                    const industryOtherText = document.getElementById('industryOtherText');
                    if (industryOtherText) {
                        industryOtherText.value = account.industry;
                        industryOtherText.style.display = 'block';
                        industryOtherText.required = true;
                    }
                    this.handleIndustryChange('Other');
                } else {
                    industrySelect.value = account.industry;
                    this.handleIndustryChange(account.industry);
                }
            }
        }

        // Enable project dropdown and load projects
        const projectDisplayContainer = document.getElementById('projectDisplayContainer');
        if (projectDisplayContainer) {
            projectDisplayContainer.style.background = '';
            projectDisplayContainer.style.cursor = 'pointer';
            projectDisplayContainer.removeAttribute('disabled');
        }
        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = 'Select project...';
        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = '';
        const pastSection = document.getElementById('pastActivitiesSection');
        if (pastSection) pastSection.classList.add('hidden');
        const pastList = document.getElementById('pastActivitiesList');
        if (pastList) { pastList.innerHTML = ''; pastList.style.display = 'none'; }
        // Show all projects immediately
        this.loadProjectDropdown();
    },

    // Load project dropdown (show all projects immediately)
    async loadProjectDropdown() {
        const accountId = document.getElementById('selectedAccountId').value;
        const dropdown = document.getElementById('projectDropdown');
        if (!dropdown || !accountId) {
            return;
        }

        let html = '';

        // If account is 'new', only show "Add New Project" option
        if (accountId === 'new') {
            this.currentProjectOptions = [];
            html = `
                <div class="search-select-empty">Create the account first to link existing projects.</div>
                <div class="search-select-create" onclick="Activities.showNewProjectFields()">+ Add New Project</div>
            `;
        } else {
            // For existing accounts, show all projects
            const accounts = await DataManager.getAccounts();
            const account = accounts.find(a => a.id === accountId);
            const projects = account?.projects || [];
            this.currentProjectOptions = projects;

            html = `
                <div class="search-select-search">
                    <input type="text"
                           class="search-select-input form-control"
                           id="projectDropdownSearch"
                           placeholder="Search projects..."
                           oninput="Activities.filterProjectDropdown(this.value)">
                </div>
                <div id="projectDropdownList">
                    ${this.renderProjectOptions(projects)}
                    <div class="search-select-create" onclick="Activities.showNewProjectFields()">+ Add New Project</div>
                </div>
            `;
            // Don't auto-select single project here — user may want to add a new project; dropdown stays open
        }

        dropdown.innerHTML = html;
    },

    renderProjectOptions(projects = []) {
        if (!projects.length) {
            return `<div class="search-select-empty">No projects found</div>`;
        }

        return projects.map(project => {
            const safeName = JSON.stringify(project.name);
            return `<div class="search-select-item" data-id="${project.id}" onclick='Activities.selectProject("${project.id}", ${safeName})'>${project.name}</div>`;
        }).join('');
    },

    filterProjectDropdown(query = '') {
        const list = document.getElementById('projectDropdownList');
        if (!list) return;

        const normalized = query.trim().toLowerCase();
        const projects = this.currentProjectOptions || [];
        const filtered = normalized
            ? projects.filter(project => project.name.toLowerCase().includes(normalized))
            : projects;

        list.innerHTML = `
            ${this.renderProjectOptions(filtered)}
            <div class="search-select-create" onclick="Activities.showNewProjectFields()">+ Add New Project</div>
        `;
    },

    // Toggle project dropdown
    async toggleProjectDropdown() {
        const accountId = document.getElementById('selectedAccountId').value;
        if (!accountId) {
            UI.showNotification('Please select an account first', 'error');
            return;
        }

        // For new accounts, ensure account name is entered
        if (accountId === 'new') {
            const accountName = document.getElementById('newAccountName')?.value;
            if (!accountName || !accountName.trim()) {
                UI.showNotification('Please enter an account name first', 'error');
                return;
            }
        }

        const dropdown = document.getElementById('projectDropdown');
        if (!dropdown) return;

        const isVisible = dropdown.style.display !== 'none';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            // Load content first so we don't show empty dropdown or focus an element that gets replaced
            await this.loadProjectDropdown();
            dropdown.style.display = 'block';
            dropdown.classList.add('active');

            // Position fixed so dropdown isn't clipped by modal overflow; place below trigger
            const trigger = document.getElementById('projectDisplayContainer');
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.width = Math.max(rect.width, 280) + 'px';
                dropdown.style.right = 'auto';
                dropdown.style.zIndex = '9999';
            }

            const searchInput = document.getElementById('projectDropdownSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            // Keep clicks inside dropdown from bubbling so document listener doesn't close it
            dropdown.onclick = function (e) { e.stopPropagation(); };
        }
    },

    // Show new project fields
    showNewProjectFields() {
        const projectDropdown = document.getElementById('projectDropdown');
        if (projectDropdown) projectDropdown.style.display = 'none';
        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = 'new';
        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = 'New Project';
        const newProjectFields = document.getElementById('newProjectFields');
        if (newProjectFields) newProjectFields.style.display = 'block';
        const editProjectNameWrap = document.getElementById('editProjectNameWrap');
        const projectNameEdit = document.getElementById('projectNameEdit');
        if (editProjectNameWrap) editProjectNameWrap.style.display = 'none';
        if (projectNameEdit) projectNameEdit.value = '';
        const newProjectName = document.getElementById('newProjectName');
        if (newProjectName) {
            newProjectName.required = true;
            newProjectName.value = '';
        }
        this.clearProjectFields();

        const searchInput = document.getElementById('projectDropdownSearch');
        if (searchInput && searchInput.value.trim() && newProjectName) {
            newProjectName.value = searchInput.value.trim();
        }
    },

    async selectProject(id, name) {
        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = id;
        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = name;
        const projectDropdown = document.getElementById('projectDropdown');
        if (projectDropdown) projectDropdown.style.display = 'none';
        const newProjectFields = document.getElementById('newProjectFields');
        if (newProjectFields) newProjectFields.style.display = 'none';
        const newProjectName = document.getElementById('newProjectName');
        if (newProjectName) {
            newProjectName.required = false;
            newProjectName.value = '';
        }
        const editProjectNameWrap = document.getElementById('editProjectNameWrap');
        const projectNameEdit = document.getElementById('projectNameEdit');
        if (editProjectNameWrap && projectNameEdit) {
            if (id && id !== 'new') {
                editProjectNameWrap.style.display = 'block';
                projectNameEdit.value = name || '';
            } else {
                editProjectNameWrap.style.display = 'none';
                projectNameEdit.value = '';
            }
        }

        // Load and pre-populate project data if existing project
        if (id && id !== 'new') {
            this.loadProjectData(id);
            const pastSection = document.getElementById('pastActivitiesSection');
            if (pastSection) pastSection.classList.remove('hidden');
            await this.renderPastActivitiesForProject(id);
        } else {
            // Clear project fields for new project
            this.clearProjectFields();
            const pastSection = document.getElementById('pastActivitiesSection');
            if (pastSection) pastSection.classList.add('hidden');
            const list = document.getElementById('pastActivitiesList');
            if (list) { list.innerHTML = ''; list.style.display = 'none'; }
        }
    },

    togglePastActivities() {
        const list = document.getElementById('pastActivitiesList');
        const arrow = document.querySelector('.past-activities-arrow');
        if (!list) return;
        const isExpanded = list.style.display !== 'none';
        list.style.display = isExpanded ? 'none' : 'block';
        if (arrow) arrow.textContent = isExpanded ? '▼' : '▶';
    },

    async renderPastActivitiesForProject(projectId) {
        const list = document.getElementById('pastActivitiesList');
        if (!list || typeof DataManager === 'undefined' || !DataManager.getActivitiesByProject) return;
        const activities = await DataManager.getActivitiesByProject(projectId);
        const sorted = [...activities].sort((a, b) => {
            const dA = a.date || a.createdAt || '';
            const dB = b.date || b.createdAt || '';
            return dB.localeCompare(dA);
        });
        const typeLabels = { customerCall: 'Customer Call', sow: 'SOW', poc: 'POC', rfx: 'RFx', pricing: 'Pricing', other: 'Other' };
        if (sorted.length === 0) {
            list.innerHTML = '<p class="text-muted" style="margin: 0.5rem 0;">No past activities for this project.</p>';
        } else {
            list.innerHTML = sorted.map(a => {
                const dateStr = (a.date || a.createdAt || '').slice(0, 10);
                const typeLabel = typeLabels[a.type] || a.type || 'Activity';
                const safeId = String(a.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                return `<div class="past-activity-row" style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #e2e8f0;">
                    <span>${dateStr} – ${typeLabel}</span>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="Activities.openActivityModalByActivityId('${safeId}')">Edit</button>
                </div>`;
            }).join('');
        }
        list.style.display = 'none';
        const arrow = document.querySelector('.past-activities-arrow');
        if (arrow) arrow.textContent = '▶';
    },

    async _getActivityById(activityId) {
        const activities = typeof DataManager !== 'undefined' && DataManager.getActivities ? await DataManager.getActivities() : [];
        return activities.find(a => a.id === activityId) || null;
    },

    async openActivityModalByActivityId(activityId) {
        const activities = typeof DataManager !== 'undefined' && DataManager.getActivities ? await DataManager.getActivities() : [];
        const activity = activities.find(a => a.id === activityId) || null;
        if (activity) {
            await this.openActivityModal({ mode: 'edit', activity, isInternal: false });
        }
    },

    getDetailsFromRow(rowIndex) {
        const suffix = rowIndex > 0 ? '_' + rowIndex : '';
        const typeSelectId = rowIndex === 0 ? 'activityTypeSelect' : 'activityTypeSelect_' + rowIndex;
        const activityType = document.getElementById(typeSelectId)?.value || '';

        if (activityType === 'customerCall') {
            return {
                callType: document.getElementById('callType' + suffix)?.value || '',
                description: document.getElementById('callDescription' + suffix)?.value || ''
            };
        }
        if (activityType === 'sow') {
            return { sowLink: document.getElementById('sowLink' + suffix)?.value || '' };
        }
        if (activityType === 'poc') {
            const accessType = document.getElementById('accessType' + suffix)?.value || '';
            const details = {
                accessType: accessType,
                useCaseDescription: document.getElementById('useCaseDescription' + suffix)?.value || ''
            };
            if (accessType === 'Sandbox') {
                details.startDate = document.getElementById('pocStartDate' + suffix)?.value || '';
                details.endDate = document.getElementById('pocEndDate' + suffix)?.value || '';
                details.pocEnvironmentName = '';
                details.assignedStatus = 'Unassigned';
            } else if (accessType && accessType.startsWith('Custom POC')) {
                details.demoEnvironment = document.getElementById('demoEnvironment' + suffix)?.value || '';
                details.botTriggerUrl = document.getElementById('botTriggerUrl' + suffix)?.value || '';
            }
            return details;
        }
        if (activityType === 'rfx') {
            return {
                rfxType: document.getElementById('rfxType' + suffix)?.value || '',
                submissionDeadline: document.getElementById('submissionDeadline' + suffix)?.value || '',
                googleFolderLink: document.getElementById('googleFolderLink' + suffix)?.value || '',
                notes: document.getElementById('rfxNotes' + suffix)?.value || ''
            };
        }
        if (rowIndex > 0) {
            const notes = document.getElementById('activityDetailsExtra_' + rowIndex)?.value || '';
            return notes ? { notes: notes } : {};
        }
        return {};
    },

    // Load project data and pre-populate fields
    async loadProjectData(projectId) {
        const accountId = document.getElementById('selectedAccountId')?.value;
        if (!accountId || !projectId) return;

        this.clearProjectFields();

        const account = await DataManager.getAccountById(accountId);
        if (!account || !account.projects) return;

        const project = account.projects.find(p => p.id === projectId);
        if (!project) return;

        // Pre-populate SFDC Link
        const sfdcLink = document.getElementById('sfdcLink');
        const noSfdcLink = document.getElementById('noSfdcLink');
        if (sfdcLink && noSfdcLink) {
            if (project.sfdcLink) {
                sfdcLink.value = project.sfdcLink;
                noSfdcLink.checked = false;
                sfdcLink.style.display = 'block';
            } else {
                noSfdcLink.checked = true;
                sfdcLink.style.display = 'none';
            }
        }
        const projectLocation = document.getElementById('projectLocation');
        if (projectLocation) projectLocation.value = project.location || '';

        // Pre-populate Use Cases
        if (project.useCases && project.useCases.length > 0) {
            this.selectedUseCases = [];
            project.useCases.forEach(uc => {
                if (uc.startsWith('Other: ')) {
                    this.selectedUseCases.push('Other');
                    const otherText = document.getElementById('useCaseOtherText');
                    if (otherText) {
                        otherText.value = uc.replace('Other: ', '');
                        otherText.style.display = 'block';
                        otherText.required = true;
                    }
                } else {
                    this.selectedUseCases.push(uc);
                }
            });
            this.updateMultiSelectDisplay('useCaseSelected', this.selectedUseCases);
            this.syncMultiSelectState('useCase', this.selectedUseCases);
        }

        // Pre-populate Products Interested
        if (project.productsInterested && project.productsInterested.length > 0) {
            this.selectedProjectProducts = [];
            project.productsInterested.forEach(prod => {
                if (prod.startsWith('Other: ')) {
                    this.selectedProjectProducts.push('Other');
                    const otherText = document.getElementById('projectProductsOtherText');
                    if (otherText) {
                        otherText.value = prod.replace('Other: ', '');
                        otherText.style.display = 'block';
                        otherText.required = true;
                    }
                } else {
                    this.selectedProjectProducts.push(prod);
                }
            });
            this.updateMultiSelectDisplay('projectProductsSelected', this.selectedProjectProducts);
            this.syncMultiSelectState('projectProducts', this.selectedProjectProducts);
        }

        // Pre-populate Channels
        if (project.channels && project.channels.length > 0) {
            this.selectedChannels = [];
            project.channels.forEach(ch => {
                if (ch.startsWith('Other: ')) {
                    this.selectedChannels.push('Other');
                    const otherText = document.getElementById('channelsOtherText');
                    if (otherText) {
                        otherText.value = ch.replace('Other: ', '');
                        otherText.style.display = 'block';
                        otherText.required = true;
                    }
                } else {
                    this.selectedChannels.push(ch);
                }
            });
            this.updateMultiSelectDisplay('channelsSelected', this.selectedChannels);
            this.syncMultiSelectState('channels', this.selectedChannels);
        }
    },

    // Clear project fields for new project
    clearProjectFields() {
        // Clear SFDC
        const sfdcLink = document.getElementById('sfdcLink');
        const noSfdcLink = document.getElementById('noSfdcLink');
        if (sfdcLink) sfdcLink.value = '';
        if (noSfdcLink) noSfdcLink.checked = false;
        if (sfdcLink) sfdcLink.style.display = 'block';
        const projectLocation = document.getElementById('projectLocation');
        if (projectLocation) projectLocation.value = '';
        const editProjectNameWrap = document.getElementById('editProjectNameWrap');
        const projectNameEdit = document.getElementById('projectNameEdit');
        if (editProjectNameWrap) editProjectNameWrap.style.display = 'none';
        if (projectNameEdit) projectNameEdit.value = '';

        // Clear Use Cases
        this.selectedUseCases = [];
        const useCaseOtherText = document.getElementById('useCaseOtherText');
        if (useCaseOtherText) {
            useCaseOtherText.value = '';
            useCaseOtherText.style.display = 'none';
            useCaseOtherText.required = false;
        }
        this.updateMultiSelectDisplay('useCaseSelected', []);
        this.syncMultiSelectState('useCase', []);

        // Clear Products
        this.selectedProjectProducts = [];
        const productsOtherText = document.getElementById('projectProductsOtherText');
        if (productsOtherText) {
            productsOtherText.value = '';
            productsOtherText.style.display = 'none';
            productsOtherText.required = false;
        }
        this.updateMultiSelectDisplay('projectProductsSelected', []);
        this.syncMultiSelectState('projectProducts', []);

        // Clear Channels
        this.selectedChannels = [];
        const channelsOtherText = document.getElementById('channelsOtherText');
        if (channelsOtherText) {
            channelsOtherText.value = '';
            channelsOtherText.style.display = 'none';
            channelsOtherText.required = false;
        }
        this.updateMultiSelectDisplay('channelsSelected', []);
        this.syncMultiSelectState('channels', []);
    },

    createNewProject(name) {
        // This is called when user types in new project name field
        document.getElementById('selectedProjectId').value = 'new';
        if (name) {
            document.getElementById('newProjectName').value = name;
        }
    },

    // Save activity (unified for Internal and External)
    async saveActivity(event) {
        event.preventDefault();

        try {
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) {
                UI.showNotification('User not authenticated', 'error');
                return;
            }

            const activityCategory = document.querySelector('input[name="activityCategory"]:checked')?.value;
            if (!activityCategory) {
                UI.showNotification('Please select activity category (Internal/External)', 'error');
                return;
            }

            // Remove required attributes from hidden fields to prevent validation errors
            const accountSection = document.getElementById('accountSection');
            const projectSection = document.getElementById('projectSection');

            if (activityCategory === 'internal') {
                // For internal, ALWAYS remove required from account/project fields (even if hidden)
                if (accountSection) {
                    // Remove required from all fields in account section
                    const inputs = accountSection.querySelectorAll('input, select, textarea');
                    inputs.forEach(input => input.required = false);
                    // Also clear values to prevent validation issues
                    const industrySelect = document.getElementById('industry');
                    const salesRepSelect = document.getElementById('salesRepSelect');
                    const accountDisplay = document.getElementById('accountDisplay');
                    if (industrySelect) industrySelect.value = '';
                    if (salesRepSelect) salesRepSelect.value = '';
                    if (accountDisplay) accountDisplay.textContent = 'Select account...';
                }
                if (projectSection) {
                    // Remove required from all fields in project section
                    const projectFields = projectSection.querySelectorAll('[required], [data-was-required="true"]');
                    projectFields.forEach(field => {
                        field.removeAttribute('required');
                        field.setAttribute('data-was-required', 'true');
                    });
                }
            } else {
                // For external, ensure account/project fields are required
                if (accountSection) {
                    const accountFields = accountSection.querySelectorAll('[data-was-required="true"]');
                    accountFields.forEach(field => {
                        // Only add required if field is visible (not in hidden section)
                        if (!accountSection.classList.contains('hidden')) {
                            field.setAttribute('required', 'required');
                        }
                    });
                }
                if (projectSection) {
                    const projectFields = projectSection.querySelectorAll('[data-was-required="true"]');
                    projectFields.forEach(field => {
                        // Only add required if field is visible (not in hidden section)
                        if (!projectSection.classList.contains('hidden')) {
                            field.setAttribute('required', 'required');
                        }
                    });
                }
            }

            const date = document.getElementById('activityDate').value;
            const activityType = document.getElementById('activityTypeSelect').value;

            if (!date || !activityType) {
                UI.showNotification('Please fill in all required fields', 'error');
                return;
            }

            const editingContext = this.editingContext;
            const isEditing = !!editingContext;
            const originalCategoryIsInternal = editingContext ? editingContext.isInternal : null;
            const currentIsInternal = activityCategory === 'internal';

            if (isEditing && originalCategoryIsInternal !== currentIsInternal) {
                UI.showNotification('Switching between internal and external is not supported while editing. Please cancel and create a new activity instead.', 'error');
                return;
            }

            if (currentIsInternal) {
                await this.saveInternalActivityUnified(currentUser, date, activityType, {
                    isEditing: !!(this.editingContext && this.editingContext.activity),
                    original: this.editingContext ? this.editingContext.activity : null
                });
            } else {
                await this.saveExternalActivityUnified(currentUser, date, activityType, {
                    isEditing: !!(this.editingContext && this.editingContext.activity),
                    original: this.editingContext ? this.editingContext.activity : null
                });
            }
        } catch (error) {
            console.error('Error in saveActivity:', error);
            UI.showNotification('An error occurred while saving the activity.', 'error');
        }
    },

    // Save internal activity (unified)
    async saveInternalActivityUnified(currentUser, date, activityType, options = {}) {
        const { isEditing = false, original = null } = options || {};

        const timeSpentType = document.querySelector('input[name="timeSpentType"]:checked')?.value;
        const timeSpentValue = document.getElementById('timeSpentValue')?.value;

        let timeSpent = null;
        if (timeSpentType && timeSpentValue) {
            const value = parseFloat(timeSpentValue);
            if (!Number.isNaN(value) && value > 0) {
                timeSpent = `${value} ${timeSpentType === 'day' ? 'day(s)' : 'hour(s)'}`;
            }
        }

        // Feature 3: Enablement optional warning — allow save without days/hours with explicit confirmation
        if (activityType === 'Enablement' && (!timeSpentType || !timeSpentValue || parseFloat(timeSpentValue) <= 0)) {
            const proceed = typeof window !== 'undefined' && window.confirm(
                'Enablement activities are usually tracked with days or hours. Save without time spent?'
            );
            if (!proceed) return;
        }

        const activityNameInput = document.getElementById('internalActivityName');
        const activityName = activityNameInput?.value?.trim() || '';
        const topic = document.getElementById('internalTopic')?.value?.trim() || '';
        const description = document.getElementById('internalDescription')?.value?.trim() || '';

        UI.clearFieldError(activityNameInput);
        if (!activityName) {
            UI.setFieldError(activityNameInput, 'Activity name is required.');
            UI.showNotification('Please enter an activity name.', 'error');
            return;
        }

        const payload = {
            userId: currentUser.id,
            userName: currentUser.username,
            date,
            type: activityType,
            timeSpent,
            activityName,
            topic,
            description,
            isInternal: true
        };

        if (isEditing && original) {
            const updated = await DataManager.updateInternalActivity(original.id, {
                date,
                type: activityType,
                timeSpent,
                activityName,
                topic,
                description,
                isInternal: true
            });

            if (!updated) {
                UI.showNotification('Unable to update internal activity. Please try again.', 'error');
                return;
            }

            this.closeActivityModal();
            UI.showNotification('Internal activity updated successfully!', 'success');
            this.setLastActivityDateForUser(currentUser.id, date);
        } else {
            try {
                await DataManager.addInternalActivity(payload);
                if (this.editingContext && this.editingContext.fromDraftId && typeof Drafts !== 'undefined') {
                    Drafts.removeDraft(this.editingContext.fromDraftId);
                }
                this.closeActivityModal();
                UI.showNotification('Internal activity logged successfully! Draft removed.', 'success');
                this.setLastActivityDateForUser(currentUser.id, date);
            } catch (err) {
                UI.showNotification('Could not save. Activity was saved to Drafts. You can submit again from the Drafts section.', 'warning');
                if (window.app) window.app.loadDraftsView && window.app.loadDraftsView();
            }
        }

        if (typeof DataManager !== 'undefined' && DataManager.invalidateCache) {
            DataManager.invalidateCache('activities', 'internalActivities', 'allActivities');
        }
        if (window.app) {
            if (window.app.updateDraftsBadge) window.app.updateDraftsBadge();
            await window.app.loadDashboard();
            await window.app.loadActivitiesView();
            if (window.app.loadDraftsView) await window.app.loadDraftsView();
        }
    },

    // Save external activity (unified)
    async saveExternalActivityUnified(currentUser, date, activityType, options = {}) {
        const { isEditing = false, original = null } = options || {};
        const editingContext = this.editingContext || {};

        // Get account information
        const accountIdEl = document.getElementById('selectedAccountId');
        const salesRepRegionSelect = document.getElementById('salesRepRegionSelect');
        const salesRepSelect = document.getElementById('salesRepSelect');
        const industryEl = document.getElementById('industry');
        const projectIdEl = document.getElementById('selectedProjectId');
        const newAccountNameInput = document.getElementById('newAccountName');
        const newProjectNameInput = document.getElementById('newProjectName');
        UI.clearFieldError(newAccountNameInput);
        UI.clearFieldError(newProjectNameInput);
        UI.clearFieldError(salesRepRegionSelect);
        UI.clearFieldError(salesRepSelect);

        if (!accountIdEl || !salesRepRegionSelect || !salesRepSelect || !industryEl) {
            UI.showNotification('Please fill in all required account fields', 'error');
            return;
        }

        const accountId = accountIdEl.value;
        let accountName = document.getElementById('accountDisplay')?.textContent || '';
        if (accountId === 'new') {
            accountName = document.getElementById('newAccountName')?.value || '';
        }
        let industry = (industryEl.value || '').trim();
        const industryOtherTextEl = document.getElementById('industryOtherText');
        const industryOtherText = industryOtherTextEl?.value?.trim();
        if (industry === 'Other') {
            if (!industryOtherText) {
                UI.setFieldError(industryOtherTextEl, 'Please specify the industry.');
                UI.showNotification('Please specify the industry when selecting Other.', 'error');
                return;
            }
            industry = industryOtherText;
            if (typeof DataManager !== 'undefined' && DataManager.addPendingIndustry) {
                await DataManager.addPendingIndustry(industryOtherText, { suggestedBy: currentUser.username });
            }
        }

        // Get project info (now from Project Information section); support editing project name when existing project selected
        const projectId = projectIdEl ? projectIdEl.value : '';
        let projectName = document.getElementById('projectDisplay')?.textContent || '';
        if (projectId === 'new') {
            projectName = document.getElementById('newProjectName')?.value || '';
        } else {
            const projectNameEditEl = document.getElementById('projectNameEdit');
            if (projectNameEditEl && projectNameEditEl.value.trim()) {
                projectName = projectNameEditEl.value.trim();
            }
        }

        if (!accountId || !accountName || !industry) {
            UI.showNotification('Please fill in all required account fields', 'error');
            return;
        }

        if (accountId === 'new' && !accountName.trim()) {
            UI.setFieldError(newAccountNameInput, 'Account name is required.');
            UI.showNotification('Please enter an account name', 'error');
            return;
        }

        if (!projectId || (!projectName && projectId !== 'new')) {
            UI.showNotification('Please select or create a project', 'error');
            return;
        }

        if (projectId === 'new' && !projectName.trim()) {
            UI.setFieldError(newProjectNameInput, 'Project name is required.');
            UI.showNotification('Please enter a project name', 'error');
            return;
        }

        // Handle sales rep (from dropdown only - no adding new)
        const salesRepRegion = salesRepRegionSelect.value;
        if (!salesRepRegion) {
            UI.setFieldError(salesRepRegionSelect, 'Select a sales region');
            UI.showNotification('Please select a sales region', 'error');
            return;
        }

        const selectedOption = salesRepSelect.options[salesRepSelect.selectedIndex];
        const salesRep = selectedOption ? selectedOption.getAttribute('data-name') || selectedOption.text : '';
        const salesRepEmail = salesRepSelect.value;

        if (!salesRep || !salesRepSelect.value) {
            UI.setFieldError(salesRepSelect, 'Select a sales rep');
            UI.showNotification('Please select a sales rep', 'error');
            return;
        }

        // --- Logic to resolve final IDs ---
        let finalAccountId = accountId;
        let finalProjectId = projectId;

        if (accountId === 'new') {
            const result = await DataManager.addAccount({
                name: accountName,
                industry: industry,
                salesRep: salesRep,
                salesRepEmail: salesRepEmail,
                salesRepRegion: salesRepRegion,
                projects: []
            });
            finalAccountId = result.id;
        }

        if (projectId === 'new') {
            const projectResult = await DataManager.addProject(finalAccountId, {
                name: projectName,
                status: 'active'
            });
            finalProjectId = projectResult.id;
        } else {
            // If project exists, update name if edited, and location/products
            const accounts = await DataManager.getAccounts();
            const account = accounts.find(a => a.id === finalAccountId);
            const project = account?.projects?.find(p => p.id === finalProjectId);
            if (project) {
                const projectNameEditEl = document.getElementById('projectNameEdit');
                const editedName = projectNameEditEl?.value?.trim();
                if (editedName && editedName !== (project.name || '')) {
                    await DataManager.updateProject(finalAccountId, finalProjectId, { name: editedName });
                    projectName = editedName;
                }
                const projectLocation = document.getElementById('projectLocation')?.value;
                if (projectLocation !== undefined) project.location = projectLocation || '';

                // Issue #9: Save Products and Use Cases back to project
                if (this.selectedProjectProducts && this.selectedProjectProducts.length > 0) {
                    const productsOtherText = document.getElementById('projectProductsOtherText')?.value || '';
                    project.productsInterested = this.selectedProjectProducts.map(p =>
                        p === 'Other' ? `Other: ${productsOtherText}` : p
                    );
                }

                if (this.selectedUseCases && this.selectedUseCases.length > 0) {
                    const useCaseOtherText = document.getElementById('useCaseOtherText')?.value || '';
                    project.useCases = this.selectedUseCases.map(uc =>
                        uc === 'Other' ? `Other: ${useCaseOtherText}` : uc
                    );
                }

                await DataManager.saveAccounts(accounts);
            }
        }

        const activeAccount = await DataManager.getAccountById(finalAccountId);
        if (activeAccount && activeAccount.name) {
            accountName = activeAccount.name;
        }
        if (finalProjectId && activeAccount?.projects) {
            const activeProject = activeAccount.projects.find(p => p.id === finalProjectId);
            if (activeProject && activeProject.name) {
                projectName = activeProject.name;
            }
        }

        // Create activity based on type
        const activity = {
            userId: currentUser.id,
            userName: currentUser.username,
            accountId: finalAccountId,
            accountName: accountName,
            projectId: finalProjectId || null,
            projectName: projectName || null,
            date: date,
            type: activityType,
            salesRep: salesRep,
            salesRepEmail: salesRepEmail,
            salesRepRegion: salesRepRegion,
            industry: industry,
            details: {},
            isInternal: false
        };

        // Add type-specific details
        if (activityType === 'customerCall') {
            const callDescription = document.getElementById('callDescription')?.value || '';
            if (!callDescription.trim()) {
                UI.showNotification('Description / MOM is required for Customer Call activities', 'error');
                return;
            }
            activity.details = {
                callType: document.getElementById('callType')?.value || '',
                description: callDescription
            };
        } else if (activityType === 'sow') {
            activity.details = {
                sowLink: document.getElementById('sowLink')?.value || ''
            };
        } else if (activityType === 'poc') {
            const accessType = document.getElementById('accessType')?.value || '';
            activity.details = {
                accessType: accessType,
                useCaseDescription: document.getElementById('useCaseDescription')?.value || ''
            };

            if (accessType === 'Sandbox') {
                activity.details.startDate = document.getElementById('pocStartDate')?.value || '';
                activity.details.endDate = document.getElementById('pocEndDate')?.value || '';
                // POC Environment Name - default empty, admin can set later
                activity.details.pocEnvironmentName = '';
                activity.details.assignedStatus = 'Unassigned';
            } else if (accessType && accessType.startsWith('Custom POC')) {
                activity.details.demoEnvironment = document.getElementById('demoEnvironment')?.value || '';
                activity.details.botTriggerUrl = document.getElementById('botTriggerUrl')?.value || '';
            }
        } else if (activityType === 'rfx') {
            activity.details = {
                rfxType: document.getElementById('rfxType')?.value || '',
                submissionDeadline: document.getElementById('submissionDeadline')?.value || '',
                googleFolderLink: document.getElementById('googleFolderLink')?.value || '',
                notes: document.getElementById('rfxNotes')?.value || ''
            };
        } else if (activityType === 'pricing') {
            // No details for pricing
            activity.details = {};
        }

        const originalAccountId = editingContext.originalAccountId ?? original?.accountId ?? null;
        const originalProjectId = editingContext.originalProjectId ?? original?.projectId ?? null;

        if (isEditing && original) {
            const updates = {
                date,
                type: activityType,
                accountId: activity.accountId,
                accountName: activity.accountName,
                projectId: activity.projectId,
                projectName: activity.projectName,
                salesRep: activity.salesRep,
                salesRepEmail: activity.salesRepEmail,
                salesRepRegion: activity.salesRepRegion,
                industry: activity.industry,
                details: activity.details,
                isInternal: false
            };

            const updated = await DataManager.updateActivity(original.id, updates);
            if (!updated) {
                UI.showNotification('Unable to update activity. Please try again.', 'error');
                return;
            }

            await this.syncProjectActivityReference({
                activity: updated,
                targetAccountId: updated.accountId,
                targetProjectId: updated.projectId,
                previousAccountId: originalAccountId,
                previousProjectId: originalProjectId
            });

            if (this.editingContext && this.editingContext.fromDraftId && typeof Drafts !== 'undefined') {
                Drafts.removeDraft(this.editingContext.fromDraftId);
            }
            this.closeActivityModal();
            UI.showNotification('Activity updated successfully! Draft removed.', 'success');
            this.setLastActivityDateForUser(currentUser.id, date);
            if (window.app) {
                if (typeof DataManager !== 'undefined' && DataManager.invalidateCache) {
                    DataManager.invalidateCache('activities', 'internalActivities', 'allActivities');
                }
                if (window.app.updateDraftsBadge) window.app.updateDraftsBadge();
                await window.app.loadDashboard();
                await window.app.loadActivitiesView();
                if (window.app.loadDraftsView) await window.app.loadDraftsView();
            }
        } else {
            const rows = document.querySelectorAll('.activity-detail-row');
            if (rows.length > 1) {
                for (let i = 0; i < rows.length; i++) {
                    const dateVal = i === 0 ? date : document.getElementById('activityDate_' + i)?.value;
                    const typeVal = i === 0 ? activityType : document.getElementById('activityTypeSelect_' + i)?.value;
                    if (!dateVal || !typeVal) {
                        UI.showNotification('Please fill date and activity type for all activities.', 'error');
                        return;
                    }
                    const suffix = i === 0 ? '' : '_' + i;
                    if (typeVal === 'customerCall') {
                        const callDescription = document.getElementById('callDescription' + suffix)?.value || '';
                        if (!callDescription.trim()) {
                            UI.showNotification('Description / MOM is required for Customer Call in activity ' + (i + 1), 'error');
                            return;
                        }
                    }
                }
                let createdCount = 0;
                let draftsCount = 0;
                let lastSavedDate = date;
                for (let i = 0; i < rows.length; i++) {
                    const dateVal = i === 0 ? date : document.getElementById('activityDate_' + i)?.value;
                    const typeVal = i === 0 ? activityType : document.getElementById('activityTypeSelect_' + i)?.value;
                    const detailsVal = this.getDetailsFromRow(i);
                    const rowActivity = {
                        userId: currentUser.id,
                        userName: currentUser.username,
                        accountId: finalAccountId,
                        accountName: accountName,
                        projectId: finalProjectId || null,
                        projectName: projectName || null,
                        date: dateVal,
                        type: typeVal,
                        salesRep: salesRep,
                        salesRepEmail: salesRepEmail,
                        salesRepRegion: salesRepRegion,
                        industry: industry,
                        details: detailsVal,
                        isInternal: false
                    };
                    try {
                        const created = await DataManager.addActivity(rowActivity);
                        await this.syncProjectActivityReference({
                            activity: created,
                            targetAccountId: created.accountId,
                            targetProjectId: created.projectId
                        });
                        createdCount++;
                        lastSavedDate = dateVal;
                    } catch (err) {
                        draftsCount++;
                    }
                }
                this.setLastActivityDateForUser(currentUser.id, lastSavedDate);
                this.closeActivityModal();
                if (draftsCount > 0) {
                    UI.showNotification('Logged ' + createdCount + ' activities. ' + draftsCount + ' could not be saved and were added to Drafts.', 'warning');
                    if (window.app && window.app.loadDraftsView) await window.app.loadDraftsView();
                } else {
                    UI.showNotification('Logged ' + createdCount + ' activities!', 'success');
                }
            } else {
                try {
                    const created = await DataManager.addActivity(activity);
                    await this.syncProjectActivityReference({
                        activity: created,
                        targetAccountId: created.accountId,
                        targetProjectId: created.projectId
                    });
                    if (this.editingContext && this.editingContext.fromDraftId && typeof Drafts !== 'undefined') {
                        Drafts.removeDraft(this.editingContext.fromDraftId);
                    }
                    this.closeActivityModal();
                    UI.showNotification('Activity logged successfully! Draft removed.', 'success');
                    this.setLastActivityDateForUser(currentUser.id, date);
                } catch (err) {
                    UI.showNotification('Could not save. Activity was saved to Drafts. You can submit again from the Drafts section.', 'warning');
                    if (window.app && window.app.loadDraftsView) await window.app.loadDraftsView();
                }
            }
        }

        if (window.app) {
            if (typeof DataManager !== 'undefined' && DataManager.invalidateCache) {
                DataManager.invalidateCache('activities', 'internalActivities', 'allActivities');
            }
            if (window.app.updateDraftsBadge) window.app.updateDraftsBadge();
            await window.app.loadDashboard();
            await window.app.loadActivitiesView();
            if (window.app.loadDraftsView) await window.app.loadDraftsView();
        }
    },

    // Get project products with Other text if applicable
    getProjectProductsWithOther() {
        let products = [...this.selectedProjectProducts];
        const productsOtherText = document.getElementById('projectProductsOtherText')?.value;
        if (products.includes('Other') && productsOtherText) {
            const otherIndex = products.indexOf('Other');
            products[otherIndex] = `Other: ${productsOtherText}`;
        }
        return products;
    },

    // Get channels with Other text if applicable
    getChannelsWithOther() {
        let channels = [...this.selectedChannels];
        const channelsOtherText = document.getElementById('channelsOtherText')?.value;
        if (channels.includes('Other') && channelsOtherText) {
            const otherIndex = channels.indexOf('Other');
            channels[otherIndex] = `Other: ${channelsOtherText}`;
        }
        return channels;
    },

    async syncProjectActivityReference({ activity, targetAccountId, targetProjectId, previousAccountId = null, previousProjectId = null }) {
        if (!activity) return;

        const accounts = await DataManager.getAccounts();
        let mutated = false;

        if (previousAccountId && previousProjectId && (previousAccountId !== targetAccountId || previousProjectId !== targetProjectId)) {
            const prevAccount = accounts.find(a => a.id === previousAccountId);
            const prevProject = prevAccount?.projects?.find(p => p.id === previousProjectId);
            if (prevProject && Array.isArray(prevProject.activities)) {
                const before = prevProject.activities.length;
                prevProject.activities = prevProject.activities.filter(a => a.id !== activity.id);
                if (prevProject.activities.length !== before) {
                    mutated = true;
                }
            }
        }

        if (targetAccountId && targetProjectId) {
            const account = accounts.find(a => a.id === targetAccountId);
            const project = account?.projects?.find(p => p.id === targetProjectId);
            if (project) {
                if (!Array.isArray(project.activities)) {
                    project.activities = [];
                }
                const payload = { ...activity, isInternal: false };
                const idx = project.activities.findIndex(a => a.id === activity.id);
                if (idx === -1) {
                    project.activities.push(payload);
                } else {
                    project.activities[idx] = { ...project.activities[idx], ...payload };
                }
                if (activity.source && activity.source !== 'migration') {
                    const manualTimestamp = activity.date || activity.createdAt || new Date().toISOString();
                    if (project.status !== 'active') {
                        project.status = 'active';
                        mutated = true;
                    }
                    if (project.isMigrated) {
                        delete project.isMigrated;
                        mutated = true;
                    }
                    project.lastManualActivityAt = manualTimestamp;
                }
                mutated = true;
            }
        }

        if (mutated) {
            await DataManager.saveAccounts(accounts);
        }
    },

    // Set activity category (Internal/External)
    async setActivityCategory(category) {
        this.activityType = category;
        const accountSection = document.getElementById('accountSection');
        const projectSection = document.getElementById('projectSection');
        const activityTypeSelect = document.getElementById('activityTypeSelect');

        if (category === 'internal') {
            // Hide Account and Project sections for Internal
            if (accountSection) {
                accountSection.classList.add('hidden');
                // Remove required from all fields in account section
                const accountFields = accountSection.querySelectorAll('[required], [data-was-required="true"]');
                accountFields.forEach(field => {
                    field.removeAttribute('required');
                    field.setAttribute('data-was-required', 'true');
                });
                // Clear values
                const industrySelect = document.getElementById('industry');
                const salesRepSelect = document.getElementById('salesRepSelect');
                const accountDisplay = document.getElementById('accountDisplay');
                if (industrySelect) industrySelect.value = '';
                if (salesRepSelect) salesRepSelect.value = '';
                if (accountDisplay) accountDisplay.textContent = 'Select account...';
            }
            if (projectSection) {
                projectSection.classList.add('hidden');
                // Remove required from all fields in project section
                const projectFields = projectSection.querySelectorAll('[required], [data-was-required="true"]');
                projectFields.forEach(field => {
                    field.removeAttribute('required');
                    field.setAttribute('data-was-required', 'true');
                });
            }
            this.updateAddAnotherActivityButtonVisibility();

            // Populate Internal activity types
            if (activityTypeSelect) {
                activityTypeSelect.innerHTML = `
                    <option value="">Select Activity Type</option>
                    <option value="Enablement">Enablement</option>
                    <option value="Video Creation">Video Creation</option>
                    <option value="Webinar">Webinar</option>
                    <option value="Event/Booth Hosting">Event/Booth Hosting</option>
                    <option value="Product Feedback">Product Feedback</option>
                    <option value="Content Creation">Content Creation</option>
                    <option value="Training">Training</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Internal Meeting">Internal Meeting</option>
                    <option value="Other">Other</option>
                `;
            }
        } else {
            // Show Account and Project sections for External
            if (accountSection) {
                accountSection.classList.remove('hidden');
                // Restore required attributes
                const accountFields = accountSection.querySelectorAll('[data-was-required="true"]');
                accountFields.forEach(field => {
                    field.setAttribute('required', 'required');
                });
            }
            if (projectSection) {
                projectSection.classList.remove('hidden');
                // Restore required attributes
                const projectFields = projectSection.querySelectorAll('[data-was-required="true"]');
                projectFields.forEach(field => {
                    field.setAttribute('required', 'required');
                });
            }
            const selectedProjectId = document.getElementById('selectedProjectId')?.value;
            if (selectedProjectId && selectedProjectId !== 'new') {
                const pastSection = document.getElementById('pastActivitiesSection');
                if (pastSection) pastSection.classList.remove('hidden');
                await this.renderPastActivitiesForProject(selectedProjectId);
            } else {
                const pastSection = document.getElementById('pastActivitiesSection');
                if (pastSection) pastSection.classList.add('hidden');
            }
            const industrySelect = document.getElementById('industry');
            this.refreshUseCaseOptions(industrySelect ? industrySelect.value : '').catch(() => { });
            this.updateAddAnotherActivityButtonVisibility();

            // Populate External activity types
            if (activityTypeSelect) {
                activityTypeSelect.innerHTML = `
                    <option value="">Select Activity Type</option>
                    <option value="customerCall">Customer Call</option>
                    <option value="sow">SOW (Statement of Work)</option>
                    <option value="poc">POC (Proof of Concept)</option>
                    <option value="rfx">RFx</option>
                    <option value="pricing">Pricing</option>
                `;
            }
        }

        // Clear activity fields when category changes
        const activityFields = document.getElementById('activityFields');
        if (activityFields) activityFields.innerHTML = '';
    },

    // Toggle SFDC link field
    toggleSfdcLink() {
        const checkbox = document.getElementById('noSfdcLink');
        const sfdcInput = document.getElementById('sfdcLink');
        if (checkbox && sfdcInput) {
            if (checkbox.checked) {
                sfdcInput.style.display = 'none';
                sfdcInput.value = '';
            } else {
                sfdcInput.style.display = 'block';
            }
        }
    },

    // Toggle Use Case Other text field
    toggleUseCaseOther() {
        const checkbox = document.getElementById('useCaseOtherCheck');
        const textInput = document.getElementById('useCaseOtherText');
        if (checkbox && textInput) {
            if (checkbox.checked) {
                textInput.style.display = 'block';
                textInput.required = true;
                if (!this.selectedUseCases.includes('Other')) {
                    this.selectedUseCases.push('Other');
                }
            } else {
                textInput.style.display = 'none';
                textInput.value = '';
                textInput.required = false;
                this.selectedUseCases = this.selectedUseCases.filter(uc => uc !== 'Other');
            }
            this.updateMultiSelectDisplay('useCaseSelected', this.selectedUseCases);
        }
    },

    // Handle sales rep dropdown change
    handleSalesRepChange() {
        const select = document.getElementById('salesRepSelect');
        const newFields = document.getElementById('newSalesRepFields');

        if (!select || !newFields) return;

        if (select.value === '__new__') {
            newFields.style.display = 'block';
            document.getElementById('newSalesRepName').required = true;
            document.getElementById('newSalesRepEmail').required = true;
            document.getElementById('newSalesRepRegion').required = true;
            // Clear fields
            document.getElementById('newSalesRepName').value = '';
            document.getElementById('newSalesRepEmail').value = '';
            document.getElementById('newSalesRepRegion').value = '';
        } else {
            newFields.style.display = 'none';
            document.getElementById('newSalesRepName').required = false;
            document.getElementById('newSalesRepEmail').required = false;
            document.getElementById('newSalesRepRegion').required = false;
        }
    },

    // Reset activity form
    async resetActivityForm() {
        this.activityType = null;
        this.selectedUseCases = [];
        this.selectedChannels = [];
        this.selectedProjectProducts = [];
        this.currentSalesRepRegion = await this.getDefaultSalesRepRegion();

        const form = document.getElementById('activityForm');
        if (form) form.reset();

        // Reset all sections
        const accountSection = document.getElementById('accountSection');
        const projectSection = document.getElementById('projectSection');
        if (accountSection) accountSection.classList.add('hidden');
        if (projectSection) projectSection.classList.add('hidden');

        const accountDisplay = document.getElementById('accountDisplay');
        if (accountDisplay) accountDisplay.textContent = 'Select account...';
        const selectedAccountId = document.getElementById('selectedAccountId');
        if (selectedAccountId) selectedAccountId.value = '';
        const newAccountFields = document.getElementById('newAccountFields');
        if (newAccountFields) newAccountFields.style.display = 'none';
        const newAccountName = document.getElementById('newAccountName');
        if (newAccountName) {
            newAccountName.value = '';
            newAccountName.required = false;
        }

        const projectDisplayContainer = document.getElementById('projectDisplayContainer');
        if (projectDisplayContainer) {
            projectDisplayContainer.style.background = '#e5e7eb';
            projectDisplayContainer.style.cursor = 'not-allowed';
        }
        const projectDisplay = document.getElementById('projectDisplay');
        if (projectDisplay) projectDisplay.textContent = 'Select account first...';
        const selectedProjectId = document.getElementById('selectedProjectId');
        if (selectedProjectId) selectedProjectId.value = '';
        const newProjectFields = document.getElementById('newProjectFields');
        if (newProjectFields) newProjectFields.style.display = 'none';
        const newProjectName = document.getElementById('newProjectName');
        if (newProjectName) {
            newProjectName.value = '';
            newProjectName.required = false;
        }

        this.clearProjectFields();

        const industryOtherText = document.getElementById('industryOtherText');
        if (industryOtherText) {
            industryOtherText.style.display = 'none';
            industryOtherText.required = false;
            industryOtherText.value = '';
        }

        const activityFields = document.getElementById('activityFields');
        if (activityFields) activityFields.innerHTML = '';
        this.removeExtraActivityRows();

        // Reset radio buttons
        const radios = document.querySelectorAll('input[name="activityCategory"]');
        radios.forEach(radio => radio.checked = false);

        // Set default date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('activityDate');
        if (dateInput) dateInput.value = today;
    },

    // Helper functions
    toggleDealSize() {
        const status = document.getElementById('opportunityStatus').value;
        const group = document.getElementById('dealSizeGroup');
        if (group) {
            group.classList.toggle('d-none', status !== 'yes');
        }
    },

    setPOCEndDate(suffix = '') {
        const startDate = document.getElementById('pocStartDate' + suffix)?.value;
        if (startDate) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
            const endDateInput = document.getElementById('pocEndDate' + suffix);
            if (endDateInput) {
                endDateInput.value = endDate.toISOString().split('T')[0];
            }
        }
    }
};

// Expose Activities globally for onclick handlers
window.Activities = Activities;

