import React, { useEffect, useState } from "react";
import { useRuntime } from "../RuntimeContext.jsx";

function avatarUrl(name, size) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;
}

export default function PlayersTab({ server, running }) {
  const { players, sendCommand } = useRuntime();
  const online = players[server.id] || [];
  const [ops, setOps] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadOps = async () => {
    try {
      const raw = await window.api.fs.readFile(`${server.path}/ops.json`);
      const parsed = JSON.parse(raw);
      setOps(parsed.map((o) => o.name));
    } catch {
      setOps([]);
    }
  };

  useEffect(() => {
    loadOps();
  }, [server.path]);

  const isOp = (name) => ops.includes(name);

  const toggleOp = (name) => {
    sendCommand(server.id, isOp(name) ? `deop ${name}` : `op ${name}`);
    setOps((prev) => (isOp(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    setTimeout(loadOps, 800);
  };

  const kick = (name) => {
    sendCommand(server.id, `kick ${name}`);
  };

  const ban = (name) => {
    sendCommand(server.id, `ban ${name}`);
    setSelected(null);
  };

  if (!running) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-stone-400 px-8 text-center">
        Sunucu kapalıyken oyuncu listesi görünmez. Başlat'a basıp oyuncular katıldıkça burada listelenecekler.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-stone-200">
          Çevrimiçi <span className="text-stone-400">({online.length})</span>
        </h3>
        <button onClick={loadOps} className="text-xs text-copper-400 hover:text-copper-300">
          Yetkileri yenile
        </button>
      </div>

      {online.length === 0 ? (
        <p className="text-sm text-stone-400">
          Şu an kimse yok. Biri katıldığında (veya ayrıldığında) liste otomatik güncellenir.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {online.map((name) => (
            <li key={name}>
              <button
                onClick={() => setSelected(name)}
                className="w-full flex items-center gap-3 bg-base-700 hover:bg-base-600 border border-base-600 rounded-lg px-3 py-2.5 transition-colors text-left"
              >
                <img src={avatarUrl(name, 32)} alt="" className="w-8 h-8 rounded-md shrink-0" />
                <span className="text-sm text-stone-200 truncate flex-1">{name}</span>
                {isOp(name) && (
                  <span className="text-[10px] uppercase tracking-wide text-copper-400 font-medium shrink-0">
                    OP
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-base-900/70 flex items-center justify-center z-10"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-base-700 border border-base-600 rounded-xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <img src={avatarUrl(selected, 72)} alt="" className="w-18 h-18 rounded-lg mb-3" />
              <h4 className="text-base font-medium text-stone-200">{selected}</h4>
              {isOp(selected) && <span className="text-xs text-copper-400 mt-0.5">Operatör</span>}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => toggleOp(selected)}
                className="w-full py-2 rounded-lg bg-base-600 hover:bg-base-500 text-sm font-medium"
              >
                {isOp(selected) ? "Yetkiyi kaldır (deop)" : "Yetki ver (op)"}
              </button>
              <button
                onClick={() => {
                  kick(selected);
                  setSelected(null);
                }}
                className="w-full py-2 rounded-lg bg-copper-500/20 hover:bg-copper-500/30 text-copper-400 text-sm font-medium"
              >
                Sunucudan at (kick)
              </button>
              <button
                onClick={() => ban(selected)}
                className="w-full py-2 rounded-lg bg-rust-400/20 hover:bg-rust-400/30 text-rust-400 text-sm font-medium"
              >
                Yasakla (ban)
              </button>
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2 rounded-lg text-stone-400 hover:text-stone-200 text-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
