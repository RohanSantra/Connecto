// src/store/useCallStore.js
import { create } from "zustand";
import { toast } from "sonner";
import api from "@/api/axios";

export const useCallStore = create((set, get) => ({
    currentCall: null,
    status: "idle", // idle | ringing | accepted | ended
    history: [],
    loading: false,

    /* ==========================================================
       START CALL
    ========================================================== */
    startCall: async ({ chatId, type, metadata }) => {
        try {
            set({ loading: true });

            const res = await api.post(
                "/call/start",
                { chatId, type, metadata },
                { withCredentials: true }
            );

            const call = res.data?.data;

            set({
                currentCall: call,
                status: "ringing",
            });

            return call;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to start call");
            return null;
        } finally {
            set({ loading: false });
        }
    },

    /* ==========================================================
       ACCEPT CALL
    ========================================================== */
    acceptCall: async (callId) => {
        try {
            const res = await api.post(`/call/${callId}/accept`, {}, { withCredentials: true });

            const call = res.data?.data;

            set({
                currentCall: call,
                status: "accepted",
            });

            return call;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to accept call");
            return null;
        }
    },

    /* ==========================================================
       REJECT CALL
    ========================================================== */
    rejectCall: async (callId) => {
        try {
            await api.post(`/call/${callId}/reject`, {}, { withCredentials: true });

            set({
                currentCall: null,
                status: "idle",
            });

            toast.warning("Call rejected");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to reject call");
        }
    },

    /* ==========================================================
       END CALL
    ========================================================== */
    endCall: async (callId) => {
        try {
            const res = await api.post(`/call/${callId}/end`, {}, { withCredentials: true });

            const ended = res.data?.data;

            set({
                status: "ended",
                currentCall: { ...get().currentCall, ...ended },
            });

            return ended;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to end call");
            return null;
        }
    },

    /* ==========================================================
       MARK MISSED CALL
    ========================================================== */
    markMissedCall: async (callId) => {
        try {
            await api.post(`/call/${callId}/missed`, {}, { withCredentials: true });

            set({ currentCall: null, status: "idle" });
        } catch (err) {
            console.warn("Failed to mark missed:", err);
        }
    },

    /* ==========================================================
       FETCH CALL HISTORY
    ========================================================== */
    fetchHistory: async (page = 1, limit = 20) => {
        try {
            set({ loading: true });

            const res = await api.get(`/call/history?page=${page}&limit=${limit}`, {
                withCredentials: true,
            });

            const items = res.data?.data || [];
            set({ history: items });

            return items;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load call history");
            return [];
        } finally {
            set({ loading: false });
        }
    },

    /* ==========================================================
       SOCKET EVENT HANDLERS
       (strictly matched to backend call events)
    ========================================================== */

    // CALL_RINGING_EVENT → full call object
    onCallRinging: (payload) => {
        const call = payload.call || payload;
        if (!call) return;

        if (get().currentCall?.callId === call.callId) return;

        set({
            currentCall: call,
            status: "ringing",
        });

        toast.custom(() => (
            <div className="flex items-center gap-3 bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-md">
                <div>
                    <p className="font-semibold">{call.type.toUpperCase()} Call Incoming</p>
                    <p className="text-xs text-zinc-400">
                        From {call.caller?.username || call.callerId}
                    </p>
                </div>
            </div>
        ));
    },


    // CALL_ACCEPTED_EVENT → { callId, ...rest }
    onCallAccepted: (data) => {
        if (get().currentCall?.callId !== data.callId) return;
        set({ status: "accepted" });
    },

    // CALL_REJECTED_EVENT → { callId }
    onCallRejected: (data) => {
        if (get().currentCall?.callId !== data.callId) return;

        set({
            currentCall: null,
            status: "idle",
        });

        toast.warning("Call rejected");
    },

    onCallEnded: (data) => {
        if (get().currentCall?.callId !== data.callId) return;

        set({
            status: "ended",
            currentCall: {
                ...get().currentCall,
                duration: data.duration,
                endedBy: data.endedBy,
            },
        });

        setTimeout(() => {
            set({ currentCall: null, status: "idle" });
        }, 1200);
    },

    // CALL_MISSED_EVENT → { callId }
    onCallMissed: (data) => {
        if (get().currentCall?.callId !== data.callId) return;

        set({
            status: "idle",
            currentCall: null,
        });

        toast.warning("Missed call");
    },
}));
