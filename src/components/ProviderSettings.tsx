// Add, edit, and remove OpenAI-compatible providers. One button adds a blank
// entry; the person names it and fills in a base URL, API key, and models.
import { useEffect, useState } from "react";
import { api, useStore } from "@/state/store";
import type { ProviderSummary } from "../../shared/providers";

interface ProviderDraft {
  localId: string;
  id?: string;
  name: string;
  url: string;
  key: string;
  models: string;
  vision: boolean;
}

let nextDraft = 0;
function blankDraft(): ProviderDraft {
  nextDraft += 1;
  return { localId: `new-${nextDraft}`, name: "", url: "", key: "", models: "", vision: false };
}

function ProviderForm({
  draft,
  busy,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ProviderDraft;
  busy: boolean;
  error: string;
  onChange: (draft: ProviderDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-hairline/40 bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="text-[13px] font-medium text-ink">{draft.id ? "Edit provider" : "New provider"}</div>
      <label className="text-[12px] text-ink-secondary">
        Name
        <input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="DeepSeek" className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
      </label>
      <label className="text-[12px] text-ink-secondary">
        Base URL
        <input value={draft.url} onChange={(event) => onChange({ ...draft, url: event.target.value })} placeholder="https://api.example.com/v1" className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
      </label>
      <label className="text-[12px] text-ink-secondary">
        API key {draft.id ? "(leave blank to keep the saved key)" : ""}
        <input type="password" value={draft.key} onChange={(event) => onChange({ ...draft, key: event.target.value })} autoComplete="off" className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
      </label>
      <label className="text-[12px] text-ink-secondary">
        Models (optional, one per line — or fetch them)
        <textarea value={draft.models} onChange={(event) => onChange({ ...draft, models: event.target.value })} rows={3} className="mt-1 w-full rounded-md border border-hairline/40 bg-inset px-2 py-1.5 text-[13px] text-ink" />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input type="checkbox" checked={draft.vision} onChange={(event) => onChange({ ...draft, vision: event.target.checked })} />
        Vision — this provider’s models can read images
      </label>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink disabled:opacity-60">Save</button>
        <button type="button" className="rounded-lg px-3 py-1.5 text-[13px] text-ink-secondary hover:bg-raised" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function ProviderSettings() {
  const { refreshInstances } = useStore();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [drafts, setDrafts] = useState<ProviderDraft[]>([]);
  const [editing, setEditing] = useState<ProviderDraft | null>(null);
  const [error, setError] = useState("");
  const [errorOn, setErrorOn] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    const body = await api<{ providers: ProviderSummary[] }>("/api/providers");
    setProviders(body.providers);
  };

  useEffect(() => {
    void load().catch((cause) => {
      setErrorOn("");
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }, []);

  const save = async (draft: ProviderDraft) => {
    setBusyId(draft.localId);
    setError("");
    setErrorOn("");
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
        setEditing(null);
      } else {
        await api("/api/providers", { method: "POST", body: JSON.stringify(payload) });
        setDrafts((current) => current.filter((entry) => entry.localId !== draft.localId));
      }
      await load();
      await refreshInstances();
    } catch (cause) {
      setErrorOn(draft.localId);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyId("");
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    setError("");
    setErrorOn("");
    try {
      await api(`/api/providers/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (editing?.id === id) setEditing(null);
      await load();
      await refreshInstances();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyId("");
    }
  };

  const fetchModels = async (id: string) => {
    setBusyId(id);
    setError("");
    setErrorOn("");
    try {
      await api(`/api/instances/${encodeURIComponent(id)}/refresh-models`, { method: "POST", body: "{}" });
      await refreshInstances();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyId("");
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

      <div>
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink"
          onClick={() => setDrafts((current) => [...current, blankDraft()])}
        >Add OpenAI-compatible provider</button>
      </div>

      {providers.length === 0 && drafts.length === 0 && (
        <p className="rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink-secondary">
          No providers yet. Add one to start chatting.
        </p>
      )}

      {drafts.map((draft) => (
        <ProviderForm
          key={draft.localId}
          draft={draft}
          busy={busyId === draft.localId}
          error={errorOn === draft.localId ? error : ""}
          onChange={(next) => setDrafts((current) => current.map((entry) => entry.localId === next.localId ? next : entry))}
          onSave={() => void save(draft)}
          onCancel={() => setDrafts((current) => current.filter((entry) => entry.localId !== draft.localId))}
        />
      ))}

      {error && !errorOn && <p className="text-[12.5px] text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {providers.map((provider) => {
          if (editing && editing.id === provider.id) {
            const draft = editing;
            return (
            <li key={provider.id}>
              <ProviderForm
                draft={draft}
                busy={busyId === draft.localId}
                error={errorOn === draft.localId ? error : ""}
                onChange={setEditing}
                onSave={() => void save(draft)}
                onCancel={() => setEditing(null)}
              />
            </li>
            );
          }
          return (
            <li key={provider.id} className="flex items-center gap-2 rounded-xl border border-hairline/40 bg-card px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-ink">{provider.name}</div>
                <div className="truncate text-[12px] text-ink-secondary">{provider.url}</div>
              </div>
              <button type="button" className="rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink" onClick={() => void fetchModels(provider.id)}>Fetch models</button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink"
                onClick={() => setEditing({
                  localId: provider.id,
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
          );
        })}
      </ul>
    </div>
  );
}
