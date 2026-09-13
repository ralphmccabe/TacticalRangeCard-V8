/**
 * IDB_HELPER.js (FREE VERSION)
 * Robust IndexedDB wrapper for TRC FREE
 * Provides high-capacity, durable storage for DOPE cards.
 */

const DB_NAME = 'TRC_PRO_UPGRADE_DB';
const DB_VERSION = 10; // v10: Ensure workstationLibrary store is created for all users
const STORES = {
    PROFILES: 'rangeCardProfiles',
    VAULT: 'intelVault',
    DRAFTS: 'drafts',
    BOLO: 'boloLibrary',
    GAMETAG: 'gameTagLibrary',
    LICENSE: 'licenseLibrary', // Hunting/Fishing License & ID cards
    WORKSTATION: 'workstationLibrary'
};

const idb = {
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORES.PROFILES)) {
                    db.createObjectStore(STORES.PROFILES);
                }
                if (!db.objectStoreNames.contains(STORES.VAULT)) {
                    db.createObjectStore(STORES.VAULT);
                }
                if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
                    db.createObjectStore(STORES.DRAFTS);
                }
                if (!db.objectStoreNames.contains(STORES.BOLO)) {
                    db.createObjectStore(STORES.BOLO);
                }
                if (!db.objectStoreNames.contains(STORES.GAMETAG)) {
                    db.createObjectStore(STORES.GAMETAG);
                }
                if (!db.objectStoreNames.contains(STORES.LICENSE)) {
                    db.createObjectStore(STORES.LICENSE);
                }
                if (!db.objectStoreNames.contains(STORES.WORKSTATION)) {
                    db.createObjectStore(STORES.WORKSTATION);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("[IDB] Database error:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    async getStore(storeName, mode = 'readonly') {
        const db = await this.init();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    },

    async getAll(storeName) {
        const store = await this.getStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.openCursor();
            const results = {};
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    results[cursor.key] = cursor.value;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = (event) => reject(event.target.error);
        });
    },

    async get(storeName, key) {
        const store = await this.getStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    },

    async set(storeName, key, value) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    },

    async put(storeName, value) {
        // Alias for put without explicit key if value has it, 
        // or just a wrapper for set(storeName, value.id, value)
        const key = value.id || value.name;
        return this.set(storeName, key, value);
    },

    async delete(storeName, key) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    },

    async migrateFromLocalStorage() {
        console.log("[IDB] Checking for legacy data to migrate...");
        const legacyProfiles = localStorage.getItem('rangeCardProfiles');
        if (legacyProfiles) {
            try {
                const profiles = JSON.parse(legacyProfiles);
                const count = Object.keys(profiles).length;
                if (count > 0) {
                    console.log(`[IDB] Migrating ${count} profiles from LocalStorage...`);
                    for (const [name, data] of Object.entries(profiles)) {
                        await this.set(STORES.PROFILES, name, data);
                    }
                    localStorage.removeItem('rangeCardProfiles');
                    console.log("[IDB] Migration complete.");
                }
            } catch (e) {
                console.error("[IDB] Migration failed:", e);
            }
        }
    }
};

window.TRC_IDB = idb;
