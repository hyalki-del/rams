/**
 * Remote Synchronization & Data Marshalling Client
 * Handles HTTP payloads to Google Apps Script endpoints.
 */
class SyncService {
    /**
     * Serializes local IndexedDB records and dispatches them to Google Apps Script.
     * Uses text/plain Content-Type to bypass CORS preflight OPTIONS checks in GAS Web Apps.
     * 
     * @param {Object} entryData - Record object extracted from IndexedDB.
     * @returns {Promise<Object>} Operational payload response from backend endpoint.
     */
    static async sendToGAS(entryData) {
        let config;
        
        try {
            config = window.AppConfig.get();
        } catch (err) {
            throw new Error(`[SyncService] Configuration Unreachable: ${err.message}`);
        }

        const endpoint = config.GAS_ENDPOINT;

        if (!endpoint || endpoint.includes('YOUR_EXEC_ID_HERE')) {
            throw new Error('[SyncService] GAS_ENDPOINT is unconfigured or contains default placeholder in config.json.');
        }

        // Deep copy payload and validate structural integrity
        const payload = {
            entryId: entryData.entryId,
            date: entryData.date,
            topic: entryData.topic || '',
            summary: entryData.summary || '',
            spatialData: entryData.spatialData || { vectorStrokes: [], annotationStrokes: [], bgImageData: null },
            updatedAt: entryData.updatedAt || new Date().toISOString()
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`[SyncService] Remote HTTP Exception: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status !== 'SUCCESS') {
            throw new Error(`[SyncService] Backend Execution Error: ${result.message || 'Unknown status fault.'}`);
        }

        return result;
    }

    /**
     * Fetches metadata or stroke data directly from GAS for a given entry ID.
     * 
     * @param {string} entryId - Date primary key (YYYY-MM-DD).
     * @returns {Promise<Object>} Remote record metadata.
     */
    static async fetchFromGAS(entryId) {
        const config = window.AppConfig.get();
        const endpoint = `${config.GAS_ENDPOINT}?entryId=${encodeURIComponent(entryId)}`;

        const response = await fetch(endpoint, { method: 'GET' });
        
        if (!response.ok) {
            throw new Error(`[SyncService] Remote Fetch Failed: HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status !== 'SUCCESS') {
            throw new Error(`[SyncService] Remote Fetch Error: ${result.message}`);
        }

        return result.entry;
    }
}
