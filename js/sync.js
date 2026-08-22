class ConfigManager {
    static instance = null;

    /**
     * Asynchronously fetches and parses root config.json
     * @returns {Promise<Object>} Configuration object
     */
    static async load() {
        if (ConfigManager.instance) {
            return ConfigManager.instance;
        }

        try {
            const response = await fetch('./config.json', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Failed to load config.json: HTTP ${response.status}`);
            }
            ConfigManager.instance = await response.json();
            return ConfigManager.instance;
        } catch (err) {
            console.error('Config Initialization Failure:', err);
            throw err;
        }
    }

    static get() {
        if (!ConfigManager.instance) {
            throw new Error('ConfigManager accessed before initialization.');
        }
        return ConfigManager.instance;
    }
}

class SyncService {
    /**
     * Dispatches spatial payloads to Google Apps Script
     * @param {Object} entryData - Record object to serialize
     */
    static async sendToGAS(entryData) {
        const config = ConfigManager.get();

        if (!config.GAS_ENDPOINT || config.GAS_ENDPOINT.includes('YOUR_EXEC_ID_HERE')) {
            throw new Error('Invalid GAS_ENDPOINT in config.json. Please set your deployment URL.');
        }

        // WebApp CORS bypass via text/plain payload content-type
        const response = await fetch(config.GAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(entryData)
        });

        const res = await response.json();
        if (res.status !== 'SUCCESS') {
            throw new Error(res.message || 'Remote Endpoint Processing Error');
        }
        return res;
    }
}
