export const SIMPLE_MODE_KEY = "jlfbot-simple-mode";

// The verification launcher opens the inherited thread layout with this
// query so the existing renderer smokes can drive it. The desktop app never
// sets it, and there is no settings switch.
const FULL_UI_QUERY = "aslbot-ui=full";

// ASLBot has one layout: the sidebar, one ongoing chat, and the side panels.
// The preference used to be optional. It is the product now.
export function setSimpleMode(_enabled: boolean): void {}

export function useSimpleMode(): boolean {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  return !(typeof search === "string" && search.includes(FULL_UI_QUERY));
}

/** Thread rows, new-thread buttons, and folder controls. Simple mode hides
 * them even when the separate "show threads" preference is still on. */
export function threadListsVisible(showThreads: boolean, simpleMode: boolean): boolean {
  return showThreads && !simpleMode;
}
