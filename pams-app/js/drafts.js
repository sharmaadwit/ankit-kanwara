/**
 * Drafts: activities that failed to save (e.g. 404, network error).
 * Stored in localStorage so the user can open Drafts and submit again or discard.
 */
(function (global) {
    const STORAGE_KEY = '__pams_drafts__';
    const BACKUP_KEY = '__pams_drafts_backup__';

    function resolveDraftStorage() {
        try {
            // Always prefer real browser localStorage for drafts, never remote proxy storage.
            if (global.__BROWSER_LOCAL_STORAGE__) return global.__BROWSER_LOCAL_STORAGE__;
            if (typeof global.localStorage !== 'undefined') return global.localStorage;
        } catch (_) { }
        return null;
    }

    function getStorage() {
        try {
            const storage = resolveDraftStorage();
            if (!storage || typeof storage.getItem !== 'function') return [];
            const raw = storage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function setStorage(list) {
        try {
            const storage = resolveDraftStorage();
            if (storage && typeof storage.setItem === 'function') {
                storage.setItem(STORAGE_KEY, JSON.stringify(list));
                return true;
            }
            return false;
        } catch (e) {
            // quota or disabled
            return false;
        }
    }

    function generateId() {
        return 'draft_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    }

    const Drafts = {
        getDrafts() {
            return getStorage();
        },

        addDraft(options) {
            const { type, payload, errorMessage, storageKey, label } = options || {};
            if (!payload) return null;
            const list = getStorage();
            const draft = {
                id: generateId(),
                type: type === 'internal' ? 'internal' : 'external',
                payload: typeof payload === 'object' ? (Array.isArray(payload) ? payload.slice() : { ...payload }) : payload,
                errorMessage: typeof errorMessage === 'string' ? errorMessage : 'Save failed',
                attemptedAt: new Date().toISOString(),
                storageKey: typeof storageKey === 'string' && storageKey ? storageKey : null,
                label: typeof label === 'string' ? label : null
            };
            list.unshift(draft);
            const saved = setStorage(list);
            if (!saved) return null;
            return draft;
        },

        updateDraft(id, updates) {
            const list = getStorage();
            const idx = list.findIndex(function (d) { return d.id === id; });
            if (idx === -1) return;
            if (updates && typeof updates.errorMessage === 'string') list[idx].errorMessage = updates.errorMessage;
            setStorage(list);
        },

        removeDraft(id) {
            const list = getStorage().filter(function (d) { return d.id !== id; });
            setStorage(list);
        },

        clearDrafts() {
            setStorage([]);
        },

        /** Backup current drafts so we don't lose any if Submit all fails or tab closes. */
        backup() {
            try {
                const storage = resolveDraftStorage();
                if (!storage || typeof storage.setItem !== 'function') return false;
                const list = getStorage();
                storage.setItem(BACKUP_KEY, JSON.stringify({
                    at: new Date().toISOString(),
                    drafts: list
                }));
                return true;
            } catch (e) {
                return false;
            }
        },

        /** Return backup snapshot if any (e.g. for restore UI). */
        getBackup() {
            try {
                const storage = resolveDraftStorage();
                if (!storage || typeof storage.getItem !== 'function') return null;
                const raw = storage.getItem(BACKUP_KEY);
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (e) {
                return null;
            }
        },

        /** Restore drafts from last backup (e.g. after failed Submit all). */
        restoreFromBackup() {
            const snap = this.getBackup();
            if (!snap || !Array.isArray(snap.drafts)) return false;
            return setStorage(snap.drafts);
        }
    };

    global.Drafts = Drafts;
})(typeof window !== 'undefined' ? window : this);
