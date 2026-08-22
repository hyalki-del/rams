class SpatialInkingEngine {
    constructor(containerEl, onStrokeEnd) {
        this.container = containerEl;
        this.onStrokeEnd = onStrokeEnd;

        this.cvsBg = document.getElementById('layer-bg');
        this.cvsVector = document.getElementById('layer-vector');
        this.cvsAnnotation = document.getElementById('layer-annotation');

        this.ctxBg = this.cvsBg.getContext('2d');
        this.ctxVector = this.cvsVector.getContext('2d');
        this.ctxAnnotation = this.cvsAnnotation.getContext('2d');

        this.activeLayer = 'vector';
        this.isDrawing = false;
        this.currentStroke = null;

        this.strokeData = {
            vectorStrokes: [],
            annotationStrokes: [],
            bgImageData: null
        };

        this.initViewport();
        this.bindInputEvents();
        window.addEventListener('resize', () => this.initViewport());
    }

    initViewport() {
        const rect = this.container.getBoundingClientRect();
        this.dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;

        [this.cvsBg, this.cvsVector, this.cvsAnnotation].forEach(cvs => {
            cvs.width = this.width * this.dpr;
            cvs.height = this.height * this.dpr;
            const ctx = cvs.getContext('2d');
            ctx.scale(this.dpr, this.dpr);
        });

        this.renderGrid();
        this.redrawAll();
    }

    setActiveLayer(layer) {
        this.activeLayer = layer;
    }

    bindInputEvents() {
        const target = this.cvsAnnotation;
        target.addEventListener('pointerdown', e => this.onPointerDown(e));
        target.addEventListener('pointermove', e => this.onPointerMove(e));
        target.addEventListener('pointerup', e => this.onPointerUp(e));
        target.addEventListener('pointercancel', e => this.onPointerUp(e));
    }

    getPointerPoint(e) {
        const rect = this.cvsAnnotation.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            p: e.pressure || 0.5
        };
    }

    onPointerDown(e) {
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
        this.isDrawing = true;
        this.cvsAnnotation.setPointerCapture(e.pointerId);

        const pt = this.getPointerPoint(e);
        this.currentStroke = {
            layer: this.activeLayer,
            color: CONFIG.STROKE_COLORS[this.activeLayer],
            points: [pt]
        };
    }

    onPointerMove(e) {
        if (!this.isDrawing || !this.currentStroke) return;

        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        const ctx = this.activeLayer === 'vector' ? this.ctxVector : this.ctxAnnotation;

        for (let evt of events) {
            const pt = this.getPointerPoint(evt);
            const pts = this.currentStroke.points;
            pts.push(pt);

            if (pts.length > 2) {
                const p1 = pts[pts.length - 2];
                const p2 = pts[pts.length - 1];
                this.renderMidpointSegment(ctx, p1, p2, this.currentStroke.color, this.activeLayer);
            }
        }
    }

    onPointerUp(e) {
        if (!this.isDrawing || !this.currentStroke) return;
        this.isDrawing = false;

        if (this.currentStroke.layer === 'vector') {
            this.strokeData.vectorStrokes.push(this.currentStroke);
        } else {
            this.strokeData.annotationStrokes.push(this.currentStroke);
        }

        this.currentStroke = null;
        if (this.onStrokeEnd) this.onStrokeEnd();
    }

    /**
     * Quadratic Curve Interpolation via Midpoints
     */
    renderMidpointSegment(ctx, p1, p2, color, layer) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = (layer === 'vector' ? 1.5 : 2.5) * (p2.p * 2);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        ctx.stroke();
    }

    renderGrid() {
        const ctx = this.ctxBg;
        ctx.clearRect(0, 0, this.width, this.height);

        if (this.strokeData.bgImageData) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, this.width, this.height);
            img.src = this.strokeData.bgImageData;
        } else {
            ctx.strokeStyle = '#D1CDC4';
            ctx.lineWidth = 0.5;
            const step = 20;

            ctx.beginPath();
            for (let x = 0; x < this.width; x += step) {
                ctx.moveTo(x, 0); ctx.lineTo(x, this.height);
            }
            for (let y = 0; y < this.height; y += step) {
                ctx.moveTo(0, y); ctx.lineTo(this.width, y);
            }
            ctx.stroke();
        }
    }

    redrawLayer(ctx, strokes) {
        ctx.clearRect(0, 0, this.width, this.height);
        for (let s of strokes) {
            for (let i = 1; i < s.points.length; i++) {
                this.renderMidpointSegment(ctx, s.points[i - 1], s.points[i], s.color, s.layer);
            }
        }
    }

    redrawAll() {
        this.redrawLayer(this.ctxVector, this.strokeData.vectorStrokes);
        this.redrawLayer(this.ctxAnnotation, this.strokeData.annotationStrokes);
    }

    clearLayer() {
        if (this.activeLayer === 'vector') {
            this.strokeData.vectorStrokes = [];
            this.ctxVector.clearRect(0, 0, this.width, this.height);
        } else {
            this.strokeData.annotationStrokes = [];
            this.ctxAnnotation.clearRect(0, 0, this.width, this.height);
        }
    }

    exportState() { return JSON.parse(JSON.stringify(this.strokeData)); }
    
    importState(data) {
        this.strokeData = data || { vectorStrokes: [], annotationStrokes: [], bgImageData: null };
        this.renderGrid();
        this.redrawAll();
    }
}
