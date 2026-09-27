// Named OpenAI-compatible providers. Each one is an `openai-compat` instance
// with its own base URL and API key. ASLBot does not ship a default fleet.
import { randomUUID } from "node:crypto";
import type { AppConfig } from "./config.ts";
import type { InstanceConfigMap } from "./contracts.ts";
import type { ProviderSummary } from "../shared/providers.ts";

export type { ProviderSummary };

const NAME_MAX = 80;
const URL_MAX = 300;
const MODEL_MAX = 200;
const MODELS_MAX = 64;

export interface ProviderInput {
  name: string;
  url: string;
  /** Omit to keep the saved key. Empty string clears it. */
  key?: string;
  models?: string[];
  vision?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanUrl(value: string): string {
  const url = value.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Base URL must be an http or https URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Base URL must be an http or https URL.");
  }
  if (parsed.username || parsed.password) throw new Error("Put the API key in its own field, not the URL.");
  return url;
}

export function parseProviderInput(raw: unknown, partial = false): ProviderInput {
  const body = asRecord(raw);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!partial || body.name !== undefined) {
    if (!name || name.length > NAME_MAX) throw new Error(`Name must be 1–${NAME_MAX} characters.`);
  }
  if (!partial || body.url !== undefined) {
    if (!url || url.length > URL_MAX) throw new Error("Base URL is required.");
    cleanUrl(url);
  }
  let models: string[] | undefined;
  if (body.models !== undefined) {
    if (!Array.isArray(body.models)) throw new Error("Models must be a list of ids.");
    models = [];
    const seen = new Set<string>();
    for (const model of body.models) {
      if (typeof model !== "string") throw new Error("Models must be a list of ids.");
      const id = model.trim();
      if (!id || id.length > MODEL_MAX || seen.has(id)) continue;
      seen.add(id);
      models.push(id);
      if (models.length > MODELS_MAX) throw new Error(`At most ${MODELS_MAX} models.`);
    }
  }
  if (body.vision !== undefined && typeof body.vision !== "boolean") throw new Error("Vision must be true or false.");
  if (body.key !== undefined && typeof body.key !== "string") throw new Error("API key must be a string.");
  if (typeof body.key === "string" && body.key.length > 2000) throw new Error("API key is too long.");
  return {
    ...(name ? { name } : {}),
    ...(url ? { url: cleanUrl(url) } : {}),
    ...(body.key !== undefined ? { key: body.key } : {}),
    ...(models ? { models } : {}),
    ...(typeof body.vision === "boolean" ? { vision: body.vision } : {}),
  } as ProviderInput;
}

function providerConfig(input: ProviderInput, previous: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...previous, tools: previous.tools !== false };
  if (input.url) next.url = input.url;
  if (input.key !== undefined) {
    if (input.key.trim()) next.key = input.key.trim();
    else delete next.key;
  }
  if (input.models) {
    if (input.models.length) next.managedModels = input.models;
    else delete next.managedModels;
  }
  if (input.vision !== undefined) next.vision = input.vision;
  return next;
}

export function listProviders(cfg: AppConfig): ProviderSummary[] {
  const instances = cfg.instances ?? {};
  return Object.entries(instances)
    .filter(([, entry]) => entry.driver === "openai-compat")
    .map(([id, entry]) => {
      const config = asRecord(entry.config);
      const models = Array.isArray(config.managedModels)
        ? config.managedModels.filter((model): model is string => typeof model === "string")
        : typeof config.model === "string" && config.model ? [config.model] : [];
      return {
        id,
        name: entry.displayName?.trim() || id,
        url: typeof config.url === "string" ? config.url : "",
        hasKey: typeof config.key === "string" && config.key.length > 0,
        models,
        vision: config.vision === true,
      };
    });
}

export function writeProvider(cfg: AppConfig, input: ProviderInput, id?: string): { id: string; instances: InstanceConfigMap } {
  const instances: InstanceConfigMap = cfg.instances ? { ...cfg.instances } : {};
  const instanceId = id ?? `provider-${randomUUID().slice(0, 8)}`;
  if (id && !Object.hasOwn(instances, id)) throw new Error("That provider was not found.");
  if (id && instances[id].driver !== "openai-compat") throw new Error("That provider was not found.");
  const previous = asRecord(instances[instanceId]?.config);
  const name = input.name?.trim() || instances[instanceId]?.displayName || "Provider";
  const url = input.url || (typeof previous.url === "string" ? previous.url : "");
  if (!url) throw new Error("Base URL is required.");
  instances[instanceId] = {
    ...instances[instanceId],
    driver: "openai-compat",
    displayName: name,
    config: providerConfig({ ...input, url }, previous),
  };
  return { id: instanceId, instances };
}

export function removeProvider(cfg: AppConfig, id: string): InstanceConfigMap {
  const instances: InstanceConfigMap = cfg.instances ? { ...cfg.instances } : {};
  if (!Object.hasOwn(instances, id) || instances[id].driver !== "openai-compat") {
    throw new Error("That provider was not found.");
  }
  delete instances[id];
  return instances;
}
