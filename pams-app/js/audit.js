(function () {
    if (typeof window === 'undefined') {
        return;
    }

    const Audit = {
        log(event = {}) {
            try {
                const payload = {
                    username: Audit.getCurrentUsername(),
                    action: event.action || 'unknown',
                    entity: event.entity || '',
                    entityId: event.entityId || '',
                    detail: event.detail || {}
                };

                fetch('/api/admin/activity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).catch(() => {});
            } catch (error) {
                console.warn('Failed to emit audit log', error);
            }
        },

        getCurrentUsername() {
            try {
                if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
                    const user = Auth.getCurrentUser();
                    return user?.username || null;
                }
            } catch (error) {
                return null;
            }
            return null;
        }
    };

    window.Audit = Audit;
})();


