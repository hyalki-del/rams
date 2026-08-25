/**
 * Studio Modal Controller: Coordinates Notes, Visual Engine, and Metadata Persistence
 */
import { store } from '../state.js';
import { CanvasEngine } from './canvas-engine.js';

export class StudioModalController {
    constructor(modalEl, onSaveTopic) {
        this.modal = modalEl;
        this.onSaveTopic = onSaveTopic;
        this.activeTopic = null;

        // UI Binding References
        this.titleInput = document.getElementById('studioInputTitle');
        this.tagsInput = document.getElementById('studioInputTags');
        this.notesInput = document.getElementById('studioInputNotes');
        this.badgeEl = document.getElementById('studioTopicBadge');
        this.headerTitleEl = document.getElementById('studioTopicTitle');

        // Instantiate Layered Canvas Engine
        const viewport = document.getElementById('canvasViewport');
        const bgCanvas = document.getElementById('bgCanvas');
        const drawCanvas = document.getElementById('drawCanvas');
        this.engine = new CanvasEngine(viewport, bgCanvas, drawCanvas);

        this.bindEvents();
    }

    bindEvents() {
        // Modal Teardown & Save
        document.getElementById('btnCloseStudio').addEventListener('click', () => this.closeAndSave());

        // Inking Controls
        document.getElementById('btnLayerPencil').addEventListener('click', (e) => this.switchLayer('L2_Pencil', e.target));
        document.getElementById('btnLayerRedline').addEventListener('click', (e) => this.switchLayer('L3_Redline', e.target));
        
        document.getElementById('btnToolPencil').addEventListener('click', (e) => this.switchTool('pencil', e.target));
        document.getElementById('btnToolEraser').addEventListener('click', (e) => this.switchTool('eraser', e.target));

        document.getElementById('btnUndo').addEventListener('click', () => this.engine.undo());
        document.getElementById('btnRedo').addEventListener('click', () => this.engine.redo());
        document.getElementById('btnClearCanvas').addEventListener('click', () => {
            if (confirm('Clear ink layer?')) this.engine.clearInks();
        });

        // Photo Substrate
        document.getElementById('imgLoader').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.engine.setSubstrateImage(e.target.files[0]);
            }
        });
        document.getElementById('btnPurgeImage').addEventListener('click', () => {
            if (confirm('Remove photo overlay?')) this.engine.purgeSubstrateImage();
        });
    }

    open(topicRecord) {
        this.activeTopic = topicRecord;
        
        // Populate inputs
        this.titleInput.value = topicRecord.title || '';
        this.tagsInput.value = (topicRecord.tags || []).join(', ');
        this.notesInput.value = topicRecord.notes || '';
        
        this.headerTitleEl.innerText = (topicRecord.title || 'UNTITLED').toUpperCase();
        this.badgeEl.innerText = topicRecord.tags && topicRecord.tags[0] ? `#${topicRecord.tags[0].toUpperCase()}` : '#LOG';

        // Load Canvas Engine State
        this.engine.loadData(topicRecord.backgroundImage, topicRecord.strokes);

        this.modal.classList.remove('hidden');
    }

    switchLayer(layerName, targetBtn) {
        document.querySelectorAll('.btn-layer').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        store.setState({ activeLayer: layerName });
    }

    switchTool(toolName, targetBtn) {
        document.querySelectorAll('.btn-ram-tool').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        store.setState({ activeTool: toolName });
    }

    closeAndSave() {
        const canvasData = this.engine.getExportableData();
        
        const tagsArray = this.tagsInput.value
            .split(',')
            .map(t => t.trim().toUpperCase())
            .filter(Boolean);

        const updatedTopic = {
            ...this.activeTopic,
            title: this.titleInput.value.trim() || 'UNTITLED TOPIC',
            tags: tagsArray,
            notes: this.notesInput.value,
            backgroundImage: canvasData.backgroundImage,
            strokes: canvasData.strokes
        };

        this.modal.classList.add('hidden');
        this.onSaveTopic(updatedTopic);
    }
}
