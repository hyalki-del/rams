/**
 * Time-Grid Schedule & Topic Card Interaction Engine
 */
import { store } from '../state.js';
import { storage } from '../storage.js';

export class AgendaController {
    constructor(containerEl, onOpenTopicStudio) {
        this.container = containerEl;
        this.onOpenTopicStudio = onOpenTopicStudio;
    }

    render(entryRecord) {
        this.container.innerHTML = '';

        if (!entryRecord.topics || entryRecord.topics.length === 0) {
            this.container.innerHTML = `
                <div class="border border-dashed border-divider p-8 text-center">
                    <p class="font-mono text-xs text-graphite-light">NO TOPIC CARDS RECORDED FOR THIS DATE.</p>
                    <p class="font-mono text-[10px] text-graphite-light mt-1">CLICK "+ NEW TOPIC CARD" TO START DETAILING.</p>
                </div>
            `;
            return;
        }

        entryRecord.topics.forEach(topic => {
            const card = document.createElement('div');
            card.className = "border border-graphite p-4 bg-paper hover:border-signal-orange cursor-pointer transition-all flex justify-between items-start group shadow-ram";
            
            const tagPills = (topic.tags || []).map(t => `<span class="bg-divider text-graphite text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold mr-1">${t}</span>`).join('');
            const hasDrawings = topic.strokes && topic.strokes.length > 0;
            const hasPhoto = !!topic.backgroundImage;

            card.innerHTML = `
                <div class="space-y-2 flex-1 pr-4">
                    <div class="flex items-center space-x-2">
                        <span class="font-mono text-xs font-black uppercase text-graphite group-hover:text-signal-orange">${topic.title || 'UNTITLED TOPIC'}</span>
                        <div class="flex items-center">${tagPills}</div>
                    </div>
                    <p class="font-mono text-xs text-graphite-light line-clamp-2">${topic.notes || 'No notes added...'}</p>
                    
                    <div class="flex items-center space-x-3 pt-2 text-[10px] font-mono text-graphite-light">
                        <span>INK STROKES: <strong>${topic.strokes ? topic.strokes.length : 0}</strong></span>
                        <span>PHOTO OVERLAY: <strong>${hasPhoto ? 'YES' : 'NO'}</strong></span>
                    </div>
                </div>

                <button class="btn-ram text-xs self-center shrink-0">ENTER STUDIO ➔</button>
            `;

            card.addEventListener('click', () => this.onOpenTopicStudio(topic.id));
            this.container.appendChild(card);
        });
    }
}
