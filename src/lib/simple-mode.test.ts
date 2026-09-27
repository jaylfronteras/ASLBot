import { describe, expect, it } from "vitest";
import { threadListsVisible, useSimpleMode } from "./simple-mode";

describe("simple mode", () => {
  it("is the only layout", () => {
    expect(useSimpleMode()).toBe(true);
  });

  it("opens the inherited layout only when the verification launch asks", () => {
    const holder = globalThis as { location?: { search: string } };
    const previous = holder.location;
    holder.location = { search: "?aslbot-ui=full" };
    expect(useSimpleMode()).toBe(false);
    holder.location = { search: "" };
    expect(useSimpleMode()).toBe(true);
    if (previous === undefined) delete holder.location;
    else holder.location = previous;
  });

  it("hides thread lists", () => {
    expect(threadListsVisible(true, false)).toBe(true);
    expect(threadListsVisible(false, false)).toBe(false);
    expect(threadListsVisible(true, true)).toBe(false);
    expect(threadListsVisible(false, true)).toBe(false);
  });
});
