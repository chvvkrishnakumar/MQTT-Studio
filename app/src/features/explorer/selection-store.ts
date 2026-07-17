import { create } from 'zustand';

interface SelectionState {
  /** connectionId -> selected topic. Lives outside the Explorer component so a
   *  tab's selection survives switching away and back (the route remounts). */
  selected: Record<string, string | undefined>;
  select: (connectionId: string, topic?: string) => void;
}

export const useSelection = create<SelectionState>((set) => ({
  selected: {},
  select: (connectionId, topic) =>
    set((s) => ({ selected: { ...s.selected, [connectionId]: topic } })),
}));
