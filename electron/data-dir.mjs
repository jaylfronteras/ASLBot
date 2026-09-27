// Mirror of server/data-dir.ts for the Electron main process (which cannot
// import the server's TypeScript). Keep the two in sync.
import path from "node:path";

export const DATA_DIR_NAME = ".aslbot";

/** ~/.aslbot. Other products' folders are left alone. */
export function defaultDataDir(home) {
  return path.join(home, DATA_DIR_NAME);
}
