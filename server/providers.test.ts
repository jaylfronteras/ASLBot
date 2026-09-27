import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "./config.ts";
import { instanceConfigs } from "./config.ts";
import { computerMcpFor } from "./openai-vision.ts";
import { createProvider, deleteProvider, listProviders, updateProvider } from "./providers.ts";

const previous = process.env.ASLBOT_TEST_ENGINES;

afterEach(() => {
  if (previous === undefined) delete process.env.ASLBOT_TEST_ENGINES;
  else process.env.ASLBOT_TEST_ENGINES = previous;
});

function product<T>(run: () => T): T {
  delete process.env.ASLBOT_TEST_ENGINES;
  return run();
}

describe("OpenAI-compatible providers", () => {
  it("starts with an empty fleet and drops CLI engines", () => {
    product(() => {
      expect(instanceConfigs({} as AppConfig)).toEqual({});
      const mixed = instanceConfigs({
        instances: {
          claude: { driver: "claudeAgent" },
          deepseek: { driver: "openai-compat", displayName: "DeepSeek", config: { url: "https://api.deepseek.com/v1", key: "sk-test" } },
        },
      } as AppConfig);
      expect(Object.keys(mixed)).toEqual(["deepseek"]);
    });
  });

  it("adds, edits, and removes providers without returning the key", () => {
    product(() => {
      const created = createProvider({} as AppConfig, {
        name: "DeepSeek",
        url: "https://api.deepseek.com/v1",
        key: "sk-test",
        vision: true,
        models: ["deepseek-chat"],
      });
      const cfg = { instances: created.instances } as AppConfig;
      const listed = listProviders(cfg);
      expect(listed).toEqual([{
        id: created.instanceId,
        name: "DeepSeek",
        url: "https://api.deepseek.com/v1",
        hasKey: true,
        vision: true,
        models: ["deepseek-chat"],
      }]);
      expect(JSON.stringify(listed)).not.toContain("sk-test");

      const local = createProvider(cfg, { name: "Ollama", url: "http://127.0.0.1:11434/v1" });
      expect(local.instances[local.instanceId]?.config).toMatchObject({ key: "local" });

      const edited = updateProvider({ instances: local.instances } as AppConfig, created.instanceId, {
        name: "DeepSeek 2",
        url: "https://api.deepseek.com/v1",
        vision: false,
      });
      expect(edited).toBeTruthy();
      const saved = edited?.[created.instanceId];
      expect(saved?.displayName).toBe("DeepSeek 2");
      expect(saved && typeof saved.config === "object" && saved.config && "key" in saved.config && saved.config.key).toBe("sk-test");

      const removed = deleteProvider({ instances: edited! } as AppConfig, local.instanceId);
      expect(removed?.[local.instanceId]).toBeUndefined();
      expect(removed?.[created.instanceId]).toBeTruthy();
    });
  });

  it("does not offer computer tools", () => {
    product(() => {
      expect(computerMcpFor({ adapter: { capabilities: { computerMcp: true } } } as never, "gpt-4o")).toBe(false);
    });
  });
});
