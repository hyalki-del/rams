class LocalStorageEngine {
    constructor(dbName = 'ArchVectorDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('entries')) {
                    db.createObjectStore('entries', { keyPath: 'entryId' });
                }
            };
            req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async saveEntry(record) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('entries', 'readwrite');
            tx.objectStore('entries').put(record);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    async getEntry(entryId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('entries', 'readonly');
            const req = tx.objectStore('entries').get(entryId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }
}
