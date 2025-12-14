import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore.js";

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, user } = useAuthStore();
    const isBoarded = user?.isBoarded;

    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (!isBoarded) return <Navigate to="/set-profile" replace />;

    return children;
}
