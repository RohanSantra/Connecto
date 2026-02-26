import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";

import LoaderScreen from "@/components/common/LoaderScreen";

export default function HomeLayout() {
  const { isAuthenticated } = useAuthStore();
  const { profile, fetchProfile, profileLoading } = useProfileStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!profile && !profileLoading) {
      fetchProfile();
    }
  }, [isAuthenticated, profile, profileLoading]);

  if (isAuthenticated && profileLoading) {
    return <LoaderScreen />;
  }

  return <Outlet />;
}