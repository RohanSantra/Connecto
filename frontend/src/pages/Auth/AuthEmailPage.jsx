import React from "react";
import AuthEmailForm from "@/components/auth/AuthEmailForm.jsx";
import Illustration from "@/components/common/Illustration.jsx";

export default function AuthEmailPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2 bg-background">
            {/* LEFT: form */}
            <div className="flex flex-col justify-center px-6 md:px-12 relative">
                <AuthEmailForm />
            </div>

            {/* RIGHT: illustration */}
            <Illustration />
        </div>
    );
}
