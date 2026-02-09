import IncomingCallDialog from "./IncomingCallDialog";
import OutgoingCallDialog from "./OutgoingCallDialog";
import InCallPanel from "./InCallPanel";
import useCallStore from "@/store/useCallStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import RejoinCallOverlay from "./RejoinCallOverlay";

function CallUILoader() {
    return (
        <div className="fixed inset-0 z-[1000] pointer-events-none" />
    );
}

function WebRTCBridge() {
    const activeCall = useCallStore((s) => s.activeCall);
    if (!activeCall) return null;

    useWebRTC({
        callId: activeCall._id || activeCall.callId,
        chatId: activeCall.chatId,
    });

    return null;
}

export default function GlobalCallUI() {
    const incomingCall = useCallStore((s) => s.incomingCall);
    const activeCall = useCallStore((s) => s.activeCall);
    const inCall = useCallStore((s) => s.inCall);
    const hasHydrated = useCallStore((s) => s.hasHydrated);

    const myId = useProfileStore((s) => s.profile?.userId);



    const callId = activeCall?._id ?? activeCall?.callId;
    const chatId = activeCall?.chatId ?? incomingCall?.chatId;

    const isCaller =
        activeCall &&
        String(activeCall.callerId) === String(myId) &&
        activeCall.status === "ringing";

    const hasMedia =
        !!useCallStore.getState().localStream ||
        Object.keys(useCallStore.getState().remoteStreams || {}).length > 0;

    const shouldShowRejoin =
        !!activeCall &&
        activeCall.status === "accepted" &&
        !hasMedia;

    // ⛔ wait for hydration — prevents flicker
    if (!hasHydrated) return <CallUILoader />;

    return (
        <>
            {incomingCall && <IncomingCallDialog />}
            {isCaller && <OutgoingCallDialog />}
            {activeCall && <WebRTCBridge />}
            {inCall && <InCallPanel callId={callId} />}
            {shouldShowRejoin && <RejoinCallOverlay />}
        </>
    );
}
