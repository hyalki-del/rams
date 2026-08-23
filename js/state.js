/**
 * Central Reactive Application State Engine
 */
export const AppState = {
  currentDate: new Date().toISOString().split('T')[0],
  config: null,
  db: null,
  agenda: {
    // Schema: ISO_DATE -> Array of Topic Objects
    // topic = { id, title, canvases: [{ id, strokes: [] }] }
  }
};

export function getCurrentAgenda() {
  if (!AppState.agenda[AppState.currentDate]) {
    AppState.agenda[AppState.currentDate] = [];
  }
  return AppState.agenda[AppState.currentDate];
}
