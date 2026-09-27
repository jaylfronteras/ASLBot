import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ModelPicker } from "@/components/ModelPicker";
import { useStore, type Bot } from "@/state/store";
import { closeSidePanel, useSidePanel } from "@/lib/side-panel";

export function BotSidePanel({ bot }: { bot: Bot }) {
  const panel = useSidePanel();
  const { state, dispatch } = useStore();
  const [name, setName] = useState(bot.name);
  const [label, setLabel] = useState(bot.title ?? "");
  const [description, setDescription] = useState(bot.soul || bot.description || "");

  useEffect(() => {
    setName(bot.name);
    setLabel(bot.title ?? "");
    setDescription(bot.soul || bot.description || "");
  }, [bot.id, bot.name, bot.title, bot.description, bot.soul]);

  if (!panel) return null;
  const routines = state.routines.filter((routine) => routine.botId === bot.id);

  const saveProfile = () => {
    const nextName = name.trim();
    if (!nextName) return;
    dispatch({
      type: "updateBot",
      botId: bot.id,
      patch: {
        name: nextName,
        title: label.trim(),
        description: description.trim(),
        soul: description,
      },
    });
  };

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-hairline/40 bg-panel" aria-label={panel === "settings" ? "Bot settings" : "Routines"}>
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{panel === "settings" ? "Settings" : "Routines"}</h2>
        <button type="button" aria-label="Close panel" onClick={closeSidePanel} className="rounded-md p-1 text-ink-secondary hover:bg-raised hover:text-ink">
          <X size={16} />
        </button>
      </div>
      {panel === "settings" ? (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/20 text-[22px] font-semibold text-accent">
            {bot.name.slice(0, 1).toUpperCase()}
          </div>
          <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} onBlur={saveProfile} aria-label="Bot name" className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
            Label (optional)
            <input value={label} onChange={(event) => setLabel(event.target.value)} onBlur={saveProfile} aria-label="Bot label" className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-secondary">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} onBlur={saveProfile} aria-label="Bot description" rows={5} className="rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 text-[13px] text-ink" />
          </label>
          <div className="text-[12px] text-ink-secondary">
            Provider and model
            <div className="mt-1">
              <ModelPicker bot={bot} contained />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 text-[13px] text-ink">
            Notifications
            <input
              type="checkbox"
              aria-label="Notifications"
              checked={bot.notifications}
              onChange={(event) => dispatch({ type: "updateBot", botId: bot.id, patch: { notifications: event.target.checked } })}
            />
          </label>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {routines.length === 0 && <li className="px-1 py-2 text-[13px] text-ink-secondary">No routines for this bot yet.</li>}
          {routines.map((routine) => (
            <li key={routine.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-raised/60">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-ink">{routine.name}</div>
                <div className="truncate text-[11.5px] text-ink-secondary">{routine.enabled ? "On" : "Paused"}</div>
              </div>
              <input
                type="checkbox"
                aria-label={`${routine.enabled ? "Pause" : "Resume"} ${routine.name}`}
                checked={routine.enabled}
                onChange={(event) => dispatch({ type: "updateRoutine", routineId: routine.id, patch: { enabled: event.target.checked } })}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
