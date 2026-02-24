"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Smartphone,
  ChevronDown,
  ChevronUp,
  LogOut,
  Trash,
  Monitor,
  Loader2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useAuthStore } from "@/store/useAuthStore";
import DevicesSectionSkeleton from "../Skeleton/DevicesSectionSkeleton";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/* ---------------- Helpers ---------------- */

function shortId(id = "") {
  if (!id) return "—";
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-900/30 text-green-300 border-green-800",
    logged_out: "bg-yellow-900/30 text-yellow-300 border-yellow-800",
    removed: "bg-red-900/30 text-red-300 border-red-800",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-[11px] rounded-full border capitalize",
        styles[status] || styles.active
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function getDeviceIcon(os) {
  if (["Windows", "MacOS", "Linux"].includes(os)) return Monitor;
  return Smartphone;
}

function parseUserAgent(ua = "") {
  const lower = ua.toLowerCase();
  let os = "Unknown";
  let browser = "Unknown";

  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("mac os")) os = "MacOS";
  else if (lower.includes("linux")) os = "Linux";

  if (lower.includes("chrome")) browser = "Chrome";
  else if (lower.includes("safari") && !lower.includes("chrome"))
    browser = "Safari";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("edge")) browser = "Edge";

  return { os, browser };
}

/* ================= Component ================= */

export default function DevicesSection() {
  const {
    devices = [],
    loading,
    fetchDevices,
    logoutDevice,
    deleteDevice,
    setPrimaryDevice,
  } = useDeviceStore();

  const {
    deviceId: localDeviceId,
    logout: logoutCurrentDevice,
  } = useAuthStore();

  const [expanded, setExpanded] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);

  useEffect(() => {
    fetchDevices().catch((err) => toast.error(err.message));
  }, []);

  const sorted = [...devices].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
  });

  const myDevice = devices.find((d) => d.deviceId === localDeviceId);
  const isMyDevicePrimary = myDevice?.isPrimary === true;
  const primaryCount = devices.filter((d) => d.isPrimary).length;

  /* ---------------- Confirm Handler ---------------- */

  const openConfirm = (config) => {
    setAlertConfig(config);
    setAlertOpen(true);
  };

  const handleConfirm = async () => {
    if (!alertConfig?.onConfirm) return;

    setAlertOpen(false);
    await alertConfig.onConfirm();
  };

  /* ================= Actions ================= */

  const handleMakePrimary = (d) => {
    openConfirm({
      title: "Set Primary Device",
      description:
        "This device will become your primary device. Your current primary device will lose primary privileges.",
      onConfirm: async () => {
        const toastId = toast.loading("Updating primary device...");
        try {
          await setPrimaryDevice(d.deviceId);
          toast.success("Primary device updated successfully.", {
            id: toastId,
          });
        } catch (err) {
          toast.error(err.message || "Failed to update primary device.", {
            id: toastId,
          });
        }
      },
    });
  };

  const handleLogout = (d, isThisDevice) => {
    openConfirm({
      title: "Logout Device",
      description: isThisDevice
        ? "You will be logged out from this device and will need to sign in again."
        : "This will log out this device and revoke all active sessions.",
      onConfirm: async () => {
        if (isThisDevice) {
          logoutCurrentDevice();
          return;
        }

        setProcessingId(d.deviceId);
        const toastId = toast.loading("Logging out device...");

        try {
          await logoutDevice(d.deviceId);
          toast.success("Device logged out successfully.", {
            id: toastId,
          });
        } catch (err) {
          toast.error(err.message || "Failed to logout device.", {
            id: toastId,
          });
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const handleRemove = (d) => {
    if (d.isPrimary && primaryCount === 1) {
      toast.error(
        "You must assign another device as primary before removing this one."
      );
      return;
    }

    openConfirm({
      title: "Remove Device",
      description:
        "This device will be permanently removed and all sessions will be revoked. This action cannot be undone.",
      onConfirm: async () => {
        setProcessingId(d.deviceId);
        const toastId = toast.loading("Removing device...");

        try {
          await deleteDevice(d.deviceId);
          toast.success("Device removed successfully.", { id: toastId });
        } catch (err) {
          toast.error(err.message || "Failed to remove device.", {
            id: toastId,
          });
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  /* ================= Render ================= */

  return (
    <>
      <div className="space-y-4 w-full max-w-4xl mx-auto px-3 sm:px-4">

        <div>
          <h2 className="text-lg sm:text-xl font-semibold">
            Devices & Sessions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Devices currently linked to your account.
          </p>
        </div>

        {loading ? (
          <DevicesSectionSkeleton />
        ) : (
          <div className="space-y-3">
            {sorted.map((d) => {
              const isExpanded = expanded === d.deviceId;
              const isThisDevice = d.deviceId === localDeviceId;
              const { os, browser } = parseUserAgent(d.deviceName || "");
              const Icon = getDeviceIcon(os);

              return (
                <div
                  key={d.deviceId}
                  className="rounded-xl border bg-card overflow-hidden"
                >
                  {/* HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4">

                    {/* Icon */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm sm:text-base truncate">
                          {os} • {browser}
                        </span>

                        {d.isPrimary && (
                          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-primary/10">
                            Primary
                          </span>
                        )}

                        {isThisDevice && (
                          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded border">
                            This device
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                        Last active:{" "}
                        {d.lastSeen
                          ? format(new Date(d.lastSeen), "dd MMM yyyy, hh:mm a")
                          : "—"}
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <StatusBadge status={d.status} />

                      <button
                        onClick={() =>
                          setExpanded(isExpanded ? null : d.deviceId)
                        }
                        className="p-1 rounded hover:bg-muted/10"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED */}
                  {isExpanded && (
                    <div className="border-t px-4 py-4 space-y-4 bg-muted/20">

                      <div className="text-xs text-muted-foreground break-all">
                        Device ID: {shortId(d.deviceId)}
                      </div>

                      {isMyDevicePrimary && (
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">

                          {!d.isPrimary && (
                            <button
                              onClick={() => handleMakePrimary(d)}
                              disabled={processingId === d.deviceId}
                              className="w-full sm:w-auto px-3 py-2 rounded-md border text-sm flex items-center justify-center gap-2"
                            >
                              <Star className="w-4 h-4" />
                              Make Primary
                            </button>
                          )}

                          {d.status === "active" && (
                            <button
                              onClick={() => handleLogout(d, isThisDevice)}
                              disabled={processingId === d.deviceId}
                              className="w-full sm:w-auto px-3 py-2 rounded-md border text-sm flex items-center justify-center gap-2"
                            >
                              {processingId === d.deviceId ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <LogOut className="w-4 h-4" />
                                  {isThisDevice
                                    ? "Logout this device"
                                    : "Logout device"}
                                </>
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleRemove(d)}
                            disabled={processingId === d.deviceId}
                            className="w-full sm:w-auto px-3 py-2 rounded-md border text-destructive text-sm flex items-center justify-center gap-2"
                          >
                            <Trash className="w-4 h-4" />
                            Remove
                          </button>

                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== Alert Dialog ========== */}

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertConfig?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertConfig?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId !== null} className="px-2">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await handleConfirm();
              }}
              disabled={processingId !== null}
              className="px-2"
            >
              {processingId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}