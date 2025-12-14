// src/store/useUIStore.js
import { create } from "zustand";

export const useUIStore = create((set) => ({

    /* ===============================
       OVERLAYS & MODALS
    ================================ */
    newChatOpen: false,
    newGroupOpen: false,
   //  profileOpen: false,
   //  settingsOpen: false,
    helpOpen: false,

    // chat-specific overlays
    detailsPanelOpen: false,
    mediaDocsOpen: false,
    chatMenuOpen: false, // 3-dots menu

    /* ===============================
       MOBILE VIEW MODE
       "sidebar" | "chat" | "details"
    ================================ */
    view: "sidebar",
    setView: (v) => set({ view: v }),

    /* ===============================
       NEW CHAT
    ================================ */
    openNewChat: () => set({ newChatOpen: true }),
    closeNewChat: () => set({ newChatOpen: false }),
    toggleNewChat: () =>
        set((s) => ({ newChatOpen: !s.newChatOpen })),

    /* ===============================
       NEW GROUP
    ================================ */
    openNewGroup: () => set({ newGroupOpen: true }),
    closeNewGroup: () => set({ newGroupOpen: false }),
    toggleNewGroup: () =>
        set((s) => ({ newGroupOpen: !s.newGroupOpen })),

   // Directly handled at settings page 
   //  /* ===============================
   //     PROFILE OVERLAY
   //  ================================ */
   //  openProfile: () => set({ profileOpen: true }),
   //  closeProfile: () => set({ profileOpen: false }),
   //  toggleProfile: () =>
   //      set((s) => ({ profileOpen: !s.profileOpen })),

   //  /* ===============================
   //     SETTINGS OVERLAY
   //  ================================ */
   //  openSettings: () => set({ settingsOpen: true }),
   //  closeSettings: () => set({ settingsOpen: false }),
   //  toggleSettings: () =>
   //      set((s) => ({ settingsOpen: !s.settingsOpen })),

    /* ===============================
       HELP MODAL
    ================================ */
    openHelp: () => set({ helpOpen: true }),
    closeHelp: () => set({ helpOpen: false }),
    toggleHelp: () =>
        set((s) => ({ helpOpen: !s.helpOpen })),

    /* ===============================
       DETAILS PANEL (Profile view)
    ================================ */
    openDetailsPanel: () => set({ detailsPanelOpen: true }),
    closeDetailsPanel: () => set({ detailsPanelOpen: false }),
    toggleDetailsPanel: () =>
        set((s) => ({ detailsPanelOpen: !s.detailsPanelOpen })),

    // Full-screen details on mobile
    openDetailsView: () =>
        set({ detailsPanelOpen: true, view: "details" }),

    /* ===============================
       MEDIA & DOCUMENTS OVERLAY
    ================================ */
    openMediaDocs: () => set({ mediaDocsOpen: true }),
    closeMediaDocs: () => set({ mediaDocsOpen: false }),

    /* ===============================
       CHAT MENU (3 dots)
    ================================ */
    openChatMenu: () => set({ chatMenuOpen: true }),
    closeChatMenu: () => set({ chatMenuOpen: false }),
    toggleChatMenu: () =>
        set((s) => ({ chatMenuOpen: !s.chatMenuOpen })),

    /* ===============================
       VIEW HELPERS (Mobile nav)
    ================================ */
    openSidebarView: () => set({ view: "sidebar" }),
    openChatView: () => set({ view: "chat" }),

}));
