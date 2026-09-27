export const SIMPLE_MODE_KEY = "aslbot-simple-mode";

/** The simple layout is the only layout. The setter remains so older
 * settings controls can call it without changing the product. */
export function setSimpleMode(_enabled: boolean): void {}

export function useSimpleMode(): boolean {
  return true;
}

/** Thread rows, new-thread buttons, and folder controls. Simple mode hides
 * them even when the separate "show threads" preference is still on. */
export function threadListsVisible(showThreads: boolean, simpleMode: boolean): boolean {
  return showThreads && !simpleMode;
}
