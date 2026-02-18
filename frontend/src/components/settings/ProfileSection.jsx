"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Edit2,
  Upload,
  Check,
  X,
  Trash,
  Copy,
  User,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { LANGUAGES } from "@/constants";

/* -------------------------
   Config
------------------------- */
const DEFAULT_AVATARS = Array.from(
  { length: 9 },
  (_, i) => `/assets/default-avatars/${i + 1}.png`
);
const MIN_USERNAME = 3;
const USER_DEBOUNCE_MS = 600;

const getLanguageName = (code) => {
  const lang = LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : "—";
};

/* -------------------------
   Small Info badge
------------------------- */
function InfoBadge({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 w-full min-w-0">
      {Icon && (
        <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      )}

      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium wrap-break-word">{value ?? "—"}</div>
      </div>
    </div>
  );
}

/* -------------------------
   Main Component
------------------------- */
export default function ProfileSection() {
  // stores (match your store names & api)
  const {
    profile,
    fetchProfile,
    updateProfile,
    updateAvatar,
    deleteProfile,
    checkUsernameAvailability,
    profileLoading,
    usernameSuggestions,
  } = useProfileStore();

  const { logout } = useAuthStore();
  /* local UI/edit state */
  const [editMode, setEditMode] = useState(false);

  // local copy for edits — keep inputs controlled and stable
  const [local, setLocal] = useState({
    username: "",
    bio: "",
    avatarPreview: DEFAULT_AVATARS[0],
    primaryLanguage: "en",
    secondaryLanguage: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // username availability
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  // refs
  const usernameRef = useRef(null);
  const debounceRef = useRef(null);
  const fileInputRef = useRef(null);

  /* -----------------------------------------------------
     Initialize local from profile: only when profile changes
     OR on first load — but DO NOT override while editing
  ----------------------------------------------------- */
  useEffect(() => {
    if (!profile) return;
    if (editMode) return; // don't stomp edits
    setLocal({
      username: profile.username || "",
      bio: profile.bio || "",
      avatarPreview: profile.avatarUrl || DEFAULT_AVATARS[0],
      primaryLanguage: profile.primaryLanguage || "en",
      secondaryLanguage: profile.secondaryLanguage || "",
    });
  }, [profile, editMode]);

  /* -----------------------------------------------------
     Enter edit mode: copy current profile => local, focus username
  ----------------------------------------------------- */
  const enterEditMode = () => {
    if (!profile) return;
    setLocal({
      username: profile.username || "",
      bio: profile.bio || "",
      avatarPreview: profile.avatarUrl || DEFAULT_AVATARS[0],
      primaryLanguage: profile.primaryLanguage || "en",
      secondaryLanguage: profile.secondaryLanguage || "",
    });
    setAvatarFile(null);
    setUsernameAvailable(null);
    setCheckingUsername(false);
    setEditMode(true);
    // focus on next tick
    requestAnimationFrame(() => {
      usernameRef.current?.focus?.();
      const el = usernameRef.current;
      if (el && typeof el.selectionStart === "number") {
        const len = (el.value || "").length;
        el.setSelectionRange(len, len);
      }
    });
  };

  const cancelEdit = () => {
    // revert to store values
    if (profile) {
      setLocal({
        username: profile.username || "",
        bio: profile.bio || "",
        avatarPreview: profile.avatarUrl || DEFAULT_AVATARS[0],
        primaryLanguage: profile.primaryLanguage || "en",
        secondaryLanguage: profile.secondaryLanguage || "",
      });
    }
    setAvatarFile(null);
    setUsernameAvailable(null);
    setCheckingUsername(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEditMode(false);
  };

  /* -----------------------------------------------------
     Username availability check (debounced)
     - skip when same as server username
     - update usernameSuggestions from store (store function sets it)
  ----------------------------------------------------- */
  useEffect(() => {
    if (!editMode) return;
    const name = String(local.username || "").trim();

    if (name.length < MIN_USERNAME) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (profile && profile.username === name) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setCheckingUsername(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(name);
        // store function sets suggestions; we read availability
        setUsernameAvailable(Boolean(res?.available));
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, USER_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [local.username, editMode, profile?.username]);

  /* -----------------------------------------------------
     Avatar handling
  ----------------------------------------------------- */
  const onPickDefaultAvatar = (url) => {
    setAvatarFile(null);
    setLocal((s) => ({ ...s, avatarPreview: url }));
  };

  const onUploadAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Only image files allowed");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Max 2MB allowed");
      return;
    }
    setAvatarFile(f);
    setLocal((s) => ({ ...s, avatarPreview: URL.createObjectURL(f) }));
  };

  /* -----------------------------------------------------
     Dirty check
  ----------------------------------------------------- */
  const isDirty = () => {
    if (!profile) return false;
    if (avatarFile) return true;
    if ((local.username || "") !== (profile.username || "")) return true;
    if ((local.bio || "") !== (profile.bio || "")) return true;
    if ((local.primaryLanguage || "en") !== (profile.primaryLanguage || "en")) return true;
    if ((local.secondaryLanguage || "") !== (profile.secondaryLanguage || "")) return true;
    if (!avatarFile && local.avatarPreview && profile.avatarUrl && local.avatarPreview !== profile.avatarUrl) return true;
    return false;
  };

  /* -----------------------------------------------------
     Save flow:
       1) If avatarFile -> upload via updateAvatar (formData)
       2) updateProfile(payload)
       3) fetchProfile() to ensure `user` populated
  ----------------------------------------------------- */
  const handleSave = async () => {
    if (!isDirty()) {
      toast("Nothing changed");
      return;
    }

    const name = String(local.username || "").trim();
    if (name.length < MIN_USERNAME) {
      toast.error(`Username must be at least ${MIN_USERNAME} chars`);
      return;
    }

    if (profile && profile.username !== name && usernameAvailable === false) {
      toast.error("Username not available");
      return;
    }

    if (!local.primaryLanguage) {
      toast.error("Select primary language");
      return;
    }

    if (local.primaryLanguage && local.secondaryLanguage && local.primaryLanguage === local.secondaryLanguage) {
      toast.error("Primary & secondary languages must differ");
      return;
    }

    setSaving(true);
    try {
      // 1) upload avatar file first (server emits avatar updated and store updated)
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const avatarUpdated = await updateAvatar(fd);
        if (!avatarUpdated) throw new Error("Avatar upload failed");
      }

      // 2) prepare payload
      const payload = {
        username: name,
        bio: String(local.bio || "").trim(),
        primaryLanguage: local.primaryLanguage,
        secondaryLanguage: local.secondaryLanguage || null,
      };

      // if user picked a default (not uploaded) and it's different from stored store it as avatarUrl
      if (!avatarFile && local.avatarPreview && profile && local.avatarPreview !== profile.avatarUrl) {
        payload.avatarUrl = local.avatarPreview;
      }

      const updated = await updateProfile(payload);
      // re-fetch to ensure `user` field is present and store has full shape
      await fetchProfile();

      setEditMode(false);
      setAvatarFile(null);
      setUsernameAvailable(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------------------------------
     Delete flow
  ----------------------------------------------------- */
  const handleDeactivateAccount = async () => {
    try {
      const ok = await deleteProfile();
      if (ok) {
        toast.success("Account deactivated");
      }
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  /* -----------------------------------------------------
     UI: stable layout: inputs are always mounted — just readOnly or editable
  ----------------------------------------------------- */
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN: Avatar + quick stats */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="rounded-xl border bg-card p-4 flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={local.avatarPreview || DEFAULT_AVATARS[0]}
                alt="avatar"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border"
              />
            </div>

            <div className="text-center w-full px-2">
              {/* show username as heading even when editing (input below) */}
              <div className="text-lg font-semibold wrap-break-word">{profile?.username || "—"}</div>
              <div className="text-xs text-muted-foreground wrap-break-word">{profile?.user?.email || "—"}</div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2">
              <div className="rounded-md border px-3 py-2 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Status</div>
                <div className="text-sm font-medium wrap-break-word">
                  {profile?.isOnline ? "Online" : (profile?.lastSeen ? `Last seen ${new Date(profile.lastSeen).toLocaleString()}` : "Offline")}
                </div>
              </div>
              <div className="rounded-md border px-3 py-2 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Joined</div>
                <div className="text-sm font-medium wrap-break-word">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</div>
              </div>
            </div>

            <div className="w-full mt-2 space-y-2">
              {!editMode ? (
                <Button onClick={enterEditMode} className="w-full inline-flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" /> Edit profile
                </Button>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUploadAvatar}
                  />
                  <div className="flex gap-2 w-full">
                    <Button onClick={() => fileInputRef.current?.click?.()} className="flex-1 inline-flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                    <Button variant="outline" onClick={() => { setAvatarFile(null); setLocal((s) => ({ ...s, avatarPreview: profile?.avatarUrl || DEFAULT_AVATARS[0] })); }} className="flex-1">Reset Avatar</Button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Account</div>
            <div className="text-sm font-medium wrap-break-word">{profile?.user?.email || "—"}</div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(profile?.user?.email || ""); toast.success("Email copied"); }}>
                <Copy className="w-4 h-4 mr-2" /> Copy email
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="w-4 h-4 mr-2" /> Deactivate Account
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is permanent. Your profile, devices, sessions,
                      and encrypted data will be erased forever. You will be signed out.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel className="p-2">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90 p-2"
                      onClick={handleDeactivateAccount}
                    >
                      Deactivate Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => logout()}>Sign out</Button>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: details & editable form */}
        <main className="flex-1 space-y-4">
          {/* Identity row (username input always mounted to avoid remount / focus lost) */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
                <User className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">Username</div>
                  {/* controlled Input: readOnly when not editing */}
                  <Input
                    ref={usernameRef}
                    value={local.username}
                    onChange={(e) => setLocal((s) => ({ ...s, username: e.target.value }))}
                    readOnly={!editMode}
                    placeholder="your-username"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* availability indicators */}
                {editMode && (
                  <div className="flex items-center gap-2 h-6">
                    {checkingUsername ? (
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    ) : usernameAvailable === true ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <X className="w-4 h-4 text-destructive" />
                    ) : null}
                  </div>
                )}

                {/* suggestions (only show when unavailable) */}
                {editMode && usernameAvailable === false && usernameSuggestions?.length > 0 && (
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 w-full md:max-w-[320px]">
                    <div className="whitespace-nowrap mr-1">Try:</div>
                    {usernameSuggestions.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        className="text-xs px-2 py-0.5 rounded bg-muted/30"
                        onClick={() => setLocal((st) => ({ ...st, username: s }))}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* edit/save/cancel */}
                {!editMode ? (
                  <Button onClick={enterEditMode} size="sm" className="hidden md:inline-flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" disabled={!isDirty() || saving || profileLoading || usernameAvailable === false}>{saving ? "Saving..." : "Save"}</Button>
                    <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bio (textarea always mounted) */}
            <div>
              <div className="text-xs text-muted-foreground">Bio</div>
              <Textarea
                value={local.bio}
                onChange={(e) => setLocal((s) => ({ ...s, bio: e.target.value }))}
                readOnly={!editMode}
                className="mt-2 min-h-[100px] sm:min-h-[120px]"
                placeholder="A short bit about you..."
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1">{(local.bio || "").length}/500</div>
            </div>
          </div>

          {/* languages and other badges */}
          <div className="rounded-xl border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Languages (selects when editMode otherwise badges) */}
            <div>
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    Primary language
                  </div>
                  {!editMode ? (
                    <div className="text-sm font-medium mt-1">{getLanguageName(profile?.primaryLanguage)}</div>
                  ) : (
                    <div className="mt-1 w-full">
                      <Select value={local.primaryLanguage || "en"} onValueChange={(v) => {
                        // clear secondary if same
                        setLocal((s) => ({ ...s, primaryLanguage: v, secondaryLanguage: s.secondaryLanguage === v ? "" : s.secondaryLanguage }));
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                Secondary language
              </div>
              {!editMode ? (
                <div className="text-sm font-medium mt-1">{profile?.secondaryLanguage ? getLanguageName(profile.secondaryLanguage) : "—"}</div>
              ) : (
                <div className="mt-1">
                  <Select value={local.secondaryLanguage || "none"} onValueChange={(v) => setLocal((s) => ({ ...s, secondaryLanguage: v === "none" ? "" : v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {LANGUAGES.filter(l => l.code !== local.primaryLanguage).map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Info grid: always visible */}
          {!editMode &&
            <div className="flex flex-wrap gap-4">
              <InfoBadge
                icon={Mail}
                label="Email"
                value={profile?.user?.email}
              />

              <InfoBadge
                icon={User}
                label="User ID"
                value={profile?.userId}
              />

              <InfoBadge
                icon={Edit2}
                label="Last updated"
                value={
                  profile?.updatedAt
                    ? new Date(profile.updatedAt).toLocaleString()
                    : "—"
                }
              />
            </div>
          }

          {/* Default avatars picker (only visible in edit mode) */}
          {editMode && (
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-2">Default avatars</div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {DEFAULT_AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onPickDefaultAvatar(a)}
                    className={cn("w-12 h-12 rounded-full overflow-hidden border", local.avatarPreview === a ? "ring-2 ring-primary" : "")}
                    aria-label="pick-avatar"
                  >
                    <img src={a} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
