export const SIMPLE_MODE_KEY = "jlfbot-simple-mode";

// ASLBot has one layout: the sidebar, one ongoing chat, and the side panels.
// The preference used to be optional. It is the product now.
export function setSimpleMode(_enabled: boolean): void {}

export function useSimpleMode(): boolean {
  return true;
}

/** Thread rows, new-thread buttons, and folder controls. Simple mode hides
 * them even when the separate "show threads" preference is still on. */
export function threadListsVisible(showThreads: boolean, simpleMode: boolean): boolean {
  return showThreads && !simpleMode;
}
