// First run with no OpenAI-compatible provider. The chat stays hidden until
// one endpoint can answer.
import { useState } from "react";
import { useStore } from "@/state/store";
import { ProvidersSettings } from "./ProvidersSettings";

export function NoEngines() {
  const { refreshInstances } = useStore();
  const remoteClient = window.ogb?.remoteClient?.active === true;
  const [rechecking, setRechecking] = useState(false);
  const recheck = async () => {
    setRechecking(true);
    try {
      await refreshInstances();
    } finally {
      setRechecking(false);
    }
  };

  if (remoteClient) {
    return (
      <main className="flex h-full min-w-0 flex-1 items-center justify-center bg-app px-6">
        <div className="max-w-[520px] rounded-2xl border border-hairline/40 bg-card p-6 text-center">
          <h1 className="text-[20px] font-semibold text-ink">The host needs a provider</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
            Add an OpenAI-compatible provider in ASLBot on the host computer, then return here.
          </p>
          <button onClick={() => void recheck()} disabled={rechecking} className="mt-5 rounded-lg bg-raised px-3 py-2 text-[13px] text-ink hover:bg-raised-hover disabled:opacity-60">
            {rechecking ? "Checking…" : "Check again"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-app">
      <div className="mx-auto w-full max-w-[560px] px-6 py-12">
        <h1 className="text-[20px] font-semibold text-ink">Add a provider</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary">
          ASLBot talks to OpenAI-compatible endpoints. Add one to start chatting.
        </p>
        <div className="mt-6">
          <ProvidersSettings />
        </div>
      </div>
    </main>
  );
}
