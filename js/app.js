import { AppState } from './state.js';
import { StorageEngine } from './storage.js';
import { AgendaController } from './components/agenda.js';
import { CanvasEngine } from './components/canvas-engine.js';

class ApplicationController {
    constructor() {
        this.storage = new StorageEngine();
        this.agenda = null;
        this.canvas = null;
    }

    async init() {
        await this.storage.init();
        
        // Instantiate component controllers
        this.canvas = new CanvasEngine(() => this.saveCurrentState());
        this.agenda = new AgendaController(
            () => this.saveCurrentState(),
            (slotTime, topic) => this.canvas.openStudio(slotTime, topic)
        );

        this.bindDateNavigation();
        this.bindBackupControls();
        
        await this.loadDateState(AppState.currentDate);
    }

    bindDateNavigation() {
        const dateInput = document.getElementById('dateInput');
        const dateDisplay = document.getElementById('dateDisplay');
        const btnPrevDay = document.getElementById('btnPrevDay');
        const btnNextDay = document.getElementById('btnNextDay');
        const btnToday = document.getElementById('btnToday');

        dateInput.value = AppState.currentDate;
        this.updateDateTitle(AppState.currentDate);

        dateInput.addEventListener('change', async (e) => {
            if (e.target.value) {
                AppState.currentDate = e.target.value;
                this.updateDateTitle(AppState.currentDate);
                await this.loadDateState(AppState.currentDate);
            }
        });

        btnPrevDay.onclick = () => this.shiftDate(-1);
        btnNextDay.onclick = () => this.shiftDate(1);
        btnToday.onclick = () => {
            AppState.currentDate = new Date().toISOString().split('T')[0];
            dateInput.value = AppState.currentDate;
            this.updateDateTitle(AppState.currentDate);
            this.loadDateState(AppState.currentDate);
        };
    }

    shiftDate(days) {
        const d = new Date(AppState.currentDate);
        d.setDate(d.getDate() + days);
        AppState.currentDate = d.toISOString().split('T')[0];
        document.getElementById('dateInput').value = AppState.currentDate;
        this.updateDateTitle(AppState.currentDate);
        this.loadDateState(AppState.currentDate);
    }

    updateDateTitle(isoString) {
        const parts = isoString.split('-');
        document.getElementById('dateDisplay').innerText = `${parts[0]}.${parts[1]}.${parts[2]}`;
    }

    async loadDateState(dateKey) {
        const record = await this.storage.getEntry(dateKey);
        AppState.agenda = (record && record.agenda) ? record.agenda : {};
        this.agenda.renderGrid();
    }

    async saveCurrentState() {
        const syncStatus = document.getElementById('syncStatus');
        syncStatus.innerText = 'STATUS: SAVING...';

        const record = {
            dateKey: AppState.currentDate,
            agenda: AppState.agenda,
            updatedAt: new Date().toISOString()
        };

        await this.storage.saveEntry(record);
        syncStatus.innerText = 'STATUS: IDLE';
    }

    bindBackupControls() {
        document.getElementById('btnExportJSON').onclick = async () => {
            const allEntries = await this.storage.getAllEntries();
            const blob = new Blob([JSON.stringify(allEntries, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RAMS_LOGBOOK_BACKUP_${AppState.currentDate}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const fileImport = document.getElementById('fileImport');
        document.getElementById('btnImportJSON').onclick = () => fileImport.click();

        fileImport.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const entries = JSON.parse(evt.target.result);
                    if (Array.isArray(entries)) {
                        for (const entry of entries) {
                            await this.storage.saveEntry(entry);
                        }
                        alert('RESTORE SUCCESSFUL.');
                        await this.loadDateState(AppState.currentDate);
                    }
                } catch (err) {
                    alert('INVALID BACKUP FILE.');
                }
            };
            reader.readAsText(file);
        };
    }
}

// Global Application Instantiation
window.addEventListener('DOMContentLoaded', () => {
    const app = new ApplicationController();
    app.init();
});
