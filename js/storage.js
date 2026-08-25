/**
 * Offline-First IndexedDB Engine with Vector Serialization
 */
const DB_NAME = 'ArchLogbookDB';
const DB_VERSION = 1;
const STORE_NAME = 'agenda_entries';

class StorageEngine {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'date' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getEntry(dateKey) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(dateKey);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    // Return fresh day schema
                    resolve({
                        date: dateKey,
                        topics: []
                    });
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async saveEntry(entryData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(entryData);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async exportJSON() {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const blob = new Blob([JSON.stringify(request.result, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ARCH_LOGBOOK_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                resolve();
            };
        });
    }

    async importJSON(file) {
        const text = await file.text();
        const entries = JSON.parse(text);
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const entry of entries) {
            await store.put(entry);
        }
    }
}

export const storage = new StorageEngine();
