import React, { useEffect, useState } from "react";

const KNOWN_KEYS = [
  { key: "server-port", label: "Sunucu portu" },
  { key: "max-players", label: "Maksimum oyuncu" },
  { key: "motd", label: "MOTD (sunucu açıklaması)" },
  { key: "difficulty", label: "Zorluk" },
  { key: "gamemode", label: "Oyun modu" },
  { key: "pvp", label: "PVP açık mı (true/false)" },
  { key: "online-mode", label: "Online mode (true/false)" }
];

function parseProperties(text) {
  const map = {};
  text.split("\n").forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    map[line.slice(0, idx)] = line.slice(idx + 1);
  });
  return map;
}

function serializeProperties(original, updates) {
  const lines = original.split("\n");
  const seen = new Set();
  const newLines = lines.map((line) => {
    const idx = line.indexOf("=");
    if (idx === -1 || line.startsWith("#")) return line;
    const key = line.slice(0, idx);
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (!seen.has(key)) newLines.push(`${key}=${value}`);
  });
  return newLines.join("\n");
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsTab({ server, onChanged }) {
  const [raw, setRaw] = useState(null);
  const [values, setValues] = useState({});
  const [ramGb, setRamGb] = useState(server.ramGb);
  const [mcVersion, setMcVersion] = useState(server.mcVersion || "");
  const [versions, setVersions] = useState([]);
  const [saved, setSaved] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState("");
  const propsPath = `${server.path}/server.properties`;

  useEffect(() => {
    window.api.fs
      .readFile(propsPath)
      .then((text) => {
        setRaw(text);
        setValues(parseProperties(text));
      })
      .catch(() => setRaw(""));
  }, [propsPath]);

  useEffect(() => {
    window.api.paper.versions().then(setVersions).catch(() => {});
    refreshBackups();
  }, [server.path]);

  const refreshBackups = () => {
    window.api.backup.list({ folderPath: server.path }).then(setBackups).catch(() => {});
  };

  const save = async () => {
    if (raw !== null && raw !== "") {
      const updated = serializeProperties(raw, values);
      await window.api.fs.writeFile(propsPath, updated);
      setRaw(updated);
    }
    const patch = {};
    if (ramGb !== server.ramGb) patch.ramGb = ramGb;
    if (mcVersion !== (server.mcVersion || "")) patch.mcVersion = mcVersion || null;
    if (Object.keys(patch).length > 0) {
      await window.api.servers.update(server.id, patch);
      onChanged();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const runBackup = async () => {
    setBackingUp(true);
    setBackupError("");
    try {
      await window.api.backup.create({ folderPath: server.path });
      refreshBackups();
    } catch (e) {
      setBackupError(e.message || "Yedekleme sırasında bir hata oluştu.");
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-6 max-w-lg space-y-8">
      <div className="space-y-6">
        <div>
          <label className="text-sm text-stone-300 block mb-1.5">
            RAM ayırımı: <span className="text-copper-400 font-medium">{ramGb} GB</span>
          </label>
          <input
            type="range"
            min="1"
            max="16"
            value={ramGb}
            onChange={(e) => setRamGb(Number(e.target.value))}
            className="w-full accent-copper-500"
          />
          <p className="text-xs text-stone-400 mt-1">Değişiklik bir sonraki başlatmada geçerli olur.</p>
        </div>

        <div>
          <label className="text-sm text-stone-300 block mb-1.5">Minecraft sürümü</label>
          <select
            value={mcVersion}
            onChange={(e) => setMcVersion(e.target.value)}
            className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500"
          >
            <option value="">Belirtilmemiş</option>
            {versions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-400 mt-1">Hangar'daki plugin uyumluluk filtresi için kullanılır.</p>
        </div>

        {raw === "" && (
          <p className="text-sm text-stone-400">
            server.properties henüz oluşmamış — sunucuyu bir kere başlatıp durdurunca burada düzenleyebilirsin.
          </p>
        )}

        {raw && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-stone-200">server.properties</h3>
            {KNOWN_KEYS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-stone-400 block mb-1">{label}</label>
                <input
                  value={values[key] ?? ""}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={save}
          className="px-4 py-2 rounded-lg bg-copper-500 hover:bg-copper-400 text-base-900 text-sm font-medium"
        >
          {saved ? "Kaydedildi ✓" : "Kaydet"}
        </button>
      </div>

      <div className="border-t border-base-600 pt-6">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-medium text-stone-200">Yedekler</h3>
          <button
            onClick={runBackup}
            disabled={backingUp}
            className="px-3 py-1.5 rounded-lg bg-base-600 hover:bg-base-500 disabled:opacity-50 text-xs font-medium"
          >
            {backingUp ? "Yedekleniyor…" : "Şimdi yedekle"}
          </button>
        </div>
        <p className="text-xs text-stone-400 mb-3">
          World klasörlerini ve ayar dosyalarını sunucu klasöründeki backups/ altına zip'ler.
        </p>

        {backupError && <p className="text-xs text-rust-400 mb-2">{backupError}</p>}

        {backups.length === 0 ? (
          <p className="text-sm text-stone-400">Henüz yedek yok.</p>
        ) : (
          <ul className="space-y-1.5">
            {backups.map((b) => (
              <li
                key={b.fileName}
                className="flex items-center justify-between bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-stone-300">{b.fileName}</span>
                <span className="text-stone-400">
                  {formatSize(b.sizeBytes)} · {new Date(b.createdAt).toLocaleString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
