"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  ArrowLeft,
  Search,
  Bug,
  Lock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ConnectoLogo from "@/components/common/ConnectoLogo";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  /* ---------------- Encrypted background ---------------- */
  const encrypted = useMemo(() => {
    const chars = "ABCDEF0123456789";
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 8 + (i % 4) })
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join(""),
      left: Math.random() * 95,
      top: Math.random() * 95,
      opacity: 0.03 + Math.random() * 0.06,
      size: 10 + (i % 3),
    }));
  }, []);

  /* ---------------- Smart search ---------------- */
  const routeMap = [
    { keys: ["home", "chat"], path: "/" },
    { keys: ["login", "auth", "signin"], path: "/auth" },
    { keys: ["profile", "setup", "onboarding"], path: "/set-profile" },
    { keys: ["settings", "preferences"], path: "/settings" },
    { keys: ["calls", "history"], path: "/calls/history" },
    { keys: ["privacy"], path: "/legal/privacy-policy" },
    { keys: ["terms", "tos"], path: "/legal/terms-of-service" },
  ];

  function handleSearch(e) {
    e.preventDefault();
    setError("");
    const q = query.toLowerCase().trim();
    if (!q) return;

    const match = routeMap.find((r) =>
      r.keys.some((k) => q.includes(k))
    );

    if (match) navigate(match.path);
    else setError("Couldn't find a matching page.");
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden px-4 sm:px-6">

      {/* Background encryption (lighter on mobile) */}
      <div className="hidden sm:block">
        {encrypted.map((e) => (
          <motion.div
            key={e.id}
            className="absolute font-mono text-foreground select-none"
            style={{
              left: `${e.left}%`,
              top: `${e.top}%`,
              fontSize: `${e.size}px`,
              opacity: e.opacity,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: e.opacity }}
            transition={{ duration: 1 }}
          >
            {e.text}
          </motion.div>
        ))}
      </div>

      {/* Main Panel */}
      <section
        className="
          relative z-10
          w-full
          max-w-6xl
          rounded-2xl sm:rounded-3xl
          border
          bg-background/10
          backdrop-blur-2xl
          shadow-2xl
          grid
          grid-cols-1
          lg:grid-cols-2
          overflow-hidden
        "
      >
        {/* Left Side */}
        <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">
              Page not found
            </h1>

            <p className="mt-3 text-sm sm:text-base text-muted-foreground break-words">
              The page{" "}
              <span className="font-mono text-xs sm:text-sm">
                {location.pathname}
              </span>{" "}
              doesn’t exist or may have moved.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <Button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>

            <Button
              variant="outline"
              onClick={() =>
              (window.location.href =
                "mailto:support@connecto.app")
              }
              className="w-full sm:w-auto"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report
            </Button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try: settings, calls..."
                className="
                  flex-1
                  px-4 py-3
                  rounded-lg
                  bg-background/6
                  border
                  text-sm
                  focus:outline-none
                "
              />
              <button
                type="submit"
                className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Right Side Illustration */}
        <div className="hidden lg:flex items-center justify-center p-8 bg-background/5">
          <div className="w-full rounded-2xl border bg-background/5 backdrop-blur-xl shadow-xl p-6">

            <div className="flex items-center gap-3 mb-4 border-b pb-3">
              <div className="w-9 h-9 rounded-full bg-background/10 border flex items-center justify-center">
                <ConnectoLogo />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Connecto
                </div>
                <div className="text-xs text-muted-foreground">
                  Secure navigation
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="max-w-[72%] px-4 py-3 rounded-xl text-sm shadow-sm border bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]">
                👀 This page seems to have gone offline.
              </div>

              <div className="max-w-[72%] px-4 py-3 rounded-xl text-sm shadow-sm border bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)] ml-auto">
                Either it never existed… or it moved quietly.
              </div>

              <div className="max-w-[72%] px-4 py-3 rounded-xl text-sm shadow-sm border bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]">
                You can head back, go home, or try searching.
              </div>

              <div className="max-w-[72%] px-4 py-3 rounded-xl text-sm shadow-sm border bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)] ml-auto">
                We’ll stay right here if you need help 🙂
              </div>
            </div>

            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Encrypted
              </span>
              <span className="font-mono">
                AES-256
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
