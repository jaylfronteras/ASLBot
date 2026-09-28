// Where the desktop keeps its data: ~/.aslbot for the installed build, and
// ASLBot-data next to the exe for the Windows portable build (whose launcher
// sets PORTABLE_EXECUTABLE_DIR). See electron/data-dir.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DATA_DIR_NAME,
  PORTABLE_DATA_DIR_NAME,
  defaultDataDir,
  portableLayout,
  portableRoot,
  resolveDesktopDataDir,
} from "./data-dir.mjs";
import { resolveSavablePath } from "./save-file.mjs";

const home = path.resolve("/home/ada");
const usb = path.resolve("/media/usb/ASLBot");

test("the installed build keeps using ~/.aslbot", () => {
  assert.equal(DATA_DIR_NAME, ".aslbot");
  assert.equal(portableRoot({}), null);
  assert.equal(resolveDesktopDataDir({ env: {}, home }), path.join(home, ".aslbot"));
  assert.equal(resolveDesktopDataDir({ env: { PORTABLE_EXECUTABLE_DIR: "  " }, home }), defaultDataDir(home));
});

test("the portable build keeps its data in ASLBot-data next to the exe", () => {
  const env = { PORTABLE_EXECUTABLE_DIR: usb };
  assert.equal(PORTABLE_DATA_DIR_NAME, "ASLBot-data");
  assert.equal(portableRoot(env), usb);
  const dataDir = resolveDesktopDataDir({ env, home });
  assert.equal(dataDir, path.join(usb, "ASLBot-data", "data"));
  assert.ok(!dataDir.startsWith(home), "portable data must not land in the host home");
});

test("every Electron-managed location of a portable copy stays under ASLBot-data", () => {
  const layout = portableLayout(usb);
  const base = path.join(usb, "ASLBot-data");
  assert.equal(layout.base, base);
  for (const key of ["dataDir", "userData", "sessionData", "logs", "crashDumps", "temp"]) {
    const relative = path.relative(base, layout[key]);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `${key} escapes ASLBot-data: ${layout[key]}`);
  }
});

test("an explicit data dir override still wins over portable mode", () => {
  const env = { PORTABLE_EXECUTABLE_DIR: usb, ASLBOT_DATA_DIR: path.resolve("/srv/aslbot") };
  assert.equal(resolveDesktopDataDir({ env, home }), path.resolve("/srv/aslbot"));
  assert.equal(resolveDesktopDataDir({ env: { PORTABLE_EXECUTABLE_DIR: usb, JLFBOT_DATA_DIR: path.resolve("/srv/j") }, home }), path.resolve("/srv/j"));
  // empty overrides count as unset, as before
  assert.equal(resolveDesktopDataDir({ env: { PORTABLE_EXECUTABLE_DIR: usb, ASLBOT_DATA_DIR: "" }, home }), path.join(usb, "ASLBot-data", "data"));
});

test("Save As accepts bot files from the portable data dir", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aslbot-portable-"));
  try {
    const dataDir = resolveDesktopDataDir({ env: { PORTABLE_EXECUTABLE_DIR: root }, home: path.join(root, "host-home") });
    const file = path.join(dataDir, "workspaces", "bot", "report.txt");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "report");
    // .native: Windows temp paths can carry 8.3 short names (RUNNER~1) that
    // only the native realpath expands, as resolveSavablePath does.
    assert.equal(await resolveSavablePath(file, { home: path.join(root, "host-home"), dataDir }), fs.realpathSync.native(file));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("main.mjs applies portable paths before anything else and the updater stays off", () => {
  const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
  const main = read("main.mjs");
  const firstImport = main.split(/\r?\n/).find((line) => line.startsWith("import "));
  assert.equal(firstImport, 'import "./portable-mode.mjs";');
  const portable = read("portable-mode.mjs");
  for (const name of ["userData", "sessionData", "crashDumps", "temp"]) {
    assert.match(portable, new RegExp(`app\\.setPath\\("${name}"`));
  }
  assert.match(portable, /app\.setAppLogsPath\(/);
  const updater = read("updater.mjs");
  const start = updater.slice(updater.indexOf("export function startUpdater()"));
  assert.match(start.slice(0, start.indexOf("require(")), /if \(!app\.isPackaged \|\| portableRoot\(process\.env\)\) \{/);
});
