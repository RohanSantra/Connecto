import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/useAuthStore.js";

import ProtectedRoute from "./routes/ProtectedRoute";

import NotFound from "@/pages/NotFound.jsx";
import HomeLayout from "@/pages/Home/HomeLayout.jsx";

// Auth
import AuthEmailPage from "@/pages/Auth/AuthEmailPage.jsx";
import AuthSuccessPage from "@/pages/Auth/AuthSuccessPage.jsx";
import VerifyOtpPage from "@/pages/Auth/VerifyOtpPage.jsx";

// Onboarding
import SetProfilePage from "@/pages/Onboarding/SetProfilePage.jsx";

// Loader
import LoaderScreen from "@/components/common/LoaderScreen.jsx";

// Settings
import SettingsPage from "@/pages/Settings/SettingsPage.jsx";

export default function App() {
  const location = useLocation();
  const { user, loading, checkAuth, isAuthenticated } = useAuthStore();

  /* ------------------------------------------------------------
     🔹 Run checkAuth ONLY on first mount
  ------------------------------------------------------------ */
  const didRunRef = React.useRef(false);

  useEffect(() => {
    if (!didRunRef.current) {
      didRunRef.current = true;
      checkAuth();
    }
  }, []);
  /* ------------------------------------------------------------
     🔹 Show loading while verifying session
  ------------------------------------------------------------ */
  if (loading) {
    return <LoaderScreen message="Connecting to Connecto Secure Network..." />;
  }

  const isBoarded = user?.isBoarded;

  return (
    <Routes location={location}>

      {/* ------------------------------------------------------------
         🔹 Public Auth Routes
      ------------------------------------------------------------ */}
      <Route
        path="/auth"
        element={
          isAuthenticated
            ? isBoarded
              ? <Navigate to="/" />
              : <Navigate to="/set-profile" />
            : <AuthEmailPage />
        }
      />

      <Route
        path="/verify"
        element={
          isAuthenticated
            ? isBoarded
              ? <Navigate to="/" />
              : <Navigate to="/set-profile" />
            : <VerifyOtpPage />
        }
      />

      <Route path="/auth/success" element={<AuthSuccessPage />} />

      {/* ------------------------------------------------------------
         🔹 Onboarding
      ------------------------------------------------------------ */}
      <Route
        path="/set-profile"
        element={
          isAuthenticated
            ? isBoarded
              ? <Navigate to="/" />
              : <SetProfilePage />
            : <Navigate to="/auth" />
        }
      />

      {/* ------------------------------------------------------------
         🔹 Main App (Protected)
      ------------------------------------------------------------ */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeLayout />
          </ProtectedRoute>
        }
      />

      {/* ------------------------------------------------------------
         🔹 Settings
      ------------------------------------------------------------ */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* ------------------------------------------------------------
         ❌ 404
      ------------------------------------------------------------ */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
