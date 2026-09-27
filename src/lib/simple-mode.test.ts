import { describe, expect, it } from "vitest";

import { setSimpleMode, threadListsVisible, useSimpleMode } from "./simple-mode";

describe("simple mode", () => {
  it("is the only layout", () => {
    expect(useSimpleMode()).toBe(true);
    setSimpleMode(false);
    expect(useSimpleMode()).toBe(true);
  });

  it("hides thread lists while simple mode is on", () => {
    expect(threadListsVisible(true, false)).toBe(true);
    expect(threadListsVisible(false, false)).toBe(false);
    expect(threadListsVisible(true, true)).toBe(false);
    expect(threadListsVisible(false, true)).toBe(false);
  });
});
