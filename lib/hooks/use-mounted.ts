import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after the client has mounted — avoids SSR/client hydration
 * mismatches for anything that must render differently server vs. client
 * (e.g. reading a theme that only exists in localStorage). Implemented with
 * useSyncExternalStore instead of an effect + setState so there's no extra
 * render-triggering state update to reason about.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
