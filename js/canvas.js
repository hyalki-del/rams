class NormalizedVectorEngine {
    constructor(svgEl, onStrokeEnd) {
        this.svg = svgEl;
        this.onStrokeEnd = onStrokeEnd;
        
        this.layerSketch = document.getElementById('layer-sketch');
        this.layerRedline = document.getElementById('layer-redline');
        this.activePath = document.getElementById('active-path');
        this.bgImage = document.getElementById('svg-bg-image');

        this.activeLayerName = 'sketch';
        this.isDrawing = false;
        this.currentPoints = [];
        
        this.vectorState = {
            sketchStrokes: [],
            redlineStrokes: [],
            bgImageData: null
        };

        this.bindPointerEvents();
    }

    bindPointerEvents() {
        this.svg.addEventListener('pointerdown', e => this.onPointerDown(e));
        this.svg.addEventListener('pointermove', e => this.onPointerMove(e));
        this.svg.addEventListener('pointerup', e => this.onPointerUp(e));
        this.svg.addEventListener('pointercancel', e => this.onPointerUp(e));
    }

    getNormalizedPoint(e) {
        const rect = this.svg.getBoundingClientRect();
        return {
            nx: (e.clientX - rect.left) / rect.width,
            ny: (e.clientY - rect.top) / rect.height
        };
    }

    denormalizePath(points) {
        const rect = this.svg.getBoundingClientRect();
        if (!points || points.length === 0) return '';
        
        return points.reduce((acc, pt, i) => {
            const x = pt.nx * rect.width;
            const y = pt.ny * rect.height;
            return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }, '');
    }

    onPointerDown(e) {
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
        this.isDrawing = true;
        this.svg.setPointerCapture(e.pointerId);
        
        const pt = this.getNormalizedPoint(e);
        this.currentPoints = [pt];
        
        const color = this.activeLayerName === 'sketch' ? '#1A1A1A' : '#FF4800';
        this.activePath.setAttribute('stroke', color);
        this.activePath.setAttribute('d', this.denormalizePath(this.currentPoints));
    }

    onPointerMove(e) {
        if (!this.isDrawing) return;
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (let evt of events) {
            this.currentPoints.push(this.getNormalizedPoint(evt));
        }
        this.activePath.setAttribute('d', this.denormalizePath(this.currentPoints));
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentPoints.length > 1) {
            const stroke = { points: [...this.currentPoints] };
            if (this.activeLayerName === 'sketch') {
                this.vectorState.sketchStrokes.push(stroke);
            } else {
                this.vectorState.redlineStrokes.push(stroke);
            }
        }
        
        this.currentPoints = [];
        this.activePath.setAttribute('d', '');
        this.redrawAll();
        if (this.onStrokeEnd) this.onStrokeEnd();
    }

    redrawGroup(groupEl, strokes) {
        groupEl.innerHTML = '';
        strokes.forEach(s => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', this.denormalizePath(s.points));
            groupEl.appendChild(path);
        });
    }

    redrawAll() {
        this.redrawGroup(this.layerSketch, this.vectorState.sketchStrokes);
        this.redrawGroup(this.layerRedline, this.vectorState.redlineStrokes);
        if (this.vectorState.bgImageData) {
            this.bgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.vectorState.bgImageData);
        } else {
            this.bgImage.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
        }
    }

    clearActiveLayer() {
        if (this.activeLayerName === 'sketch') {
            this.vectorState.sketchStrokes = [];
        } else {
            this.vectorState.redlineStrokes = [];
        }
        this.redrawAll();
    }

    exportState() { return JSON.parse(JSON.stringify(this.vectorState)); }
    importState(state) {
        this.vectorState = state || { sketchStrokes: [], redlineStrokes: [], bgImageData: null };
        this.redrawAll();
    }
}
