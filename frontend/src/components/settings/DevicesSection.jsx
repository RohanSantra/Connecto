"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Smartphone,
  ChevronDown,
  ChevronUp,
  LogOut,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useAuthStore } from "@/store/useAuthStore";

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

/* --------------------------------
   Devices Section
-------------------------------- */

export default function DevicesSection() {
  const {
    devices = [],
    loading,
    fetchDevices,
    logoutDevice,
    deleteDevice,
  } = useDeviceStore();

  const {
    deviceId: localDeviceId,
    logout: logoutCurrentDevice,
  } = useAuthStore();

  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...devices].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
  });

  return (
    <div className="theme-animate space-y-4 max-w-4xl">
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
        <div className="p-6 rounded-xl bg-card text-muted-foreground">
          Loading devices…
        </div>
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
                <div className="flex items-center gap-3 p-4">
                  <div className="w-11 h-11 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {d.deviceName || "Unknown device"}
                      </span>

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

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={d.status} />
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
                    <div className="flex flex-wrap gap-2">
                      {d.status === "active" && (
                        <button
                          onClick={() => {
                            if (isThisDevice) {
                              // FULL LOGOUT (current device)
                              logoutCurrentDevice();
                            } else {
                              // REMOTE LOGOUT
                              logoutDevice(d.deviceId);
                            }
                          }}
                          className="px-3 py-1 rounded border text-sm flex items-center"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {isThisDevice ? "Logout this device" : "Logout device"}
                        </button>
                      )}

                      <button
                        onClick={() => deleteDevice(d.deviceId)}
                        className="ml-auto px-3 py-1 rounded border text-destructive text-sm flex items-center"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Remove device
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
