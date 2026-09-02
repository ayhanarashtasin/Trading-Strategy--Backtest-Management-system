"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Profile, UserRole } from "@/types/database";
import { clearQueryCache, setActiveUserScope } from "@/lib/query-cache";

export interface AuthUser {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole;
  isOwner: boolean;
  isEditor: boolean;
  canEdit: boolean;
  isViewer: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "viewer",
  isOwner: false,
  isEditor: false,
  canEdit: false,
  isViewer: true,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialProfile?: Profile | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    setActiveUserScope(initialUser?.id ?? null);
    return initialUser;
  });
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const supabase = createClient();

  // The server-provided profile removes the client-side session/profile boot waterfall.
  const currentUserId = useRef<string | null>(initialUser?.id ?? null);
  const profileLoaded = useRef(Boolean(initialProfile));

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data as Profile);
        profileLoaded.current = true;
      }
    } catch (err) {
      console.error("Fetch profile exception:", err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setActiveUserScope(session.user.id);
        setUser(session.user);
        /* This fires on every token refresh, not just sign-in. Re-reading the
           profile each time is a network round-trip that re-renders the whole
           tree for data that has not changed, so only fetch when the identity
           actually changed or we have nothing yet. */
        const identityChanged = session.user.id !== currentUserId.current;
        if (identityChanged || !profileLoaded.current) {
          currentUserId.current = session.user.id;
          if (identityChanged) clearQueryCache();
          await fetchProfile(session.user.id);
        }
      } else {
        setActiveUserScope(null);
        currentUserId.current = null;
        profileLoaded.current = false;
        clearQueryCache();
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveUserScope(null);
    clearQueryCache();
    currentUserId.current = null;
    profileLoaded.current = false;
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  };

  const role: UserRole = profile?.role || "viewer";
  const isOwner = role === "owner";
  const isEditor = role === "editor";
  const canEdit = isOwner || isEditor;
  const isViewer = role === "viewer";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isOwner,
        isEditor,
        canEdit,
        isViewer,
        isLoading: false,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
