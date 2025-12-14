import { motion } from "framer-motion";
import React from "react";

const ConnectoLogo = ({ size = 64, animated = true }) => (
  <div
    className="relative flex items-center justify-center text-primary"
    style={{ width: size, height: size }}
  >
    {/* Subtle glow based on theme color */}
    {animated && (
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, currentColor 20%, transparent 70%)",
          opacity: 0.15,
          filter: "blur(6px)",
        }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ repeat: Infinity, duration: 6 }}
      />
    )}

    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className="relative z-10 w-full h-full"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer encrypted signal arc */}
      <motion.path
        d="M48 32a16 16 0 1 0-16 16"
        strokeWidth="2.2"
        animate={animated ? { opacity: [0.3, 1, 0.3] } : {}}
        transition={{ repeat: Infinity, duration: 4 }}
      />

      {/* Inner fast communication arc */}
      <motion.path
        d="M44 32a12 12 0 1 0-12 12"
        strokeWidth="2"
        animate={animated ? { pathLength: [0.8, 1, 0.8] } : {}}
        transition={{ repeat: Infinity, duration: 5 }}
      />

      {/* Center dot (perfectly centered pulse) */}
      <motion.circle
        cx="32"
        cy="34" 
        r="3"
        fill="currentColor"
        strokeWidth={1.25}
        // animate={
        //   animated
        //     ? { scale: [1.20, 1.25, 1.20], opacity: [0.7, 1, 0.7] }
        //     : {}
        // }
        transition={{ repeat: Infinity, duration: 2.8 }}
      />

      {/* Lock arc (shifted + curved precisely above the dot) */}
      <motion.path
        d="M29 32v-2.5a3 3 0 0 1 6 0V32"
        strokeWidth="1.6"
        // animate={animated ? { scale: [1, 1.02, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3 }}
      />
    </motion.svg>
  </div>
);


export default ConnectoLogo;