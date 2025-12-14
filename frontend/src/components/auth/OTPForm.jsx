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
import { Loader2 } from "lucide-react";
import ConnectoLogo from "@/components/common/ConnectoLogo.jsx";
import ConnectoBrandAndSlogan from "@/components/common/ConnectoBrandAndSlogan.jsx";
import { useAuthStore } from "@/store/useAuthStore.js";
import { useOtpStore } from "@/store/useOtpStore.js";

export default function OTPForm({ email: propEmail }) {
  const navigate = useNavigate();

  // Zustand stores
  const otpStoreEmail = useOtpStore((s) => s.email);
  const setOtpStoreEmail = useOtpStore((s) => s.setEmail);
  const resendOtp = useOtpStore((s) => s.resendOtp);
  const cancelOtp = useOtpStore((s) => s.cancelOtp);
  const startTimer = useOtpStore((s) => s.startTimer);
  const resetTimer = useOtpStore((s) => s.resetTimer);
  const timer = useOtpStore((s) => s.timer);

  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  // fallback email priority
  const email =
    propEmail ||
    otpStoreEmail ||
    localStorage.getItem("connecto_last_email") ||
    "";

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [shake, setShake] = useState(false);

  /* ---------------------------------------------
     ⏱ Start timer when email available
  --------------------------------------------- */
  useEffect(() => {
    if (email) {
      setOtpStoreEmail(email);
      startTimer(120); // Start 2 minutes (120s)
    }
    return () => resetTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  /* ---------------------------------------------
     🚫 Handle no-email fallback
  --------------------------------------------- */
  if (!email) {
    return (
      <div className="relative p-8 md:p-16 min-h-svh flex flex-col items-center justify-center text-center">
        <div className="mb-4">
          <ConnectoLogo size={64} />
        </div>
        <p className="text-lg font-medium">No email found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please enter your email on the sign-in page.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => navigate("/auth")}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------
     ✅ Handle OTP verification
  --------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyOtp({ email, otp });
      if (res.success) {
        const user = res.user;
        if (user?.isBoarded) navigate("/", { replace: true });
        else navigate("/set-profile", { replace: true });
      }
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Invalid OTP. Try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  /* ---------------------------------------------
     🔁 Resend / Cancel Handlers
  --------------------------------------------- */
  const handleResend = async () => {
    if (timer > 0) return;
    await resendOtp();
    startTimer(120);
  };

  const handleCancel = async () => {
    setIsResending(true);
    try {
      await cancelOtp();
      resetTimer();
      navigate("/auth");
    } catch (error) { }
    finally {
      setIsResending(false);
    }
  };

  /* ---------------------------------------------
     🧮 Format time as mm:ss
  --------------------------------------------- */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(1, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /* ---------------------------------------------
     🧠 Restrict input to numbers only
  --------------------------------------------- */
  const handleOtpChange = (val) => {
    const numeric = val.replace(/\D/g, ""); // remove non-digits
    setOtp(numeric);
  };

  /* ---------------------------------------------
     🎨 UI
  --------------------------------------------- */
  return (
    <div className="relative flex flex-col justify-center p-8 md:p-16 overflow-hidden min-h-svh">
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/10 via-transparent to-transparent blur-3xl opacity-70" />

      <div className="absolute top-6 left-6 flex items-center gap-3">
        <ConnectoLogo size={64} />
        <ConnectoBrandAndSlogan />
      </div>

      <div className="max-w-md mx-auto w-full space-y-10 mt-20 text-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Verify your email
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <b>{email}</b>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup className="space-y-6">
            <Field>
              <FieldLabel htmlFor="otp" className="sr-only">
                Verification code
              </FieldLabel>

              <div
                className={`flex justify-center transition-transform duration-200 ${shake ? "animate-shake" : ""
                  }`}
              >
                <InputOTP
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  id="otp"
                  required
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
                    OTP expires in{" "}
                    <span className="font-medium text-primary">
                      {formatTime(timer)}
                    </span>
                  </>
                ) : (
                  <span className="text-destructive">OTP expired</span>
                )}
              </FieldDescription>
            </Field>

            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </Button>

            <div className="flex flex-col items-center mt-2 space-y-2">
              <div className="flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={timer > 0}
                  className={`underline transition ${timer > 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:text-foreground"
                    }`}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resending code...
                    </>
                  ) : (
                    "Resend code"
                  )}
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="underline hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              <FieldDescription className="text-center text-muted-foreground text-xs">
                Didn’t get the email? Check spam or try again later.
              </FieldDescription>
            </div>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
