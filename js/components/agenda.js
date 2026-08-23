import { AppState, getCurrentAgenda } from '../state.js';
import { saveCurrentDateState } from '../storage.js';
import { CanvasInstance } from './canvas-engine.js';

/**
 * Agenda Manager: Topic Breakdown & Dynamic Multi-Canvas Inserter
 */
export function renderAgendaView() {
  const viewport = document.getElementById('agendaViewport');
  const tagsContainer = document.getElementById('activeTagsContainer');
  viewport.innerHTML = '';
  tagsContainer.innerHTML = '';

  const topics = getCurrentAgenda();

  if (topics.length === 0) {
    viewport.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-muted); font-family:var(--font-mono);">
        [ EMPTY DAILY AGENDA - CLICK "+ ADD TOPIC" TO BEGIN ]
      </div>`;
    return;
  }

  topics.forEach((topic) => {
    // Render tag in top banner
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerText = topic.title;
    tagsContainer.appendChild(tag);

    // Build Topic Card Element
    const topicCard = document.createElement('div');
    topicCard.className = 'topic-card';

    topicCard.innerHTML = `
      <div class="topic-header">
        <input type="text" class="topic-title" value="${topic.title}">
        <div class="action-group">
          <button class="btn add-canvas-btn">+ ADD CANVAS</button>
          <button class="btn remove-topic-btn">DELETE TOPIC</button>
        </div>
      </div>
      <div class="canvases-list"></div>
    `;

    // Bind Topic Title Editing
    const titleInput = topicCard.querySelector('.topic-title');
    titleInput.addEventListener('change', (e) => {
      topic.title = e.target.value;
      saveCurrentDateState();
      renderAgendaView();
    });

    // Bind Delete Topic Button
    topicCard.querySelector('.remove-topic-btn').addEventListener('click', () => {
      const agenda = getCurrentAgenda();
      const index = agenda.findIndex(t => t.id === topic.id);
      if (index !== -1) {
        agenda.splice(index, 1);
        saveCurrentDateState();
        renderAgendaView();
      }
    });

    // Bind Add Canvas Button
    const canvasesList = topicCard.querySelector('.canvases-list');
    topicCard.querySelector('.add-canvas-btn').addEventListener('click', () => {
      const newCanvasData = { id: crypto.randomUUID(), strokes: [] };
      topic.canvases.push(newCanvasData);
      saveCurrentDateState();
      mountCanvasWrapper(canvasesList, newCanvasData);
    });

    // Mount Existing Canvases
    topic.canvases.forEach((canvasData) => {
      mountCanvasWrapper(canvasesList, canvasData);
    });

    viewport.appendChild(topicCard);
  });
}

function mountCanvasWrapper(parentContainer, canvasData) {
  const wrapper = document.createElement('div');
  wrapper.className = 'canvas-wrapper';
  parentContainer.appendChild(wrapper);

  // Initialize interactive drawing engine instance for this canvas node
  new CanvasInstance(wrapper, canvasData);
}

export function createNewTopic() {
  const topics = getCurrentAgenda();
  topics.push({
    id: crypto.randomUUID(),
    title: `#TOPIC_${topics.length + 1}`,
    canvases: [{ id: crypto.randomUUID(), strokes: [] }] // Default 1 canvas per topic
  });
  saveCurrentDateState();
  renderAgendaView();
}
