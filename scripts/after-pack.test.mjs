import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import afterPack from "./after-pack.mjs";

const temporaryDirectories = [];

function appDir() {
  const appOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "aslbot-after-pack-"));
  temporaryDirectories.push(appOutDir);
  fs.mkdirSync(path.join(appOutDir, "resources"), { recursive: true });
  return appOutDir;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe.skipIf(process.platform === "win32")("Linux afterPack", () => {
  it("rejects a package that still contains a computer-use runtime", async () => {
    const appOutDir = appDir();
    fs.mkdirSync(path.join(appOutDir, "resources", "cua-linux-x64"), { recursive: true });
    await expect(afterPack({ electronPlatformName: "linux", appOutDir })).rejects.toThrow(/computer-use/);
  });

  it("accepts a package without a computer-use runtime", async () => {
    const appOutDir = appDir();
    await expect(afterPack({ electronPlatformName: "linux", appOutDir })).resolves.toBeUndefined();
  });
});
