/**
 * Drafts: activities that failed to save (e.g. 404, network error).
 * Stored in localStorage so the user can open Drafts and submit again or discard.
 */
(function (global) {
    const STORAGE_KEY = '__pams_drafts__';

    function getStorage() {
        try {
            if (typeof global.localStorage === 'undefined') return [];
            const raw = global.localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function setStorage(list) {
        try {
            if (typeof global.localStorage !== 'undefined') {
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            }
        } catch (e) {
            // quota or disabled
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
            const { type, payload, errorMessage, storageKey } = options || {};
            if (!payload) return null;
            const list = getStorage();
            const draft = {
                id: generateId(),
                type: type === 'internal' ? 'internal' : 'external',
                payload: typeof payload === 'object' ? (Array.isArray(payload) ? payload.slice() : { ...payload }) : payload,
                errorMessage: typeof errorMessage === 'string' ? errorMessage : 'Save failed',
                attemptedAt: new Date().toISOString(),
                storageKey: typeof storageKey === 'string' && storageKey ? storageKey : null
            };
            list.unshift(draft);
            setStorage(list);
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
        }
    };

    global.Drafts = Drafts;
})(typeof window !== 'undefined' ? window : this);
