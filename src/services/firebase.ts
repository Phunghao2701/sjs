import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const configuredProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
const configuredApiKey = import.meta.env.VITE_FIREBASE_API_KEY
const configuredAppId = import.meta.env.VITE_FIREBASE_APP_ID
export const firebaseEmulatorsEnabled = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR !== 'false'
export const firebaseConfigured = firebaseEmulatorsEnabled || Boolean(configuredProjectId && configuredApiKey && configuredAppId)

const projectId = configuredProjectId || (import.meta.env.DEV ? 'sjs-be' : 'unconfigured')
const apiKey = configuredApiKey || (import.meta.env.DEV ? 'demo-api-key' : 'missing-api-key')
const appId = configuredAppId || (import.meta.env.DEV ? '1:827720641620:web:local-dev' : 'missing-app-id')

const firebaseConfig = {
  apiKey,
  appId,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

type FirebaseGlobal = typeof globalThis & { __sjsFirebaseEmulatorsConnected?: boolean }
const sharedGlobal = globalThis as FirebaseGlobal

if (firebaseEmulatorsEnabled && !sharedGlobal.__sjsFirebaseEmulatorsConnected) {
  const authHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1'
  const authPort = Number(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || 9099)
  const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1'
  const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080)

  connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true })
  connectFirestoreEmulator(db, firestoreHost, firestorePort)
  sharedGlobal.__sjsFirebaseEmulatorsConnected = true
}

let developmentSignInPromise: Promise<User> | null = null

async function signInOrCreateDevelopmentUser() {
  await auth.authStateReady()
  const currentUser = auth.currentUser
  if (currentUser) {
    try {
      // Validate the persisted emulator refresh token before Firestore uses it.
      await currentUser.getIdToken(true)
      return currentUser
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/invalid-refresh-token') throw error
      await signOut(auth)
    }
  }

  const email = import.meta.env.VITE_DEV_AUTH_EMAIL || 'dev@example.test'
  const password = import.meta.env.VITE_DEV_AUTH_PASSWORD || 'dev-password'

  try {
    return (await signInWithEmailAndPassword(auth, email, password)).user
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
    return (await createUserWithEmailAndPassword(auth, email, password)).user
  }
}

export function ensureDevelopmentEmulatorUser() {
  if (!import.meta.env.DEV || !firebaseEmulatorsEnabled) {
    return Promise.reject(new Error('Development sign-in is available only with the Firebase Auth Emulator.'))
  }

  developmentSignInPromise ??= signInOrCreateDevelopmentUser().finally(() => {
    developmentSignInPromise = null
  })
  return developmentSignInPromise
}
