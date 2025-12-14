import { cn } from "@/lib/utils";

/**
 * 🌿 EmptyState
 * A clean reusable empty screen component for “no data” states.
 */
export default function EmptyState({
  icon,
  title = "No chats yet",
  message = "Start a conversation or create a group to get started.",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center text-muted-foreground py-12 px-6 select-none",
        className
      )}
    >
      {icon && <div className="mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm max-w-xs">{message}</p>
    </div>
  );
}






