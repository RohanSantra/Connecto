import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore.js";
import LoaderScreen from "@/components/common/LoaderScreen";

export default function AdminRoute({ children }) {
    const { isAuthenticated, user, loading } = useAuthStore();
    const isBoarded = user?.isBoarded;
    const isAdmin = user?.isAdmin;

    if (loading) return <LoaderScreen />;

    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (!isBoarded) return <Navigate to="/set-profile" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;

    return children;
}