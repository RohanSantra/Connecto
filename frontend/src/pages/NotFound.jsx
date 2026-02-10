"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  ArrowLeft,
  Search,
  Bug,
  MessageCircle,
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
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 10 + (i % 5) })
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join(""),
      left: Math.random() * 94,
      top: Math.random() * 92,
      opacity: 0.04 + Math.random() * 0.08,
      size: 10 + (i % 4),
      rotate: -6 + Math.random() * 12,
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
    else setError("Hmm… couldn’t find a matching place.");
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden">
      {/* Background encryption */}
      {encrypted.map((e) => (
        <motion.div
          key={e.id}
          className="absolute font-mono tracking-widest text-foreground select-none"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            fontSize: `${e.size}px`,
            opacity: e.opacity,
            transform: `rotate(${e.rotate}deg)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: e.opacity }}
          transition={{ duration: 1 }}
        >
          {e.text}
        </motion.div>
      ))}

      {/* Main glass panel */}
      <section
        className="
          relative z-10
          w-full max-w-5xl mx-6
          rounded-3xl
          border border-background/20
          bg-background/10
          backdrop-blur-2xl
          shadow-[0_0_60px_rgba(0,0,0,0.35)]
          grid grid-cols-1 lg:grid-cols-2
          min-h-[60vh]
        "
      >
        {/* Left */}
        <div className="p-8 lg:p-12 flex flex-col justify-center gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold">
              Page not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-prose">
              The page{" "}
              <span className="font-mono">{location.pathname}</span>{" "}
              doesn’t exist or may have moved.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/")}>
              <Home className="w-4 h-4" />
              Go Home
            </Button>

            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>

            <Button
              variant="outline"
              className="ml-auto"
              onClick={() =>
              (window.location.href =
                "mailto:support@connecto.app?subject=Broken link")
              }
            >
              <Bug className="w-4 h-4" />
              Report
            </Button>
          </div>

          <form onSubmit={handleSearch} className="max-w-md">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try: settings, calls, privacy…"
                className="flex-1 px-4 py-3 rounded-lg bg-background/6 border text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </form>
        </div>

        {/* Right chat illustration */}
        <div className="p-6 sm:p-8 flex items-center justify-center">
          <div
            className="
              w-full max-w-md
              rounded-2xl
              border
              bg-background/5
              backdrop-blur-xl
              shadow-2xl
              p-4
            "
          >
            <div className="flex items-center gap-3 mb-4 border-b pb-3">
              <div className="w-9 h-9 rounded-full bg-background/10 border flex items-center justify-center">
                <ConnectoLogo />
              </div>
              <div>
                <div className="text-sm font-medium">Connecto</div>
                <div className="text-xs text-muted-foreground">
                  Secure navigation
                </div>
              </div>
            </div>

            {/* Chat bubbles */}
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
                <Lock className="w-4 h-4" /> Encrypted
              </span>
              <span className="font-mono">AES-256</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
