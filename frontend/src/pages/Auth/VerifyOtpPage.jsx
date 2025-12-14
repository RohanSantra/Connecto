import React from "react";
import OTPForm from "@/components/auth/OTPForm.jsx";
import Illustration from "@/components/common/Illustration.jsx";

export default function VerifyOtpPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      {/* LEFT: OTP */}
      <div className="flex flex-col justify-center px-6 md:px-12 relative">
        <OTPForm />
      </div>

      {/* RIGHT: illustration */}
      <Illustration />
    </div>
  );
}
