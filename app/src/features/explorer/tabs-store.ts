import { create } from 'zustand';

const KEY = 'mqtt-studio.open-tabs';

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function persist(tabs: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tabs));
  } catch {}
}

interface TabsState {
  /** Ordered connectionIds of open explorer tabs. */
  tabs: string[];
  /** Add a tab (no-op if already open). */
  open: (id: string) => void;
  /** Remove a tab; returns the neighbour to fall back to, if any. */
  close: (id: string) => string | undefined;
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: load(),

  open: (id) =>
    set((s) => {
      if (s.tabs.includes(id)) return s;
      const tabs = [...s.tabs, id];
      persist(tabs);
      return { tabs };
    }),

  close: (id) => {
    const { tabs } = get();
    const idx = tabs.indexOf(id);
    const next = tabs[idx + 1] ?? tabs[idx - 1];
    const remaining = tabs.filter((t) => t !== id);
    persist(remaining);
    set({ tabs: remaining });
    return next;
  },
}));
