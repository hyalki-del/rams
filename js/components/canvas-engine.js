import { saveCurrentDateState } from '../storage.js';

export class CanvasInstance {
  constructor(container, canvasData, onUpdate) {
    this.container = container;
    this.data = canvasData;
    this.onUpdate = onUpdate;
    this.isDrawing = false;
    this.currentStroke = null;

    this.initDOM();
    this.bindEvents();
    this.redraw();
  }

  initDOM() {
    this.container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.container);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.redraw();
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', () => this.onPointerUp());
  }

  onPointerDown(e) {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.currentStroke = {
      id: crypto.randomUUID(),
      color: '#1C1C1A',
      width: 2,
      points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 }]
    };
  }

  onPointerMove(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    const rect = this.canvas.getBoundingClientRect();
    
    // Update live metrics on bottom bar
    const metrics = document.getElementById('pointerMetrics');
    if (metrics) {
      metrics.innerText = `X: ${(e.clientX - rect.left).toFixed(0)} | Y: ${(e.clientY - rect.top).toFixed(0)} | P: ${(e.pressure || 0).toFixed(2)}`;
    }

    this.currentStroke.points.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5
    });

    this.renderStroke(this.currentStroke);
  }

  onPointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke?.points.length > 1) {
      this.data.strokes.push(this.currentStroke);
      saveCurrentDateState();
      if (this.onUpdate) this.onUpdate();
    }
    this.currentStroke = null;
  }

  undo() {
    if (this.data.strokes.length === 0) return false;
    this.data.strokes.pop();
    saveCurrentDateState();
    this.redraw();
    if (this.onUpdate) this.onUpdate();
    return true;
  }

  clear() {
    this.data.strokes = [];
    saveCurrentDateState();
    this.redraw();
    if (this.onUpdate) this.onUpdate();
  }

  renderStroke(stroke) {
    if (!stroke.points || stroke.points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.lineWidth = (stroke.points[i].pressure || 0.5) * stroke.width * 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX, midY);
    }
    ctx.restore();
  }

  redraw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.data.strokes.forEach(s => this.renderStroke(s));
  }
}
