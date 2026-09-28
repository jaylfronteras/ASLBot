// ~/.aslbot only. ASLBot does not read ~/.jlfbot or ~/.openmausbot.
//
// Portable mode: the Windows `portable` build (ASLBot-<version>-portable.exe)
// is a single self-extracting exe meant to run from a USB drive. Its launcher
// sets PORTABLE_EXECUTABLE_DIR to the folder holding the exe. When that is
// set, EVERYTHING the app keeps — the server data dir (settings, bots, chats,
// provider keys), Electron userData/session/cache, logs and crash dumps —
// lives in an `ASLBot-data` folder next to the exe, so it travels with the
// drive instead of landing in ~/.aslbot or %APPDATA% on the host PC. The
// installed (NSIS) build never sets that variable and keeps using ~/.aslbot.
import path from "node:path";

export const DATA_DIR_NAME = ".aslbot";
export const PORTABLE_DATA_DIR_NAME = "ASLBot-data";

export function defaultDataDir(home) {
  return path.join(home, DATA_DIR_NAME);
}

/** The folder holding the portable exe, or null when not running portable. */
export function portableRoot(env = process.env) {
  const dir = typeof env.PORTABLE_EXECUTABLE_DIR === "string" ? env.PORTABLE_EXECUTABLE_DIR.trim() : "";
  return dir ? path.resolve(dir) : null;
}

/** Where a portable copy keeps each kind of state, all under ASLBot-data. */
export function portableLayout(root) {
  const base = path.join(root, PORTABLE_DATA_DIR_NAME);
  return {
    base,
    dataDir: path.join(base, "data"),
    userData: path.join(base, "electron"),
    sessionData: path.join(base, "electron"),
    logs: path.join(base, "logs"),
    crashDumps: path.join(base, "crash-dumps"),
    temp: path.join(base, "temp"),
  };
}

/**
 * The desktop's server data dir. An explicit ASLBOT_DATA_DIR/JLFBOT_DATA_DIR
 * override wins (an empty value counts as unset, matching the historical
 * desktop fallback); then the portable folder; then ~/.aslbot.
 */
export function resolveDesktopDataDir({ env = process.env, home }) {
  if (env.ASLBOT_DATA_DIR) return env.ASLBOT_DATA_DIR;
  if (env.JLFBOT_DATA_DIR) return env.JLFBOT_DATA_DIR;
  const root = portableRoot(env);
  if (root) return portableLayout(root).dataDir;
  return defaultDataDir(home);
}
