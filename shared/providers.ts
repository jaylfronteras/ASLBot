/** Presets only prefill a base URL. The person still supplies a name and key. */
export const PROVIDER_PRESETS = [
  { id: "deepseek", name: "DeepSeek", url: "https://api.deepseek.com/v1" },
  { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  { id: "groq", name: "Groq", url: "https://api.groq.com/openai/v1" },
  { id: "openai", name: "OpenAI", url: "https://api.openai.com/v1" },
  { id: "ollama", name: "Ollama", url: "http://127.0.0.1:11434/v1" },
  { id: "lmstudio", name: "LM Studio", url: "http://127.0.0.1:1234/v1" },
] as const;

export interface ProviderSummary {
  id: string;
  name: string;
  url: string;
  hasKey: boolean;
  models: string[];
  vision: boolean;
}
