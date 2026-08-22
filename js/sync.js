class SyncService {
    /**
     * Dispatches spatial vector payload to Google Apps Script
     * @param {Object} entryData - Canvas entry record
     */
    static async sendToGAS(entryData) {
        // Read configuration safely from initialized AppConfig singleton
        const config = window.AppConfig.get();

        if (!config.GAS_ENDPOINT || config.GAS_ENDPOINT.includes('YOUR_EXEC_ID_HERE')) {
            throw new Error('GAS_ENDPOINT is not configured in config.json');
        }

        const response = await fetch(config.GAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Bypasses CORS Preflight OPTIONS check
            body: JSON.stringify(entryData)
        });

        const res = await response.json();
        if (res.status !== 'SUCCESS') {
            throw new Error(res.message || 'Remote Endpoint Processing Error');
        }
        return res;
    }
}
