/**
 * Save protection. Progress lives in browser storage under SAVE_KEY as a versioned
 * envelope { v, savedAt, data }. Older un-versioned saves are migrated on read; corrupt
 * saves fall back to the backup copy (SAVE_KEY + "-backup"), refreshed at most once a
 * minute from the last good save. Saves can be exported/imported as JSON files.
 * Gameplay never breaks when storage is blocked or full — the caller is told once so it
 * can show a visible warning.
 */
export const SAVE_VERSION = 2;
export const SAVE_KEY = "sack-v2";
export const BACKUP_KEY = `${SAVE_KEY}-backup`;
export type SaveData = Record<string, unknown>;
export type SaveRead = { data: SaveData | null; source: "none" | "save" | "backup"; migrated: boolean; corrupt: boolean; newer: boolean };
type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };

const MAX_MONEY = 10_000_000;
/** Validate and clamp a save's data so a bad or hand-edited save can't break the game. */
export function sanitizeSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data: SaveData = { ...(raw as SaveData) };
  for (const key of ["dollars", "respect", "bait", "worms", "shad", "bestBowl", "bestRace", "totalCaught"]) {
    if (!(key in data)) continue;
    const n = data[key];
    if (typeof n !== "number" || !Number.isFinite(n)) delete data[key];
    else data[key] = Math.max(0, Math.min(key === "dollars" || key === "respect" ? MAX_MONEY : 1_000_000, n));
  }
  for (const key of ["mission", "dialogue"]) if (key in data && typeof data[key] !== "string") delete data[key];
  if ("cooler" in data && !Array.isArray(data.cooler)) delete data.cooler;
  return data;
}

/** Parse one stored value: versioned envelope, legacy plain object, or corrupt. */
export function parseSave(raw: string | null): { data: SaveData | null; migrated: boolean; corrupt: boolean; newer: boolean } {
  if (raw == null || raw === "") return { data: null, migrated: false, corrupt: false, newer: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: null, migrated: false, corrupt: true, newer: false };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { data: null, migrated: false, corrupt: true, newer: false };
  const env = parsed as { v?: unknown; data?: unknown };
  if (typeof env.v === "number") {
    const data = sanitizeSave(env.data);
    return { data, migrated: false, corrupt: data === null, newer: env.v > SAVE_VERSION };
  }
  // Legacy (v1): the plain progress object itself.
  const data = sanitizeSave(parsed);
  return { data, migrated: data !== null, corrupt: data === null, newer: false };
}

/** Read progress: the save, else the backup when the save is corrupt. Never throws. */
export function loadSave(storage: StorageLike | null | undefined): SaveRead {
  const get = (key: string) => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const main = parseSave(get(SAVE_KEY));
  if (main.data) return { ...main, source: "save" };
  const backup = parseSave(get(BACKUP_KEY));
  if (backup.data) return { ...backup, source: "backup", corrupt: main.corrupt };
  return { data: null, source: "none", migrated: false, corrupt: main.corrupt, newer: false };
}

export const wrapSave = (data: unknown, now = new Date()) => JSON.stringify({ v: SAVE_VERSION, savedAt: now.toISOString(), data });

/** Writes changed saves; refreshes the backup from the last good save at most once a minute. */
export function createSaveWriter(
  write: (value: string) => void,
  opts: { backup?: (value: string) => void; onFail?: (error: unknown) => void; now?: () => number } = {},
) {
  let lastAttempt: string | undefined;
  let lastGood: string | undefined;
  let lastBackupAt = -Infinity;
  let warned = false;
  const now = opts.now ?? (() => Date.now());
  return (snapshot: unknown) => {
    const state = JSON.stringify(snapshot);
    if (state === lastAttempt) return;
    lastAttempt = state;
    const value = wrapSave(snapshot);
    try {
      if (opts.backup && lastGood && now() - lastBackupAt >= 60_000) {
        opts.backup(lastGood);
        lastBackupAt = now();
      }
      write(value);
      lastGood = value;
    } catch (error) {
      if (!warned) {
        console.warn("Progress cannot be saved in this browser session.", error);
        warned = true;
        opts.onFail?.(error);
      }
    }
  };
}

/** A save file for download; importSave validates before anything is written. */
export const exportSave = (storage: StorageLike | null | undefined): string | null => {
  const read = loadSave(storage);
  return read.data ? JSON.stringify({ v: SAVE_VERSION, savedAt: new Date().toISOString(), data: read.data }, null, 2) : null;
};
export function importSave(storage: StorageLike, text: string): { ok: true } | { ok: false; reason: string } {
  const parsed = parseSave(text);
  if (!parsed.data) return { ok: false, reason: "That file isn't a SackReligious save." };
  try {
    const current = storage.getItem(SAVE_KEY);
    if (current) storage.setItem(BACKUP_KEY, current);
    storage.setItem(SAVE_KEY, wrapSave(parsed.data));
    return { ok: true };
  } catch {
    return { ok: false, reason: "This browser won't let the game save right now." };
  }
}
