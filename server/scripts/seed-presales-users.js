#!/usr/bin/env node

/**
 * Seed or update presales users in the storage-backed user list.
 * Usage: node server/scripts/seed-presales-users.js
 *
 * The script is idempotent: it will insert missing users and update existing
 * ones with the expected defaults (password, region, forced reset).
 */

require('dotenv').config();

const { initDb, closePool, getPool } = require('../db');

const NOW = new Date().toISOString();
const FORCE_PASSWORD = 'Welcome@Gupshup1';

const NEW_USERS = [
  {
    username: 'nikhil.sharma',
    email: 'nikhil.sharma@knowlarity.com',
    defaultRegion: 'India North'
  },
  {
    username: 'purusottam.singh',
    email: 'purusottam.singh@gupshup.io',
    defaultRegion: 'India West'
  },
  {
    username: 'puru.chauhan',
    email: 'puru.chauhan@knowlarity.com',
    defaultRegion: 'India North'
  },
  {
    username: 'mridul.kumawat',
    email: 'mridul.kumawat@gupshup.io',
    defaultRegion: 'India West'
  },
  {
    username: 'kathyayani.nayak',
    email: 'kathyayani.nayak@gupshup.io',
    defaultRegion: 'India South'
  },
  {
    username: 'yashas.reddy',
    email: 'yashas.reddy@gupshup.io',
    defaultRegion: 'Africa & Europe'
  },
  {
    username: 'mauricio.martins',
    email: 'mauricio.martins@gupshup.io',
    defaultRegion: 'LATAM'
  },
  {
    username: 'gargi.upadhyay',
    email: 'gargi.upadhyay@gupshup.io',
    defaultRegion: 'MENA'
  },
  {
    username: 'siddharth.singh',
    email: 'siddharth.singh@gupshup.io',
    defaultRegion: 'MENA'
  },
  {
    username: 'adwit.sharma',
    email: 'adwit.sharma@gupshup.io',
    defaultRegion: ''
  }
];

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

const normaliseEmail = (email) =>
  (email || '').trim().toLowerCase();

const ensureArray = (value) =>
  Array.isArray(value) ? value : [];

const upsertUsers = (existingUsers) => {
  const users = Array.isArray(existingUsers) ? existingUsers.slice() : [];
  const existingByEmail = new Map();
  users.forEach((user) => {
    if (user?.email) {
      existingByEmail.set(normaliseEmail(user.email), user);
    }
  });

  let mutated = false;

  NEW_USERS.forEach((template) => {
    const emailKey = normaliseEmail(template.email);
    if (!emailKey) {
      return;
    }

    const regions = template.defaultRegion
      ? [template.defaultRegion]
      : [];

    if (!existingByEmail.has(emailKey)) {
      users.push({
        id: generateId(),
        username: template.username,
        email: template.email,
        password: FORCE_PASSWORD,
        roles: ['Presales User'],
        regions,
        salesReps: [],
        defaultRegion: template.defaultRegion || '',
        isActive: true,
        createdAt: NOW,
        forcePasswordChange: true,
        passwordUpdatedAt: null
      });
      mutated = true;
      return;
    }

    const user = existingByEmail.get(emailKey);
    let changed = false;

    const ensureRole = (role) => {
      if (!Array.isArray(user.roles)) {
        user.roles = [];
      }
      if (!user.roles.includes(role)) {
        user.roles.push(role);
        changed = true;
      }
    };

    ensureRole('Presales User');

    if (template.defaultRegion && user.defaultRegion !== template.defaultRegion) {
      user.defaultRegion = template.defaultRegion;
      changed = true;
    }

    if (template.defaultRegion) {
      const currentRegions = ensureArray(user.regions);
      if (!currentRegions.includes(template.defaultRegion)) {
        currentRegions.push(template.defaultRegion);
        user.regions = currentRegions;
        changed = true;
      }
    }

    if (user.forcePasswordChange !== true) {
      user.forcePasswordChange = true;
      changed = true;
    }

    if (user.password !== FORCE_PASSWORD) {
      user.password = FORCE_PASSWORD;
      changed = true;
    }

    if (user.passwordUpdatedAt !== null) {
      user.passwordUpdatedAt = null;
      changed = true;
    }

    if (!user.createdAt) {
      user.createdAt = NOW;
      changed = true;
    }

    if (changed) {
      mutated = true;
    }
  });

  return { users, mutated };
};

const main = async () => {
  await initDb();
  const client = await getPool().connect();

  try {
    const { rows } = await client.query(
      'SELECT value FROM storage WHERE key = $1;',
      ['users']
    );

    let currentUsers = [];
    if (rows.length && rows[0].value) {
      try {
        currentUsers = JSON.parse(rows[0].value);
      } catch (error) {
        console.warn('Failed to parse existing users payload, starting fresh.', error);
      }
    }

    const { users, mutated } = upsertUsers(currentUsers);

    if (!mutated) {
      console.log('Presales user roster already up to date. No changes applied.');
      return;
    }

    await client.query(
      `
        INSERT INTO storage (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = excluded.value, updated_at = NOW();
      `,
      ['users', JSON.stringify(users)]
    );

    console.log('Presales user roster updated.');
  } finally {
    client.release();
    await closePool();
  }
};

main()
  .catch((error) => {
    console.error('Failed to seed presales users:', error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });


