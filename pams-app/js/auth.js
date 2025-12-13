// Authentication Module

const Auth = {
    currentUser: null,

    // Initialize authentication
    init() {
        // Check for existing session
        const session = localStorage.getItem('currentSession');
        if (session) {
            const sessionData = JSON.parse(session);
            const user = DataManager.getUserById(sessionData.userId);
            if (user && user.isActive) {
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
            console.log('Users found:', users.length);
            console.log('All usernames:', users.map(u => u.username));
            console.log('Looking for user:', username);
            console.log('Password entered:', password ? '***' : 'empty');
            
            // Trim username and password to avoid whitespace issues
            const trimmedUsername = username.trim();
            const trimmedPassword = password.trim();
            
            const user = users.find(u => {
                const match = u.username === trimmedUsername && u.password === trimmedPassword;
                if (match) {
                    console.log('Found matching user:', u.username, 'Active:', u.isActive);
                }
                return match;
            });
            
            if (user && user.isActive) {
                console.log('User found and active:', user.username);
                this.currentUser = user;
                localStorage.setItem('currentSession', JSON.stringify({
                    userId: user.id,
                    loginTime: new Date().toISOString()
                }));
                this.showMainApp();
                return { success: true, user };
            }
            
            // Debug: show what we're comparing
            const foundUser = users.find(u => u.username === trimmedUsername);
            if (foundUser) {
                console.log('User exists but password mismatch. Expected:', foundUser.password, 'Got:', trimmedPassword);
            } else {
                console.log('User not found in database');
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
        localStorage.removeItem('currentSession');
        this.showLoginScreen();
    },

    // Show login screen
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
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

