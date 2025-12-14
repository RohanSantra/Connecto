import { motion } from "framer-motion";
import {
  ShieldCheck,
  MessageCircle,
  Lock,
  KeyRound,
  Wifi,
  Shield,
  ShieldAlert,
} from "lucide-react";
import React, { useState, useEffect } from "react";

export default function LoaderScreen() {
  const phases = [
    "Initializing secure handshake...",
    "Generating encryption keys...",
    "Performing key exchange (ECDH)...",
    "Encrypting communication tunnel...",
    "Verifying device fingerprint...",
    "Establishing end-to-end session...",
    "Syncing trusted nodes...",
  ];

  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setPhaseIndex((i) => (i + 1) % phases.length),
      2200
    );
    return () => clearInterval(timer);
  }, []);

  // ✅ Mobile-safe corner texts + consistent positioning
  const cornerTexts = [
    { pos: "top-4 left-4 sm:top-6 sm:left-6 text-left", text: "cipher://AES-256.RSA-4096.active" },
    { pos: "top-4 right-4 sm:top-6 sm:right-6 text-right", text: "protocol.CONNECTO-secure.v2.7" },
    { pos: "bottom-8 left-4 sm:bottom-6 sm:left-6 text-left", text: "session://handshake.established" },
    { pos: "bottom-8 right-4 sm:bottom-6 sm:right-6 text-right", text: "node://SignalChain.Verified✓" },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center w-screen h-screen bg-background text-foreground overflow-hidden select-none">
      {/* 🌌 Ambient glow */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] blur-3xl opacity-10"
        animate={{ scale: [1, 1.05, 1], opacity: [0.08, 0.18, 0.08] }}
        transition={{ repeat: Infinity, duration: 8 }}
      />

      {/* 🌀 Concentric orbit rings */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-primary/10"
          style={{
            width: `${160 + i * 120}px`,
            height: `${160 + i * 120}px`,
          }}
          animate={{ scale: [1, 1.03, 1], opacity: [0.6, 0.3, 0.6] }}
          transition={{ repeat: Infinity, duration: 7 + i * 1.8 }}
        />
      ))}

      {/* 🛰️ Rotating orbit icons */}
      <motion.div
        className="absolute w-[360px] sm:w-[460px] h-[360px] sm:h-[460px] flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 50, ease: "linear" }}
      >
        {[
          { icon: <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />, top: "8%", left: "65%" },
          { icon: <Lock className="w-5 h-5 sm:w-6 sm:h-6" />, top: "75%", left: "20%" },
          { icon: <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />, top: "25%", right: "10%" },
          { icon: <Wifi className="w-5 h-5 sm:w-6 sm:h-6" />, bottom: "10%", right: "55%" },
          { icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />, top: "40%", left: "8%" },
          { icon: <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />, bottom: "20%", left: "70%" },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={item}
            animate={{ y: [0, -6, 0], opacity: [0.7, 1, 0.7] }}
            transition={{
              repeat: Infinity,
              duration: 5.5 + i * 0.6,
              delay: i * 0.4,
            }}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-background/80 border border-primary/20 shadow-inner flex items-center justify-center backdrop-blur-md text-primary/70">
              {item.icon}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🔐 Central orb */}
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [1, 0.9, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 flex items-center justify-center translate-y-1/4 backdrop-blur-md shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]"
      >
        <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
      </motion.div>

      {/* 💬 Dynamic phase text */}
      <motion.div
        className="mt-10 text-center"
        key={phaseIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, 6] }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      >
        <p className="text-sm sm:text-base text-muted-foreground font-medium flex items-center justify-center gap-2 tracking-wide">
          {phases[phaseIndex]}
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <Lock className="w-4 h-4" />
          </motion.span>
        </p>
      </motion.div>

      {/* 🧩 Corner texts with improved typing */}
      {cornerTexts.map((t, i) => (
        <TypingCornerText key={i} pos={t.pos} text={t.text} delay={i * 0.8} />
      ))}

      {/* 🧠 Footer meta */}
      <motion.p
        className="absolute bottom-2 sm:bottom-4 text-[10px] sm:text-[11px] text-muted-foreground/50 italic tracking-wide text-center w-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 6 }}
      >
        End-to-End Encryption Active · Connecto Secure Network
      </motion.p>
    </div>
  );
}

// ✍️ Typing effect (starts only after its delay)
const TypingCornerText = ({ pos, text, delay = 0 }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const startTimer = setTimeout(() => {
      let i = 0;
      const typing = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(typing);
      }, 35);
    }, delay * 1000);
    return () => clearTimeout(startTimer);
  }, [text, delay]);

  return (
    <motion.div
      className={`absolute ${pos} text-[9px] sm:text-[10px] font-mono text-muted-foreground/40 tracking-widest`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.6 }}
    >
      {displayed}
      <motion.span
        className="inline-block w-[5px] h-2.5 bg-muted-foreground/50 ml-0.5"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    </motion.div>
  );
};
