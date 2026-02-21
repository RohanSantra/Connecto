import { useEffect, useRef, useCallback } from "react";
import useCallStore from "@/store/useCallStore";
import { getSocket } from "@/lib/socket";
import { useProfileStore } from "@/store/useProfileStore";

function getLiveSocket() {
  const s = getSocket();
  return s && s.connected ? s : null;
}

export function useWebRTC({ callId, chatId }) {
  const pcsRef = useRef({});
  const profile = useProfileStore((s) => s.profile);
  const activeCall = useCallStore((s) => s.activeCall);

  /* -------------------------------------------------- */
  /* CREATE / GET PEER CONNECTION                      */
  /* -------------------------------------------------- */

  const getOrCreatePC = useCallback(
    (remoteUserId) => {
      if (!remoteUserId) return null;

      const existing = pcsRef.current[remoteUserId];
      if (existing && existing.connectionState !== "closed") {
        return existing;
      }

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

      // Attach local tracks
      const { localStream } = useCallStore.getState();
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onnegotiationneeded = async () => {
        if (pc.signalingState !== "stable") return;
        if (pc.connectionState === "closed") return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        getLiveSocket()?.emit("call:signal", {
          callId,
          chatId,
          toUserId: remoteUserId,
          data: {
            type: "sdp",
            sdp: pc.localDescription,
          },
        });
      };

      pc.ontrack = (event) => {
        const remoteUserIdStr = String(remoteUserId);

        const [remoteStream] = event.streams;

        if (!remoteStream) return;

        useCallStore.getState().addRemoteStream(
          remoteUserIdStr,
          remoteStream
        );

        useCallStore.setState({ inCall: true });
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        getLiveSocket()?.emit("call:signal", {
          callId,
          chatId,
          toUserId: remoteUserId,
          data: {
            type: "ice",
            candidate: event.candidate,
          },
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;

        if (state === "connected") {
          const streams =
            useCallStore.getState().remoteStreams;

          if (!streams[remoteUserId]) {
            // Create placeholder empty stream
            useCallStore.getState().addRemoteStream(
              remoteUserId,
              new MediaStream()
            );
          }
        }

        if (["failed", "disconnected", "closed"].includes(state)) {
          try { pc.close(); } catch { }
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

  /* -------------------------------------------------- */
  /* CREATE OFFER                                      */
  /* -------------------------------------------------- */

  const createOffer = useCallback(
    async (remoteUserId) => {
      const pc = getOrCreatePC(remoteUserId);
      if (!pc) return;

      if (pc.signalingState !== "stable") {
        console.log("Skip offer, not stable:", pc.signalingState);
        return;
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        getLiveSocket()?.emit("call:signal", {
          callId,
          chatId,
          toUserId: remoteUserId,
          data: {
            type: "sdp",
            sdp: pc.localDescription,
          },
        });
      } catch (err) {
        console.warn("createOffer failed", err);
      }
    },
    [getOrCreatePC, callId, chatId]
  );

  /* -------------------------------------------------- */
  /* HANDLE SIGNAL                                     */
  /* -------------------------------------------------- */

  const handleSignal = useCallback(
    async ({ fromUserId, data }) => {
      if (!fromUserId || !data) return;

      const pc = getOrCreatePC(fromUserId);
      if (!pc) return;

      try {
        if (data.type === "sdp") {
          const desc = new RTCSessionDescription(data.sdp);

          if (desc.type === "offer") {
            if (pc.signalingState !== "stable") {
              console.log("Ignoring offer, state:", pc.signalingState);
              return;
            }

            await pc.setRemoteDescription(desc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            getLiveSocket()?.emit("call:signal", {
              callId,
              chatId,
              toUserId: fromUserId,
              data: {
                type: "sdp",
                sdp: pc.localDescription,
              },
            });
          }

          if (desc.type === "answer") {
            if (pc.signalingState !== "have-local-offer") {
              console.log("Ignoring answer, state:", pc.signalingState);
              return;
            }

            await pc.setRemoteDescription(desc);
          }
        }

        if (data.type === "ice") {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch { }
        }
      } catch (err) {
        console.warn("handleSignal error", err);
      }
    },
    [getOrCreatePC, callId, chatId]
  );

  /* -------------------------------------------------- */
  /* SOCKET LISTENER                                   */
  /* -------------------------------------------------- */

  useEffect(() => {
    const socket = getLiveSocket();
    if (!socket) return;

    const listener = (payload) => {
      if (!payload) return;
      if (String(payload.callId) !== String(callId)) return;

      handleSignal({
        fromUserId: payload.fromUserId,
        data: payload.data,
      });
    };

    socket.on("call:signal", listener);

    return () => {
      socket.off("call:signal", listener);
    };
  }, [callId, handleSignal]);

  /* -------------------------------------------------- */
  /* WHEN CALL ACCEPTED                                */
  /* -------------------------------------------------- */

  useEffect(() => {
    if (!activeCall || activeCall.status !== "accepted") return;

    const myId = profile?.userId;
    if (!myId) return;

    const isCaller = String(activeCall.callerId) === String(myId);

    // Caller creates offer to everyone
    if (isCaller) {
      (activeCall.calleeIds || []).forEach((uid) => {
        createOffer(uid);
      });
    }
  }, [activeCall?.status, profile?.userId, createOffer]);

  /* -------------------------------------------------- */
  /* NEW USER JOINED (GROUP CALL)                      */
  /* -------------------------------------------------- */

  useEffect(() => {
    const socket = getLiveSocket();
    if (!socket) return;

    const onAccepted = ({ callId: cid, userId }) => {
      if (String(cid) !== String(callId)) return;

      const myId = profile?.userId;
      if (!myId) return;
      if (String(userId) === String(myId)) return;

      // Everyone creates offer to the new user
      createOffer(userId);
    };

    socket.on("CALL_ACCEPTED_EVENT", onAccepted);
    socket.on("call:accepted", onAccepted);

    return () => {
      socket.off("CALL_ACCEPTED_EVENT", onAccepted);
      socket.off("call:accepted", onAccepted);
    };
  }, [callId, profile?.userId, createOffer]);

  /* -------------------------------------------------- */
  /* CLEANUP                                           */
  /* -------------------------------------------------- */

  useEffect(() => {
    return () => {
      Object.values(pcsRef.current).forEach((pc) => {
        try { pc.close(); } catch { }
      });
      pcsRef.current = {};
      useCallStore.setState({ remoteStreams: {} });
    };
  }, []);

  return {};
}