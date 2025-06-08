// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD0fy11n1vziFWbBm3iAWy7R_pXwJXFYH0",
  authDomain: "faasnaloge-b3081.firebaseapp.com",
  projectId: "faasnaloge-b3081",
  storageBucket: "faasnaloge-b3081.firebasestorage.app",
  messagingSenderId: "600936244870",
  appId: "1:600936244870:web:47599d712df601e9249307",
  measurementId: "G-0CRJFQM3YE"
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


export const getAllReservationsUrl =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? `http://127.0.0.1:5001/${firebaseConfig.projectId}/us-central1/getAllReservations`
    : `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/getAllReservations`;