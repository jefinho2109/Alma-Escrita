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

const requiredFirebaseEnvVars = [
  { key: "VITE_FIREBASE_API_KEY", value: envFirebaseConfig.apiKey },
  { key: "VITE_FIREBASE_AUTH_DOMAIN", value: envFirebaseConfig.authDomain },
  { key: "VITE_FIREBASE_PROJECT_ID", value: envFirebaseConfig.projectId },
  { key: "VITE_FIREBASE_STORAGE_BUCKET", value: envFirebaseConfig.storageBucket },
  {
    key: "VITE_FIREBASE_MESSAGING_SENDER_ID",
    value: envFirebaseConfig.messagingSenderId,
  },
  { key: "VITE_FIREBASE_APP_ID", value: envFirebaseConfig.appId },
] as const;

const firebaseConfig = envFirebaseConfig;

export interface AppUser {
  name: string;
  email: string;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let persistenceReady: Promise<void> | null = null;
let configWarningLogged = false;

function hasUsableValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("...")
  );
}

const missingFirebaseEnvVars = requiredFirebaseEnvVars
  .filter(({ value }) => !hasUsableValue(value))
  .map(({ key }) => key);

function getCurrentHost(): string {
  return typeof window === "undefined" ? "unknown" : window.location.host;
}

function getFirebaseDiagnostics() {
  return {
    mode: import.meta.env.MODE,
    currentHost: getCurrentHost(),
    authDomain: hasUsableValue(firebaseConfig.authDomain)
      ? firebaseConfig.authDomain
      : null,
    projectId: hasUsableValue(firebaseConfig.projectId)
      ? firebaseConfig.projectId
      : null,
    missingEnvVars: missingFirebaseEnvVars,
  };
}

function logFirebaseConfigWarning(): void {
  if (configWarningLogged) return;
  configWarningLogged = true;
  console.error(
    "[Firebase Auth] Configuracao incompleta. Defina todas as variaveis VITE_FIREBASE_* no ambiente do Vercel.",
    getFirebaseDiagnostics(),
  );
}

function getErrorField(error: unknown, field: "code" | "message" | "name") {
  if (typeof error === "object" && error && field in error) {
    return String((error as Record<typeof field, unknown>)[field] ?? "");
  }
  if (error instanceof Error) {
    return field === "code" ? "" : String(error[field] ?? "");
  }
  return "";
}

function logFirebaseAuthError(action: string, error: unknown): void {
  const customData =
    typeof error === "object" && error && "customData" in error
      ? (error as { customData?: unknown }).customData
      : undefined;

  console.error(
    `[Firebase Auth] ${action}`,
    {
      code: getErrorField(error, "code"),
      message: getErrorField(error, "message"),
      name: getErrorField(error, "name"),
      customData,
      ...getFirebaseDiagnostics(),
    },
    error,
  );
}

function createAuthError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export function isFirebaseConfigured(): boolean {
  return missingFirebaseEnvVars.length === 0;
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    logFirebaseConfigWarning();
    return null;
  }
  if (appInstance) return appInstance;
  try {
    appInstance = getApps()[0] ?? initializeApp(firebaseConfig);
  } catch (error) {
    logFirebaseAuthError("initialize-app failed", error);
    return null;
  }
  return appInstance;
}

export function getAuthInstance(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (!app) return null;

  authInstance = getAuth(app);
  persistenceReady = setPersistence(authInstance, browserLocalPersistence).catch((error) => {
    logFirebaseAuthError("set-persistence failed", error);
    // Keep auth usable even if this WebView cannot switch persistence explicitly.
  });
  return authInstance;
}

async function requireAuth(): Promise<Auth> {
  const auth = getAuthInstance();
  if (!auth) {
    throw createAuthError(
      "auth/not-configured",
      "Firebase Auth is not configured for this build.",
    );
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
    (error) => {
      logFirebaseAuthError("watch-auth-state failed", error);
      onChange(null);
    },
  );
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  try {
    const auth = await requireAuth();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = mapFirebaseUser(credential.user);
    if (!user) {
      throw createAuthError("auth/user-not-found", "Firebase user not found.");
    }
    return user;
  } catch (error) {
    logFirebaseAuthError("login-with-email failed", error);
    throw error;
  }
}

export async function loginWithGoogle(): Promise<AppUser> {
  try {
    const auth = await requireAuth();
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const user = mapFirebaseUser(credential.user);
    if (!user) {
      throw createAuthError("auth/user-not-found", "Firebase user not found.");
    }
    return user;
  } catch (error) {
    logFirebaseAuthError("login-with-google failed", error);
    throw error;
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AppUser> {
  try {
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
  } catch (error) {
    logFirebaseAuthError("sign-up-with-email failed", error);
    throw error;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    const auth = await requireAuth();
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    logFirebaseAuthError("password-reset failed", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    logFirebaseAuthError("logout failed", error);
    throw error;
  }
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
    case "auth/configuration-not-found":
      return "Configuracao do Firebase Auth nao encontrada. Confira as variaveis VITE_FIREBASE_* e os metodos de login habilitados.";
    case "auth/invalid-api-key":
      return "Chave do Firebase invalida neste ambiente. Confira VITE_FIREBASE_API_KEY no Vercel.";
    case "auth/app-not-authorized":
    case "auth/unauthorized-domain":
      return "Este dominio ainda nao esta autorizado no Firebase. Adicione o dominio do Vercel em Authentication > Settings > Authorized domains.";
    case "auth/invalid-email":
    case "auth/missing-email":
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
    case "auth/admin-restricted-operation":
      return "Este metodo de login ainda nao esta habilitado no Firebase.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "A entrada com Google foi cancelada antes de concluir.";
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
