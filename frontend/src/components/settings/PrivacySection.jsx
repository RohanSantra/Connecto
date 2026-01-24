"use client";

import {
  ShieldCheck,
  Lock,
  KeyRound,
  Smartphone,
  EyeOff,
  Trash2,
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
import { useNavigate } from "react-router-dom";
import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function PrivacySection() {
  const navigate = useNavigate();

  const { deleteProfile } = useProfileStore();
  const { logout } = useAuthStore();

  const handleDeleteAccount = async () => {
    try {
      await deleteProfile();
      toast.success("Account deleted");
      logout();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h2 className="text-xl font-semibold">Privacy & Security</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Control how your account, devices, and encrypted sessions are protected.
        </p>
      </div>

      {/* ========================= */}
      {/* AUTHENTICATION & SESSIONS */}
      {/* ========================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Authentication & Sessions</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Your account uses <strong>device-based authentication</strong>.
            Each device has its own secure session.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>No passwords are stored on our servers</li>
            <li>Each device can be logged out independently</li>
            <li>Removing a device revokes all its sessions</li>
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

      {/* ========================= */}
      {/* END-TO-END ENCRYPTION */}
      {/* ========================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="font-medium">End-to-End Encryption</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            All messages are encrypted end-to-end using keys generated on your
            device.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Private keys never leave your device</li>
            <li>Messages cannot be read by Connecto</li>
            <li>Encryption keys rotate automatically for security</li>
          </ul>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyRound className="w-4 h-4" />
            Encryption keys are managed per device
          </div>
        </div>
      </section>

      {/* ========================= */}
      {/* VISIBILITY & PRIVACY */}
      {/* ========================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <EyeOff className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Visibility</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Your online status is determined by active devices.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You appear online when at least one device is active</li>
            <li>You appear offline when all devices are logged out</li>
            <li>Last-seen timestamps are stored securely</li>
          </ul>
        </div>
      </section>

      {/* ========================= */}
      {/* DEVICE SECURITY */}
      {/* ========================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Device Security</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Each device is uniquely identified and verified.
          </p>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Devices are linked using cryptographic keys</li>
            <li>Unknown devices can be removed instantly</li>
            <li>Primary device controls account presence</li>
          </ul>
        </div>
      </section>

      {/* ========================= */}
      {/* DANGER ZONE */}
      {/* ========================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="font-medium text-destructive">Danger Zone</h3>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Removing your account permanently deletes your profile, devices,
            sessions, and encrypted metadata.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your profile, all devices, chat history,
                  sessions, and encryption keys. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel className="p-2">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90 p-2"
                  onClick={handleDeleteAccount}
                >
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
