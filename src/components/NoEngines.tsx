// First run, or every saved provider is unreachable. ASLBot only talks to
// OpenAI-compatible endpoints, so this screen is the one setup step.
import { ProviderSettings } from "./ProviderSettings";
import { brand } from "../lib/brand";

export function NoEngines() {
  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-app">
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        <h1 className="text-[20px] font-semibold text-ink">Add a provider</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary">
          {brand().name} runs every bot through an OpenAI-compatible endpoint. Paste a base URL and API key to start. You can add more than one and switch per bot.
        </p>
        <div className="mt-6">
          <ProviderSettings />
        </div>
      </div>
    </main>
  );
}
