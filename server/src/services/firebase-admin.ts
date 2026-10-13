import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

export function initFirebaseAdmin(): { app: App | null; auth: Auth | null } {
  if (adminAuth) {
    return { app: adminApp, auth: adminAuth };
  }

  try {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      'server/src/config/firebase-account-service.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️ Firebase service account key not found at:', serviceAccountPath);
      return { app: null, auth: null };
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount),
          })
        : getApps()[0];

    adminAuth = getAuth(adminApp);
    console.log('🔥 Firebase Admin initialized successfully');
    return { app: adminApp, auth: adminAuth };
  } catch (err: any) {
    console.error('❌ Failed to initialize Firebase Admin:', err.message);
    return { app: null, auth: null };
  }
}

export const firebaseAdminAuth = () => {
  const { auth } = initFirebaseAdmin();
  return auth;
};
