// Where ASLBot keeps its data when ASLBOT_DATA_DIR / JLFBOT_DATA_DIR is not set.
//
// ~/.aslbot is only this app. ~/.jlfbot, ~/.openmausbot, and ~/.opengrokbot
// belong to other products and are never read or renamed.
import { join } from "node:path";

export const DATA_DIR_NAME = ".aslbot";

export function defaultDataDir(home: string): string {
  return join(home, DATA_DIR_NAME);
}
