// The right-hand panels for one bot: settings (name, instructions, model,
// notifications) and that bot's routines. Computer use is not part of ASLBot.
import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ModelPicker } from "./ModelPicker";
import { RoutinesSection } from "./bot-settings/RoutinesSection";
import { useStore, type Bot } from "@/state/store";

function Panel({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="animate-panel-in absolute inset-0 z-40 flex h-full min-w-0 flex-col border-l border-hairline/40 bg-panel outline-none lg:static lg:z-auto lg:w-[min(380px,42vw)] lg:shrink-0"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="truncate text-[15px] font-semibold text-ink">{title}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-ink-secondary hover:bg-raised hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-ink">
      <span className="text-[12px] font-medium text-ink-secondary">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent/60";

export function SimpleBotPanel({ bot }: { bot: Bot }) {
  const { dispatch } = useStore();
  const [name, setName] = useState(bot.name);
  const [label, setLabel] = useState(bot.title);
  const [instructions, setInstructions] = useState(bot.soul ?? bot.description);
  useEffect(() => {
    setName(bot.name);
    setLabel(bot.title);
    setInstructions(bot.soul ?? bot.description);
  }, [bot.id, bot.name, bot.title, bot.soul, bot.description]);

  const commit = (patch: { name?: string; title?: string; description?: string; soul?: string; notifications?: boolean }) => {
    dispatch({ type: "updateBot", botId: bot.id, patch });
  };

  return (
    <Panel title="Settings" onClose={() => dispatch({ type: "toggleSettings", open: false })}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} onBlur={() => name.trim() && name !== bot.name && commit({ name: name.trim() })} />
        </Field>
        <Field label="Label (optional)">
          <input className={inputClass} value={label} onChange={(event) => setLabel(event.target.value)} onBlur={() => label !== bot.title && commit({ title: label.trim() })} />
        </Field>
        <Field label="Description">
          <textarea className={`${inputClass} min-h-28 resize-y`} value={instructions} onChange={(event) => setInstructions(event.target.value)} onBlur={() => instructions !== (bot.soul ?? "") && commit({ soul: instructions, description: instructions })} />
        </Field>
        <div className="rounded-xl border border-hairline/40 bg-card p-3">
          <ModelPicker bot={bot} contained onlyDriver="openai-compat" label={<span className="text-[13px] font-medium text-ink">Provider and model</span>} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-hairline/40 bg-card px-3 py-2.5">
          <div>
            <div className="text-[13px] font-medium text-ink">Notifications</div>
            <div className="text-[12px] text-ink-secondary">Get notified when this bot finishes or needs input.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={bot.notifications}
            onClick={() => commit({ notifications: !bot.notifications })}
            className={`relative h-6 w-11 rounded-full transition-colors ${bot.notifications ? "bg-accent" : "bg-inset"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${bot.notifications ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      </div>
    </Panel>
  );
}

export function SimpleRoutinesPanel({ bot }: { bot: Bot }) {
  const { state, dispatch } = useStore();
  const routines = state.routines
    .filter((routine) => routine.botId === bot.id)
    .sort((a, b) => Number(b.enabled) - Number(a.enabled) || (a.nextRunAt ?? Infinity) - (b.nextRunAt ?? Infinity));
  return (
    <Panel title="Routines" onClose={() => dispatch({ type: "toggleSettings", open: false })}>
      <RoutinesSection bot={bot} routines={routines} runs={state.routineRuns} defaultRunOn="jlf" />
    </Panel>
  );
}
