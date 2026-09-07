const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { randomUUID } = require("crypto");

class Store {
  constructor() {
    const userData = app.getPath("userData");
    this.filePath = path.join(userData, "pyckaxe-data.json");
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ servers: [] }, null, 2));
    }
  }

  _read() {
    return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  getServers() {
    return this._read().servers;
  }

  addServer(server) {
    const data = this._read();
    const entry = { id: randomUUID(), plugins: [], ...server };
    data.servers.push(entry);
    this._write(data);
    return entry;
  }

  updateServer(id, patch) {
    const data = this._read();
    const idx = data.servers.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    data.servers[idx] = { ...data.servers[idx], ...patch };
    this._write(data);
    return data.servers[idx];
  }

  removeServer(id) {
    const data = this._read();
    data.servers = data.servers.filter((s) => s.id !== id);
    this._write(data);
    return true;
  }
}

module.exports = Store;
