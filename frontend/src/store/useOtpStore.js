// src/store/useOtpStore.js
import { create } from "zustand";
import api from "@/api/axios";
import { toast } from "sonner";
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
            toast.error("Please enter your email");
            return false;
        }

        set({ isLoading: true });

        try {
            await api.post("/auth/send-otp", { email }, { withCredentials: true });

            toast.success("OTP sent successfully");
            set({ email });

            // cache last email in auth store for UX
            try {
              useAuthStore.getState().setLastEmail(email);
            } catch {}

            // Restart timer (2 min)
            get().startTimer(120);

            return true;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to send OTP");
            return false;
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
            toast.error("No email found");
            return;
        }

        if (timer > 0) {
            toast.warning(`Please wait ${timer}s`);
            return;
        }

        set({ isLoading: true });

        try {
            await api.post("/auth/resend-otp", { email }, { withCredentials: true });

            toast.success("OTP resent successfully");

            // cache last email in auth store for UX (idempotent)
            try {
              useAuthStore.getState().setLastEmail(email);
            } catch {}

            // Restart timer
            get().startTimer(120);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to resend OTP");
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

            toast.info("OTP canceled");
            get().resetTimer();
        } catch {
            // silent fail — backend cancel is optional
        }
    },
}));
