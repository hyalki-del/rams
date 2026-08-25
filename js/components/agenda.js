import { AppState } from '../state.js';

export const TIME_SLOTS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

export class AgendaController {
    constructor(saveCallback, openStudioCallback) {
        this.saveCallback = saveCallback;
        this.openStudioCallback = openStudioCallback;
        this.agendaGrid = document.getElementById('agendaGrid');
        this.topicCreateModal = document.getElementById('topicCreateModal');
        this.topicContextModal = document.getElementById('topicContextModal');
        this.selectTopicTime = document.getElementById('selectTopicTime');
        this.inputTopicTitle = document.getElementById('inputTopicTitle');
        
        this.pendingTimeSlot = null;
        this.draggedTopicId = null;
        this.draggedFromSlot = null;

        this.initModalOptions();
        this.bindGlobalGestures();
    }

    initModalOptions() {
        this.selectTopicTime.innerHTML = '';
        TIME_SLOTS.forEach(slot => {
            const h = parseInt(slot.split(':')[0]);
            const opt1 = document.createElement('option');
            opt1.value = `${slot}`;
            opt1.textContent = `${slot}`;
            
            const opt2 = document.createElement('option');
            const halfTime = `${h < 10 ? '0' + h : h}:30`;
            opt2.value = halfTime;
            opt2.textContent = halfTime;

            this.selectTopicTime.appendChild(opt1);
            this.selectTopicTime.appendChild(opt2);
        });

        document.getElementById('btnCancelCreateTopic').onclick = () => this.topicCreateModal.close();
        document.getElementById('formCreateTopic').onsubmit = (e) => {
            e.preventDefault();
            this.handleConfirmTopicCreate();
        };
    }

