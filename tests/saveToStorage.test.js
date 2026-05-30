/**
 * Tests for saveToStorage(transactions)
 * Requirements: 6.1, 6.2
 */

"use strict";

// ---------------------------------------------------------------------------
// In-memory localStorage stub
// ---------------------------------------------------------------------------

const localStorageStub = (() => {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    _store() {
      return store;
    }
  };
})();

// Inject stub before loading the module
global.localStorage = localStorageStub;

const { saveToStorage, STORAGE_KEY } = require("../js/app.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTransaction(overrides = {}) {
  return Object.assign(
    { id: "test-id-1", name: "Coffee", amount: 4.5, category: "Food" },
    overrides
  );
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorageStub.clear();
});

describe("saveToStorage — basic write", () => {
  test("writes serialized JSON to localStorage under STORAGE_KEY", () => {
    const transactions = [makeTransaction()];
    saveToStorage(transactions);
    const raw = localStorageStub.getItem(STORAGE_KEY);
    expect(raw).toBe(JSON.stringify(transactions));
  });

  test("writes an empty array as '[]'", () => {
    saveToStorage([]);
    expect(localStorageStub.getItem(STORAGE_KEY)).toBe("[]");
  });

  test("overwrites a previous value on subsequent calls", () => {
    const first = [makeTransaction({ id: "a", name: "Lunch" })];
    const second = [makeTransaction({ id: "b", name: "Dinner" })];
    saveToStorage(first);
    saveToStorage(second);
    expect(localStorageStub.getItem(STORAGE_KEY)).toBe(JSON.stringify(second));
  });

  test("persists multiple transactions in order", () => {
    const transactions = [
      makeTransaction({ id: "1", name: "Bus", category: "Transport", amount: 2.0 }),
      makeTransaction({ id: "2", name: "Movie", category: "Fun", amount: 15.0 }),
      makeTransaction({ id: "3", name: "Groceries", category: "Food", amount: 45.99 })
    ];
    saveToStorage(transactions);
    const stored = JSON.parse(localStorageStub.getItem(STORAGE_KEY));
    expect(stored).toEqual(transactions);
  });

  test("does not mutate the input array", () => {
    const transactions = [makeTransaction()];
    const copy = JSON.parse(JSON.stringify(transactions));
    saveToStorage(transactions);
    expect(transactions).toEqual(copy);
  });
});

describe("saveToStorage — failure handling", () => {
  test("throws Error('STORAGE_WRITE_FAILED') when localStorage.setItem throws", () => {
    const originalSetItem = localStorageStub.setItem;
    localStorageStub.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };

    try {
      expect(() => saveToStorage([makeTransaction()])).toThrow("STORAGE_WRITE_FAILED");
    } finally {
      localStorageStub.setItem = originalSetItem;
    }
  });

  test("thrown error is an instance of Error", () => {
    const originalSetItem = localStorageStub.setItem;
    localStorageStub.setItem = () => {
      throw new Error("simulated failure");
    };

    try {
      let caught;
      try {
        saveToStorage([makeTransaction()]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toBe("STORAGE_WRITE_FAILED");
    } finally {
      localStorageStub.setItem = originalSetItem;
    }
  });

  test("does not swallow the error silently — must throw", () => {
    const originalSetItem = localStorageStub.setItem;
    localStorageStub.setItem = () => {
      throw new Error("quota exceeded");
    };

    try {
      expect(() => saveToStorage([])).toThrow();
    } finally {
      localStorageStub.setItem = originalSetItem;
    }
  });
});

describe("saveToStorage — STORAGE_KEY constant", () => {
  test("STORAGE_KEY is the fixed string 'expense_budget_visualizer_data'", () => {
    expect(STORAGE_KEY).toBe("expense_budget_visualizer_data");
  });

  test("data is stored under the exact STORAGE_KEY", () => {
    const transactions = [makeTransaction()];
    saveToStorage(transactions);
    // Verify the key used is exactly STORAGE_KEY
    expect(localStorageStub.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorageStub.getItem("wrong_key")).toBeNull();
  });
});
