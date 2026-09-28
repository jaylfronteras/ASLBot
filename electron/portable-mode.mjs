// Side-effect module, imported FIRST by main.mjs. For the Windows portable
// build (PORTABLE_EXECUTABLE_DIR set by its launcher) it points every
// Electron-managed location at ASLBot-data next to the exe before any other
// module reads app.getPath(...), so settings, sessions, caches, logs and crash
// dumps stay on the USB drive rather than in %APPDATA% / %LOCALAPPDATA%.
// The server data dir follows the same layout via resolveDesktopDataDir.
// The installed build never sets PORTABLE_EXECUTABLE_DIR, so this is a no-op
// there.
import { app } from "electron";
import fs from "node:fs";
import { portableLayout, portableRoot } from "./data-dir.mjs";

const root = portableRoot(process.env);
if (root) {
  const layout = portableLayout(root);
  for (const dir of [layout.userData, layout.logs, layout.crashDumps, layout.temp, layout.dataDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  app.setPath("userData", layout.userData);
  app.setPath("sessionData", layout.sessionData);
  app.setPath("crashDumps", layout.crashDumps);
  app.setPath("temp", layout.temp);
  app.setAppLogsPath(layout.logs);
}
