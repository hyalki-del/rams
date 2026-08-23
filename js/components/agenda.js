import { getCurrentAgenda } from '../state.js';
import { saveCurrentDateState } from '../storage.js';
import { StudioModal } from './studio-modal.js';

const HOUR_HEIGHT = 60;
let studioModalInstance = null;

export function renderAgendaView() {
  if (!studioModalInstance) {
    studioModalInstance = new StudioModal();
  }

  const viewport = document.getElementById('agendaViewport');
  const tagsContainer = document.getElementById('activeTagsContainer');
  viewport.innerHTML = '';
  tagsContainer.innerHTML = '';

  const topics = getCurrentAgenda();

  const scheduleContainer = document.createElement('div');
  scheduleContainer.id = 'scheduleContainer';

  const timeLegend = document.createElement('div');
  timeLegend.id = 'timeLegend';
  for (let i = 0; i < 24; i++) {
    const label = document.createElement('div');
    label.className = 'time-row-label';
    label.innerText = `${String(i).padStart(2, '0')}:00`;
    timeLegend.appendChild(label);
  }

  const timeGridBody = document.createElement('div');
  timeGridBody.id = 'timeGridBody';

  scheduleContainer.appendChild(timeLegend);
  scheduleContainer.appendChild(timeGridBody);
  viewport.appendChild(scheduleContainer);

  topics.forEach((topic) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerText = `${topic.title} (${formatTime(topic.startHour)})`;
    tagsContainer.appendChild(tag);

    const card = document.createElement('div');
    card.className = 'topic-card-scheduled';
    card.style.top = `${topic.startHour * HOUR_HEIGHT}px`;
    card.style.height = `${Math.max(topic.durationHours * HOUR_HEIGHT, 60)}px`;

    card.innerHTML = `
      <div class="drag-header">
        <input type="text" class="topic-title-input" value="${topic.title}">
        <span class="time-badge">${formatTime(topic.startHour)} - ${formatTime(topic.startHour + topic.durationHours)}</span>
        <div class="action-group">
          <button class="btn btn-orange edit-topic-btn">[ EDIT / DRAW ]</button>
          <button class="btn remove-topic-btn">X</button>
        </div>
      </div>
      <div class="resize-handle-bottom"></div>
    `;

    card.querySelector('.edit-topic-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      studioModalInstance.open(topic);
    });

    card.querySelector('.topic-title-input').addEventListener('change', (e) => {
      topic.title = e.target.value;
      saveCurrentDateState();
      renderAgendaView();
    });

    card.querySelector('.remove-topic-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = topics.findIndex(t => t.id === topic.id);
      if (index !== -1) {
        topics.splice(index, 1);
        saveCurrentDateState();
        renderAgendaView();
      }
    });

    attachTouchInteraction(card, topic);
    timeGridBody.appendChild(card);
  });
}

function attachTouchInteraction(card, topic) {
  const header = card.querySelector('.drag-header');
  const resizeHandle = card.querySelector('.resize-handle-bottom');

  let isDragging = false;
  let isResizing = false;
  let startY = 0;
  let initialStartHour = 0;
  let initialDuration = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startY = e.clientY;
    initialStartHour = topic.startHour;
    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaHours = (e.clientY - startY) / HOUR_HEIGHT;
    let newStartHour = Math.round((initialStartHour + deltaHours) * 4) / 4;
    newStartHour = Math.max(0, Math.min(23.75, newStartHour));

    topic.startHour = newStartHour;
    card.style.top = `${newStartHour * HOUR_HEIGHT}px`;
    card.querySelector('.time-badge').innerText = 
      `${formatTime(topic.startHour)} - ${formatTime(topic.startHour + topic.durationHours)}`;
  });

  header.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;
    saveCurrentDateState();
    renderAgendaView();
  });

  resizeHandle.addEventListener('pointerdown', (e) => {
    isResizing = true;
    startY = e.clientY;
    initialDuration = topic.durationHours;
    resizeHandle.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });

  resizeHandle.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    const deltaHours = (e.clientY - startY) / HOUR_HEIGHT;
    let newDuration = Math.round((initialDuration + deltaHours) * 4) / 4;
    newDuration = Math.max(0.5, newDuration);

    topic.durationHours = newDuration;
    card.style.height = `${newDuration * HOUR_HEIGHT}px`;
    card.querySelector('.time-badge').innerText = 
      `${formatTime(topic.startHour)} - ${formatTime(topic.startHour + topic.durationHours)}`;
  });

  resizeHandle.addEventListener('pointerup', () => {
    if (!isResizing) return;
    isResizing = false;
    saveCurrentDateState();
    renderAgendaView();
  });
}

export function createNewTopic() {
  const topics = getCurrentAgenda();
  topics.push({
    id: crypto.randomUUID(),
    title: `#TASK_${topics.length + 1}`,
    startHour: 9.0,
    durationHours: 1.0,
    canvases: [{ id: crypto.randomUUID(), strokes: [] }]
  });
  saveCurrentDateState();
  renderAgendaView();
}

function formatTime(decimalHours) {
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
