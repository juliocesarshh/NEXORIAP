const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = path.join(__dirname, "pokelite");
const rooms = new Map();

function idSalaLivre() {
  for (let i = 0; i < 10000; i++) {
    const id = String(crypto.randomInt(0, 10000)).padStart(4, "0");
    if (!rooms.has(id)) return id;
  }
  throw new Error("Não há IDs de sala disponíveis.");
}

function enviar(socket, mensagem) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(mensagem));
}

function erro(socket, mensagem) {
  enviar(socket, { tipo: "room-error", mensagem });
}

function removerJogador(socket) {
  const id = socket.salaId;
  if (!id) return;

  const sala = rooms.get(id);
  socket.salaId = null;
  socket.papel = null;
  if (!sala) return;

  if (sala.host === socket) sala.host = null;
  if (sala.guest === socket) sala.guest = null;

  const outro = sala.host || sala.guest;
  if (outro) enviar(outro, { tipo: "opponent-left" });

  if (!sala.host && !sala.guest) rooms.delete(id);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.resolve(ROOT, "." + requested);

  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".mp3": "audio/mpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (socket) => {
  socket.salaId = null;
  socket.papel = null;

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return erro(socket, "Mensagem inválida.");
    }

    if (msg.tipo === "create-room") {
      removerJogador(socket);

      const nivel = Math.max(1, Math.min(105, Number(msg.nivel) || 10));
      const tamanho = Math.max(1, Math.min(6, Number(msg.tamanho) || 1));
      const id = idSalaLivre();

      rooms.set(id, {
        id,
        nivel,
        tamanho,
        host: socket,
        guest: null,
        hostTeam: null,
        guestTeam: null,
      });

      socket.salaId = id;
      socket.papel = "host";
      return enviar(socket, { tipo: "room-created", id, nivel, tamanho });
    }

    if (msg.tipo === "join-room") {
      removerJogador(socket);
      const id = String(msg.id || "");
      const sala = rooms.get(id);

      if (!/^\d{4}$/.test(id) || !sala) return erro(socket, "Sala não encontrada.");
      if (sala.guest) return erro(socket, "Essa sala já está cheia.");

      sala.guest = socket;
      socket.salaId = id;
      socket.papel = "guest";

      enviar(socket, { tipo: "room-joined", id, nivel: sala.nivel, tamanho: sala.tamanho });
      enviar(sala.host, { tipo: "room-ready", nivel: sala.nivel, tamanho: sala.tamanho });
      return enviar(socket, { tipo: "room-ready", nivel: sala.nivel, tamanho: sala.tamanho });
    }

    if (msg.tipo === "leave-room") {
      removerJogador(socket);
      return;
    }

    const sala = socket.salaId ? rooms.get(socket.salaId) : null;
    if (!sala) return erro(socket, "Você não está em uma sala.");

    if (msg.tipo === "team-ready") {
      if (!Array.isArray(msg.time) || msg.time.length !== sala.tamanho) {
        return erro(socket, `O time precisa ter exatamente ${sala.tamanho} monstro(s).`);
      }

      if (socket.papel === "host") sala.hostTeam = msg.time;
      if (socket.papel === "guest") sala.guestTeam = msg.time;

      const outro = socket.papel === "host" ? sala.guest : sala.host;
      if (outro) enviar(outro, { tipo: "player-status", ready: true });

      if (sala.hostTeam && sala.guestTeam) {
        enviar(sala.host, {
          tipo: "battle-start",
          hostTeam: sala.hostTeam,
          guestTeam: sala.guestTeam,
        });
        enviar(sala.guest, {
          tipo: "battle-start",
          hostTeam: sala.hostTeam,
          guestTeam: sala.guestTeam,
        });
      }
      return;
    }

    if (msg.tipo === "battle-action") {
      if (socket.papel !== "guest") return;
      return enviar(sala.host, { tipo: "remote-action", acao: msg.acao });
    }

    if (msg.tipo === "battle-state") {
      if (socket.papel !== "host") return;
      return enviar(sala.guest, { tipo: "battle-state", estado: msg.estado });
    }
  });

  socket.on("close", () => removerJogador(socket));
});

server.listen(PORT, () => {
  console.log(`NEXORIA multiplayer em http://localhost:${PORT}`);
});
