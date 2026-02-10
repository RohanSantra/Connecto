import { cn } from "@/lib/utils";

export default function EmptyState({
  icon,
  className,
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center select-none",
        "text-muted-foreground py-14 px-6",
        className
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-4 flex items-center justify-center rounded-full bg-muted/20 p-4 text-primary"
        >
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-foreground mb-1">
        No chats yet
      </h3>

      <p className="text-sm max-w-sm leading-relaxed">
        Start a private conversation or create a group to message and call securely.
      </p>

      {/* Shortcut hints */}
      <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 rounded-md bg-muted border font-medium">
            Alt
          </kbd>
          <span>+</span>
          <kbd className="px-2 py-0.5 rounded-md bg-muted border font-medium">
            N
          </kbd>
          <span>New chat</span>
        </div>

        <div className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 rounded-md bg-muted border font-medium">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-2 py-0.5 rounded-md bg-muted border font-medium">
            G
          </kbd>
          <span>Create group</span>
        </div>
      </div>
    </div>
  );
}
