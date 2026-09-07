import React from "react";
import Logo from "./Logo.jsx";
import { useRuntime } from "../RuntimeContext.jsx";

export default function Sidebar({ servers, selectedId, onSelect, onNewServer, onImportServer }) {
  const { runningMap } = useRuntime();

  return (
    <aside className="w-64 shrink-0 bg-base-800 border-r border-base-600 flex flex-col">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <div>
            <h1 className="font-display font-semibold text-lg tracking-tight text-stone-200 leading-tight">
              Pyckaxe
            </h1>
            <p className="text-xs text-stone-400 leading-tight">Paper sunucuları &amp; pluginler</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {servers.map((s) => {
          const running = !!runningMap[s.id];
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                selectedId === s.id ? "bg-base-600 text-stone-200" : "text-stone-300 hover:bg-base-700"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${running ? "bg-moss-500" : "bg-base-500"}`}
                title={running ? "Çalışıyor" : "Kapalı"}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{s.name}</div>
                <div className="text-xs text-stone-400 truncate">{s.mcVersion || "Sürüm bilinmiyor"}</div>
              </div>
            </button>
          );
        })}

        {servers.length === 0 && (
          <p className="text-xs text-stone-400 px-3 py-4 leading-relaxed">
            Henüz sunucun yok. Aşağıdaki butonla ilkini kur ya da var olan bir sunucuyu içe aktar.
          </p>
        )}
      </div>

      <div className="p-3 border-t border-base-600 space-y-1.5">
        <button
          onClick={onNewServer}
          className="w-full py-2.5 rounded-lg bg-copper-500 hover:bg-copper-400 text-base-900 text-sm font-medium transition-colors"
        >
          + Yeni sunucu
        </button>
        <button
          onClick={onImportServer}
          className="w-full py-2 rounded-lg hover:bg-base-700 text-stone-300 text-xs font-medium transition-colors"
        >
          Var olan sunucuyu içe aktar
        </button>
      </div>
    </aside>
  );
}
