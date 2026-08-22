window.AppConfig = (function () {
    let configInstance = null;
    return {
        async load() {
            if (configInstance) return configInstance;
            const res = await fetch('./config.json?v=' + Date.now());
            if (!res.ok) throw new Error('Could not load config.json from root');
            configInstance = await res.json();
            return configInstance;
        },
        get() {
            if (!configInstance) throw new Error('Config requested before load complete');
            return configInstance;
        }
    };
})();
