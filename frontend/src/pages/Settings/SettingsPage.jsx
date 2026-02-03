"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Brush,
  Bell,
  Shield,
  Smartphone,
  Info,
  Ban,
} from "lucide-react";

import ProfileSection from "@/components/settings/ProfileSection";
import AppearanceSection from "@/components/settings/appearance/AppearanceSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import PrivacySection from "@/components/settings/PrivacySection";
import DevicesSection from "@/components/settings/DevicesSection";
import AboutSection from "@/components/settings/AboutSection";
import BlockedSection from "@/components/settings/BlockedSection";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

const sections = [
  { key: "profile", label: "Profile", icon: User },
  { key: "appearance", label: "Appearance", icon: Brush },
  { key: "blocked", label: "Blocked", icon: Ban },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Privacy & Security", icon: Shield },
  { key: "devices", label: "Devices & Sessions", icon: Smartphone },
  { key: "about", label: "About", icon: Info },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "profile";
  const [active, setActive] = useState(tabFromUrl);

  const naviagte = useNavigate()


  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActive(tab);
  }, [searchParams]);

  const renderSection = () => {
    switch (active) {
      case "profile": return <ProfileSection />;
      case "appearance": return <AppearanceSection />;
      case "blocked": return <BlockedSection />;
      case "notifications": return <NotificationsSection />;
      case "privacy": return <PrivacySection />;
      case "devices": return <DevicesSection />;
      case "about": return <AboutSection />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        {/* HEADER */}
        <div className="mb-6 space-y-3">

          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => naviagte("/")}
            className="flex items-center gap-2 px-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account, preferences, and security
            </p>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

          {/* NAVIGATION */}
          <aside
            className={cn(
              "rounded-xl border bg-card",
              "lg:sticky lg:top-6 h-fit"
            )}
          >
            <nav className="flex flex-col divide-y">
              {sections.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActive(key);
                      setSearchParams({ tab: key });
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm text-left transition",
                      "first:rounded-t-xl last:rounded-b-xl",
                      isActive
                        ? "bg-muted font-medium"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* CONTENT */}
          <main className="rounded-xl border bg-card p-4 sm:p-6">
            {renderSection()}
          </main>

        </div>
      </div>
    </div>
  );
}
