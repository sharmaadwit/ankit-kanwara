// Interface Management Module

const InterfaceManager = {
    interfaceOptions: ['modern', 'compact', 'dashboard', 'minimal', 'card'],
    themeOptions: ['light', 'dark', 'gupshup'],
    currentInterface: 'card',
    currentTheme: 'light',

    init() {
        // Load saved preferences (fall back to defaults if missing/invalid)
        const savedInterface = localStorage.getItem('interfacePreference');
        if (savedInterface && this.interfaceOptions.includes(savedInterface)) {
            this.currentInterface = savedInterface;
        }

        const savedTheme = localStorage.getItem('colorSchemePreference');
        if (savedTheme && this.themeOptions.includes(savedTheme)) {
            this.currentTheme = savedTheme;
        }

        this.applyInterface();
    },

    // Change interface (admin only)
    changeInterface(interfaceType) {
        if (!Auth.isAdmin()) {
            UI.showNotification('Only admins can change interface preference', 'error');
            return;
        }

        const normalized = this.interfaceOptions.includes(interfaceType) ? interfaceType : 'card';
        this.currentInterface = normalized;
        localStorage.setItem('interfacePreference', normalized);
        this.applyInterface();
        UI.showNotification(`Interface updated to ${normalized}`, 'success');
    },

    changeTheme(themeKey) {
        if (!Auth.isAdmin()) {
            UI.showNotification('Only admins can change interface preference', 'error');
            return;
        }

        const normalized = this.themeOptions.includes(themeKey) ? themeKey : 'light';
        this.currentTheme = normalized;
        localStorage.setItem('colorSchemePreference', normalized);
        this.applyInterface();
        UI.showNotification(`Color scheme updated to ${normalized}`, 'success');
    },

    // Apply interface style
    applyInterface() {
        const body = document.body;

        const interfaceClasses = this.interfaceOptions.map(option => `interface-${option}`);
        const themeClasses = this.themeOptions.map(option => `theme-${option}`);

        body.classList.remove(...interfaceClasses, ...themeClasses);

        body.classList.add(`interface-${this.currentInterface}`);
        body.classList.add(`theme-${this.currentTheme}`);

        // Update select if exists
        const select = document.getElementById('interfaceSelect');
        if (select) {
            select.value = this.currentInterface;
        }

        const themeSelect = document.getElementById('interfaceThemeSelect');
        if (themeSelect) {
            themeSelect.value = this.currentTheme;
        }

        // Reapply the current view so layout matches the selected interface
        if (typeof App !== 'undefined' && App.currentView) {
            if (this.currentInterface === 'card') {
                App.navigateToCardView(App.currentView);
            } else {
                App.switchView(App.currentView);
            }
        }
    },

    // Get current interface
    getCurrentInterface() {
        return this.currentInterface;
    },

    getCurrentTheme() {
        return this.currentTheme;
    }
};

