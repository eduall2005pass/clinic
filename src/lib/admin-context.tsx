"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

type AdminContextValue = {
  isAdmin: boolean;
  adminLoading: boolean;
};

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  adminLoading: true,
});

/**
 * Resolves the signed-in user's admin status from Firestore
 * (`admins/{uid}` document). Kept fully separate from the student
 * auth/permission system — students never resolve as admins here.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<{
    uid: string | null;
    isAdmin: boolean;
    loaded: boolean;
  }>({ uid: null, isAdmin: false, loaded: false });

  useEffect(() => {
    if (!user || !db) return;
    const unsubscribe = onSnapshot(
      doc(db, "admins", user.uid),
      (snapshot) => {
        setState({ uid: user.uid, isAdmin: snapshot.exists(), loaded: true });
      },
      () => {
        setState({ uid: user.uid, isAdmin: false, loaded: true });
      },
    );
    return unsubscribe;
  }, [user]);

  const value = useMemo<AdminContextValue>(() => {
    const uid = user?.uid ?? null;
    const noUser = !authLoading && uid === null;
    if (noUser || !db) {
      return { isAdmin: false, adminLoading: false };
    }
    const current = state.uid === uid;
    return {
      isAdmin: current ? state.isAdmin : false,
      adminLoading: !current || !state.loaded,
    };
  }, [user, authLoading, state]);

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext);
}