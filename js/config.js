/**
 * Asynchronous Configuration Loader Module
 * Reads root-level config.json over HTTP and exposes immutable config state.
 */
(function () {
    'use me strict';

    // Internal memory cache
    let configData = null;

    window.AppConfig = {
        /**
         * Fetches root config.json with a cache-busting timestamp
         * @returns {Promise<Object>} Resolved configuration object
         */
        async load() {
            if (configData) return configData;

            try {
                // Fetch relative to application execution root
                const response = await fetch('./config.json?v=' + Date.now(), {
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status} when fetching config.json`);
                }

                configData = await response.json();

                if (!configData.GAS_ENDPOINT) {
                    throw new Error("Missing key 'GAS_ENDPOINT' in config.json");
                }

                return configData;
            } catch (error) {
                console.error("[ConfigEngine] Boot Failure:", error);
                throw error;
            }
        },

        /**
         * Synchronous getter once resolved
         */
        get() {
            if (!configData) {
                throw new Error("[ConfigEngine] Config requested before async resolution completed!");
            }
            return configData;
        }
    };
})();
