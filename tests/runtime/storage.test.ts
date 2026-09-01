import { describe, expect, it, beforeEach } from "vitest";
import { DEFAULT_STORAGE_KEY, getStoredLocale, setStoredLocale } from "../../src/runtime/storage.js";

describe("locale storage (jsdom environment)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(getStoredLocale()).toBeNull();
  });

  it("persists and reads back a locale under the default key", () => {
    setStoredLocale("en");
    expect(getStoredLocale()).toBe("en");
    expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe("en");
  });

  it("supports a custom storage key", () => {
    setStoredLocale("ru", "custom-key");
    expect(getStoredLocale("custom-key")).toBe("ru");
    expect(getStoredLocale()).toBeNull();
  });

  it("does not throw when localStorage.setItem fails (e.g. quota exceeded)", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => setStoredLocale("en")).not.toThrow();
    window.localStorage.setItem = original;
  });
});

describe("locale storage without window (SSR simulation)", () => {
  it("getStoredLocale returns null when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulating an SSR environment where `window` does not exist
    delete globalThis.window;

    try {
      expect(getStoredLocale()).toBeNull();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("setStoredLocale is a no-op when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulating an SSR environment where `window` does not exist
    delete globalThis.window;

    try {
      expect(() => setStoredLocale("en")).not.toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
