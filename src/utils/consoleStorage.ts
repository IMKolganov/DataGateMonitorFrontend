// src/utils/consoleStorage.ts
const DB_NAME = "ConsoleHistoryDB";
const STORE_NAME = "historyStore";
const MAX_HISTORY_SIZE = 25 * 1024 * 1024; // 25 MB

const openDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveHistoryToDB = async (serverId: string, messages: string[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let historySize = new Blob([messages.join("\n")]).size;
  while (historySize > MAX_HISTORY_SIZE) {
    messages.shift();
    historySize = new Blob([messages.join("\n")]).size;
  }

  store.put(messages.join("\n"), serverId);
};

export const loadHistoryFromDB = async (serverId: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise<string[]>((resolve) => {
    const request = store.get(serverId);
    request.onsuccess = () => resolve(request.result ? request.result.split("\n") : []);
    request.onerror = () => resolve([]);
  });
};

export const clearHistoryDB = async (serverId: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(serverId);
  store.delete(`${serverId}:commands`);
};

const COMMANDS_KEY = (serverId: string) => `${serverId}:commands`;
const MAX_COMMANDS = 200;

export const saveCommandHistory = async (
  serverId: string,
  commands: string[],
): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const trimmed =
    commands.length > MAX_COMMANDS
      ? commands.slice(-MAX_COMMANDS)
      : commands;
  store.put(trimmed, COMMANDS_KEY(serverId));
};

export const loadCommandHistory = async (
  serverId: string,
): Promise<string[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise<string[]>((resolve) => {
    const request = store.get(COMMANDS_KEY(serverId));
    request.onsuccess = () =>
      resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => resolve([]);
  });
};
