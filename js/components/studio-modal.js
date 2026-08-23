import { saveCurrentDateState } from '../storage.js';
import { CanvasInstance } from './canvas-engine.js';

export class StudioModal {
  constructor() {
    this.modal = document.getElementById('studioModal');
    this.titleEl = document.getElementById('studioTopicTitle');
    this.timeBadgeEl = document.getElementById('studioTimeBadge');
    this.tabListEl = document.getElementById('tabList');
    this.viewportEl = document.getElementById('studioCanvasViewport');
    this.saveIndicator = document.getElementById('studioSaveIndicator');

    this.activeTopic = null;
    this.activeCanvasIndex = 0;
    this.currentCanvasEngine = null;

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('closeStudioBtn').addEventListener('click', () => this.close());
    document.getElementById('addTabBtn').addEventListener('click', () => this.addNewCanvasTab());
    document.getElementById('undoBtn').addEventListener('click', () => this.undoActiveCanvas());
    document.getElementById('clearCanvasBtn').addEventListener('click', () => this.clearActiveCanvas());
    document.getElementById('removeCanvasBtn').addEventListener('click', () => this.removeActiveCanvasTab());
  }

  open(topic) {
    this.activeTopic = topic;
    this.activeCanvasIndex = 0;

    // Render prominent title in big letters
    this.titleEl.innerText = topic.title;
    this.timeBadgeEl.innerText = `${formatTime(topic.startHour)} - ${formatTime(topic.startHour + topic.durationHours)}`;

    // Ensure topic has at least one canvas tab
    if (!topic.canvases || topic.canvases.length === 0) {
      topic.canvases = [{ id: crypto.randomUUID(), strokes: [] }];
    }

    this.modal.classList.remove('modal-hidden');
    this.renderTabs();
    this.mountActiveCanvas();
  }

  close() {
    this.modal.classList.add('modal-hidden');
    this.activeTopic = null;
    this.currentCanvasEngine = null;
    this.viewportEl.innerHTML = '';
  }

  renderTabs() {
    this.tabListEl.innerHTML = '';
    this.activeTopic.canvases.forEach((canvas, index) => {
      const tabBtn = document.createElement('button');
      tabBtn.className = `tab-btn ${index === this.activeCanvasIndex ? 'active' : ''}`;
      tabBtn.innerText = `CANVAS 0${index + 1}`;
      tabBtn.addEventListener('click', () => {
        this.activeCanvasIndex = index;
        this.renderTabs();
        this.mountActiveCanvas();
      });
      this.tabListEl.appendChild(tabBtn);
    });
  }

  mountActiveCanvas() {
    const canvasData = this.activeTopic.canvases[this.activeCanvasIndex];
    if (!canvasData) return;

    this.currentCanvasEngine = new CanvasInstance(
      this.viewportEl,
      canvasData,
      () => this.notifySaved()
    );
  }

  addNewCanvasTab() {
    const newCanvas = { id: crypto.randomUUID(), strokes: [] };
    this.activeTopic.canvases.push(newCanvas);
    this.activeCanvasIndex = this.activeTopic.canvases.length - 1;
    saveCurrentDateState();
    this.renderTabs();
    this.mountActiveCanvas();
    this.notifySaved();
  }

  removeActiveCanvasTab() {
    if (this.activeTopic.canvases.length <= 1) {
      alert("A topic must retain at least one canvas.");
      return;
    }

    if (confirm("Are you sure you want to delete this canvas tab?")) {
      this.activeTopic.canvases.splice(this.activeCanvasIndex, 1);
      this.activeCanvasIndex = Math.max(0, this.activeCanvasIndex - 1);
      saveCurrentDateState();
      this.renderTabs();
      this.mountActiveCanvas();
      this.notifySaved();
    }
  }

  undoActiveCanvas() {
    if (this.currentCanvasEngine) {
      const undone = this.currentCanvasEngine.undo();
      if (undone) this.notifySaved();
    }
  }

  clearActiveCanvas() {
    if (this.currentCanvasEngine && confirm("Clear all strokes on this canvas?")) {
      this.currentCanvasEngine.clear();
      this.notifySaved();
    }
  }

  notifySaved() {
    this.saveIndicator.innerText = `STATUS: AUTO_SAVED (${new Date().toLocaleTimeString()})`;
  }
}

function formatTime(decimalHours) {
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
