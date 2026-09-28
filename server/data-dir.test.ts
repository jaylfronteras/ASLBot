import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { defaultDataDir } from "./data-dir.ts";

const homes: string[] = [];
const home = () => { const dir = mkdtempSync(join(tmpdir(), "aslbot-home-")); homes.push(dir); return dir; };
afterEach(() => { for (const dir of homes.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("defaultDataDir", () => {
  it("uses ~/.aslbot and does not reuse a JLFBot or OpenMausBot directory", () => {
    const h = home();
    expect(defaultDataDir(h)).toBe(join(h, ".aslbot"));
  });
});
