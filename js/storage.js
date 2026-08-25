/**
 * LOCAL-FIRST INDEXEDDB ENGINE & JSON EXPORTER
 */
export class StorageEngine {
    constructor() {
        this.dbName = 'RamsArchLogbook';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('entries')) {
                    db.createObjectStore('entries', { keyPath: 'dateKey' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getEntry(dateKey) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            const tx = this.db.transaction('entries', 'readonly');
            const store = tx.objectStore('entries');
            const req = store.get(dateKey);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    async saveEntry(entryData) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('Database Not Initialized');
            const tx = this.db.transaction('entries', 'readwrite');
            const store = tx.objectStore('entries');
            const req = store.put(entryData);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async getAllEntries() {
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction('entries', 'readonly');
            const store = tx.objectStore('entries');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }
}
