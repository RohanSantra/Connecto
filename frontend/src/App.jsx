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

// Legal
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";

import { useThemeStore } from "./store/useThemeStore";
import { useBlockStore } from "./store/useBlockStore";
import CallHistoryPage from "./pages/Call/CallHistoryPage";
import AdminRoute from "./routes/AdminRoute";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";


export default function App() {
  const location = useLocation();
  const { user, loading, checkAuth, isAuthenticated } = useAuthStore();
  const initTheme = useThemeStore((s) => s.initTheme);

  // TO get the theme selected
  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("scroll-thumb-only");
  }, []);

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
    return <LoaderScreen />;
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
         🔹 Calls History
      ------------------------------------------------------------ */}
      <Route
        path="/calls/history"
        element={
          <ProtectedRoute>
            <CallHistoryPage />
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
         🔹 Legal
      ------------------------------------------------------------ */}
      <Route
        path="/legal/privacy-policy"
        element={
          <PrivacyPolicyPage />
        }
      />
      <Route
        path="/legal/terms-of-service"
        element={
          <TermsOfServicePage />
        }
      />
      {/* ------------------------------------------------------------
         🔹 Admin Analytical page
      ------------------------------------------------------------ */}
      <Route
        path="/admin/analytics"
        element={
          <AdminRoute>
            <AdminAnalyticsPage />
          </AdminRoute>
        }
      />

      {/* ------------------------------------------------------------
         ❌ 404
      ------------------------------------------------------------ */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
