"use client";

import {
  ArrowLeft,
  Shield,
  Database,
  Smartphone,
  Key,
  Clock,
  UserCheck,
  Mail,
  List,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_INFO } from "@/constants";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  const sections = [
    { id: "overview", title: "Overview" },
    { id: "collected", title: "Information We Collect" },
    { id: "auth", title: "Device-Based Authentication" },
    { id: "sessions", title: "Sessions & Security Tokens" },
    { id: "retention", title: "Data Retention" },
    { id: "rights", title: "Your Rights" },
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

            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: January 2026</p>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="rounded-lg bg-card p-3 text-center shadow-sm">
              <Shield className="mx-auto w-5 h-5 text-primary mb-1" />
              <div className="text-xs text-muted-foreground">Privacy</div>
              <div className="text-sm font-medium">Policy</div>
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
            <PolicySection id="overview" icon={Shield} title="Overview">
              {APP_INFO.name} is built with privacy and security at its core. We collect only the minimum data required to operate secure authentication, device-based sessions, and encrypted messaging.
            </PolicySection>

            <PolicySection id="collected" icon={Database} title="Information We Collect">
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address and authentication provider</li>
                <li>Unique device identifiers generated locally</li>
                <li>Device metadata (name, last active timestamp)</li>
                <li>Public encryption keys linked to devices</li>
                <li>Hashed session tokens and expiry timestamps</li>
                <li>Optional profile data (avatar, bio, languages)</li>
              </ul>
            </PolicySection>

            <PolicySection id="auth" icon={Smartphone} title="Device-Based Authentication">
              Each login is tied to a specific device. This allows you to view, manage, log out, or remove devices independently without affecting others.
            </PolicySection>

            <PolicySection id="sessions" icon={Key} title="Sessions & Security Tokens">
              Sessions are created per device using hashed refresh tokens. We never store plaintext tokens. Sessions expire automatically and can be revoked instantly from your settings.
            </PolicySection>

            <PolicySection id="retention" icon={Clock} title="Data Retention">
              Device and session data is retained only as long as required for security. Removing a device permanently revokes its sessions.
            </PolicySection>

            <PolicySection id="rights" icon={UserCheck} title="Your Rights">
              <ul className="list-disc pl-5 space-y-1">
                <li>View and manage all logged-in devices</li>
                <li>Revoke sessions instantly</li>
                <li>Delete your account</li>
                <li>Request clarification about stored data</li>
              </ul>
            </PolicySection>

            <PolicySection id="contact" icon={Mail} title="Contact">
              <p>
                Security: <a href={`mailto:${APP_INFO.securityEmail}`} className="text-primary underline">{APP_INFO.securityEmail}</a>
              </p>
              <p>
                Privacy: <a href={`mailto:${APP_INFO.supportEmail}`} className="text-primary underline">{APP_INFO.supportEmail}</a>
              </p>
            </PolicySection>

            <div className="pt-2 text-xs text-muted-foreground">
              <p>
                For privacy requests or to exercise your rights, contact the team at <a className="underline text-primary" href={`mailto:${APP_INFO.supportEmail}`}>{APP_INFO.supportEmail}</a>.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function PolicySection({ id, icon: Icon, title, children }) {
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
