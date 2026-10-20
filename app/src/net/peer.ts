// One WebRTC connection per session. The remote (host) side offers its screen; the viewer answers.
// shortcut: the screen comes from getDisplayMedia in the webview (shows a picker, needs someone present);
// the native capture in Rust replaces it for unattended access.
export type PeerPayload = { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

export function createPeer(
  iceServers: RTCIceServer[],
  sendSignal: (p: PeerPayload) => void,
  handlers: { onStream?: (s: MediaStream) => void; onState?: (s: RTCPeerConnectionState) => void },
) {
  const pc = new RTCPeerConnection({ iceServers });
  const pending: RTCIceCandidateInit[] = [];

  pc.onicecandidate = (e) => { if (e.candidate) sendSignal({ candidate: e.candidate.toJSON() }); };
  pc.ontrack = (e) => handlers.onStream?.(e.streams[0]);
  pc.onconnectionstatechange = () => handlers.onState?.(pc.connectionState);

  return {
    pc,
    async offer(stream: MediaStream) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setLocalDescription();
      sendSignal({ sdp: pc.localDescription!.toJSON() });
    },
    async handle(p: PeerPayload) {
      if (p.sdp) {
        await pc.setRemoteDescription(p.sdp);
        for (const c of pending.splice(0)) await pc.addIceCandidate(c);
        if (p.sdp.type === "offer") {
          await pc.setLocalDescription();
          sendSignal({ sdp: pc.localDescription!.toJSON() });
        }
      } else if (p.candidate) {
        // candidates can arrive before the description; adding them early throws
        if (pc.remoteDescription) await pc.addIceCandidate(p.candidate);
        else pending.push(p.candidate);
      }
    },
    /** "direct" or "relay", from the selected candidate pair. */
    async connectionType(): Promise<"direct" | "relay" | null> {
      const stats = await pc.getStats();
      let local: string | undefined;
      stats.forEach((s) => { if (s.type === "candidate-pair" && s.state === "succeeded" && s.nominated) local = s.localCandidateId; });
      if (!local) return null;
      return stats.get(local)?.candidateType === "relay" ? "relay" : "direct";
    },
    close() { pc.close(); },
  };
}
