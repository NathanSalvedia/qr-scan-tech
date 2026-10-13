import { initializeApp, getApps, getApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import type { Auth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const { initializeAuth, getAuth } = FirebaseAuth;
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;

const firebaseConfig = {
  apiKey: "AIzaSyAtAzi0HHEleM0rAVCq5d43ECRFJLWKPJo",
  authDomain: "qr-scan-tech.firebaseapp.com",
  projectId: "qr-scan-tech",
  storageBucket: "qr-scan-tech.firebasestorage.app",
  messagingSenderId: "210043671620",
  appId: "1:210043671620:web:e2a94e265de548bc69d811",
  measurementId: "G-PJ6PQ5PBEZ",
};

// Initialize Firebase safely (prevents duplicate app initialization errors during Expo reload)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance: Auth;

if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
