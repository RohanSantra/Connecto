import { create } from "zustand";
import { produce } from "immer";
import api from "@/api/axios";
import { createJSONStorage, persist } from "zustand/middleware";
import { playCallingTone, stopAllCallSounds } from "@/lib/callSoundManager";
import { useProfileStore } from "./useProfileStore";
import { getSocket } from "@/lib/socket";
import { useBlockStore } from "./useBlockStore";

/**
 * Minimal, robust call store: handles UI state for caller + callee.
 * Persists only ephemeral UI pieces to sessionStorage.
 */

const defaultState = {
    activeCall: null,     // call doc for outgoing (caller) or accepted/active
    incomingCall: null,   // incoming call object only for callee while ringing
    inCall: false,        // when media has started / accepted
    localStream: null,
    remoteStreams: {},
    pcs: {},              // runtime only
    muted: false,
    videoEnabled: true,
    loading: false,
    error: null,
    hasHydrated: false,
};


export const useCallStore = create(
    persist(
        (set, get) => ({
            ...defaultState,

            // ------------------ CALL HISTORY STATE ------------------
            callHistory: {
                rows: [],
                page: 1,
                limit: 20,
                hasMore: true,
                loading: false,
                error: null,

                // filters
                type: "all",       // audio | video | all
                status: "all",     // client-side only
                date: null,
                q: "",             // search
            },

            // ------------------ CALL HISTORY ACTIONS ------------------

            setCallHistoryFilters: (filters = {}) => {
                set(
                    produce((s) => {
                        Object.assign(s.callHistory, filters);
                        s.callHistory.page = 1;
                        s.callHistory.rows = [];
                        s.callHistory.hasMore = true;
                    })
                );

                // 🔥 auto fetch after any filter change
                get().fetchCallHistory({ reset: true });
            },

            resetCallHistoryFilters: () => {
                set(
                    produce((s) => {
                        s.callHistory.rows = [];
                        s.callHistory.page = 1;
                        s.callHistory.hasMore = true;
                        s.callHistory.error = null;

                        s.callHistory.type = "all";
                        s.callHistory.status = "all";
                        s.callHistory.date = null;
                        s.callHistory.q = "";
                    })
                );

                get().fetchCallHistory({ reset: true });
            },


            fetchCallHistory: async ({ reset = false } = {}) => {
                const { callHistory } = get();
                if (callHistory.loading || !callHistory.hasMore) return;

                set(
                    produce((s) => {
                        s.callHistory.loading = true;
                        s.callHistory.error = null;
                    })
                );

                try {
                    const params = {
                        page: callHistory.page,
                        limit: callHistory.limit,
                    };

                    if (callHistory.type !== "all") params.type = callHistory.type;
                    if (callHistory.q) params.q = callHistory.q;

                    // ✅ single date → converted internally to day range
                    if (callHistory.date) {
                        const day = new Date(callHistory.date);

                        params.from = new Date(
                            day.getFullYear(),
                            day.getMonth(),
                            day.getDate(),
                            0, 0, 0, 0
                        ).toISOString();

                        params.to = new Date(
                            day.getFullYear(),
                            day.getMonth(),
                            day.getDate(),
                            23, 59, 59, 999
                        ).toISOString();
                    }

                    const res = await api.get("/calls/history", {
                        params,
                        withCredentials: true,
                    });

                    const data = Array.isArray(res.data?.data) ? res.data.data : [];

                    set(
                        produce((s) => {
                            if (reset || callHistory.page === 1) {
                                s.callHistory.rows = data;
                            } else {
                                s.callHistory.rows.push(...data);
                            }

                            s.callHistory.hasMore = data.length === callHistory.limit;
                            s.callHistory.page += 1;
                            s.callHistory.loading = false;
                        })
                    );
                } catch (err) {
                    set(
                        produce((s) => {
                            s.callHistory.loading = false;
                            s.callHistory.error = "Failed to load call history";
                        })
                    );
                }
            },

            // ------------------ CALL HISTORY SELECTORS ------------------

            getVisibleCallHistory: () => {
                const { callHistory } = get();
                if (callHistory.status === "all") return callHistory.rows;
                return callHistory.rows.filter((r) => r.status === callHistory.status);
            },
            exportCallHistoryCSV: () => {
                const { callHistory } = get();
                if (!callHistory.rows.length) return;

                const header = [
                    "callId",
                    "chatId",
                    "chatName",
                    "type",
                    "status",
                    "startedAt",
                    "endedAt",
                    "duration_seconds",
                ];

                const lines = [header.join(",")];

                callHistory.rows.forEach((r) => {
                    const chatName = r.chat?.name ? String(r.chat.name).replace(/"/g, '""') : "";
                    const startedAt = r.startedAt ? new Date(r.startedAt).toISOString() : "";
                    const endedAt = r.endedAt ? new Date(r.endedAt).toISOString() : "";

                    lines.push([
                        `"${r._id || ""}"`,
                        `"${r.chatId || ""}"`,
                        `"${chatName}"`,
                        `"${r.type || ""}"`,
                        `"${r.status || ""}"`,
                        `"${startedAt}"`,
                        `"${endedAt}"`,
                        `"${r.duration ?? ""}"`,
                    ].join(","));
                });

                const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `calls-history-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            },


            // UI setters
            setIncomingCall: (payload) => set({ incomingCall: payload }),
            clearIncomingCall: () => set({ incomingCall: null }),

            setHasHydrated: (v) => set({ hasHydrated: v }),

            setActiveCall: (call) => set({ activeCall: call }),
            clearActiveCall: () =>
                set(
                    produce((s) => {
                        s.activeCall = null;
                        s.inCall = false;
                        s.localStream = null;
                        s.remoteStreams = {};
                        s.pcs = {};
                        s.muted = false;
                        s.videoEnabled = true;
                        s.loading = false;
                        s.error = null;
                    })
                ),

            // low-level media setters
            setLocalStream: (stream) => set({ localStream: stream }),
            addRemoteStream: (userId, stream) =>
                set(
                    produce((s) => {
                        s.remoteStreams[userId] = stream;
                    })
                ),
            removeRemoteStream: (userId) =>
                set(
                    produce((s) => {
                        delete s.remoteStreams[userId];
                    })
                ),

            // API calls
            startCall: async ({ chatId, type = "video", metadata = {} }) => {
                set({ loading: true, error: null });
                try {
                    const res = await api.post(
                        "/calls",
                        { chatId, type, metadata },
                        { withCredentials: true }
                    );
                    const call = res.data?.data;
                    set({ activeCall: call, loading: false });
                    return call;
                } catch (err) {
                    set({ loading: false, error: err?.message || "startCall failed" });
                    throw err;
                }
            },

            acceptCall: async (callId) => {
                set({ loading: true, error: null });
                try {
                    const res = await api.post(`/calls/${callId}/accept`, {}, { withCredentials: true });
                    const call = res.data?.data;
                    // mark call accepted; activeCall updated and incomingCall cleared
                    set({ activeCall: call, incomingCall: null, loading: false });
                    return call;
                } catch (err) {
                    set({ loading: false, error: err?.message || "accept failed" });
                    throw err;
                }
            },

            rejectCall: async (callId) => {
                set({ loading: true, error: null });
                try {
                    const res = await api.post(`/calls/${callId}/reject`, {}, { withCredentials: true });
                    // clear incoming UI
                    set({ incomingCall: null, loading: false });
                    return res.data?.data;
                } catch (err) {
                    set({ loading: false, error: err?.message || "reject failed" });
                    throw err;
                }
            },

            rejoinCall: async () => {
                const { activeCall } = get();
                if (!activeCall) return;

                const { isChatBlocked } = useBlockStore.getState();

                // 🚫 Do NOT rejoin blocked chat
                if (isChatBlocked(activeCall.chatId)) return;

                const isVideo = activeCall.type === "video";

                await get().initLocalMedia({ audio: true, video: isVideo });

                set({ inCall: true });

                getSocket()?.emit("call:rejoin", {
                    callId: activeCall._id || activeCall.callId,
                });
            },




            endCall: async (callId) => {
                set({ loading: true, error: null });
                try {
                    const res = await api.post(`/calls/${callId}/end`, {}, { withCredentials: true });
                    set({ loading: false });
                    return res.data?.data;
                } catch (err) {
                    set({ loading: false, error: err?.message || "end failed" });
                    throw err;
                }
            },

            // convenience aliases
            acceptCallApi: async (callId) => get().acceptCall(callId),
            rejectCallApi: async (callId) => get().rejectCall(callId),
            endCallApi: async (callId) => get().endCall(callId),

            // media helpers
            initLocalMedia: async ({ audio = true, video = true } = {}) => {
                set({ loading: true, error: null });
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
                    get().setLocalStream(stream);
                    stream.getAudioTracks().forEach((t) => (t.enabled = !get().muted));
                    stream.getVideoTracks().forEach((t) => (t.enabled = video && get().videoEnabled));
                    set({ loading: false });
                    return stream;
                } catch (err) {
                    set({ loading: false, error: "mic/camera denied" });
                    throw err;
                }
            },

            stopLocalMedia: () => {
                const s = get().localStream;
                if (s) {
                    s.getTracks().forEach((t) => {
                        try { t.stop(); } catch { }
                    });
                }
                set({ localStream: null });
            },

            toggleMute: () =>
                set(
                    produce((s) => {
                        s.muted = !s.muted;
                        if (s.localStream) s.localStream.getAudioTracks().forEach((t) => (t.enabled = !s.muted));
                    })
                ),

            toggleVideo: async () => {
                const { localStream, pcs, videoEnabled } = get();
                const enabling = !videoEnabled;
                if (enabling && (!localStream || localStream.getVideoTracks().length === 0)) {
                    const cam = await navigator.mediaDevices.getUserMedia({ video: true });
                    const base = localStream || new MediaStream();
                    cam.getVideoTracks().forEach((t) => base.addTrack(t));
                    get().setLocalStream(base);

                    Object.values(pcs).forEach((pc) => {
                        cam.getVideoTracks().forEach((track) => {
                            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                            if (sender) sender.replaceTrack(track);
                            else pc.addTrack(track, base);
                        });
                    });
                }

                set(
                    produce((s) => {
                        s.videoEnabled = enabling;
                        s.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabling));
                    })
                );
            },

            // WebRTC bookkeeping
            addPC: (userId, pc) =>
                set(
                    produce((s) => {
                        s.pcs[userId] = pc;
                    })
                ),
            removePC: (userId) =>
                set(
                    produce((s) => {
                        const pc = s.pcs[userId];
                        if (pc) try { pc.close(); } catch { }
                        delete s.pcs[userId];
                    })
                ),

            // ------------------ SOCKET CALLBACKS ------------------
            onCallRinging: (payload) => {
                const myId = useProfileStore.getState().profile?.userId;
                const { isChatBlocked, isUserBlocked } = useBlockStore.getState();

                // 🚫 Ignore if chat is blocked
                if (isChatBlocked(payload.chatId)) return;

                // 🚫 Ignore if caller is blocked OR caller blocked me
                if (isUserBlocked(payload.callerId)) return;

                // Caller UI
                if (String(payload.callerId) === String(myId)) {
                    set({
                        activeCall: {
                            _id: payload.callId,
                            chatId: payload.chatId,
                            callerId: payload.callerId,
                            type: payload.type,
                            metadata: payload.metadata,
                            status: "ringing",
                            calleeIds: payload.calleeIds || [],
                        },
                    });
                    return;
                }

                // Receiver UI
                if (get().inCall) return;

                set({
                    incomingCall: {
                        callId: payload.callId,
                        chatId: payload.chatId,
                        callerId: payload.callerId,
                        type: payload.type,
                        metadata: payload.metadata,
                        status: "ringing",
                        timestamp: payload.timestamp || new Date(),
                    },
                });
            },


            onCallAccepted: (payload) => {
                stopAllCallSounds();

                const myId = useProfileStore.getState().profile?.userId;
                const active = get().activeCall;
                if (!active) return;

                // Make sure both caller and callee get UI switched to in-call
                set({ activeCall: { ...active, status: "accepted" }, inCall: true });

                // Caller just learns someone joined — WebRTC handles rest
                if (payload.userId && payload.userId !== myId) {
                    window.dispatchEvent(new CustomEvent("webrtc:new-user", { detail: payload.userId }));
                }
            },

            onCallRejected: (payload) => {
                stopAllCallSounds();

                set(
                    produce((s) => {
                        if (s.incomingCall && String(s.incomingCall.callId) === String(payload?.callId)) {
                            s.incomingCall = null;
                        }

                        if (s.activeCall && (String(s.activeCall._id) === String(payload?.callId) || String(s.activeCall.callId) === String(payload?.callId))) {
                            s.activeCall = null;
                        }

                        s.inCall = false;
                        s.remoteStreams = {};
                        // Note: pcs are runtime-only; they will be closed by useWebRTC cleanup when callId changes
                    })
                );
            },

            onCallEnded: () => {
                stopAllCallSounds();
                const stream = get().localStream;
                stream?.getTracks()?.forEach((t) => { try { t.stop(); } catch { } });

                Object.values(get().pcs || {}).forEach((pc) => {
                    try { pc.close(); } catch { }
                });

                set({
                    activeCall: null,
                    incomingCall: null,
                    inCall: false,
                    localStream: null,
                    remoteStreams: {},
                    pcs: {},
                    muted: false,
                    videoEnabled: true,
                });
            },

            onCallMissed: (payload) => {
                stopAllCallSounds();
                if (get().incomingCall && String(get().incomingCall.callId) === String(payload?.callId)) {
                    set({ incomingCall: null });
                }
            },

            // convenience: acceptAndStart used by UI
            acceptAndStart: async ({ callId, audio = true, video = true } = {}) => {
                try {
                    await get().initLocalMedia({ audio, video });
                    await get().acceptCall(callId);
                    // after accept, server emits CALL_ACCEPTED -> onCallAccepted will run and set inCall true
                    return true;
                } catch (err) {
                    console.warn("acceptAndStart failed", err);
                    throw err;
                }
            },

            // convenience: caller prepare + start call
            prepareAndStartCall: async ({ chatId, type = "video", targetUserId }) => {
                const { isChatBlocked, isUserBlocked } = useBlockStore.getState();

                // 🚫 HARD BLOCK
                if (isChatBlocked(chatId)) {
                    throw new Error("Chat is blocked");
                }

                if (targetUserId && isUserBlocked(targetUserId)) {
                    throw new Error("User is blocked");
                }

                const isVideo = type === "video";

                await get().initLocalMedia({ audio: true, video: isVideo });
                playCallingTone();

                const call = await get().startCall({ chatId, type });

                set({
                    activeCall: { ...call, status: "ringing" },
                    videoEnabled: isVideo,
                });

                return call;
            },

        }),
        {
            name: "call-store",
            storage: createJSONStorage(() => sessionStorage),
            partialize: (s) => ({
                // persist incomingCall so dialogs survive refresh,
                // persist activeCall so outgoing state survives refresh
                activeCall: s.activeCall,
                incomingCall: s.incomingCall,
                inCall: s.inCall,
                muted: s.muted,
                videoEnabled: s.videoEnabled,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

export default useCallStore;
