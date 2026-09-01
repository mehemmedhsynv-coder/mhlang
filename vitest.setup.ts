import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `globals: false` means Testing Library can't auto-detect the test runner
// to register its own cleanup, so unmount rendered components ourselves.
afterEach(() => {
  cleanup();
});

// Node 22+ ships an experimental native `localStorage` gated behind
// `--localstorage-file`. jsdom's `window.localStorage` getter, as wired up by
// vitest's jsdom environment on newer Node versions, delegates to that native
// global and silently returns `undefined` when the flag isn't set. Replace it
// with a small in-memory implementation so localStorage-dependent tests work
// the same regardless of Node flags.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
