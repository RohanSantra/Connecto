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
import { useProfileStore } from "@/store/useProfileStore";

export default function AuthSuccessPage() {
    const navigate = useNavigate();
    const checkAuth = useAuthStore((s) => s.checkAuth);
    const fetchProfile = useProfileStore((s) => s.fetchProfile);

    useEffect(() => {
        const finalize = async () => {
            await checkAuth();

            const authState = useAuthStore.getState();

            if (!authState.isAuthenticated) {
                return navigate("/auth", { replace: true });
            }

            const user = authState.user;

            let restored = false;

            // 1️⃣ RESTORE FIRST
            if (user?.encryptedPrivateKeyBackup) {
                try {
                    restored = await restorePrivateKeyFromServer(user.email);
                } catch (e) {
                    console.error("Restore failed:", e);
                }
            }

            // 2️⃣ IF NOT RESTORED → CREATE + BACKUP
            if (!restored) {
                const kp = getOrCreateDeviceKeypair();
                await backupPrivateKeyToServer(user.email);
            }

            // 3️⃣ NOW REGISTER DEVICE (AFTER KEYS ARE CORRECT)
            await registerDeviceWithServer({
                deviceName: navigator.userAgent,
            });

            if (user?.isBoarded) {
                await fetchProfile();
                navigate("/", { replace: true });
            } else {
                navigate("/set-profile", { replace: true });
            }
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
