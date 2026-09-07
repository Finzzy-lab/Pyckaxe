import React, { useState } from "react";
import { useRuntime } from "../RuntimeContext.jsx";
import ConsoleTab from "../components/ConsoleTab.jsx";
import FilesTab from "../components/FilesTab.jsx";
import PluginsTab from "../components/PluginsTab.jsx";
import PlayersTab from "../components/PlayersTab.jsx";
import SettingsTab from "../components/SettingsTab.jsx";

const TABS = ["Konsol", "Oyuncular", "Dosyalar", "Pluginler", "Ayarlar"];

export default function ServerDetailScreen({ server, onChanged, onDelete }) {
  const { runningMap, startServer, stopServer } = useRuntime();
  const [tab, setTab] = useState("Konsol");
  const [busy, setBusy] = useState(false);
  const running = !!runningMap[server.id];

  const start = async () => {
    setBusy(true);
    try {
      await startServer(server);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await stopServer(server.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="px-8 pt-6 pb-4 border-b border-base-600 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-stone-200">{server.name}</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {server.mcVersion ? `Paper ${server.mcVersion}${server.paperBuild ? `.${server.paperBuild}` : ""}` : "Sürüm belirtilmemiş"}
            {" · "}
            {server.ramGb}GB RAM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={busy || running}
            onClick={start}
            className={`px-4 py-2 rounded-lg disabled:opacity-40 text-sm font-medium transition-colors ${
              running ? "bg-base-600 text-stone-400" : "bg-moss-500 hover:bg-moss-400 text-base-900"
            }`}
          >
            Başlat
          </button>
          <button
            disabled={busy || !running}
            onClick={stop}
            className={`px-4 py-2 rounded-lg disabled:opacity-40 text-sm font-medium transition-colors ${
              running ? "bg-rust-400 hover:bg-rust-500 text-base-900" : "bg-base-600 text-stone-400"
            }`}
          >
            Durdur
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 rounded-lg hover:bg-rust-400/10 text-rust-400 text-sm font-medium transition-colors"
          >
            Sil
          </button>
        </div>
      </header>

      <nav className="px-8 flex gap-1 border-b border-base-600">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-copper-500 text-stone-200" : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        {tab === "Konsol" && <ConsoleTab server={server} running={running} />}
        {tab === "Oyuncular" && <PlayersTab server={server} running={running} />}
        {tab === "Dosyalar" && <FilesTab server={server} />}
        {tab === "Pluginler" && <PluginsTab server={server} onChanged={onChanged} />}
        {tab === "Ayarlar" && <SettingsTab server={server} onChanged={onChanged} />}
      </div>
    </div>
  );
}
