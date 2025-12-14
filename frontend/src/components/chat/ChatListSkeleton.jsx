export default function ChatListSkeleton() {
    return (
        <div className="animate-pulse px-3 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 py-3 border-b border-border/50"
                >
                    <div className="w-11 h-11 bg-muted rounded-full" />

                    <div className="flex-1 space-y-2">
                        <div className="w-2/3 h-3 bg-muted rounded" />
                        <div className="w-1/3 h-3 bg-muted rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}