    renderGrid() {
        this.agendaGrid.innerHTML = '';

        TIME_SLOTS.forEach(time => {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-4 border-b border-[#1C1C1E]/20 pb-3 pt-2';

            const timeLabel = document.createElement('span');
            timeLabel.className = 'text-xs font-extrabold w-12 text-right shrink-0 select-none';
            timeLabel.innerText = time;

            const slotContainer = document.createElement('div');
            slotContainer.className = 'flex-1 flex items-center gap-3 min-h-[48px] p-1 border border-transparent rounded transition';
            slotContainer.dataset.timeSlot = time;

            const topics = AppState.agenda[time] || [];
            topics.forEach(topic => {
                const card = document.createElement('div');
                card.className = 'topic-box px-4 py-2 font-extrabold text-xs cursor-pointer flex-1 text-center select-none';
                card.innerText = topic.title;
                card.dataset.topicId = topic.id;
                card.dataset.timeSlot = time;
                slotContainer.appendChild(card);
            });

            // Far-right empty drop/touch expansion region
            const emptyZone = document.createElement('div');
            emptyZone.className = 'w-10 h-full min-h-[40px] border border-dashed border-[#1C1C1E]/20 hover:border-[#FF4800] flex items-center justify-center cursor-pointer';
            emptyZone.title = 'Hold 1000ms to append topic';
            emptyZone.innerText = '+';
            emptyZone.dataset.emptyZone = "true";
            emptyZone.dataset.timeSlot = time;
            slotContainer.appendChild(emptyZone);

            row.appendChild(timeLabel);
            row.appendChild(slotContainer);
            this.agendaGrid.appendChild(row);
        });
    }

    bindGlobalGestures() {
        let timer500 = null;
        let timer1000 = null;
        let gestureFired = false;
        let startX = 0, startY = 0;
        let activeCard = null;

        // Pointerdown gesture state machine
        this.agendaGrid.addEventListener('pointerdown', (e) => {
            gestureFired = false;
            startX = e.clientX;
            startY = e.clientY;

            const card = e.target.closest('.topic-box');
            const slot = e.target.closest('[data-time-slot]');

            if (card) {
                activeCard = card;
                const topicId = card.dataset.topicId;
                const slotTime = card.dataset.timeSlot;

                // 500ms Hold -> Context Options Menu
                timer500 = setTimeout(() => {
                    gestureFired = true;
                    this.openContextMenu(slotTime, topicId);
                }, 500);

                // 1000ms Hold & Drag Initialization
                timer1000 = setTimeout(() => {
                    gestureFired = true;
                    clearTimeout(timer500);
                    this.initDragAndDrop(card, slotTime, topicId, e);
                }, 1000);

            } else if (slot) {
                const slotTime = slot.dataset.timeSlot;

                // 1000ms Hold on Empty Slot -> Open Topic Creation & 30-min Time Modal
                timer1000 = setTimeout(() => {
                    gestureFired = true;
                    this.openCreateModal(slotTime);
                }, 1000);
            }
        });

        this.agendaGrid.addEventListener('pointermove', (e) => {
            const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
            if (dist > 8) {
                clearTimeout(timer500);
                clearTimeout(timer1000);
            }
        });

        const cancelTimers = () => {
            clearTimeout(timer500);
            clearTimeout(timer1000);
        };

        this.agendaGrid.addEventListener('pointerup', cancelTimers);
        this.agendaGrid.addEventListener('pointercancel', cancelTimers);

        // Double Click -> Open Drafting Studio Workspace
        this.agendaGrid.addEventListener('dblclick', (e) => {
            const card = e.target.closest('.topic-box');
            if (card) {
                const slotTime = card.dataset.timeSlot;
                const topicId = card.dataset.topicId;
                const topic = AppState.agenda[slotTime].find(t => t.id === topicId);
                if (topic) {
                    this.openStudioCallback(slotTime, topic);
                }
            }
        });
    }

    openCreateModal(slotTime) {
        this.pendingTimeSlot = slotTime;
        this.inputTopicTitle.value = '';
        this.selectTopicTime.value = slotTime;
        this.topicCreateModal.showModal();
    }

    handleConfirmTopicCreate() {
        const title = this.inputTopicTitle.value.trim().toUpperCase();
        const selectedTime = this.selectTopicTime.value;
        if (!title) return;

        // Standardize time mapping (e.g., 08:30 maps into 08:00 parent slot row)
        const baseHourSlot = `${selectedTime.split(':')[0]}:00`;

        if (!AppState.agenda[baseHourSlot]) {
            AppState.agenda[baseHourSlot] = [];
        }

        const newTopic = {
            id: 'topic_' + Date.now(),
            title: `${selectedTime} - ${title}`,
            strokes: [],
            bgImage: null
        };

        AppState.agenda[baseHourSlot].push(newTopic);
        this.topicCreateModal.close();
        this.saveCallback();
        this.renderGrid();
    }

    openContextMenu(slotTime, topicId) {
        const topic = AppState.agenda[slotTime].find(t => t.id === topicId);
        if (!topic) return;

        this.topicContextModal.showModal();

        document.getElementById('ctxEdit').onclick = () => {
            this.topicContextModal.close();
            const newTitle = prompt('EDIT TOPIC TITLE:', topic.title);
            if (newTitle && newTitle.trim()) {
                topic.title = newTitle.trim().toUpperCase();
                this.saveCallback();
                this.renderGrid();
            }
        };

        document.getElementById('ctxDelete').onclick = () => {
            this.topicContextModal.close();
            if (confirm(`DELETE TOPIC "${topic.title}"?`)) {
                AppState.agenda[slotTime] = AppState.agenda[slotTime].filter(t => t.id !== topicId);
                this.saveCallback();
                this.renderGrid();
            }
        };

        document.getElementById('ctxCancel').onclick = () => this.topicContextModal.close();
    }

    initDragAndDrop(card, fromSlot, topicId, initialEvent) {
        this.draggedTopicId = topicId;
        this.draggedFromSlot = fromSlot;

        card.classList.add('is-dragging');
        card.setPointerCapture(initialEvent.pointerId);

        let currentDropTarget = null;

        const onPointerMove = (e) => {
            const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
            const slotContainer = elemBelow ? elemBelow.closest('[data-time-slot]') : null;

            document.querySelectorAll('[data-time-slot]').forEach(s => s.classList.remove('slot-drop-target'));

            if (slotContainer) {
                currentDropTarget = slotContainer.dataset.timeSlot;
                slotContainer.classList.add('slot-drop-target');
            } else {
                currentDropTarget = null;
            }
        };

        const onPointerUp = (e) => {
            card.releasePointerCapture(e.pointerId);
            card.classList.remove('is-dragging');
            document.querySelectorAll('[data-time-slot]').forEach(s => s.classList.remove('slot-drop-target'));

            card.removeEventListener('pointermove', onPointerMove);
            card.removeEventListener('pointerup', onPointerUp);

            if (currentDropTarget && currentDropTarget !== fromSlot) {
                // Perform state migration across time slots
                const topicIndex = AppState.agenda[fromSlot].findIndex(t => t.id === topicId);
                if (topicIndex !== -1) {
                    const [movedTopic] = AppState.agenda[fromSlot].splice(topicIndex, 1);
                    if (!AppState.agenda[currentDropTarget]) {
                        AppState.agenda[currentDropTarget] = [];
                    }
                    AppState.agenda[currentDropTarget].push(movedTopic);
                    this.saveCallback();
                    this.renderGrid();
                }
            }
        };

        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerup', onPointerUp);
    }
}
