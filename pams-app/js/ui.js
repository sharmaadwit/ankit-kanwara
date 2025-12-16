// UI Utilities Module

const UI = {
    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 3000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // Close modal on outside click
    setupModalClose() {
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    },

    // Toggle sidebar (mobile)
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },

    setFieldError(element, message) {
        if (!element) return;
        this.clearFieldError(element);
        element.classList.add('field-error');
        element.setAttribute('aria-invalid', 'true');

        const container = element.closest('.form-group') || element.parentElement;
        if (container) {
            const error = document.createElement('div');
            error.className = 'form-error-message';
            if (element.id) {
                error.dataset.errorFor = element.id;
            }
            error.textContent = message;
            container.appendChild(error);
        }

        const clearHandler = () => {
            this.clearFieldError(element);
        };

        element.addEventListener('input', clearHandler, { once: true });
        element.addEventListener('change', clearHandler, { once: true });
        element.addEventListener('blur', clearHandler, { once: true });
    },

    clearFieldError(element) {
        if (!element) return;
        element.classList.remove('field-error');
        element.removeAttribute('aria-invalid');

        const container = element.closest('.form-group') || element.parentElement;
        if (container) {
            if (element.id) {
                container
                    .querySelectorAll(`.form-error-message[data-error-for="${element.id}"]`)
                    .forEach((node) => node.remove());
            } else {
                const sibling = container.querySelector('.form-error-message');
                if (sibling) sibling.remove();
            }
        }
    },

    // Format date
    formatDate(dateString) {
        return DataManager.formatDate(dateString);
    },

    // Format month
    formatMonth(monthString) {
        return DataManager.formatMonth(monthString);
    },

    // Get activity type label
    getActivityTypeLabel(type) {
        const labels = {
            'customerCall': 'Customer Call',
            'poc': 'POC',
            'rfx': 'RFx',
            'Enablement': 'Enablement',
            'Video Creation': 'Video Creation',
            'Webinar': 'Webinar',
            'Event/Booth Hosting': 'Event/Booth Hosting',
            'Product Feedback': 'Product Feedback',
            'Content Creation': 'Content Creation',
            'Training': 'Training',
            'Documentation': 'Documentation',
            'Internal Meeting': 'Internal Meeting',
            'Other': 'Other'
        };
        return labels[type] || type;
    },

    // Get activity summary
    getActivitySummary(activity) {
        if (!activity.details) return '';
        
        if (activity.type === 'customerCall') {
            return `${activity.details.callType || 'Call'} - ${activity.details.duration || '0'} mins`;
        } else if (activity.type === 'poc') {
            return `${activity.details.accessType || 'POC'} - ${activity.details.useCaseDescription || ''}`;
        } else if (activity.type === 'rfx') {
            return `${activity.details.rfxType || 'RFx'} - Due: ${this.formatDate(activity.details.submissionDeadline)}`;
        }
        
        return '';
    },

    // Empty state
    emptyState(message = 'No data available') {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>${message}</p>
            </div>
        `;
    }
};

// Initialize UI utilities
UI.setupModalClose();


