class SyncService {
    static async sendToGAS(entryData) {
        if (!CONFIG.GAS_ENDPOINT || CONFIG.GAS_ENDPOINT.includes('YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL')) {
            throw new Error('Google Apps Script URL missing in js/config.js');
        }

        const response = await fetch(CONFIG.GAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(entryData)
        });

        const res = await response.json();
        if (res.status !== 'SUCCESS') throw new Error(res.message);
        return res;
    }
}
