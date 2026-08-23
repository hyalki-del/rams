import { AppState } from './state.js';

/**
 * Storage Engine: Handles IndexedDB Persistence & Serverless Cloud Sync
 */
export async function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ArchMultiCanvasAgendaDB', 2);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('agenda_store', { keyPath: 'isoDate' });
    req.onsuccess = (e) => {
      AppState.db = e.target.result;
      document.getElementById('storageStatus').innerText = "STORAGE: IDB_ONLINE";
      resolve(AppState.db);
    };
    req.onerror = (e) => reject(e);
  });
}

export async function saveCurrentDateState() {
  if (!AppState.db) return;
  const tx = AppState.db.transaction('agenda_store', 'readwrite');
  tx.objectStore('agenda_store').put({
    isoDate: AppState.currentDate,
    updatedAt: Date.now(),
    topics: AppState.agenda[AppState.currentDate] || []
  });
}

export async function loadDateState(isoDate) {
  if (!AppState.db) return;
  return new Promise((resolve) => {
    const tx = AppState.db.transaction('agenda_store', 'readonly');
    const req = tx.objectStore('agenda_store').get(isoDate);
    req.onsuccess = () => {
      AppState.agenda[isoDate] = req.result ? req.result.topics : [];
      resolve(AppState.agenda[isoDate]);
    };
  });
}

export async function syncToGoogleCloud() {
  const status = document.getElementById('storageStatus');
  const endpoint = AppState.config?.googleAppsScriptEndpoint;

  if (!endpoint || endpoint.includes("YOUR_GOOGLE_APPS_SCRIPT")) {
    alert("Please configure a valid Google Apps Script URL in config.json");
    return;
  }

  status.innerText = "CLOUD: SYNCING...";
  try {
    const payload = {
      isoDate: AppState.currentDate,
      topics: AppState.agenda[AppState.currentDate] || []
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === "SUCCESS") {
      status.innerText = "CLOUD: SYNC_OK";
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    status.innerText = "CLOUD: SYNC_ERR";
    console.error("Cloud Sync Failure:", err);
  }
}
