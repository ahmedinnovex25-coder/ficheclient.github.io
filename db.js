/**
 * db.js — IndexedDB wrapper for Fiche Client PWA
 * Stores: visitors, team members, app settings
 */

const DB_NAME = 'FicheClientDB';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Visitors store
      if (!database.objectStoreNames.contains('visitors')) {
        const visitorsStore = database.createObjectStore('visitors', {
          keyPath: 'id',
          autoIncrement: true,
        });
        visitorsStore.createIndex('date', 'date', { unique: false });
        visitorsStore.createIndex('email', 'email', { unique: false });
      }

      // Team members store
      if (!database.objectStoreNames.contains('team')) {
        const teamStore = database.createObjectStore('team', {
          keyPath: 'id',
          autoIncrement: true,
        });
        teamStore.createIndex('nom', 'nom', { unique: false });
      }

      // Settings store (for admin password etc.)
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

function txStore(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Visitors ─────────────────────────────────────────────────────────────────

async function addVisitor(visitor) {
  await openDB();
  visitor.date = new Date().toISOString();
  return promisify(txStore('visitors', 'readwrite').add(visitor));
}

async function getAllVisitors() {
  await openDB();
  return promisify(txStore('visitors').getAll());
}

async function deleteVisitor(id) {
  await openDB();
  return promisify(txStore('visitors', 'readwrite').delete(id));
}

// ─── Team ─────────────────────────────────────────────────────────────────────

async function addTeamMember(member) {
  await openDB();
  return promisify(txStore('team', 'readwrite').add(member));
}

async function getAllTeamMembers() {
  await openDB();
  return promisify(txStore('team').getAll());
}

async function deleteTeamMember(id) {
  await openDB();
  return promisify(txStore('team', 'readwrite').delete(id));
}

// ─── Settings ────────────────────────────────────────────────────────────────

async function getSetting(key) {
  await openDB();
  const result = await promisify(txStore('settings').get(key));
  return result ? result.value : null;
}

async function setSetting(key, value) {
  await openDB();
  return promisify(txStore('settings', 'readwrite').put({ key, value }));
}

// ─── Export ───────────────────────────────────────────────────────────────────

window.DB = {
  openDB,
  addVisitor,
  getAllVisitors,
  deleteVisitor,
  addTeamMember,
  getAllTeamMembers,
  deleteTeamMember,
  getSetting,
  setSetting,
};
