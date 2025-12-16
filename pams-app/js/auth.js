// Authentication Module

const Auth = {
    currentUser: null,
    pendingPasswordChangeUser: null,

    // Initialize authentication
    init() {
        // Check for existing session
        const session = localStorage.getItem('currentSession');
        if (session) {
            const sessionData = JSON.parse(session);
            const user = DataManager.getUserById(sessionData.userId);
            if (user && user.isActive) {
                if (user.forcePasswordChange) {
                    console.log('Session user requires password change, resetting session.');
                    localStorage.removeItem('currentSession');
                    return false;
                }
                this.currentUser = user;
                this.showMainApp();
                return true;
            } else {
                localStorage.removeItem('currentSession');
            }
        }
        return false;
    },

    // Login
    login(username, password) {
        try {
            // Ensure default users exist
            DataManager.ensureDefaultUsers();
            
            const users = DataManager.getUsers();
            
            // Trim username and password to avoid whitespace issues
            const trimmedUsername = username.trim();
            const trimmedPassword = password.trim();
            
            const user = users.find(u => {
                const match = u.username === trimmedUsername && u.password === trimmedPassword;
                return match;
            });
            
            if (user && user.isActive) {
                if (user.forcePasswordChange) {
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
                this.currentUser = user;
                localStorage.setItem('currentSession', JSON.stringify({
                    userId: user.id,
                    loginTime: new Date().toISOString()
                }));
                this.showMainApp();
                return { success: true, user, requiresPasswordChange: false };
            }
            
            // Debug: show what we're comparing
            const foundUser = users.find(u => u.username === trimmedUsername);
            if (foundUser) {
                console.warn('Login attempt failed: password mismatch for user', trimmedUsername);
            } else {
                console.warn('Login attempt failed: user not found', trimmedUsername);
            }
            
            return { success: false, message: 'Invalid credentials' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login error: ' + error.message };
        }
    },

    // Logout
    logout() {
        this.currentUser = null;
        this.pendingPasswordChangeUser = null;
        localStorage.removeItem('currentSession');
        this.showLoginScreen();
    },

    // Show login screen
    showLoginScreen() {
        this.resetLoginForms();
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        loginScreen?.classList.remove('hidden');
        mainApp?.classList.add('hidden');
        if (usernameInput) {
            usernameInput.value = '';
            usernameInput.focus();
        }
        if (passwordInput) {
            passwordInput.value = '';
        }
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
            this.updateUserInfo();
            this.updateNavigation();
            console.log('Main app shown successfully');
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
            loginForm.reset();
        }
        if (resetForm) {
            resetForm.classList.add('hidden');
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
        }
        if (resetForm) {
            resetForm.classList.remove('hidden');
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
    },

    submitForcedPasswordChange(newPassword, confirmPassword) {
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

            const updated = DataManager.updateUser(pendingUser.id, {
                password: trimmedPassword,
                forcePasswordChange: false
            });
            if (!updated) {
                UI.showNotification('Unable to update password. Please try again.', 'error');
                return;
            }

            this.pendingPasswordChangeUser = null;
            this.currentUser = updated;
            localStorage.setItem('currentSession', JSON.stringify({
                userId: updated.id,
                loginTime: new Date().toISOString()
            }));
            this.resetLoginForms();
            this.showMainApp();
            if (typeof App !== 'undefined' && typeof App.handleSuccessfulLogin === 'function') {
                App.handleSuccessfulLogin();
            }
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
        // User info removed from header - only logout button remains
        // This function kept for compatibility but does nothing
        return;
    },

    // Update navigation based on roles
    updateNavigation() {
        if (!this.currentUser) return;

        const adminNav = document.getElementById('adminNav');
        if (adminNav) {
            const isAdmin = this.currentUser.roles.includes('Admin');
            adminNav.classList.toggle('hidden', !isAdmin);
        }

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

    // Check if user is admin
    isAdmin() {
        return this.hasRole('Admin');
    },

    isAnalyticsOnly() {
        if (!this.currentUser || !Array.isArray(this.currentUser.roles)) return false;
        const roles = this.currentUser.roles;
        const privilegedRoles = ['Admin', 'Presales User', 'POC Admin'];
        const hasPrivileged = roles.some(role => privilegedRoles.includes(role));
        return roles.includes('Analytics Access') && !hasPrivileged;
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
};

