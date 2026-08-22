document.addEventListener('DOMContentLoaded', async () => {
    function updateStatus(state, text) {
        const dot = document.getElementById('status-dot');
        const label = document.getElementById('status-text');
        dot.className = `status-dot ${state}`;
        label.innerText = text;
    }

    try {
        updateStatus('syncing', 'INITIALIZING CONFIG...');
        // 1. Load Root Environment Configuration
        const config = await ConfigManager.load();

        // 2. Initialize Local Storage (IndexedDB)
        const db = new LocalStorageEngine(config.DB_NAME, config.DB_VERSION);
        await db.init();

        let currentEntryId = new Date().toISOString().split('T')[0];
        document.getElementById('meta-date').value = currentEntryId;

        // 3. Initialize Inking Engine with dynamic colors from config
        const canvasContainer = document.getElementById('canvas-container');
        const inking = new SpatialInkingEngine(canvasContainer, saveLocalState, config.STROKE_COLORS);

        async function saveLocalState() {
            updateStatus('syncing', 'SAVING LOCAL...');
            const record = {
                entryId: currentEntryId,
                date: document.getElementById('meta-date').value,
                topic: document.getElementById('meta-topic').value,
                summary: document.getElementById('meta-summary').value,
                spatialData: inking.exportState(),
                updatedAt: new Date().toISOString()
            };
            await db.saveEntry(record);
            updateStatus('synced', 'LOCAL SAVED');
        }

        async function loadRecord(entryId) {
            const record = await db.getEntry(entryId);
            if (record) {
                document.getElementById('meta-topic').value = record.topic || '';
                document.getElementById('meta-summary').value = record.summary || '';
                inking.importState(record.spatialData);
                updateStatus('synced', 'LOADED FROM DB');
            } else {
                document.getElementById('meta-topic').value = '';
                document.getElementById('meta-summary').value = '';
                inking.importState(null);
                updateStatus('', 'NEW ENTRY');
            }
        }

        // Event Bindings
        document.getElementById('meta-date').addEventListener('change', (e) => {
            if (e.target.value) {
                currentEntryId = e.target.value;
                loadRecord(currentEntryId);
            }
        });

        ['meta-topic', 'meta-summary'].forEach(id => {
            document.getElementById(id).addEventListener('input', saveLocalState);
        });

        const btnL2 = document.getElementById('btn-layer-vector');
        const btnL3 = document.getElementById('btn-layer-annotation');

        btnL2.addEventListener('click', () => {
            btnL2.classList.add('active'); 
            btnL3.classList.remove('active');
            inking.setActiveLayer('vector');
        });

        btnL3.addEventListener('click', () => {
            btnL3.classList.add('active'); 
            btnL2.classList.remove('active');
            inking.setActiveLayer('annotation');
        });

        document.getElementById('file-bg-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                inking.strokeData.bgImageData = evt.target.result;
                inking.renderGrid();
                saveLocalState();
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            inking.clearLayer();
            saveLocalState();
        });

        document.getElementById('btn-sync').addEventListener('click', async () => {
            updateStatus('syncing', 'SYNCING GOOGLE DRIVE...');
            try {
                const record = await db.getEntry(currentEntryId);
                if (!record) return;
                await SyncService.sendToGAS(record);
                updateStatus('synced', 'CLOUD SYNCED');
            } catch (err) {
                console.error(err);
                updateStatus('', 'SYNC FAILED');
                alert(`Sync Failed: ${err.message}`);
            }
        });

        await loadRecord(currentEntryId);

    } catch (fatalError) {
        updateStatus('', 'BOOT FAILURE');
        alert(`Application Boot Error: Could not load config.json.\nEnsure 'config.json' exists at the root folder.`);
    }
});
