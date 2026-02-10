"use client";

import React from "react";
import { APP_INFO } from "@/constants";
import ConnectoLogo from "@/components/common/ConnectoLogo";
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
  EyeOff,
  Ban,
  Key,
  FilePlus,
  Twitter,
  Github,
  Instagram,
  Linkedin,
  ArrowRight,
} from "lucide-react";

export default function AboutSection() {
  const website = APP_INFO?.website || "#";
  const github = APP_INFO?.github || "#";
  const twitter = APP_INFO?.twitter || "#";

  return (
    <section className="theme-animate space-y-6 max-w-5xl mx-auto px-4">
      {/* Header / Hero */}
      <header className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <ConnectoLogo size={56} animated />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">{APP_INFO.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Secure, private, and modern communication — built with safety,
                clarity, and delightful UX in mind.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <GitBranch className="w-4 h-4" />
              <strong className="font-medium">{APP_INFO.version || "v1.0.0"}</strong>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <Calendar className="w-4 h-4" />
              <span>{APP_INFO.environment || "Production"}</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/legal/privacy-policy"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/10 transition"
            >
              <FileText className="w-4 h-4" />
              Privacy Policy
            </a>

            <a
              href="/legal/terms-of-service"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/10 transition"
            >
              <Scale className="w-4 h-4" />
              Terms of Service
            </a>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-4">
          <div className="rounded-lg bg-card p-3 text-center shadow-sm">
            <Info className="mx-auto w-5 h-5 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm font-medium">Live</div>
          </div>

          <div className="text-sm text-muted-foreground text-right">
            <div>Platform</div>
            <div className="font-medium">{APP_INFO.platform || "Web"}</div>
          </div>
        </div>
      </header>

      {/* Top cards */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Application Info</h3>
          <div className="mt-2 divide-y">
            <InfoRow icon={<Server className="w-4 h-4" />} label="Name" value={APP_INFO.name || "Connecto"} />
            <InfoRow icon={<GitBranch className="w-4 h-4" />} label="Version" value={APP_INFO.version || "v1.0.0"} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Platform" value={APP_INFO.platform || "Web"} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Environment" value={APP_INFO.environment || "production"} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge icon={<Zap className="w-4 h-4" />} label="Fast" />
            <Badge icon={<Lock className="w-4 h-4" />} label="Secure" />
            <Badge icon={<Users className="w-4 h-4" />} label="Privacy-First" />
            <Badge icon={<FilePlus className="w-4 h-4" />} label="Edit & Control" />
          </div>
        </div>

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
              icon={<EyeOff className="w-6 h-6" />}
              title="Privacy by Default"
              description="Accounts are private by default. Email is never publicly exposed; discovery is controlled."
            />

            <Feature
              icon={<Ban className="w-6 h-6" />}
              title="User-Controlled Safety"
              description="Block users and conversations instantly. Blocking is enforced across delivery and calls."
            />

            <Feature
              icon={<Key className="w-6 h-6" />}
              title="Transparent Session Control"
              description="Each login creates a device-specific session that can be revoked without affecting other devices."
            />

            <Feature
              icon={<FileText className="w-6 h-6" />}
              title="Message Control & Integrity"
              description="Edit, delete-for-everyone, and read/delivery receipts are supported and device-aware."
            />

            <Feature
              icon={<ShieldCheck className="w-6 h-6" />}
              title="No Ads or Tracking"
              description="We do not show ads, run third-party trackers, or sell user data. Your activity is not monetized."
            />

            <Feature
              icon={<Zap className="w-6 h-6" />}
              title="Performance First"
              description="Optimized bandwidth usage and responsive UI for low-latency messaging across networks."
            />

            <Feature
              icon={<Server className="w-6 h-6" />}
              title="Resilient Architecture"
              description="Built for scale with secure storage patterns and planned encrypted backups."
            />
          </ul>
        </div>
      </div>

      {/* Support / Security / Legal */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Support & Security</h3>

          <ContactCard
            icon={<Mail className="w-5 h-5" />}
            title="Support"
            value={APP_INFO.supportEmail || "support@connecto.app"}
            href={`mailto:${APP_INFO.supportEmail || "support@connecto.app"}`}
          />

          <ContactCard
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Security"
            value={APP_INFO.securityEmail || "security@connecto.app"}
            href={`mailto:${APP_INFO.securityEmail || "security@connecto.app"}`}
          />

          <ContactCard
            icon={<Scale className="w-5 h-5" />}
            title="Legal"
            value={APP_INFO.legalEmail || "legal@connecto.app"}
            href={`mailto:${APP_INFO.legalEmail || "legal@connecto.app"}`}
          />
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Legal</h3>
          <div className="flex flex-col gap-2 mt-2">
            <LegalLink icon={<FileText className="w-4 h-4" />} label="Privacy Policy" href="/legal/privacy-policy" />
            <LegalLink icon={<Scale className="w-4 h-4" />} label="Terms of Service" href="/legal/terms-of-service" />
            <div className="pt-2 text-xs text-muted-foreground">
              <div>© {new Date().getFullYear()} {APP_INFO.companyName || APP_INFO.name}. All rights reserved.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Social + CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-4">
          <ConnectoLogo size={40} animated={false} />
          <div>
            <div className="font-medium">{APP_INFO.name}</div>
            <div className="text-xs text-muted-foreground">Built with privacy & performance in mind</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Social icons */}
          <div className="flex items-center gap-2">
            <a
              href="#"
              aria-label="GitHub"
              className="rounded-md border p-2 hover:bg-muted/10 transition"
            >
              <Github className="w-4 h-4" />
            </a>

            <a
              href="#"
              aria-label="Twitter / X"
              className="rounded-md border p-2 hover:bg-muted/10 transition"
            >
              <Twitter className="w-4 h-4" />
            </a>

            <a
              href="#"
              aria-label="Instagram"
              className="rounded-md border p-2 hover:bg-muted/10 transition"
            >
              <Instagram className="w-4 h-4" />
            </a>

            <a
              href="#"
              aria-label="LinkedIn"
              className="rounded-md border p-2 hover:bg-muted/10 transition"
            >
              <Linkedin className="w-4 h-4" />
            </a>

            <a
              href="#"
              aria-label="Website"
              className="rounded-md border p-2 hover:bg-muted/10 transition"
            >
              <Globe className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <footer className="rounded-xl border bg-card p-4 flex items-start gap-3 text-sm text-muted-foreground">
        <Info className="w-5 h-5 mt-1 text-primary" />
        <div>
          <p className="mb-1">{APP_INFO.name} is actively developed and regularly updated.</p>
          <p className="text-xs">For security concerns, contact <a className="underline" href={`mailto:${APP_INFO.securityEmail || "security@connecto.app"}`}>{APP_INFO.securityEmail || "security@connecto.app"}</a></p>
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
