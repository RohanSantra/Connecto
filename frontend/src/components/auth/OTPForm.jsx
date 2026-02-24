import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";

import { toast } from "sonner";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";

import ConnectoLogo from "@/components/common/ConnectoLogo.jsx";
import ConnectoBrandAndSlogan from "@/components/common/ConnectoBrandAndSlogan.jsx";

import { useAuthStore } from "@/store/useAuthStore.js";
import { useOtpStore } from "@/store/useOtpStore.js";

export default function OTPForm({ email: propEmail }) {
  const navigate = useNavigate();

  const otpStoreEmail = useOtpStore((s) => s.email);
  const setOtpStoreEmail = useOtpStore((s) => s.setEmail);
  const resendOtp = useOtpStore((s) => s.resendOtp);
  const cancelOtp = useOtpStore((s) => s.cancelOtp);
  const startTimer = useOtpStore((s) => s.startTimer);
  const resetTimer = useOtpStore((s) => s.resetTimer);
  const timer = useOtpStore((s) => s.timer);

  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const email =
    propEmail ||
    otpStoreEmail ||
    localStorage.getItem("connecto_last_email") ||
    "";

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [shake, setShake] = useState(false);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (email) {
      setOtpStoreEmail(email);
      startTimer(120);
    }
    return () => resetTimer();
  }, [email]);

  /* ---------------- NO EMAIL FALLBACK ---------------- */
  if (!email) {
    return (
      <div className="relative flex flex-col justify-center p-8 md:p-16 min-h-svh text-center">
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <ConnectoLogo size={64} />
          <ConnectoBrandAndSlogan />
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-semibold">No email found</h2>
          <p className="text-sm text-muted-foreground">
            Please return to the sign-in page and request a new verification code.
          </p>
          <Button onClick={() => navigate("/auth")}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- VERIFY OTP ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    if (isVerifying) return;

    const toastId = toast.loading("Verifying your code...");

    try {
      setIsVerifying(true);


      const res = await verifyOtp({ email, otp });

      toast.success("You’ve been signed in successfully.", {
        id: toastId,
      });

      if (!res?.user) return;


      navigate(
        res.user.isBoarded ? "/" : "/set-profile",
        { replace: true }
      );

    } catch (err) {
      toast.error(
        err?.message ||
        "The verification code is invalid or has expired.",
        { id: toastId }
      );

      setShake(true);
      setTimeout(() => setShake(false), 400);

    } finally {
      setIsVerifying(false);
    }
  };

  /* ---------------- RESEND ---------------- */
  const handleResend = async () => {
    if (timer > 0 || isResending) return;

    try {
      setIsResending(true);

      await toast.promise(
        resendOtp(),
        {
          loading: "Resending verification code...",
          success: "New code sent successfully 📩",
          error: "Failed to resend verification code.",
        }
      );

      startTimer(120);

    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    await cancelOtp();
    resetTimer();
    navigate("/auth");
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (val) => {
    setOtp(val.replace(/\D/g, ""));
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="relative flex flex-col justify-center p-8 md:p-16 min-h-svh overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/10 via-transparent to-transparent blur-3xl opacity-70" />

      <div className="absolute top-6 left-6 flex items-center gap-3">
        <ConnectoLogo size={64} />
        <ConnectoBrandAndSlogan />
      </div>

      <div className="max-w-md mx-auto w-full space-y-8 mt-20 text-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Verify your email
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="otp" className="sr-only">
                Verification code
              </FieldLabel>

              <div
                className={`flex justify-center transition-all ${shake ? "animate-shake" : ""
                  }`}
              >
                <InputOTP
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  id="otp"
                >
                  <InputOTPGroup>
                    {[0, 1, 2].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    {[3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <FieldDescription className="text-center mt-4">
                {timer > 0 ? (
                  <>
                    Code expires in{" "}
                    <span className="font-medium text-primary">
                      {formatTime(timer)}
                    </span>
                  </>
                ) : (
                  <span className="text-destructive">
                    Code expired. Please request a new one.
                  </span>
                )}
              </FieldDescription>
            </Field>

            {/* PRIMARY BUTTON */}
            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </FieldGroup>

          <Separator />

          {/* SECONDARY ACTIONS */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={timer > 0 || isResending}
              className="w-full flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Resend Code
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Use a different email
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Didn’t receive the email? Check your spam folder.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}