import { AppState } from './state.js';
import { initDB, loadDateState, syncToGoogleCloud } from './storage.js';
import { renderAgendaView, createNewTopic } from './components/agenda.js';

async function loadConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    AppState.config = await res.json();
    document.getElementById('configStatus').innerText = `CONFIG: LOADED (${AppState.config.environment.toUpperCase()})`;
  } catch (err) {
    document.getElementById('configStatus').innerText = "CONFIG: LOAD_FAILED";
  }
}

function bindGlobalControls() {
  document.getElementById('addTopicBtn').addEventListener('click', () => createNewTopic());
  document.getElementById('cloudSyncBtn').addEventListener('click', () => syncToGoogleCloud());

  document.getElementById('prevDateBtn').addEventListener('click', () => changeDate(-1));
  document.getElementById('nextDateBtn').addEventListener('click', () => changeDate(1));

  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = JSON.stringify(AppState.agenda[AppState.currentDate] || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ARCH_AGENDA_${AppState.currentDate}.json`;
    a.click();
  });
}

async function changeDate(deltaDays) {
  const date = new Date(AppState.currentDate);
  date.setDate(date.getDate() + deltaDays);
  AppState.currentDate = date.toISOString().split('T')[0];
  
  document.getElementById('currentDateDisplay').innerText = AppState.currentDate.replace(/-/g, '.');
  await loadDateState(AppState.currentDate);
  renderAgendaView();
}

(async function boot() {
  await loadConfig();
  await initDB();
  bindGlobalControls();
  await loadDateState(AppState.currentDate);
  renderAgendaView();
})();
