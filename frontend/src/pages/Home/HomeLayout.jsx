import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";

import LoaderScreen from "@/components/common/LoaderScreen";

export default function HomeLayout() {
  const { isAuthenticated } = useAuthStore();
  const { profile, fetchProfile, profileLoading } = useProfileStore();

  useEffect(() => {
    if (isAuthenticated && !profile && !profileLoading) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  if (profileLoading && !profile) {
    return <LoaderScreen />;
  }

  return <Outlet />;
}