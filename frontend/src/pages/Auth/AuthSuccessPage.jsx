import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";
import {
    getOrCreateDeviceKeypair,
    registerDeviceWithServer,
    backupPrivateKeyToServer,
    restorePrivateKeyFromServer
} from "@/lib/deviceKeys";

export default function AuthSuccessPage() {
    const navigate = useNavigate();
    const { checkAuth, user, isAuthenticated } = useAuthStore();

    useEffect(() => {
        const finalize = async () => {
            await checkAuth();

            const state = useAuthStore.getState();

            if (!state.isAuthenticated) {
                return navigate("/auth", { replace: true });
            }

            const user = state.user;

            // 🔐 Ensure local keypair exists
            getOrCreateDeviceKeypair();

            // 🔐 Register device with backend
            await registerDeviceWithServer({
                deviceName: navigator.userAgent,
            });

            // 🔥 CRITICAL PART
            if (user?.encryptedPrivateKeyBackup) {
                // Existing account → restore key
                try {
                    await restorePrivateKeyFromServer(user.email); // dev shortcut
                } catch (e) {
                    console.error("Restore failed:", e);
                }
            } else {
                // First device ever → backup key
                await backupPrivateKeyToServer(user.email); // dev shortcut
            }

            if (user?.isBoarded)
                navigate("/", { replace: true });
            else
                navigate("/set-profile", { replace: true });
        };

        finalize();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p>Finalizing secure login...</p>
        </div>
    );
}
