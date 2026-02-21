import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore.js";
import LoaderScreen from "@/components/common/LoaderScreen";

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, user, loading } = useAuthStore();
    const isBoarded = user?.isBoarded;

    // WAIT until auth is resolved
    if (loading) return <LoaderScreen />;

    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (!isBoarded) return <Navigate to="/set-profile" replace />;

    return children;
}