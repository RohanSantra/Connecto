import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";

import LoaderScreen from "@/components/common/LoaderScreen";

export default function HomeLayout() {
  const { isAuthenticated } = useAuthStore();
  const {
    fetchProfile,
    profileLoading,
    hasFetchedProfile
  } = useProfileStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!hasFetchedProfile && !profileLoading) {
      fetchProfile();
    }
  }, [isAuthenticated, hasFetchedProfile, profileLoading]);

  return <Outlet />;
}