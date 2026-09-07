import React, { createContext, useContext, useEffect, useState } from "react";

const RuntimeContext = createContext(null);

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const JOIN_RE = /:\s*([A-Za-z0-9_]{2,16}) joined the game\s*$/;
const LEAVE_RE = /:\s*([A-Za-z0-9_]{2,16}) left the game\s*$/;
const LOST_RE = /:\s*([A-Za-z0-9_]{2,16}) lost connection:/;

/**
 * Log akışı ve oyuncu listesi burada, App kökünde, TEK bir yerde tutulur ve
 * TEK bir process:log/process:exit dinleyicisiyle güncellenir. Önceki
 * tasarımda her ConsoleTab kendi dinleyicisini kaydediyordu ve tab
 * değişince (bileşen unmount/remount olunca) hem eski state kayboluyordu
 * hem de temizlenmeyen dinleyiciler birikip aynı satırın birden çok kez
 * görünmesine yol açıyordu. Artık state burada, App her zaman mount'ta
 * kaldığı için tab/sunucu değişse de kaybolmuyor.
 */
export function RuntimeProvider({ children }) {
  const [logs, setLogs] = useState({});
  const [players, setPlayers] = useState({});
  const [runningMap, setRunningMap] = useState({});

  useEffect(() => {
    let cancelled = false;

    window.api.servers.list().then(async (list) => {
      const entries = await Promise.all(
        list.map(async (s) => [s.id, await window.api.process.status({ id: s.id })])
      );
      if (!cancelled) setRunningMap(Object.fromEntries(entries));
    });

    const unsubLog = window.api.process.onLog(({ id, data }) => {
      const clean = data.replace(ANSI_RE, "");
      const newLines = clean.split("\n").filter(Boolean);
      if (newLines.length === 0) return;

      setLogs((prev) => ({ ...prev, [id]: [...(prev[id] || []), ...newLines].slice(-2000) }));

      const joins = [];
      const leaves = [];
      for (const line of newLines) {
        const j = line.match(JOIN_RE);
        if (j) joins.push(j[1]);
        const l = line.match(LEAVE_RE) || line.match(LOST_RE);
        if (l) leaves.push(l[1]);
      }
      if (joins.length || leaves.length) {
        setPlayers((prev) => {
          const set = new Set(prev[id] || []);
          joins.forEach((n) => set.add(n));
          leaves.forEach((n) => set.delete(n));
          return { ...prev, [id]: Array.from(set).sort((a, b) => a.localeCompare(b)) };
        });
      }
    });

    const unsubExit = window.api.process.onExit(({ id }) => {
      setRunningMap((prev) => ({ ...prev, [id]: false }));
      setPlayers((prev) => ({ ...prev, [id]: [] }));
      setLogs((prev) => ({ ...prev, [id]: [...(prev[id] || []), "— sunucu süreci sonlandı —"] }));
    });

    return () => {
      cancelled = true;
      unsubLog();
      unsubExit();
    };
  }, []);

  const startServer = async (server) => {
    await window.api.process.start({ id: server.id, folderPath: server.path, ramGb: server.ramGb });
    setRunningMap((prev) => ({ ...prev, [server.id]: true }));
    setPlayers((prev) => ({ ...prev, [server.id]: [] }));
  };

  const stopServer = async (id) => {
    await window.api.process.stop({ id });
  };

  const sendCommand = (id, command) => {
    window.api.process.command({ id, command });
    setLogs((prev) => ({ ...prev, [id]: [...(prev[id] || []), `> ${command}`] }));
  };

  const forgetServer = (id) => {
    const drop = (obj) => {
      const { [id]: _omit, ...rest } = obj;
      return rest;
    };
    setLogs(drop);
    setPlayers(drop);
    setRunningMap(drop);
  };

  return (
    <RuntimeContext.Provider
      value={{ logs, players, runningMap, startServer, stopServer, sendCommand, forgetServer }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  return useContext(RuntimeContext);
}
