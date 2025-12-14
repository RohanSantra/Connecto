import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

export default function AuthSuccessPage() {
    const navigate = useNavigate();
    const { checkAuth, user, isAuthenticated } = useAuthStore();

    useEffect(() => {
        const finalize = async () => {
            await checkAuth(); // this will update Zustand store

            if (!useAuthStore.getState().isAuthenticated) {
                return navigate("/auth", { replace: true });
            }

            const u = useAuthStore.getState().user;

            if (u?.isBoarded) navigate("/", { replace: true });
            else navigate("/set-profile", { replace: true });
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
