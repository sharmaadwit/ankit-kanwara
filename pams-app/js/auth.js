// Authentication Module

const Auth = {
    currentUser: null,
    pendingPasswordChangeUser: null,
    currentLoginTab: 'presales',
    currentSessionId: null, // Track session ID for logout logging
    // Resolved after login: 'presales' | 'sales_leader' | 'leader'; sales_leader has salesLeaderRegion set on currentUser

    getSessionStore() {
        try {
            if (typeof window === 'undefined') return null;
            if (window.__BROWSER_LOCAL_STORAGE__) {
                return window.__BROWSER_LOCAL_STORAGE__;
            }
            if (!window.__REMOTE_STORAGE_ENABLED__ && window.localStorage) {
                return window.localStorage;
            }
            if (window.sessionStorage) {
                return window.sessionStorage;
            }
            if (window.localStorage) {
                return window.localStorage;
            }
            return null;
        } catch (error) {
            console.warn('Session storage unavailable', error);
            return null;
        }
    },

    readSession() {
        const store = this.getSessionStore();
        if (!store) return null;
        try {
            const raw = store.getItem('session') || store.getItem('currentSession');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            try {
                store.removeItem('session');
                store.removeItem('currentSession');
            } catch (cleanupError) {
                console.warn('Unable to clear corrupt session token', cleanupError);
            }
            console.warn('Failed to read session token', error);
            return null;
        }
    },

    writeSession(payload) {
        try {
            const store = this.getSessionStore();
            if (!store) return;
            const data = {
                userId: payload.userId,
                loginTime: payload.loginTime,
                sessionId: payload.sessionId,
                role: payload.role || 'presales',
                salesLeaderRegion: payload.salesLeaderRegion || null
            };
            store.setItem('session', JSON.stringify(data));
            this.currentSessionId = payload.sessionId;
        } catch (error) {
            console.error('Failed to write session:', error);
        }
    },

    clearSession() {
        const store = this.getSessionStore();
        if (store) {
            try {
                store.removeItem('session');
                store.removeItem('currentSession');
            } catch (error) {
                console.warn('Unable to clear session token', error);
            }
        }
        this.clearRemoteSessionArtifact();
    },

    clearRemoteSessionArtifact() {
        try {
            if (
                typeof window === 'undefined' ||
                !window.__REMOTE_STORAGE_ENABLED__ ||
                !window.__BROWSER_LOCAL_STORAGE__
            ) {
                return;
            }
            window.localStorage.removeItem('session');
            window.localStorage.removeItem('currentSession');
        } catch (error) {
            console.warn('Unable to clear shared session token', error);
        }
    },

    /** Resolve role from Leaders and Sales Leaders; set on user and return for session. */
    async resolveRole(user) {
        if (!user || !user.id) return { role: 'presales', salesLeaderRegion: null };
        const email = (user.email || user.username || '').toString().trim().toLowerCase();
        const [leaderEmails, salesLeaders] = await Promise.all([
            typeof DataManager !== 'undefined' && DataManager.getLeaders ? DataManager.getLeaders() : [],
            typeof DataManager !== 'undefined' && DataManager.getSalesLeaders ? DataManager.getSalesLeaders() : {}
        ]);
        if (leaderEmails && leaderEmails.includes(email)) {
            return { role: 'leader', salesLeaderRegion: null };
        }
        if (salesLeaders && typeof salesLeaders === 'object') {
            const userEmail = email;
            const userEmailAlt = (user.username || '').toString().trim().toLowerCase();
            for (const [region, value] of Object.entries(salesLeaders)) {
                if (!value) continue;
                const v = String(value).trim().toLowerCase();
                if (v.includes('@')) {
                    if (userEmail === v || userEmailAlt === v) return { role: 'sales_leader', salesLeaderRegion: region };
                } else {
                    if (value === user.id || String(value) === String(user.id)) return { role: 'sales_leader', salesLeaderRegion: region };
                }
            }
        }
        return { role: 'presales', salesLeaderRegion: null };
    },

    switchLoginTab(tab, options = {}) {
        this.currentLoginTab = 'presales';
        const loginForm = document.getElementById('loginForm');
        const passwordResetForm = document.getElementById('passwordResetForm');
        const passwordResetVisible = passwordResetForm && !passwordResetForm.classList.contains('hidden');
        if (loginForm && !passwordResetVisible) {
            loginForm.classList.remove('hidden');
            loginForm.removeAttribute('novalidate');
            if (!options.skipFocus) {
                const usernameInput = document.getElementById('username');
                if (usernameInput) setTimeout(() => usernameInput.focus(), 50);
            }
        }
    },

    updateLoginTabButtons(activeTab) {
        document.querySelectorAll('.login-tab').forEach(button => {
            button.classList.toggle('active', (button.dataset.tab || 'presales') === activeTab);
        });
    },

    // Initialize authentication
    async init() {
        this.clearRemoteSessionArtifact();
        const sessionData = this.readSession();

        // Cookie-first: restore session from GET /api/auth/me when server sent cookieAuth
        if (typeof window !== 'undefined' && window.__USE_COOKIE_AUTH__) {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    const me = await res.json();
                    const user = {
                        id: me.userId,
                        username: me.username,
                        email: me.email || '',
                        roles: me.roles || [],
                        regions: me.regions || [],
                        salesReps: me.salesReps || [],
                        defaultRegion: me.defaultRegion || '',
                        isActive: true
                    };
                    const { role, salesLeaderRegion } = await this.resolveRole(user);
                    user.role = role;
                    user.salesLeaderRegion = salesLeaderRegion || undefined;
                    this.currentUser = user;
                    this.writeSession({
                        userId: user.id,
                        loginTime: new Date().toISOString(),
                        role,
                        salesLeaderRegion: salesLeaderRegion || undefined
                    });
                    this.showMainApp();
                    if ((role === 'leader' || role === 'sales_leader') && typeof App !== 'undefined' && App.switchView) {
                        App.switchView('reports');
                    }
                    return true;
                }
            } catch (e) {
                console.warn('Cookie session restore failed:', e);
            }
        }

        if (sessionData && sessionData.userId) {
            const user = await DataManager.getUserById(sessionData.userId);
            if (user && user.isActive) {
                if (user.forcePasswordChange) {
                    this.clearSession();
                    return false;
                }
                const role = sessionData.role || (await this.resolveRole(user)).role;
                const salesLeaderRegion = sessionData.salesLeaderRegion != null ? sessionData.salesLeaderRegion : (await this.resolveRole(user)).salesLeaderRegion;
                user.role = role;
                user.salesLeaderRegion = salesLeaderRegion || undefined;
                this.currentUser = user;
                this.showMainApp();
                if ((role === 'leader' || role === 'sales_leader') && typeof App !== 'undefined' && App.switchView) {
                    App.switchView('reports');
                }
                return true;
            }
            this.clearSession();
        }
        return false;
    },

    // Login
    async login(username, password) {
        try {
            const trimmedUsername = (username || '').trim();
            const trimmedPassword = (password || '').trim();
            if (!trimmedUsername || !trimmedPassword) {
                this.reportLoginEvent('failure', { username: trimmedUsername, message: 'Username and password required' });
                return { success: false, message: 'Username and password are required.' };
            }

            // Cookie-first auth: POST /api/auth/login, then use returned user
            if (typeof window !== 'undefined' && window.__USE_COOKIE_AUTH__) {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.user) {
                    const user = data.user;
                    if (data.forcePasswordChange) {
                        this.reportLoginEvent('success', { username: trimmedUsername, message: 'Password change required' });
                        this.pendingPasswordChangeUser = { ...user, forcePasswordChange: true };
                        this.showPasswordChangePrompt(this.pendingPasswordChangeUser);
                        return { success: true, requiresPasswordChange: true };
                    }
                    this.pendingPasswordChangeUser = null;
                    const { role, salesLeaderRegion } = await this.resolveRole(user);
                    user.role = role;
                    user.salesLeaderRegion = salesLeaderRegion || undefined;
                    this.currentUser = user;
                    this.writeSession({
                        userId: user.id,
                        loginTime: new Date().toISOString(),
                        sessionId: data.sessionId,
                        role,
                        salesLeaderRegion: salesLeaderRegion || undefined
                    });
                    this.reportLoginEvent('success', { username: trimmedUsername, message: 'Login successful' });
                    this.showMainApp();
                    if ((role === 'leader' || role === 'sales_leader') && typeof App !== 'undefined' && App.switchView) {
                        App.switchView('reports');
                    }
                    return { success: true, user, requiresPasswordChange: false };
                }
                this.reportLoginEvent('failure', { username: trimmedUsername, message: data.message || 'Invalid credentials' });
                return { success: false, message: data.message || 'Invalid credentials.' };
            }

            // Legacy: validate against DataManager.getUsers()
            await DataManager.ensureDefaultUsers();
            const users = await DataManager.getUsers();
            const user = users.find(u => {
                const match = u.username === trimmedUsername && u.password === trimmedPassword;
                return match;
            });

            if (user && user.isActive) {
                if (user.forcePasswordChange) {
                    this.reportLoginEvent('success', {
                        username: trimmedUsername,
                        message: 'Password change required'
                    });
                    this.pendingPasswordChangeUser = user;
                    this.showPasswordChangePrompt(user);
                    if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
                        Audit.log({
                            action: 'auth.forcePasswordPrompt',
                            entity: 'user',
                            entityId: user.id
                        });
                    }
                    return { success: true, requiresPasswordChange: true };
                }
                this.pendingPasswordChangeUser = null;
                const { role, salesLeaderRegion } = await this.resolveRole(user);
                user.role = role;
                user.salesLeaderRegion = salesLeaderRegion || undefined;
                this.currentUser = user;
                this.writeSession({
                    userId: user.id,
                    loginTime: new Date().toISOString(),
                    role,
                    salesLeaderRegion: salesLeaderRegion || undefined
                });
                this.reportLoginEvent('success', {
                    username: trimmedUsername,
                    message: 'Login successful'
                });
                this.showMainApp();
                if ((role === 'leader' || role === 'sales_leader') && typeof App !== 'undefined' && App.switchView) {
                    App.switchView('reports');
                }
                return { success: true, user, requiresPasswordChange: false };
            }

            // Debug: show what we're comparing
            const foundUser = users.find(u => u.username === trimmedUsername);
            if (foundUser) {
                console.warn('Login attempt failed: password mismatch for user', trimmedUsername);
            } else {
                console.warn('Login attempt failed: user not found', trimmedUsername);
            }
            this.reportLoginEvent('failure', {
                username: trimmedUsername,
                message: 'Invalid credentials'
            });

            return { success: false, message: 'Invalid credentials' };
        } catch (error) {
            console.error('Login error:', error);
            this.reportLoginEvent('failure', {
                username: username ? String(username).trim() : '',
                message: error.message || 'Login error'
            });
            return { success: false, message: 'Login error: ' + error.message };
        }
    },

    // Logout
    logout() {
        const sessionId = this.currentSessionId; // Get session ID before clearing
        this.currentUser = null;
        this.pendingPasswordChangeUser = null;
        this.clearSession();
        this.clearRemoteSessionArtifact();
        this.showLoginScreen();

        // Send logout event to server (cookie cleared when credentials: 'include')
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        }).catch(err => console.warn('Logout logging failed:', err));
    },

    showLoginScreen() {
        this.resetLoginForms();
        this.currentLoginTab = 'presales';
        this.switchLoginTab('presales', { skipFocus: true });
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        const usernameInput = document.getElementById('username');
        loginScreen?.classList.remove('hidden');
        mainApp?.classList.add('hidden');
        if (usernameInput) {
            usernameInput.value = '';
            setTimeout(() => usernameInput.focus(), 50);
        }
        this.updateUserInfo();
    },

    // Show main app
    showMainApp() {
        try {
            const loginScreen = document.getElementById('loginScreen');
            const mainApp = document.getElementById('mainApp');

            if (!loginScreen || !mainApp) {
                console.error('Login screen or main app element not found');
                return;
            }

            loginScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            // Prevent hidden login forms from triggering "invalid form control not focusable"
            ['loginForm', 'passwordResetForm'].forEach(id => {
                const form = document.getElementById(id);
                if (form) form.setAttribute('novalidate', 'novalidate');
            });
            this.updateUserInfo();
            this.updateNavigation();
            if (typeof App !== 'undefined' && typeof App.setLoading === 'function') {
                App.setLoading(false);
            }
        } catch (error) {
            console.error('Error showing main app:', error);
        }
    },

    resetLoginForms() {
        const loginForm = document.getElementById('loginForm');
        const resetForm = document.getElementById('passwordResetForm');
        const banner = document.getElementById('forcePasswordBanner');
        const subtitle = document.getElementById('loginSubtitle');
        const demoTexts = document.querySelectorAll('.login-demo');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const forceUser = document.getElementById('forcePasswordUser');
        const forceMessage = document.getElementById('forcePasswordMessage');

        if (loginForm) {
            loginForm.classList.remove('hidden');
            loginForm.removeAttribute('novalidate');
            loginForm.reset();
        }
        if (resetForm) {
            resetForm.classList.add('hidden');
            resetForm.setAttribute('novalidate', 'novalidate');
            resetForm.reset();
        }
        if (banner) {
            banner.classList.add('hidden');
        }
        demoTexts.forEach(el => el.classList.remove('hidden'));
        if (subtitle) {
            subtitle.textContent = 'Presales Activity Management System';
        }
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        if (forceUser) forceUser.textContent = '';
        if (forceMessage) {
            forceMessage.textContent = 'please set a new password before continuing.';
        }
        this.currentLoginTab = 'presales';
        this.switchLoginTab('presales', { skipFocus: true });
        if (typeof App !== 'undefined' && typeof App.setLoading === 'function') {
            App.setLoading(false);
        }
    },

    showPasswordChangePrompt(user) {
        const loginForm = document.getElementById('loginForm');
        const resetForm = document.getElementById('passwordResetForm');
        const banner = document.getElementById('forcePasswordBanner');
        const subtitle = document.getElementById('loginSubtitle');
        const demoTexts = document.querySelectorAll('.login-demo');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const forceUser = document.getElementById('forcePasswordUser');
        const forceMessage = document.getElementById('forcePasswordMessage');

        if (loginForm) {
            loginForm.classList.add('hidden');
            loginForm.setAttribute('novalidate', 'novalidate');
        }
        if (resetForm) {
            resetForm.classList.remove('hidden');
            resetForm.removeAttribute('novalidate');
            resetForm.reset();
        }
        if (banner) {
            banner.classList.remove('hidden');
        }
        demoTexts.forEach(el => el.classList.add('hidden'));
        if (subtitle) {
            subtitle.textContent = 'Update your password to continue';
        }
        if (forceUser) {
            const displayName = user?.username || user?.email || 'there';
            forceUser.textContent = `Hi ${displayName},`;
        }
        if (forceMessage) {
            forceMessage.textContent = 'please set a new password before continuing.';
        }
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        setTimeout(() => {
            if (newPasswordInput) {
                newPasswordInput.focus();
            }
        }, 0);
        this.updateLoginTabButtons('presales');
        if (typeof App !== 'undefined' && typeof App.setLoading === 'function') {
            App.setLoading(false);
        }
    },

    async submitForcedPasswordChange(newPassword, confirmPassword) {
        try {
            const pendingUser = this.pendingPasswordChangeUser;
            if (!pendingUser) {
                UI.showNotification('No password update required.', 'info');
                return;
            }
            const trimmedPassword = (newPassword || '').trim();
            const trimmedConfirm = (confirmPassword || '').trim();

            if (trimmedPassword.length < 6) {
                UI.showNotification('Password must be at least 6 characters long.', 'error');
                return;
            }
            if (trimmedPassword !== trimmedConfirm) {
                UI.showNotification('Passwords do not match.', 'error');
                return;
            }
            if (trimmedPassword === pendingUser.password) {
                UI.showNotification('Please choose a password different from the temporary one.', 'error');
                return;
            }

            const updated = await DataManager.updateUser(pendingUser.id, {
                password: trimmedPassword,
                forcePasswordChange: false
            });
            if (!updated) {
                UI.showNotification('Unable to update password. Please try again.', 'error');
                return;
            }

            this.pendingPasswordChangeUser = null;
            this.currentUser = updated;
            this.writeSession({
                userId: updated.id,
                loginTime: new Date().toISOString()
            });
            this.resetLoginForms();
            this.showMainApp();
            if (typeof App !== 'undefined' && typeof App.handleSuccessfulLogin === 'function') {
                App.handleSuccessfulLogin();
            }
            this.reportLoginEvent('success', {
                username: updated.username,
                message: 'Password updated'
            });
            UI.showNotification('Password updated. Welcome!', 'success');
            if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
                Audit.log({
                    action: 'auth.passwordChange',
                    entity: 'user',
                    entityId: updated.id
                });
            }
        } catch (error) {
            console.error('Forced password change failed:', error);
            UI.showNotification('Unable to update password. Please try again.', 'error');
        }
    },

    // Update user info in header
    updateUserInfo() {
        try {
            const display = document.getElementById('currentUsernameDisplay');
            if (!display) return;
            if (this.currentUser && this.currentUser.username) {
                display.textContent = this.currentUser.username;
                display.classList.remove('hidden');
            } else {
                display.textContent = '';
                display.classList.add('hidden');
            }
        } catch (error) {
            console.warn('Unable to update header username', error);
        }
    },

    // Update navigation based on roles
    updateNavigation() {
        if (!this.currentUser) return;

        const isAdmin = this.currentUser.roles.includes('Admin');
        const adminNav = document.getElementById('adminNav');
        const systemAdminNav = document.getElementById('systemAdminNav');
        const configurationNav = document.getElementById('configurationNav');

        // Hide legacy admin nav, show new ones
        if (adminNav) {
            adminNav.classList.add('hidden');
        }
        if (systemAdminNav) {
            systemAdminNav.classList.toggle('hidden', !isAdmin);
        }
        if (configurationNav) {
            configurationNav.classList.toggle('hidden', !isAdmin);
        }

        document.querySelectorAll('[data-admin-only="true"]').forEach(el => {
            el.classList.toggle('hidden', !this.isAdmin());
        });

        const analyticsOnly = this.isAnalyticsOnly();
        document.querySelectorAll('.sidebar-link').forEach(link => {
            const view = link.dataset.view;
            const allow = !analyticsOnly || view === 'reports';
            link.classList.toggle('hidden', !allow);
        });
        document.querySelectorAll('.nav-card.clickable').forEach(card => {
            const allow = !analyticsOnly || card.classList.contains('reports');
            card.classList.toggle('hidden', !allow);
        });
    },

    // Check if user has role
    hasRole(role) {
        return this.currentUser && this.currentUser.roles.includes(role);
    },

    reportLoginEvent(status, details = {}) {
        try {
            if (typeof window === 'undefined' || window.location.protocol === 'file:') {
                return;
            }

            const payload = {
                username: details.username || '',
                status,
                message: details.message || '',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
            };

            fetch('/api/admin/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => { });
        } catch (error) {
            console.warn('Failed to report login event', error);
        }
    },

    // Check if user is admin
    isAdmin() {
        return this.hasRole('Admin');
    },

    isAnalyticsOnly() {
        if (!this.currentUser) return false;
        // Leader (CXO) or Sales leader: reports-only view
        if (this.currentUser.role === 'leader' || this.currentUser.role === 'sales_leader') return true;
        const roles = this.currentUser.roles;
        if (!Array.isArray(roles)) return false;
        const privilegedRoles = ['Admin', 'Presales User', 'POC Admin'];
        const hasPrivileged = roles.some(role => privilegedRoles.includes(role));
        return roles.includes('Analytics Access') && !hasPrivileged;
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
};

