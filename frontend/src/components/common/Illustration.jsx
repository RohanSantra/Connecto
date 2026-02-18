"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Lock, User } from "lucide-react";
import ConnectoLogo from "./ConnectoLogo";

export default function RightSideIllustration({ showOn = "lg" }) {
  const prefersReducedMotion = useReducedMotion();
  const hiddenClass = showOn === "lg" ? "hidden lg:flex" : "flex";

  /* ---------------- Static encrypted background ---------------- */
  const encryptedText = useMemo(() => {
    const chars = "ABCDEF0123456789";
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 12 + Math.random() * 8 })
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join(""),
      left: Math.random() * 96,
      top: Math.random() * 96,
      opacity: 0.06 + Math.random() * 0.12,
      size: 10 + Math.random() * 6,
    }));
  }, []);

  /* ---------------- Flow state ---------------- */
  const [flow, setFlow] = useState("email");
  const [step, setStep] = useState(0);

  /* Faster step animation – runs once */
  useEffect(() => {
    setStep(0);
    const steps = 5;
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= steps) clearInterval(timer);
    }, 500);

    return () => clearInterval(timer);
  }, [flow]);

  /* ---------------- Message scripts ---------------- */
  const emailFlow = [
    "👋 Hey! Welcome to Connecto.",
    "Drop your email to begin.",
    "We’ll send you a secure OTP.",
    "OTP verified. All good.",
    "Time to set up your profile →",
  ];

  const googleFlow = [
    "👋 Hey! Welcome to Connecto.",
    "Want to Authenticate with Google.",
    "It is instant.",
    "No OTPs needed.",
    "Just finish your profile →",
  ];

  const activeMessages = flow === "email" ? emailFlow : googleFlow;

  return (
    <aside
      className={`${hiddenClass} relative w-full h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5`}
      aria-hidden
    >
      {/* Encrypted background */}
      {encryptedText.map((e) => (
        <motion.pre
          key={e.id}
          className="absolute font-mono tracking-widest text-muted-foreground select-none"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            fontSize: `${e.size}px`,
            opacity: e.opacity,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: e.opacity }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {e.text}
        </motion.pre>
      ))}

      {/* Glass container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="
            relative z-10
            w-[76%] h-[76%]
            rounded-3xl
            border
            bg-background/10 dark:bg-foregound/30
            backdrop-blur-2xl
            shadow-[0_0_60px_rgba(0,0,0,0.35)]
            flex flex-col
          "
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header + toggle */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-background/15 border flex items-center justify-center">
                <ConnectoLogo/>
              </div>
              <div>
                <div className="text-sm font-semibold">Connecto</div>
                <div className="text-xs text-muted-foreground">
                  {flow === "email" ? "Email Authentication flow" : "Google Authentication flow"}
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex gap-1 bg-background/10 border rounded-full p-1 text-xs">
              <button
                onClick={() => setFlow("email")}
                className={`px-3 py-1 rounded-full transition ${
                  flow === "email"
                    ? "bg-primary text-primary-foreground"
                    : "text-primary-background"
                }`}
              >
                Email
              </button>
              <button
                onClick={() => setFlow("google")}
                className={`px-3 py-1 rounded-full transition ${
                  flow === "google"
                    ? "bg-primary text-primary-foreground"
                    : "text-primary-background"
                }`}
              >
                Google
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 px-6 py-6 space-y-4 overflow-hidden">
            {activeMessages.slice(0, step).map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`max-w-[72%] px-4 py-3 rounded-xl text-sm shadow-sm border ${
                  i % 2 === 1
                    ? "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)] ml-auto"
                    : "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]"
                }`}
              >
                {text}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              End-to-end encrypted
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile setup required
            </div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}
