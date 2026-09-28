// Where ASLBot keeps its data when ASLBOT_DATA_DIR / JLFBOT_DATA_DIR is not set.
//
// ~/.aslbot is this app's own directory. It does not reuse ~/.jlfbot or
// ~/.openmausbot, so ASLBot can sit next to JLFBot without sharing transcripts
// or keys.
import { join } from "node:path";

export const DATA_DIR_NAME = ".aslbot";

export function defaultDataDir(home: string): string {
  return join(home, DATA_DIR_NAME);
}
