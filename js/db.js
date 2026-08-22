class LocalStorageEngine {
    constructor(dbName = 'ArchitecturalAgendaDB', dbVersion = 1) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('entries')) {
                    db.createObjectStore('entries', { keyPath: 'entryId' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async saveEntry(entry) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('entries', 'readwrite');
            tx.objectStore('entries').put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    async getEntry(entryId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('entries', 'readonly');
            const request = tx.objectStore('entries').get(entryId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
}
