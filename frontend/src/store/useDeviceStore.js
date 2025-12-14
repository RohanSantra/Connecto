// src/store/useDeviceStore.js
import { create } from "zustand";
import { toast } from "sonner";
import api from "@/api/axios";

/**
 * Your backend socket events for devices send payloads like:
 *  DEVICE_REGISTERED_EVENT → { device: {...} }
 *  DEVICE_LOGGED_OUT_EVENT → { deviceId }
 *  DEVICE_REMOVED_EVENT    → { deviceId }
 *
 * We implement handlers accordingly.
 */

export const useDeviceStore = create((set, get) => ({
    devices: [],
    loading: false,

    /* ==========================================================
       FETCH ALL DEVICES (used in settings screen)
    ========================================================== */
    fetchDevices: async () => {
        set({ loading: true });
        try {
            const res = await api.get("/devices", { withCredentials: true });
            const devices = res.data?.data || [];
            set({ devices });
            return devices;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load devices");
            return [];
        } finally {
            set({ loading: false });
        }
    },

    /* ==========================================================
       REGISTER DEVICE (used automatically after login)
    ========================================================== */
    registerDevice: async (payload) => {
        try {
            const res = await api.post("/devices/register", payload, {
                withCredentials: true,
            });

            const newDevice = res.data?.data;
            if (!newDevice) return null;

            set((state) => ({
                devices: [newDevice, ...state.devices],
            }));

            toast.success("Device registered");
            return newDevice;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to register device");
            return null;
        }
    },

    /* ==========================================================
       LOGOUT DEVICE (remote logout)
    ========================================================== */
    logoutDevice: async (deviceId) => {
        try {
            await api.post(`/devices/${deviceId}/logout`, {}, { withCredentials: true });

            set((state) => ({
                devices: state.devices.map((d) =>
                    d.deviceId === deviceId ? { ...d, status: "logged_out" } : d
                ),
            }));

            toast.info("Device logged out");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to logout device");
        }
    },

    /* ==========================================================
       DELETE DEVICE
    ========================================================== */
    deleteDevice: async (deviceId) => {
        try {
            await api.delete(`/devices/${deviceId}`, { withCredentials: true });

            set((state) => ({
                devices: state.devices.filter((d) => d.deviceId !== deviceId),
            }));

            toast.success("Device removed");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete device");
        }
    },

    /* ==========================================================
       ROTATE PREKEYS (for E2EE)
    ========================================================== */
    onDeviceKeysRotated: ({ deviceId, newPreKeys }) => {
        set((state) => ({
            devices: state.devices.map((d) =>
                d.deviceId === deviceId
                    ? { ...d, preKeys: newPreKeys }
                    : d
            )
        }));

        toast.success("Device keys rotated");
    },


    /* ==========================================================
       SOCKET HANDLERS (match backend)
    ========================================================== */

    // DEVICE_REGISTERED_EVENT → { device }
    onDeviceRegistered: ({ device }) => {
        if (!device) return;

        set((state) => {
            const exists = state.devices.some((d) => d.deviceId === device.deviceId);
            if (exists) return {};
            return { devices: [device, ...state.devices] };
        });

        toast.success("New device registered");
    },
    onDevicePrimaryChanged: ({ deviceId }) => {
        set((state) => ({
            devices: state.devices.map((d) =>
                d.deviceId === deviceId
                    ? { ...d, isPrimary: true }
                    : { ...d, isPrimary: false }
            )
        }));

        toast.success("Primary device updated");
    },

    // DEVICE_LOGGED_OUT_EVENT → { deviceId }
    onDeviceLoggedOut: ({ deviceId, lastSeenAt }) => {
        if (!deviceId) return;

        set((state) => ({
            devices: state.devices.map((d) =>
                d.deviceId === deviceId
                    ? { ...d, status: "logged_out", lastSeenAt }
                    : d
            ),
        }));

        toast.warning("A device was logged out");
    },


    // DEVICE_REMOVED_EVENT → { deviceId }
    onDeviceRemoved: ({ deviceId }) => {
        if (!deviceId) return;

        set((state) => ({
            devices: state.devices.filter((d) => d.deviceId !== deviceId),
        }));

        toast.warning("A device was removed");
    },
}));
