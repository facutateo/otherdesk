// Dev stand-in for the Rust signaling server (architecture.md). Same message names, in-memory state.
// shortcut: devices identify with a client-chosen key instead of a signed ed25519 challenge, and nothing
// is persisted to Postgres; replace with the Rust server + DB before any public build.
import { WebSocketServer } from "ws";
import { randomInt, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }]; // TURN comes with the real relay

export function startServer(port = 8787) {
  const wss = new WebSocketServer({ port });
  const idByKey = new Map();    // device key -> numeric id (stable across reconnects)
  const online = new Map();     // numeric id -> { ws, name }
  const sessions = new Map();   // session id -> { from, to, status }

  const send = (ws, msg) => ws?.readyState === 1 && ws.send(JSON.stringify(msg));
  const peerOf = (s, id) => (s.from === id ? s.to : s.from);

  function newId() {
    let id;
    do id = String(randomInt(100_000_000, 1_000_000_000)); while ([...idByKey.values()].includes(id));
    return id;
  }

  function end(sid, by, reason) {
    const s = sessions.get(sid);
    if (!s) return;
    sessions.delete(sid);
    send(online.get(peerOf(s, by))?.ws, { t: "ended", session_id: sid, reason });
  }

  wss.on("connection", (ws) => {
    let me = null;
    ws.on("message", (buf) => {
      let m;
      try { m = JSON.parse(buf); } catch { return send(ws, { t: "error", reason: "bad_json" }); }
      if (m.t !== "hello" && !me) return send(ws, { t: "error", reason: "hello_first" });

      switch (m.t) {
        case "hello": {
          if (typeof m.key !== "string" || m.key.length < 16) return send(ws, { t: "error", reason: "bad_key" });
          me = idByKey.get(m.key) ?? newId();
          idByKey.set(m.key, me);
          online.get(me)?.ws.close(4000, "replaced"); // same device opened twice
          online.set(me, { ws, name: String(m.name ?? "").slice(0, 80) });
          return send(ws, { t: "welcome", id: me });
        }
        case "connect": {
          const to = String(m.target ?? "").replace(/\D/g, "");
          if (to === me) return send(ws, { t: "connect_error", reason: "self" });
          const peer = online.get(to);
          if (!peer) return send(ws, { t: "connect_error", reason: "offline" });
          const sid = randomUUID();
          sessions.set(sid, { from: me, to, status: "requested" });
          send(ws, { t: "connecting", session_id: sid, target: to, ice_servers: ICE });
          return send(peer.ws, { t: "incoming", session_id: sid, ice_servers: ICE,
            from: { id: me, name: online.get(me).name } });
        }
        case "accept":
        case "reject": {
          const s = sessions.get(m.session_id);
          if (!s || s.to !== me || s.status !== "requested") return;
          if (m.t === "reject") {
            sessions.delete(m.session_id);
            return send(online.get(s.from)?.ws, { t: "rejected", session_id: m.session_id });
          }
          s.status = "open";
          return send(online.get(s.from)?.ws, { t: "accepted", session_id: m.session_id, peer_name: online.get(me).name });
        }
        case "cancel": { // requester gave up before an answer
          const s = sessions.get(m.session_id);
          if (s?.from === me) end(m.session_id, me, "cancelled");
          return;
        }
        case "signal": { // SDP / ICE relay, only between the two ends of an open session
          const s = sessions.get(m.session_id);
          if (!s || s.status !== "open" || (s.from !== me && s.to !== me)) return;
          return send(online.get(peerOf(s, me))?.ws, { t: "signal", session_id: m.session_id, payload: m.payload });
        }
        case "end": {
          const s = sessions.get(m.session_id);
          if (s && (s.from === me || s.to === me)) end(m.session_id, me, "remote");
          return;
        }
      }
    });
    ws.on("close", () => {
      if (!me || online.get(me)?.ws !== ws) return;
      online.delete(me);
      for (const [sid, s] of sessions) if (s.from === me || s.to === me) end(sid, me, "peer_offline");
    });
  });
  return wss;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8787);
  startServer(port);
  console.log(`signal dev server on ws://localhost:${port}`);
}
