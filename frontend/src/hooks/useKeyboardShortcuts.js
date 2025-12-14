import { useEffect, useRef } from "react";

export function useKeyboardShortcuts(actions = {}) {
  const actionsRef = useRef(actions);

  // keep latest actions
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const {
        onGlobalSearch,
        onNewChat,
        onNewGroup,
        onToggleDetails,
        onOpenSettings,
        onHelp,
        onCloseChat,     // <-- NEW
      } = actionsRef.current;

      const active = document.activeElement;
      const tag = active?.tagName?.toUpperCase();
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        active?.isContentEditable;

      // If typing inside input, skip unless ctrl/meta is pressed
      if (isTyping && !e.ctrlKey && !e.metaKey) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      /** -------------------------
       *    FINAL KEYBINDINGS
       * ------------------------- */

      // Command Palette - CTRL + K
      if (ctrl && key === "k") {
        e.preventDefault();
        onGlobalSearch?.();
      }

      // New Chat - CTRL + ALT + N
      if (alt && key === "n") {
        e.preventDefault();
        onNewChat?.();
      }

      // New Group - CTRL + G
      if (ctrl && key === "g") {
        e.preventDefault();
        onNewGroup?.();
      }

      // Toggle Details - CTRL + D
      if (ctrl && key === "d") {
        e.preventDefault();
        onToggleDetails?.();
      }

      // Settings - CTRL + ,
      if (ctrl && key === ",") {
        e.preventDefault();
        onOpenSettings?.();
      }

      // Help - CTRL + /
      if (ctrl && key === "/") {
        e.preventDefault();
        onHelp?.();
      }

      // 🚀 NEW: Close Chat - CTRL + X
      if (ctrl && key === "x") {
        e.preventDefault();
        onCloseChat?.();     // <-- This will close chatArea
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
