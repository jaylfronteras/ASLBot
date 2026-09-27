import { useSyncExternalStore } from "react";

export type SidePanel = "settings" | "routines";

let panel: SidePanel | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function sidePanel(): SidePanel | null {
  return panel;
}

export function openSidePanel(next: SidePanel): void {
  panel = panel === next ? null : next;
  emit();
}

export function closeSidePanel(): void {
  if (!panel) return;
  panel = null;
  emit();
}

export function useSidePanel(): SidePanel | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    sidePanel,
    () => null,
  );
}
