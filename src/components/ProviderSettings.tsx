// Add, edit, and remove OpenAI-compatible providers. Each provider is a name,
// base URL, API key, optional model list, and a vision switch.
import { useEffect, useState } from "react";
import { api, useStore } from "@/state/store";
import { PROVIDER_PRESETS, type ProviderSummary } from "../../shared/providers";

interface ProviderDraft {
  id?: string;
  name: string;
  url: string;
  key: string;
  models: string;
  vision: boolean;
}

const emptyDraft = (): ProviderDraft => ({ name: "", url: "", key: "", models: "", vision: false });

export function ProviderSettings() {
  const { refreshInstances } = useStore();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [draft, setDraft] = useState<ProviderDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const body = await api<{ providers: ProviderSummary[] }>("/api/providers");
    setProviders(body.providers);
  };

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const models = draft.models.split(/[\n,]/).map((model) => model.trim()).filter(Boolean);
      const payload = {
        name: draft.name,
        url: draft.url,
        ...(draft.key ? { key: draft.key } : draft.id ? {} : { key: "" }),
        models,
        vision: draft.vision,
      };
      if (draft.id) {
        await api(`/api/providers/${encodeURIComponent(draft.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/providers", { method: "POST", body: JSON.stringify(payload) });
      }
      setDraft(emptyDraft());
      await load();
      await refreshInstances();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/providers/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (draft.id === id) setDraft(emptyDraft());
      await load();
      await refreshInstances();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const fetchModels = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/instances/${encodeURIComponent(id)}/refresh-models`, { method: "POST", body: "{}" });
      await refreshInstances();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Providers</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          ASLBot talks only to OpenAI-compatible endpoints. Add as many as you need — each bot picks one.
        </p>
      </div>

      {providers.length === 0 && (
        <p className="rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink-secondary">
          No providers yet. Add one to start chatting.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {providers.map((provider) => (
          <li key={provider.id} className="flex items-center gap-2 rounded-xl border border-hairline/40 bg-card px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-ink">{provider.name}</div>
              <div className="truncate text-[12px] text-ink-secondary">{provider.url}</div>
            </div>
            <button type="button" className="rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink" onClick={() => void fetchModels(provider.id)}>Fetch models</button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink"
              onClick={() => setDraft({
                id: provider.id,
                name: provider.name,
                url: provider.url,
                key: "",
                models: provider.models.join("\n"),
                vision: provider.vision,
              })}
            >Edit</button>
            <button type="button" className="rounded-md px-2 py-1 text-[12px] text-danger hover:bg-raised" onClick={() => void remove(provider.id)}>Remove</button>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-2 rounded-xl border border-hairline/40 bg-card p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="text-[13px] font-medium text-ink">{draft.id ? "Edit provider" : "Add a provider"}</div>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded-full border border-hairline/50 px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink"
              onClick={() => setDraft((current) => ({ ...current, name: current.name || preset.name, url: preset.url }))}
            >{preset.name}</button>
          ))}
        </div>
        <label className="text-[12px] text-ink-secondary">
          Name
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
        </label>
        <label className="text-[12px] text-ink-secondary">
          Base URL
          <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://api.example.com/v1" className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
        </label>
        <label className="text-[12px] text-ink-secondary">
          API key {draft.id ? "(leave blank to keep the saved key)" : ""}
          <input type="password" value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} autoComplete="off" className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
        </label>
        <label className="text-[12px] text-ink-secondary">
          Models (optional, one per line — or fetch them)
          <textarea value={draft.models} onChange={(event) => setDraft({ ...draft, models: event.target.value })} rows={3} className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" checked={draft.vision} onChange={(event) => setDraft({ ...draft, vision: event.target.checked })} />
          Vision — this provider’s models can read images
        </label>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink disabled:opacity-60">{draft.id ? "Save" : "Add provider"}</button>
          {draft.id && <button type="button" className="rounded-lg px-3 py-1.5 text-[13px] text-ink-secondary hover:bg-raised" onClick={() => setDraft(emptyDraft())}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
