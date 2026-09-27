import { useEffect, useState } from "react";
import { api, useStore } from "@/state/store";

interface Preset {
  id: string;
  name: string;
  url: string;
}

interface ProviderSummary {
  id: string;
  name: string;
  url: string;
  hasKey: boolean;
  vision: boolean;
  models: string[];
}

const EMPTY = { name: "", url: "", key: "", models: "", vision: false };

export function ProvidersSettings({ onAdded }: { onAdded?: () => void } = {}) {
  const { refreshInstances } = useStore();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const body = await api("/api/providers");
    setPresets(body.presets ?? []);
    setProviders(body.providers ?? []);
  };

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError("");
    const models = draft.models.split(/[\n,]/).map((model) => model.trim()).filter(Boolean);
    const body = {
      name: draft.name.trim(),
      url: draft.url.trim(),
      ...(draft.key.trim() ? { key: draft.key.trim() } : {}),
      ...(models.length ? { models } : {}),
      vision: draft.vision,
    };
    try {
      await api(editing ? `/api/providers/${encodeURIComponent(editing)}` : "/api/providers", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setDraft(EMPTY);
      setEditing(null);
      await load();
      await refreshInstances();
      onAdded?.();
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
      if (editing === id) {
        setEditing(null);
        setDraft(EMPTY);
      }
      await load();
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
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
          Add any OpenAI-compatible endpoint. Each bot picks a provider and model from its settings.
        </p>
      </div>
      {providers.length > 0 && (
        <ul className="flex flex-col gap-2">
          {providers.map((provider) => (
            <li key={provider.id} className="flex items-center gap-2 rounded-lg border border-hairline/40 bg-inset px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{provider.name}</div>
                <div className="truncate text-[11.5px] text-ink-secondary">{provider.url}</div>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink"
                onClick={() => {
                  setEditing(provider.id);
                  setDraft({
                    name: provider.name,
                    url: provider.url,
                    key: "",
                    models: provider.models.join("\n"),
                    vision: provider.vision,
                  });
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[12px] text-danger hover:bg-raised"
                onClick={() => void remove(provider.id)}
                disabled={busy}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="rounded-full border border-hairline/50 px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink"
            onClick={() => setDraft((current) => ({ ...current, name: preset.name, url: preset.url }))}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
        Name
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink"
          aria-label="Provider name"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
        Base URL
        <input
          value={draft.url}
          onChange={(event) => setDraft({ ...draft, url: event.target.value })}
          placeholder="https://api.example.com/v1"
          className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink"
          aria-label="Provider base URL"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
        API key
        <input
          type="password"
          value={draft.key}
          onChange={(event) => setDraft({ ...draft, key: event.target.value })}
          placeholder={editing ? "Leave blank to keep the saved key" : "Required, except for local servers"}
          className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink"
          aria-label="Provider API key"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
        Models (optional, one per line)
        <textarea
          value={draft.models}
          onChange={(event) => setDraft({ ...draft, models: event.target.value })}
          rows={3}
          placeholder="Leave empty to load them from /models"
          className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink"
          aria-label="Provider models"
        />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={draft.vision}
          onChange={(event) => setDraft({ ...draft, vision: event.target.checked })}
        />
        This provider accepts images
      </label>
      {error && <p role="alert" className="text-[12.5px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !draft.name.trim() || !draft.url.trim()}
          onClick={() => void submit()}
          className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink disabled:opacity-50"
        >
          {editing ? "Save provider" : "Add provider"}
        </button>
        {editing && (
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-[13px] text-ink-secondary hover:bg-raised"
            onClick={() => { setEditing(null); setDraft(EMPTY); }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
