// ~/.aslbot only. ASLBot does not read ~/.jlfbot or ~/.openmausbot.
import path from "node:path";

export const DATA_DIR_NAME = ".aslbot";

export function defaultDataDir(home) {
  return path.join(home, DATA_DIR_NAME);
}
