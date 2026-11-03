import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

// These keys are safe to keep in the app. Firebase protects data with
// the security rules in firestore.rules, not by hiding this config.
const firebaseConfig = {
  apiKey: 'AIzaSyBTpg1H46GbGdXTwKoPZiP-F_NyoesXoaM',
  authDomain: 'loan-f1b2c.firebaseapp.com',
  projectId: 'loan-f1b2c',
  storageBucket: 'loan-f1b2c.firebasestorage.app',
  messagingSenderId: '363088438081',
  appId: '1:363088438081:web:d8ec0baf2c71f69531b7c0',
  measurementId: 'G-2N0XFYJEK3',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Saves data on the device. This makes the app open fast and, most
 * importantly, means reopening a list only downloads what changed.
 * That keeps us far below the Firebase free daily limits.
 */
function createDb(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch {
    // Already set up (for example after a hot reload in development).
    return getFirestore(app);
  }
}

export const db = createDb();

// Analytics is optional. Load it later and only where the browser supports it,
// so it never blocks or breaks the app (for example with ad blockers).
if (typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch(() => undefined);
}
