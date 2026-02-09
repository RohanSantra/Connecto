import { useEffect, useRef, useCallback } from "react";
import useCallStore from "@/store/useCallStore";
import { getSocket } from "@/lib/socket";
import { useProfileStore } from "@/store/useProfileStore";

/**
 * Robust WebRTC hook — fixes delayed join / refresh issues.
 * - retries offers when someone accepts late
 * - replaces/adds local tracks to existing PCs
 * - avoids duplicate-offer storms
 */

function getLiveSocket() {
  const s = getSocket();
  return s && s.connected ? s : null;
}

export function useWebRTC({ callId, chatId }) {
  const pcsRef = useRef({});
  const offeredRef = useRef(new Set());
  const retryTimersRef = useRef({}); // for cancelling retries

  const profile = useProfileStore((s) => s.profile);
  const activeCall = useCallStore((s) => s.activeCall);

  const makePC = useCallback(
    (remoteUserId) => {
      if (!remoteUserId) return null;

      const existing = pcsRef.current[remoteUserId];
      if (existing && existing.connectionState !== "closed") return existing;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:global.relay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      });

      // Attach any local tracks we already have
      const { localStream } = useCallStore.getState();
      if (localStream) {
        localStream.getTracks().forEach((t) => {
          try {
            pc.addTrack(t, localStream);
          } catch (e) { /* ignore */ }
        });
      }

      pc.ontrack = (ev) => {
        const incoming = ev.streams?.[0] || new MediaStream([ev.track]);
        incoming.getTracks().forEach((t) => (t.enabled = true));
        useCallStore.getState().addRemoteStream(remoteUserId, incoming);
        useCallStore.setState({ inCall: true });
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        getLiveSocket()?.emit("call:signal", {
          callId,
          chatId,
          toUserId: remoteUserId,
          data: { type: "ice", candidate: ev.candidate },
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (["failed", "disconnected", "closed"].includes(state)) {
          try { pc.close(); } catch {}
          delete pcsRef.current[remoteUserId];
          useCallStore.getState().removeRemoteStream(remoteUserId);
        }
      };

      pcsRef.current[remoteUserId] = pc;
      useCallStore.getState().addPC(remoteUserId, pc);
      return pc;
    },
    [callId, chatId]
  );

  const createOfferForUser = useCallback(
    async (remoteUserId) => {
      if (!callId || !remoteUserId) return;
      // prevent duplicates
      if (offeredRef.current.has(remoteUserId)) return;
      offeredRef.current.add(remoteUserId);

      const pc = makePC(remoteUserId);
      if (!pc) {
        offeredRef.current.delete(remoteUserId);
        return;
      }

      try {
        // create offer and send
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getLiveSocket()?.emit("call:signal", {
          callId,
          chatId,
          toUserId: remoteUserId,
          data: { type: "sdp", sdp: pc.localDescription },
        });
      } catch (err) {
        console.warn("createOffer failed for", remoteUserId, err);
        offeredRef.current.delete(remoteUserId);
      }
    },
    [makePC, callId, chatId]
  );

  const handleIncomingSignal = useCallback(
    async ({ fromUserId, data }) => {
      if (!fromUserId || !data) return;
      const pc = makePC(fromUserId);
      if (!pc) return;

      try {
        if (data.type === "sdp") {
          const desc = new RTCSessionDescription(data.sdp);

          // Offer collision: attempt rollback if needed
          if (desc.type === "offer" && pc.signalingState === "have-local-offer") {
            try { await pc.setLocalDescription({ type: "rollback" }); } catch {}
          }

          if (desc.type === "offer") {
            await pc.setRemoteDescription(desc);

            // ensure local tracks exist (if not, try to reattach from store)
            const { localStream } = useCallStore.getState();
            if (localStream) {
              localStream.getTracks().forEach((t) => {
                const sender = pc.getSenders().find((s) => s.track?.kind === t.kind);
                if (sender) {
                  try { sender.replaceTrack(t); } catch {}
                } else {
                  try { pc.addTrack(t, localStream); } catch {}
                }
              });
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            getLiveSocket()?.emit("call:signal", {
              callId,
              chatId,
              toUserId: fromUserId,
              data: { type: "sdp", sdp: pc.localDescription },
            });
          } else if (desc.type === "answer") {
            await pc.setRemoteDescription(desc);
          }
        } else if (data.type === "ice") {
          try { await pc.addIceCandidate(data.candidate); } catch (err) { /* ignore */ }
        }
      } catch (err) {
        console.warn("handleIncomingSignal failed", err);
      }
    },
    [makePC, callId, chatId]
  );

  /* Normal signal listener */
  useEffect(() => {
    const socket = getLiveSocket();
    if (!socket) return;

    const handler = (payload) => {
      if (!payload) return;
      if (String(payload.callId) !== String(callId)) return;

      handleIncomingSignal({
        fromUserId: payload.fromUserId || payload.userId || payload.from || null,
        data: payload.data || payload.signal || null,
      });
    };

    socket.on("call:signal", handler);
    socket.on("call:signal:client", handler); // tolerant alias
    return () => {
      socket.off("call:signal", handler);
      socket.off("call:signal:client", handler);
    };
  }, [callId, handleIncomingSignal]);

  /* When call becomes accepted and I'm the caller -> initial offers */
  useEffect(() => {
    if (!activeCall || activeCall.status !== "accepted") return;
    const myId = profile?.userId;
    if (!myId) return;
    if (String(activeCall.callerId) !== String(myId)) return;

    (activeCall.calleeIds || []).forEach((cid) => {
      // clear any stale offered flag so createOffer runs
      offeredRef.current.delete(cid);
      createOfferForUser(cid);
    });
  }, [activeCall?.status, profile?.userId, createOfferForUser, activeCall]);

  /* handle both "webrtc:new-user" (internal) and server accept events.
     This implements retries for delayed joins. */
  useEffect(() => {
    // local new-user event (from onCallAccepted handler in store)
    const newUserHandler = (e) => {
      const userId = e?.detail;
      if (!userId) return;
      offeredRef.current.delete(userId);
      makePC(userId);
      createOfferForUser(userId);

      // quick retry schedule (1s, 2s, 4s)
      [1000, 2000, 4000].forEach((delay, i) => {
        const t = setTimeout(() => {
          if (!useCallStore.getState().remoteStreams[userId]) {
            offeredRef.current.delete(userId);
            createOfferForUser(userId);
          }
        }, delay);
        retryTimersRef.current[`new-${userId}-${i}`] = t;
      });
    };
    window.addEventListener("webrtc:new-user", newUserHandler);
    return () => {
      window.removeEventListener("webrtc:new-user", newUserHandler);
      Object.values(retryTimersRef.current).forEach(clearTimeout);
      retryTimersRef.current = {};
    };
  }, [makePC, createOfferForUser]);

  /* Server-side 'accepted' event listener with retries and cross-name compatibility */
  useEffect(() => {
    const socket = getLiveSocket();
    if (!socket) return;

    const acceptedHandler = ({ callId: acceptedCallId, userId } = {}) => {
      if (!acceptedCallId || String(acceptedCallId) !== String(callId)) return;
      if (!userId) return;
      const myId = profile?.userId;
      if (!myId) return;
      if (String(userId) === String(myId)) return;

      // Force re-offer and add/replace local tracks if needed
      offeredRef.current.delete(userId);
      const pc = makePC(userId);

      const { localStream } = useCallStore.getState();
      if (localStream && pc) {
        // add or replace senders' tracks
        localStream.getTracks().forEach((t) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === t.kind);
          if (sender) {
            try { sender.replaceTrack(t); } catch {}
          } else {
            try { pc.addTrack(t, localStream); } catch {}
          }
        });
      }

      createOfferForUser(userId);

      // retry logic: try up to 4 attempts spaced out; cancel if remote stream arrives
      const attempts = [0, 700, 1400, 3000];
      attempts.forEach((delay, idx) => {
        const key = `acc-${userId}-${idx}`;
        retryTimersRef.current[key] = setTimeout(() => {
          const remoteStreams = useCallStore.getState().remoteStreams || {};
          if (!remoteStreams[userId]) {
            offeredRef.current.delete(userId);
            createOfferForUser(userId);
          } else {
            // remote stream present -> cleanup any pending timers for this user
            attempts.forEach((_, j) => {
              const k = `acc-${userId}-${j}`;
              clearTimeout(retryTimersRef.current[k]);
              delete retryTimersRef.current[k];
            });
          }
        }, delay);
      });
    };

    // listen to multiple likely event names (server code sometimes uses enums/strings)
    const names = ["CALL_ACCEPTED_EVENT", "call:accepted", "call:accepted_event", "CALL_ACCEPTED"];
    names.forEach((n) => socket.on(n, acceptedHandler));

    return () => {
      names.forEach((n) => socket.off(n, acceptedHandler));
      Object.values(retryTimersRef.current).forEach(clearTimeout);
      retryTimersRef.current = {};
    };
  }, [callId, profile?.userId, makePC, createOfferForUser]);

  /* Reset on callId change */
  useEffect(() => {
    offeredRef.current.clear();
    Object.values(pcsRef.current).forEach((pc) => {
      try { pc.close(); } catch {}
    });
    pcsRef.current = {};
    useCallStore.setState({ remoteStreams: {} });
  }, [callId]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      Object.values(pcsRef.current).forEach((pc) => {
        try { pc.close(); } catch {}
      });
      pcsRef.current = {};
      offeredRef.current.clear();
      Object.values(retryTimersRef.current).forEach(clearTimeout);
      retryTimersRef.current = {};
      useCallStore.setState({ remoteStreams: {} });
    };
  }, []);

  return { createOfferForUser, handleIncomingSignal };
}
