// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
   apiKey: "AIzaSyDs9XnK4JlPa4tIpI0HbgvNfH5DipRdvq4",
  authDomain: "servicio-tech.firebaseapp.com",
  projectId: "servicio-tech",
  storageBucket: "servicio-tech.firebasestorage.app",
  messagingSenderId: "163310594752",
  appId: "1:163310594752:web:df76c2426a813055aa5b25"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);