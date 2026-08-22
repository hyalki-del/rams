class SyncService {
    static async sendToGAS(entryData) {
        const config = window.AppConfig.get();
        if (!config.GAS_ENDPOINT || config.GAS_ENDPOINT.includes('YOUR_APPS_SCRIPT_DEPLOYMENT_ID')) {
            throw new Error('GAS_ENDPOINT is not configured in config.json');
        }

        const response = await fetch(config.GAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const result = await response.json();
        if (result.status !== 'SUCCESS') throw new Error(result.message);
        return result;
    }
}
