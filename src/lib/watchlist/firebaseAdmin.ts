import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestore: Firestore | null = null;

function parseFirebaseConfigProjectId() {
  const raw = process.env.FIREBASE_CONFIG;
  if (!raw) {
    return undefined;
  }
  try {
    const config = raw.startsWith("{") ? JSON.parse(raw) : {};
    return typeof config.projectId === "string" ? config.projectId : undefined;
  } catch {
    return undefined;
  }
}

function initializeFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? parseFirebaseConfigProjectId();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({
      credential: applicationDefault(),
      projectId
    });
  }

  return initializeApp(projectId ? { projectId } : undefined);
}

export function getAdminFirestore() {
  if (!firestore) {
    firestore = getFirestore(initializeFirebaseAdminApp());
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}
