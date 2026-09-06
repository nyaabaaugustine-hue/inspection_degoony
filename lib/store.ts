// localStorage helpers for draft autosave and an offline submission outbox.

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full — ignore; submission still proceeds in memory.
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function clearLatestDraft(prefix: string): void {
  try {
    const key = currentDraftKey(prefix);
    if (key) localStorage.removeItem(key);
    localStorage.removeItem(`${CURRENT_KEY_PREFIX}${prefix}`);
  } catch {
    /* ignore */
  }
}

export interface QueuedSubmission {
  id: string;
  queuedAt: string;
  prefix: string;
  fields: Record<string, string>;
  items: Record<string, { status: string; note: string; photos: string[] }>;
  evidence: { caption: string; dataUrl: string }[];
}

const OUTBOX_KEY = "evergreen_outbox_v1";
const DRAFT_PREFIX = "evergreen_draft_";
const CURRENT_KEY_PREFIX = "evergreen_draft_current_";

export function draftKey(prefix: string, vehicleNo: string): string {
  return `${DRAFT_PREFIX}${prefix}_${(vehicleNo || "untitled").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

// Tracks the most recently used draft key so we can restore after a reload even
// if the vehicle number wasn't typed yet.
export function currentDraftKey(prefix: string): string {
  try {
    return localStorage.getItem(`${CURRENT_KEY_PREFIX}${prefix}`) || "";
  } catch {
    return "";
  }
}

export function rememberDraftKey(prefix: string, key: string): void {
  try {
    localStorage.setItem(`${CURRENT_KEY_PREFIX}${prefix}`, key);
  } catch {
    /* ignore */
  }
}

export function loadLatestDraft<T>(prefix: string): { key: string; value: T | null } {
  const key = currentDraftKey(prefix);
  if (!key) return { key, value: null };
  return { key, value: loadDraft<T>(key) };
}

export function getOutbox(): QueuedSubmission[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as QueuedSubmission[]) : [];
  } catch {
    return [];
  }
}

export function pushOutbox(entry: Omit<QueuedSubmission, "id" | "queuedAt">): QueuedSubmission {
  const entryFull: QueuedSubmission = {
    ...entry,
    id:
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };
  const list = getOutbox();
  list.push(entryFull);
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return entryFull;
}

export function removeOutbox(id: string): QueuedSubmission[] {
  const list = getOutbox().filter((e) => e.id !== id);
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}
