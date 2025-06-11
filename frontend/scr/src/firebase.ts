// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const functions = getFunctions(app); 

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export const submitCourtReservation = httpsCallable(functions, "submitCourtReservation");
export const listCourts = httpsCallable(functions, "listCourts");
export const getCourtDetails = httpsCallable(functions, "getCourtDetails");
export const getUserReservations = httpsCallable(functions, "getUserReservations");
export const cancelReservation = httpsCallable(functions, "cancelReservation");
export const confirmReservation = httpsCallable(functions, "confirmReservation");
export const addCourt = httpsCallable(functions, "addCourt");
export const isAdmin = httpsCallable(functions, "isAdmin");
export const getAllReservationsUrl = `http://127.0.0.1:5001/faasnaloge-b3081/us-central1/getAllReservations`;