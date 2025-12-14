"use client";

import React, { useState } from "react";
import {
  User,
  Brush,
  Bell,
  Shield,
  Smartphone,
  Info,
} from "lucide-react";

import ProfileSection from "@/components/settings/ProfileSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import PrivacySection from "@/components/settings/PrivacySection";
import DevicesSection from "@/components/settings/DevicesSection";
import AboutSection from "@/components/settings/AboutSection";

import { cn } from "@/lib/utils";

const sections = [
  { key: "profile", label: "Profile", icon: User },
  { key: "appearance", label: "Appearance", icon: Brush },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Privacy & Security", icon: Shield },
  { key: "devices", label: "Devices & Sessions", icon: Smartphone },
  { key: "about", label: "About", icon: Info },
];

export default function SettingsPage() {
  const [active, setActive] = useState("profile");

  const renderSection = () => {
    switch (active) {
      case "profile": return <ProfileSection />;
      case "appearance": return <AppearanceSection />;
      case "notifications": return <NotificationsSection />;
      case "privacy": return <PrivacySection />;
      case "devices": return <DevicesSection />;
      case "about": return <AboutSection />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      {/* LEFT MENU */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border p-3 md:p-4 bg-card">
        <div className="hidden md:flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        {/* mobile tabs */}
        <div className="md:hidden flex gap-2 overflow-x-auto py-2">
          {sections.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "px-4 py-1 rounded-full text-sm whitespace-nowrap",
                active === key ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* desktop nav */}
        <nav className="hidden md:block space-y-1">
          {sections.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm text-left",
                active === key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* RIGHT CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {renderSection()}
      </main>
    </div>
  );
}
