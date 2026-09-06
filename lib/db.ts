// IndexedDB persistence for photos. Blobs survive reloads and app closes on
// the device, with a much larger quota than localStorage (~GB vs ~5MB). Only
// photo blobs are stored here; forms/outbox keep IDs and text in localStorage.
// No base64 conversion anywhere — blobs are stored and retrieved directly.

const DB_NAME = "evergreen_photos";
const DB_VERSION = 1;
const STORE = "photos";

let dbReady: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbReady) {
    dbReady = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE); // keyPath-less, auto key via put(key)
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbReady;
}

const idKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function putPhoto(blob: Blob): Promise<string> {
  const db = await openDb();
  const id = idKey();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getPhoto(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Remove blobs that are no longer referenced by any draft or outbox entry.
export async function prunePhotos(keepIds: string[]): Promise<void> {
  const db = await openDb();
  const keep = new Set(keepIds);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (!keep.has(String(cursor.key))) store.delete(cursor.key);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}