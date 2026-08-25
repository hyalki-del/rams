import { AppState } from '../state.js';

export class CanvasEngine {
    constructor(saveCallback) {
        this.saveCallback = saveCallback;
        this.bgCanvas = document.getElementById('bgCanvas');
        this.drawCanvas = document.getElementById('drawCanvas');
        this.viewport = document.getElementById('canvasViewport');
        this.ctxBg = this.bgCanvas.getContext('2d');
        this.ctxDraw = this.drawCanvas.getContext('2d');

        this.isDrawing = false;
        this.currentStroke = null;

        this.bindEvents();
        this.bindToolbar();
    }

    resize() {
        if (!document.getElementById('studioModal').classList.contains('open')) return;
        const rect = this.viewport.getBoundingClientRect();
        this.drawCanvas.width = rect.width;
        this.drawCanvas.height = rect.height;
        this.bgCanvas.width = rect.width;
        this.bgCanvas.height = rect.height;
        this.redraw();
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        this.drawCanvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.drawCanvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.drawCanvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.drawCanvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

        document.getElementById('btnCloseStudio').onclick = () => this.closeStudio();
        document.getElementById('btnUndo').onclick = () => this.undo();
        document.getElementById('btnRedo').onclick = () => this.redo();
    }

    openStudio(slotTime, topic) {
        AppState.activeSlot = slotTime;
        AppState.activeTopicId = topic.id;
        AppState.activeTopicTitle = topic.title;
        AppState.strokes = topic.strokes || [];
        AppState.bgImageBase64 = topic.bgImage || null;

        AppState.history = [JSON.stringify(AppState.strokes)];
        AppState.historyStep = 0;

        document.getElementById('studioTopicTitle').innerText = `TOPIC: ${topic.title}`;
        document.getElementById('studioTimeTag').innerText = slotTime;
        document.getElementById('studioModal').classList.add('open');

        setTimeout(() => this.resize(), 50);
    }

    closeStudio() {
        if (AppState.activeSlot && AppState.activeTopicId) {
            const topic = AppState.agenda[AppState.activeSlot].find(t => t.id === AppState.activeTopicId);
            if (topic) {
                topic.strokes = AppState.strokes;
                topic.bgImage = AppState.bgImageBase64;
                this.saveCallback();
            }
        }
        document.getElementById('studioModal').classList.remove('open');
        this.hideAllSubPanels();
    }

    handlePointerDown(e) {
        if (AppState.activeLayer === 'L1') return; // Layer 1 reserved for Image/Blueprint

        this.isDrawing = true;
        this.drawCanvas.setPointerCapture(e.pointerId);

        const coords = this.getCoords(e);
        const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

        this.currentStroke = {
            layer: AppState.activeLayer,
            tool: AppState.currentTool,
            color: AppState.penColor,
            size: AppState.penSize,
            points: [{ x: coords.x, y: coords.y, pressure }]
        };

        this.ctxDraw.beginPath();
        this.ctxDraw.moveTo(coords.x, coords.y);
    }

    handlePointerMove(e) {
        if (!this.isDrawing || !this.currentStroke) return;

        const coords = this.getCoords(e);
        const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

        this.currentStroke.points.push({ x: coords.x, y: coords.y, pressure });
        this.renderSegment(this.currentStroke, this.currentStroke.points.length - 2, this.currentStroke.points.length - 1);
    }

    handlePointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentStroke && this.currentStroke.points.length > 0) {
            AppState.strokes.push(this.currentStroke);
            this.pushHistory();
        }
        this.currentStroke = null;
    }

    getCoords(e) {
        const rect = this.drawCanvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    renderSegment(stroke, p1Idx, p2Idx) {
        if (stroke.points.length < 2) return;

        this.ctxDraw.save();
        this.ctxDraw.lineCap = 'round';
        this.ctxDraw.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
            this.ctxDraw.globalCompositeOperation = 'destination-out';
            this.ctxDraw.lineWidth = stroke.size * 8;
        } else {
            this.ctxDraw.globalCompositeOperation = 'source-over';
            this.ctxDraw.strokeStyle = stroke.color;
            const p = stroke.points[p2Idx].pressure;
            this.ctxDraw.lineWidth = Math.max(1, stroke.size * (p * 2));
        }

        const p1 = stroke.points[p1Idx];
        const p2 = stroke.points[p2Idx];

        this.ctxDraw.beginPath();
        this.ctxDraw.moveTo(p1.x, p1.y);
        this.ctxDraw.lineTo(p2.x, p2.y);
        this.ctxDraw.stroke();
        this.ctxDraw.restore();
    }

    redraw() {
        this.ctxDraw.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
        this.ctxBg.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        // Render Background Image Layer (L1)
        if (AppState.bgImageBase64) {
            const img = new Image();
            img.onload = () => {
                this.ctxBg.drawImage(img, 0, 0, this.bgCanvas.width, this.bgCanvas.height);
            };
            img.src = AppState.bgImageBase64;
        }

        // Render Inking Vectors (L2 & L3)
        AppState.strokes.forEach(stroke => {
            for (let i = 0; i < stroke.points.length - 1; i++) {
                this.renderSegment(stroke, i, i + 1);
            }
        });
    }

    pushHistory() {
        AppState.history = AppState.history.slice(0, AppState.historyStep + 1);
        AppState.history.push(JSON.stringify(AppState.strokes));
        AppState.historyStep++;
    }

    undo() {
        if (AppState.historyStep > 0) {
            AppState.historyStep--;
            AppState.strokes = JSON.parse(AppState.history[AppState.historyStep]);
            this.redraw();
        }
    }

    redo() {
        if (AppState.historyStep < AppState.history.length - 1) {
            AppState.historyStep++;
            AppState.strokes = JSON.parse(AppState.history[AppState.historyStep]);
            this.redraw();
        }
    }

    bindToolbar() {
        const penPropertiesPanel = document.getElementById('penPropertiesPanel');
        const eraserPropertiesPanel = document.getElementById('eraserPropertiesPanel');
        const layerPropertiesPanel = document.getElementById('layerPropertiesPanel');

        document.getElementById('toolPen').onclick = () => {
            AppState.currentTool = 'pen';
            this.togglePanel(penPropertiesPanel);
        };

        document.getElementById('toolEraser').onclick = () => {
            AppState.currentTool = 'eraser';
            this.togglePanel(eraserPropertiesPanel);
        };

        document.getElementById('toolLayers').onclick = () => {
            this.togglePanel(layerPropertiesPanel);
        };

        document.getElementById('toolCamera').onclick = () => {
            document.getElementById('photoInput').click();
        };

        document.getElementById('photoInput').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    AppState.bgImageBase64 = evt.target.result;
                    this.redraw();
                };
                reader.readAsDataURL(file);
            }
        };

        // Size & Color Palette Controls
        document.querySelectorAll('.btn-size').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.btn-size').forEach(b => b.classList.remove('bg-slate-200'));
                e.target.classList.add('bg-slate-200');
                AppState.penSize = parseInt(e.target.dataset.size);
            };
        });

        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.onclick = (e) => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                e.target.classList.add('active');
                AppState.penColor = e.target.dataset.color;
            };
        });

        // Layer Switcher Controls
        document.querySelectorAll('.btn-layer-select').forEach(btn => {
            btn.onclick = (e) => {
                const layerBtn = e.target.closest('.btn-layer-select');
                const selectedLayer = layerBtn.dataset.layer;
                
                AppState.activeLayer = selectedLayer;
                document.getElementById('activeLayerDisplay').innerText = `${selectedLayer} (${selectedLayer === 'L1' ? 'PHOTO' : selectedLayer === 'L2' ? 'VECTOR PENCIL' : 'REDLINE MARKUP'})`;

                document.querySelectorAll('.btn-layer-select').forEach(b => {
                    b.classList.remove('bg-slate-100');
                    b.querySelector('.layer-status').innerText = 'INACTIVE';
                    b.querySelector('.layer-status').classList.remove('text-[#FF4800]');
                });

                layerBtn.classList.add('bg-slate-100');
                layerBtn.querySelector('.layer-status').innerText = 'ACTIVE';
                layerBtn.querySelector('.layer-status').classList.add('text-[#FF4800]');
            };
        });

        document.getElementById('btnPurgePhoto').onclick = () => {
            if (confirm('PURGE LAYER 1 BACKGROUND PHOTO?')) {
                AppState.bgImageBase64 = null;
                this.redraw();
                this.hideAllSubPanels();
            }
        };

        document.getElementById('btnEraserClearAll').onclick = () => {
            if (confirm('ERASE ALL VECTOR MARKS ON THIS CANVAS?')) {
                AppState.strokes = [];
                this.pushHistory();
                this.redraw();
                this.hideAllSubPanels();
            }
        };
    }

    togglePanel(panel) {
        const isHidden = panel.classList.contains('hidden');
        this.hideAllSubPanels();
        if (isHidden) panel.classList.remove('hidden');
    }

    hideAllSubPanels() {
        document.getElementById('penPropertiesPanel').classList.add('hidden');
        document.getElementById('eraserPropertiesPanel').classList.add('hidden');
        document.getElementById('layerPropertiesPanel').classList.add('hidden');
    }
}
