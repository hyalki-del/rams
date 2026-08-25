/**
 * Master Application Bootstrapper & Controller Orchestrator
 */
import { store } from './state.js';
import { storage } from './storage.js';
import { AgendaController } from './components/agenda.js';
import { StudioModalController } from './components/studio-modal.js';

class AppController {
    constructor() {
        this.agendaView = null;
        this.studioModal = null;
    }

    async init() {
        await storage.init();

        // UI Bindings
        this.datePicker = document.getElementById('datePicker');
        this.displayDateHeading = document.getElementById('displayDateHeading');
        
        const topicContainer = document.getElementById('topicContainer');
        const modalEl = document.getElementById('studioModal');

        // Instantiate Components
        this.agendaView = new AgendaController(topicContainer, this.openStudioForTopic.bind(this));
        this.studioModal = new StudioModalController(modalEl, this.saveTopicState.bind(this));

        this.bindEvents();
        
        // Initial State Boot
        const initialDate = store.getState().currentDate;
        this.datePicker.value = initialDate;
        await this.loadDay(initialDate);

        store.subscribe(this.handleStateChange.bind(this));
    }

    bindEvents() {
        // Date Shuffler Navigation
        this.datePicker.addEventListener('change', (e) => this.loadDay(e.target.value));
        
        document.getElementById('btnPrevDate').addEventListener('click', () => {
            const current = new Date(store.getState().currentDate);
            current.setDate(current.getDate() - 1);
            const prevStr = current.toISOString().split('T')[0];
            this.datePicker.value = prevStr;
            this.loadDay(prevStr);
        });

        document.getElementById('btnNextDate').addEventListener('click', () => {
            const current = new Date(store.getState().currentDate);
            current.setDate(current.getDate() + 1);
            const nextStr = current.toISOString().split('T')[0];
            this.datePicker.value = nextStr;
            this.loadDay(nextStr);
        });

        // Topic Creation
        document.getElementById('btnNewTopic').addEventListener('click', () => this.createTopic());

        // Backup Export / Import
        document.getElementById('btnExportJSON').addEventListener('click', () => storage.exportJSON());
        
        const fileImport = document.getElementById('fileImport');
        document.getElementById('btnImportJSON').addEventListener('click', () => fileImport.click());
        fileImport.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                await storage.importJSON(e.target.files[0]);
                await this.loadDay(store.getState().currentDate);
                alert('ARCHIVE IMPORTED SUCCESSFULLY.');
            }
        });
    }

    async loadDay(dateKey) {
        const record = await storage.getEntry(dateKey);
        this.displayDateHeading.innerText = dateKey.replace(/-/g, '.');
        store.setState({ currentDate: dateKey, activeEntry: record });
        this.agendaView.render(record);
    }

    async createTopic() {
        const state = store.getState();
        const activeEntry = state.activeEntry;

        const newTopic = {
            id: Date.now().toString(),
            title: 'NEW FIELD SKETCH',
            tags: ['SITE'],
            notes: '',
            backgroundImage: null,
            strokes: []
        };

        activeEntry.topics.push(newTopic);
        await storage.saveEntry(activeEntry);
        this.agendaView.render(activeEntry);
        
        // Auto-open studio for quick entry
        this.openStudioForTopic(newTopic.id);
    }

    openStudioForTopic(topicId) {
        const state = store.getState();
        const topic = state.activeEntry.topics.find(t => t.id === topicId);
        if (topic) {
            store.setState({ activeTopicId: topicId });
            this.studioModal.open(topic);
        }
    }

    async saveTopicState(updatedTopic) {
        const state = store.getState();
        const activeEntry = state.activeEntry;

        const index = activeEntry.topics.findIndex(t => t.id === updatedTopic.id);
        if (index !== -1) {
            activeEntry.topics[index] = updatedTopic;
            await storage.saveEntry(activeEntry);
            this.agendaView.render(activeEntry);
        }
    }

    handleStateChange(state) {
        // Handle cross-cutting concerns if needed
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.init();
});
