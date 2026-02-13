// src/store/useProfileStore.js
import { create } from "zustand";
import { toast } from "sonner";
import api from "@/api/axios";
import { useAuthStore } from "./useAuthStore.js";

export const useProfileStore = create((set, get) => ({
  profile: null,
  profiles: [], // cached contacts (if needed)
  profileLoading: false,
  searchLoading: false,

  error: null,
  searchResults: [],
  usernameSuggestions: [],
  
  /* ==========================================================
     FETCH MY PROFILE
  ========================================================== */
  fetchProfile: async () => {
    set({ profileLoading: true, error: null });

    try {
      const res = await api.get("/profile/me", { withCredentials: true });
      const profile = res.data?.data;

      set({ profile });
      return profile;
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load profile";
      set({ error: msg });
      toast.error(msg);
      return null;
    } finally {
      set({ profileLoading: false });
    }
  },

  /* ==========================================================
     FIRST-TIME PROFILE SETUP
  ========================================================== */
  setupProfile: async (formData) => {
    set({ profileLoading: true });

    try {
      const res = await api.post("/profile/setup", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const profile = res.data?.data;
      set({ profile });

      // mark user as boarded
      const { user, setUser } = useAuthStore.getState();
      if (user) {
        setUser({ ...user, isBoarded: true });
      }

      toast.success("Profile setup completed");
      return profile;
    } catch {
      toast.error("Profile setup failed");
      return null;
    } finally {
      set({ profileLoading: false });
    }
  },

  /* ==========================================================
     UPDATE PROFILE INFO
  ========================================================== */
  updateProfile: async (payload) => {
    set({ profileLoading: true });
    try {
      const res = await api.put("/profile/update-profile", payload, {
        withCredentials: true,
      });

      const updated = res.data?.data;
      set({ profile: updated });

      toast.success("Profile updated");
      return updated;
    } catch {
      toast.error("Failed to update profile");
      return null;
    } finally {
      set({ profileLoading: false });
    }
  },

  /* ==========================================================
     UPDATE AVATAR
  ========================================================== */
  updateAvatar: async (formData) => {
    set({ profileLoading: true });

    try {
      const res = await api.post("/profile/update-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const updated = res.data?.data;
      set({ profile: updated });

      toast.success("Avatar updated");
      return updated;
    } catch {
      toast.error("Failed to update avatar");
      return null;
    } finally {
      set({ profileLoading: false });
    }
  },

  /* ==========================================================
     UPDATE STATUS
  ========================================================== */
  updateStatus: async (isOnline) => {
    try {
      const res = await api.patch(
        "/profile/status",
        { isOnline },
        { withCredentials: true }
      );

      const updated = res.data?.data;
      set({ profile: updated });
    } catch {
      console.warn("Status update failed");
    }
  },

  /* ==========================================================
     DELETE PROFILE
  ========================================================== */
  deleteProfile: async () => {
    try {
      const data = await api.delete("/profile/delete", { withCredentials: true });
      set({ profile: null, profiles: [] });

      const { logout } = useAuthStore.getState();
      logout();

      toast.success("Account deactivated");

    } catch(err) {
      const msg = err?.response?.data?.message || "Failed to deactivate account";
      toast.error(msg);
      return false;
    }
  },

  /* ==========================================================
     CHECK USERNAME AVAILABILITY
  ========================================================== */
  checkUsernameAvailability: async (username) => {
    if (!username || username.trim().length < 3) {
      set({ usernameSuggestions: [] });
      return { available: false, suggestions: [] };
    }

    try {
      const res = await api.get(
        `/profile/check-username/${encodeURIComponent(username)}`
      );

      const data = res.data?.data || {};
      set({ usernameSuggestions: data.suggestions || [] });

      return data;
    } catch {
      toast.error("Username check failed");
      return { available: false, suggestions: [] };
    }
  },

  /* ==========================================================
     SEARCH PROFILES
  ========================================================== */
  searchProfiles: async (query, chatId = null) => {
    if (!query || query.trim().length < 2) {
      set({ searchResults: [] });
      return [];
    }

    set({ searchLoading: true });

    try {
      const res = await api.get("/profile/search", {
        params: { query, chatId },
        withCredentials: true,
      });

      const results = res.data?.data || [];
      set({ searchResults: results });

      return results;
    } catch {
      toast.error("Search failed");
      return [];
    } finally {
      set({ searchLoading: false });
    }
  },

  /* ==========================================================
   FETCH MULTIPLE PROFILES BY IDS (FOR CALLS)
========================================================== */
  fetchProfilesByIds: async (ids = []) => {
    if (!ids.length) return;

    const state = get();
    const existingIds = new Set((state.profiles || []).map(p => String(p.userId)));

    const missing = ids.filter(id => !existingIds.has(String(id)));
    if (!missing.length) return;

    try {
      const res = await api.post(
        "/profile/bulk",
        { userIds: missing },
        { withCredentials: true }
      );

      const fetched = res.data?.data || [];

      set({
        profiles: [...state.profiles, ...fetched],
      });
    } catch (err) {
      console.warn("Bulk profile fetch failed", err);
    }
  },

  /* ==========================================================
     GET PROFILE BY ID (FOR CALL TILES)
  ========================================================== */
  getProfileById: (userId) => {
    const state = get();
    return state.profiles?.find(p => String(p.userId) === String(userId));
  },



  /* ==========================================================
     SOCKET HANDLERS — MATCH NEW BACKEND EXACTLY
  ========================================================== */

  /* ---------------------------------------
     USER_PROFILE_UPDATED
     payload = { userId, ...fields }
  --------------------------------------- */
  updateProfileSocket: (data) => {
    const { profile } = get();
    if (!profile) return;
    if (String(profile.userId) !== String(data.userId)) return;

    set({
      profile: { ...profile, ...data.fields }
    });
  },

  /* ---------------------------------------
     USER_AVATAR_UPDATED
     payload = { userId, avatarUrl }
  --------------------------------------- */
  updateAvatarSocket: (data) => {
    const { profile } = get();
    if (!profile) return;

    if (String(profile.userId) !== String(data.userId)) return;

    set({
      profile: {
        ...profile,
        avatarUrl: data.avatarUrl,
      },
    });
  },

  /* ---------------------------------------
     USER_STATUS_UPDATED
     payload = { userId, isOnline, lastSeenAt }
  --------------------------------------- */
  updateOnlineStatusSocket: ({ userId, isOnline, lastSeen, lastSeenAt } = {}) => {
    const state = get();

    // prefer lastSeen (profile-level) if present, else accept lastSeenAt
    const profileLast = lastSeen ?? lastSeenAt ?? null;

    if (String(state.profile?.userId) === String(userId)) {
      set({
        profile: {
          ...state.profile,
          isOnline,
          lastSeen: profileLast,
        }
      });
    }

    set({
      profiles: state.profiles?.map((p) =>
        String(p.userId) === String(userId)
          ? { ...p, isOnline, lastSeen: profileLast }
          : p
      ) || []
    });
  },


  /* ---------------------------------------
     USER_DELETED_EVENT  (if used later)
  --------------------------------------- */
  handleDeletedUserSocket: (data) => {
    const { profile } = get();
    if (!profile) return;

    if (String(profile.userId) !== String(data.userId)) return;

    set({ profile: null });
    toast.warning("Your account was deleted");
  },

  onDeviceRegisteredSocket: ({ userId }) => {
    get().updateOnlineStatusSocket({
      userId,
      isOnline: true,
      lastSeen: null,
    });
  },

  onDeviceLoggedOutSocket: ({ userId, lastSeen }) => {
    get().updateOnlineStatusSocket({
      userId,
      isOnline: false,
      lastSeen,
    });
  },

  /* ---------------------------------------
   USER_DELETED_EVENT
--------------------------------------- */
  markUserDeactivatedSocket: ({ userId }) => {
    const id = String(userId);

    set((state) => ({
      profiles: state.profiles?.map((p) =>
        String(p.userId) === id
          ? { ...p, isDeactivated: true, isOnline: false }
          : p
      ) || [],

      // if current user (rare case: admin deletes you)
      profile:
        String(state.profile?.userId) === id
          ? { ...state.profile, isDeactivated: true, isOnline: false }
          : state.profile,
    }));
  },
  markUserReactivatedSocket: ({ userId }) => {
    const id = String(userId);

    set((state) => ({
      profiles: state.profiles?.map((p) =>
        String(p.userId) === id
          ? { ...p, isDeactivated: false }
          : p
      ) || [],

      profile:
        String(state.profile?.userId) === id
          ? { ...state.profile, isDeactivated: false }
          : state.profile,
    }));
  },

}));

