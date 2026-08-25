/**
 * Vector Inking Engine with 120Hz Coalesced Sub-pixel Sampling & Multi-Layer Rendering
 */
import { store } from '../state.js';

export class CanvasEngine {
    constructor(viewportEl, bgCanvas, drawCanvas) {
        this.viewport = viewportEl;
        this.bgCanvas = bgCanvas;
        this.drawCanvas = drawCanvas;
        this.bgCtx = bgCanvas.getContext('2d');
        this.drawCtx = drawCanvas.getContext('2d');

        this.isDrawing = false;
        this.strokes = []; // Active vector stroke array
        this.undoStack = [];
        this.redoStack = [];
        this.currentStroke = null;
        this.backgroundImage = null; // Base64 data string

        this.initResizeObserver();
        this.bindPointerEvents();
    }

    initResizeObserver() {
        const resize = () => {
            const rect = this.viewport.getBoundingClientRect();
            this.bgCanvas.width = rect.width;
            this.bgCanvas.height = rect.height;
            this.drawCanvas.width = rect.width;
            this.drawCanvas.height = rect.height;
            this.redrawAll();
        };
        new ResizeObserver(resize).observe(this.viewport);
    }

    bindPointerEvents() {
        this.drawCanvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.drawCanvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.drawCanvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.drawCanvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    }

    loadData(backgroundImage, strokes) {
        this.strokes = strokes || [];
        this.undoStack = [];
        this.redoStack = [];
        
        if (backgroundImage) {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.redrawAll();
            };
            img.src = backgroundImage;
        } else {
            this.backgroundImage = null;
            this.redrawAll();
        }
    }

    handlePointerDown(e) {
        if (e.button !== 0) return;
        this.drawCanvas.setPointerCapture(e.pointerId);
        this.isDrawing = true;

        const state = store.getState();
        this.currentStroke = {
            id: Date.now().toString(),
            layer: state.activeLayer,
            color: state.activeLayer === 'L3_Redline' ? '#FF4800' : '#1C1C1E',
            baseWidth: state.activeLayer === 'L3_Redline' ? 3 : 1.5,
            isEraser: state.activeTool === 'eraser',
            points: [this.extractPoint(e)]
        };
    }

    handlePointerMove(e) {
        if (!this.isDrawing || !this.currentStroke) return;

        // Extract high-frequency 120Hz ProMotion points from Apple Pencil
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        events.forEach(coalesced => {
            this.currentStroke.points.push(this.extractPoint(coalesced));
        });

        this.redrawDrawCanvas();
    }

    handlePointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentStroke && this.currentStroke.points.length > 0) {
            this.strokes.push(this.currentStroke);
            this.undoStack.push({ type: 'ADD', stroke: this.currentStroke });
            this.redoStack = []; // Clear redo chain
            store.setState({ isDirty: true });
        }
        this.currentStroke = null;
        this.redrawDrawCanvas();
    }

    extractPoint(e) {
        const rect = this.drawCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure || 0.5
        };
    }

    redrawAll() {
        this.redrawBgCanvas();
        this.redrawDrawCanvas();
    }

    redrawBgCanvas() {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        if (this.backgroundImage) {
            // Aspect-ratio fit scale
            const scale = Math.min(
                this.bgCanvas.width / this.backgroundImage.width,
                this.bgCanvas.height / this.backgroundImage.height
            );
            const w = this.backgroundImage.width * scale;
            const h = this.backgroundImage.height * scale;
            const x = (this.bgCanvas.width - w) / 2;
            const y = (this.bgCanvas.height - h) / 2;

            this.bgCtx.drawImage(this.backgroundImage, x, y, w, h);
        }
    }

    redrawDrawCanvas() {
        this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);

        const allStrokes = [...this.strokes];
        if (this.currentStroke) allStrokes.push(this.currentStroke);

        allStrokes.forEach(stroke => {
            if (stroke.points.length < 2) return;

            this.drawCtx.save();
            if (stroke.isEraser) {
                this.drawCtx.globalCompositeOperation = 'destination-out';
                this.drawCtx.lineWidth = 20;
            } else {
                this.drawCtx.globalCompositeOperation = 'source-over';
                this.drawCtx.strokeStyle = stroke.color;
            }

            this.drawCtx.lineCap = 'round';
            this.drawCtx.lineJoin = 'round';

            for (let i = 1; i < stroke.points.length; i++) {
                const p1 = stroke.points[i - 1];
                const p2 = stroke.points[i];
                
                this.drawCtx.beginPath();
                this.drawCtx.moveTo(p1.x, p1.y);
                this.drawCtx.lineTo(p2.x, p2.y);
                
                if (!stroke.isEraser) {
                    this.drawCtx.lineWidth = stroke.baseWidth * (p2.pressure * 2);
                }
                this.drawCtx.stroke();
            }
            this.drawCtx.restore();
        });
    }

    undo() {
        if (this.strokes.length === 0) return;
        const popped = this.strokes.pop();
        this.redoStack.push(popped);
        this.redrawDrawCanvas();
        store.setState({ isDirty: true });
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const restored = this.redoStack.pop();
        this.strokes.push(restored);
        this.redrawDrawCanvas();
        store.setState({ isDirty: true });
    }

    clearInks() {
        this.strokes = [];
        this.undoStack = [];
        this.redoStack = [];
        this.redrawDrawCanvas();
        store.setState({ isDirty: true });
    }

    setSubstrateImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.redrawBgCanvas();
                store.setState({ isDirty: true });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    purgeSubstrateImage() {
        this.backgroundImage = null;
        this.redrawBgCanvas();
        store.setState({ isDirty: true });
    }

    getExportableData() {
        return {
            backgroundImage: this.backgroundImage ? this.backgroundImage.src : null,
            strokes: this.strokes
        };
    }
}
