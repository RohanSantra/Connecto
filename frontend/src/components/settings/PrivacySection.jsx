"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Key,
  Smartphone,
  EyeOff,
  Trash2,
  PhoneCall,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/store/useProfileStore";
import { toast } from "sonner";

/**
 * PrivacySection
 * - polished, accessible, and includes explicit Calls coverage
 * - assumes the alert-dialog components and Button are available in your UI library
 * - ready to paste into your settings page
 */
export default function PrivacySection() {
  const navigate = useNavigate();
  const { deleteProfile } = useProfileStore();

  const handleDeactiveAccount = async () => {
    const toastId = toast.loading("Deactivating account...");

    try {
      await deleteProfile();
      toast.success("Account deactivated successfully", { id: toastId });

    } catch (err) {
      toast.error(err.message || "Failed to deactivate account", {
        id: toastId,
      });
    }
  };

  return (
    <div className="space-y-8" aria-live="polite">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-semibold">Privacy & Security</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Control how your account, devices, and encrypted sessions are protected.
          These settings affect login, device access, encryption keys, and real-time
          communication (calls and messages).
        </p>
      </div>

      {/* AUTHENTICATION & SESSIONS */}
      <section className="space-y-4" aria-labelledby="auth-sessions-title">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden />
          <h3 id="auth-sessions-title" className="font-medium">Authentication & Sessions</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            We use <strong>device-based authentication</strong>. Each device you sign in on
            receives its own secure session so you can control access per device.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>We do not store reusable plaintext passwords on our servers.</li>
            <li>Each device can be signed out independently from Settings.</li>
            <li>Removing a device immediately revokes its session and access to new messages.</li>
          </ul>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings?tab=devices")}
            >
              Manage devices & sessions
            </Button>
          </div>
        </div>
      </section>

      {/* END-TO-END ENCRYPTION */}
      <section className="space-y-4" aria-labelledby="encryption-title">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary" aria-hidden />
          <h3 id="encryption-title" className="font-medium">End-to-End Encryption</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Messages, attachments, and call metadata (where applicable) are protected with
            end-to-end encryption. Encryption keys are generated and stored on your devices.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Private keys never leave your device.</li>
            <li>We cannot read message or call content encrypted end-to-end.</li>
            <li>Keys rotate and are managed per device for improved security.</li>
          </ul>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="w-4 h-4" aria-hidden /> Encryption keys are tied to individual devices.
          </div>
        </div>
      </section>

      {/* CALLS / MEDIA */}
      <section className="space-y-4" aria-labelledby="calls-title">
        <div className="flex items-center gap-3">
          <PhoneCall className="w-5 h-5 text-primary" aria-hidden />
          <h3 id="calls-title" className="font-medium">Calls & Call Privacy</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Voice and video calls are transmitted in real time and use the same
            privacy-first approach as messages.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Call media is encrypted in transit; content is not stored by default.</li>
            <li>Call logs (timestamps, participants, duration) are minimal and used for delivery and UX.</li>
            <li>Blocked users cannot call or reach you; calls from blocked users are prevented.</li>
          </ul>

          <p className="text-xs text-muted-foreground">
            If you enable any optional call recording or cloud backup features, we will
            display clear consent screens and controls — those features are off by default.
          </p>
        </div>
      </section>

      {/* VISIBILITY & PRIVACY */}
      <section className="space-y-4" aria-labelledby="visibility-title">
        <div className="flex items-center gap-3">
          <EyeOff className="w-5 h-5 text-primary" aria-hidden />
          <h3 id="visibility-title" className="font-medium">Visibility</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Your online presence is driven by active devices. You control which profile
            fields are public and what others can see.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You appear online when at least one device is actively connected.</li>
            <li>When all devices are signed out, you appear offline.</li>
            <li>Last-seen timestamps are limited and shown only to permitted contacts.</li>
          </ul>
        </div>
      </section>

      {/* DEVICE SECURITY */}
      <section className="space-y-4" aria-labelledby="device-security-title">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary" aria-hidden />
          <h3 id="device-security-title" className="font-medium">Device Security</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Devices are linked using cryptographic identifiers so you can manage them reliably.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Devices use cryptographic keys for identity and message decryption.</li>
            <li>Unknown or lost devices can be removed immediately from Settings.</li>
            <li>Your primary device may control certain account recovery flows.</li>
          </ul>
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className="space-y-4" aria-labelledby="danger-zone-title">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-destructive" aria-hidden />
          <h3 id="danger-zone-title" className="font-medium text-destructive">Danger Zone</h3>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Deleting or deactivating your account is permanent. It will remove your profile,
            devices, sessions, and any encrypted metadata tied to the account.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Deactivate account</Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will delete your profile, sign out and remove all devices,
                  and schedule account data for removal. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel className="p-2">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  asChild
                >
                  <Button
                    onClick={handleDeactiveAccount}
                    className="bg-destructive text-white hover:bg-destructive/90 p-2"
                    aria-label="Confirm deactivate account"
                  >
                    Deactivate account
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
