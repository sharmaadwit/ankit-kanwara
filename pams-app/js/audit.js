(function () {
    if (typeof window === 'undefined') {
        return;
    }

    const CLICK_THROTTLE_MS = 400;
    const INPUT_DEBOUNCE_MS = 600;
    const MAX_TEXT_LENGTH = 80;

    let lastClickSignature = '';
    let lastClickTime = 0;
    const inputTimers = new WeakMap();
    let autoCaptureInitialized = false;

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
                    credentials: 'include',
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

    function shouldSkip(element) {
        return !element || element.closest?.('[data-audit-skip="true"]');
    }

    function resolveTarget(target) {
        if (!target) return null;
        if (target.nodeType === Node.TEXT_NODE) {
            target = target.parentElement;
        }
        const interactiveSelector = [
            '[data-audit-target]',
            'button',
            'a',
            'input',
            'select',
            'textarea',
            '[role="button"]',
            '[data-view]',
            '[data-feature]'
        ].join(', ');
        const candidate = target.closest?.(interactiveSelector);
        if (candidate) return candidate;

        if (
            target === document ||
            target === window ||
            target === document.body ||
            typeof target.matches !== 'function'
        ) {
            return null;
        }

        if (typeof target.onclick === 'function') {
            return target;
        }

        if (
            target.hasAttribute('data-audit-label') ||
            target.hasAttribute('data-action') ||
            target.hasAttribute('data-feature')
        ) {
            return target;
        }

        return null;
    }

    function buildDescriptor(element) {
        if (!element || !element.tagName) return 'unknown';
        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        let classes = '';
        if (element.classList && element.classList.length) {
            const limitedClasses = Array.from(element.classList).slice(0, 3);
            classes = limitedClasses.length ? `.${limitedClasses.join('.')}` : '';
        }
        return `${tag}${id}${classes}`;
    }

    function getElementLabel(element) {
        if (!element) return null;
        const explicit = element.getAttribute?.('data-audit-label');
        if (explicit) return explicit.slice(0, MAX_TEXT_LENGTH);
        const aria = element.getAttribute?.('aria-label');
        if (aria) return aria.slice(0, MAX_TEXT_LENGTH);
        if (element.labels && element.labels.length) {
            const labelText = Array.from(element.labels)
                .map((label) => label.innerText || label.textContent || '')
                .join(' ')
                .trim();
            if (labelText) return labelText.slice(0, MAX_TEXT_LENGTH);
        }
        const closestLabel = element.closest && element.closest('label');
        if (closestLabel) {
            const labelText = closestLabel.innerText || closestLabel.textContent || '';
            if (labelText.trim()) return labelText.trim().slice(0, MAX_TEXT_LENGTH);
        }
        if (element.innerText && element.innerText.trim()) {
            return element.innerText.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT_LENGTH);
        }
        return null;
    }

    function collectMetadata(element, eventType) {
        const metadata = {
            event: eventType,
            tag: element?.tagName?.toLowerCase() || null,
            id: element?.id || null,
            name: element?.name || null,
            role: element?.getAttribute?.('role') || null,
            path: window.location.pathname,
            view: typeof App !== 'undefined' ? App.currentView || null : null,
            dataFeature: element?.getAttribute?.('data-feature') || null,
            dataView: element?.getAttribute?.('data-view') || null,
            timestamp: new Date().toISOString()
        };

        const label = getElementLabel(element);
        if (label) {
            metadata.label = label;
        }

        if (eventType === 'click') {
            metadata.button = element?.getAttribute?.('data-action') || element?.type || null;
        }

        if (eventType === 'input' || eventType === 'change') {
            const type = element?.type || element?.tagName?.toLowerCase() || null;
            metadata.controlType = type;
            if (type === 'checkbox' || type === 'radio') {
                metadata.checked = Boolean(element?.checked);
            } else if (type === 'password') {
                metadata.valueLength = element?.value?.length || 0;
            } else if (typeof element?.value === 'string') {
                metadata.valueLength = element.value.length;
                metadata.isEmpty = element.value.length === 0;
            }
        }

        return metadata;
    }

    function logInteraction(eventType, element) {
        if (!element) return;
        const descriptor = buildDescriptor(element);
        const detail = collectMetadata(element, eventType);
        try {
            Audit.log({
                action: `ui.${eventType}`,
                entity: descriptor,
                entityId: element.id || null,
                detail
            });
        } catch (error) {
            console.warn('Failed to capture audit event', error);
        }
    }

    function handleClick(event) {
        const element = resolveTarget(event.target);
        if (!element || shouldSkip(element)) return;

        const descriptor = buildDescriptor(element);
        const now = Date.now();
        if (descriptor === lastClickSignature && now - lastClickTime < CLICK_THROTTLE_MS) {
            return;
        }
        lastClickSignature = descriptor;
        lastClickTime = now;
        logInteraction('click', element);
    }

    function scheduleInputLog(element, eventType, immediate = false) {
        if (!element || shouldSkip(element)) return;
        if (immediate) {
            const timer = inputTimers.get(element);
            if (timer) {
                clearTimeout(timer);
                inputTimers.delete(element);
            }
            logInteraction(eventType, element);
            return;
        }

        const existing = inputTimers.get(element);
        if (existing) {
            clearTimeout(existing);
        }
        const timer = window.setTimeout(() => {
            inputTimers.delete(element);
            logInteraction(eventType, element);
        }, INPUT_DEBOUNCE_MS);
        inputTimers.set(element, timer);
    }

    function handleInput(event) {
        const element = resolveTarget(event.target);
        if (!element) return;
        const eventType = event.type === 'change' ? 'change' : 'input';
        const immediate = event.type === 'change';
        scheduleInputLog(element, eventType, immediate);
    }

    function initAutoCaptureListeners() {
        if (autoCaptureInitialized) return;
        autoCaptureInitialized = true;
        document.addEventListener('click', handleClick, true);
        document.addEventListener('input', handleInput, true);
        document.addEventListener('change', handleInput, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoCaptureListeners, { once: true });
    } else {
        initAutoCaptureListeners();
    }

    window.Audit = Audit;
})();