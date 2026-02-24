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
  Apple,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useAuthStore } from "@/store/useAuthStore";
import DevicesSectionSkeleton from "../Skeleton/DevicesSectionSkeleton";
import { toast } from "sonner";

/* --------------------------------
   Helpers
-------------------------------- */

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
  if (os === "Windows" || os === "MacOS" || os === "Linux")
    return Monitor;
  if (os === "Android" || os === "iOS")
    return Smartphone;
  return Smartphone;
}


/* --------------------------------
   Devices Section
-------------------------------- */

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


export default function DevicesSection() {
  const {
    devices = [],
    loading,
    fetchDevices,
    logoutDevice,
    deleteDevice,
  } = useDeviceStore();
  const [processingId, setProcessingId] = useState(null);
  const {
    deviceId: localDeviceId,
    logout: logoutCurrentDevice,
  } = useAuthStore();

  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        await fetchDevices();
      } catch (err) {
        toast.error(err.message);
      }
    };

    load();
  }, []);

  const sorted = [...devices].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
  });

  const handleLogoutDevice = async (deviceId) => {
    if (processingId) return;

    setProcessingId(deviceId);
    const toastId = toast.loading("Logging out device...");

    try {
      await logoutDevice(deviceId);
      toast.success("Device logged out successfully.", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to logout device.", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (processingId) return;

    setProcessingId(deviceId);
    const toastId = toast.loading("Removing device...");

    try {
      await deleteDevice(deviceId);
      toast.success("Device removed successfully.", { id: toastId });
    } catch (err) {
      toast.error(err?.message || "Failed to remove device.", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="theme-animate space-y-4 w-full max-w-4xl mx-auto px-3 sm:px-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Devices & Sessions</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Devices currently linked to your account. Sessions are managed
          automatically per device.
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <DevicesSectionSkeleton />
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => {
            const isExpanded = expanded === d.deviceId;
            const isThisDevice = d.deviceId === localDeviceId;

            return (
              <div
                key={d.deviceId}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                  <div className="w-11 h-11 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    {(() => {
                      const { os } = parseUserAgent(d.deviceName || "");
                      const Icon = getDeviceIcon(os);
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const { os, browser } = parseUserAgent(d.deviceName || "");
                        return (
                          <span className="font-medium">
                            {os} • {browser}
                          </span>
                        );
                      })()}

                      {d.isPrimary && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10">
                          Primary
                        </span>
                      )}

                      {isThisDevice && (
                        <span className="text-xs px-2 py-0.5 rounded border">
                          This device
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      Last active:{" "}
                      {d.lastSeen
                        ? format(new Date(d.lastSeen), "dd MMM yyyy, hh:mm a")
                        : "—"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">                    <StatusBadge status={d.status} />
                    <button
                      onClick={() =>
                        setExpanded(isExpanded ? null : d.deviceId)
                      }
                      className="p-1 rounded hover:bg-muted/10"
                      aria-expanded={isExpanded}
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
                  <div className="border-t px-4 py-3 bg-background/40 space-y-4">
                    {/* Device info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Device ID</div>
                        <div className="font-mono truncate">
                          {shortId(d.deviceId)}
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Public key</div>
                        <div className="font-mono truncate">
                          {shortId(d.publicKey)}
                        </div>
                      </div>
                    </div>

                    {/* Sessions note */}
                    <div className="text-xs text-muted-foreground">
                      Sessions are managed automatically per device. Logging out
                      or removing a device revokes all sessions on it.
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                      {d.status === "active" && (
                        <button
                          onClick={() => {
                            if (isThisDevice) {
                              // FULL LOGOUT (current device)
                              logoutCurrentDevice();
                            } else {
                              // REMOTE LOGOUT
                              handleLogoutDevice(d.deviceId);
                            }
                          }}
                          disabled={processingId === d.deviceId}
                          className="px-3 py-1 rounded border text-sm flex items-center"
                        >
                          {processingId === d.deviceId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Logging out...
                            </>
                          ) : (
                            <>
                              <LogOut className="w-4 h-4 mr-2" />
                              {isThisDevice ? "Logout this device" : "Logout device"}
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDevice(d.deviceId)}
                        disabled={processingId === d.deviceId}
                        className="sm:ml-auto px-3 py-1 rounded border text-destructive text-sm flex items-center"
                      >
                        {processingId === d.deviceId ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Removing device...
                          </>
                        ) : (
                          <>
                            <Trash className="w-4 h-4 mr-2" />
                            Remove device
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
