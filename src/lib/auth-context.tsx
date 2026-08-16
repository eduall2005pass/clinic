"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase";

export type StudentProfile = {
  uid: string;
  studentId: string;
  fullName: string;
  gender: string;
  institution: string;
  hscBatch: string;
  contactNumber: string;
  email: string;
  facebookUrl: string;
  profilePictureUrl: string;
  provider: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type AuthContextValue = {
  user: User | null;
  profile: StudentProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<StudentProfile | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(uid: string): Promise<StudentProfile | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "students", uid));
  return snapshot.exists() ? (snapshot.data() as StudentProfile) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!auth) {
      // Firebase not configured — clear the initial loading state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      const studentProfile = await fetchProfile(firebaseUser.uid);
      setProfile(studentProfile);
      setProfileLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const studentProfile = await fetchProfile(user.uid);
    setProfile(studentProfile);
    setProfileLoading(false);
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      throw new Error("Firebase authentication is not configured.");
    }
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
    const studentProfile = await fetchProfile(result.user.uid);
    setProfile(studentProfile);
    return studentProfile;
  }, []);

  const logout = useCallback(async () => {
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      configured: isFirebaseConfigured,
      signInWithGoogle,
      logout,
      refreshProfile,
    }),
    [
      user,
      profile,
      authLoading,
      profileLoading,
      signInWithGoogle,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}