import { describe, expect, it } from "vitest";
import type { AppConfig } from "./config.ts";
import { listProviders, parseProviderInput, PROVIDER_PRESETS, removeProvider, writeProvider } from "./providers.ts";

describe("OpenAI-compatible providers", () => {
  it("offers presets that only prefill a base URL", () => {
    expect(PROVIDER_PRESETS.map((preset) => preset.id)).toEqual([
      "deepseek", "openrouter", "groq", "openai", "ollama", "lmstudio",
    ]);
    expect(PROVIDER_PRESETS.find((preset) => preset.id === "ollama")?.url).toBe("http://127.0.0.1:11434/v1");
  });

  it("creates, updates, and removes named providers without leaking keys into the summary", () => {
    const created = writeProvider({}, parseProviderInput({
      name: "DeepSeek",
      url: "https://api.deepseek.com/v1/",
      key: "sk-test",
      models: ["deepseek-chat"],
      vision: true,
    }));
    const cfg: AppConfig = { instances: created.instances };
    expect(listProviders(cfg)).toEqual([{
      id: created.id,
      name: "DeepSeek",
      url: "https://api.deepseek.com/v1",
      hasKey: true,
      models: ["deepseek-chat"],
      vision: true,
    }]);
    expect(JSON.stringify(listProviders(cfg))).not.toContain("sk-test");

    const renamed = writeProvider(cfg, parseProviderInput({ name: "Work", url: "https://api.deepseek.com/v1", key: "" }, true), created.id);
    expect(listProviders({ instances: renamed.instances })[0]).toMatchObject({ name: "Work", hasKey: false, vision: true });

    const second = writeProvider({ instances: renamed.instances }, parseProviderInput({
      name: "Local",
      url: "http://127.0.0.1:11434/v1",
    }));
    expect(listProviders({ instances: second.instances })).toHaveLength(2);
    expect(Object.keys(removeProvider({ instances: second.instances }, created.id))).toEqual([second.id]);
  });

  it("rejects a missing URL and a key stuffed into the URL", () => {
    expect(() => parseProviderInput({ name: "X", url: "not a url" })).toThrow(/http/);
    expect(() => parseProviderInput({ name: "X", url: "https://user:secret@example.com/v1" })).toThrow(/API key/);
  });
});
