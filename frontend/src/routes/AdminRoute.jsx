import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore.js";

export default function AdminRoute({ children }) {
    const { isAuthenticated, user } = useAuthStore();
    const isBoarded = user?.isBoarded;    
    const isAdmin=user?.isAdmin;

    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (!isBoarded) return <Navigate to="/set-profile" replace />;
    if(!isAdmin) return <Navigate to="/" replace/>

    return children;
}
