"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import ConnectoLogo from "@/components/common/ConnectoLogo";

export default function LoaderScreen({ isReady }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const mountTime = useRef(Date.now());

  // Ensure loader shows at least 500ms (prevents flash)
  useEffect(() => {
    if (!isReady) return;

    const elapsed = Date.now() - mountTime.current;
    const remaining = Math.max(0, 500 - elapsed);

    const t = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(t);
  }, [isReady]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.995,
            filter: reduceMotion ? "none" : "blur(4px)",
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[999] bg-background flex flex-col overflow-hidden"
        >
          {/* Balanced vertical space for tall screens */}
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

          {/* Adaptive glow */}
          <motion.div
            className="absolute rounded-full blur-3xl bg-primary/10 dark:bg-primary/25"
            style={{
              width: "min(55vw, 420px)",
              height: "min(55vw, 420px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            animate={
              reduceMotion
                ? {}
                : { scale: [1, 1.06, 1], opacity: [0.45, 0.8, 0.45] }
            }
            transition={{
              repeat: Infinity,
              duration: 4,
              ease: "easeInOut",
            }}
          />

          {/* Center Content */}
          <div className="relative flex-1 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-7 text-center">

              {/* Logo */}
              <motion.div
                animate={
                  reduceMotion ? {} : { scale: [1, 1.04, 1] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2,
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center"
              >
                <ConnectoLogo />
              </motion.div>

              {/* Refined cryptographic shimmer */}
              <div className="relative w-36 h-[2px] bg-border/60 rounded-full overflow-hidden">
                {!reduceMotion && (
                  <motion.div
                    className="absolute top-0 h-full w-16 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                    animate={{ x: ["-150%", "250%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.2,
                      ease: "linear",
                    }}
                  />
                )}
              </div>

              {/* Status text */}
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                {!reduceMotion && (
                  <motion.span
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                  />
                )}
                <span className="tracking-wide">
                  Establishing secure session
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-6 text-center text-xs sm:text-sm text-muted-foreground/60 tracking-wide">
            End-to-End Encryption Enabled
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
