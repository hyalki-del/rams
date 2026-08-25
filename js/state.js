/**
 * Shared Reactive State Store & Pub/Sub Event Hub
 */
class StateStore {
    constructor() {
        const today = new Date().toISOString().split('T')[0];
        this.state = {
            currentDate: today,
            activeEntry: null, // Holds full day record
            activeTopicId: null,
            activeLayer: 'L2_Pencil', // L2_Pencil | L3_Redline
            activeTool: 'pencil', // pencil | eraser
            isDirty: false
        };
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    setState(delta) {
        this.state = { ...this.state, ...delta };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const store = new StateStore();
