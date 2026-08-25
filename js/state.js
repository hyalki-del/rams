/**
 * CENTRALIZED REACTIVE STATE STORE
 */
export const AppState = {
    currentDate: new Date().toISOString().split('T')[0],
    activeSlot: null,
    activeTopicId: null,
    activeTopicTitle: '',
    
    // Schema: { "08:00": [ { id, title, strokes: [], bgImage: null } ] }
    agenda: {},

    // Drafting Canvas Controls
    currentTool: 'pen', // 'pen', 'eraser'
    penColor: '#1C1C1E',
    penSize: 3,
    activeLayer: 'L2', // 'L1', 'L2', 'L3'
    
    // Command Stack for Undo/Redo operations
    history: [],
    historyStep: -1,
    strokes: [],
    bgImageBase64: null
};
