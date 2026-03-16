/**
 * Server-side validation for storage payloads (D-001).
 * Reject malformed or invalid data before writing to storage.
 */

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const DATE_MIN = new Date('2020-01-01').getTime();
const DATE_MAX = new Date('2030-12-31').getTime();

function safeString(x) {
  return x == null ? '' : String(x).trim();
}

function parseDate(value) {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function isValidDateRange(date) {
  const d = parseDate(date);
  if (!d) return false;
  const t = d.getTime();
  return t >= DATE_MIN && t <= DATE_MAX;
}

/**
 * @param {*} value - Parsed value (array of activity objects)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateActivities(value) {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'activities must be an array' };
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `activities[${i}]: must be an object` };
    }
    if (!item.id || typeof item.id !== 'string' || !safeString(item.id)) {
      return { valid: false, error: `activities[${i}]: id required (non-empty string)` };
    }
    const dateVal = item.activityDate ?? item.date ?? item.createdAt ?? item.monthOfActivity;
    if (!isValidDateRange(dateVal)) {
      return { valid: false, error: `activities[${i}]: valid date (activityDate/date) required (2020–2030)` };
    }
    const typeVal = item.activityType ?? item.type;
    if (typeVal !== undefined && typeVal !== null && typeof typeVal !== 'string') {
      return { valid: false, error: `activities[${i}]: activityType/type must be string` };
    }
    if (item.durationHours !== undefined && (typeof item.durationHours !== 'number' || item.durationHours < 0 || item.durationHours > 24)) {
      return { valid: false, error: `activities[${i}]: durationHours must be 0–24` };
    }
    if (item.durationDays !== undefined && (typeof item.durationDays !== 'number' || item.durationDays < 0 || item.durationDays > 31)) {
      return { valid: false, error: `activities[${i}]: durationDays must be 0–31` };
    }
    if (item.accountId !== undefined && (typeof item.accountId !== 'string')) {
      return { valid: false, error: `activities[${i}]: accountId must be string` };
    }
    if (item.projectId !== undefined && (typeof item.projectId !== 'string')) {
      return { valid: false, error: `activities[${i}]: projectId must be string` };
    }
  }
  return { valid: true };
}

/**
 * @param {*} value - Parsed value (array of internal activity objects)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateInternalActivities(value) {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'internalActivities must be an array' };
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `internalActivities[${i}]: must be an object` };
    }
    if (!item.id || typeof item.id !== 'string' || !safeString(item.id)) {
      return { valid: false, error: `internalActivities[${i}]: id required (non-empty string)` };
    }
    const dateVal = item.activityDate ?? item.date ?? item.createdAt;
    if (!isValidDateRange(dateVal)) {
      return { valid: false, error: `internalActivities[${i}]: valid date required (2020–2030)` };
    }
    const typeVal = item.activityType ?? item.type;
    if (typeVal !== undefined && typeVal !== null && typeof typeVal !== 'string') {
      return { valid: false, error: `internalActivities[${i}]: activityType/type must be string` };
    }
    if (item.durationHours !== undefined && (typeof item.durationHours !== 'number' || item.durationHours < 0 || item.durationHours > 24)) {
      return { valid: false, error: `internalActivities[${i}]: durationHours must be 0–24` };
    }
    if (item.durationDays !== undefined && (typeof item.durationDays !== 'number' || item.durationDays < 0 || item.durationDays > 31)) {
      return { valid: false, error: `internalActivities[${i}]: durationDays must be 0–31` };
    }
  }
  return { valid: true };
}

/**
 * @param {*} value - Parsed value (array of account objects)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAccounts(value) {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'accounts must be an array' };
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `accounts[${i}]: must be an object` };
    }
    if (!item.id || typeof item.id !== 'string' || !safeString(item.id)) {
      return { valid: false, error: `accounts[${i}]: id required (non-empty string)` };
    }
    if (item.name !== undefined && item.name !== null && typeof item.name !== 'string') {
      return { valid: false, error: `accounts[${i}]: name must be string` };
    }
    if (Array.isArray(item.projects)) {
      for (let j = 0; j < item.projects.length; j++) {
        const proj = item.projects[j];
        if (proj && typeof proj === 'object') {
          if (proj.id !== undefined && typeof proj.id !== 'string') {
            return { valid: false, error: `accounts[${i}].projects[${j}]: id must be string` };
          }
          if (proj.name !== undefined && proj.name !== null && typeof proj.name !== 'string') {
            return { valid: false, error: `accounts[${i}].projects[${j}]: name must be string` };
          }
        }
      }
    }
  }
  return { valid: true };
}

/**
 * @param {*} value - Parsed value (array of user objects)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUsers(value) {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'users must be an array' };
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `users[${i}]: must be an object` };
    }
    if (!item.id || typeof item.id !== 'string' || !safeString(item.id)) {
      return { valid: false, error: `users[${i}]: id required (non-empty string)` };
    }
    if (!item.username || typeof item.username !== 'string' || !safeString(item.username)) {
      return { valid: false, error: `users[${i}]: username required (non-empty string)` };
    }
    if (item.email !== undefined && item.email !== null && typeof item.email !== 'string') {
      return { valid: false, error: `users[${i}]: email must be string` };
    }
  }
  return { valid: true };
}

const VALIDATORS = {
  activities: validateActivities,
  internalActivities: validateInternalActivities,
  accounts: validateAccounts,
  users: validateUsers
};

/**
 * Validate payload size (decompressed string length).
 * @param {string} serializedValue
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePayloadSize(serializedValue) {
  if (typeof serializedValue !== 'string') {
    return { valid: false, error: 'Payload must be a string' };
  }
  if (serializedValue.length > MAX_PAYLOAD_BYTES) {
    return { valid: false, error: `Payload exceeds maximum size (${MAX_PAYLOAD_BYTES / 1024 / 1024}MB)` };
  }
  return { valid: true };
}

/**
 * Validate a storage key's value. Value should be the parsed (JSON) value, not the raw string.
 * For size check, pass the raw string as third argument.
 * @param {string} key - Storage key (e.g. 'activities', 'accounts')
 * @param {*} parsedValue - Parsed JSON value (array or object); if null/undefined, only size check is run (when rawValue provided)
 * @param {string} [rawValue] - Raw string length used for size check (optional)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStoragePayload(key, parsedValue, rawValue) {
  if (rawValue != null && typeof rawValue === 'string') {
    const sizeResult = validatePayloadSize(rawValue);
    if (!sizeResult.valid) return sizeResult;
  }
  if (parsedValue == null) return { valid: true };
  const fn = VALIDATORS[key];
  if (!fn) return { valid: true };
  return fn(parsedValue);
}

module.exports = {
  validateActivities,
  validateInternalActivities,
  validateAccounts,
  validateUsers,
  validatePayloadSize,
  validateStoragePayload,
  VALIDATORS,
  MAX_PAYLOAD_BYTES
};
