import React, { useEffect, useRef, useState } from "react";
import { useRuntime } from "../RuntimeContext.jsx";

export default function ConsoleTab({ server, running }) {
  const { logs, sendCommand } = useRuntime();
  const lines = logs[server.id] || [];
  const [command, setCommand] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    sendCommand(server.id, command);
    setCommand("");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-4 font-mono text-xs leading-relaxed text-stone-300 bg-base-900">
        {lines.length === 0 && (
          <p className="text-stone-400">
            {running ? "Sunucu çalışıyor, çıktı bekleniyor…" : "Sunucu kapalı. Başlat'a basarak konsolu görebilirsin."}
          </p>
        )}
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="border-t border-base-600 px-8 py-3 flex gap-2">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={!running}
          placeholder={running ? "Komut yaz… (örn. say merhaba)" : "Komut göndermek için sunucuyu başlat"}
          className="flex-1 bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-copper-500 disabled:opacity-50"
        />
        <button
          disabled={!running}
          className="px-4 py-2 rounded-lg bg-base-600 hover:bg-base-500 disabled:opacity-40 text-sm font-medium"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
