import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "user";

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  contactNumber?: string;
  pincode?: string;
  role: UserRole;
  createdAt?: Date;
}

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    contactNumber: string;
    pincode: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email ?? "",
            displayName: data.displayName ?? fbUser.displayName ?? "",
            contactNumber: data.contactNumber ?? "",
            pincode: data.pincode ?? "",
            role: data.role ?? "user",
            createdAt: data.createdAt?.toDate?.(),
          });
        } else {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email ?? "",
            displayName: fbUser.displayName ?? "",
            role: "user",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const fbUser = result.user;

    const userRef = doc(db, "users", fbUser.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: fbUser.email ?? "",
        displayName: fbUser.displayName ?? "",
        contactNumber: "",
        pincode: "",
        role: "user",
        createdAt: serverTimestamp(),
      });
    }
  };

  const signUp = async ({
    email,
    password,
    contactNumber,
    pincode,
    role,
  }: {
    email: string;
    password: string;
    contactNumber: string;
    pincode: string;
    role: UserRole;
  }) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;

    await setDoc(doc(db, "users", fbUser.uid), {
      email: fbUser.email ?? email,
      displayName: "",
      contactNumber,
      pincode,
      role,
      createdAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signInWithGoogle, signUp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
