import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useUIStore } from "@/store/useUIStore";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import DetailsPanel from "../chat/ChatDetailsPanel";

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";

import LoaderScreen from "@/components/common/LoaderScreen";

import NewChatOverlay from "@/components/chat/NewChatOverlay";
import NewGroupOverlay from "@/components/chat/NewGroupOverlay";
import { useBlockStore } from "@/store/useBlockStore";

import { initSocket, getSocket } from "@/lib/socket";
import { attachSocketHandlers } from "@/lib/socketHandlers";
import GlobalCallUI from "../calls/GlobalCallUI";
import ShortcutsModal from "../common/ShortcutsModal";

export default function AppShell() {
    const navigate = useNavigate();
    const { isMobile } = useResponsiveDrawer();

    /* ---------------- STORE HOOKS ---------------- */
    const { fetchChats } = useChatStore();

    const { profile, profileLoading } = useProfileStore();
    const {
        openCommandPalette,
        openNewChat,
        openNewGroup,
        openSettings,
        toggleDetailsPanel,
        openHelp,
        view,
        detailsPanelOpen,
        closeDetailsPanel,
    } = useUIStore();

    /* -------------------------------------------------------
       2️⃣ Fetch chats ONLY after profile is loaded
    ------------------------------------------------------- */
    useEffect(() => {
        const init = async () => {
            if (profileLoading || !profile) return;

            const blockStore = useBlockStore.getState();

            await blockStore.fetchBlocks();          // 1️⃣ load blocks first
            await fetchChats();                      // 2️⃣ then load chats

            const { blockedUsers, blockedChats } = useBlockStore.getState();
            blockStore.syncBlockedStateToChats(blockedUsers, blockedChats); // 3️⃣ apply block state
        };

        init();
    }, [profileLoading, profile]);

    useEffect(() => {
        if (!profile) return;

        const socket = initSocket({
            accessToken: profile.accessToken || null, // or from auth store if stored there
            userId: profile.userId,
            deviceId: profile.deviceId,
        });

        attachSocketHandlers(socket); // 🔥 Connects calls, messages, etc.
    }, [profile]);

    /* -------------------------------------------------------
       3️⃣ Global keyboard shortcuts
    ------------------------------------------------------- */
    useKeyboardShortcuts({
        onNewChat: openNewChat,             // ALT + N
        onNewGroup: openNewGroup,           // CTRL + G
        // Todo 
        onToggleDetails: toggleDetailsPanel, // CTRL + D
        onOpenSettings: openSettings,       // CTRL + ,
        onHelp: openHelp,                   // CTRL + /
    });

    /* -------------------------------------------------------
       4️⃣ Loading Screen
    ------------------------------------------------------- */
    if (profileLoading && !profile) {
        return <LoaderScreen />;
    }

    return (
        <div className="w-full h-screen flex flex-col bg-background">

            {/* ------------ Global overlays ALWAYS mounted ------------ */}
            <NewChatOverlay />
            <NewGroupOverlay />
            <ShortcutsModal/>

            {/* ------------ DESKTOP LAYOUT ------------ */}
            {!isMobile ? (
                <ResizablePanelGroup
                    direction="horizontal"
                    className="flex-1"
                >
                    <ResizablePanel
                        defaultSize={30}
                        minSize={28}
                        maxSize={40}
                    >
                        <Sidebar />
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel>
                        <ChatArea />
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                /* ------------ MOBILE LAYOUT ------------ */
                <div className="flex-1 relative overflow-hidden">

                    {view === "sidebar" && (
                        <div className="absolute inset-0 z-30 bg-background">
                            <Sidebar />
                        </div>
                    )}

                    {view === "chat" && (
                        <div className="absolute inset-0 z-40 bg-background">
                            <ChatArea />
                        </div>
                    )}

                    {view === "details" && (
                        <div className="absolute inset-0 z-50 bg-background">
                            <DetailsPanel />
                        </div>
                    )}
                </div>
            )}

            {/* ------------ UNIVERSAL DETAILS PANEL (DESKTOP) ------------ */}
            {!isMobile && detailsPanelOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
                        onClick={closeDetailsPanel}
                    />

                    <div className="fixed inset-y-0 right-0 z-50 w-[420px] max-w-[90vw]">
                        <DetailsPanel />
                    </div>
                </>
            )}
            {/* 🌍 GLOBAL CALL LAYER */}
            <GlobalCallUI />

        </div>
    );
}
