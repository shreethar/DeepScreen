// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyADYJtwhKiON4b7MQy9df77-QCXGXWsEYA",
    authDomain: "workshop-resume.firebaseapp.com",
    projectId: "workshop-resume",
    storageBucket: "workshop-resume.firebasestorage.app",
    messagingSenderId: "1013839348174",
    appId: "1:1013839348174:web:d41c08e81019c915052b9f",
    measurementId: "G-HXPE491SWG"
};

// Initialize Firebase only if it hasn't been initialized already
// This prevents re-initialization errors during hot-reloading in development
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get a Firestore instance
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };

// Initialize Firebase
// const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;