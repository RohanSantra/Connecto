"use client";

import {
  ArrowLeft,
  FileText,
  User,
  ShieldAlert,
  Smartphone,
  Zap,
  Ban,
  Scale,
  Mail,
  List,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_INFO } from "@/constants";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  const sections = [
    { id: "acceptance", title: "Acceptance of Terms" },
    { id: "eligibility", title: "Eligibility" },
    { id: "account-device", title: "Account & Device Responsibility" },
    { id: "acceptable-use", title: "Acceptable Use" },
    { id: "sessions", title: "Device & Session Control" },
    { id: "termination", title: "Termination" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "contact", title: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: January 2026</p>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="rounded-lg bg-card p-3 text-center shadow-sm">
              <FileText className="mx-auto w-5 h-5 text-primary mb-1" />
              <div className="text-xs text-muted-foreground">Document</div>
              <div className="text-sm font-medium">TOS</div>
            </div>
            <div className="text-sm text-muted-foreground text-right">
              <div>App</div>
              <div className="font-medium">{APP_INFO.name}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Contents</h4>
              </div>

              <nav className="flex flex-col gap-2 text-sm">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3 rounded-xl border bg-card p-6 space-y-8 max-w-4xl">
            <TermSection id="acceptance" icon={FileText} title="Acceptance of Terms">
              By accessing or using {APP_INFO.name}, you agree to be bound by these Terms of Service.
            </TermSection>

            <TermSection id="eligibility" icon={User} title="Eligibility">
              You must be legally permitted to use online communication services in your jurisdiction.
            </TermSection>

            <TermSection id="account-device" icon={Smartphone} title="Account & Device Responsibility">
              You are responsible for securing your account and devices. Each device acts as a separate access point.
            </TermSection>

            <TermSection id="acceptable-use" icon={ShieldAlert} title="Acceptable Use">
              <ul className="list-disc pl-5 space-y-1">
                <li>No illegal activities</li>
                <li>No harassment, abuse, or threats</li>
                <li>No attempts to bypass security mechanisms</li>
                <li>No exploitation of encryption systems</li>
              </ul>
            </TermSection>

            <TermSection id="sessions" icon={Zap} title="Device & Session Control">
              Logging out or removing a device immediately revokes all sessions on that device. If all devices are logged out, your account will appear offline until you sign in again.
            </TermSection>

            <TermSection id="termination" icon={Ban} title="Termination">
              We reserve the right to suspend or terminate accounts that violate these terms or compromise platform security.
            </TermSection>

            <TermSection id="liability" icon={Scale} title="Limitation of Liability">
              {APP_INFO.name} is provided “as is” without warranties. We are not liable for data loss caused by device removal, user error, or third-party compromise.
            </TermSection>

            <TermSection id="contact" icon={Mail} title="Contact">
              <a href={`mailto:${APP_INFO.legalEmail}`} className="text-primary underline">{APP_INFO.legalEmail}</a>
            </TermSection>

            <div className="pt-2 text-xs text-muted-foreground">
              <p>
                For any questions regarding these Terms, contact {APP_INFO.name} legal at <a className="underline text-primary" href={`mailto:${APP_INFO.legalEmail}`}>{APP_INFO.legalEmail}</a>.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function TermSection({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted/10 p-2 text-primary"><Icon className="w-5 h-5" /></div>
        <h2 className="text-base font-medium">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}
