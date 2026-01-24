"use client";

import { APP_INFO } from "@/constants";
import {
  ShieldCheck,
  Smartphone,
  Lock,
  Info,
  FileText,
  Scale,
  ExternalLink,
  Mail,
  Zap,
  Users,
  Server,
  GitBranch,
  Globe,
  Calendar,
} from "lucide-react";

export default function AboutSection() {
  return (
    <section className="theme-animate space-y-6 max-w-4xl mx-auto">
      {/* Header / Hero */}
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">About {APP_INFO.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Secure, private, and modern communication — built with safety,
            clarity, and delightful UX in mind.
          </p>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <GitBranch className="w-4 h-4" />
              <strong className="font-medium">{APP_INFO.version}</strong>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <Calendar className="w-4 h-4" />
              <span>Production</span>
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <div className="text-sm text-muted-foreground text-right">
            <div>Platform</div>
            <div className="font-medium">{APP_INFO.platform}</div>
          </div>

          <div className="rounded-lg bg-card p-3 text-center shadow-sm">
            <Info className="mx-auto w-5 h-5 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-sm font-medium">Live</div>
          </div>
        </div>
      </header>

      {/* Grid: App Info | Contact | Legal */}
      <div className="flex flex-col gap-4">
        {/* App Info */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Application Info</h3>

          <div className="mt-2 divide-y">
            <InfoRow icon={<Server className="w-4 h-4" />} label="Name" value={APP_INFO.name} />
            <InfoRow icon={<GitBranch className="w-4 h-4" />} label="Version" value={APP_INFO.version} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Platform" value={APP_INFO.platform} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Environment" value={APP_INFO.environment} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge icon={<Zap className="w-4 h-4" />} label="Fast" />
            <Badge icon={<Lock className="w-4 h-4" />} label="Secure" />
            <Badge icon={<Users className="w-4 h-4" />} label="Privacy-First" />
          </div>
        </div>

        {/* Core Principles (big) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Core Principles</h3>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Feature
              icon={<Lock className="w-6 h-6" />}
              title="End-to-End Encryption"
              description="Messages, calls, and media are encrypted on-device. Only participants can read content."
            />

            <Feature
              icon={<Smartphone className="w-6 h-6" />}
              title="Device-Based Sessions"
              description="Manage each device independently: revoke, name, or inspect sessions from settings."
            />

            <Feature
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Minimal Data Collection"
              description="We store only essential metadata. No tracking, no profiling. You remain in control."
            />

            <Feature
              icon={<Users className="w-6 h-6" />}
              title="Group Controls"
              description="Role-based permissions, invite links, and admin tools for safe collaboration."
            />

            <Feature
              icon={<Zap className="w-6 h-6" />}
              title="Performance First"
              description="Optimized bandwidth usage and responsive UI for low-latency messaging."
            />

            <Feature
              icon={<Server className="w-6 h-6" />}
              title="Resilient Architecture"
              description="Designed for scale with secure storage and encrypted backups."
            />
          </ul>
        </div>

        {/* Support / Security / Legal (stacked) */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Support & Security</h3>

          <ContactCard
            icon={<Mail className="w-5 h-5" />}
            title="Support"
            value={APP_INFO.supportEmail}
            href={`mailto:${APP_INFO.supportEmail}`}
          />

          <ContactCard
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Security"
            value={APP_INFO.securityEmail}
            href={`mailto:${APP_INFO.securityEmail}`}
          />

          <ContactCard
            icon={<Scale className="w-5 h-5" />}
            title="Legal"
            value={APP_INFO.legalEmail}
            href={`mailto:${APP_INFO.legalEmail}`}
          />

          <div className="mt-2">
            <h4 className="text-xs font-medium mb-2">Legal</h4>
            <div className="flex flex-col gap-2">
              <LegalLink icon={<FileText className="w-4 h-4" />} label="Privacy Policy" href="/legal/privacy-policy" />
              <LegalLink icon={<Scale className="w-4 h-4" />} label="Terms of Service" href="/legal/terms-of-service" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <footer className="rounded-xl border bg-card p-4 flex items-start gap-3 text-sm text-muted-foreground">
        <Info className="w-5 h-5 mt-1 text-primary" />
        <div>
          <p className="mb-1">{APP_INFO.name} is actively developed and regularly updated.</p>
          <p className="text-xs">For security concerns, contact <a className="underline" href={`mailto:${APP_INFO.securityEmail}`}>{APP_INFO.securityEmail}</a></p>
        </div>
      </footer>
    </section>
  );
}

/* ------------------ Helpers ------------------ */
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <div className="flex items-center gap-3">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

function Feature({ icon, title, description }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted/20 p-2 text-primary">{icon}</div>
        <div className="font-medium">{title}</div>
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </li>
  );
}

function Badge({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">{icon}<span>{label}</span></span>
  );
}

function ContactCard({ icon, title, value, href }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-muted/10 transition"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted/10 p-2">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{value}</div>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground" />
    </a>
  );
}

function LegalLink({ icon, label, href }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/10 transition"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground" />
    </a>
  );
}
