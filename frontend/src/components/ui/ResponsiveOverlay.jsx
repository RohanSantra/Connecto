import React from "react";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";

// ShadCN Components
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from "@/components/ui/drawer";

/**
 * 🚀 ResponsiveOverlay
 * Automatically switches:
 * - Mobile → Drawer
 * - Desktop → Dialog
 *
 * Props:
 * - open
 * - onOpenChange
 * - title
 * - description (optional)
 * - children → main content
 * - footer → actions (buttons)
 */
export default function ResponsiveOverlay({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className = "",
}) {
    const { isMobile } = useResponsiveDrawer();

    /* ==========================================================
       🟦 Desktop — use Dialog
       ========================================================== */
    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className={`max-w-lg w-full rounded-xl p-0 overflow-hidden ${className}`}
                >
                    {(title || description) && (
                        <DialogHeader className="px-4 pt-4 pb-2 border-b">
                            {title && <DialogTitle>{title}</DialogTitle>}
                            {description && (
                                <DialogDescription>{description}</DialogDescription>
                            )}
                        </DialogHeader>
                    )}

                    <div className="p-4 max-h-[70vh] overflow-y-auto">{children}</div>

                    {footer && (
                        <DialogFooter className="px-4 pb-4 pt-2 border-t">
                            {footer}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        );
    }

    /* ==========================================================
       🟩 Mobile — use Drawer
       ========================================================== */
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className={`p-0 rounded-t-xl ${className}`}>
                {(title || description) && (
                    <DrawerHeader className="px-4 pt-4 pb-2 border-b">
                        {title && <DrawerTitle>{title}</DrawerTitle>}
                        {description && (
                            <DrawerDescription>{description}</DrawerDescription>
                        )}
                    </DrawerHeader>
                )}

                <div className="p-4 max-h-[65vh] overflow-y-auto">{children}</div>

                {footer && (
                    <DrawerFooter className="px-4 pb-4 pt-2 border-t">
                        {footer}
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}
