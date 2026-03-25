const {
  validateActivities,
  validateInternalActivities,
  validateAccounts,
  validateUsers,
  validatePayloadSize
} = require('../lib/storageValidation');

describe('storageValidation', () => {
  describe('validateActivities', () => {
    it('accepts valid activities array', () => {
      expect(validateActivities([
        { id: 'a1', date: '2025-01-15', type: 'customerCall', accountId: 'acc1', projectId: 'p1' }
      ])).toEqual({ valid: true });
    });
    it('rejects non-array', () => {
      const r = validateActivities({});
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/array/);
    });
    it('rejects missing id', () => {
      const r = validateActivities([{ date: '2025-01-15', type: 'call' }]);
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/id/);
    });
    it('rejects invalid date', () => {
      const r = validateActivities([{ id: 'a1', date: 'invalid', type: 'call' }]);
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/date/);
    });
    it('rejects date out of range', () => {
      const r = validateActivities([{ id: 'a1', date: '2051-01-01', type: 'call' }]);
      expect(r.valid).toBe(false);
    });
    it('rejects durationHours > 24', () => {
      const r = validateActivities([{ id: 'a1', date: '2025-01-15', type: 'call', durationHours: 25 }]);
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/durationHours/);
    });
  });

  describe('validateAccounts', () => {
    it('accepts valid accounts array', () => {
      expect(validateAccounts([{ id: 'acc1', name: 'Acme' }])).toEqual({ valid: true });
    });
    it('rejects missing id', () => {
      const r = validateAccounts([{ name: 'Acme' }]);
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/id/);
    });
    it('accepts optional projects', () => {
      expect(validateAccounts([{ id: 'acc1', name: 'Acme', projects: [{ id: 'p1', name: 'Proj' }] }])).toEqual({ valid: true });
    });
  });

  describe('validateUsers', () => {
    it('accepts valid users array', () => {
      expect(validateUsers([{ id: 'u1', username: 'john' }])).toEqual({ valid: true });
    });
    it('rejects missing username', () => {
      const r = validateUsers([{ id: 'u1' }]);
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/username/);
    });
  });

  describe('validatePayloadSize', () => {
    it('accepts string under limit', () => {
      expect(validatePayloadSize('[]')).toEqual({ valid: true });
    });
    it('rejects string over 5MB', () => {
      const r = validatePayloadSize('x'.repeat(5 * 1024 * 1024 + 1));
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/5/);
    });
  });
});
