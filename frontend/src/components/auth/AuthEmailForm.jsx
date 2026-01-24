// src/components/auth/AuthEmailForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import ConnectoLogo from "@/components/common/ConnectoLogo.jsx";
import ConnectoBrandAndSlogan from "@/components/common/ConnectoBrandAndSlogan.jsx";

import { toast } from "sonner";
import { useOtpStore } from "@/store/useOtpStore.js";
import { Loader2 } from "lucide-react";

import {
  getOrCreateDeviceKeypair,
  getOrCreateDeviceId
} from "@/lib/deviceKeys";

export default function AuthEmailForm() {
  const navigate = useNavigate();
  const sendOtp = useOtpStore((s) => s.sendOtp);
  const setEmail = useOtpStore((s) => s.setEmail);

  const [emailLocal, setEmailLocal] = useState(
    localStorage.getItem("connecto_last_email") || ""
  );
  const [accepted, setAccepted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  /* ---------------------------------------------------
     SEND OTP (Email Auth)
  --------------------------------------------------- */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!emailLocal) return setError("Please enter your email");
    if (!accepted) return setError("Please accept the Privacy Policy & Terms");

    try {
      setIsSending(true);

      const res = await sendOtp(emailLocal);
      if (!res) return;

      localStorage.setItem("connecto_last_email", emailLocal);
      setEmail(emailLocal);

      navigate("/verify", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to send OTP";
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------------------------------------------
     GOOGLE REDIRECT (with valid device keys)
  --------------------------------------------------- */
  const handleGoogleRedirect = () => {
    const deviceId = getOrCreateDeviceId();
    const { publicKeyBase64 } = getOrCreateDeviceKeypair();
    const deviceName = navigator.userAgent;

    const api = import.meta.env.VITE_API_BASE_URL;

    const url =
      `${api}/auth/google?` +
      `deviceId=${encodeURIComponent(deviceId)}` +
      `&deviceName=${encodeURIComponent(deviceName)}` +
      `&publicKey=${encodeURIComponent(publicKeyBase64)}`;

    window.location.href = url;
  };

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <div className="relative flex flex-col justify-center p-8 md:p-16 overflow-hidden min-h-svh">
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/10 via-transparent to-transparent blur-3xl opacity-70" />

      <div className="absolute top-6 left-6 flex items-center gap-3">
        <ConnectoLogo size={64} />
        <ConnectoBrandAndSlogan />
      </div>

      <div className="max-w-md mx-auto w-full space-y-8 mt-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Get started securely</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in or sign up using OTP or Google — chats are end-to-end encrypted.
          </p>
        </div>

        <form onSubmit={handleSendOtp} className="space-y-5">
          {error && (
            <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={emailLocal}
              onChange={(e) => {
                setEmailLocal(e.target.value);
                setError(null);
              }}
              required
              autoFocus
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(!!v)}
            />
            <Label htmlFor="accept" className="text-sm leading-snug text-muted-foreground">
              I agree to the{" "}
              <a href="/legal/privacy-policy" className="underline">Privacy Policy</a> and{" "}
              <a href="/legal/terms-of-service" className="underline">Terms of Service</a>.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Send OTP"
            )}
          </Button>

          <Separator className="my-4" />

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleRedirect}
            className="w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 12.23c0-.7-.06-1.37-.18-2.02H12v3.82h4.84c-.21 1.13-.86 2.09-1.83 2.74v2.28h2.95c1.72-1.58 2.72-3.96 2.72-6.82z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.43 0 4.46-.8 5.95-2.17l-2.95-2.28c-.81.55-1.85.88-2.99.88-2.3 0-4.25-1.55-4.95-3.63H3.96v2.29C5.44 19.78 8.5 22 12 22z"
                fill="#34A853"
              />
              <path
                d="M7.05 13.78A5.996 5.996 0 0 1 6.5 12c0-.62.12-1.21.33-1.78V7.93H3.96A9.99 9.99 0 0 0 2 12c0 1.6.38 3.12 1.05 4.45l3.99-2.67z"
                fill="#FBBC05"
              />
              <path
                d="M12 6.5c1.32 0 2.51.45 3.45 1.33l2.6-2.6C16.45 3.83 14.43 3 12 3 8.5 3 5.44 5.22 3.96 7.93L7.96 10.6C8.75 8.97 10.7 6.5 12 6.5z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We’ll never post on your behalf. Your account is private and secure.
          </p>
        </form>
      </div>
    </div>
  );
}
