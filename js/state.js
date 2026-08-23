export const AppState = {
  currentDate: new Date().toISOString().split('T')[0],
  config: null,
  db: null,
  agenda: {}
};

export function getCurrentAgenda() {
  if (!AppState.agenda[AppState.currentDate]) {
    AppState.agenda[AppState.currentDate] = [];
  }
  return AppState.agenda[AppState.currentDate];
}
