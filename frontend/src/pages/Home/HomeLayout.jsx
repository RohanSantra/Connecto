import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";

import AppShell from "@/components/app/AppShell";
import LoaderScreen from "@/components/common/LoaderScreen";

export default function HomeLayout() {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuthStore();
  const { profile, fetchProfile, profileLoading } = useProfileStore();

  /* ------------------------------------------------------------
     🔹 Redirect if user somehow becomes unauthenticated
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated]);

  /* ------------------------------------------------------------
     🔹 Fetch profile only once after authentication
  ------------------------------------------------------------ */
  useEffect(() => {
    if (isAuthenticated && !profile && !profileLoading) {
      fetchProfile();
    }
  }, [isAuthenticated, profile, profileLoading]);

  /* ------------------------------------------------------------
     🔹 Loading state
  ------------------------------------------------------------ */
  if (profileLoading && !profile) {
    return <LoaderScreen message="Loading workspace..." />;
  }

  return (
    <div className="flex min-h-screen theme-animate">
      <AppShell />
    </div>
  );
}
