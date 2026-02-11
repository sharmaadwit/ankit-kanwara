/**
 * Drafts: activities that failed to save (e.g. 404, network error).
 * Stored in localStorage so the user can open Drafts and submit again or discard.
 */
(function (global) {
    const STORAGE_KEY = '__pams_drafts__';

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
