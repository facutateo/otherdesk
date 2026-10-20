// Client for the signaling server (dev: signal/server.mjs, prod: the Rust server). Reconnects with backoff.
export type SignalMsg = { t: string; [k: string]: unknown };
export type SignalStatus = "connecting" | "online" | "offline";

export class SignalClient {
  id: string | null = null;
  status: SignalStatus = "connecting";
  private ws: WebSocket | null = null;
  private listeners = new Set<(m: SignalMsg) => void>();
  private retry = 0;
  private stopped = false;

  constructor(
    private url: string,
    private key: string,
    private name: string,
    private onStatus: (s: SignalStatus, id: string | null) => void,
  ) {}

  start() {
    this.stopped = false;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ t: "hello", key: this.key, name: this.name }));
    ws.onmessage = (e) => {
      let m: SignalMsg;
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.t === "welcome") {
        this.id = String(m.id);
        this.retry = 0;
        this.setStatus("online");
      }
      this.listeners.forEach((fn) => fn(m));
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.setStatus("offline");
      if (!this.stopped) setTimeout(() => this.start(), Math.min(10_000, 1000 * 2 ** this.retry++));
    };
  }

  stop() { this.stopped = true; this.ws?.close(); }

  send(m: SignalMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  on(fn: (m: SignalMsg) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private setStatus(s: SignalStatus) {
    this.status = s;
    this.onStatus(s, this.id);
  }
}
