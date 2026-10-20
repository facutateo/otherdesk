import { test } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { startServer } from "./server.mjs";

const PORT = 8799;
function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const inbox = [];
  const waiters = [];
  ws.on("message", (b) => { const m = JSON.parse(b); const w = waiters.findIndex((x) => x.t === m.t);
    if (w >= 0) waiters.splice(w, 1)[0].resolve(m); else inbox.push(m); });
  const next = (t) => new Promise((resolve) => { const i = inbox.findIndex((m) => m.t === t);
    if (i >= 0) resolve(inbox.splice(i, 1)[0]); else waiters.push({ t, resolve }); });
  const open = new Promise((r) => ws.on("open", r));
  return { ws, next, open, send: (m) => ws.send(JSON.stringify(m)) };
}

test("connect, accept, relay signal, end", async () => {
  const wss = startServer(PORT);
  const a = client(), b = client();
  await Promise.all([a.open, b.open]);
  a.send({ t: "hello", key: "a".repeat(16), name: "Tecnico" });
  b.send({ t: "hello", key: "b".repeat(16), name: "Casa" });
  const [wa, wb] = await Promise.all([a.next("welcome"), b.next("welcome")]);
  assert.match(wa.id, /^\d{9}$/);

  a.send({ t: "connect", target: wa.id });
  assert.equal((await a.next("connect_error")).reason, "self");
  a.send({ t: "connect", target: "999999999" });
  assert.equal((await a.next("connect_error")).reason, "offline");

  a.send({ t: "connect", target: wb.id.replace(/(\d{3})/g, "$1 ") });
  const { session_id } = await a.next("connecting");
  const inc = await b.next("incoming");
  assert.equal(inc.from.name, "Tecnico");

  a.send({ t: "signal", session_id, payload: "too early" }); // not open yet: dropped
  b.send({ t: "accept", session_id });
  await a.next("accepted");
  b.send({ t: "signal", session_id, payload: { sdp: "offer" } });
  assert.deepEqual((await a.next("signal")).payload, { sdp: "offer" });

  b.ws.close();
  assert.equal((await a.next("ended")).reason, "peer_offline");
  a.ws.close(); wss.close();
});
