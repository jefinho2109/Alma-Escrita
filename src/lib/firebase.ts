import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const androidFirebaseConfig = {
  apiKey: "AIzaSyB8ranIc3d3jAdyGnIXzZUnR5COB-cdq7Y",
  authDomain: "alma-sonora-7281c.firebaseapp.com",
  projectId: "alma-sonora-7281c",
  storageBucket: "alma-sonora-7281c.firebasestorage.app",
  messagingSenderId: "106235266154",
  appId: "1:106235266154:android:08bfbf308c83ad2f397613",
};

const hasCompleteEnvFirebaseConfig =
  hasUsableValue(envFirebaseConfig.apiKey) &&
  hasUsableValue(envFirebaseConfig.authDomain) &&
  hasUsableValue(envFirebaseConfig.projectId);

const firebaseConfig = hasCompleteEnvFirebaseConfig
  ? envFirebaseConfig
  : androidFirebaseConfig;

export interface AppUser {
  name: string;
  email: string;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let persistenceReady: Promise<void> | null = null;

function hasUsableValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("...")
  );
}

export function isFirebaseConfigured(): boolean {
  return (
    hasUsableValue(firebaseConfig.apiKey) &&
    hasUsableValue(firebaseConfig.authDomain) &&
    hasUsableValue(firebaseConfig.projectId)
  );
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (appInstance) return appInstance;
  appInstance = getApps()[0] ?? initializeApp(firebaseConfig);
  return appInstance;
}

export function getAuthInstance(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (!app) return null;

  authInstance = getAuth(app);
  persistenceReady = setPersistence(authInstance, browserLocalPersistence).catch(() => {
    // Keep auth usable even if this WebView cannot switch persistence explicitly.
  });
  return authInstance;
}

async function requireAuth(): Promise<Auth> {
  const auth = getAuthInstance();
  if (!auth) {
    throw new Error("auth/not-configured");
  }
  if (persistenceReady) await persistenceReady;
  return auth;
}

export function mapFirebaseUser(user: User | null): AppUser | null {
  if (!user) return null;
  const email = user.email ?? "";
  return {
    name: user.displayName?.trim() || email.split("@")[0] || "Usuario",
    email,
  };
}

export function watchAuthState(onChange: (user: AppUser | null) => void): () => void {
  const auth = getAuthInstance();
  if (!auth) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(
    auth,
    (user) => onChange(mapFirebaseUser(user)),
    () => onChange(null),
  );
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  const auth = await requireAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = mapFirebaseUser(credential.user);
  if (!user) throw new Error("auth/user-not-found");
  return user;
}

export async function loginWithGoogle(): Promise<AppUser> {
  const auth = await requireAuth();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = mapFirebaseUser(credential.user);
  if (!user) throw new Error("auth/user-not-found");
  return user;
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AppUser> {
  const auth = await requireAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const displayName = name.trim();
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return {
    name: displayName || credential.user.email?.split("@")[0] || "Usuario",
    email: credential.user.email ?? email.trim(),
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = await requireAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (auth) await signOut(auth);
}

export function getFriendlyAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : error instanceof Error
        ? error.message
        : "";

  switch (code) {
    case "auth/not-configured":
      return "Login temporariamente indisponivel. A configuracao do Firebase nao foi encontrada neste build.";
    case "auth/invalid-email":
      return "Informe um e-mail valido.";
    case "auth/missing-password":
    case "auth/weak-password":
      return "Use uma senha com pelo menos 6 caracteres.";
    case "auth/email-already-in-use":
      return "Este e-mail ja tem uma conta. Tente entrar ou recuperar a senha.";
    case "auth/user-disabled":
      return "Esta conta foi desativada. Fale com o suporte.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/network-request-failed":
      return "Sem conexao agora. Verifique a internet e tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/operation-not-allowed":
      return "Login por e-mail e senha ainda nao esta habilitado no Firebase.";
    default:
      return "Nao consegui concluir agora. Tente novamente em instantes.";
  }
}

export function getDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!dbInstance) dbInstance = getFirestore(app);
  return dbInstance;
}

export const db = getDb();
