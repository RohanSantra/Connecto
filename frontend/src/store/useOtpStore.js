// src/store/useOtpStore.js
import { create } from "zustand";
import api from "@/api/axios";
import { useAuthStore } from "./useAuthStore";

export const useOtpStore = create((set, get) => ({
    email: "",
    timer: 0,
    intervalId: null,
    isRunning: false,
    isLoading: false,

    /* ==========================================================
       ⏳ TIMER MANAGEMENT
       ========================================================== */
    startTimer: (seconds = 120) => {
        // Clear any previous interval
        const { intervalId } = get();
        if (intervalId) clearInterval(intervalId);

        set({ timer: seconds });

        const id = setInterval(() => {
            set((state) => {
                if (state.timer <= 1) {
                    clearInterval(id);
                    return { timer: 0, isRunning: false, intervalId: null };
                }
                return { timer: state.timer - 1 };
            });
        }, 1000);

        set({ isRunning: true, intervalId: id });
    },

    stopTimer: () => {
        const { intervalId } = get();
        if (intervalId) clearInterval(intervalId);
        set({ isRunning: false, intervalId: null });
    },

    resetTimer: () => {
        get().stopTimer();
        set({ timer: 0 });
    },

    setEmail: (email) => set({ email }),

    /* ==========================================================
       📤 SEND OTP
       ========================================================== */
    sendOtp: async (email) => {
        if (!email) {
            throw new Error("Email is required");
        }

        set({ isLoading: true });

        try {
            await api.post(
                "/auth/send-otp",
                { email },
                { withCredentials: true }
            );

            set({ email });

            try {
                useAuthStore.getState().setLastEmail(email);
            } catch { }

            // Start timer only after success
            get().startTimer(120);

            return true; // success

        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                "Failed to send OTP";

            throw new Error(msg); // 🔥 MUST THROW
        } finally {
            set({ isLoading: false });
        }
    },

    /* ==========================================================
       📤 RESEND OTP
       ========================================================== */
    resendOtp: async () => {
        const { email, timer } = get();

        if (!email) {
            return;
        }

        if (timer > 0) {
            return;
        }

        set({ isLoading: true });

        try {
            await api.post("/auth/resend-otp", { email }, { withCredentials: true });


            // cache last email in auth store for UX (idempotent)
            try {
                useAuthStore.getState().setLastEmail(email);
            } catch { }

            // Restart timer
            get().startTimer(120);
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to resend OTP";
            throw new Error(msg);
        } finally {
            set({ isLoading: false });
        }
    },

    /* ==========================================================
       ❌ CANCEL OTP
       ========================================================== */
    cancelOtp: async () => {
        const { email } = get();
        if (!email) return;

        try {
            await api.post("/auth/cancel-otp", { email }, { withCredentials: true });

            get().resetTimer();
        } catch {
            // silent fail — backend cancel is optional
        }
    },
}));
