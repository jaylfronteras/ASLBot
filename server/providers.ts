// Named OpenAI-compatible providers. Each one is an instance with its own
// base URL, API key, optional model list, and vision flag. Keys stay in
// config.json and are never returned by listProviders.
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { normalizeApiUrl } from "./cli-api-setup.ts";
import type { AppConfig } from "./config.ts";
import { persistableInstanceConfigs } from "./config.ts";
import type { InstanceConfigMap } from "./contracts.ts";

const NAME = z.string().trim().min(1).max(80).refine((value) => !/\p{Cc}/u.test(value), "Name cannot contain control characters");
const MODEL = z.string().trim().min(1).max(200).refine((value) => !/\p{Cc}/u.test(value), "Model ids cannot contain control characters");

export const PROVIDER_PRESETS = [
  { id: "deepseek", name: "DeepSeek", url: "https://api.deepseek.com/v1" },
  { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  { id: "groq", name: "Groq", url: "https://api.groq.com/openai/v1" },
  { id: "openai", name: "OpenAI", url: "https://api.openai.com/v1" },
  { id: "ollama", name: "Ollama", url: "http://127.0.0.1:11434/v1" },
  { id: "lmstudio", name: "LM Studio", url: "http://127.0.0.1:1234/v1" },
] as const;

export const providerWriteSchema = z.object({
  name: NAME,
  url: z.string().trim().min(1).max(500),
  key: z.string().max(4096).optional(),
  models: z.array(MODEL).max(256).optional(),
  vision: z.boolean().optional(),
}).strict();

export type ProviderWrite = z.infer<typeof providerWriteSchema>;

export interface ProviderSummary {
  id: string;
  name: string;
  url: string;
  hasKey: boolean;
  vision: boolean;
  models: string[];
}

function rawConfig(entry: { config?: unknown }): Record<string, unknown> {
  return entry.config && typeof entry.config === "object" && !Array.isArray(entry.config)
    ? entry.config as Record<string, unknown>
    : {};
}

function localUrl(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function normalizeProviderWrite(input: ProviderWrite, previousKey?: string): { url: string; key: string; models?: string[]; vision: boolean; name: string } {
  const url = normalizeApiUrl(input.url);
  const provided = input.key?.trim() ?? "";
  const key = provided || previousKey || (localUrl(url) ? "local" : "");
  // Header credentials must not contain control characters or whitespace.
  // eslint-disable-next-line no-control-regex
  if (!key || /[\u0000-\u0020\u007f]/u.test(key)) {
    throw Object.assign(new Error("Enter an API key without spaces or line breaks. Local servers can leave the key blank."), { status: 400 });
  }
  const models = input.models?.filter((model, index, all) => all.indexOf(model) === index);
  return { url, key, ...(models?.length ? { models } : {}), vision: input.vision === true, name: input.name };
}

export function listProviders(cfg: AppConfig): ProviderSummary[] {
  const saved = cfg.instances ?? {};
  return Object.entries(saved)
    .filter(([, entry]) => entry?.driver === "openai-compat")
    .map(([id, entry]) => {
      const config = rawConfig(entry);
      const key = typeof config.key === "string" ? config.key : "";
      const models = Array.isArray(config.managedModels)
        ? config.managedModels.filter((model): model is string => typeof model === "string")
        : [];
      return {
        id,
        name: entry.displayName?.trim() || id,
        url: typeof config.url === "string" ? config.url : "",
        hasKey: key.length > 0,
        vision: config.vision === true,
        models,
      };
    });
}

function providerConfig(write: ReturnType<typeof normalizeProviderWrite>, previous: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...previous,
    url: write.url,
    key: write.key,
    vision: write.vision,
  };
  if (write.models) next.managedModels = write.models;
  else delete next.managedModels;
  return next;
}

export function createProvider(cfg: AppConfig, input: ProviderWrite): { instanceId: string; instances: InstanceConfigMap } {
  const write = normalizeProviderWrite(input);
  const instances = persistableInstanceConfigs(cfg);
  const instanceId = `p-${randomUUID().slice(0, 8)}`;
  instances[instanceId] = {
    driver: "openai-compat",
    displayName: write.name,
    enabled: true,
    config: providerConfig(write, {}),
  };
  return { instanceId, instances };
}

export function updateProvider(cfg: AppConfig, instanceId: string, input: ProviderWrite): InstanceConfigMap | null {
  const instances = persistableInstanceConfigs(cfg);
  const current = instances[instanceId];
  if (!current || current.driver !== "openai-compat") return null;
  const previous = rawConfig(current);
  const previousKey = typeof previous.key === "string" ? previous.key : undefined;
  const write = normalizeProviderWrite(input, previousKey);
  instances[instanceId] = {
    ...current,
    displayName: write.name,
    enabled: true,
    config: providerConfig(write, previous),
  };
  return instances;
}

export function deleteProvider(cfg: AppConfig, instanceId: string): InstanceConfigMap | null {
  const instances = persistableInstanceConfigs(cfg);
  const current = instances[instanceId];
  if (!current || current.driver !== "openai-compat") return null;
  delete instances[instanceId];
  return instances;
}
