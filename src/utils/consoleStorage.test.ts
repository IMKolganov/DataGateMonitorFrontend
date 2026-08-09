import { describe, expect, it, beforeEach, vi } from "vitest";

type Store = Map<string, unknown>;

function installFakeIndexedDb() {
  const stores = new Map<string, Store>();

  class FakeRequest {
    result: unknown = undefined;
    error: unknown = null;
    onsuccess: ((ev?: unknown) => void) | null = null;
    onerror: ((ev?: unknown) => void) | null = null;
    onupgradeneeded: ((ev?: unknown) => void) | null = null;

    succeed(value: unknown) {
      this.result = value;
      queueMicrotask(() => this.onsuccess?.({ target: this }));
    }
  }

  class FakeStore {
    constructor(private readonly data: Store) {}
    put(value: unknown, key: string) {
      this.data.set(key, value);
      const req = new FakeRequest();
      req.succeed(undefined);
      return req;
    }
    get(key: string) {
      const req = new FakeRequest();
      req.succeed(this.data.get(key));
      return req;
    }
    delete(key: string) {
      this.data.delete(key);
      const req = new FakeRequest();
      req.succeed(undefined);
      return req;
    }
  }

  class FakeTx {
    objectStore(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      return new FakeStore(stores.get(name)!);
    }
  }

  class FakeDb {
    objectStoreNames = {
      contains: (name: string) => stores.has(name),
    };
    transaction(_name: string, _mode: string) {
      return new FakeTx();
    }
    createObjectStore(name: string) {
      stores.set(name, new Map());
    }
  }

  const open = vi.fn(() => {
    const req = new FakeRequest();
    queueMicrotask(() => {
      const db = new FakeDb();
      req.result = db;
      if (!stores.has("historyStore")) {
        req.onupgradeneeded?.({ target: req });
      }
      req.onsuccess?.({ target: req });
    });
    return req;
  });

  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: { open },
  });
}

describe("consoleStorage", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  it("saves and loads history and commands", async () => {
    const {
      saveHistoryToDB,
      loadHistoryFromDB,
      saveCommandHistory,
      loadCommandHistory,
      clearHistoryDB,
    } = await import("./consoleStorage");

    await saveHistoryToDB("s1", ["a", "b"]);
    expect(await loadHistoryFromDB("s1")).toEqual(["a", "b"]);

    await saveCommandHistory("s1", ["c1", "c2"]);
    expect(await loadCommandHistory("s1")).toEqual(["c1", "c2"]);

    await clearHistoryDB("s1");
    expect(await loadHistoryFromDB("s1")).toEqual([]);
    expect(await loadCommandHistory("s1")).toEqual([]);
  });
});
