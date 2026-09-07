import React, { useEffect, useState } from "react";

const EDITABLE_EXT = [".txt", ".yml", ".yaml", ".properties", ".json", ".conf", ".sh", ".bat"];

export default function FilesTab({ server }) {
  const [currentPath, setCurrentPath] = useState(server.path);
  const [entries, setEntries] = useState([]);
  const [openFile, setOpenFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [dirty, setDirty] = useState(false);

  const load = async (dirPath) => {
    const list = await window.api.fs.list(dirPath);
    setEntries(list);
    setCurrentPath(dirPath);
    setOpenFile(null);
  };

  useEffect(() => {
    load(server.path);
  }, [server.path]);

  const goUp = () => {
    const parent = currentPath.split(/[\\/]/).slice(0, -1).join("/") || "/";
    if (parent.length >= server.path.length - 1) load(parent);
  };

  const openEntry = async (entry) => {
    if (entry.isDirectory) {
      load(entry.path);
      return;
    }
    const isEditable = EDITABLE_EXT.some((ext) => entry.name.toLowerCase().endsWith(ext));
    if (!isEditable) {
      window.api.fs.openInExplorer(entry.path);
      return;
    }
    const content = await window.api.fs.readFile(entry.path);
    setOpenFile(entry);
    setFileContent(content);
    setDirty(false);
  };

  const save = async () => {
    await window.api.fs.writeFile(openFile.path, fileContent);
    setDirty(false);
  };

  const relPath = currentPath.replace(server.path, "") || "/";

  return (
    <div className="h-full flex">
      <div className="w-72 border-r border-base-600 overflow-y-auto">
        <div className="px-4 py-3 border-b border-base-600 flex items-center justify-between">
          <span className="text-xs text-stone-400 truncate">{relPath}</span>
          {currentPath !== server.path && (
            <button onClick={goUp} className="text-xs text-copper-400 hover:text-copper-300">
              ↑ Yukarı
            </button>
          )}
        </div>
        <ul>
          {entries.map((e) => (
            <li key={e.path}>
              <button
                onClick={() => openEntry(e)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-base-700 transition-colors flex items-center gap-2 ${
                  openFile?.path === e.path ? "bg-base-700 text-copper-400" : "text-stone-300"
                }`}
              >
                <span>{e.isDirectory ? "📁" : "📄"}</span>
                <span className="truncate">{e.name}</span>
              </button>
            </li>
          ))}
          {entries.length === 0 && <p className="px-4 py-3 text-xs text-stone-400">Klasör boş.</p>}
        </ul>
      </div>

      <div className="flex-1 flex flex-col">
        {openFile ? (
          <>
            <div className="px-6 py-3 border-b border-base-600 flex items-center justify-between">
              <span className="text-sm text-stone-300">{openFile.name}</span>
              <button
                onClick={save}
                disabled={!dirty}
                className="px-3 py-1.5 rounded-lg bg-copper-500 hover:bg-copper-400 disabled:opacity-40 text-base-900 text-xs font-medium"
              >
                Kaydet
              </button>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setDirty(true);
              }}
              spellCheck={false}
              className="flex-1 bg-base-900 text-stone-200 font-mono text-xs p-6 outline-none resize-none"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-stone-400">
            Düzenlemek için soldan bir dosya seç.
          </div>
        )}
      </div>
    </div>
  );
}
