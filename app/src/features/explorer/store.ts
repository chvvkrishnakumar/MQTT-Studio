import { create } from 'zustand';
import type { ConnectionDelta, ConnStatus, QoS, StatusUpdate } from '@shared/schema';

export interface TopicState {
  topic: string;
  payload: string;
  qos: QoS;
  retain: boolean;
  ts: number;
  count: number;
  /** bumped on every update; drives the flash animation */
  updatedAt: number;
}

interface StudioState {
  statuses: Record<string, ConnStatus>;
  errors: Record<string, string | undefined>;
  /** connectionId -> topic -> latest value */
  topics: Record<string, Record<string, TopicState>>;
  paused: boolean;

  applyDelta: (delta: ConnectionDelta) => void;
  setStatus: (update: StatusUpdate) => void;
  setStatuses: (statuses: Record<string, ConnStatus>) => void;
  setPaused: (paused: boolean) => void;
  clearTopics: (connectionId: string) => void;
}

export const useStudio = create<StudioState>((set) => ({
  statuses: {},
  errors: {},
  topics: {},
  paused: false,

  applyDelta: (delta) =>
    set((state) => {
      const now = Date.now();
      const next = { ...(state.topics[delta.connectionId] ?? {}) };
      for (const u of delta.updates) next[u.topic] = { ...u, updatedAt: now };
      return { topics: { ...state.topics, [delta.connectionId]: next } };
    }),

  setStatus: ({ connectionId, status, error }) =>
    set((state) => ({
      statuses: { ...state.statuses, [connectionId]: status },
      errors: { ...state.errors, [connectionId]: error },
    })),

  setStatuses: (statuses) => set({ statuses }),
  setPaused: (paused) => set({ paused }),
  clearTopics: (connectionId) =>
    set((state) => ({ topics: { ...state.topics, [connectionId]: {} } })),
}));
