import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { defaultDataDir } from "./data-dir.ts";

const homes: string[] = [];
const home = () => { const dir = mkdtempSync(join(tmpdir(), "aslbot-home-")); homes.push(dir); return dir; };
afterEach(() => { for (const dir of homes.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("defaultDataDir", () => {
  it("uses ~/.aslbot on a fresh machine", () => {
    expect(defaultDataDir(home())).toBe(join(homes[0]!, ".aslbot"));
  });

  it("does not adopt another product's data directory", () => {
    const h = home();
    mkdirSync(join(h, ".jlfbot"));
    mkdirSync(join(h, ".openmausbot"));
    mkdirSync(join(h, ".opengrokbot"));
    expect(defaultDataDir(h)).toBe(join(h, ".aslbot"));
  });
});
