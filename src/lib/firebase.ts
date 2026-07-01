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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredFirebaseEnvVars = [
  { key: "VITE_FIREBASE_API_KEY", value: firebaseConfig.apiKey },
  { key: "VITE_FIREBASE_AUTH_DOMAIN", value: firebaseConfig.authDomain },
  { key: "VITE_FIREBASE_PROJECT_ID", value: firebaseConfig.projectId },
  { key: "VITE_FIREBASE_STORAGE_BUCKET", value: firebaseConfig.storageBucket },
  {
    key: "VITE_FIREBASE_MESSAGING_SENDER_ID",
    value: firebaseConfig.messagingSenderId,
  },
  { key: "VITE_FIREBASE_APP_ID", value: firebaseConfig.appId },
] as const;

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  providerId: string;
  createdAt: string | null;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let persistenceReady: Promise<void> | null = null;
let configWarningLogged = false;

function hasUsableValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("coloque_") &&
    !value.includes("...")
  );
}

const missingFirebaseEnvVars = requiredFirebaseEnvVars
  .filter(({ value }) => !hasUsableValue(value))
  .map(({ key }) => key);

function logFirebaseConfigWarning(): void {
  if (configWarningLogged) return;
  configWarningLogged = true;
  console.error(
    "[Firebase Auth] Configuracao incompleta. Defina as variaveis VITE_FIREBASE_* no .env.",
    {
      missingEnvVars: missingFirebaseEnvVars,
      mode: import.meta.env.MODE,
      currentHost:
        typeof window === "undefined" ? "unknown" : window.location.host,
    },
  );
}

function createAuthError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code || "");
  }
  return error instanceof Error ? error.message : "";
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
  appInstance = getApps()[0] ?? initializeApp(firebaseConfig);
  return appInstance;
}

export function getAuthInstance(): Auth | null {
  if (authInstance) return authInstance;

  const app = getFirebaseApp();
  if (!app) return null;

  authInstance = getAuth(app);
  persistenceReady = setPersistence(authInstance, browserLocalPersistence).catch(
    (error) => {
      console.error("[Firebase Auth] Nao foi possivel configurar persistencia.", error);
    },
  );

  return authInstance;
}

async function requireAuth(): Promise<Auth> {
  const auth = getAuthInstance();
  if (!auth) {
    throw createAuthError(
      "auth/not-configured",
      "Firebase Auth nao configurado neste build.",
    );
  }

  if (persistenceReady) await persistenceReady;
  return auth;
}

export function mapFirebaseUser(user: User | null): AppUser | null {
  if (!user) return null;

  const email = user.email ?? "";
  const providerId = user.providerData[0]?.providerId ?? "firebase";
  const fallbackName = email.split("@")[0] || "Alma Escrita";

  return {
    uid: user.uid,
    name: user.displayName?.trim() || fallbackName,
    email,
    photoURL: user.photoURL ?? null,
    providerId,
    createdAt: user.metadata.creationTime ?? null,
  };
}

export function watchAuthState(onChange: (user: AppUser | null) => void): () => void {
  const auth = getAuthInstance();
  if (!auth) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => onChange(mapFirebaseUser(user)));
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AppUser> {
  const auth = await requireAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  const user = mapFirebaseUser(credential.user);
  if (!user) throw createAuthError("auth/user-not-found", "Usuario nao encontrado.");
  return user;
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AppUser> {
  const auth = await requireAuth();
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  const displayName = name.trim();

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  const user = mapFirebaseUser(credential.user);
  if (!user) throw createAuthError("auth/user-not-found", "Usuario nao encontrado.");
  return {
    ...user,
    name: displayName || user.name,
  };
}

export async function loginWithGoogle(): Promise<AppUser> {
  const auth = await requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  const user = mapFirebaseUser(credential.user);
  if (!user) throw createAuthError("auth/user-not-found", "Usuario nao encontrado.");
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = await requireAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (!auth) return;
  await signOut(auth);
}

export function getFriendlyAuthError(error: unknown): string {
  switch (getErrorCode(error)) {
    case "auth/not-configured":
      return "Login temporariamente indisponivel. Configure as variaveis VITE_FIREBASE_* no .env.";
    case "auth/configuration-not-found":
      return "Firebase Auth ainda nao esta habilitado para este projeto.";
    case "auth/invalid-api-key":
      return "A chave do Firebase esta invalida neste ambiente.";
    case "auth/app-not-authorized":
    case "auth/unauthorized-domain":
      return "Este dominio ainda nao esta autorizado no Firebase Authentication.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Informe um e-mail valido.";
    case "auth/missing-password":
      return "Informe sua senha.";
    case "auth/weak-password":
      return "Use uma senha com pelo menos 6 caracteres.";
    case "auth/email-already-in-use":
      return "Este e-mail ja tem uma conta. Tente entrar ou recuperar a senha.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
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
