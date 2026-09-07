import React, { useEffect, useState, useCallback } from "react";
import { RuntimeProvider, useRuntime } from "./RuntimeContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import WelcomeScreen from "./screens/WelcomeScreen.jsx";
import ServerDetailScreen from "./screens/ServerDetailScreen.jsx";
import NewServerWizard from "./screens/NewServerWizard.jsx";
import ImportServerScreen from "./screens/ImportServerScreen.jsx";

function AppInner() {
  const { forgetServer } = useRuntime();
  const [servers, setServers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState(null); // null | "wizard" | "import"
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await window.api.servers.list();
    setServers(list);
    return list;
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const selectedServer = servers.find((s) => s.id === selectedId) || null;

  const handleServerCreated = async (server) => {
    await refresh();
    setSelectedId(server.id);
    setMode(null);
  };

  const handleDelete = async (id) => {
    await window.api.servers.remove(id);
    forgetServer(id);
    if (selectedId === id) setSelectedId(null);
    refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        servers={servers}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setMode(null);
        }}
        onNewServer={() => {
          setMode("wizard");
          setSelectedId(null);
        }}
        onImportServer={() => {
          setMode("import");
          setSelectedId(null);
        }}
      />

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-stone-400">Yükleniyor…</div>
        ) : mode === "wizard" ? (
          <NewServerWizard onCancel={() => setMode(null)} onCreated={handleServerCreated} />
        ) : mode === "import" ? (
          <ImportServerScreen onCancel={() => setMode(null)} onCreated={handleServerCreated} />
        ) : selectedServer ? (
          <ServerDetailScreen
            server={selectedServer}
            onChanged={refresh}
            onDelete={() => handleDelete(selectedServer.id)}
          />
        ) : (
          <WelcomeScreen
            onNewServer={() => setMode("wizard")}
            onImportServer={() => setMode("import")}
            hasServers={servers.length > 0}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RuntimeProvider>
      <AppInner />
    </RuntimeProvider>
  );
}
