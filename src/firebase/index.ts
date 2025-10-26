'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Initialize Firebase App ---
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Export Core SDKs ---
export const auth = getAuth(app);
export const db = getFirestore(app);
export const firebaseApp = app;

// --- Utility to get SDKs dynamically ---
export function initializeFirebase() {
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

// --- Export everything else ---
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
