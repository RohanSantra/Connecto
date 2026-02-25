import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/useAuthStore.js";
import { useThemeStore } from "./store/useThemeStore";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";

import NotFound from "@/pages/NotFound.jsx";
import HomeLayout from "@/pages/Home/HomeLayout.jsx";

// Auth
import AuthEmailPage from "@/pages/Auth/AuthEmailPage.jsx";
import AuthSuccessPage from "@/pages/Auth/AuthSuccessPage.jsx";
import VerifyOtpPage from "@/pages/Auth/VerifyOtpPage.jsx";

// Onboarding
import SetProfilePage from "@/pages/Onboarding/SetProfilePage.jsx";

// Main App Pages
import AppShell from "@/components/app/AppShell";
import SettingsPage from "@/pages/Settings/SettingsPage.jsx";
import CallHistoryPage from "./pages/Call/CallHistoryPage";

// Admin
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";

// Legal
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";

// Loader
import LoaderScreen from "@/components/common/LoaderScreen.jsx";

// Global Call Layer
import GlobalCallUI from "./components/calls/GlobalCallUI";

export default function App() {
  const location = useLocation();
  const { user, loading, checkAuth, isAuthenticated } = useAuthStore();
  const initTheme = useThemeStore((s) => s.initTheme);

  /* ------------------------------------------------------------
     Init Theme
  ------------------------------------------------------------ */
  useEffect(() => {
    initTheme();
  }, []);

  /* ------------------------------------------------------------
     Run checkAuth only once
  ------------------------------------------------------------ */
  const didRunRef = React.useRef(false);

  useEffect(() => {
    if (!didRunRef.current) {
      didRunRef.current = true;
      checkAuth();
    }
  }, []);

  if (loading) {
    return <LoaderScreen />;
  }

  const isBoarded = user?.isBoarded;

  return (
    <>
      <Routes location={location}>

        {/* ================= PUBLIC ROUTES ================= */}

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

        {/* ================= PROTECTED LAYOUT ================= */}

        <Route
          element={
            <ProtectedRoute>
              <HomeLayout />
            </ProtectedRoute>
          }
        >

          {/* Main Chat App */}
          <Route path="/" element={<AppShell />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Calls */}
          <Route path="/calls/history" element={<CallHistoryPage />} />

        </Route>

        {/* ================= ADMIN ================= */}

        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <AdminAnalyticsPage />
            </AdminRoute>
          }
        />

        {/* ================= LEGAL ================= */}

        <Route
          path="/legal/privacy-policy"
          element={<PrivacyPolicyPage />}
        />

        <Route
          path="/legal/terms-of-service"
          element={<TermsOfServicePage />}
        />

        {/* ================= 404 ================= */}

        <Route path="*" element={<NotFound />} />

      </Routes>

      {/* 🌍 GLOBAL CALL UI */}
      <GlobalCallUI />
    </>
  );
}