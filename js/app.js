document.addEventListener('DOMContentLoaded', async () => {
    function setStatus(state, text) {
        const dot = document.getElementById('status-dot');
        const label = document.getElementById('status-text');
        if (dot) dot.className = `status-indicator ${state}`;
        if (label) label.innerText = text;
    }

    try {
        setStatus('syncing', 'LOADING CONFIG...');
        const config = await window.AppConfig.load();

        const db = new LocalStorageEngine();
        await db.init();

        let currentEntryId = new Date().toISOString().split('T')[0];
        document.getElementById('meta-date').value = currentEntryId;

        const svgEl = document.getElementById('vector-svg');
        const engine = new NormalizedVectorEngine(svgEl, saveLocalState);

        async function saveLocalState() {
            setStatus('syncing', 'SAVING LOCAL...');
            const record = {
                entryId: currentEntryId,
                date: document.getElementById('meta-date').value,
                topic: document.getElementById('meta-topic').value,
                summary: document.getElementById('meta-summary').value,
                spatialData: engine.exportState(),
                updatedAt: new Date().toISOString()
            };
            await db.saveEntry(record);
            setStatus('synced', 'LOCAL SAVED');
        }

        async function loadRecord(id) {
            const record = await db.getEntry(id);
            if (record) {
                document.getElementById('meta-topic').value = record.topic || '';
                document.getElementById('meta-summary').value = record.summary || '';
                engine.importState(record.spatialData);
                setStatus('synced', 'LOADED FROM DB');
            } else {
                document.getElementById('meta-topic').value = '';
                document.getElementById('meta-summary').value = '';
                engine.importState(null);
                setStatus('', 'NEW ENTRY');
            }
        }

        // Bind Controls
        document.getElementById('meta-date').addEventListener('change', (e) => {
            if (e.target.value) {
                currentEntryId = e.target.value;
                loadRecord(currentEntryId);
            }
        });

        ['meta-topic', 'meta-summary'].forEach(id => {
            document.getElementById(id).addEventListener('input', saveLocalState);
        });

        const btnDraw = document.getElementById('tool-draw');
        const btnRedline = document.getElementById('tool-redline');

        btnDraw.addEventListener('click', () => {
            btnDraw.classList.add('active'); btnRedline.classList.remove('active');
            engine.activeLayerName = 'sketch';
        });

        btnRedline.addEventListener('click', () => {
            btnRedline.classList.add('active'); btnDraw.classList.remove('active');
            engine.activeLayerName = 'redline';
        });

        document.getElementById('file-bg').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                engine.vectorState.bgImageData = evt.target.result;
                engine.redrawAll();
                saveLocalState();
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            engine.clearActiveLayer();
            saveLocalState();
        });

        document.getElementById('btn-sync').addEventListener('click', async () => {
            setStatus('syncing', 'SYNCING GOOGLE DRIVE...');
            try {
                const record = await db.getEntry(currentEntryId);
                if (!record) return;
                await SyncService.sendToGAS(record);
                setStatus('synced', 'CLOUD SYNCED');
            } catch (err) {
                console.error(err);
                setStatus('', 'SYNC FAILED');
                alert(`Cloud Sync Error: ${err.message}`);
            }
        });

        window.addEventListener('resize', () => engine.redrawAll());
        await loadRecord(currentEntryId);

    } catch (err) {
        console.error(err);
        setStatus('', 'BOOT ERROR');
        alert(`Application Boot Error: ${err.message}`);
    }
});
