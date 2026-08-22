/**
 * Application Bootstrap & Event Orchestration Controller
 * Handles application lifecycle, UI binding, state synchronization, and canvas initialization.
 */
document.addEventListener('DOMContentLoaded', async () => {
    
    /**
     * Update header status indicator dot and label
     * @param {string} state - State class ('synced', 'syncing', or '')
     * @param {string} text - Message label to render
     */
    function updateStatus(state, text) {
        const dot = document.getElementById('status-dot');
        const label = document.getElementById('status-text');
        if (dot) dot.className = `status-dot ${state}`;
        if (label) label.innerText = text;
    }

    try {
        updateStatus('syncing', 'INITIALIZING CONFIG...');

        // 1. Asynchronously load and resolve root environment config.json
        const config = await window.AppConfig.load();

        // 2. Instantiate and establish IndexedDB storage transaction layer
        const db = new LocalStorageEngine(config.DB_NAME, config.DB_VERSION);
        await db.init();

        // 3. Establish default Date primary key state (YYYY-MM-DD)
        let currentEntryId = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('meta-date');
        if (dateInput) dateInput.value = currentEntryId;

        // 4. Initialize Multi-layer Spatial Inking Engine
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) {
            throw new Error("Critical DOM Element missing: '#canvas-container'");
        }

        const inking = new SpatialInkingEngine(
            canvasContainer,
            saveLocalState,
            config.STROKE_COLORS
        );

        /**
         * Persists active canvas vector model and sidebar metadata to IndexedDB
         */
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

            try {
                await db.saveEntry(record);
                updateStatus('synced', 'LOCAL SAVED');
            } catch (err) {
                console.error('[AppController] Storage Failure:', err);
                updateStatus('', 'SAVE ERROR');
            }
        }

        /**
         * Loads record entry from IndexedDB into Sidebar inputs and Canvas Engine
         * @param {string} entryId - Primary Key Date (YYYY-MM-DD)
         */
        async function loadRecord(entryId) {
            try {
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
            } catch (err) {
                console.error('[AppController] Entry Retrieval Failure:', err);
                updateStatus('', 'LOAD ERROR');
            }
        }

        // --- Event Listener Registration Pipeline ---

        // Date Picker Change Handler
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                if (e.target.value) {
                    currentEntryId = e.target.value;
                    loadRecord(currentEntryId);
                }
            });
        }

        // Live Metadata Auto-save Event Handlers
        ['meta-topic', 'meta-summary'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', saveLocalState);
        });

        // Layer Switch Control Listeners
        const btnL2 = document.getElementById('btn-layer-vector');
        const btnL3 = document.getElementById('btn-layer-annotation');

        if (btnL2 && btnL3) {
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
        }

        // Blueprint/Background Image Upload Handler
        const bgInput = document.getElementById('file-bg-input');
        if (bgInput) {
            bgInput.addEventListener('change', (e) => {
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
        }

        // Clear Layer Action Handler
        const btnClear = document.getElementById('btn-clear');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                inking.clearLayer();
                saveLocalState();
            });
        }

        // Remote Google Apps Script Sync Dispatcher
        const btnSync = document.getElementById('btn-sync');
        if (btnSync) {
            btnSync.addEventListener('click', async () => {
                updateStatus('syncing', 'SYNCING GOOGLE DRIVE...');
                try {
                    const record = await db.getEntry(currentEntryId);
                    if (!record) {
                        alert('No local entry data found to sync.');
                        updateStatus('', 'SYNC ABORTED');
                        return;
                    }
                    
                    await SyncService.sendToGAS(record);
                    updateStatus('synced', 'CLOUD SYNCED');
                } catch (err) {
                    console.error('[AppController] Cloud Synchronization Exception:', err);
                    updateStatus('', 'SYNC FAILED');
                    alert(`Synchronization Error: ${err.message}`);
                }
            });
        }

        // Load Initial State on Execution Complete
        await loadRecord(currentEntryId);

    } catch (fatalError) {
        console.error('[AppController] Critical Initialization Failure:', fatalError);
        updateStatus('', 'CONFIG / BOOT ERROR');
        alert(
            `Fatal Application Error:\n${fatalError.message}\n\n` +
            `Verify 'config.json' exists at the root and you are serving via HTTP/HTTPS (e.g., 'npx serve').`
        );
    }
});
